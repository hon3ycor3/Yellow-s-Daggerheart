import {
  DOMAIN_NAMES,
  createDefaultCharacter,
  makeShortId,
  normalizeCharacter,
} from "./state.js";
import { findCatalogCard } from "./cardCatalog.js";

export const ROOM_HARD_LIMIT_BYTES = 16_384;
export const ROOM_SAFE_LIMIT_BYTES = 16_000;
const COMPRESSED_PREFIX = "z1:";

const textEncoder = new TextEncoder();
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {unknown} payload */
export function isCompressedSheetPayload(payload) {
  return typeof payload === "string" && payload.startsWith(COMPRESSED_PREFIX);
}

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
 * Passes legacy uncompressed objects through untouched.
 * @param {unknown} payload
 * @returns {Promise<any>}
 */
export async function decompressJson(payload) {
  if (!isCompressedSheetPayload(payload)) return payload;
  const bytes = base64ToUint8(
    /** @type {string} */ (payload).slice(COMPRESSED_PREFIX.length),
  );
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

/**
 * Returns only the keys in `obj` whose values differ from `base`.
 * @param {Record<string, any>} obj
 * @param {Record<string, any>} base
 */
function diffObject(obj, base) {
  /** @type {Record<string, any>} */
  const out = {};
  let hasDiff = false;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== base[k]) {
      out[k] = v;
      hasDiff = true;
    }
  }
  return hasDiff ? out : null;
}

/**
 * Builds a readable fallback card if an SRD card is loaded while offline.
 * @param {string} id
 * @param {string} srdId
 * @param {"loadout" | "vault"} location
 */
function makeOfflineSrdFallback(id, srdId, location) {
  const [rawDomain = "", rawSlug = ""] = srdId.split(":");
  const domain =
    DOMAIN_NAMES.find((d) => d.toLowerCase() === rawDomain.toLowerCase()) ??
    "Arcana";
  const name = rawSlug
    ? rawSlug
        .split("-")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
        .join(" ")
    : srdId;

  return {
    id,
    srdId,
    name,
    domain,
    level: 1,
    cardType: /** @type {const} */ ("Spell"),
    recallCost: 0,
    location,
    description: "",
    _unresolvedSrd: true,
  };
}

/**
 * Shortens legacy 36-char item UUIDs on a character during one-time room migration.
 * Never touches `sheetId` (so Token HUD links stay intact).
 * @param {import("./state.js").CharacterState} character
 */
export function compactLegacyItemIds(character) {
  const clone = JSON.parse(JSON.stringify(character));
  const shorten = (/** @type {string} */ id, /** @type {string} */ prefix) =>
    typeof id === "string" && UUID_REGEX.test(id) ? makeShortId(prefix) : id;

  if (Array.isArray(clone.experiences)) {
    for (const item of clone.experiences) item.id = shorten(item.id, "e");
  }
  if (Array.isArray(clone.inventory)) {
    for (const item of clone.inventory) item.id = shorten(item.id, "i");
  }
  if (Array.isArray(clone.domainCards)) {
    for (const card of clone.domainCards) card.id = shorten(card.id, "c");
  }
  if (Array.isArray(clone.customHopeFeatures)) {
    for (const feat of clone.customHopeFeatures)
      feat.id = shorten(feat.id, "h");
  }
  return clone;
}

/**
 * Strips unchanged defaults and compacts arrays/SRD cards before compression.
 * Preserves empty arrays `[]` so normalizeCharacter() never resurrects starter items.
 * @param {import("./state.js").CharacterState} character
 */
