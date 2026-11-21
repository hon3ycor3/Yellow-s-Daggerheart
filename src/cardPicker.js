import { DOMAIN_NAMES, getLoadoutCount, MAX_LOADOUT_CARDS } from "./state.js";
import { getClassData } from "./srdData.js";
import { getCardCatalog, loadCardCatalog } from "./cardCatalog.js";

/**
 * Initializes the searchable SRD Domain Card picker modal.
 * @param {{
 *   getCharacter: () => import("./state.js").CharacterState,
 *   onAddCard: (card: import("./cardCatalog.js").SrdDomainCard, location: import("./state.js").CardLocation) => void
 * }} callbacks
 */
export function initCardPicker({ getCharacter, onAddCard }) {
  const dialogEl = document.getElementById("card-picker-modal");
  const searchEl = document.getElementById("picker-search");
  const domainEl = document.getElementById("picker-domain");
  const levelEl = document.getElementById("picker-level");
  const resultsEl = document.getElementById("picker-results");
  const countEl = document.getElementById("picker-count");
  const capacityEl = document.getElementById("picker-capacity");
  const statusEl = document.getElementById("picker-status");
  const closeBtn = document.getElementById("picker-close-btn");
  const refreshBtn = document.getElementById("picker-refresh-btn");

  let isLoading = false;
  let lastError = "";

  /** Populates Domain & Level filter dropdowns using the active character's Class and Level. */
  function populateFilterSelects() {
    const character = getCharacter();
    const classDomains = getClassData(character.className).domains;

    if (domainEl instanceof HTMLSelectElement) {
      domainEl.replaceChildren();

      const classOpt = document.createElement("option");
      classOpt.value = "class";
      classOpt.textContent = `Class Domains (${classDomains.join(" / ")})`;
      domainEl.appendChild(classOpt);

      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = "All Domains";
      domainEl.appendChild(allOpt);

      for (const domainName of DOMAIN_NAMES) {
        const opt = document.createElement("option");
        opt.value = domainName;
        opt.textContent = domainName;
        domainEl.appendChild(opt);
      }

      domainEl.value = "class";
    }

    if (levelEl instanceof HTMLSelectElement) {
      levelEl.replaceChildren();

      const unlockedOpt = document.createElement("option");
      unlockedOpt.value = "unlocked";
      unlockedOpt.textContent = `Unlocked (≤ Lvl ${character.level})`;
      levelEl.appendChild(unlockedOpt);

      const allLvlOpt = document.createElement("option");
      allLvlOpt.value = "all";
      allLvlOpt.textContent = "All Levels";
      levelEl.appendChild(allLvlOpt);

      for (let lvl = 1; lvl <= 10; lvl++) {
        const opt = document.createElement("option");
        opt.value = String(lvl);
        opt.textContent = `Level ${lvl}`;
        levelEl.appendChild(opt);
      }

      levelEl.value = "unlocked";
    }
  }

  /** Filters catalog cards and renders the results inside the modal. */
  function renderResults() {
    if (!resultsEl) return;

    const character = getCharacter();
    const classDomains = getClassData(character.className).domains;
    const loadoutCount = getLoadoutCount(character);
    const loadoutFull = loadoutCount >= MAX_LOADOUT_CARDS;

    if (capacityEl) {
      capacityEl.textContent = `Loadout: ${loadoutCount}/${MAX_LOADOUT_CARDS}`;
      capacityEl.classList.toggle("budget-warn", loadoutFull);
    }

    if (isLoading) {
      resultsEl.replaceChildren();
      const loading = document.createElement("div");
      loading.className = "domain-empty";
      loading.textContent = "Loading SRD Domain Cards from GitHub...";
      resultsEl.appendChild(loading);
      if (countEl) countEl.textContent = "";
      return;
    }

    const allCards = getCardCatalog();

    if (allCards.length === 0) {
      resultsEl.replaceChildren();
      const errBox = document.createElement("div");
      errBox.className = "domain-empty";
      errBox.textContent = lastError
        ? `Could not load SRD catalog: ${lastError}`
        : "No SRD cards available. Click Refresh to try again.";
      resultsEl.appendChild(errBox);
      if (countEl) countEl.textContent = "0 cards";
      return;
    }

    const query =
      searchEl instanceof HTMLInputElement
        ? searchEl.value.trim().toLowerCase()
        : "";
    const domainFilter =
      domainEl instanceof HTMLSelectElement ? domainEl.value : "all";
    const levelFilter =
      levelEl instanceof HTMLSelectElement ? levelEl.value : "all";

    // Build quick lookup of cards already owned on the current character sheet
    /** @type {Map<string, import("./state.js").CardLocation>} */
    const ownedById = new Map();
    for (const existing of character.domainCards) {
      if (existing.srdId) {
        ownedById.set(existing.srdId, existing.location);
      }
    }

    const filtered = allCards.filter((card) => {
      if (domainFilter === "class" && !classDomains.includes(card.domain)) {
        return false;
      }
      if (
        domainFilter !== "all" &&
        domainFilter !== "class" &&
        card.domain !== domainFilter
      ) {
        return false;
      }

      if (levelFilter === "unlocked" && card.level > character.level) {
        return false;
      }
      if (
        levelFilter !== "all" &&
        levelFilter !== "unlocked" &&
        card.level !== Number(levelFilter)
      ) {
        return false;
      }

      if (query) {
        const haystack =
          `${card.name} ${card.domain} ${card.cardType} ${card.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} of ${allCards.length} cards`;
    }

    resultsEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "domain-empty";
      empty.textContent =
        "No Domain Cards match your current search and filters.";
      resultsEl.appendChild(empty);
      return;
    }

    for (const card of filtered) {
      const article = document.createElement("article");
      article.className = `domain-card domain-${card.domain.toLowerCase()}`;

      const top = document.createElement("div");
      top.className = "domain-card-top";

      const title = document.createElement("strong");
      title.className = "domain-card-title";
      title.textContent = card.name;

      const actions = document.createElement("div");
      actions.className = "picker-card-actions";

      const ownedLocation = ownedById.get(card.srdId);
      if (ownedLocation) {
        const ownedBadge = document.createElement("span");
        ownedBadge.className = "badge connected";
        ownedBadge.textContent =
          ownedLocation === "loadout" ? "In Loadout" : "In Vault";
        actions.appendChild(ownedBadge);
      } else {
        const addLoadoutBtn = document.createElement("button");
        addLoadoutBtn.type = "button";
        addLoadoutBtn.className = "card-action-btn picker-add-btn";
        addLoadoutBtn.dataset.srdId = card.srdId;
        addLoadoutBtn.dataset.location = "loadout";
        addLoadoutBtn.textContent = "+ Loadout";
        addLoadoutBtn.disabled = loadoutFull;
        if (loadoutFull) {
          addLoadoutBtn.title = "Loadout is full (5/5)";
        }

        const addVaultBtn = document.createElement("button");
        addVaultBtn.type = "button";
        addVaultBtn.className = "card-action-btn picker-add-btn";
        addVaultBtn.dataset.srdId = card.srdId;
        addVaultBtn.dataset.location = "vault";
        addVaultBtn.textContent = "+ Vault";

        actions.append(addLoadoutBtn, addVaultBtn);
      }

      top.append(title, actions);

      const meta = document.createElement("div");
      meta.className = "domain-card-meta";

      const domainPill = document.createElement("span");
      domainPill.className = "domain-pill";
      domainPill.textContent = `${card.domain} • Lvl ${card.level} ${card.cardType}`;

      const recallPill = document.createElement("span");
      recallPill.className = "domain-pill recall";
      recallPill.textContent = `Recall: ${card.recallCost}`;

      meta.append(domainPill, recallPill);

      const desc = document.createElement("p");
      desc.className = "domain-card-desc";
      desc.style.marginBottom = "0";
      desc.textContent =
        card.description || "(No card text provided in SRD file)";

      article.append(top, meta, desc);
      resultsEl.appendChild(article);
    }
  }

  /** @param {boolean} [forceRefresh] */
  async function ensureCatalogLoaded(forceRefresh = false) {
    isLoading = true;
    lastError = "";
    renderResults();

    const result = await loadCardCatalog(forceRefresh);
    isLoading = false;
    lastError = result.error ?? "";

    if (statusEl) {
      if (result.error && result.cards.length > 0) {
        statusEl.textContent = `Using cached catalog (${result.cards.length} cards)`;
      } else if (result.error) {
        statusEl.textContent = `Load error: ${result.error}`;
      } else {
        statusEl.textContent = `Source: seansbox/daggerheart-srd (${result.cards.length} cards)`;
      }
    }

    renderResults();
  }

  function open() {
    if (!(dialogEl instanceof HTMLDialogElement)) return;

    populateFilterSelects();
    if (searchEl instanceof HTMLInputElement) {
      searchEl.value = "";
    }

    if (!dialogEl.open) {
      dialogEl.showModal();
    }

    if (getCardCatalog().length === 0) {
      void ensureCatalogLoaded(false);
    } else {
      if (statusEl) {
        statusEl.textContent = `Source: seansbox/daggerheart-srd (${getCardCatalog().length} cards)`;
      }
      renderResults();
    }

    if (searchEl instanceof HTMLInputElement) {
      searchEl.focus();
    }
  }

  function close() {
    if (dialogEl instanceof HTMLDialogElement && dialogEl.open) {
      dialogEl.close();
    }
  }

  // Event listeners
  if (searchEl instanceof HTMLInputElement) {
    searchEl.addEventListener("input", renderResults);
  }
  if (domainEl instanceof HTMLSelectElement) {
    domainEl.addEventListener("change", renderResults);
  }
  if (levelEl instanceof HTMLSelectElement) {
    levelEl.addEventListener("change", renderResults);
  }
  if (closeBtn instanceof HTMLButtonElement) {
    closeBtn.addEventListener("click", close);
  }
  if (refreshBtn instanceof HTMLButtonElement) {
    refreshBtn.addEventListener("click", () => {
      void ensureCatalogLoaded(true);
    });
  }

  // Close when clicking the darkened backdrop outside the dialog box
  if (dialogEl instanceof HTMLDialogElement) {
    dialogEl.addEventListener("click", (event) => {
      if (event.target === dialogEl) {
        close();
      }
    });
  }

  if (resultsEl) {
    resultsEl.addEventListener("click", (event) => {
      const btn =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (
        !(btn instanceof HTMLButtonElement) ||
        !btn.classList.contains("picker-add-btn")
      )
        return;

      const srdId = btn.dataset.srdId;
      const location = btn.dataset.location;
      if (!srdId || (location !== "loadout" && location !== "vault")) return;

      const card = getCardCatalog().find((entry) => entry.srdId === srdId);
      if (!card) return;

      onAddCard(card, location);
      renderResults();
    });
  }

  return { open, close, refreshView: renderResults };
}
