import OBR from "@owlbear-rodeo/sdk";

export const DICE_PLUS_SOURCE = "daggerheart-obr-sheet";

export const DICE_PLUS_CHANNELS = {
  isReady: "dice-plus/isReady",
  validateNotation: "dice-plus/validate-notation",
  rollRequest: "dice-plus/roll-request",
  rollResult: `${DICE_PLUS_SOURCE}/roll-result`,
  rollError: `${DICE_PLUS_SOURCE}/roll-error`,
};

/**
 * @typedef {"hope" | "fear" | "critical" | "reaction"} DualityOutcome
 * @typedef {"normal" | "advantage" | "disadvantage"} RollMode
 * @typedef {"everyone" | "self" | "gm_only"} RollTarget
 *
 * @typedef {Object} RollOptions
 * @property {RollMode} [rollMode]
 * @property {number} [experienceBonus]
 * @property {string[]} [appliedExperiences]
 * @property {RollTarget} [rollTarget]
 * @property {boolean} [isReaction]
 *
 * @typedef {Object} DualityRollResult
 * @property {string} traitLabel
 * @property {number} hopeDie
 * @property {number} fearDie
 * @property {boolean} isReaction
 * @property {RollMode} rollMode
 * @property {number | null} advDie
 * @property {number} traitModifier
 * @property {number} experienceBonus
 * @property {string[]} appliedExperiences
 * @property {number} total
 * @property {DualityOutcome} outcome
 * @property {string} outcomeText
 * @property {"local" | "dice-plus"} engine
 */

let dicePlusAvailable = false;

/** @param {number} sides */
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function createRollId() {
  return `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Builds a Dice+ notation string for either an Action Roll (Hope/Fear d12s)
 * or a Reaction Roll (plain 2d12 with no Hope/Fear labels).
 * @param {number} totalFlatModifier
 * @param {RollMode} [rollMode]
 * @param {boolean} [withLabels]
 * @param {boolean} [isReaction]
 * @param {string} [hopeStyle]
 * @param {string} [fearStyle]
 */
export function buildDicePlusNotation(
  totalFlatModifier,
  rollMode = "normal",
  withLabels = true,
  isReaction = false,
  hopeStyle = "hope",
  fearStyle = "fear",
) {
  if (!withLabels) {
    const baseDice = isReaction
      ? "2d12"
      : `1d12{${hopeStyle}}+1d12{${fearStyle}}`;
    const advPart =
      rollMode === "advantage"
        ? "+1d6"
        : rollMode === "disadvantage"
          ? "-1d6"
          : "";
    const modPart =
      totalFlatModifier > 0
        ? `+${totalFlatModifier}`
        : totalFlatModifier < 0
          ? `${totalFlatModifier}`
          : "";
    return `${baseDice}${advPart}${modPart}`;
  }

  const baseDice = isReaction
    ? "2d12 # Reaction"
    : `1d12{${hopeStyle}} # Hope + 1d12{${fearStyle}} # Fear`;
  const advPart =
    rollMode === "advantage"
      ? " + 1d6 # Advantage"
      : rollMode === "disadvantage"
        ? " - 1d6 # Disadvantage"
        : "";
  const spacedMod =
    totalFlatModifier > 0
      ? ` + ${totalFlatModifier}`
      : totalFlatModifier < 0
        ? ` - ${Math.abs(totalFlatModifier)}`
        : "";

  return `${baseDice}${advPart}${spacedMod}`;
}

/**
 * Applies Daggerheart SRD Duality Dice or Reaction Roll rules.
 * @param {string} traitLabel
 * @param {number} hopeDie
 * @param {number} fearDie
 * @param {number} traitModifier
 * @param {"local" | "dice-plus"} engine
 * @param {RollMode} [rollMode]
 * @param {number | null} [advDie]
 * @param {number} [experienceBonus]
 * @param {string[]} [appliedExperiences]
 * @param {boolean} [isReaction]
 * @returns {DualityRollResult}
 */
