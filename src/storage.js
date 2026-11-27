import OBR from "@owlbear-rodeo/sdk";
import { clearLocalDraft, saveLocalDraft } from "./state.js";
import {
  compactLegacyItemIds,
  decodeSheetFromRoom,
  encodeSheetForRoom,
  inspectRoomBudget,
  isCompressedSheetPayload,
  ROOM_HARD_LIMIT_BYTES,
  ROOM_SAFE_LIMIT_BYTES,
} from "./storageCodec.js";

export const ROOM_SHEET_PREFIX = "daggerheart-obr-sheet/sheet/";
export const ROOM_METADATA_LIMIT_BYTES = ROOM_HARD_LIMIT_BYTES;
export const ROOM_METADATA_WARN_BYTES = 12_000;
export const ROOM_METADATA_SAFE_BYTES = ROOM_SAFE_LIMIT_BYTES;

/**
 * @typedef {"local" | "saving" | "synced" | "error"} SyncStatus
 * @typedef {ReturnType<typeof inspectRoomBudget>} RoomBudgetInfo
 */

export class RoomQuotaError extends Error {
  /**
   * @param {string} message
   * @param {RoomBudgetInfo} budget
   */
  constructor(message, budget) {
    super(message);
    this.name = "RoomQuotaError";
    this.budget = budget;
  }
}

/** @param {string} sheetId */
export function getSheetMetadataKey(sheetId) {
  return `${ROOM_SHEET_PREFIX}${sheetId}`;
}

/**
 * Extracts and decompresses all Daggerheart sheets stored in Owlbear Room Metadata.
 * Handles both `"z1:..."` compressed entries and legacy uncompressed objects.
 * @param {Record<string, unknown>} metadata
 * @returns {Promise>}
 */
export async function extractRoomSheets(metadata) {
  /** @type {Map<string, import("./state.js").CharacterState>} */
  const sheets = new Map();

  const entries = Object.entries(metadata).filter(
    ([key, value]) =>
      key.startsWith(ROOM_SHEET_PREFIX) &&
      (isCompressedSheetPayload(value) ||
        (value !== null && typeof value === "object")),
  );

  const decoded = await Promise.all(
    entries.map(async ([key, value]) => {
      const sheetId = key.slice(ROOM_SHEET_PREFIX.length);
      if (!sheetId) return null;
      try {
        const char = await decodeSheetFromRoom(value);
        return /** @type {const} */ ([sheetId, char]);
      } catch (err) {
        console.error(`[Daggerheart Sheet] Failed to decode ${key}:`, err);
        return null;
      }
    }),
  );

  for (const item of decoded) {
    if (item) sheets.set(item[0], item[1]);
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
 * Estimates whether saving a sheet (or batch of sheets) fits within the 16 KB Room Metadata limit.
 * @param {Record<string, import("./state.js").CharacterState>} sheetsToWrite
 */
export async function previewSheetsBudget(sheetsToWrite) {
  const [currentMeta, encodedPairs] = await Promise.all([
    OBR.room.getMetadata(),
    Promise.all(
      Object.entries(sheetsToWrite).map(async ([id, char]) => [
        getSheetMetadataKey(id),
        await encodeSheetForRoom(char),
      ]),
    ),
  ]);

  const patch = Object.fromEntries(encodedPairs);
  return {
    patch,
    budget: inspectRoomBudget(currentMeta, patch, ROOM_SHEET_PREFIX),
  };
}

/**
 * Compresses and saves a single character sheet with a pre-flight Room Metadata quota check.
 * @param {string} sheetId
 * @param {import("./state.js").CharacterState} character
 * @returns {Promise<RoomBudgetInfo>}
 */
export async function saveSheetToRoom(sheetId, character) {
  const { patch, budget } = await previewSheetsBudget({ [sheetId]: character });

  if (!budget.fitsSafeLimit) {
    saveLocalDraft(sheetId, character);
    const kb = (budget.totalBytes / 1024).toFixed(1);
    throw new RoomQuotaError(
      `Room storage full (${kb} / 16 KB). Saved locally — export JSON or archive an unused sheet to resume syncing.`,
      budget,
    );
  }

  await OBR.room.setMetadata(patch);
  clearLocalDraft(sheetId);
  return budget;
}

/**
 * Auto-migrates any legacy uncompressed character sheets in Room Metadata to compressed `"z1:..."`.
 * Only writes if the compressed patch strictly reduces total Room Metadata bytes.
 * @param {Record<string, unknown>} metadata
 * @returns {Promise<{ migrated: number, beforeBytes: number, afterBytes: number }>}
 */
export async function migrateLegacyRoomSheets(metadata) {
  const beforeBytes = measureMetadataBytes(metadata);
  /** @type {Record<string, string>} */
  const patch = {};
  let migrated = 0;

  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith(ROOM_SHEET_PREFIX)) continue;
    if (isCompressedSheetPayload(value)) continue;
    if (!value || typeof value !== "object") continue;

    try {
      const normalized = await decodeSheetFromRoom(value);
      const compacted = compactLegacyItemIds(normalized);
      patch[key] = await encodeSheetForRoom(compacted);
      migrated++;
    } catch (err) {
      console.error(`[Daggerheart Sheet] Skipped migrating ${key}:`, err);
    }
  }

  if (migrated === 0) {
    return { migrated: 0, beforeBytes, afterBytes: beforeBytes };
  }

  const budget = inspectRoomBudget(metadata, patch, ROOM_SHEET_PREFIX);
  if (budget.totalBytes < beforeBytes && budget.fitsHardLimit) {
    await OBR.room.setMetadata(patch);
    console.log(
      `[Daggerheart Sheet] Compressed ${migrated} legacy sheet(s): ${beforeBytes} B -> ${budget.totalBytes} B`,
    );
    return { migrated, beforeBytes, afterBytes: budget.totalBytes };
  }

  return { migrated: 0, beforeBytes, afterBytes: beforeBytes };
}

