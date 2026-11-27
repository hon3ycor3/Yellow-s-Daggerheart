import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import {
  adjustGold,
  calculateDamageOutcome,
  createDefaultCharacter,
  createDomainCard,
  createExperience,
  createInventoryItem,
  DOMAIN_NAMES,
  getLoadoutCount,
  loadLocalState,
  makeShortId,
  MAX_LOADOUT_CARDS,
  saveLocalState,
} from "./state.js";
import {
  createRoomSaver,
  deleteSheetFromRoom,
  extractRoomSheets,
  measureMetadataBytes,
  migrateLegacyRoomSheets,
  previewSheetsBudget,
  ROOM_METADATA_LIMIT_BYTES,
  ROOM_METADATA_WARN_BYTES,
  RoomQuotaError,
  saveSheetToRoom,
} from "./storage.js";
import { rehydrateUnresolvedSrdCards } from "./storageCodec.js";
import {
  exportPartyBackup,
  exportSingleCharacter,
  parseImportedFile,
} from "./jsonTransfer.js";
import { getSubclassesForClass } from "./srdData.js";
import {
  populateStaticSelects,
  populateSubclassSelect,
  renderClassFeatures,
  renderDamagePreview,
  renderDamageRollResult,
  renderDomainCards,
  renderDynamicUI,
  renderExperiences,
  renderHeritageFeatures,
  renderInventory,
  renderRollError,
  renderRollMode,
  renderRollResult,
  renderRollType,
  renderSheetSwitcher,
  renderSyncStatus,
  renderTokenHudStatus,
  setRollerModeBadge,
  setRollingState,
  syncExperienceControls,
  syncInputs,
} from "./ui.js";
import {
  checkDicePlusReady,
  rollDualityTrait,
  rollWeaponDamage,
} from "./roller.js";
import { loadCardCatalog } from "./cardCatalog.js";
import { initCardPicker } from "./cardPicker.js";
import {
  createHudSyncer,
  getLinkedTokenInfo,
  linkSelectedTokenToSheet,
  syncTokenHudForSheet,
  unlinkTokensFromSheet,
} from "./tokenHud.js";
import { initOverlayScrollbar } from "./overlayScrollbar.js";

let character = loadLocalState();
const sheetEl = document.getElementById("sheet");
const stickyChromeEl = document.getElementById("sticky-chrome");
const badgeEl = document.getElementById("obr-badge");
const sheetSelectorEl = document.getElementById("sheet-selector");
const newSheetBtn = document.getElementById("new-sheet-btn");
const deleteSheetBtn = document.getElementById("delete-sheet-btn");
const storageWarningBanner = document.getElementById("storage-warning-banner");
const storageWarningText = document.getElementById("storage-warning-text");
const warningExportBtn = document.getElementById("warning-export-btn");
const warningRetryBtn = document.getElementById("warning-retry-btn");
const exportSheetBtn = document.getElementById("export-sheet-btn");
const exportPartyBtn = document.getElementById("export-party-btn");
const importJsonBtn = document.getElementById("import-json-btn");
const archiveSheetBtn = document.getElementById("archive-sheet-btn");
const importJsonInput = document.getElementById("import-json-input");
const importModeDialog = document.getElementById("import-mode-dialog");
const importDialogDesc = document.getElementById("import-dialog-desc");
const importAsNewBtn = document.getElementById("import-as-new-btn");
const importReplaceBtn = document.getElementById("import-replace-btn");
const importCancelBtn = document.getElementById("import-cancel-btn");
const importCancelX = document.getElementById("import-cancel-x");

let metadataSeq = 0;

let obrConnected = false;
let isGM = false;
// Open party sheet viewing/switching by default; flip via a future GM setting if desired
const restrictToGM = false;
let isRolling = false;
let activeSheetId = "";
/** @type {string | null} */
let editingHopeFeatureId = null;
/** @type {Map<string, import("./state.js").CharacterState>} */
let roomSheets = new Map();
/** @type {number | null} */
let lastRoomBytes = null;
/** @type {import("./storage.js").SyncStatus} */
let currentSyncStatus = "local";

/** @type {import("./roller.js").RollMode} */
let rollMode = "normal";
let isReactionRoll = false;
/** @type {Set<string>} */
const selectedExperienceIds = new Set();

/** @type {import("./state.js").CardLocation} */
let activeDomainTab = "loadout";
/** @type {Set<string>} */
const editingCardIds = new Set();

/** @param {string} message */
function showStorageWarning(message) {
  if (storageWarningText) storageWarningText.textContent = message;
  storageWarningBanner?.classList.remove("hidden");
}

function clearStorageWarning() {
  storageWarningBanner?.classList.add("hidden");
}

function updateTransferButtons() {
  const canManage = canManagePartySheets();
  exportPartyBtn?.classList.toggle(
    "hidden",
    !obrConnected || roomSheets.size === 0,
  );
  archiveSheetBtn?.classList.toggle(
    "hidden",
    !canManage || roomSheets.size <= 1 || !activeSheetId,
  );
}

const roomSaver = createRoomSaver((status, errorMessage, budget) => {
  currentSyncStatus = status;
  if (budget) lastRoomBytes = budget.totalBytes;

  if (status === "synced") {
    clearStorageWarning();
  } else if (status === "error" && errorMessage) {
    showStorageWarning(errorMessage);
  }

  renderSyncStatus(
    status,
    lastRoomBytes,
    ROOM_METADATA_WARN_BYTES,
    ROOM_METADATA_LIMIT_BYTES,
    errorMessage,
  );
});

const hudSyncer = createHudSyncer(150);

async function refreshTokenHudUI() {
  const info = await getLinkedTokenInfo(activeSheetId);
  renderTokenHudStatus(info, obrConnected);
}

const cardPicker = initCardPicker({
  getCharacter: () => character,
  onAddCard: (srdCard, location) => {
    const targetLocation =
      location === "loadout" && getLoadoutCount(character) < MAX_LOADOUT_CARDS
        ? "loadout"
        : "vault";

    const newCard = createDomainCard({
      srdId: srdCard.srdId,
      name: srdCard.name,
      domain: srdCard.domain,
      level: srdCard.level,
      cardType: srdCard.cardType,
      recallCost: srdCard.recallCost,
      location: targetLocation,
      description: "", // Resolved live from SRD catalog to protect the 16 KB Room Metadata budget
    });

    character.domainCards.push(newCard);
    activeDomainTab = targetLocation;
    persistCharacter();
    renderDomainCards(character, activeDomainTab, editingCardIds);
  },
});