export function evaluateDualityRoll(
  traitLabel,
  hopeDie,
  fearDie,
  traitModifier,
  engine,
  rollMode = "normal",
  advDie = null,
  experienceBonus = 0,
  appliedExperiences = [],
  isReaction = false,
) {
  const advAdjustment =
    rollMode === "advantage"
      ? (advDie ?? 0)
      : rollMode === "disadvantage"
        ? -(advDie ?? 0)
        : 0;

  const total =
    hopeDie + fearDie + traitModifier + experienceBonus + advAdjustment;

  /** @type {DualityOutcome} */
  let outcome = "fear";
  let outcomeText = "with Fear";

  if (isReaction) {
    if (hopeDie === fearDie) {
      outcome = "critical";
      outcomeText = "Reaction • Critical!";
    } else {
      outcome = "reaction";
      outcomeText = "Reaction";
    }
  } else if (hopeDie === fearDie) {
    outcome = "critical";
    outcomeText = "Critical Success!";
  } else if (hopeDie > fearDie) {
    outcome = "hope";
    outcomeText = "with Hope";
  }

  return {
    traitLabel,
    hopeDie,
    fearDie,
    isReaction,
    rollMode,
    advDie,
    traitModifier,
    experienceBonus,
    appliedExperiences,
    total,
    outcome,
    outcomeText,
    engine,
  };
}

/**
 * Local JS fallback when Dice+ is not installed or when testing standalone.
 * @param {string} traitLabel
 * @param {number} traitModifier
 * @param {RollOptions} [options]
 * @returns {DualityRollResult}
 */
export function rollLocalDuality(traitLabel, traitModifier, options = {}) {
  const rollMode = options.rollMode ?? "normal";
  const experienceBonus = options.experienceBonus ?? 0;
  const appliedExperiences = options.appliedExperiences ?? [];
  const isReaction = Boolean(options.isReaction);

  const hopeDie = rollDie(12);
  const fearDie = rollDie(12);
  const advDie = rollMode === "normal" ? null : rollDie(6);

  return evaluateDualityRoll(
    traitLabel,
    hopeDie,
    fearDie,
    traitModifier,
    "local",
    rollMode,
    advDie,
    experienceBonus,
    appliedExperiences,
    isReaction,
  );
}

/**
 * Official Dice+ ready check via `dice-plus/isReady`.
 * @returns {Promise<boolean>}
 */
export async function checkDicePlusReady() {
  if (!OBR.isAvailable) {
    dicePlusAvailable = false;
    return false;
  }

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      dicePlusAvailable = false;
      resolve(false);
    }, 1000);

    const unsubscribe = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.isReady,
      (event) => {
        /** @type {any} */
        const data = event.data;

        if (
          data &&
          typeof data === "object" &&
          "ready" in data &&
          data.requestId === requestId
        ) {
          clearTimeout(timer);
          unsubscribe();
          dicePlusAvailable = Boolean(data.ready);
          resolve(dicePlusAvailable);
        }
      },
    );

    OBR.broadcast.sendMessage(
      DICE_PLUS_CHANNELS.isReady,
      {
        requestId,
        timestamp: Date.now(),
      },
      { destination: "ALL" },
    );
  });
}

/**
 * Official Dice+ notation validator via `dice-plus/validate-notation`.
 * @param {string} notation
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateDicePlusNotation(notation) {
  if (!OBR.isAvailable) {
    return { valid: false, error: "Owlbear Rodeo is not available" };
  }

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve({ valid: false, error: "Dice+ did not respond" });
    }, 1000);

    const unsubscribe = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.validateNotation,
      (event) => {
        /** @type {any} */
        const data = event.data;

        if (
          data &&
          typeof data === "object" &&
          "valid" in data &&
          data.requestId === requestId
        ) {
          clearTimeout(timer);
          unsubscribe();
          resolve({ valid: Boolean(data.valid), error: data.error?.message });
        }
      },
    );

    OBR.broadcast.sendMessage(
      DICE_PLUS_CHANNELS.validateNotation,
      {
        requestId,
        notation,
        timestamp: Date.now(),
      },
      { destination: "ALL" },
    );
  });
}

