import OBR, {
  buildLabel,
  buildPath,
  buildText,
  Command,
  isLabel,
  isPath,
  isText,
} from "@owlbear-rodeo/sdk";

export const TOKEN_SHEET_KEY = "daggerheart-obr-sheet/linkedSheetId";
export const HUD_SHEET_KEY = "daggerheart-obr-sheet/hudSheetId";
export const HUD_TOKEN_KEY = "daggerheart-obr-sheet/hudForTokenId";
const HUD_PART_KEY = "daggerheart-obr-sheet/hudPart";
const HUD_VERSION_KEY = "daggerheart-obr-sheet/hudVersion";
const HUD_VERSION = "badges-v3";

/**
 * @typedef {"top-left" | "top-center" | "top-right" | "middle-left" | "center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right"} HudAnchor
 */

/**
 * Centralized HUD styling config — edit colors, sizing, anchors, and offsets here.
 * Tip: Color/text changes sync live; anchor/offset/size changes apply after Unlink -> Link.
 */
export const HUD_STYLE = {
  /** @type {"NOTE" | "TEXT" | "ATTACHMENT"} */
  layer: "NOTE",
  /** "compact" shows single numbers (6, 0, 2, 3); "fraction" shows current/max (6/6, 0/6...) */
  /** @type {"compact" | "fraction"} */
  valueFormat: "compact",
  badgeSize: 34, // Diameter of each badge in scene units
  strokeWidth: 2,
  fillOpacity: 0.96,
  fontFamily: "Gotica",
  fontSizeCompact: 16,
  fontSizeFraction: 11,
  fontWeight: 700,
  d12FacetColor: "#854d0e",
  d12FacetOpacity: 0.45,
  d12FacetStrokeWidth: 1.2,
  badges: {
    hp: {
      /** @type {HudAnchor} */
      anchor: "bottom-left",
      offsetX: 24,
      offsetY: -24,
      fillColor: "#dc2626",
      strokeColor: "#fca5a5",
      textColor: "#ffffff",
      emptyFillColor: "#450a0a",
      emptyStrokeColor: "#ef4444",
      emptyTextColor: "#fca5a5",
      textOffsetY: 0.1,
    },
    armor: {
      /** @type {HudAnchor} */
      anchor: "top-right",
      offsetX: -24,
      offsetY: 24,
      fillColor: "#2563eb",
      strokeColor: "#93c5fd",
      textColor: "#ffffff",
      emptyFillColor: "#1e293b",
      emptyStrokeColor: "#64748b",
      emptyTextColor: "#94a3b8",
      textOffsetY: -0.04,
    },
    stress: {
      /** @type {HudAnchor} */
      anchor: "top-left",
      offsetX: 24,
      offsetY: 24,
      fillColor: "#7c3aed",
      strokeColor: "#d8b4fe",
      textColor: "#ffffff",
      maxFillColor: "#581c87",
      maxStrokeColor: "#f0abfc",
      maxTextColor: "#fdf4ff",
      textOffsetY: 0.16,
    },
    hope: {
      /** @type {HudAnchor} */
      anchor: "bottom-right",
      offsetX: -24,
      offsetY: -24,
      fillColor: "#facc15",
      strokeColor: "#a16207",
      textColor: "#a16207",
      emptyFillColor: "#713f12",
      emptyStrokeColor: "#ca8a04",
      emptyTextColor: "#fef08a",
      textOffsetY: -0.03,
    },
  },
  conditionsPill: {
    /** @type {HudAnchor} */
    anchor: "bottom-center",
    offsetX: 0,
    offsetY: 16,
    fontSize: 11,
    fontWeight: 600,
    textColor: "#fecaca",
    backgroundColor: "#450a0a",
    backgroundOpacity: 0.92,
    cornerRadius: 6,
    padding: 4,
  },
};

const STAT_KEYS = /** @type {const} */ (["hp", "stress", "hope", "armor"]);
const REQUIRED_PARTS = [
  "shape:hp",
  "text:hp",
  "shape:stress",
  "text:stress",
  "shape:hope",
  "facet:hope",
  "text:hope",
  "shape:armor",
  "text:armor",
];

/** @typedef {(typeof STAT_KEYS)[number]} StatKey */

