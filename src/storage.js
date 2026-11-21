import OBR from "@owlbear-rodeo/sdk";
import { normalizeCharacter } from "./state.js";

export const ROOM_SHEET_PREFIX = "daggerheart-obr-sheet/sheet/";
export const ROOM_METADATA_LIMIT_BYTES = 16_384;
export const ROOM_METADATA_WARN_BYTES = 12_000;

/**
 * @typedef {"local" | "saving" | "synced" | "error"} SyncStatus
 */

/** @param {string} sheetId */
export function getSheetMetadataKey(sheetId) {
  return `${ROOM_SHEET_PREFIX}${sheetId}`;
}

/**
 * Extracts all Daggerheart character sheets stored inside Owlbear Room Metadata.
 * @param {Record<string, unknown>} metadata
 * @returns {Map<string, import("./state.js").CharacterState>}
 */
export function extractRoomSheets(metadata) {
  /** @type {Map<string, import("./state.js").CharacterState>} */
  const sheets = new Map();

  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith(ROOM_SHEET_PREFIX)) continue;
    if (!value || typeof value !== "object") continue;

    const sheetId = key.slice(ROOM_SHEET_PREFIX.length);
    if (!sheetId) continue;

    sheets.set(sheetId, normalizeCharacter(value));
  }

  return sheets;
}

/**
 * Measures UTF-8 byte size of the room's full metadata object.
 * @param {Record<string, unknown>} metadata
 */
export function measureMetadataBytes(metadata) {
  try {
    return new TextEncoder().encode(JSON.stringify(metadata)).length;
  } catch {
    return 0;
  }
}

/**
 * Saves a single character sheet into its own top-level Room Metadata key.
 * @param {string} sheetId
 * @param {import("./state.js").CharacterState} character
 */
export async function saveSheetToRoom(sheetId, character) {
  const key = getSheetMetadataKey(sheetId);
  // Clone via JSON so only clean, serializable data enters Owlbear Room Metadata
  const payload = JSON.parse(JSON.stringify(character));
  await OBR.room.setMetadata({ [key]: payload });
}

/**
 * Deletes a character sheet from Room Metadata by setting its top-level key to undefined.
 * @param {string} sheetId
 */
export async function deleteSheetFromRoom(sheetId) {
  const key = getSheetMetadataKey(sheetId);
  await OBR.room.setMetadata({ [key]: undefined });
}

/**
 * Creates a debounced Room Metadata saver so rapid typing does not flood Owlbear's sync layer.
 * Automatically flushes the previous sheet if you switch sheets mid-debounce.
 * @param {(status: SyncStatus, errorMessage?: string) => void} onStatusChange
 * @param {number} [delayMs]
 */
export function createRoomSaver(onStatusChange, delayMs = 450) {
  /** @type {number | null} */
  let timerId = null;
  /** @type {string | null} */
  let pendingSheetId = null;
  /** @type {import("./state.js").CharacterState | null} */
  let pendingCharacter = null;

  async function flushSave() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    if (!pendingSheetId || !pendingCharacter) return;

    const sheetId = pendingSheetId;
    const snapshot = pendingCharacter;
    pendingSheetId = null;
    pendingCharacter = null;

    onStatusChange("saving");
    try {
      await saveSheetToRoom(sheetId, snapshot);
      onStatusChange("synced");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save to Room Metadata";
      console.error("[Daggerheart Sheet] Room metadata save error:", err);
      onStatusChange("error", msg);
    }
  }

  /**
   * @param {string} sheetId
   * @param {import("./state.js").CharacterState} character
   */
  function scheduleSave(sheetId, character) {
    // If switching to a different sheet while a save is queued, flush the old sheet first
    if (pendingSheetId && pendingSheetId !== sheetId) {
      void flushSave();
    }

    pendingSheetId = sheetId;
    pendingCharacter = JSON.parse(JSON.stringify(character));
    onStatusChange("saving");

    if (timerId !== null) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      void flushSave();
    }, delayMs);
  }

  return { scheduleSave, flushSave };
}