// Preload SRD catalog in background so existing SRD cards hydrate their text immediately
void loadCardCatalog().then(() => {
  let upgraded = rehydrateUnresolvedSrdCards(character);
  for (const sheet of roomSheets.values()) {
    if (rehydrateUnresolvedSrdCards(sheet)) upgraded = true;
  }
  if ((upgraded || editingCardIds.size === 0) && editingCardIds.size === 0) {
    renderDomainCards(character, activeDomainTab, editingCardIds);
  }
});

function canManagePartySheets() {
  return obrConnected && (!restrictToGM || isGM);
}

/**
 * @param {string | undefined} value
 * @returns {value is import("./state.js").TraitKey}
 */
function isTraitKey(value) {
  return (
    value === "agility" ||
    value === "strength" ||
    value === "finesse" ||
    value === "instinct" ||
    value === "presence" ||
    value === "knowledge"
  );
}

/**
 * @param {string | undefined} value
 * @returns {value is import("./roller.js").RollMode}
 */
function isRollMode(value) {
  return (
    value === "normal" || value === "advantage" || value === "disadvantage"
  );
}

/**
 * @param {string | undefined} value
 * @returns {value is "primary" | "secondary"}
 */
function isWeaponSlot(value) {
  return value === "primary" || value === "secondary";
}

/**
 * @param {string | undefined} value
 * @returns {value is import("./state.js").GoldUnit}
 */
function isGoldUnit(value) {
  return value === "handfuls" || value === "bags" || value === "chests";
}

/**
 * @param {string | undefined} value
 * @returns {value is import("./state.js").CardLocation}
 */
function isCardLocation(value) {
  return value === "loadout" || value === "vault";
}

/**
 * @param {string} value
 * @returns {value is import("./state.js").DomainName}
 */
function isDomainName(value) {
  return /** @type {readonly string[]} */ (DOMAIN_NAMES).includes(value);
}

/**
 * @param {string} value
 * @returns {value is import("./state.js").CardType}
 */
function isCardType(value) {
  return value === "Ability" || value === "Spell" || value === "Grimoire";
}

/**
 * @param {number} current
 * @param {number} clickedIndex
 */
function togglePipCount(current, clickedIndex) {
  return clickedIndex === current ? clickedIndex - 1 : clickedIndex;
}

/**
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** @returns {number} */
function getIncomingDamageValue() {
  const input = document.getElementById("incoming-damage");
  if (!(input instanceof HTMLInputElement)) return 0;
  return Number(input.value) || 0;
}

function trimSelectedExperiencesToHope() {
  const ids = Array.from(selectedExperienceIds);
  while (ids.length > character.hope.current) {
    const removed = ids.pop();
    if (removed) selectedExperienceIds.delete(removed);
  }
}

function persistCharacter() {
  saveLocalState(character);

  if (obrConnected && activeSheetId) {
    roomSheets.set(activeSheetId, JSON.parse(JSON.stringify(character)));
    renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
    roomSaver.scheduleSave(activeSheetId, character);
    hudSyncer.scheduleSync(activeSheetId, character);
  }
}

function renderFullSheet() {
  trimSelectedExperiencesToHope();
  syncInputs(character);
  renderDynamicUI(character);
  renderClassFeatures(character, editingHopeFeatureId);
  renderHeritageFeatures(character);
  renderRollMode(rollMode);
  renderRollType(isReactionRoll);
  renderExperiences(character, selectedExperienceIds);
  renderDamagePreview(character, getIncomingDamageValue());
  renderDomainCards(character, activeDomainTab, editingCardIds);
  renderInventory(character);
}

/** @param {string} nextSheetId */
async function switchToSheet(nextSheetId) {
  editingHopeFeatureId = null;
  if (!roomSheets.has(nextSheetId)) return;

  await roomSaver.flushSave();

  const nextSheet = roomSheets.get(nextSheetId);
  if (!nextSheet) return;

  activeSheetId = nextSheetId;
  character = JSON.parse(JSON.stringify(nextSheet));

  selectedExperienceIds.clear();
  editingCardIds.clear();
  rollMode = "normal";
  isReactionRoll = false;

  const dmgInput = document.getElementById("incoming-damage");
  if (dmgInput instanceof HTMLInputElement) dmgInput.value = "";

  renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
  renderFullSheet();
  void refreshTokenHudUI();
}

function commitChanges() {
  trimSelectedExperiencesToHope();
  persistCharacter();
  renderDynamicUI(character);
  syncExperienceControls(character, selectedExperienceIds);
  renderDamagePreview(character, getIncomingDamageValue());

  if (editingCardIds.size === 0) {
    renderDomainCards(character, activeDomainTab, editingCardIds);
  }
}

/**
 * Smoothly scrolls to a sheet section while accounting for the frozen topbar height.
 * @param {string} sectionId
 */
function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const stickyOffset = stickyChromeEl
    ? stickyChromeEl.getBoundingClientRect().height
    : 0;
  const top =
    target.getBoundingClientRect().top + window.scrollY - stickyOffset - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

/**
 * Reorders the topbar `.jump-btn` icons to match the visual top-to-bottom,
 * left-to-right layout of `#sheet` defined in `src/styles/layout.css`.
 */
function syncNavOrderToGrid() {
  const navEl = document.querySelector(".section-nav");
  if (!navEl || !sheetEl) return;

  const buttons = Array.from(navEl.querySelectorAll(".jump-btn")).filter(
    /** @returns {el is HTMLButtonElement} */ (el) =>
      el instanceof HTMLButtonElement,
  );

  const measured = buttons.map((btn, domIndex) => {
    const targetId = btn.dataset.target;
    const section = targetId ? document.getElementById(targetId) : null;

    if (!section) {
      return {
        btn,
        top: Number.POSITIVE_INFINITY,
        left: domIndex,
        hidden: false,
      };
    }

    const isHidden = window.getComputedStyle(section).display === "none";
    const rect = section.getBoundingClientRect();
    return { btn, top: rect.top, left: rect.left, hidden: isHidden };
  });

  // Sort by visual row (8px tolerance handles minor alignment differences), then left-to-right
  measured.sort((a, b) => {
    if (Math.abs(a.top - b.top) > 8) return a.top - b.top;
    return a.left - b.left;
  });

  for (const { btn, hidden } of measured) {
    btn.classList.toggle("hidden", hidden);
  }

  // Only move DOM nodes when the order actually changed so keyboard focus is preserved
  const orderChanged = measured.some(
    (entry, idx) => entry.btn !== buttons[idx],
  );
  if (orderChanged) {
    for (const { btn } of measured) {
      navEl.appendChild(btn);
    }
  }
}