/**
 * Red Heart silhouette centered at (0, 0) with radius `r`.
 * @param {number} r
 * @returns {import("@owlbear-rodeo/sdk").PathCommand[]}
 */
function createHeartCommands(r) {
  return [
    [Command.MOVE, 0, -0.38 * r],
    [Command.QUAD, 0.2 * r, -0.98 * r, 0.54 * r, -0.98 * r],
    [Command.QUAD, 1.02 * r, -0.98 * r, 1.02 * r, -0.3 * r],
    [Command.QUAD, 1.02 * r, 0.3 * r, 0, 1.0 * r],
    [Command.QUAD, -1.02 * r, 0.3 * r, -1.02 * r, -0.3 * r],
    [Command.QUAD, -1.02 * r, -0.98 * r, -0.54 * r, -0.98 * r],
    [Command.QUAD, -0.2 * r, -0.98 * r, 0, -0.38 * r],
    [Command.CLOSE],
  ];
}

/**
 * Violet Teardrop silhouette centered at (0, 0) with radius `r`.
 * @param {number} r
 * @returns {import("@owlbear-rodeo/sdk").PathCommand[]}
 */
function createTeardropCommands(r) {
  return [
    [Command.MOVE, 0, -1.04 * r],
    [Command.QUAD, 0.86 * r, -0.22 * r, 0.86 * r, 0.24 * r],
    [Command.QUAD, 0.86 * r, 1.02 * r, 0, 1.02 * r],
    [Command.QUAD, -0.86 * r, 1.02 * r, -0.86 * r, 0.24 * r],
    [Command.QUAD, -0.86 * r, -0.22 * r, 0, -1.04 * r],
    [Command.CLOSE],
  ];
}

/**
 * Yellow d12 outer 10-sided silhouette (true face-on dodecahedron projection).
 * @param {number} r
 * @returns {import("@owlbear-rodeo/sdk").PathCommand[]}
 */
function createD12BodyCommands(r) {
  /** @type {import("@owlbear-rodeo/sdk").PathCommand[]} */
  const cmds = [];
  const sides = 10;

  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    cmds.push(i === 0 ? [Command.MOVE, x, y] : [Command.LINE, x, y]);
  }

  cmds.push([Command.CLOSE]);
  return cmds;
}

/**
 * Inner pentagon face + 5 radial facet edges for the d12 badge.
 * @param {number} r
 * @returns {import("@owlbear-rodeo/sdk").PathCommand[]}
 */
function createD12FacetCommands(r) {
  /** @type {import("@owlbear-rodeo/sdk").PathCommand[]} */
  const cmds = [];
  const innerR = r * 0.62;
  /** @type {{ x: number, y: number }[]} */
  const innerPts = [];
  /** @type {{ x: number, y: number }[]} */
  const outerPts = [];

  for (let k = 0; k < 5; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    innerPts.push({ x: Math.cos(angle) * innerR, y: Math.sin(angle) * innerR });
    outerPts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }

  // Front pentagon face
  for (let k = 0; k < 5; k++) {
    const pt = innerPts[k];
    cmds.push(
      k === 0 ? [Command.MOVE, pt.x, pt.y] : [Command.LINE, pt.x, pt.y],
    );
  }
  cmds.push([Command.CLOSE]);

  // 5 radial facet edges connecting inner pentagon corners to outer d12 vertices
  for (let k = 0; k < 5; k++) {
    cmds.push([Command.MOVE, innerPts[k].x, innerPts[k].y]);
    cmds.push([Command.LINE, outerPts[k].x, outerPts[k].y]);
  }

  return cmds;
}

/**
 * Blue heraldic Shield silhouette centered at (0, 0) with radius `r`.
 * @param {number} r
 * @returns {import("@owlbear-rodeo/sdk").PathCommand[]}
 */
function createShieldCommands(r) {
  return [
    [Command.MOVE, -0.88 * r, -0.84 * r],
    [Command.QUAD, 0, -1.04 * r, 0.88 * r, -0.84 * r],
    [Command.LINE, 0.88 * r, -0.08 * r],
    [Command.QUAD, 0.88 * r, 0.6 * r, 0, 1.04 * r],
    [Command.QUAD, -0.88 * r, 0.6 * r, -0.88 * r, -0.08 * r],
    [Command.CLOSE],
  ];
}

/**
 * @param {StatKey} statKey
 * @param {number} radius
 */