/**
 * Extracts both d12 faces (supporting either two 1d12 groups or one 2d12 reaction group)
 * and the optional Advantage/Disadvantage d6 from Dice+ `result.groups`.
 * @param {any} data
 * @param {RollMode} rollMode
 * @param {boolean} isReaction
 * @returns {{ hopeDie: number, fearDie: number, advDie: number | null } | null}
 */
function extractRollDice(data, rollMode, isReaction) {
  const groups = data?.result?.groups;
  if (!Array.isArray(groups)) return null;

  /** @type {number | null} */
  let hopeDie = null;
  /** @type {number | null} */
  let fearDie = null;
  /** @type {number | null} */
  let advDie = null;
  /** @type {number[]} */
  const fallbackD12s = [];

  for (const group of groups) {
    if (!Array.isArray(group?.dice)) continue;

    const keptDice = group.dice.filter(
      (/** @type {any} */ die) =>
        die?.kept !== false && typeof die?.value === "number",
    );
    if (keptDice.length === 0) continue;

    if (group?.diceType === "d12") {
      const description = String(group?.description ?? "")
        .trim()
        .toLowerCase();
      const model = String(group?.diceModel ?? "")
        .trim()
        .toLowerCase();

      for (const keptDie of keptDice) {
        if (!isReaction) {
          const customName = String(keptDie?.customName ?? "")
            .trim()
            .toLowerCase();
          const isHope =
            description === "hope" || model === "hope" || customName === "hope";
          const isFear =
            description === "fear" || model === "fear" || customName === "fear";

          if (hopeDie === null && isHope) {
            hopeDie = keptDie.value;
          } else if (fearDie === null && isFear) {
            fearDie = keptDie.value;
          }
        }

        fallbackD12s.push(keptDie.value);
      }
    } else if (
      group?.diceType === "d6" &&
      rollMode !== "normal" &&
      advDie === null
    ) {
      advDie = Math.abs(keptDice[0].value);
    }
  }

  if (isReaction || hopeDie === null || fearDie === null) {
    if (fallbackD12s.length >= 2) {
      hopeDie = fallbackD12s[0];
      fearDie = fallbackD12s[1];
    } else {
      return null;
    }
  }

  if (rollMode !== "normal" && advDie === null) {
    return null;
  }

  return { hopeDie, fearDie, advDie };
}

/**
 * Sends a 3D roll request to Dice+ and resolves once the dice settle.
 * @param {string} traitLabel
 * @param {number} traitModifier
 * @param {RollOptions} [options]
 * @returns {Promise<DualityRollResult>}
 */
