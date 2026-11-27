import {
  calculateDamageOutcome,
  DOMAIN_NAMES,
  getThresholds,
  MAX_LOADOUT_CARDS,
  getActiveClassSheetType,
} from "./state.js";
import { formatDamageFormula } from "./roller.js";
import {
  ANCESTRY_NAMES,
  CLASS_NAMES,
  COMMUNITY_NAMES,
  getAncestryData,
  getClassData,
  getCommunityData,
  getSubclassesForClass,
  getUnlockedSubclassTiers,
  COMPANION_UPGRADES,
  getBeastformById,
  getCharacterTier,
  SRD_BEASTFORMS,
} from "./srdData.js";
import { isCardCatalogLoaded, resolveCardDescription } from "./cardCatalog.js";

/**
 * @param {string} id
 * @param {string | number} value
 */
function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    el.value = String(value);
  }
}

/**
 * @param {string} selectId
 * @param {string[]} options
 */
function populateSelect(selectId, options) {
  const select = document.getElementById(selectId);
  if (!(select instanceof HTMLSelectElement)) return;
  select.replaceChildren();
  for (const label of options) {
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  }
}

/**
 * Populates Class, Community, and Ancestry dropdowns once on startup.
 */
export function populateStaticSelects() {
  populateSelect("char-class", CLASS_NAMES);
  populateSelect("heritage-community", COMMUNITY_NAMES);
  populateSelect("heritage-ancestry", ANCESTRY_NAMES);
  populateSelect("heritage-ancestry-2", ANCESTRY_NAMES);
}

/**
 * Updates the Subclass dropdown whenever the selected Class changes.
 * @param {string} className
 * @param {string} selectedSubclass
 */
export function populateSubclassSelect(className, selectedSubclass) {
  const subclasses = getSubclassesForClass(className);
  populateSelect("char-subclass", subclasses);
  setInputValue(
    "char-subclass",
    subclasses.includes(selectedSubclass) ? selectedSubclass : subclasses[0],
  );
}

/**
 * @param {string} containerId
 * @param {string} trackName
 * @param {number} filledCount
 * @param {number} maxCount
 */
function renderPips(containerId, trackName, filledCount, maxCount) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();

  for (let i = 1; i <= maxCount; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pip";
    if (i <= filledCount) {
      btn.classList.add("filled");
    }
    btn.dataset.track = trackName;
    btn.dataset.index = String(i);
    btn.setAttribute("aria-label", `${trackName} ${i} of ${maxCount}`);
    container.appendChild(btn);
  }
}

/**
 * Helper to create a clean feature card with a Ping button for Class, Subclass, or Heritage sections.
 * @param {string} title
 * @param {string} tag
 * @param {string} text
 * @param {string} [extraClass]
 * @param {{ category?: string, accent?: string }} [pingMeta]
 */
function createFeatureElement(
  title,
  tag,
  text,
  extraClass = "",
  pingMeta = {},
) {
  const box = document.createElement("div");
  box.className = extraClass ? `feature-item ${extraClass}` : "feature-item";

  const header = document.createElement("div");
  header.className = "feature-item-header";

  const strong = document.createElement("strong");
  strong.className = "feature-item-title";
  strong.textContent = title;

  const badge = document.createElement("span");
  badge.className = "feature-item-tag";
  badge.textContent = tag;

  header.append(strong, badge);

  const p = document.createElement("p");
  p.className = "feature-item-text";
  p.textContent = text;

  const footer = document.createElement("div");
  footer.className = "feature-item-footer";

  const pingBtn = document.createElement("button");
  pingBtn.type = "button";
  pingBtn.className = "small-btn feature-edit-btn ping-btn feature-ping-btn";
  pingBtn.dataset.pingCategory = pingMeta.category || "Feature";
  pingBtn.dataset.pingAccent = pingMeta.accent || "class";
  pingBtn.dataset.pingTitle = title;
  pingBtn.dataset.pingTag = tag;
  pingBtn.dataset.pingText = text;
  pingBtn.title = `Ping "${title}" to party chat`;
  pingBtn.innerHTML = `<i class="ra ra-bell" aria-hidden="true"></i> Ping`;

  footer.appendChild(pingBtn);
  box.append(header, p, footer);
  return box;
}

/**
 * Populates all static form inputs and selects from character state.
 * @param {import("./state.js").CharacterState} character
 */
export function syncInputs(character) {
  setInputValue("char-name", character.name);
  setInputValue("char-level", character.level);
  setInputValue("char-class", character.className);
  populateSubclassSelect(character.className, character.subclass);
  setInputValue("char-evasion", character.evasion);
  setInputValue("char-proficiency", character.proficiency);

  setInputValue("armor-name", character.armor.name);
  setInputValue("armor-feature", character.armor.feature);
  setInputValue("armor-major", character.armor.baseMajor);
  setInputValue("armor-severe", character.armor.baseSevere);
  setInputValue("armor-score", character.armor.score);

  setInputValue("heritage-community", character.community);
  setInputValue("heritage-ancestry", character.ancestry);
  setInputValue("heritage-ancestry-2", character.secondAncestry);

  const mixedEl = document.getElementById("heritage-mixed");
  if (mixedEl instanceof HTMLInputElement) {
    mixedEl.checked = character.mixedAncestry;
  }

  document.querySelectorAll(".trait-input").forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    const key = el.dataset.trait;
    if (
      key === "agility" ||
      key === "strength" ||
      key === "finesse" ||
      key === "instinct" ||
      key === "presence" ||
      key === "knowledge"
    ) {
      el.value = String(character.traits[key]);
    }
  });

  document.querySelectorAll(".weapon-field").forEach((el) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement))
      return;
    const slot = el.dataset.weapon;
    const field = el.dataset.field;
    if (slot !== "primary" && slot !== "secondary") return;

    const weapon = character.weapons[slot];
    if (
      field === "name" ||
      field === "trait" ||
      field === "range" ||
      field === "dieSides" ||
      field === "flatBonus" ||
      field === "damageType" ||
      field === "feature"
    ) {
      el.value = String(weapon[field]);
    }
  });
}

/**
 * Updates calculated thresholds, pip tracks, weapon damage formulas, gold, and conditions.
 * @param {import("./state.js").CharacterState} character
 */
export function renderDynamicUI(character) {
  const { major, severe } = getThresholds(character);

  const majorEl = document.getElementById("major-threshold");
  const severeEl = document.getElementById("severe-threshold");
  if (majorEl) majorEl.textContent = String(major);
  if (severeEl) severeEl.textContent = String(severe);

  // Keep Armor Score input synchronized if changed via Vitals +/- buttons
  const armorScoreInput = document.getElementById("armor-score");
  if (
    armorScoreInput instanceof HTMLInputElement &&
    document.activeElement !== armorScoreInput
  ) {
    armorScoreInput.value = String(character.armor.score);
  }

  renderPips("hp-pips", "hp", character.hp.marked, character.hp.max);
  renderPips(
    "stress-pips",
    "stress",
    character.stress.marked,
    character.stress.max,
  );
  renderPips("hope-pips", "hope", character.hope.current, character.hope.max);
  renderPips(
    "armor-pips",
    "armor",
    character.armor.slotsMarked,
    character.armor.score,
  );
  const hopePlusBtn = document.querySelector(
    '.vital-max-btn[data-vital="hope"][data-delta="1"]',
  );
  if (hopePlusBtn instanceof HTMLButtonElement) {
    hopePlusBtn.disabled = character.hope.max >= 6;
  }
  document.querySelectorAll(".weapon-damage-btn").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const slot = el.dataset.weapon;
    if (slot !== "primary" && slot !== "secondary") return;
    const w = character.weapons[slot];
    el.textContent = formatDamageFormula(
      character.proficiency,
      w.dieSides,
      w.flatBonus,
    );
  });

  const handfulsEl = document.getElementById("gold-handfuls");
  const bagsEl = document.getElementById("gold-bags");
  const chestsEl = document.getElementById("gold-chests");
  if (handfulsEl) handfulsEl.textContent = String(character.gold.handfuls);
  if (bagsEl) bagsEl.textContent = String(character.gold.bags);
  if (chestsEl) chestsEl.textContent = String(character.gold.chests);

  document.querySelectorAll(".condition-btn").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const cond = el.dataset.condition;
    if (cond === "vulnerable" || cond === "restrained" || cond === "hidden") {
      el.classList.toggle("active", character.conditions[cond]);
    }
  });
}