function getShapeCommands(statKey, radius) {
  if (statKey === "hp") return createHeartCommands(radius);
  if (statKey === "stress") return createTeardropCommands(radius);
  if (statKey === "hope") return createD12BodyCommands(radius);
  return createShieldCommands(radius);
}

/**
 * Computes live text values and dynamic state colors for all 4 badges + conditions.
 * @param {import("./state.js").CharacterState} character
 */
function getStatSnapshots(character) {
  const hpLeft = Math.max(0, character.hp.max - character.hp.marked);
  const armorLeft = Math.max(
    0,
    character.armor.score - character.armor.slotsMarked,
  );
  const compact = HUD_STYLE.valueFormat === "compact";

  const hpStyle = HUD_STYLE.badges.hp;
  const stressStyle = HUD_STYLE.badges.stress;
  const hopeStyle = HUD_STYLE.badges.hope;
  const armorStyle = HUD_STYLE.badges.armor;

  const hpEmpty = hpLeft === 0;
  const stressMaxed = character.stress.marked >= character.stress.max;
  const hopeEmpty = character.hope.current === 0;
  const armorEmpty = armorLeft === 0;

  /** @type {string[]} */
  const activeConditions = [];
  if (character.conditions.vulnerable) activeConditions.push("Vulnerable");
  if (character.conditions.restrained) activeConditions.push("Restrained");
  if (character.conditions.hidden) activeConditions.push("Hidden");

  return {
    stats: {
      hp: {
        label: compact ? String(hpLeft) : `${hpLeft}/${character.hp.max}`,
        fillColor: hpEmpty ? hpStyle.emptyFillColor : hpStyle.fillColor,
        strokeColor: hpEmpty ? hpStyle.emptyStrokeColor : hpStyle.strokeColor,
        textColor: hpEmpty ? hpStyle.emptyTextColor : hpStyle.textColor,
        textOffsetY: hpStyle.textOffsetY,
      },
      stress: {
        label: compact
          ? String(character.stress.marked)
          : `${character.stress.marked}/${character.stress.max}`,
        fillColor: stressMaxed
          ? stressStyle.maxFillColor
          : stressStyle.fillColor,
        strokeColor: stressMaxed
          ? stressStyle.maxStrokeColor
          : stressStyle.strokeColor,
        textColor: stressMaxed
          ? stressStyle.maxTextColor
          : stressStyle.textColor,
        textOffsetY: stressStyle.textOffsetY,
      },
      hope: {
        label: compact
          ? String(character.hope.current)
          : `${character.hope.current}/${character.hope.max}`,
        fillColor: hopeEmpty ? hopeStyle.emptyFillColor : hopeStyle.fillColor,
        strokeColor: hopeEmpty
          ? hopeStyle.emptyStrokeColor
          : hopeStyle.strokeColor,
        textColor: hopeEmpty ? hopeStyle.emptyTextColor : hopeStyle.textColor,
        textOffsetY: hopeStyle.textOffsetY,
      },
      armor: {
        label: compact
          ? String(armorLeft)
          : `${armorLeft}/${character.armor.score}`,
        fillColor: armorEmpty
          ? armorStyle.emptyFillColor
          : armorStyle.fillColor,
        strokeColor: armorEmpty
          ? armorStyle.emptyStrokeColor
          : armorStyle.strokeColor,
        textColor: armorEmpty
          ? armorStyle.emptyTextColor
          : armorStyle.textColor,
        textOffsetY: armorStyle.textOffsetY,
      },
    },
    conditionsText: activeConditions.join(" • "),
  };
}

/**
 * Converts a named anchor + pixel offset into exact scene coordinates around a token's bounding box.
 * @param {import("@owlbear-rodeo/sdk").BoundingBox} bounds
 * @param {HudAnchor} anchor
 * @param {number} [offsetX]
 * @param {number} [offsetY]
 */
function resolveAnchorPosition(bounds, anchor, offsetX = 0, offsetY = 0) {
  let x = bounds.center.x;
  let y = bounds.center.y;

  if (anchor.endsWith("left")) x = bounds.min.x;
  else if (anchor.endsWith("right")) x = bounds.max.x;

  if (anchor.startsWith("top")) y = bounds.min.y;
  else if (anchor.startsWith("bottom")) y = bounds.max.y;

  return { x: x + offsetX, y: y + offsetY };
}

