// src/jsonTransfer.js

const EXPORT_SCHEMA = "yellow-daggerheart-sheet/v1";

/**
 * Triggers a clean browser download for a single character or a full party backup.
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
  const safeName = (character.name || "daggerheart-character")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  downloadJson(`${safeName}.dh.json`, {
    schema: EXPORT_SCHEMA,
    kind: "single",
    exportedAt: new Date().toISOString(),
    character,
  });
}

/** @param {Record<string, import("./state.js").CharacterState>} sheetsById */
export function exportPartyBackup(sheetsById) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadJson(`daggerheart-party-${dateStamp}.dh.json`, {
    schema: EXPORT_SCHEMA,
    kind: "party",
    exportedAt: new Date().toISOString(),
    sheets: sheetsById,
  });
}

/**
 * Parses an uploaded .json file into normalized character record(s).
 * Supports both single-character exports and full-party backups.
 * @param {File} file
 * @param {(raw: unknown) => import("./state.js").CharacterState} normalizeCharacter
 */
export async function parseImportedFile(file, normalizeCharacter) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (
    parsed?.kind === "party" &&
    parsed.sheets &&
    typeof parsed.sheets === "object"
  ) {
    return Object.entries(parsed.sheets).map(([id, raw]) => ({
      suggestedId: id,
      character: normalizeCharacter(raw),
    }));
  }

  const rawChar = parsed?.character ?? parsed;
  if (!rawChar || typeof rawChar !== "object") {
    throw new Error("Unrecognized character sheet JSON format.");
  }

  return [{ suggestedId: null, character: normalizeCharacter(rawChar) }];
}