/**
 * Builds a custom Hope feature `.feature-item` matching the standard Hope feature styling,
 * with a bottom-right Edit button (or inline edit fields when active).
 * @param {{ id: string, name: string, tag: string, text: string }} feat
 * @param {boolean} isEditing
 */
function buildCustomHopeFeatureEl(feat, isEditing) {
  const item = document.createElement("div");
  item.className = "feature-item hope-feature custom-hope-feature";
  item.dataset.hopeFeatureId = feat.id;

  if (isEditing) {
    const form = document.createElement("div");
    form.className = "feature-edit-form";

    const topRow = document.createElement("div");
    topRow.className = "feature-edit-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "hope-edit-name";
    nameInput.placeholder = "Feature name";
    nameInput.value = feat.name;

    const tagInput = document.createElement("input");
    tagInput.type = "text";
    tagInput.className = "hope-edit-tag";
    tagInput.placeholder = "HOPE FEATURE";
    tagInput.value = feat.tag;

    topRow.append(nameInput, tagInput);

    const textArea = document.createElement("textarea");
    textArea.className = "hope-edit-text";
    textArea.placeholder = "Describe what happens when you spend Hope...";
    textArea.value = feat.text;

    const footer = document.createElement("div");
    footer.className = "feature-item-footer";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "small-btn danger-btn feature-edit-btn hope-delete-btn";
    delBtn.dataset.hopeId = feat.id;
    delBtn.textContent = "Delete";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "small-btn feature-edit-btn hope-cancel-btn";
    cancelBtn.dataset.hopeId = feat.id;
    cancelBtn.textContent = "Cancel";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "small-btn primary-btn feature-edit-btn hope-save-btn";
    saveBtn.dataset.hopeId = feat.id;
    saveBtn.textContent = "Save";

    footer.append(delBtn, cancelBtn, saveBtn);
    form.append(topRow, textArea, footer);
    item.appendChild(form);
    return item;
  }

  const header = document.createElement("div");
  header.className = "feature-item-header";

  const title = document.createElement("strong");
  title.className = "feature-item-title";
  title.textContent = feat.name || "Untitled Hope Feature";

  const tag = document.createElement("span");
  tag.className = "feature-item-tag";
  tag.textContent = feat.tag || "Hope Feature";

  header.append(title, tag);

  const text = document.createElement("p");
  text.className = "feature-item-text";
  text.textContent = feat.text || "Click Edit to add feature details.";

  const footer = document.createElement("div");
  footer.className = "feature-item-footer";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "small-btn feature-edit-btn hope-edit-btn";
  editBtn.dataset.hopeId = feat.id;
  editBtn.textContent = "Edit";

  const pingBtn = document.createElement("button");
  pingBtn.type = "button";
  pingBtn.className = "small-btn feature-edit-btn ping-btn feature-ping-btn";
  pingBtn.dataset.pingCategory = "Hope Feature";
  pingBtn.dataset.pingAccent = "hope";
  pingBtn.dataset.pingTitle = feat.name || "Untitled Hope Feature";
  pingBtn.dataset.pingTag = feat.tag || "Hope Feature";
  pingBtn.dataset.pingText = feat.text || "";
  pingBtn.title = "Ping this Hope Feature to party chat";
  pingBtn.innerHTML = `<i class="ra ra-bell" aria-hidden="true"></i> Ping`;

  footer.append(pingBtn, editBtn);

  footer.appendChild(editBtn);
  item.append(header, text, footer);
  return item;
}

/**
 * Renders Class Hope Feature, Class Features, and level-unlocked Subclass Features.
 * @param {import("./state.js").CharacterState} character
 * @param {string|null} editingHopeFeatureId
 */
export function renderClassFeatures(character, editingHopeFeatureId = null) {
  // ...keep your existing class Hope, class feature, and subclass feature rendering...
  const listEl = document.getElementById("class-features-list");
  const domainsEl = document.getElementById("class-domains-badge");
  if (!listEl) return;

  const classData = getClassData(character.className);
  const { subclassName, unlocked } = getUnlockedSubclassTiers(
    character.className,
    character.subclass,
    character.level,
  );

  if (domainsEl) {
    domainsEl.textContent = classData.domains.join(" • ");
  }

  listEl.replaceChildren();

  listEl.appendChild(
    createFeatureElement(
      classData.hopeFeature.name,
      "Hope Feature",
      classData.hopeFeature.text,
      "hope-feature",
      { category: "Hope Feature", accent: "hope" },
    ),
  );

  for (const feat of classData.classFeatures) {
    listEl.appendChild(
      createFeatureElement(feat.name, `${character.className}`, feat.text, "", {
        category: "Class Feature",
        accent: "class",
      }),
    );
  }

  for (const tier of unlocked) {
    for (const feat of tier.features) {
      listEl.appendChild(
        createFeatureElement(
          feat.name,
          `${subclassName} • ${tier.tierLabel}`,
          feat.text,
          "subclass-feature",
          { category: "Subclass Feature", accent: "subclass" },
        ),
      );
    }
  }

  const nextUnlocks = [];
  if (character.level < 5) nextUnlocks.push("Specialization unlocks at Lvl 5");
  if (character.level < 8) nextUnlocks.push("Mastery unlocks at Lvl 8");

  if (nextUnlocks.length > 0) {
    const hint = document.createElement("div");
    hint.className = "exp-hint";
    hint.textContent = nextUnlocks.join(" • ");
    listEl.appendChild(hint);
  }
  const customHopes = character.customHopeFeatures ?? [];
  if (customHopes.length > 0) {
    // Remove any "no class selected" empty placeholder if custom Hope features exist
    listEl.querySelector(".domain-empty")?.remove();

    // Auto-sort: insert immediately after the standard Class Hope feature, or at the top if none exists
    const standardHopeEl = listEl.querySelector(
      ".feature-item.hope-feature:not(.custom-hope-feature)",
    );
    const insertAnchor = standardHopeEl
      ? standardHopeEl.nextSibling
      : listEl.firstChild;

    for (const feat of customHopes) {
      const itemEl = buildCustomHopeFeatureEl(
        feat,
        feat.id === editingHopeFeatureId,
      );
      listEl.insertBefore(itemEl, insertAnchor);
    }
  }
}

/**
 * Renders the conditional Class/Subclass sub-sheet (Beastbound Companion or Druid Beastforms)
 * and hides the section entirely for classes that do not require an extra sheet.
 * @param {import("./state.js").CharacterState} character
 */