/**
 * Builds the optional Conditions pill anchored relative to the token.
 * @param {import("@owlbear-rodeo/sdk").Item} token
 * @param {string} sheetId
 * @param {string} charName
 * @param {string} conditionsText
 * @param {import("@owlbear-rodeo/sdk").BoundingBox} bounds
 * @param {number} zIndex
 */
function buildConditionsPill(
  token,
  sheetId,
  charName,
  conditionsText,
  bounds,
  zIndex,
) {
  const pill = HUD_STYLE.conditionsPill;
  const pos = resolveAnchorPosition(
    bounds,
    pill.anchor,
    pill.offsetX,
    pill.offsetY,
  );

  return buildLabel()
    .name(`${charName} Conditions`)
    .plainText(conditionsText)
    .position(pos)
    .layer(HUD_STYLE.layer)
    .attachedTo(token.id)
    .locked(true)
    .disableHit(true)
    .disableAttachmentBehavior(["ROTATION", "SCALE"])
    .visible(token.visible)
    .fontSize(pill.fontSize)
    .fontWeight(pill.fontWeight)
    .fontFamily(HUD_STYLE.fontFamily)
    .fillColor(pill.textColor)
    .backgroundColor(pill.backgroundColor)
    .backgroundOpacity(pill.backgroundOpacity)
    .cornerRadius(pill.cornerRadius)
    .padding(pill.padding)
    .pointerDirection("NONE")
    .maxViewScale(1)
    .minViewScale(0.35)
    .zIndex(zIndex)
    .metadata({
      [HUD_SHEET_KEY]: sheetId,
      [HUD_TOKEN_KEY]: token.id,
      [HUD_PART_KEY]: "conditions",
      [HUD_VERSION_KEY]: HUD_VERSION,
    })
    .build();
}

/**
 * Builds the complete multi-badge HUD item set using per-badge anchors and offsets.
 * @param {import("@owlbear-rodeo/sdk").Item} token
 * @param {string} sheetId
 * @param {import("./state.js").CharacterState} character
 * @param {import("@owlbear-rodeo/sdk").BoundingBox} bounds
 * @returns {import("@owlbear-rodeo/sdk").Item[]}
 */