/**
 * @param {import("./state.js").TraitKey} traitKey
 * @param {string} displayLabel
 */
async function performTraitRoll(traitKey, displayLabel) {
  if (isRolling) return;

  const traitModifier = character.traits[traitKey];
  const activeExps = character.experiences.filter((exp) =>
    selectedExperienceIds.has(exp.id),
  );
  const experienceBonus = activeExps.reduce((sum, exp) => sum + exp.bonus, 0);
  const appliedExperiences = activeExps.map(
    (exp) => exp.label.trim() || "Experience",
  );
  const hopeCost = activeExps.length;
  const isReaction = isReactionRoll;

  isRolling = true;
  setRollingState(true, isReaction ? `${displayLabel} Reaction` : displayLabel);

  try {
    const result = await rollDualityTrait(displayLabel, traitModifier, {
      rollMode,
      experienceBonus,
      appliedExperiences,
      isReaction,
    });

    let stateChanged = false;

    if (hopeCost > 0) {
      character.hope.current = Math.max(0, character.hope.current - hopeCost);
      selectedExperienceIds.clear();
      stateChanged = true;
    }

    const outcomeNotes = [];
    if (
      !result.isReaction &&
      (result.outcome === "hope" || result.outcome === "critical")
    ) {
      if (character.hope.current < character.hope.max) {
        character.hope.current += 1;
        outcomeNotes.push("+1 Hope");
        stateChanged = true;
      } else {
        outcomeNotes.push(
          `Hope full (${character.hope.max}/${character.hope.max})`,
        );
      }

      if (result.outcome === "critical" && character.stress.marked > 0) {
        character.stress.marked -= 1;
        outcomeNotes.push("-1 Stress");
        stateChanged = true;
      }
    }

    const hopeNote = outcomeNotes.join(", ");

    if (stateChanged) {
      commitChanges();
    }

    setRollerModeBadge(result.engine === "dice-plus");
    renderRollResult(result, hopeNote);

    if (rollMode !== "normal") {
      rollMode = "normal";
      renderRollMode(rollMode);
    }

    if (isReactionRoll) {
      isReactionRoll = false;
      renderRollType(isReactionRoll);
    }

    if (obrConnected) {
      const prefix = character.name ? `${character.name} — ` : "";
      const extras = [];
      if (result.rollMode === "advantage" && result.advDie !== null) {
        extras.push(`Adv +${result.advDie}`);
      } else if (result.rollMode === "disadvantage" && result.advDie !== null) {
        extras.push(`Dis -${result.advDie}`);
      }
      if (result.experienceBonus !== 0) {
        const sign = result.experienceBonus > 0 ? "+" : "";
        extras.push(`Exp ${sign}${result.experienceBonus}`);
      }
      const extraStr = extras.length > 0 ? `, ${extras.join(", ")}` : "";

      //      if (result.isReaction) {
      //        await OBR.notification.show(
      //          `${prefix}${result.traitLabel} (${result.outcomeText}): ${result.total} [2d12: ${result.hopeDie}, ${result.fearDie}${extraStr}]`,
      //        );
      //      } else {
      //        const hopeSuffix = hopeNote ? ` [${hopeNote}]` : "";
      //        await OBR.notification.show(
      //          `${prefix}${result.traitLabel}: ${result.total} ${result.outcomeText} (H:${result.hopeDie} / F:${result.fearDie}${extraStr})${hopeSuffix}`,
      //        );
      //      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected roll error";
    renderRollError(message);
  } finally {
    isRolling = false;
    setRollingState(false);
  }
}

/** @param {HTMLInputElement | HTMLSelectElement} target */
function handleWeaponFieldUpdate(target) {
  const slot = target.dataset.weapon;
  const field = target.dataset.field;
  if (!isWeaponSlot(slot)) return;

  const weapon = character.weapons[slot];

  if (field === "name") {
    weapon.name = target.value;
  } else if (field === "range") {
    weapon.range = target.value;
  } else if (field === "feature") {
    weapon.feature = target.value;
  } else if (field === "trait" && isTraitKey(target.value)) {
    weapon.trait = target.value;
  } else if (field === "dieSides") {
    weapon.dieSides = Math.max(4, Number(target.value) || 6);
  } else if (field === "flatBonus") {
    weapon.flatBonus = Number(target.value) || 0;
  } else if (
    field === "damageType" &&
    (target.value === "Physical" || target.value === "Magic")
  ) {
    weapon.damageType = target.value;
  }

  commitChanges();
}

/** @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} target */
function handleCardFieldUpdate(target) {
  const cardId = target.dataset.cardId;
  const field = target.dataset.field;
  const card = character.domainCards.find((item) => item.id === cardId);
  if (!card) return;

  if (field === "name") {
    card.name = target.value;
  } else if (field === "description") {
    card.description = target.value;
  } else if (field === "domain" && isDomainName(target.value)) {
    card.domain = target.value;
    const cardEl = target.closest(".domain-card");
    if (cardEl) {
      cardEl.className = `domain-card domain-${card.domain.toLowerCase()}`;
    }
  } else if (field === "cardType" && isCardType(target.value)) {
    card.cardType = target.value;
  } else if (field === "level") {
    card.level = clamp(Number(target.value) || 1, 1, 10);
  } else if (field === "recallCost") {
    card.recallCost = clamp(Number(target.value) || 0, 0, 6);
  }

  persistCharacter();
}

// Initial local setup
populateStaticSelects();
initOverlayScrollbar();
requestAnimationFrame(syncNavOrderToGrid);

if (sheetEl) {
  new ResizeObserver(syncNavOrderToGrid).observe(sheetEl);
}

// Re-sync immediately when you edit grid-template-areas in layout.css during dev
/** @type {any} */ (import.meta).hot?.on("vite:afterUpdate", () => {
  requestAnimationFrame(syncNavOrderToGrid);
});
renderFullSheet();
renderSyncStatus(
  "local",
  null,
  ROOM_METADATA_WARN_BYTES,
  ROOM_METADATA_LIMIT_BYTES,
);

// Horizontal section jump bar (inside frozen topbar)
if (stickyChromeEl) {
  stickyChromeEl.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement)) return;

    if (button.classList.contains("jump-btn") && button.dataset.target) {
      scrollToSection(button.dataset.target);
    }
  });
}