export function renderClassSheet(character) {
  const sectionEl = document.getElementById("sec-class-sheet");
  const titleEl = document.getElementById("class-sheet-title");
  const badgeEl = document.getElementById("class-sheet-badge");
  const bodyEl = document.getElementById("class-sheet-body");
  const jumpBtn = document.getElementById("jump-class-sheet");
  if (!sectionEl || !bodyEl) return;

  const sheetType = getActiveClassSheetType(character);
  sectionEl.classList.toggle("hidden", sheetType === null);

  if (!sheetType) {
    bodyEl.replaceChildren();
    return;
  }

  if (sheetType === "companion") {
    if (titleEl) {
      titleEl.innerHTML = `<i class="ra ra-pawprint" aria-hidden="true"></i> Ranger's Companion`;
    }
    if (jumpBtn) {
      jumpBtn.title = "Ranger's Companion";
      jumpBtn.setAttribute("aria-label", "Ranger's Companion");
    }
    if (badgeEl) {
      badgeEl.textContent = "Beastbound";
    }
    renderCompanionBody(bodyEl, character);
  } else if (sheetType === "beastform") {
    const tier = getCharacterTier(character.level);
    if (titleEl) {
      titleEl.innerHTML = `<i class="ra ra-pawprint" aria-hidden="true"></i> Druid Beastforms`;
    }
    if (jumpBtn) {
      jumpBtn.title = "Druid Beastforms";
      jumpBtn.setAttribute("aria-label", "Druid Beastforms");
    }
    if (badgeEl) {
      badgeEl.textContent = character.beastform.active
        ? `Active • Tier 1–${tier}`
        : `Tier 1–${tier} Unlocked`;
    }
    renderBeastformBody(bodyEl, character);
  }
}

/**
 * @param {HTMLElement} bodyEl
 * @param {import("./state.js").CharacterState} character
 */
function renderCompanionBody(bodyEl, character) {
  const comp = character.companion;
  bodyEl.replaceChildren();

  // Name & Species
  const idGrid = document.createElement("div");
  idGrid.className = "grid-2";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Companion Name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "comp-field";
  nameInput.dataset.compField = "name";
  nameInput.placeholder = "e.g. Fang, Pip";
  nameInput.value = comp.name;
  nameLabel.appendChild(nameInput);

  const speciesLabel = document.createElement("label");
  speciesLabel.textContent = "Species / Type";
  const speciesInput = document.createElement("input");
  speciesInput.type = "text";
  speciesInput.className = "comp-field";
  speciesInput.dataset.compField = "species";
  speciesInput.placeholder = "e.g. Dire Wolf, Owl";
  speciesInput.value = comp.species;
  speciesLabel.appendChild(speciesInput);

  idGrid.append(nameLabel, speciesLabel);

  // Evasion + Stress Pips
  const statsRow = document.createElement("div");
  statsRow.className = "companion-stats-bar";

  const evLabel = document.createElement("label");
  evLabel.className = "companion-evasion-label";
  evLabel.textContent = "Evasion";
  const evInput = document.createElement("input");
  evInput.type = "number";
  evInput.min = "1";
  evInput.max = "30";
  evInput.className = "comp-field";
  evInput.dataset.compField = "evasion";
  evInput.value = String(comp.evasion);
  evLabel.appendChild(evInput);

  const stressRow = document.createElement("div");
  stressRow.className = "track-row companion-stress-row";

  const labelGroup = document.createElement("div");
  labelGroup.className = "track-label-group";
  const stressText = document.createElement("span");
  stressText.textContent = "Stress";

  const stepper = document.createElement("div");
  stepper.className = "max-stepper";
  const minusBtn = document.createElement("button");
  minusBtn.type = "button";
  minusBtn.className = "vital-max-btn";
  minusBtn.dataset.vital = "companion-stress";
  minusBtn.dataset.delta = "-1";
  minusBtn.setAttribute("aria-label", "Decrease companion max Stress");
  minusBtn.textContent = "−";

  const plusBtn = document.createElement("button");
  plusBtn.type = "button";
  plusBtn.className = "vital-max-btn";
  plusBtn.dataset.vital = "companion-stress";
  plusBtn.dataset.delta = "1";
  plusBtn.setAttribute("aria-label", "Increase companion max Stress");
  plusBtn.textContent = "+";

  stepper.append(minusBtn, plusBtn);
  labelGroup.append(stressText, stepper);

  const pipsWrap = document.createElement("div");
  pipsWrap.id = "companion-stress-pips";
  pipsWrap.className = "pips";

  stressRow.append(labelGroup, pipsWrap);
  statsRow.append(evLabel, stressRow);

  // Companion Attack Block
  const atkBlock = document.createElement("div");
  atkBlock.className = "weapon-block";

  const atkHeader = document.createElement("div");
  atkHeader.className = "weapon-header-row";

  const atkName = document.createElement("input");
  atkName.type = "text";
  atkName.className = "comp-field";
  atkName.dataset.compField = "attackName";
  atkName.placeholder = "Companion attack (e.g. Bite, Claws)";
  atkName.value = comp.attackName;

  const atkBtn = document.createElement("button");
  atkBtn.type = "button";
  atkBtn.className = "weapon-attack-btn companion-roll-btn comp-attack-btn";
  atkBtn.textContent = "Atk";

  const dmgBtn = document.createElement("button");
  dmgBtn.type = "button";
  dmgBtn.className = "weapon-damage-btn companion-roll-btn comp-damage-btn";
  dmgBtn.textContent = formatDamageFormula(
    character.proficiency,
    comp.dieSides,
    comp.flatBonus,
  );

  atkHeader.append(atkName, atkBtn, dmgBtn);

  const atkGrid = document.createElement("div");
  atkGrid.className = "companion-atk-grid";

  const traitSelect = document.createElement("select");
  traitSelect.className = "comp-field";
  traitSelect.dataset.compField = "attackTrait";
  traitSelect.setAttribute("aria-label", "Command trait");
  for (const t of [
    "agility",
    "strength",
    "finesse",
    "instinct",
    "presence",
    "knowledge",
  ]) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    traitSelect.appendChild(opt);
  }
  traitSelect.value = comp.attackTrait;

  const rangeSelect = document.createElement("select");
  rangeSelect.className = "comp-field";
  rangeSelect.dataset.compField = "attackRange";
  rangeSelect.setAttribute("aria-label", "Companion attack range");
  for (const r of ["Melee", "Very Close", "Close", "Far", "Very Far"]) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rangeSelect.appendChild(opt);
  }
  rangeSelect.value = comp.attackRange;

  const dieSelect = document.createElement("select");
  dieSelect.className = "comp-field";
  dieSelect.dataset.compField = "dieSides";
  dieSelect.setAttribute("aria-label", "Companion damage die");
  for (const d of [6, 8, 10, 12]) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = `d${d}`;
    dieSelect.appendChild(opt);
  }
  dieSelect.value = String(comp.dieSides);

  const bonusInput = document.createElement("input");
  bonusInput.type = "number";
  bonusInput.className = "comp-field";
  bonusInput.dataset.compField = "flatBonus";
  bonusInput.placeholder = "+0";
  bonusInput.setAttribute("aria-label", "Companion flat damage bonus");
  bonusInput.value = String(comp.flatBonus);

  atkGrid.append(traitSelect, rangeSelect, dieSelect, bonusInput);
  atkBlock.append(atkHeader, atkGrid);

  // Companion Experiences
  const expHeader = document.createElement("div");
  expHeader.className = "section-header";
  const expTitle = document.createElement("strong");
  expTitle.className = "sub-section-title";
  expTitle.textContent = "Companion Experiences";
  const addExpBtn = document.createElement("button");
  addExpBtn.type = "button";
  addExpBtn.id = "add-comp-exp-btn";
  addExpBtn.className = "small-btn";
  addExpBtn.textContent = "+ Add";
  expHeader.append(expTitle, addExpBtn);

  const expList = document.createElement("div");
  expList.className = "exp-list";
  for (const exp of comp.experiences) {
    const row = document.createElement("div");
    row.className = "comp-exp-row";

    const lbl = document.createElement("input");
    lbl.type = "text";
    lbl.className = "comp-exp-label";
    lbl.dataset.compExpId = exp.id;
    lbl.placeholder = "Companion experience...";
    lbl.value = exp.label;

    const bon = document.createElement("input");
    bon.type = "number";
    bon.className = "comp-exp-bonus";
    bon.dataset.compExpId = exp.id;
    bon.value = String(exp.bonus);

    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "exp-remove-btn comp-exp-remove-btn";
    rm.dataset.compExpId = exp.id;
    rm.textContent = "×";
    rm.setAttribute("aria-label", "Remove companion experience");

    row.append(lbl, bon, rm);
    expList.appendChild(row);
  }

  // Companion Level-Up Upgrades
  const upDetails = document.createElement("details");
  upDetails.className = "companion-upgrades-box";
  const activeCount = Object.values(comp.upgrades ?? {}).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  );
  const upSummary = document.createElement("summary");
  upSummary.textContent = `Companion Level-Up Upgrades (${activeCount} taken)`;
  upDetails.appendChild(upSummary);

  const upList = document.createElement("div");
  upList.className = "companion-upgrades-list";
  for (const up of COMPANION_UPGRADES) {
    const count = Math.max(
      0,
      Math.min(up.maxPicks, Number(comp.upgrades?.[up.id] ?? 0) || 0),
    );
    const row = document.createElement("div");
    row.className = `companion-upgrade-row${count > 0 ? " taken" : ""}`;

    const info = document.createElement("div");
    info.className = "companion-upgrade-info";
    const strong = document.createElement("strong");
    strong.textContent = up.name;
    const desc = document.createElement("p");
    desc.textContent = up.text;
    info.append(strong, desc);

    const ctrl = document.createElement("div");
    ctrl.className = "companion-upgrade-ctrl";
    if (up.maxPicks === 1) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "exp-check comp-upgrade-check";
      cb.dataset.upgradeId = up.id;
      cb.checked = count > 0;
      ctrl.appendChild(cb);
    } else {
      const dec = document.createElement("button");
      dec.type = "button";
      dec.className = "vital-max-btn comp-upgrade-step";
      dec.dataset.upgradeId = up.id;
      dec.dataset.delta = "-1";
      dec.disabled = count <= 0;
      dec.textContent = "−";

      const val = document.createElement("span");
      val.className = "comp-upgrade-count";
      val.textContent = `${count}/${up.maxPicks}`;

      const inc = document.createElement("button");
      inc.type = "button";
      inc.className = "vital-max-btn comp-upgrade-step";
      inc.dataset.upgradeId = up.id;
      inc.dataset.delta = "1";
      inc.disabled = count >= up.maxPicks;
      inc.textContent = "+";

      ctrl.append(dec, val, inc);
    }

    row.append(info, ctrl);
    upList.appendChild(row);
  }
  upDetails.appendChild(upList);

  // Notes
  const notesLabel = document.createElement("label");
  notesLabel.textContent = "Companion Notes / Bond";
  const notesInput = document.createElement("textarea");
  notesInput.className = "comp-field";
  notesInput.dataset.compField = "notes";
  notesInput.rows = 2;
  notesInput.placeholder = "Appearance, quirks, or bond details...";
  notesInput.value = comp.notes;
  notesLabel.appendChild(notesInput);

  bodyEl.append(
    idGrid,
    statsRow,
    atkBlock,
    expHeader,
    expList,
    upDetails,
    notesLabel,
  );

  // Render stress pips into the newly appended container
  renderPips(
    "companion-stress-pips",
    "companion-stress",
    comp.stress.marked,
    comp.stress.max,
  );
}

