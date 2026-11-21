import { DOMAIN_NAMES } from "./state.js";

// You can also download abilities.json into public/abilities.json and change this to "/abilities.json"
export const SRD_ABILITIES_URL =
  "https://raw.githubusercontent.com/seansbox/daggerheart-srd/main/.build/03_json/abilities.json";
const CATALOG_CACHE_KEY = "daggerheart-srd-abilities-cache-v1";

/**
 * @typedef {Object} SrdDomainCard
 * @property {string} srdId
 * @property {string} name
 * @property {import("./state.js").DomainName} domain
 * @property {number} level
 * @property {import("./state.js").CardType} cardType
 * @property {number} recallCost
 * @property {string} description
 */

/** @type {SrdDomainCard[]} */
let cachedCards = [];
/** @type {Map<string, SrdDomainCard>} */
let cardsById = new Map();
let catalogLoaded = false;

/**
 * @param {string} domain
 * @param {string} name
 */
export function makeSrdCardId(domain, name) {
  const slug = `${domain}:${name}`
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

/**
 * @param {unknown} value
 * @returns {import("./state.js").DomainName | null}
 */
function normalizeDomain(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  const match = DOMAIN_NAMES.find((d) => d.toLowerCase() === cleaned);
  return match ?? null;
}

/**
 * @param {unknown} value
 * @returns {import("./state.js").CardType}
 */
function normalizeCardType(value) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase();
  if (cleaned.includes("grimoire")) return "Grimoire";
  if (cleaned.includes("ability")) return "Ability";
  return "Spell";
}

/**
 * Extracts an integer from numbers or strings like "Level 2" or "1".
 * @param {unknown} value
 * @param {number} fallback
 */
function parseIntField(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

/**
 * Cleans basic Obsidian/Markdown syntax from SRD text for plain <p> rendering.
 * @param {unknown} value
 */
function cleanCardText(value) {
  const raw = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?]|$)/g, "$1$2")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalizes a single raw JSON entry from seansbox/daggerheart-srd.
 * @param {any} raw
 * @returns {SrdDomainCard | null}
 */
function normalizeCatalogEntry(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name ?? raw.title ?? "").trim();
  const domain = normalizeDomain(raw.domain ?? raw.Domain);
  if (!name || !domain) return null;

  const level = Math.max(
    1,
    Math.min(10, parseIntField(raw.level ?? raw.Level, 1)),
  );
  const recallCost = Math.max(
    0,
    Math.min(
      6,
      parseIntField(
        raw.recall ?? raw.recallCost ?? raw.recall_cost ?? raw.Recall,
        0,
      ),
    ),
  );
  const cardType = normalizeCardType(
    raw.type ?? raw.cardType ?? raw.card_type ?? raw.Type,
  );
  const description = cleanCardText(
    raw.text ?? raw.description ?? raw.effect ?? raw.body ?? raw.Text ?? "",
  );

  return {
    srdId: makeSrdCardId(domain, name),
    name,
    domain,
    level,
    cardType,
    recallCost,
    description,
  };
}

/**
 * Extracts an array of card objects from either a root JSON array or a wrapper object.
 * @param {any} payload
 * @returns {any[]}
 */
function extractRawArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.abilities)) return payload.abilities;
    if (Array.isArray(payload.cards)) return payload.cards;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    return Object.values(payload);
  }
  return [];
}

/** @param {SrdDomainCard[]} cards */
function setInMemoryCatalog(cards) {
  cards.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
    return a.name.localeCompare(b.name);
  });

  cachedCards = cards;
  cardsById = new Map(cards.map((card) => [card.srdId, card]));
  catalogLoaded = true;
}

/** @returns {SrdDomainCard[] | null} */
function readLocalCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** @param {SrdDomainCard[]} cards */
function writeLocalCache(cards) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cards));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

/**
 * Loads the SRD Domain Card catalog (from memory, localStorage cache, or GitHub raw JSON).
 * @param {boolean} [forceRefresh]
 * @returns {Promise<{ cards: SrdDomainCard[], source: "memory" | "cache" | "network", error?: string }>}
 */
export async function loadCardCatalog(forceRefresh = false) {
  if (catalogLoaded && !forceRefresh && cachedCards.length > 0) {
    return { cards: cachedCards, source: "memory" };
  }

  if (!forceRefresh) {
    const local = readLocalCache();
    if (local) {
      setInMemoryCatalog(local);
      return { cards: cachedCards, source: "cache" };
    }
  }

  try {
    const response = await fetch(SRD_ABILITIES_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching abilities.json`);
    }

    const json = await response.json();
    const rawList = extractRawArray(json);
    const normalized = rawList
      .map(normalizeCatalogEntry)
      .filter(/** @returns {c is SrdDomainCard} */ (c) => c !== null);

    if (normalized.length === 0) {
      console.warn(
        "[Card Catalog] Sample raw entry from abilities.json:",
        rawList[0],
      );
      throw new Error(
        "Fetched abilities.json, but no Domain Cards matched expected fields.",
      );
    }

    setInMemoryCatalog(normalized);
    writeLocalCache(normalized);
    return { cards: cachedCards, source: "network" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load SRD Domain Cards";
    console.error("[Card Catalog] Load failed:", err);

    const fallback = readLocalCache();
    if (fallback) {
      setInMemoryCatalog(fallback);
      return { cards: cachedCards, source: "cache", error: message };
    }

    return { cards: [], source: "network", error: message };
  }
}

/** @returns {SrdDomainCard[]} */
export function getCardCatalog() {
  return cachedCards;
}

/** @returns {boolean} */
export function isCardCatalogLoaded() {
  return catalogLoaded;
}

/** @param {string | undefined} srdId */
export function findCatalogCard(srdId) {
  if (!srdId) return null;
  return cardsById.get(srdId) ?? null;
}

/**
 * Resolves display text for a sheet card: uses custom `description` if edited,
 * otherwise looks up full text live from the SRD catalog via `srdId`.
 * @param {import("./state.js").DomainCard} card
 */
export function resolveCardDescription(card) {
  if (card.description && card.description.trim().length > 0) {
    return card.description;
  }
  if (card.srdId) {
    const catalogMatch = findCatalogCard(card.srdId);
    if (catalogMatch) return catalogMatch.description;
  }
  return "";
}
