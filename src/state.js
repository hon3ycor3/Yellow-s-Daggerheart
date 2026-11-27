import {
  ANCESTRY_NAMES,
  CLASS_NAMES,
  COMMUNITY_NAMES,
  getSubclassesForClass,
} from "./srdData.js";

const STORAGE_KEY = "daggerheart-obr-sheet-v1";
const DRAFTS_STORAGE_KEY = "daggerheart-obr-drafts-v1";

/**
 * Generates a compact 6-character base36 ID (saves ~30 bytes per item over UUIDs).
 * @param {string} [prefix]
 */
export function makeShortId(prefix = "") {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return `${prefix}${num.toString(36).padStart(6, "0").slice(0, 6)}`;
}

export const MAX_LOADOUT_CARDS = 5;

export const DOMAIN_NAMES = /** @type {const} */ ([
  "Arcana",
  "Blade",
  "Bone",
  "Codex",
  "Grace",
  "Midnight",
  "Sage",
  "Splendor",
  "Valor",
]);

/**
 * @typedef {"agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"} TraitKey
 * @typedef {"Physical" | "Magic"} DamageType
 * @typedef {"handfuls" | "bags" | "chests"} GoldUnit
 * @typedef {"None" | "Minor" | "Major" | "Severe"} DamageSeverity
 * @typedef {(typeof DOMAIN_NAMES)[number]} DomainName
 * @typedef {"Ability" | "Spell" | "Grimoire"} CardType
 * @typedef {"loadout" | "vault"} CardLocation
 *
 * @typedef {Object} ExperienceItem
 * @property {string} id
 * @property {string} label
 * @property {number} bonus
 *
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} text
 *
 * @typedef {Object} WeaponItem
 * @property {string} name
 * @property {TraitKey} trait
 * @property {string} range
 * @property {number} dieSides
 * @property {number} flatBonus
 * @property {DamageType} damageType
 * @property {string} feature
 *
 * @typedef {Object} DomainCard
 * @property {string} id
 * @property {string} [srdId]
 * @property {string} name
 * @property {string} id
 * @property {string} name
 * @property {DomainName} domain
 * @property {number} level
 * @property {CardType} cardType
 * @property {number} recallCost
 * @property {CardLocation} location
 * @property {string} description
 *
 * @typedef {Object} CompanionState
 * @property {string} name
 * @property {string} species
 * @property {number} evasion
 * @property {{ marked: number, max: number }} stress
 * @property {string} attackName
 * @property {TraitKey} attackTrait
 * @property {string} attackRange
 * @property {number} dieSides
 * @property {number} flatBonus
 * @property {ExperienceItem[]} experiences
 * @property {Record<string, number>} upgrades
 * @property {string} notes
 *
 * @typedef {Object} BeastformState
 * @property {boolean} active
 * @property {string} formId
 * @property {string} customName
 * @property {TraitKey | ""} evolutionTrait
 * @property {string} notes
 *
 * @typedef {Object} CharacterState
 * @property {string} name
 * @property {number} level
 * @property {string} className
 * @property {string} subclass
 * @property {string} ancestry
 * @property {boolean} mixedAncestry
 * @property {string} secondAncestry
 * @property {string} community
 * @property {number} evasion
 * @property {number} proficiency
 * @property {{ name: string, feature: string, baseMajor: number, baseSevere: number, score: number, slotsMarked: number }} armor
 * @property {{ agility: number, strength: number, finesse: number, instinct: number, presence: number, knowledge: number }} traits
 * @property {{ marked: number, max: number }} hp
 * @property {{ marked: number, max: number }} stress
 * @property {{ current: number, max: number }} hope
 * @property {{ vulnerable: boolean, restrained: boolean, hidden: boolean }} conditions
 * @property {ExperienceItem[]} experiences
 * @property {{ primary: WeaponItem, secondary: WeaponItem }} weapons
 * @property {{ handfuls: number, bags: number, chests: number }} gold
 * @property {DomainCard[]} domainCards
 * @property {InventoryItem[]} inventory
 * @property {Array<{ id: string, name: string, tag: string, text: string }>} customHopeFeatures
 * @property {CompanionState} companion
 * @property {BeastformState} beastform
 */