function buildBadgeHudItems(token, sheetId, character, bounds) {
  const charName = character.name.trim() || token.name || "Character";
  const snapshot = getStatSnapshots(character);
  const radius = HUD_STYLE.badgeSize / 2;
  const baseZ = Date.now();

  const fontSize =
    HUD_STYLE.valueFormat === "compact"
      ? HUD_STYLE.fontSizeCompact
      : HUD_STYLE.fontSizeFraction;
  const textBoxW = HUD_STYLE.badgeSize * 1.35;
  const textBoxH = HUD_STYLE.badgeSize;

  /** @type {import("@owlbear-rodeo/sdk").Item[]} */
  const items = [];

  STAT_KEYS.forEach((statKey, idx) => {
    const badgeCfg = HUD_STYLE.badges[statKey];
    const pos = resolveAnchorPosition(
      bounds,
      badgeCfg.anchor,
      badgeCfg.offsetX,
      badgeCfg.offsetY,
    );
    const stat = snapshot.stats[statKey];
    const statLabel = statKey.toUpperCase();

    // 1. Vector badge shape (Heart, Teardrop, d12, or Shield)
    items.push(
      buildPath()
        .name(`${charName} ${statLabel} Badge`)
        .commands(getShapeCommands(statKey, radius))
        .position(pos)
        .layer(HUD_STYLE.layer)
        .attachedTo(token.id)
        .locked(true)
        .disableHit(true)
        .disableAttachmentBehavior(["ROTATION", "SCALE"])
        .visible(token.visible)
        .fillColor(stat.fillColor)
        .fillOpacity(HUD_STYLE.fillOpacity)
        .strokeColor(stat.strokeColor)
        .strokeOpacity(1)
        .strokeWidth(HUD_STYLE.strokeWidth)
        .zIndex(baseZ + idx)
        .metadata({
          [HUD_SHEET_KEY]: sheetId,
          [HUD_TOKEN_KEY]: token.id,
          [HUD_PART_KEY]: `shape:${statKey}`,
          [HUD_VERSION_KEY]: HUD_VERSION,
        })
        .build(),
    );

    // 2. Subtle inner pentagon facet lines on the yellow d12
    if (statKey === "hope") {
      items.push(
        buildPath()
          .name(`${charName} HOPE Facets`)
          .commands(createD12FacetCommands(radius))
          .position(pos)
          .layer(HUD_STYLE.layer)
          .attachedTo(token.id)
          .locked(true)
          .disableHit(true)
          .disableAttachmentBehavior(["ROTATION", "SCALE"])
          .visible(token.visible)
          .fillOpacity(0)
          .strokeColor(HUD_STYLE.d12FacetColor)
          .strokeOpacity(HUD_STYLE.d12FacetOpacity)
          .strokeWidth(HUD_STYLE.d12FacetStrokeWidth)
          .zIndex(baseZ + 10 + idx)
          .metadata({
            [HUD_SHEET_KEY]: sheetId,
            [HUD_TOKEN_KEY]: token.id,
            [HUD_PART_KEY]: "facet:hope",
            [HUD_VERSION_KEY]: HUD_VERSION,
          })
          .build(),
      );
    }

    // 3. Centered stat value text
    const textItem = buildText()
      .name(`${charName} ${statLabel} Value`)
      .plainText(stat.label)
      .position({
        x: pos.x - textBoxW / 2,
        y: pos.y - textBoxH / 2 + stat.textOffsetY * radius,
      })
      .width(textBoxW)
      .height(textBoxH)
      .layer(HUD_STYLE.layer)
      .attachedTo(token.id)
      .locked(true)
      .disableHit(true)
      .disableAttachmentBehavior(["ROTATION", "SCALE"])
      .visible(token.visible)
      .fontSize(fontSize)
      .fontWeight(HUD_STYLE.fontWeight)
      .fontFamily(HUD_STYLE.fontFamily)
      .fillColor(stat.textColor)
      .fillOpacity(1)
      .textAlign("CENTER")
      .textAlignVertical("MIDDLE")
      .padding(0)
      .zIndex(baseZ + 20 + idx)
      .metadata({
        [HUD_SHEET_KEY]: sheetId,
        [HUD_TOKEN_KEY]: token.id,
        [HUD_PART_KEY]: `text:${statKey}`,
        [HUD_VERSION_KEY]: HUD_VERSION,
      })
      .build();

    textItem.text.type = "PLAIN";
    items.push(textItem);
  });

  if (snapshot.conditionsText) {
    items.push(
      buildConditionsPill(
        token,
        sheetId,
        charName,
        snapshot.conditionsText,
        bounds,
        baseZ + 30,
      ),
    );
  }

  return items;
}

/**
 * Checks whether a scene is open and returns any tokens linked to `sheetId` in this scene.
 * @param {string} sheetId
 * @returns {Promise<{ sceneReady: boolean, count: number, names: string[] }>}
 */
export async function getLinkedTokenInfo(sheetId) {
  if (!OBR.isAvailable || !sheetId) {
    return { sceneReady: false, count: 0, names: [] };
  }

  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) {
    return { sceneReady: false, count: 0, names: [] };
  }

  const tokens = await OBR.scene.items.getItems(
    (item) => item.metadata?.[TOKEN_SHEET_KEY] === sheetId,
  );

  return {
    sceneReady: true,
    count: tokens.length,
    names: tokens.map((t) => t.name?.trim() || "Token"),
  };
}