async function rollWithDicePlus(traitLabel, traitModifier, options = {}) {
  const rollMode = options.rollMode ?? "normal";
  const experienceBonus = options.experienceBonus ?? 0;
  const appliedExperiences = options.appliedExperiences ?? [];
  const rollTarget = options.rollTarget ?? "everyone";
  const isReaction = Boolean(options.isReaction);
  const totalFlatModifier = traitModifier + experienceBonus;

  const rollId = createRollId();
  const playerId = await OBR.player.getId();
  const playerName = await OBR.player.getName();

  let diceNotation = buildDicePlusNotation(
    totalFlatModifier,
    rollMode,
    true,
    isReaction,
  );
  const validation = await validateDicePlusNotation(diceNotation);
  if (!validation.valid) {
    console.warn("[Dice+ validation fallback]", validation.error);
    diceNotation = buildDicePlusNotation(
      totalFlatModifier,
      rollMode,
      false,
      isReaction,
    );
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      unsubResult();
      unsubError();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Dice+ roll timed out before settling."));
    }, 15000);

    const unsubResult = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.rollResult,
      (event) => {
        /** @type {any} */
        const data = event.data;
        if (data?.rollId !== rollId) return;

        cleanup();

        const diceValues = extractRollDice(data, rollMode, isReaction);
        if (diceValues) {
          resolve(
            evaluateDualityRoll(
              traitLabel,
              diceValues.hopeDie,
              diceValues.fearDie,
              traitModifier,
              "dice-plus",
              rollMode,
              diceValues.advDie,
              experienceBonus,
              appliedExperiences,
              isReaction,
            ),
          );
        } else {
          reject(new Error("Could not read rolled dice values from Dice+."));
        }
      },
    );

    const unsubError = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.rollError,
      (event) => {
        /** @type {any} */
        const data = event.data;
        if (data?.rollId !== rollId) return;

        cleanup();
        reject(new Error(data?.error || "Dice+ returned a roll error."));
      },
    );

    OBR.broadcast.sendMessage(
      DICE_PLUS_CHANNELS.rollRequest,
      {
        rollId,
        playerId,
        playerName,
        rollTarget,
        diceNotation,
        showResults: true,
        timestamp: Date.now(),
        source: DICE_PLUS_SOURCE,
      },
      { destination: "ALL" },
    );
  });
}

/**
 * Main adapter called by src/main.js whenever a Trait or Weapon Attack button is clicked.
 * @param {string} traitLabel
 * @param {number} traitModifier
 * @param {RollOptions} [options]
 * @returns {Promise<DualityRollResult>}
 */
export async function rollDualityTrait(
  traitLabel,
  traitModifier,
  options = {},
) {
  if (!dicePlusAvailable && OBR.isAvailable) {
    await checkDicePlusReady();
  }

  if (dicePlusAvailable) {
    return await rollWithDicePlus(traitLabel, traitModifier, options);
  }

  return rollLocalDuality(traitLabel, traitModifier, options);
}

/**
 * @typedef {Object} DamageRollResult
 * @property {string} weaponName
 * @property {string} notation
 * @property {number[]} diceRolls
 * @property {number} flatBonus
 * @property {import("./state.js").DamageType} damageType
 * @property {number} total
 * @property {"local" | "dice-plus"} engine
 */

/**
 * Formats a compact weapon damage formula like "1d6+3" or "2d8".
 * @param {number} proficiency
 * @param {number} dieSides
 * @param {number} flatBonus
 */
export function formatDamageFormula(proficiency, dieSides, flatBonus) {
  const count = Math.max(1, proficiency);
  const modPart =
    flatBonus > 0 ? `+${flatBonus}` : flatBonus < 0 ? `${flatBonus}` : "";
  return `${count}d${dieSides}${modPart}`;
}

/**
 * Builds a Dice+ weapon damage string (e.g. "2d6 # Magic + 3").
 * @param {number} proficiency
 * @param {number} dieSides
 * @param {number} flatBonus
 * @param {import("./state.js").DamageType} damageType
 * @param {boolean} [withLabels]
 */
export function buildDamageNotation(
  proficiency,
  dieSides,
  flatBonus,
  damageType,
  withLabels = true,
) {
  const count = Math.max(1, proficiency);
  if (!withLabels) {
    return formatDamageFormula(count, dieSides, flatBonus);
  }

  const spacedMod =
    flatBonus > 0
      ? ` + ${flatBonus}`
      : flatBonus < 0
        ? ` - ${Math.abs(flatBonus)}`
        : "";
  return `${count}d${dieSides} # ${damageType}${spacedMod}`;
}

/**
 * Extracts all kept die values from a Dice+ damage roll response.
 * @param {any} data
 * @returns {number[] | null}
 */
function extractDamageRolls(data) {
  const groups = data?.result?.groups;
  if (!Array.isArray(groups)) return null;

  /** @type {number[]} */
  const rolls = [];

  for (const group of groups) {
    if (!Array.isArray(group?.dice)) continue;
    for (const die of group.dice) {
      if (die?.kept !== false && typeof die?.value === "number") {
        rolls.push(die.value);
      }
    }
  }

  return rolls.length > 0 ? rolls : null;
}