/**
 * @param {string} [label]
 * @param {number} [bonus]
 * @returns {ExperienceItem}
 */
export function createExperience(label = "", bonus = 2) {
  return {
    id: makeShortId("e"),
    label,
    bonus,
  };
}

/**
 * @param {string} [text]
 * @returns {InventoryItem}
 */
export function createInventoryItem(text = "") {
  return {
    id: makeShortId("i"),
    text,
  };
}

/**
 * @param {Partial<Omit<DomainCard, "id">>} [overrides]
 * @returns {DomainCard}
 */
export function createDomainCard(overrides = {}) {
  return {
    id: makeShortId("c"),
    ...(overrides.srdId ? { srdId: overrides.srdId } : {}),
    name: overrides.name ?? "",
    domain: overrides.domain ?? "Arcana",
    level: overrides.level ?? 1,
    cardType: overrides.cardType ?? "Spell",
    recallCost: overrides.recallCost ?? 0,
    location: overrides.location ?? "loadout",
    description: overrides.description ?? "",
  };
}

/** @returns {CompanionState} */
export function createDefaultCompanion() {
  return {
    name: "",
    species: "",
    evasion: 10,
    stress: { marked: 0, max: 3 },
    attackName: "Bite / Claw",
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 6,
    flatBonus: 0,
    experiences: [
      { id: "ce_1", label: "Fetch / Track", bonus: 2 },
      { id: "ce_2", label: "Guard / Scout", bonus: 2 },
    ],
    upgrades: {},
    notes: "",
  };
}

/** @returns {BeastformState} */
export function createDefaultBeastform() {
  return {
    active: false,
    formId: "agile-scout",
    customName: "",
    evolutionTrait: "",
    notes: "",
  };
}

/**
 * Returns which conditional class/subclass sheet section should display for this character.
 * Add new entries here whenever another class/subclass requires a dedicated sub-sheet.
 * @param {CharacterState} character
 * @returns {"companion" | "beastform" | null}
 */
export function getActiveClassSheetType(character) {
  if (character.className === "Ranger" && character.subclass === "Beastbound") {
    return "companion";
  }
  if (character.className === "Druid") {
    return "beastform";
  }
  return null;
}

/** @returns {CharacterState} */
export function createDefaultCharacter() {
  return {
    name: "New Adventurer",
    level: 1,
    className: "Sorcerer",
    subclass: "Elemental Origin",
    ancestry: "Human",
    mixedAncestry: false,
    secondAncestry: "Elf",
    community: "Wanderborne",
    evasion: 10,
    proficiency: 1,
    armor: {
      name: "Leather Armor",
      feature: "",
      baseMajor: 6,
      baseSevere: 13,
      score: 3,
      slotsMarked: 0,
    },
    traits: {
      agility: 0,
      strength: -1,
      finesse: 1,
      instinct: 0,
      presence: 2,
      knowledge: 1,
    },
    hp: { marked: 0, max: 6 },
    stress: { marked: 0, max: 6 },
    hope: { current: 2, max: 6 },
    conditions: {
      vulnerable: false,
      restrained: false,
      hidden: false,
    },
    experiences: [
      createExperience("Battle-Hardened", 2),
      createExperience("Silver Tongue", 2),
    ],
    weapons: {
      primary: {
        name: "Dualstaff",
        trait: "instinct",
        range: "Far",
        dieSides: 6,
        flatBonus: 3,
        damageType: "Magic",
        feature: "",
      },
      secondary: {
        name: "",
        trait: "finesse",
        range: "Melee",
        dieSides: 6,
        flatBonus: 0,
        damageType: "Physical",
        feature: "",
      },
    },
    gold: {
      handfuls: 1,
      bags: 0,
      chests: 0,
    },
    domainCards: [
      createDomainCard({
        name: "Rune Ward",
        domain: "Arcana",
        level: 1,
        cardType: "Spell",
        recallCost: 0,
        location: "loadout",
        description:
          "Click Edit to paste your full SRD card text, adjust Recall Cost, or move cards between Loadout and Vault.",
      }),
    ],
    inventory: [
      createInventoryItem("Torch"),
      createInventoryItem("50 ft. Rope"),
    ],
    customHopeFeatures: [],
    companion: createDefaultCompanion(),
    beastform: createDefaultBeastform(),
  };
}