/**
 * @param {HTMLElement} bodyEl
 * @param {import("./state.js").CharacterState} character
 */
function renderBeastformBody(bodyEl, character) {
  const bf = character.beastform;
  const maxTier = getCharacterTier(character.level);
  const availableForms = SRD_BEASTFORMS.filter((f) => f.tier <= maxTier);
  let selectedForm = getBeastformById(bf.formId);
  if (selectedForm.tier > maxTier) {
    selectedForm = availableForms[0];
  }

  bodyEl.replaceChildren();

  // Form Picker + Flavor Name
  const pickerGrid = document.createElement("div");
  pickerGrid.className = "grid-2";

  const formLabel = document.createElement("label");
  formLabel.textContent = "Beastform Preset";
  const select = document.createElement("select");
  select.id = "beastform-select";
  for (const tier of /** @type {const} */ ([1, 2, 3, 4])) {
    if (tier > maxTier) continue;
    const group = document.createElement("optgroup");
    group.label = `Tier ${tier}`;
    for (const form of availableForms.filter((f) => f.tier === tier)) {
      const opt = document.createElement("option");
      opt.value = form.id;
      opt.textContent = form.name;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
  select.value = selectedForm.id;
  formLabel.appendChild(select);

  const flavorLabel = document.createElement("label");
  flavorLabel.textContent = "Chosen Creature";
  const flavorInput = document.createElement("input");
  flavorInput.type = "text";
  flavorInput.id = "beastform-custom-name";
  flavorInput.placeholder = `e.g. ${selectedForm.examples.split(",")[0]}`;
  flavorInput.value = bf.customName;
  flavorLabel.appendChild(flavorInput);

  pickerGrid.append(formLabel, flavorLabel);

  // Transform / Evolution / Drop Action Bar
  const actionBar = document.createElement("div");
  actionBar.className = "beastform-actions";

  if (!bf.active) {
    const canStress = character.stress.marked < character.stress.max;
    const canHope = character.hope.current >= 3;

    const transformBtn = document.createElement("button");
    transformBtn.type = "button";
    transformBtn.id = "beastform-transform-btn";
    transformBtn.className = "small-btn primary-btn";
    transformBtn.disabled = !canStress;
    transformBtn.textContent = "Transform (1 Stress)";

    const evoBtn = document.createElement("button");
    evoBtn.type = "button";
    evoBtn.id = "beastform-evolution-btn";
    evoBtn.className = "small-btn";
    evoBtn.disabled = !canHope;
    evoBtn.textContent = "Evolution (3 Hope, +1 Trait)";

    actionBar.append(transformBtn, evoBtn);
  } else {
    const evoWrap = document.createElement("label");
    evoWrap.className = "beastform-evo-select";
    evoWrap.textContent = "Evolution +1 Trait";
    const evoSelect = document.createElement("select");
    evoSelect.id = "beastform-evo-trait";
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "None (1 Stress form)";
    evoSelect.appendChild(noneOpt);
    for (const t of [
      "agility",
      "strength",
      "finesse",
      "instinct",
      "presence",
      "knowledge",
    ]) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = `+1 ${t.charAt(0).toUpperCase() + t.slice(1)}`;
      evoSelect.appendChild(opt);
    }
    evoSelect.value = bf.evolutionTrait || "";
    evoWrap.appendChild(evoSelect);

    const dropBtn = document.createElement("button");
    dropBtn.type = "button";
    dropBtn.id = "beastform-drop-btn";
    dropBtn.className = "small-btn danger-btn";
    dropBtn.textContent = "Drop Beastform";

    actionBar.append(evoWrap, dropBtn);
  }

  // Stat Card
  const statCard = document.createElement("div");
  statCard.className = `beastform-card${bf.active ? " is-active" : ""}`;

  const traitCap =
    selectedForm.bonusTrait.charAt(0).toUpperCase() +
    selectedForm.bonusTrait.slice(1);
  const atkTraitCap =
    selectedForm.attackTrait.charAt(0).toUpperCase() +
    selectedForm.attackTrait.slice(1);
  const effectiveEvasion = character.evasion + selectedForm.evasionBonus;

  const metaRow = document.createElement("div");
  metaRow.className = "domain-card-meta";

  const tierPill = document.createElement("span");
  tierPill.className = "domain-pill";
  tierPill.textContent = `Tier ${selectedForm.tier} • ${selectedForm.examples}`;

  const traitPill = document.createElement("span");
  traitPill.className = "domain-pill";
  traitPill.textContent = `${traitCap} +${selectedForm.traitBonus}`;

  const evPill = document.createElement("span");
  evPill.className = "domain-pill";
  evPill.textContent = `Evasion +${selectedForm.evasionBonus} (${effectiveEvasion})`;

  metaRow.append(tierPill, traitPill, evPill);

  // Natural Attack Roll Row
  const atkRow = document.createElement("div");
  atkRow.className = "beastform-atk-row";

  const atkSummary = document.createElement("span");
  atkSummary.className = "beastform-atk-label";
  const dmgFormula = formatDamageFormula(
    character.proficiency,
    selectedForm.dieSides,
    selectedForm.flatBonus,
  );
  atkSummary.textContent = `${selectedForm.attackRange} • ${atkTraitCap} • ${dmgFormula} ${selectedForm.damageType}`;

  const atkBtns = document.createElement("div");
  atkBtns.className = "beastform-atk-btns";

  const atkRollBtn = document.createElement("button");
  atkRollBtn.type = "button";
  atkRollBtn.className = "weapon-attack-btn beastform-roll-btn bf-attack-btn";
  atkRollBtn.textContent = "Atk";

  const dmgRollBtn = document.createElement("button");
  dmgRollBtn.type = "button";
  dmgRollBtn.className = "weapon-damage-btn beastform-roll-btn bf-damage-btn";
  dmgRollBtn.textContent = dmgFormula;

  atkBtns.append(atkRollBtn, dmgRollBtn);
  atkRow.append(atkSummary, atkBtns);

  // Advantages
  const advP = document.createElement("p");
  advP.className = "beastform-advantages";
  advP.textContent = `Advantage on: ${selectedForm.advantages.join(", ")}`;

  // Form Features
  const featList = document.createElement("div");
  featList.className = "feature-stack";
  for (const feat of selectedForm.features) {
    const fBox = document.createElement("div");
    fBox.className = "feature-item";
    const fTitle = document.createElement("strong");
    fTitle.className = "feature-item-title";
    fTitle.textContent = feat.name;
    const fText = document.createElement("p");
    fText.className = "feature-item-text";
    fText.textContent = feat.text;
    fBox.append(fTitle, fText);
    featList.appendChild(fBox);
  }

  statCard.append(metaRow, atkRow, advP, featList);

  // Notes (especially handy for Legendary/Mythic Hybrid choices)
  const notesLabel = document.createElement("label");
  notesLabel.textContent = "Beastform / Hybrid Notes";
  const notesInput = document.createElement("textarea");
  notesInput.id = "beastform-notes";
  notesInput.rows = 2;
  notesInput.placeholder =
    "Optional appearance details or Legendary/Mythic Hybrid picks...";
  notesInput.value = bf.notes;
  notesLabel.appendChild(notesInput);

  bodyEl.append(pickerGrid, actionBar, statCard, notesLabel);
}

/**
 * Renders Community and Ancestry features (supporting Mixed Ancestry toggle).
 * @param {import("./state.js").CharacterState} character
 */
export function renderHeritageFeatures(character) {
  const secondWrap = document.getElementById("second-ancestry-wrap");
  const listEl = document.getElementById("heritage-features-list");

  if (secondWrap) {
    secondWrap.classList.toggle("hidden", !character.mixedAncestry);
  }

  if (!listEl) return;
  listEl.replaceChildren();

  const community = getCommunityData(character.community);
  listEl.appendChild(
    createFeatureElement(
      community.feature.name,
      `${character.community} Community`,
      community.feature.text,
      "heritage-feature",
      { category: "Heritage", accent: "heritage" },
    ),
  );

  const primary = getAncestryData(character.ancestry);

  if (!character.mixedAncestry) {
    listEl.appendChild(
      createFeatureElement(
        primary.top.name,
        `${character.ancestry} (Top)`,
        primary.top.text,
        "",
        { category: "Heritage", accent: "heritage" },
      ),
    );
    listEl.appendChild(
      createFeatureElement(
        primary.bottom.name,
        `${character.ancestry} (Bottom)`,
        primary.bottom.text,
        "",
        { category: "Heritage", accent: "heritage" },
      ),
    );
  } else {
    const secondary = getAncestryData(character.secondAncestry);
    listEl.appendChild(
      createFeatureElement(
        primary.top.name,
        `${character.ancestry} (Top)`,
        primary.top.text,
        "",
        { category: "Heritage", accent: "heritage" },
      ),
    );
    listEl.appendChild(
      createFeatureElement(
        secondary.bottom.name,
        `${character.secondAncestry} (Bottom)`,
        secondary.bottom.text,
        "",
        { category: "Heritage", accent: "heritage" },
      ),
    );

    const note = document.createElement("div");
    note.className = "exp-hint";
    note.textContent =
      "Mixed Ancestry displays Top feature from Ancestry 1 + Bottom feature from Ancestry 2 (swap dropdowns to reverse).";
    listEl.appendChild(note);
  }
}

/**
 * Renders the simple Inventory list of text inputs.
 * @param {import("./state.js").CharacterState} character
 */
export function renderInventory(character) {
  const listEl = document.getElementById("inventory-list");
  if (!listEl) return;

  listEl.replaceChildren();

  if (character.inventory.length === 0) {
    const empty = document.createElement("div");
    empty.className = "domain-empty";
    empty.textContent =
      "No items yet. Click + Item to track gear, potions, or notes.";
    listEl.appendChild(empty);
    return;
  }

  for (const item of character.inventory) {
    const row = document.createElement("div");
    row.className = "inv-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "inv-text-input";
    input.dataset.invId = item.id;
    input.placeholder = "Item name or note...";
    input.value = item.text;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "inv-remove-btn";
    removeBtn.dataset.invId = item.id;
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove item");

    const pingBtn = document.createElement("button");
    pingBtn.type = "button";
    pingBtn.className = "ping-btn ping-icon-btn inv-ping-btn";
    pingBtn.dataset.invId = item.id;
    pingBtn.title = "Ping item to party chat";
    pingBtn.setAttribute("aria-label", "Ping item to party chat");
    pingBtn.innerHTML = `<i class="ra ra-bell" aria-hidden="true"></i>`;

    row.append(input, pingBtn, removeBtn);
    listEl.appendChild(row);
  }
}

/**
 * @param {import("./state.js").CharacterState} character
 * @param {number} incomingDamage
 */
export function renderDamagePreview(character, incomingDamage) {
  const previewEl = document.getElementById("damage-preview");
  const takeBtn = document.getElementById("apply-damage-btn");
  const armorBtn = document.getElementById("apply-armor-damage-btn");

  const outcome = calculateDamageOutcome(character, incomingDamage);

  if (outcome.hpLoss === 0) {
    if (previewEl) previewEl.textContent = "Enter damage to evaluate";
    if (takeBtn instanceof HTMLButtonElement) {
      takeBtn.textContent = "Take Damage";
      takeBtn.disabled = true;
    }
    if (armorBtn instanceof HTMLButtonElement) {
      armorBtn.textContent = "Mark 1 Armor";
      armorBtn.disabled = true;
    }
    return;
  }

  if (previewEl) {
    previewEl.textContent = `${outcome.severity} (${outcome.hpLoss} HP)`;
  }

  if (takeBtn instanceof HTMLButtonElement) {
    takeBtn.textContent = `Take ${outcome.hpLoss} HP`;
    takeBtn.disabled = false;
  }

  if (armorBtn instanceof HTMLButtonElement) {
    if (outcome.canUseArmor) {
      armorBtn.textContent = `1 Armor → ${outcome.reducedHpLoss} HP`;
      armorBtn.disabled = false;
    } else {
      armorBtn.textContent = "No Armor Slots Left";
      armorBtn.disabled = true;
    }
  }
}

/** @param {import("./roller.js").RollMode} rollMode */
export function renderRollMode(rollMode) {
  document.querySelectorAll(".mode-btn").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    el.classList.toggle("active", el.dataset.mode === rollMode);
  });
}