export function dehydrateCharacter(character) {
  const defaults = createDefaultCharacter();
  /** @type {Record<string, any>} */
  const slim = { v: 2 };

  /** @type {Array<[keyof import("./state.js").CharacterState, string]>} */
  const scalarMap = [
    ["name", "n"],
    ["level", "lv"],
    ["className", "cl"],
    ["subclass", "sc"],
    ["ancestry", "an"],
    ["mixedAncestry", "ma"],
    ["secondAncestry", "a2"],
    ["community", "co"],
    ["evasion", "ev"],
    ["proficiency", "pr"],
  ];

  for (const [fullKey, shortKey] of scalarMap) {
    if (character[fullKey] !== defaults[fullKey]) {
      slim[shortKey] = character[fullKey];
    }
  }

  /** @type {Array<[keyof import("./state.js").CharacterState, string]>} */
  const objectMap = [
    ["armor", "ar"],
    ["traits", "tr"],
    ["hp", "hp"],
    ["stress", "st"],
    ["hope", "ho"],
    ["conditions", "cn"],
    ["gold", "gd"],
  ];

  for (const [fullKey, shortKey] of objectMap) {
    const diff = diffObject(
      /** @type {Record<string, any>} */ (character[fullKey]),
      /** @type {Record<string, any>} */ (defaults[fullKey]),
    );
    if (diff) slim[shortKey] = diff;
  }

  const pDiff = diffObject(character.weapons.primary, defaults.weapons.primary);
  const sDiff = diffObject(
    character.weapons.secondary,
    defaults.weapons.secondary,
  );
  if (pDiff || sDiff) {
    slim.wp = {
      ...(pDiff ? { p: pDiff } : {}),
      ...(sDiff ? { s: sDiff } : {}),
    };
  }

  // Always serialize experiences, inventory, and domainCards (even when empty [])
  slim.ex = (character.experiences ?? []).map((e) => [e.id, e.label, e.bonus]);
  slim.in = (character.inventory ?? []).map((i) => [i.id, i.text]);

  slim.dc = (character.domainCards ?? []).map((card) => {
    const isVault = card.location === "vault" ? 1 : 0;

    if (/** @type {any} */ (card)._unresolvedSrd && card.srdId) {
      return [card.id, card.srdId, isVault];
    }

    if (card.srdId) {
      const cat = findCatalogCard(card.srdId);
      const desc = (card.description ?? "").trim();
      if (
        cat &&
        card.name === cat.name &&
        card.domain === cat.domain &&
        card.level === cat.level &&
        card.cardType === cat.cardType &&
        card.recallCost === cat.recallCost &&
        (!desc || desc === cat.description.trim())
      ) {
        return [card.id, card.srdId, isVault];
      }
    }

    return {
      i: card.id,
      ...(card.srdId ? { r: card.srdId } : {}),
      n: card.name,
      d: card.domain,
      lv: card.level,
      t: card.cardType,
      c: card.recallCost,
      ...(isVault ? { v: 1 } : {}),
      ...(card.description ? { x: card.description } : {}),
    };
  });

  if (
    Array.isArray(character.customHopeFeatures) &&
    character.customHopeFeatures.length > 0
  ) {
    slim.hf = character.customHopeFeatures.map((f) => [
      f.id,
      f.name,
      f.tag,
      f.text,
    ]);
  }

  // Companion (only serialize if modified from defaults)
  if (character.companion) {
    const compDef = defaults.companion;
    const c = character.companion;
    /** @type {Record<string, any>} */
    const cp = {};
    if (c.name !== compDef.name) cp.n = c.name;
    if (c.species !== compDef.species) cp.sp = c.species;
    if (c.evasion !== compDef.evasion) cp.ev = c.evasion;
    const stDiff = diffObject(c.stress, compDef.stress);
    if (stDiff) cp.st = stDiff;
    if (c.attackName !== compDef.attackName) cp.an = c.attackName;
    if (c.attackTrait !== compDef.attackTrait) cp.at = c.attackTrait;
    if (c.attackRange !== compDef.attackRange) cp.ar = c.attackRange;
    if (c.dieSides !== compDef.dieSides) cp.ds = c.dieSides;
    if (c.flatBonus !== compDef.flatBonus) cp.fb = c.flatBonus;
    if (c.notes !== compDef.notes) cp.nt = c.notes;

    const expTuples = (c.experiences ?? []).map((e) => [
      e.id,
      e.label,
      e.bonus,
    ]);
    const defExpTuples = compDef.experiences.map((e) => [
      e.id,
      e.label,
      e.bonus,
    ]);
    if (JSON.stringify(expTuples) !== JSON.stringify(defExpTuples)) {
      cp.ex = expTuples;
    }

    const activeUpgrades = Object.fromEntries(
      Object.entries(c.upgrades ?? {}).filter(([, count]) => Number(count) > 0),
    );
    if (Object.keys(activeUpgrades).length > 0) {
      cp.up = activeUpgrades;
    }

    if (Object.keys(cp).length > 0) {
      slim.cp = cp;
    }
  }

  // Beastform (only serialize if modified from defaults)
  if (character.beastform) {
    const bfDiff = diffObject(
      /** @type {Record<string, any>} */ (character.beastform),
      /** @type {Record<string, any>} */ (defaults.beastform),
    );
    if (bfDiff) slim.bf = bfDiff;
  }

  return slim;
}