/**
 * Matches a string against a known SRD list case-insensitively, falling back to defaultVal.
 * @param {unknown} value
 * @param {string[]} allowed
 * @param {string} defaultVal
 */
function matchOption(value, allowed, defaultVal) {
  if (typeof value !== "string") return defaultVal;
  const trimmed = value.trim().toLowerCase();
  const match = allowed.find((opt) => opt.toLowerCase() === trimmed);
  return match ?? defaultVal;
}

/**
 * Safely merges any partial/older saved object with current CharacterState defaults.
 * @param {any} raw
 * @returns {CharacterState}
 */
export function normalizeCharacter(raw) {
  const defaults = createDefaultCharacter();
  if (!raw || typeof raw !== "object") return defaults;

  const className = matchOption(raw.className, CLASS_NAMES, defaults.className);
  const validSubclasses = getSubclassesForClass(className);
  const subclass = matchOption(
    raw.subclass,
    validSubclasses,
    validSubclasses[0],
  );

  return {
    ...defaults,
    ...raw,
    className,
    subclass,
    ancestry: matchOption(raw.ancestry, ANCESTRY_NAMES, defaults.ancestry),
    mixedAncestry: Boolean(raw.mixedAncestry),
    secondAncestry: matchOption(
      raw.secondAncestry,
      ANCESTRY_NAMES,
      defaults.secondAncestry,
    ),
    community: matchOption(raw.community, COMMUNITY_NAMES, defaults.community),
    armor: { ...defaults.armor, ...raw.armor },
    traits: { ...defaults.traits, ...raw.traits },
    hp: { ...defaults.hp, ...raw.hp },
    stress: { ...defaults.stress, ...raw.stress },
    hope: {
      max: Math.max(
        1,
        Math.min(6, Number(raw.hope?.max ?? defaults.hope.max) || 6),
      ),
      current: Math.max(
        0,
        Math.min(
          Math.max(
            1,
            Math.min(6, Number(raw.hope?.max ?? defaults.hope.max) || 6),
          ),
          Number(raw.hope?.current ?? defaults.hope.current) || 0,
        ),
      ),
    },
    conditions: { ...defaults.conditions, ...raw.conditions },
    experiences: Array.isArray(raw.experiences)
      ? raw.experiences
      : defaults.experiences,
    weapons: {
      primary: { ...defaults.weapons.primary, ...raw.weapons?.primary },
      secondary: { ...defaults.weapons.secondary, ...raw.weapons?.secondary },
    },
    gold: { ...defaults.gold, ...raw.gold },
    domainCards: Array.isArray(raw.domainCards)
      ? raw.domainCards
      : defaults.domainCards,
    inventory: Array.isArray(raw.inventory)
      ? raw.inventory
      : defaults.inventory,
    customHopeFeatures: Array.isArray(raw?.customHopeFeatures)
      ? raw.customHopeFeatures
          .filter((f) => f && typeof f === "object")
          .map((f, idx) => ({
            id: typeof f.id === "string" && f.id ? f.id : `hope-${idx}`,
            name:
              typeof f.name === "string"
                ? f.name
                : "Custom Hope Feature (3 Hope)",
            tag: typeof f.tag === "string" ? f.tag : "Hope Feature",
            text: typeof f.text === "string" ? f.text : "",
          }))
      : [],
    companion: {
      ...defaults.companion,
      ...(raw.companion && typeof raw.companion === "object"
        ? raw.companion
        : {}),
      stress: {
        max: Math.max(
          1,
          Math.min(
            10,
            Number(
              raw.companion?.stress?.max ?? defaults.companion.stress.max,
            ) || 3,
          ),
        ),
        marked: Math.max(
          0,
          Math.min(
            Math.max(
              1,
              Math.min(
                10,
                Number(
                  raw.companion?.stress?.max ?? defaults.companion.stress.max,
                ) || 3,
              ),
            ),
            Number(raw.companion?.stress?.marked ?? 0) || 0,
          ),
        ),
      },
      experiences: Array.isArray(raw.companion?.experiences)
        ? raw.companion.experiences
            .filter((/** @type {any} */ e) => e && typeof e === "object")
            .map((/** @type {any} */ e, /** @type {number} */ idx) => ({
              id: typeof e.id === "string" && e.id ? e.id : `ce_${idx}`,
              label: typeof e.label === "string" ? e.label : "",
              bonus: Number(e.bonus ?? 2) || 0,
            }))
        : defaults.companion.experiences,
      upgrades:
        raw.companion?.upgrades && typeof raw.companion.upgrades === "object"
          ? { ...raw.companion.upgrades }
          : {},
    },
    beastform: {
      ...defaults.beastform,
      ...(raw.beastform && typeof raw.beastform === "object"
        ? raw.beastform
        : {}),
      active: Boolean(raw.beastform?.active),
    },
  };
}