/**
 * Links the currently selected canvas token to `sheetId` and builds its multi-badge HUD.
 * Replaces any older HUD items already attached to that token.
 * @param {string} sheetId
 * @param {import("./state.js").CharacterState} character
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function linkSelectedTokenToSheet(sheetId, character) {
  if (!OBR.isAvailable || !sheetId) {
    return { ok: false, message: "Open inside Owlbear Rodeo to link a token." };
  }

  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) {
    return { ok: false, message: "Open a scene first before linking a token." };
  }

  const selection = await OBR.player.getSelection();
  if (!selection || selection.length !== 1) {
    return {
      ok: false,
      message: "Select exactly 1 character token on the map first.",
    };
  }

  const selectedItems = await OBR.scene.items.getItems(selection);
  const token = selectedItems[0];
  if (!token) {
    return { ok: false, message: "Could not read the selected token." };
  }

  if (token.metadata?.[HUD_TOKEN_KEY]) {
    return { ok: false, message: "Select a character token, not a HUD badge." };
  }

  await OBR.scene.items.updateItems([token.id], (items) => {
    for (const item of items) {
      item.metadata[TOKEN_SHEET_KEY] = sheetId;
    }
  });

  // Remove any previous HUD items on this token so geometry & styling start clean
  const existingHuds = await OBR.scene.items.getItems(
    (item) => item.metadata?.[HUD_TOKEN_KEY] === token.id,
  );
  if (existingHuds.length > 0) {
    await OBR.scene.items.deleteItems(existingHuds.map((h) => h.id));
  }

  const bounds = await OBR.scene.items.getItemBounds([token.id]);
  const hudItems = buildBadgeHudItems(token, sheetId, character, bounds);
  await OBR.scene.items.addItems(hudItems);

  const tokenLabel = token.name?.trim() || "Selected token";
  return { ok: true, message: `Linked badge HUD to ${tokenLabel}` };
}

/**
 * Unlinks all tokens tied to `sheetId` in the current scene and deletes all attached HUD items.
 * @param {string} sheetId
 */
export async function unlinkTokensFromSheet(sheetId) {
  if (!OBR.isAvailable || !sheetId) return;

  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) return;

  const linkedTokens = await OBR.scene.items.getItems(
    (item) => item.metadata?.[TOKEN_SHEET_KEY] === sheetId,
  );

  const linkedTokenIds = new Set(linkedTokens.map((t) => t.id));

  if (linkedTokens.length > 0) {
    await OBR.scene.items.updateItems(
      linkedTokens.map((t) => t.id),
      (items) => {
        for (const item of items) {
          delete item.metadata[TOKEN_SHEET_KEY];
        }
      },
    );
  }

  const hudItems = await OBR.scene.items.getItems(
    (item) =>
      item.metadata?.[HUD_SHEET_KEY] === sheetId ||
      (typeof item.metadata?.[HUD_TOKEN_KEY] === "string" &&
        linkedTokenIds.has(item.metadata[HUD_TOKEN_KEY])),
  );

  if (hudItems.length > 0) {
    await OBR.scene.items.deleteItems(hudItems.map((h) => h.id));
  }
}

/**
 * Live-updates badge values, state colors, and conditions for every token linked to `sheetId`.
 * Automatically migrates older Note-label HUDs or recreates missing HUDs on pasted tokens.
 * @param {string} sheetId
 * @param {import("./state.js").CharacterState} character
 */