// Party Sheet Switcher controls (open to all players by default)
if (sheetSelectorEl instanceof HTMLSelectElement) {
  sheetSelectorEl.addEventListener("change", () => {
    void switchToSheet(sheetSelectorEl.value);
  });
}

if (newSheetBtn instanceof HTMLButtonElement) {
  newSheetBtn.addEventListener("click", async () => {
    if (!canManagePartySheets()) return;

    await roomSaver.flushSave();

    const newId = makeShortId("s_");
    const freshSheet = createDefaultCharacter();
    freshSheet.name = `Character ${roomSheets.size + 1}`;

    // Pre-flight check BEFORE mutating active sheet state
    const { budget } = await previewSheetsBudget({ [newId]: freshSheet });
    if (!budget.fitsSafeLimit) {
      const msg = `Cannot create new sheet (${(budget.totalBytes / 1024).toFixed(1)} / 16 KB). Export & Archive an unused sheet first.`;
      showStorageWarning(msg);
      renderSyncStatus(
        "error",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
        msg,
      );
      return;
    }

    currentSyncStatus = "saving";
    renderSyncStatus(
      "saving",
      lastRoomBytes,
      ROOM_METADATA_WARN_BYTES,
      ROOM_METADATA_LIMIT_BYTES,
    );

    try {
      const savedBudget = await saveSheetToRoom(newId, freshSheet);
      lastRoomBytes = savedBudget.totalBytes;
      clearStorageWarning();

      roomSheets.set(newId, freshSheet);
      activeSheetId = newId;
      character = JSON.parse(JSON.stringify(freshSheet));
      editingCardIds.clear();
      selectedExperienceIds.clear();

      renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
      updateTransferButtons();
      renderFullSheet();
      void refreshTokenHudUI();

      currentSyncStatus = "synced";
      renderSyncStatus(
        "synced",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create sheet";
      currentSyncStatus = "error";
      showStorageWarning(msg);
      renderSyncStatus(
        "error",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
        msg,
      );
    }
  });
}

if (deleteSheetBtn instanceof HTMLButtonElement) {
  deleteSheetBtn.addEventListener("click", async () => {
    if (!canManagePartySheets() || roomSheets.size <= 1 || !activeSheetId)
      return;

    const sheetName = character.name.trim() || "this character";
    if (!window.confirm(`Delete "${sheetName}" from this Owlbear Rodeo room?`))
      return;

    const idToDelete = activeSheetId;
    roomSheets.delete(idToDelete);

    const nextId = roomSheets.keys().next().value;
    if (nextId) {
      const nextSheet = roomSheets.get(nextId);
      if (nextSheet) {
        activeSheetId = nextId;
        character = JSON.parse(JSON.stringify(nextSheet));
      }
    }

    editingCardIds.clear();
    selectedExperienceIds.clear();
    renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
    updateTransferButtons();
    renderFullSheet();

    try {
      await deleteSheetFromRoom(idToDelete);
    } catch (err) {
      console.error("[Daggerheart Sheet] Failed to delete sheet:", err);
    }
  });
}

/**
 * Prompts the user to pick "new", "replace", or "cancel" via <dialog>.
 * @param {string} description
 * @param {{ allowNew: boolean }} opts
 * @returns {Promise<"new" | "replace" | "cancel">}
 */
function askImportMode(description, { allowNew }) {
  return new Promise((resolve) => {
    if (!(importModeDialog instanceof HTMLDialogElement)) {
      resolve("replace");
      return;
    }

    if (importDialogDesc) importDialogDesc.textContent = description;
    if (importAsNewBtn instanceof HTMLButtonElement) {
      importAsNewBtn.disabled = !allowNew;
      importAsNewBtn.classList.toggle("hidden", !allowNew);
    }

    const cleanup = (/** @type {"new" | "replace" | "cancel"} */ choice) => {
      importAsNewBtn?.removeEventListener("click", onNew);
      importReplaceBtn?.removeEventListener("click", onReplace);
      importCancelBtn?.removeEventListener("click", onCancel);
      importCancelX?.removeEventListener("click", onCancel);
      importModeDialog.removeEventListener("cancel", onCancel);
      if (importModeDialog.open) importModeDialog.close();
      resolve(choice);
    };

    const onNew = () => cleanup("new");
    const onReplace = () => cleanup("replace");
    const onCancel = () => cleanup("cancel");

    importAsNewBtn?.addEventListener("click", onNew);
    importReplaceBtn?.addEventListener("click", onReplace);
    importCancelBtn?.addEventListener("click", onCancel);
    importCancelX?.addEventListener("click", onCancel);
    importModeDialog.addEventListener("cancel", onCancel);
    importModeDialog.showModal();
  });
}

warningExportBtn?.addEventListener("click", () => {
  exportSingleCharacter(character);
});

warningRetryBtn?.addEventListener("click", async () => {
  const ok = await roomSaver.retryLastFailed();
  if (!ok && obrConnected && activeSheetId) {
    try {
      const budget = await saveSheetToRoom(activeSheetId, character);
      lastRoomBytes = budget.totalBytes;
      currentSyncStatus = "synced";
      clearStorageWarning();
      renderSyncStatus(
        "synced",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Retry failed";
      showStorageWarning(msg);
    }
  }
});

exportSheetBtn?.addEventListener("click", () => {
  exportSingleCharacter(character);
});

exportPartyBtn?.addEventListener("click", () => {
  exportPartyBackup(roomSheets);
});

archiveSheetBtn?.addEventListener("click", async () => {
  if (!canManagePartySheets() || roomSheets.size <= 1 || !activeSheetId) return;

  const sheetName = character.name.trim() || "this character";
  if (
    !window.confirm(
      `Export "${sheetName}" as JSON and remove it from this room to free storage?`,
    )
  ) {
    return;
  }

  exportSingleCharacter(character);

  const idToDelete = activeSheetId;
  roomSheets.delete(idToDelete);

  const nextId = roomSheets.keys().next().value;
  if (nextId) {
    const nextSheet = roomSheets.get(nextId);
    if (nextSheet) {
      activeSheetId = nextId;
      character = JSON.parse(JSON.stringify(nextSheet));
    }
  }

  editingCardIds.clear();
  selectedExperienceIds.clear();
  renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
  updateTransferButtons();
  renderFullSheet();
  void refreshTokenHudUI();

  try {
    await deleteSheetFromRoom(idToDelete);
    clearStorageWarning();
  } catch (err) {
    console.error("[Daggerheart Sheet] Archive delete failed:", err);
  }
});

importJsonBtn?.addEventListener("click", () => {
  if (importJsonInput instanceof HTMLInputElement) {
    importJsonInput.value = "";
    importJsonInput.click();
  }
});

if (importJsonInput instanceof HTMLInputElement) {
  importJsonInput.addEventListener("change", async () => {
    const file = importJsonInput.files?.[0];
    if (!file) return;

    try {
      const result = await parseImportedFile(file);

      // Standalone mode: import directly into active local sheet
      if (!obrConnected) {
        character = result.entries[0].character;
        saveLocalState(character);
        editingCardIds.clear();
        selectedExperienceIds.clear();
        renderFullSheet();
        return;
      }

      await roomSaver.flushSave();

      // Party backup file (multiple characters)
      if (result.kind === "party" && result.entries.length > 1) {
        if (!canManagePartySheets()) return;
        /** @type {Record<string, import("./state.js").CharacterState>} */
        const batch = {};
        for (const entry of result.entries) {
          const id = entry.suggestedId || makeShortId("s_");
          batch[id] = entry.character;
        }
        const { patch, budget } = await previewSheetsBudget(batch);
        if (!budget.fitsSafeLimit) {
          showStorageWarning(
            `Party backup needs ${(budget.totalBytes / 1024).toFixed(1)} / 16 KB and won't fit. Archive unused sheets or import characters individually.`,
          );
          return;
        }
        if (
          !window.confirm(
            `Import ${result.entries.length} sheets into this room? (Est. room total: ${(budget.totalBytes / 1024).toFixed(1)} / 16 KB)`,
          )
        ) {
          return;
        }
        await OBR.room.setMetadata(patch);
        clearStorageWarning();
        return;
      }

      // Single character import
      const importedChar = result.entries[0].character;
      const newId = makeShortId("s_");
      const [newPreview, replacePreview] = await Promise.all([
        previewSheetsBudget({ [newId]: importedChar }),
        previewSheetsBudget({ [activeSheetId]: importedChar }),
      ]);

      const importName = importedChar.name.trim() || "Imported Character";
      const currentName = character.name.trim() || "current sheet";
      const allowNew =
        canManagePartySheets() && newPreview.budget.fitsSafeLimit;

      const desc = allowNew
        ? `Import "${importName}" as a new sheet (${(newPreview.budget.totalBytes / 1024).toFixed(1)} / 16 KB) or replace "${currentName}" in-place (${(replacePreview.budget.totalBytes / 1024).toFixed(1)} / 16 KB)?`
        : `Room storage is too tight to add a new sheet. Replace "${currentName}" in-place with "${importName}" (${(replacePreview.budget.totalBytes / 1024).toFixed(1)} / 16 KB)?`;

      const mode = await askImportMode(desc, { allowNew });
      if (mode === "cancel") return;

      const targetId = mode === "new" ? newId : activeSheetId;
      const savedBudget = await saveSheetToRoom(targetId, importedChar);
      lastRoomBytes = savedBudget.totalBytes;
      clearStorageWarning();

      roomSheets.set(targetId, JSON.parse(JSON.stringify(importedChar)));
      activeSheetId = targetId;
      character = JSON.parse(JSON.stringify(importedChar));
      saveLocalState(character);
      editingCardIds.clear();
      selectedExperienceIds.clear();

      renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
      updateTransferButtons();
      renderFullSheet();
      void refreshTokenHudUI();
      currentSyncStatus = "synced";
      renderSyncStatus(
        "synced",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
      );
    } catch (err) {
      const msg =
        err instanceof RoomQuotaError || err instanceof Error
          ? err.message
          : "Failed to import JSON file.";
      showStorageWarning(msg);
    }
  });
}

if (sheetEl) {
  sheetEl.addEventListener("input", (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) ||
      (target instanceof HTMLInputElement && target.type === "checkbox")
    ) {
      return;
    }

    if (target.classList.contains("card-field")) {
      handleCardFieldUpdate(target);
      return;
    }

    if (!(target instanceof HTMLInputElement)) return;

    if (target.classList.contains("inv-text-input")) {
      const item = character.inventory.find(
        (entry) => entry.id === target.dataset.invId,
      );
      if (item) {
        item.text = target.value;
        persistCharacter();
      }
      return;
    }

    if (target.id === "incoming-damage") {
      renderDamagePreview(character, Number(target.value) || 0);
      return;
    }

    if (target.classList.contains("weapon-field")) {
      handleWeaponFieldUpdate(target);
      return;
    }

    const num = Number(target.value) || 0;

    if (target.id === "char-name") {
      character.name = target.value;
    } else if (target.id === "char-level") {
      character.level = clamp(num, 1, 10);
      renderClassFeatures(character, editingHopeFeatureId);
    } else if (target.id === "char-evasion") {
      character.evasion = num;
    } else if (target.id === "char-proficiency") {
      character.proficiency = clamp(num, 1, 6);
    } else if (target.id === "armor-name") {
      character.armor.name = target.value;
    } else if (target.id === "armor-feature") {
      character.armor.feature = target.value;
    } else if (target.id === "armor-major") {
      character.armor.baseMajor = num;
    } else if (target.id === "armor-severe") {
      character.armor.baseSevere = num;
    } else if (target.id === "armor-score") {
      character.armor.score = clamp(num, 0, 12);
      character.armor.slotsMarked = Math.min(
        character.armor.slotsMarked,
        character.armor.score,
      );
    } else if (
      target.classList.contains("trait-input") &&
      isTraitKey(target.dataset.trait)
    ) {
      character.traits[target.dataset.trait] = num;
    } else if (target.classList.contains("exp-label-input")) {
      const exp = character.experiences.find(
        (item) => item.id === target.dataset.expId,
      );
      if (exp) exp.label = target.value;
    } else if (target.classList.contains("exp-bonus-input")) {
      const exp = character.experiences.find(
        (item) => item.id === target.dataset.expId,
      );
      if (exp) exp.bonus = num;
    }

    commitChanges();
  });

  sheetEl.addEventListener("change", (event) => {
    const target = event.target;

    if (target instanceof HTMLSelectElement) {
      if (target.id === "char-class") {
        character.className = target.value;
        const subclasses = getSubclassesForClass(character.className);
        character.subclass = subclasses[0];
        populateSubclassSelect(character.className, character.subclass);
        renderClassFeatures(character, editingHopeFeatureId);
        commitChanges();
        return;
      }

      if (target.id === "char-subclass") {
        character.subclass = target.value;
        renderClassFeatures(character, editingHopeFeatureId);
        commitChanges();
        return;
      }

      if (target.id === "heritage-community") {
        character.community = target.value;
        renderHeritageFeatures(character);
        commitChanges();
        return;
      }

      if (target.id === "heritage-ancestry") {
        character.ancestry = target.value;
        renderHeritageFeatures(character);
        commitChanges();
        return;
      }

      if (target.id === "heritage-ancestry-2") {
        character.secondAncestry = target.value;
        renderHeritageFeatures(character);
        commitChanges();
        return;
      }

      if (target.classList.contains("card-field")) {
        handleCardFieldUpdate(target);
        return;
      }

      if (target.classList.contains("weapon-field")) {
        handleWeaponFieldUpdate(target);
        return;
      }
    }

    if (target instanceof HTMLInputElement && target.id === "heritage-mixed") {
      character.mixedAncestry = target.checked;
      renderHeritageFeatures(character);
      commitChanges();
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.classList.contains("exp-check")
    ) {
      const id = target.dataset.expId;
      if (!id) return;

      if (
        target.checked &&
        selectedExperienceIds.size < character.hope.current
      ) {
        selectedExperienceIds.add(id);
      } else {
        selectedExperienceIds.delete(id);
      }

      syncExperienceControls(character, selectedExperienceIds);
    }
  });

  sheetEl.addEventListener("click", async (event) => {
    const target =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!(target instanceof HTMLButtonElement)) return;

    if (target.classList.contains("pip")) {
      const track = target.dataset.track;
      const index = Number(target.dataset.index);

      if (track === "hp") {
        character.hp.marked = togglePipCount(character.hp.marked, index);
      } else if (track === "stress") {
        character.stress.marked = togglePipCount(
          character.stress.marked,
          index,
        );
      } else if (track === "hope") {
        character.hope.current = togglePipCount(character.hope.current, index);
      } else if (track === "armor") {
        character.armor.slotsMarked = togglePipCount(
          character.armor.slotsMarked,
          index,
        );
      }

      commitChanges();
    } else if (target.classList.contains("vital-max-btn")) {
      const vital = target.dataset.vital;
      const delta = Number(target.dataset.delta) || 0;

      if (vital === "hp") {
        character.hp.max = clamp(character.hp.max + delta, 1, 12);
        character.hp.marked = Math.min(character.hp.marked, character.hp.max);
      } else if (vital === "stress") {
        character.stress.max = clamp(character.stress.max + delta, 1, 12);
        character.stress.marked = Math.min(
          character.stress.marked,
          character.stress.max,
        );
      } else if (vital === "hope") {
        character.hope.max = clamp(character.hope.max + delta, 1, 6);
        character.hope.current = Math.min(
          character.hope.current,
          character.hope.max,
        );
      } else if (vital === "armor") {
        character.armor.score = clamp(character.armor.score + delta, 0, 12);
        character.armor.slotsMarked = Math.min(
          character.armor.slotsMarked,
          character.armor.score,
        );
      }

      commitChanges();
    } else if (
      target.id === "apply-damage-btn" ||
      target.id === "apply-armor-damage-btn"
    ) {
      const incoming = getIncomingDamageValue();
      const outcome = calculateDamageOutcome(character, incoming);
      if (outcome.hpLoss === 0) return;

      const useArmor =
        target.id === "apply-armor-damage-btn" && outcome.canUseArmor;
      const hpToMark = useArmor ? outcome.reducedHpLoss : outcome.hpLoss;

      character.hp.marked = Math.min(
        character.hp.max,
        character.hp.marked + hpToMark,
      );
      if (useArmor) {
        character.armor.slotsMarked = Math.min(
          character.armor.score,
          character.armor.slotsMarked + 1,
        );
      }

      const dmgInput = document.getElementById("incoming-damage");
      if (dmgInput instanceof HTMLInputElement) {
        dmgInput.value = "";
      }

      commitChanges();
    } else if (target.classList.contains("condition-btn")) {
      const cond = target.dataset.condition;
      if (cond === "vulnerable" || cond === "restrained" || cond === "hidden") {
        character.conditions[cond] = !character.conditions[cond];
        commitChanges();
      }
    } else if (target.id === "link-token-btn") {
      try {
        console.log(
          "[Token HUD] Linking clicked. activeSheetId:",
          activeSheetId,
        );
        const res = await linkSelectedTokenToSheet(activeSheetId, character);
        console.log("[Token HUD] Result:", res);
        if (obrConnected) {
          await OBR.notification.show(
            res.message,
            res.ok ? "SUCCESS" : "WARNING",
          );
        }
        await refreshTokenHudUI();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Token HUD] Link error:", err);
        if (obrConnected) {
          await OBR.notification.show(`Token HUD error: ${msg}`, "ERROR");
        }
      }
    } else if (target.id === "unlink-token-btn") {
      try {
        await unlinkTokensFromSheet(activeSheetId);
        if (obrConnected) {
          await OBR.notification.show("Unlinked token HUD from this sheet.");
        }
        await refreshTokenHudUI();
      } catch (err) {
        console.error("[Token HUD] Unlink error:", err);
      }
    } else if (
      target.classList.contains("mode-btn") &&
      isRollMode(target.dataset.mode)
    ) {
      rollMode = target.dataset.mode;
      renderRollMode(rollMode);
    } else if (target.classList.contains("roll-type-btn")) {
      isReactionRoll = target.dataset.rollType === "reaction";
      renderRollType(isReactionRoll);
    } else if (target.id === "add-exp-btn") {
      character.experiences.push(createExperience("", 2));
      persistCharacter();
      renderExperiences(character, selectedExperienceIds);
    } else if (target.classList.contains("exp-remove-btn")) {
      const id = target.dataset.expId;
      if (id) {
        character.experiences = character.experiences.filter(
          (item) => item.id !== id,
        );
        selectedExperienceIds.delete(id);
        persistCharacter();
        renderExperiences(character, selectedExperienceIds);
      }
    } else if (target.id === "add-inv-btn") {
      character.inventory.push(createInventoryItem(""));
      persistCharacter();
      renderInventory(character);
    } else if (target.classList.contains("inv-remove-btn")) {
      const id = target.dataset.invId;
      if (id) {
        character.inventory = character.inventory.filter(
          (item) => item.id !== id,
        );
        persistCharacter();
        renderInventory(character);
      }
    } else if (
      target.classList.contains("domain-tab-btn") &&
      isCardLocation(target.dataset.tab)
    ) {
      activeDomainTab = target.dataset.tab;
      renderDomainCards(character, activeDomainTab, editingCardIds);
    } else if (target.id === "browse-cards-btn") {
      cardPicker.open();
    } else if (target.id === "add-card-btn") {
      const targetLocation =
        activeDomainTab === "loadout" &&
        getLoadoutCount(character) < MAX_LOADOUT_CARDS
          ? "loadout"
          : "vault";
      const newCard = createDomainCard({ location: targetLocation });
      character.domainCards.push(newCard);
      activeDomainTab = targetLocation;
      editingCardIds.add(newCard.id);
      persistCharacter();
      renderDomainCards(character, activeDomainTab, editingCardIds);
    } else if (target.classList.contains("card-edit-btn")) {
      const id = target.dataset.cardId;
      if (id) {
        if (editingCardIds.has(id)) {
          editingCardIds.delete(id);
        } else {
          editingCardIds.add(id);
        }
        renderDomainCards(character, activeDomainTab, editingCardIds);
      }
    } else if (target.classList.contains("card-delete-btn")) {
      const id = target.dataset.cardId;
      if (id) {
        character.domainCards = character.domainCards.filter(
          (item) => item.id !== id,
        );
        editingCardIds.delete(id);
        persistCharacter();
        renderDomainCards(character, activeDomainTab, editingCardIds);
      }
    } else if (target.classList.contains("card-to-vault-btn")) {
      const card = character.domainCards.find(
        (item) => item.id === target.dataset.cardId,
      );
      if (card) {
        card.location = "vault";
        persistCharacter();
        renderDomainCards(character, activeDomainTab, editingCardIds);
      }
    } else if (target.classList.contains("card-recall-btn")) {
      const card = character.domainCards.find(
        (item) => item.id === target.dataset.cardId,
      );
      const availableStress = character.stress.max - character.stress.marked;
      if (
        card &&
        getLoadoutCount(character) < MAX_LOADOUT_CARDS &&
        availableStress >= card.recallCost
      ) {
        character.stress.marked += card.recallCost;
        card.location = "loadout";
        commitChanges();
        renderDomainCards(character, activeDomainTab, editingCardIds);
      }
    } else if (target.classList.contains("card-free-equip-btn")) {
      const card = character.domainCards.find(
        (item) => item.id === target.dataset.cardId,
      );
      if (card && getLoadoutCount(character) < MAX_LOADOUT_CARDS) {
        card.location = "loadout";
        persistCharacter();
        renderDomainCards(character, activeDomainTab, editingCardIds);
      }
    } else if (
      target.classList.contains("gold-btn") &&
      isGoldUnit(target.dataset.unit)
    ) {
      const delta = Number(target.dataset.delta) || 0;
      character.gold = adjustGold(character.gold, target.dataset.unit, delta);
      commitChanges();
    } else if (
      target.classList.contains("trait-roll-btn") &&
      isTraitKey(target.dataset.trait)
    ) {
      const traitKey = target.dataset.trait;
      const traitLabel = target.textContent?.trim() || traitKey;
      await performTraitRoll(traitKey, traitLabel);
    } else if (
      target.classList.contains("weapon-attack-btn") &&
      isWeaponSlot(target.dataset.weapon)
    ) {
      const weapon = character.weapons[target.dataset.weapon];
      const traitName =
        weapon.trait.charAt(0).toUpperCase() + weapon.trait.slice(1);
      const label = weapon.name.trim()
        ? `${weapon.name.trim()} (${traitName})`
        : `${traitName} Attack`;
      await performTraitRoll(weapon.trait, label);
    } else if (target.id === "add-hope-feature-btn") {
      if (!Array.isArray(character.customHopeFeatures)) {
        character.customHopeFeatures = [];
      }
      const newId = `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      character.customHopeFeatures.push({
        id: newId,
        name: "",
        tag: "Hope Feature",
        text: "",
      });
      editingHopeFeatureId = newId;
      persistCharacter();
      renderClassFeatures(character, editingHopeFeatureId);
      const nameInput = document.querySelector(
        `.custom-hope-feature[data-hope-feature-id="${newId}"] .hope-edit-name`,
      );
      if (nameInput instanceof HTMLInputElement) nameInput.focus();
    } else if (target.classList.contains("hope-edit-btn")) {
      editingHopeFeatureId = target.dataset.hopeId ?? null;
      renderClassFeatures(character, editingHopeFeatureId);
    } else if (target.classList.contains("hope-cancel-btn")) {
      const id = target.dataset.hopeId;
      const existing = character.customHopeFeatures?.find((f) => f.id === id);
      // Clean up a brand-new blank entry if the user cancels before saving
      if (existing && !existing.name.trim() && !existing.text.trim()) {
        character.customHopeFeatures = character.customHopeFeatures.filter(
          (f) => f.id !== id,
        );
        persistCharacter();
      }
      editingHopeFeatureId = null;
      renderClassFeatures(character, editingHopeFeatureId);
    } else if (target.classList.contains("hope-save-btn")) {
      const id = target.dataset.hopeId;
      const cardEl = target.closest(".custom-hope-feature");
      const feat = character.customHopeFeatures?.find((f) => f.id === id);
      if (feat && cardEl) {
        const nameInput = cardEl.querySelector(".hope-edit-name");
        const tagInput = cardEl.querySelector(".hope-edit-tag");
        const textInput = cardEl.querySelector(".hope-edit-text");

        feat.name =
          nameInput instanceof HTMLInputElement && nameInput.value.trim()
            ? nameInput.value.trim()
            : "Custom Hope Feature (3 Hope)";
        feat.tag =
          tagInput instanceof HTMLInputElement && tagInput.value.trim()
            ? tagInput.value.trim()
            : "Hope Feature";
        feat.text =
          textInput instanceof HTMLTextAreaElement
            ? textInput.value.trim()
            : "";

        editingHopeFeatureId = null;
        persistCharacter();
        renderClassFeatures(character, editingHopeFeatureId);
      }
    } else if (target.classList.contains("hope-delete-btn")) {
      const id = target.dataset.hopeId;
      character.customHopeFeatures = (
        character.customHopeFeatures ?? []
      ).filter((f) => f.id !== id);
      editingHopeFeatureId = null;
      persistCharacter();
      renderClassFeatures(character, editingHopeFeatureId);
    } else if (
      target.classList.contains("weapon-damage-btn") &&
      isWeaponSlot(target.dataset.weapon)
    ) {
      if (isRolling) return;
      const weapon = character.weapons[target.dataset.weapon];
      const weaponName = weapon.name.trim() || "Weapon";

      isRolling = true;
      setRollingState(true, `${weaponName} Damage`);

      try {
        const result = await rollWeaponDamage(
          weaponName,
          character.proficiency,
          weapon.dieSides,
          weapon.flatBonus,
          weapon.damageType,
        );
        setRollerModeBadge(result.engine === "dice-plus");
        renderDamageRollResult(result);

        // if (obrConnected) {
        // const prefix = character.name ? `${character.name} — ` : "";
        // await OBR.notification.show(
        //   `${prefix}${result.weaponName}: ${result.total} ${result.damageType} damage (${result.notation})`,
        // );
        // }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected damage roll error";
        renderRollError(message);
      } finally {
        isRolling = false;
        setRollingState(false);
      }
    }
  });
}

OBR.onReady(async () => {
  obrConnected = true;

  // Race SRD catalog preload (2.5s cap) so SRD cards hydrate immediately on first paint
  const catalogReady = Promise.race([
    loadCardCatalog(),
    new Promise((resolve) => window.setTimeout(resolve, 2500)),
  ]);

  const [playerId, playerName, playerRole, initialMeta] = await Promise.all([
    OBR.player.getId(),
    OBR.player.getName(),
    OBR.player.getRole(),
    OBR.room.getMetadata(),
    catalogReady,
  ]);

  isGM = playerRole === "GM";

  if (badgeEl) {
    badgeEl.textContent = playerName;
    badgeEl.classList.add("connected");
  }

  // Auto-compress any legacy uncompressed sheets already in the room
  const migration = await migrateLegacyRoomSheets(initialMeta);
  const metadata =
    migration.migrated > 0 ? await OBR.room.getMetadata() : initialMeta;

  roomSheets = await extractRoomSheets(metadata);
  lastRoomBytes = measureMetadataBytes(metadata);
  activeSheetId = playerId;

  const existingSheet = roomSheets.get(playerId);
  if (existingSheet) {
    character = JSON.parse(JSON.stringify(existingSheet));
    saveLocalState(character);
    currentSyncStatus = "synced";
  } else {
    roomSheets.set(playerId, JSON.parse(JSON.stringify(character)));
    currentSyncStatus = "saving";
    renderSyncStatus(
      "saving",
      lastRoomBytes,
      ROOM_METADATA_WARN_BYTES,
      ROOM_METADATA_LIMIT_BYTES,
    );

    try {
      const budget = await saveSheetToRoom(playerId, character);
      lastRoomBytes = budget.totalBytes;
      currentSyncStatus = "synced";
      clearStorageWarning();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Initial room sync failed";
      currentSyncStatus = "error";
      showStorageWarning(msg);
      renderSyncStatus(
        "error",
        lastRoomBytes,
        ROOM_METADATA_WARN_BYTES,
        ROOM_METADATA_LIMIT_BYTES,
        msg,
      );
    }
  }

  renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
  updateTransferButtons();
  renderSyncStatus(
    currentSyncStatus,
    lastRoomBytes,
    ROOM_METADATA_WARN_BYTES,
    ROOM_METADATA_LIMIT_BYTES,
  );
  renderFullSheet();

  OBR.room.onMetadataChange(async (updatedMetadata) => {
    const seq = ++metadataSeq;
    const nextSheets = await extractRoomSheets(updatedMetadata);
    if (seq !== metadataSeq) return; // Discard stale out-of-order decode

    roomSheets = nextSheets;
    lastRoomBytes = measureMetadataBytes(updatedMetadata);

    if (!roomSheets.has(activeSheetId) && roomSheets.size > 0) {
      const fallbackId = roomSheets.keys().next().value;
      if (fallbackId) activeSheetId = fallbackId;
    }

    renderSheetSwitcher(roomSheets, activeSheetId, canManagePartySheets());
    updateTransferButtons();
    renderSyncStatus(
      currentSyncStatus,
      lastRoomBytes,
      ROOM_METADATA_WARN_BYTES,
      ROOM_METADATA_LIMIT_BYTES,
    );

    // Don't clobber active typing or an unsynced local draft while a save is queued/retrying
    if (roomSaver.hasPendingSaveFor(activeSheetId)) return;

    const remoteSheet = roomSheets.get(activeSheetId);
    if (!remoteSheet) return;

    if (JSON.stringify(remoteSheet) === JSON.stringify(character)) return;

    character = JSON.parse(JSON.stringify(remoteSheet));
    saveLocalState(character);
    renderFullSheet();
  });

  await refreshTokenHudUI();
  void syncTokenHudForSheet(activeSheetId, character);

  OBR.scene.onReadyChange(async (ready) => {
    await refreshTokenHudUI();
    if (ready && activeSheetId) {
      void syncTokenHudForSheet(activeSheetId, character);
    }
  });

  const isDicePlusReady = await checkDicePlusReady();
  setRollerModeBadge(isDicePlusReady);
});