/**
 * Sends a 3D weapon damage roll to Dice+.
 * @param {string} weaponName
 * @param {number} proficiency
 * @param {number} dieSides
 * @param {number} flatBonus
 * @param {import("./state.js").DamageType} damageType
 * @param {RollTarget} [rollTarget]
 * @returns {Promise<DamageRollResult>}
 */
async function rollWeaponDamageWithDicePlus(
  weaponName,
  proficiency,
  dieSides,
  flatBonus,
  damageType,
  rollTarget = "everyone",
) {
  const rollId = createRollId();
  const playerId = await OBR.player.getId();
  const playerName = await OBR.player.getName();
  const compactFormula = formatDamageFormula(proficiency, dieSides, flatBonus);

  let diceNotation = buildDamageNotation(
    proficiency,
    dieSides,
    flatBonus,
    damageType,
    true,
  );
  const validation = await validateDicePlusNotation(diceNotation);
  if (!validation.valid) {
    console.warn("[Dice+ damage validation fallback]", validation.error);
    diceNotation = compactFormula;
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      unsubResult();
      unsubError();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Dice+ damage roll timed out before settling."));
    }, 15000);

    const unsubResult = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.rollResult,
      (event) => {
        /** @type {any} */
        const data = event.data;
        if (data?.rollId !== rollId) return;

        cleanup();

        const diceRolls = extractDamageRolls(data);
        if (diceRolls) {
          const diceSum = diceRolls.reduce((sum, val) => sum + val, 0);
          const total =
            typeof data?.result?.totalValue === "number"
              ? data.result.totalValue
              : diceSum + flatBonus;

          resolve({
            weaponName,
            notation: compactFormula,
            diceRolls,
            flatBonus,
            damageType,
            total,
            engine: "dice-plus",
          });
        } else {
          reject(new Error("Could not read weapon damage dice from Dice+."));
        }
      },
    );

    const unsubError = OBR.broadcast.onMessage(
      DICE_PLUS_CHANNELS.rollError,
      (event) => {
        /** @type {any} */
        const data = event.data;
        if (data?.rollId !== rollId) return;

        cleanup();
        reject(new Error(data?.error || "Dice+ returned a damage roll error."));
      },
    );

    OBR.broadcast.sendMessage(
      DICE_PLUS_CHANNELS.rollRequest,
      {
        rollId,
        playerId,
        playerName,
        rollTarget,
        diceNotation,
        showResults: true,
        timestamp: Date.now(),
        source: DICE_PLUS_SOURCE,
      },
      { destination: "ALL" },
    );
  });
}

/**
 * Rolls weapon damage using Dice+ if available, or locally otherwise.
 * @param {string} weaponName
 * @param {number} proficiency
 * @param {number} dieSides
 * @param {number} flatBonus
 * @param {import("./state.js").DamageType} damageType
 * @returns {Promise<DamageRollResult>}
 */
export async function rollWeaponDamage(
  weaponName,
  proficiency,
  dieSides,
  flatBonus,
  damageType,
) {
  if (!dicePlusAvailable && OBR.isAvailable) {
    await checkDicePlusReady();
  }

  if (dicePlusAvailable) {
    return await rollWeaponDamageWithDicePlus(
      weaponName,
      proficiency,
      dieSides,
      flatBonus,
      damageType,
    );
  }

  const count = Math.max(1, proficiency);
  /** @type {number[]} */
  const diceRolls = [];
  for (let i = 0; i < count; i++) {
    diceRolls.push(rollDie(dieSides));
  }

  const total = diceRolls.reduce((sum, val) => sum + val, 0) + flatBonus;
  return {
    weaponName,
    notation: formatDamageFormula(count, dieSides, flatBonus),
    diceRolls,
    flatBonus,
    damageType,
    total,
    engine: "local",
  };
}