/** @param {boolean} isReaction */
export function renderRollType(isReaction) {
  document.querySelectorAll(".roll-type-btn").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const isActive = isReaction
      ? el.dataset.rollType === "reaction"
      : el.dataset.rollType === "action";
    el.classList.toggle("active", isActive);
  });
}

/**
 * @param {import("./state.js").CharacterState} character
 * @param {Set<string>} selectedIds
 */
export function renderExperiences(character, selectedIds) {
  const listEl = document.getElementById("experiences-list");
  if (!listEl) return;

  listEl.replaceChildren();

  for (const exp of character.experiences) {
    const row = document.createElement("div");
    row.className = "exp-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "exp-check";
    checkbox.dataset.expId = exp.id;
    checkbox.checked = selectedIds.has(exp.id);
    checkbox.setAttribute(
      "aria-label",
      `Apply ${exp.label || "experience"} to next roll`,
    );

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "exp-label-input";
    labelInput.dataset.expId = exp.id;
    labelInput.placeholder = "Experience phrase...";
    labelInput.value = exp.label;

    const bonusInput = document.createElement("input");
    bonusInput.type = "number";
    bonusInput.className = "exp-bonus-input";
    bonusInput.dataset.expId = exp.id;
    bonusInput.value = String(exp.bonus);
    bonusInput.setAttribute("aria-label", "Experience bonus");

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "exp-remove-btn";
    removeBtn.dataset.expId = exp.id;
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove experience");

    const pingBtn = document.createElement("button");
    pingBtn.type = "button";
    pingBtn.className = "ping-btn ping-icon-btn exp-ping-btn";
    pingBtn.dataset.expId = exp.id;
    pingBtn.title = "Ping experience to party chat";
    pingBtn.setAttribute("aria-label", "Ping experience to party chat");
    pingBtn.innerHTML = `<i class="ra ra-bell" aria-hidden="true"></i>`;

    row.append(checkbox, labelInput, bonusInput, pingBtn, removeBtn);
    listEl.appendChild(row);
  }

  syncExperienceControls(character, selectedIds);
}