/** @param {CharacterState} character */
export function getLoadoutCount(character) {
  return character.domainCards.filter((card) => card.location === "loadout")
    .length;
}

/** @param {CharacterState} character */
export function getThresholds(character) {
  return {
    major: character.armor.baseMajor + character.level,
    severe: character.armor.baseSevere + character.level,
  };
}

/**
 * @param {CharacterState} character
 * @param {number} incomingDamage
 */
export function calculateDamageOutcome(character, incomingDamage) {
  const availableArmor = character.armor.score - character.armor.slotsMarked;

  if (!Number.isFinite(incomingDamage) || incomingDamage <= 0) {
    return {
      severity: /** @type {DamageSeverity} */ ("None"),
      hpLoss: 0,
      reducedSeverity: /** @type {DamageSeverity} */ ("None"),
      reducedHpLoss: 0,
      canUseArmor: false,
    };
  }

  const { major, severe } = getThresholds(character);

  /** @type {DamageSeverity} */
  let severity = "Minor";
  let hpLoss = 1;
  /** @type {DamageSeverity} */
  let reducedSeverity = "None";
  let reducedHpLoss = 0;

  if (incomingDamage >= severe) {
    severity = "Severe";
    hpLoss = 3;
    reducedSeverity = "Major";
    reducedHpLoss = 2;
  } else if (incomingDamage >= major) {
    severity = "Major";
    hpLoss = 2;
    reducedSeverity = "Minor";
    reducedHpLoss = 1;
  }

  return {
    severity,
    hpLoss,
    reducedSeverity,
    reducedHpLoss,
    canUseArmor: availableArmor > 0,
  };
}

/**
 * @param {{ handfuls: number, bags: number, chests: number }} gold
 * @param {GoldUnit} unit
 * @param {number} delta
 */
export function adjustGold(gold, unit, delta) {
  const multiplier = unit === "chests" ? 100 : unit === "bags" ? 10 : 1;
  const currentTotal = gold.chests * 100 + gold.bags * 10 + gold.handfuls;
  const nextTotal = currentTotal + delta * multiplier;

  if (nextTotal < 0) {
    return { ...gold };
  }

  return {
    chests: Math.floor(nextTotal / 100),
    bags: Math.floor((nextTotal % 100) / 10),
    handfuls: nextTotal % 10,
  };
}

/** @returns {CharacterState} */
export function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultCharacter();
    return normalizeCharacter(JSON.parse(raw));
  } catch {
    return createDefaultCharacter();
  }
}

/** @param {CharacterState} character */
export function saveLocalState(character) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
}

/** @returns {Record<string, CharacterState>} */
function readDraftMap() {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves an unsynced per-sheet backup locally if Room Metadata hits the 16 KB cap.
 * @param {string} sheetId
 * @param {CharacterState} character
 */
export function saveLocalDraft(sheetId, character) {
  if (!sheetId) return;
  try {
    const map = readDraftMap();
    map[sheetId] = character;
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore localStorage quota errors
  }
}

/** @param {string} sheetId */
export function clearLocalDraft(sheetId) {
  if (!sheetId) return;
  try {
    const map = readDraftMap();
    if (sheetId in map) {
      delete map[sheetId];
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore localStorage errors
  }
}