export async function syncTokenHudForSheet(sheetId, character) {
  if (!OBR.isAvailable || !sheetId) return;

  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) return;

  const linkedTokens = await OBR.scene.items.getItems(
    (item) => item.metadata?.[TOKEN_SHEET_KEY] === sheetId,
  );
  if (linkedTokens.length === 0) return;

  const linkedTokenIds = new Set(linkedTokens.map((t) => t.id));
  const allHuds = await OBR.scene.items.getItems(
    (item) =>
      item.metadata?.[HUD_SHEET_KEY] === sheetId ||
      (typeof item.metadata?.[HUD_TOKEN_KEY] === "string" &&
        linkedTokenIds.has(item.metadata[HUD_TOKEN_KEY])),
  );

  /** @type {Map<string, import("@owlbear-rodeo/sdk").Item[]>} */
  const hudsByToken = new Map();
  for (const hud of allHuds) {
    const parentId = hud.metadata?.[HUD_TOKEN_KEY];
    if (typeof parentId !== "string") continue;
    const list = hudsByToken.get(parentId) ?? [];
    list.push(hud);
    hudsByToken.set(parentId, list);
  }

  const snapshot = getStatSnapshots(character);
  const charName = character.name.trim() || "Character";

  /** @type {string[]} */
  const idsToDelete = [];
  /** @type {import("@owlbear-rodeo/sdk").Item[]} */
  const itemsToAdd = [];
  /** @type {Map<string, (item: import("@owlbear-rodeo/sdk").Item) => void>} */
  const updaters = new Map();

  for (const token of linkedTokens) {
    const tokenHuds = hudsByToken.get(token.id) ?? [];

    /** @type {Map<string, import("@owlbear-rodeo/sdk").Item>} */
    const byPart = new Map();
    let versionValid = tokenHuds.length > 0;

    for (const item of tokenHuds) {
      const part = item.metadata?.[HUD_PART_KEY];
      if (
        item.metadata?.[HUD_VERSION_KEY] !== HUD_VERSION ||
        typeof part !== "string"
      ) {
        versionValid = false;
        break;
      }
      byPart.set(part, item);
    }

    const hasAllRequired =
      versionValid && REQUIRED_PARTS.every((part) => byPart.has(part));

    if (!hasAllRequired) {
      // Upgrade older HUDs or restore missing badges on newly pasted tokens
      for (const oldItem of tokenHuds) {
        idsToDelete.push(oldItem.id);
      }
      const bounds = await OBR.scene.items.getItemBounds([token.id]);
      itemsToAdd.push(...buildBadgeHudItems(token, sheetId, character, bounds));
      continue;
    }

    // Live-patch each badge's shape colors and text value
    for (const statKey of STAT_KEYS) {
      const stat = snapshot.stats[statKey];

      const shapeItem = byPart.get(`shape:${statKey}`);
      if (
        shapeItem &&
        isPath(shapeItem) &&
        (shapeItem.style.fillColor !== stat.fillColor ||
          shapeItem.style.strokeColor !== stat.strokeColor)
      ) {
        updaters.set(shapeItem.id, (item) => {
          if (isPath(item)) {
            item.style.fillColor = stat.fillColor;
            item.style.strokeColor = stat.strokeColor;
          }
        });
      }

      const textItem = byPart.get(`text:${statKey}`);
      if (
        textItem &&
        isText(textItem) &&
        (textItem.text.plainText !== stat.label ||
          textItem.text.style.fillColor !== stat.textColor)
      ) {
        updaters.set(textItem.id, (item) => {
          if (isText(item)) {
            item.text.plainText = stat.label;
            item.text.style.fillColor = stat.textColor;
          }
        });
      }
    }

    // Sync optional Conditions pill
    const condItem = byPart.get("conditions");
    if (snapshot.conditionsText) {
      if (condItem && isLabel(condItem)) {
        if (condItem.text.plainText !== snapshot.conditionsText) {
          updaters.set(condItem.id, (item) => {
            if (isLabel(item)) {
              item.text.plainText = snapshot.conditionsText;
            }
          });
        }
      } else {
        const bounds = await OBR.scene.items.getItemBounds([token.id]);
        itemsToAdd.push(
          buildConditionsPill(
            token,
            sheetId,
            charName,
            snapshot.conditionsText,
            bounds,
            Date.now(),
          ),
        );
      }
    } else if (condItem) {
      idsToDelete.push(condItem.id);
    }
  }

  if (idsToDelete.length > 0) {
    await OBR.scene.items.deleteItems(idsToDelete);
  }
  if (updaters.size > 0) {
    await OBR.scene.items.updateItems(Array.from(updaters.keys()), (items) => {
      for (const item of items) {
        const apply = updaters.get(item.id);
        if (apply) apply(item);
      }
    });
  }
  if (itemsToAdd.length > 0) {
    await OBR.scene.items.addItems(itemsToAdd);
  }
}

/**
 * Debounced wrapper so rapid pip clicks coalesce into one smooth canvas update.
 * @param {number} [delayMs]
 */
export function createHudSyncer(delayMs = 150) {
  /** @type {number | null} */
  let timerId = null;
  /** @type {string | null} */
  let pendingSheetId = null;
  /** @type {import("./state.js").CharacterState | null} */
  let pendingCharacter = null;

  /**
   * @param {string} sheetId
   * @param {import("./state.js").CharacterState} character
   */
  function scheduleSync(sheetId, character) {
    pendingSheetId = sheetId;
    pendingCharacter = JSON.parse(JSON.stringify(character));

    if (timerId !== null) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      timerId = null;
      if (!pendingSheetId || !pendingCharacter) return;

      const sheetIdToSync = pendingSheetId;
      const snapshot = pendingCharacter;
      pendingSheetId = null;
      pendingCharacter = null;

      void syncTokenHudForSheet(sheetIdToSync, snapshot).catch((err) => {
        console.error("[Daggerheart Sheet] Token HUD sync failed:", err);
      });
    }, delayMs);
  }

  return { scheduleSync };
}