/**
 * @param {import("./state.js").CharacterState} character
 * @param {Set<string>} selectedIds
 */
export function syncExperienceControls(character, selectedIds) {
  const hopeAvailable = character.hope.current;
  const selectedCount = selectedIds.size;

  document.querySelectorAll(".exp-check").forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    const id = el.dataset.expId ?? "";
    const isChecked = selectedIds.has(id);
    el.checked = isChecked;
    el.disabled = !isChecked && selectedCount >= hopeAvailable;
  });

  const hintEl = document.getElementById("exp-hope-hint");
  if (!hintEl) return;

  if (selectedCount > 0) {
    let totalBonus = 0;
    for (const exp of character.experiences) {
      if (selectedIds.has(exp.id)) {
        totalBonus += exp.bonus;
      }
    }
    const sign = totalBonus >= 0 ? "+" : "";
    hintEl.textContent = `Next roll: ${sign}${totalBonus} (spends ${selectedCount} Hope)`;
    hintEl.classList.add("has-selection");
  } else if (hopeAvailable === 0) {
    hintEl.textContent = "No Hope remaining to apply an Experience.";
    hintEl.classList.remove("has-selection");
  } else {
    hintEl.textContent =
      "Check an Experience before clicking a Trait to spend 1 Hope.";
    hintEl.classList.remove("has-selection");
  }
}

/**
 * @param {import("./state.js").CharacterState} character
 * @param {import("./state.js").CardLocation} activeTab
 * @param {Set<string>} editingIds
 */