/**
 * Deletes a character sheet from Room Metadata by setting its top-level key to undefined.
 * @param {string} sheetId
 */
export async function deleteSheetFromRoom(sheetId) {
  const key = getSheetMetadataKey(sheetId);
  await OBR.room.setMetadata({ [key]: undefined });
  clearLocalDraft(sheetId);
}

/**
 * Debounced Room Metadata saver with pre-flight quota tracking and retry support.
 * @param {(status: SyncStatus, errorMessage?: string, budget?: RoomBudgetInfo) => void} onStatusChange
 * @param {number} [delayMs]
 */
export function createRoomSaver(onStatusChange, delayMs = 450) {
  /** @type {number | null} */
  let timerId = null;
  /** @type {string | null} */
  let pendingSheetId = null;
  /** @type {import("./state.js").CharacterState | null} */
  let pendingCharacter = null;
  /** @type {{ sheetId: string, character: import("./state.js").CharacterState } | null} */
  let lastFailed = null;

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
      const budget = await saveSheetToRoom(sheetId, snapshot);
      lastFailed = null;
      onStatusChange("synced", undefined, budget);
    } catch (err) {
      lastFailed = { sheetId, character: snapshot };
      const budget = err instanceof RoomQuotaError ? err.budget : undefined;
      const msg =
        err instanceof Error ? err.message : "Failed to save to Room Metadata";
      console.error("[Daggerheart Sheet] Room metadata save error:", err);
      onStatusChange("error", msg, budget);
    }
  }

  /**
   * @param {string} sheetId
   * @param {import("./state.js").CharacterState} character
   */
  function scheduleSave(sheetId, character) {
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

  /** @param {string} sheetId */
  function hasPendingSaveFor(sheetId) {
    return (
      pendingSheetId === sheetId ||
      (lastFailed !== null && lastFailed.sheetId === sheetId)
    );
  }

  async function retryLastFailed() {
    if (!lastFailed) return false;
    pendingSheetId = lastFailed.sheetId;
    pendingCharacter = lastFailed.character;
    await flushSave();
    return lastFailed === null;
  }

  return { scheduleSave, flushSave, hasPendingSaveFor, retryLastFailed };
}
