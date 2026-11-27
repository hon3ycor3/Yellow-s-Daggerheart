// src/storageCodec.js

export const ROOM_HARD_LIMIT_BYTES = 16 * 1024; // 16,384 bytes
export const ROOM_SAFE_LIMIT_BYTES = 15 * 1024; // Leave 1 KB safety buffer
const COMPRESSED_PREFIX = "z1:";

const textEncoder = new TextEncoder();

/** @param {Uint8Array} bytes */
function uint8ToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** @param {string} b64 */
function base64ToUint8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses any JSON-serializable object into a compact `"z1:<base64>"` string.
 * @param {unknown} data
 * @returns {Promise<string>}
 */
export async function compressJson(data) {
  const json = JSON.stringify(data);
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return COMPRESSED_PREFIX + uint8ToBase64(compressed);
}

/**
 * Decompresses a `"z1:<base64>"` string back into a JS object.
 * Passes legacy uncompressed objects through untouched for smooth migration.
 * @param {unknown} payload
 * @returns {Promise<any>}
 */
export async function decompressJson(payload) {
  if (typeof payload !== "string" || !payload.startsWith(COMPRESSED_PREFIX)) {
    return payload;
  }
  const bytes = base64ToUint8(payload.slice(COMPRESSED_PREFIX.length));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

/**
 * Strips top-level keys that still equal their defaults and shrinks SRD-backed
 * domain cards down to lightweight ID references.
 * @param {Record<string, any>} character
 * @param {Record<string, any>} defaults - Result of createDefaultCharacter()
 * @param {(card: any) => string | null} getSrdCardId - Returns SRD ID if unmodified SRD card, else null
 */
export function dehydrateCharacter(character, defaults, getSrdCardId) {
  /** @type {Record<string, any>} */
  const slim = {};

  for (const [key, value] of Object.entries(character)) {
    if (value === undefined) continue;

    // 1. Domain cards are usually the #1 bloat culprit (full prose paragraphs)
    if (key === "domainCards" && Array.isArray(value)) {
      if (value.length === 0) continue;
      slim.domainCards = value.map((card) => {
        const srdId = getSrdCardId(card);
        if (srdId) {
          // Only store the ID + play state; re-hydrate prose from bundled SRD on load
          return card.vaulted ? { r: srdId, v: 1 } : { r: srdId };
        }
        return card; // Homebrew/edited card keeps full text
      });
      continue;
    }

    // 2. Skip fields identical to a fresh default sheet
    if (JSON.stringify(value) === JSON.stringify(defaults[key])) {
      continue;
    }

    slim[key] = value;
  }

  return slim;
}

/**
 * Re-expands SRD card references before passing the object into your existing normalizer.
 * @param {Record<string, any>} slim
 * @param {(srdId: string) => any | null} lookupSrdCard
 */
export function rehydrateCharacterRaw(slim, lookupSrdCard) {
  if (!slim || typeof slim !== "object") return slim;
  const copy = { ...slim };

  if (Array.isArray(copy.domainCards)) {
    copy.domainCards = copy.domainCards
      .map((entry) => {
        if (entry && typeof entry === "object" && typeof entry.r === "string") {
          const base = lookupSrdCard(entry.r);
          return base ? { ...base, vaulted: Boolean(entry.v) } : null;
        }
        return entry;
      })
      .filter(Boolean);
  }

  return copy;
}

/**
 * Simulates OBR's shallow-merge Room Metadata update and returns exact UTF-8 byte counts.
 * @param {Record<string, unknown>} currentRoomMeta - From await OBR.room.getMetadata()
 * @param {Record<string, unknown>} patch - The object you plan to pass to OBR.room.setMetadata()
 * @param {string} ourPrefix - Your extension's metadata key prefix (e.g. "daggerheart-obr-sheet/")
 */
export function inspectRoomBudget(currentRoomMeta, patch, ourPrefix) {
  /** @type {Record<string, unknown>} */
  const simulated = { ...currentRoomMeta };

  // OBR removes keys set to undefined during shallow merge
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete simulated[k];
    else simulated[k] = v;
  }

  const totalBytes = textEncoder.encode(JSON.stringify(simulated)).length;

  /** @type {Record<string, unknown>} */
  const oursOnly = {};
  for (const [k, v] of Object.entries(simulated)) {
    if (k.startsWith(ourPrefix)) oursOnly[k] = v;
  }
  const ourBytes = textEncoder.encode(JSON.stringify(oursOnly)).length;

  return {
    totalBytes,
    ourBytes,
    otherExtBytes: Math.max(0, totalBytes - ourBytes),
    remainingBytes: ROOM_HARD_LIMIT_BYTES - totalBytes,
    fitsSafeLimit: totalBytes <= ROOM_SAFE_LIMIT_BYTES,
    fitsHardLimit: totalBytes <= ROOM_HARD_LIMIT_BYTES,
  };
}