export function renderDomainCards(character, activeTab, editingIds) {
  const listEl = document.getElementById("domain-cards-list");
  const hintEl = document.getElementById("domain-cards-hint");
  const loadoutCountEl = document.getElementById("tab-count-loadout");
  const vaultCountEl = document.getElementById("tab-count-vault");

  const loadoutCards = character.domainCards.filter(
    (c) => c.location === "loadout",
  );
  const vaultCards = character.domainCards.filter(
    (c) => c.location === "vault",
  );
  const loadoutFull = loadoutCards.length >= MAX_LOADOUT_CARDS;
  const availableStress = character.stress.max - character.stress.marked;

  if (loadoutCountEl) loadoutCountEl.textContent = String(loadoutCards.length);
  if (vaultCountEl) vaultCountEl.textContent = String(vaultCards.length);

  document.querySelectorAll(".domain-tab-btn").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    el.classList.toggle("active", el.dataset.tab === activeTab);
  });

  if (!listEl) return;
  listEl.replaceChildren();

  const visibleCards = activeTab === "loadout" ? loadoutCards : vaultCards;

  if (visibleCards.length === 0) {
    const empty = document.createElement("div");
    empty.className = "domain-empty";
    empty.textContent =
      activeTab === "loadout"
        ? "No active cards in your Loadout. Click + Card or recall one from your Vault."
        : "Your Vault is empty. Extra cards above your 5-card Loadout live here.";
    listEl.appendChild(empty);
  }

  for (const card of visibleCards) {
    const article = document.createElement("article");
    article.className = `domain-card domain-${card.domain.toLowerCase()}`;

    const isEditing = editingIds.has(card.id);

    if (isEditing) {
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "card-field";
      nameInput.dataset.cardId = card.id;
      nameInput.dataset.field = "name";
      nameInput.placeholder = "Card name (e.g. Rain of Blades)";
      nameInput.value = card.name;

      const grid = document.createElement("div");
      grid.className = "domain-edit-grid";

      const domainSelect = document.createElement("select");
      domainSelect.className = "card-field";
      domainSelect.dataset.cardId = card.id;
      domainSelect.dataset.field = "domain";
      domainSelect.setAttribute("aria-label", "Card domain");
      for (const domainName of DOMAIN_NAMES) {
        const opt = document.createElement("option");
        opt.value = domainName;
        opt.textContent = domainName;
        domainSelect.appendChild(opt);
      }
      domainSelect.value = card.domain;

      const levelInput = document.createElement("input");
      levelInput.type = "number";
      levelInput.min = "1";
      levelInput.max = "10";
      levelInput.className = "card-field";
      levelInput.dataset.cardId = card.id;
      levelInput.dataset.field = "level";
      levelInput.title = "Card Level";
      levelInput.setAttribute("aria-label", "Card level");
      levelInput.value = String(card.level);

      const typeSelect = document.createElement("select");
      typeSelect.className = "card-field";
      typeSelect.dataset.cardId = card.id;
      typeSelect.dataset.field = "cardType";
      typeSelect.setAttribute("aria-label", "Card type");
      for (const cardType of ["Ability", "Spell", "Grimoire"]) {
        const opt = document.createElement("option");
        opt.value = cardType;
        opt.textContent = cardType;
        typeSelect.appendChild(opt);
      }
      typeSelect.value = card.cardType;

      const recallInput = document.createElement("input");
      recallInput.type = "number";
      recallInput.min = "0";
      recallInput.max = "6";
      recallInput.className = "card-field";
      recallInput.dataset.cardId = card.id;
      recallInput.dataset.field = "recallCost";
      recallInput.title = "Recall Cost (Stress)";
      recallInput.setAttribute("aria-label", "Recall cost in Stress");
      recallInput.value = String(card.recallCost);

      grid.append(domainSelect, levelInput, typeSelect, recallInput);

      const descInput = document.createElement("textarea");
      descInput.className = "card-field";
      descInput.dataset.cardId = card.id;
      descInput.dataset.field = "description";
      descInput.placeholder =
        "Card rules, Hope/Stress costs, or spell effects...";
      descInput.value = resolveCardDescription(card);

      const actions = document.createElement("div");
      actions.className = "domain-card-actions";
      actions.style.marginTop = "6px";

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "card-action-btn card-edit-btn";
      doneBtn.dataset.cardId = card.id;
      doneBtn.textContent = "Done";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "card-action-btn danger card-delete-btn";
      deleteBtn.dataset.cardId = card.id;
      deleteBtn.textContent = "Delete";

      actions.append(doneBtn, deleteBtn);
      article.append(nameInput, grid, descInput, actions);
    } else {
      const top = document.createElement("div");
      top.className = "domain-card-top";

      const title = document.createElement("strong");
      title.className = "domain-card-title";
      title.textContent = card.name.trim() || "Untitled Card";

      const topActions = document.createElement("div");
      topActions.className = "domain-card-top-actions";

      const pingBtn = document.createElement("button");
      pingBtn.type = "button";
      pingBtn.className = "small-btn ping-btn card-ping-btn";
      pingBtn.dataset.cardId = card.id;
      pingBtn.title = "Ping Domain Card to party chat";
      pingBtn.innerHTML = `<i class="ra ra-bell" aria-hidden="true"></i> Ping`;

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "small-btn card-edit-btn";
      editBtn.dataset.cardId = card.id;
      editBtn.textContent = "Edit";

      topActions.append(pingBtn, editBtn);
      top.append(title, topActions);

      const meta = document.createElement("div");
      meta.className = "domain-card-meta";

      const domainPill = document.createElement("span");
      domainPill.className = "domain-pill";
      domainPill.textContent = `${card.domain} • Lvl ${card.level} ${card.cardType}`;

      const recallPill = document.createElement("span");
      recallPill.className = "domain-pill recall";
      recallPill.textContent = `Recall: ${card.recallCost}`;

      meta.append(domainPill, recallPill);
      article.append(top, meta);

      const resolvedDesc = resolveCardDescription(card);
      if (resolvedDesc.trim()) {
        const desc = document.createElement("p");
        desc.className = "domain-card-desc";
        desc.textContent = resolvedDesc;
        article.appendChild(desc);
      } else if (card.srdId && !isCardCatalogLoaded()) {
        const desc = document.createElement("p");
        desc.className = "domain-card-desc";
        desc.textContent = "Loading SRD card text...";
        article.appendChild(desc);
      }

      const actions = document.createElement("div");
      actions.className = "domain-card-actions";

      if (card.location === "loadout") {
        const toVaultBtn = document.createElement("button");
        toVaultBtn.type = "button";
        toVaultBtn.className = "card-action-btn card-to-vault-btn";
        toVaultBtn.dataset.cardId = card.id;
        toVaultBtn.textContent = "→ Move to Vault";
        actions.appendChild(toVaultBtn);
      } else {
        if (card.recallCost > 0) {
          const recallBtn = document.createElement("button");
          recallBtn.type = "button";
          recallBtn.className = "card-action-btn recall card-recall-btn";
          recallBtn.dataset.cardId = card.id;
          recallBtn.textContent = `Recall (-${card.recallCost} Stress)`;
          recallBtn.disabled = loadoutFull || availableStress < card.recallCost;
          actions.appendChild(recallBtn);
        }

        const freeEquipBtn = document.createElement("button");
        freeEquipBtn.type = "button";
        freeEquipBtn.className = "card-action-btn card-free-equip-btn";
        freeEquipBtn.dataset.cardId = card.id;
        freeEquipBtn.textContent =
          card.recallCost > 0 ? "Rest Swap (Free)" : "→ Equip (Free)";
        freeEquipBtn.disabled = loadoutFull;
        actions.appendChild(freeEquipBtn);
      }

      article.appendChild(actions);
    }

    listEl.appendChild(article);
  }

  if (hintEl) {
    if (activeTab === "vault" && loadoutFull) {
      hintEl.textContent =
        "Loadout full (5/5) — move a Loadout card to Vault before recalling.";
    } else if (activeTab === "vault") {
      hintEl.textContent = `Available Stress slots: ${availableStress}/${character.stress.max}. Use Rest Swap during a Rest.`;
    } else {
      hintEl.textContent = `Active Loadout holds up to ${MAX_LOADOUT_CARDS} Domain Cards.`;
    }
  }
}

/**
 * @param {import("./roller.js").DualityRollResult} result
 * @param {string} [hopeNote]
 */
export function renderRollResult(result, hopeNote = "") {
  const bannerEl = document.getElementById("sec-roll");
  const summaryEl = document.getElementById("roll-summary");
  const breakdownEl = document.getElementById("roll-breakdown");
  const modeEl = document.getElementById("roller-mode");

  if (bannerEl) {
    bannerEl.classList.remove(
      "outcome-hope",
      "outcome-fear",
      "outcome-critical",
      "outcome-damage",
      "outcome-reaction",
    );
    bannerEl.classList.add(`outcome-${result.outcome}`);
  }

  if (summaryEl) {
    summaryEl.textContent = `${result.traitLabel}: ${result.total} (${result.outcomeText})`;
  }

  if (breakdownEl) {
    const traitSign = result.traitModifier >= 0 ? "+" : "";
    const parts = result.isReaction
      ? [
          `2d12: [${result.hopeDie}, ${result.fearDie}]`,
          `Trait: ${traitSign}${result.traitModifier}`,
        ]
      : [
          `Hope: ${result.hopeDie}`,
          `Fear: ${result.fearDie}`,
          `Trait: ${traitSign}${result.traitModifier}`,
        ];

    if (result.rollMode === "advantage" && result.advDie !== null) {
      parts.push(`Adv d6: +${result.advDie}`);
    } else if (result.rollMode === "disadvantage" && result.advDie !== null) {
      parts.push(`Dis d6: -${result.advDie}`);
    }

    if (result.appliedExperiences.length > 0) {
      const expSign = result.experienceBonus >= 0 ? "+" : "";
      parts.push(
        `Exp: ${expSign}${result.experienceBonus} (${result.appliedExperiences.join(", ")})`,
      );
    }

    if (hopeNote) {
      parts.push(hopeNote);
    }

    breakdownEl.textContent = parts.join(" • ");
  }

  if (modeEl) {
    modeEl.textContent = result.engine === "dice-plus" ? "Dice+" : "Local 2d12";
  }
}

