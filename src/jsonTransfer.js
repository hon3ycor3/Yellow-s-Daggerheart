import { findCatalogCard, resolveCardDescription } from "./cardCatalog.js";
import { normalizeCharacter } from "./state.js";

const EXPORT_SCHEMA = "yellow-daggerheart-sheet/v1";

/**
 * Prepares a clean, fully hydrated copy of a character for portable JSON export.
 * @param {import("./state.js").CharacterState} character
 */
function hydrateForExport(character) {
  const copy = JSON.parse(JSON.stringify(character));
  if (Array.isArray(copy.domainCards)) {
    copy.domainCards = copy.domainCards.map((/** @type {any} */ card) => {
      const { _unresolvedSrd, ...clean } = card;
      clean.description = resolveCardDescription(clean);
      return clean;
    });
  }
  return copy;
}

/**
 * Cleans an imported character so unmodified SRD card descriptions stay compact.
 * @param {unknown} raw
 */
function normalizeImportedCharacter(raw) {
  const normalized = normalizeCharacter(raw);
  normalized.domainCards = normalized.domainCards.map((card) => {
    if (!card.srdId) return card;
    const cat = findCatalogCard(card.srdId);
    if (cat && card.description.trim() === cat.description.trim()) {
      return { ...card, description: "" };
    }
    return card;
  });
  return normalized;
}

/**
 * @param {string} filename
 * @param {unknown} payload
 */
function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** @param {import("./state.js").CharacterState} character */
export function exportSingleCharacter(character) {
  const safeName =
    (character.name || "daggerheart-character")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "daggerheart-character";

  downloadJson(`${safeName}.dh.json`, {
    schema: EXPORT_SCHEMA,
    kind: "single",
    exportedAt: new Date().toISOString(),
    character: hydrateForExport(character),
  });
}

/** @param {Map<string, import("./state.js").CharacterState>} sheetsMap */
export function exportPartyBackup(sheetsMap) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  /** @type {Record<string, import("./state.js").CharacterState>} */
  const sheets = {};
  for (const [id, char] of sheetsMap.entries()) {
    sheets[id] = hydrateForExport(char);
  }

  downloadJson(`daggerheart-party-${dateStamp}.dh.json`, {
    schema: EXPORT_SCHEMA,
    kind: "party",
    exportedAt: new Date().toISOString(),
    sheets,
  });
}

/**
 * Parses an uploaded `.dh.json` or `.json` file into normalized character record(s).
 * @param {File} file
 * @returns {Promise<{ kind: "single" | "party", entries: Array<{ suggestedId: string | null, character: import("./state.js").CharacterState }> }>}
 */
export async function parseImportedFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (
    parsed?.kind === "party" &&
    parsed.sheets &&
    typeof parsed.sheets === "object"
  ) {
    const entries = Object.entries(parsed.sheets).map(([id, raw]) => ({
      suggestedId: id,
      character: normalizeImportedCharacter(raw),
    }));
    if (entries.length === 0) {
      throw new Error("Party backup file contains no character sheets.");
    }
    return { kind: "party", entries };
  }

  const rawChar = parsed?.character ?? parsed;
  if (!rawChar || typeof rawChar !== "object" || Array.isArray(rawChar)) {
    throw new Error("Unrecognized character sheet JSON format.");
  }

  return {
    kind: "single",
    entries: [
      {
        suggestedId: null,
        character: normalizeImportedCharacter(rawChar),
      },
    ],
  };
}