/**
 * Re-expands a dehydrated `v: 2` payload back into a normalized CharacterState.
 * Passes legacy plain objects straight through `normalizeCharacter()`.
 * @param {any} slim
 * @returns {import("./state.js").CharacterState}
 */
export function rehydrateCharacterRaw(slim) {
  if (!slim || typeof slim !== "object" || slim.v !== 2) {
    return normalizeCharacter(slim);
  }

  /** @type {Record<string, any>} */
  const raw = {};

  if ("n" in slim) raw.name = slim.n;
  if ("lv" in slim) raw.level = slim.lv;
  if ("cl" in slim) raw.className = slim.cl;
  if ("sc" in slim) raw.subclass = slim.sc;
  if ("an" in slim) raw.ancestry = slim.an;
  if ("ma" in slim) raw.mixedAncestry = slim.ma;
  if ("a2" in slim) raw.secondAncestry = slim.a2;
  if ("co" in slim) raw.community = slim.co;
  if ("ev" in slim) raw.evasion = slim.ev;
  if ("pr" in slim) raw.proficiency = slim.pr;

  if (slim.ar) raw.armor = slim.ar;
  if (slim.tr) raw.traits = slim.tr;
  if (slim.hp) raw.hp = slim.hp;
  if (slim.st) raw.stress = slim.st;
  if (slim.ho) raw.hope = slim.ho;
  if (slim.cn) raw.conditions = slim.cn;
  if (slim.gd) raw.gold = slim.gd;
  if (slim.wp) {
    raw.weapons = {
      ...(slim.wp.p ? { primary: slim.wp.p } : {}),
      ...(slim.wp.s ? { secondary: slim.wp.s } : {}),
    };
  }

  if (Array.isArray(slim.ex)) {
    raw.experiences = slim.ex.map((/** @type {any[]} */ tuple) => ({
      id: String(tuple[0] ?? makeShortId("e")),
      label: String(tuple[1] ?? ""),
      bonus: Number(tuple[2] ?? 2),
    }));
  }

  if (Array.isArray(slim.in)) {
    raw.inventory = slim.in.map((/** @type {any[]} */ tuple) => ({
      id: String(tuple[0] ?? makeShortId("i")),
      text: String(tuple[1] ?? ""),
    }));
  }

  if (Array.isArray(slim.dc)) {
    raw.domainCards = slim.dc.map((/** @type {any} */ entry) => {
      if (Array.isArray(entry)) {
        const id = String(entry[0] ?? makeShortId("c"));
        const srdId = String(entry[1] ?? "");
        const location = entry[2] ? "vault" : "loadout";
        const cat = findCatalogCard(srdId);
        if (cat) {
          return {
            id,
            srdId,
            name: cat.name,
            domain: cat.domain,
            level: cat.level,
            cardType: cat.cardType,
            recallCost: cat.recallCost,
            location,
            description: "",
          };
        }
        return makeOfflineSrdFallback(id, srdId, location);
      }

      return {
        id: String(entry.i ?? makeShortId("c")),
        ...(entry.r ? { srdId: String(entry.r) } : {}),
        name: String(entry.n ?? ""),
        domain: entry.d ?? "Arcana",
        level: Number(entry.lv ?? 1),
        cardType: entry.t ?? "Spell",
        recallCost: Number(entry.c ?? 0),
        location: entry.v ? "vault" : "loadout",
        description: String(entry.x ?? ""),
      };
    });
  }

  if (Array.isArray(slim.hf)) {
    raw.customHopeFeatures = slim.hf.map((/** @type {any[]} */ tuple) => ({
      id: String(tuple[0] ?? makeShortId("h")),
      name: String(tuple[1] ?? "Custom Hope Feature (3 Hope)"),
      tag: String(tuple[2] ?? "Hope Feature"),
      text: String(tuple[3] ?? ""),
    }));
  }

  if (slim.cp && typeof slim.cp === "object") {
    const cp = slim.cp;
    /** @type {Record<string, any>} */
    const comp = {};
    if ("n" in cp) comp.name = cp.n;
    if ("sp" in cp) comp.species = cp.sp;
    if ("ev" in cp) comp.evasion = cp.ev;
    if (cp.st) comp.stress = cp.st;
    if ("an" in cp) comp.attackName = cp.an;
    if ("at" in cp) comp.attackTrait = cp.at;
    if ("ar" in cp) comp.attackRange = cp.ar;
    if ("ds" in cp) comp.dieSides = cp.ds;
    if ("fb" in cp) comp.flatBonus = cp.fb;
    if ("nt" in cp) comp.notes = cp.nt;
    if (Array.isArray(cp.ex)) {
      comp.experiences = cp.ex.map((/** @type {any[]} */ tuple) => ({
        id: String(tuple[0] ?? makeShortId("ce")),
        label: String(tuple[1] ?? ""),
        bonus: Number(tuple[2] ?? 2),
      }));
    }
    if (cp.up && typeof cp.up === "object") {
      comp.upgrades = cp.up;
    }
    raw.companion = comp;
  }

  if (slim.bf && typeof slim.bf === "object") {
    raw.beastform = slim.bf;
  }

  return normalizeCharacter(raw);
}