/** @param {import("./roller.js").DamageRollResult} result */
export function renderDamageRollResult(result) {
  const bannerEl = document.getElementById("sec-roll");
  const summaryEl = document.getElementById("roll-summary");
  const breakdownEl = document.getElementById("roll-breakdown");
  const modeEl = document.getElementById("roller-mode");

  if (bannerEl) {
    bannerEl.classList.remove(
      "outcome-hope",
      "outcome-fear",
      "outcome-critical",
      "outcome-damage",
      "outcome-reaction",
    );
    bannerEl.classList.add("outcome-damage");
  }

  if (summaryEl) {
    summaryEl.textContent = `${result.weaponName}: ${result.total} ${result.damageType} Dmg`;
  }

  if (breakdownEl) {
    const modPart =
      result.flatBonus > 0
        ? ` + ${result.flatBonus}`
        : result.flatBonus < 0
          ? ` - ${Math.abs(result.flatBonus)}`
          : "";
    breakdownEl.textContent = `${result.notation} → [${result.diceRolls.join(", ")}]${modPart}`;
  }

  if (modeEl) {
    modeEl.textContent = result.engine === "dice-plus" ? "Dice+" : "Local 2d12";
  }
}

/** @param {boolean} isDicePlus */
export function setRollerModeBadge(isDicePlus) {
  const modeEl = document.getElementById("roller-mode");
  if (!modeEl) return;
  modeEl.textContent = isDicePlus ? "Dice+" : "Local 2d12";
  modeEl.classList.toggle("connected", isDicePlus);
}

/**
 * @param {boolean} isRolling
 * @param {string} [label]
 */
export function setRollingState(isRolling, label = "") {
  document
    .querySelectorAll(
      ".trait-roll-btn, .weapon-attack-btn, .weapon-damage-btn, .companion-roll-btn, .beastform-roll-btn",
    )
    .forEach((el) => {
      if (el instanceof HTMLButtonElement) {
        el.disabled = isRolling;
      }
    });

  if (isRolling) {
    const summaryEl = document.getElementById("roll-summary");
    const breakdownEl = document.getElementById("roll-breakdown");
    if (summaryEl) summaryEl.textContent = `Rolling ${label}...`;
    if (breakdownEl) breakdownEl.textContent = "Waiting for 3D dice to settle";
  }
}

/** @param {string} message */
export function renderRollError(message) {
  const bannerEl = document.getElementById("sec-roll");
  const summaryEl = document.getElementById("roll-summary");
  const breakdownEl = document.getElementById("roll-breakdown");

  if (bannerEl) {
    bannerEl.classList.remove(
      "outcome-hope",
      "outcome-fear",
      "outcome-critical",
      "outcome-damage",
      "outcome-reaction",
    );
    bannerEl.classList.add("outcome-fear");
  }
  if (summaryEl) summaryEl.textContent = "Roll failed";
  if (breakdownEl) breakdownEl.textContent = message;
}

/**
 * @param {import("./storage.js").SyncStatus} status
 * @param {number | null} roomBytes
 * @param {number} warnBytes
 * @param {number} limitBytes
 * @param {string} [errorMessage]
 */
export function renderSyncStatus(
  status,
  roomBytes,
  warnBytes,
  limitBytes,
  errorMessage = "",
) {
  const statusEl = document.getElementById("sync-status");
  const budgetEl = document.getElementById("room-budget");

  if (statusEl) {
    statusEl.classList.remove("status-synced", "status-saving", "status-error");

    if (status === "synced") {
      statusEl.textContent = "Synced";
      statusEl.classList.add("status-synced");
      statusEl.title = "Saved in Owlbear Rodeo Room Metadata";
    } else if (status === "saving") {
      statusEl.textContent = "Saving...";
      statusEl.classList.add("status-saving");
      statusEl.title = "Syncing changes to Room Metadata";
    } else if (status === "error") {
      statusEl.textContent = "Sync Error";
      statusEl.classList.add("status-error");
      statusEl.title =
        errorMessage || "Could not save to Room Metadata (saved locally)";
    } else {
      statusEl.textContent = "Local";
      statusEl.title = "Saved in this browser's localStorage";
    }
  }

  if (budgetEl) {
    if (roomBytes === null) {
      budgetEl.textContent = "";
      budgetEl.classList.remove("budget-warn");
    } else {
      const usedKb = (roomBytes / 1024).toFixed(1);
      const limitKb = (limitBytes / 1024).toFixed(0);
      budgetEl.textContent = `Room: ${usedKb}/${limitKb} KB`;
      budgetEl.classList.toggle("budget-warn", roomBytes >= warnBytes);
    }
  }
}

/**
 * Renders the Party Sheet Switcher dropdown for everyone when `canSwitch` is true.
 * @param {Map<string, import("./state.js").CharacterState>} sheets
 * @param {string} activeSheetId
 * @param {boolean} canSwitch
 */
export function renderSheetSwitcher(sheets, activeSheetId, canSwitch) {
  const wrapper = document.getElementById("party-switcher");
  const select = document.getElementById("sheet-selector");
  const deleteBtn = document.getElementById("delete-sheet-btn");

  if (!wrapper || !(select instanceof HTMLSelectElement)) return;

  wrapper.classList.toggle("hidden", !canSwitch || sheets.size === 0);
  if (!canSwitch || sheets.size === 0) return;

  select.replaceChildren();

  for (const [sheetId, sheet] of sheets.entries()) {
    const opt = document.createElement("option");
    opt.value = sheetId;

    const name = sheet.name.trim() || "Unnamed Character";
    const ancestries = sheet.mixedAncestry
      ? `${sheet.ancestry}/${sheet.secondAncestry}`
      : sheet.ancestry;

    // Remove "Lvl " if you prefer just the bare level number
    opt.textContent = `${name} • ${sheet.community} ${ancestries} • Lvl ${sheet.level} ${sheet.subclass} • ${sheet.className}`;
    select.appendChild(opt);
  }

  select.value = activeSheetId;
  select.title = select.options[select.selectedIndex]?.textContent ?? "";

  if (deleteBtn instanceof HTMLButtonElement) {
    deleteBtn.disabled = sheets.size <= 1;
  }
}

/**
 * Updates the Token HUD link bar inside the Vitals card.
 * @param {{ sceneReady: boolean, count: number, names: string[] }} info
 * @param {boolean} obrConnected
 */
export function renderTokenHudStatus(info, obrConnected) {
  const statusEl = document.getElementById("token-hud-status");
  const linkBtn = document.getElementById("link-token-btn");
  const unlinkBtn = document.getElementById("unlink-token-btn");

  if (statusEl) {
    statusEl.classList.remove("linked");
    if (!obrConnected) {
      statusEl.textContent = "Token HUD: Open in Owlbear";
    } else if (!info.sceneReady) {
      statusEl.textContent = "Token HUD: No active scene";
    } else if (info.count === 0) {
      statusEl.textContent = "Token HUD: Not linked";
    } else if (info.count === 1) {
      statusEl.textContent = `HUD linked: ${info.names[0]}`;
      statusEl.classList.add("linked");
    } else {
      statusEl.textContent = `HUD linked: ${info.count} tokens`;
      statusEl.classList.add("linked");
    }
  }

  if (linkBtn instanceof HTMLButtonElement) {
    linkBtn.disabled = !obrConnected || !info.sceneReady;
    linkBtn.textContent =
      info.count > 0 ? "Link Another" : "Link Selected Token";
  }

  if (unlinkBtn instanceof HTMLButtonElement) {
    unlinkBtn.classList.toggle(
      "hidden",
      !obrConnected || !info.sceneReady || info.count === 0,
    );
  }
}