/**
 * Re-hydrates any offline SRD fallback cards on a sheet once loadCardCatalog() finishes.
 * @param {import("./state.js").CharacterState} character
 * @returns {boolean} True if at least one card was upgraded
 */
export function rehydrateUnresolvedSrdCards(character) {
  let changed = false;
  for (let i = 0; i < character.domainCards.length; i++) {
    const card = /** @type {any} */ (character.domainCards[i]);
    if (!card._unresolvedSrd || !card.srdId) continue;
    const cat = findCatalogCard(card.srdId);
    if (!cat) continue;
    character.domainCards[i] = {
      id: card.id,
      srdId: card.srdId,
      name: cat.name,
      domain: cat.domain,
      level: cat.level,
      cardType: cat.cardType,
      recallCost: cat.recallCost,
      location: card.location,
      description: "",
    };
    changed = true;
  }
  return changed;
}

/**
 * Dehydrates + compresses a character sheet for Room Metadata storage.
 * @param {import("./state.js").CharacterState} character
 */
export async function encodeSheetForRoom(character) {
  return compressJson(dehydrateCharacter(character));
}

/**
 * Decodes either a `"z1:..."` compressed string or a legacy uncompressed object.
 * @param {unknown} payload
 */
export async function decodeSheetFromRoom(payload) {
  const raw = await decompressJson(payload);
  return rehydrateCharacterRaw(raw);
}

/**
 * Simulates OBR's shallow-merge Room Metadata update and returns exact UTF-8 byte counts.
 * @param {Record<string, unknown>} currentRoomMeta
 * @param {Record<string, unknown>} patch
 * @param {string} ourPrefix
 */
export function inspectRoomBudget(currentRoomMeta, patch, ourPrefix) {
  /** @type {Record<string, unknown>} */
  const simulated = { ...currentRoomMeta };

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
