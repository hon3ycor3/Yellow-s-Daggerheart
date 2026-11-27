/**
 * Concise Daggerheart SRD reference data for Heritage, Classes, and Subclasses.
 * Kept out of Room Metadata so character saves stay well under Owlbear's 16 KB limit.
 *
 * @typedef {{ name: string, text: string }} FeatureEntry
 * @typedef {{ name: string, foundation: FeatureEntry[], specialization: FeatureEntry[], mastery: FeatureEntry[] }} SubclassData
 * @typedef {{ domains: [string, string], hopeFeature: FeatureEntry, classFeatures: FeatureEntry[], subclasses: Record<string, SubclassData> }} ClassData
 * @typedef {{ top: FeatureEntry, bottom: FeatureEntry }} AncestryData
 * @typedef {{ feature: FeatureEntry }} CommunityData
 */

/** @type {Record<string, ClassData>} */
export const SRD_CLASSES = {
  Bard: {
    domains: ["Grace", "Codex"],
    hopeFeature: {
      name: "Make a Scene (3 Hope)",
      text: "Temporarily distract a target within Close range, giving them a -2 penalty to their Difficulty.",
    },
    classFeatures: [
      {
        name: "Rally",
        text: "Once per session, grant yourself and each ally a Rally Die (d6; d8 at Level 5) to add to an action, reaction, or damage roll, or clear Stress.",
      },
    ],
    subclasses: {
      Troubadour: {
        name: "Troubadour",
        foundation: [
          {
            name: "Gifted Performer",
            text: "Perform Relaxing, Epic, or Heartbreaking songs once per long rest to heal allies, boost rolls, or penalize foes.",
          },
        ],
        specialization: [
          {
            name: "Maestro",
            text: "When you give a Rally Die to an ally, they can gain a Hope or clear a Stress.",
          },
        ],
        mastery: [
          {
            name: "Virtuoso",
            text: "Perform each of your Gifted Performer songs twice per long rest.",
          },
        ],
      },
      Wordsmith: {
        name: "Wordsmith",
        foundation: [
          {
            name: "Rousing Speech & Heart of a Poet",
            text: "Deliver a speech once per long rest so allies in Far range clear 2 Stress; spend 1 Hope for +d4 when persuading or impressing.",
          },
        ],
        specialization: [
          {
            name: "Eloquent",
            text: "Once per session, encourage an ally to find a mundane object, Help without spending Hope, or gain an extra downtime move.",
          },
        ],
        mastery: [
          {
            name: "Epic Poetry",
            text: "Your Rally Die upgrades to a d10, and when you Help an Ally you roll a d10 as your advantage die.",
          },
        ],
      },
    },
  },
  Druid: {
    domains: ["Sage", "Arcana"],
    hopeFeature: {
      name: "Evolution (3 Hope)",
      text: "Transform into a Beastform without marking Stress and choose one trait to raise by +1 until you drop out of Beastform.",
    },
    classFeatures: [
      {
        name: "Beastform",
        text: "Mark 1 Stress to transform into a magical creature of your tier or lower, gaining its traits, Evasion bonus, attacks, and features.",
      },
      {
        name: "Wildtouch",
        text: "Perform harmless, subtle nature effects at will (blooming flowers, gentle breezes, calming small beasts).",
      },
    ],
    subclasses: {
      "Warden of the Elements": {
        name: "Warden of the Elements",
        foundation: [
          {
            name: "Elemental Incarnation",
            text: "Mark 1 Stress to channel Fire, Earth, Water, or Air for bonus elemental combat effects until you take Severe damage or rest.",
          },
        ],
        specialization: [
          {
            name: "Elemental Aura",
            text: "Once per rest while channeling, project a Close-range aura of your element that harms foes or bolsters allies.",
          },
        ],
        mastery: [
          {
            name: "Elemental Zenith",
            text: "Gain mastery benefits tied to your channeled element, including flight, resistance, or enhanced elemental strikes.",
          },
        ],
      },
      "Warden of Renewal": {
        name: "Warden of Renewal",
        foundation: [
          {
            name: "Clarity of Nature & Regeneration",
            text: "Create a serene space once per long rest to clear Stress; touch a creature and spend 3 Hope to clear 1d4 HP.",
          },
        ],
        specialization: [
          {
            name: "Regenerative Reach & Warden's Protection",
            text: "Use Regeneration within Very Close range; once per long rest spend 2 Hope to clear 2 HP on 1d4 allies in Close range.",
          },
        ],
        mastery: [
          {
            name: "Defender",
            text: "While in Beastform and an ally in Close range marks 2+ HP, mark 1 Stress to reduce the HP they mark by 1.",
          },
        ],
      },
    },
  },
  Guardian: {
    domains: ["Valor", "Blade"],
    hopeFeature: {
      name: "Frontline Tank (3 Hope)",
      text: "Clear 2 Armor Slots.",
    },
    classFeatures: [
      {
        name: "Unstoppable",
        text: "Once per long rest, become Unstoppable with an Unstoppable Die (d4; d6 at Level 5): reduce physical damage severity by one step, add the die to damage, and ignore Restrained/Vulnerable.",
      },
    ],
    subclasses: {
      Stalwart: {
        name: "Stalwart",
        foundation: [
          {
            name: "Unwavering",
            text: "Gain a permanent +1 bonus to your damage thresholds.",
          },
        ],
        specialization: [
          {
            name: "Unrelenting",
            text: "Gain an additional +2 to damage thresholds; Allies in Very Close range can mark your Armor Slots when hit.",
          },
        ],
        mastery: [
          {
            name: "Undaunted",
            text: "Gain an additional +3 to damage thresholds and stay standing longer against punishing blows.",
          },
        ],
      },
      Vengeance: {
        name: "Vengeance",
        foundation: [
          {
            name: "At Ease & Revenge",
            text: "Gain +1 Stress slot; when an adversary in Melee succeeds on an attack against you, mark 2 Stress to force them to mark 1 HP.",
          },
        ],
        specialization: [
          {
            name: "Act of Reprisal",
            text: "When an adversary damages an ally in Melee, gain +1 Proficiency on your next successful attack against that adversary.",
          },
        ],
        mastery: [
          {
            name: "Nemesis",
            text: "Spend 2 Hope to Prioritize an adversary; swap your Hope and Fear dice on rolls against them until you rest or pick a new target.",
          },
        ],
      },
    },
  },
  Ranger: {
    domains: ["Bone", "Sage"],
    hopeFeature: {
      name: "Hold Them Off (3 Hope)",
      text: "When you succeed on an attack with a weapon, apply that same roll against two additional adversaries within range.",
    },
    classFeatures: [
      {
        name: "Ranger's Focus",
        text: "Spend 1 Hope on an attack to mark the target as your Focus: know their direction, deal 1 Stress on hits, and spend Hope to reroll Duality dice against them.",
      },
    ],
    subclasses: {
      Beastbound: {
        name: "Beastbound",
        foundation: [
          {
            name: "Companion",
            text: "Fight alongside an animal companion with its own Evasion, Stress, Experiences, and coordinated attacks.",
          },
        ],
        specialization: [
          {
            name: "Expert Training & Battle-Bonded",
            text: "Choose an extra level-up upgrade for your companion; gain +2 Evasion when an adversary attacks you while your companion is in Melee.",
          },
        ],
        mastery: [
          {
            name: "Advanced Training & Loyal Friend",
            text: "Choose two extra companion upgrades; once per long rest, your companion can take a lethal hit for you (or vice versa).",
          },
        ],
      },
      Wayfinder: {
        name: "Wayfinder",
        foundation: [
          {
            name: "Ruthless Predator & Path Forward",
            text: "Mark 1 Stress for +1 Proficiency on a damage roll (severe hits also inflict 1 Stress); always find the shortest route to a visited place.",
          },
        ],
        specialization: [
          {
            name: "Elusive Predator",
            text: "When your Focus attacks you, gain +2 Evasion against the attack.",
          },
        ],
        mastery: [
          {
            name: "Apex Predator",
            text: "Before attacking your Focus, spend 1 Hope so a successful hit removes 1 Fear from the GM's pool.",
          },
        ],
      },
    },
  },
  Rogue: {
    domains: ["Midnight", "Grace"],
    hopeFeature: {
      name: "Rogue's Dodge (3 Hope)",
      text: "Gain a +2 bonus to your Evasion until the next time an attack succeeds against you (or until your next rest).",
    },
    classFeatures: [
      {
        name: "Cloaked",
        text: "Whenever you would be Hidden, you are Cloaked—remaining unseen while stationary until you move into plain sight or attack.",
      },
      {
        name: "Sneak Attack",
        text: "When you succeed on an attack while Cloaked or while an ally is in Melee with the target, add d6s equal to your Tier to the damage roll.",
      },
    ],
    subclasses: {
      Nightwalker: {
        name: "Nightwalker",
        foundation: [
          {
            name: "Shadow Stepper",
            text: "Move between shadows within Far range by marking 1 Stress, emerging Cloaked.",
          },
        ],
        specialization: [
          {
            name: "Dark Cloud & Adrenaline",
            text: "Create a temporary cloud of darkness (Spellcast 15); while Vulnerable, add your Level to your damage rolls.",
          },
        ],
        mastery: [
          {
            name: "Fleeting Shadow & Vanishing Act",
            text: "Gain +1 Evasion and Shadow Step within Very Far range; mark 1 Stress to become Cloaked at any time.",
          },
        ],
      },
      Syndicate: {
        name: "Syndicate",
        foundation: [
          {
            name: "Well-Connected",
            text: "When arriving in a prominent town or city, declare a local contact who knows you and choose a bond detail.",
          },
        ],
        specialization: [
          {
            name: "Contacts Everywhere",
            text: "Once per session, call in a shady contact for gold, a +3 bonus to a roll, or an ambush adding 2d8 damage.",
          },
        ],
        mastery: [
          {
            name: "Reliable Backup",
            text: "Use Contacts Everywhere three times per session, plus call in a safe house or emergency escape.",
          },
        ],
      },
    },
  },
  Seraph: {
    domains: ["Splendor", "Valor"],
    hopeFeature: {
      name: "Life Support (3 Hope)",
      text: "Clear 1 Hit Point on an ally within Close range.",
    },
    classFeatures: [
      {
        name: "Prayer Dice",
        text: "At the start of each session, roll d4s equal to your Spellcast trait. Spend them anytime to reduce incoming damage, add to a roll, or gain Hope.",
      },
    ],
    subclasses: {
      "Divine Wielder": {
        name: "Divine Wielder",
        foundation: [
          {
            name: "Spirit Weapon & Sparing Touch",
            text: "Throw a Melee weapon up to Close range (returning to your hand) and hit an extra target for 1 Stress; once per long rest touch to clear 2 HP or 2 Stress.",
          },
        ],
        specialization: [
          {
            name: "Devout",
            text: "Roll an extra Prayer Die at session start and use Sparing Touch twice per long rest.",
          },
        ],
        mastery: [
          {
            name: "Sacred Resonance",
            text: "When rolling damage for Spirit Weapon, matching damage dice double their value.",
          },
        ],
      },
      "Winged Sentinel": {
        name: "Winged Sentinel",
        foundation: [
          {
            name: "Wings of Light",
            text: "You can fly; while flying, mark 1 Stress to carry an ally or spend 1 Hope on a hit for +1d8 extra damage.",
          },
        ],
        specialization: [
          {
            name: "Ethereal Visage",
            text: "While flying, gain advantage on Presence rolls and spend 1 Hope to remove a Fear from the GM when rolling with Hope.",
          },
        ],
        mastery: [
          {
            name: "Ascendant & Power of the Gods",
            text: "Gain +4 to your Severe threshold; Wings of Light bonus damage increases to +1d12.",
          },
        ],
      },
    },
  },
  Sorcerer: {
    domains: ["Arcana", "Midnight"],
    hopeFeature: {
      name: "Volatile Magic (3 Hope)",
      text: "Reroll any number of your damage dice on an attack that deals magic damage.",
    },
    classFeatures: [
      {
        name: "Arcane Sense & Minor Illusion",
        text: "Sense magical people and objects within Close range; conjure minor visual illusions within Close range.",
      },
      {
        name: "Channel Raw Power",
        text: "Once per long rest, place a Domain Card from your Loadout into your Vault to gain Hope equal to its level or add twice its level to spell damage.",
      },
    ],
    subclasses: {
      "Elemental Origin": {
        name: "Elemental Origin",
        foundation: [
          {
            name: "Elementalist",
            text: "Choose an element (air, earth, fire, lightning, water): shape it harmlessly, or spend 1 Hope for +2 to a roll or +3 damage using it.",
          },
        ],
        specialization: [
          {
            name: "Natural Evasion",
            text: "When an attack hits you, mark 1 Stress and roll 1d6 to add to your Evasion against that attack.",
          },
        ],
        mastery: [
          {
            name: "Transcendence",
            text: "Once per long rest, transform into your element and pick two bonuses (+4 Severe threshold, +1 trait, +1 Proficiency, or +2 Evasion).",
          },
        ],
      },
      "Primal Origin": {
        name: "Primal Origin",
        foundation: [
          {
            name: "Manipulate Magic",
            text: "After casting a spell or making a magic attack, mark 1 Stress to extend its reach, gain +2 to the roll, double a damage die, or hit an extra target.",
          },
        ],
        specialization: [
          {
            name: "Enchanted Aid",
            text: "When Helping an Ally's Spellcast roll, roll a d8 advantage die; once per long rest swap their Duality dice.",
          },
        ],
        mastery: [
          {
            name: "Arcane Charge",
            text: "Become Charged when taking magic damage or spending 2 Stress; expend Charge on a magic attack for +10 damage or +3 Difficulty to a reaction.",
          },
        ],
      },
    },
  },
  Warrior: {
    domains: ["Blade", "Bone"],
    hopeFeature: {
      name: "No Mercy (3 Hope)",
      text: "Gain a +1 bonus to your attack rolls until your next rest.",
    },
    classFeatures: [
      {
        name: "Attack of Opportunity",
        text: "When an adversary in Melee attempts to leave, make a reaction roll to stop them, deal weapon damage, or move with them.",
      },
      {
        name: "Combat Training",
        text: "Ignore burden when equipping weapons and add your Level to physical weapon damage rolls.",
      },
    ],
    subclasses: {
      "Call of the Brave": {
        name: "Call of the Brave",
        foundation: [
          {
            name: "Courage & Battle Ritual",
            text: "Gain 1 Hope when you fail a roll with Fear; once per long rest perform a ritual to clear 2 Stress and gain 2 Hope.",
          },
        ],
        specialization: [
          {
            name: "Rise to the Challenge",
            text: "Roll a d20 as your Hope Die while you have 2 or fewer unmarked Hit Points.",
          },
        ],
        mastery: [
          {
            name: "Camaraderie",
            text: "Initiate a Tag Team Roll an extra time per session, and allies only spend 2 Hope to Tag Team with you.",
          },
        ],
      },
      "Call of the Slayer": {
        name: "Call of the Slayer",
        foundation: [
          {
            name: "Slayer",
            text: "Store d6 Slayer Dice (up to your Proficiency) when rolling with Hope, and spend them on attack or damage rolls.",
          },
        ],
        specialization: [
          {
            name: "Weapon Specialist",
            text: "Wield multiple weapons smoothly: spend 1 Hope on a hit to add your secondary weapon's damage die, and reroll 1s on Slayer Dice.",
          },
        ],
        mastery: [
          {
            name: "Martial Preparation",
            text: "Train with your party during downtime so you and each participating ally gain a d6 Martial Preparation die.",
          },
        ],
      },
    },
  },
  Wizard: {
    domains: ["Codex", "Splendor"],
    hopeFeature: {
      name: "Not This Time (3 Hope)",
      text: "Force an adversary within Far range to reroll an attack or damage roll.",
    },
    classFeatures: [
      {
        name: "Prestidigitation",
        text: "Perform harmless, subtle magical effects at will (sparks, shifting colors, floating trinkets, cleaning clothes).",
      },
      {
        name: "Strange Patterns",
        text: "Choose a number from 1 to 12; whenever you roll that number on a Duality Die, gain 1 Hope or clear 1 Stress.",
      },
    ],
    subclasses: {
      "School of Knowledge": {
        name: "School of Knowledge",
        foundation: [
          {
            name: "Prepared & Adept",
            text: "Start with an extra Domain Card; spend 2 Stress instead of 1 Hope to double an Experience bonus on a roll.",
          },
        ],
        specialization: [
          {
            name: "Accomplished & Perfect Recall",
            text: "Take an additional Domain Card; once per rest reduce a card's Recall Cost by 1.",
          },
        ],
        mastery: [
          {
            name: "Brilliant & Honed Expertise",
            text: "Take an additional Domain Card; roll a d6 when using an Experience—on 5+, spend no Hope.",
          },
        ],
      },
      "School of War": {
        name: "School of War",
        foundation: [
          {
            name: "Battlemage & Face Your Fear",
            text: "Gain +1 Hit Point slot; deal +1d10 extra magic damage whenever you succeed on an attack with Fear.",
          },
        ],
        specialization: [
          {
            name: "Conjure Shield & Fueled by Fear",
            text: "Add your Proficiency to Evasion while you have 2+ Hope; Face Your Fear extra damage rises to +2d10.",
          },
        ],
        mastery: [
          {
            name: "Thrive in Chaos & Have No Fear",
            text: "Mark 1 Stress after a hit to force the target to mark an extra HP; Face Your Fear extra damage rises to +3d10.",
          },
        ],
      },
    },
  },
};

/** @type {Record<string, AncestryData>} */
export const SRD_ANCESTRIES = {
  Clank: {
    top: {
      name: "Purposeful Design",
      text: "Choose one Experience tied to your built purpose and gain a permanent +1 to it.",
    },
    bottom: {
      name: "Efficient",
      text: "During a Short Rest, you may choose one Long Rest downtime move instead.",
    },
  },
  Drakona: {
    top: {
      name: "Scales",
      text: "When you would take Severe damage, mark 1 Stress to mark 1 fewer Hit Point.",
    },
    bottom: {
      name: "Elemental Breath",
      text: "Use your chosen element as an Instinct weapon within Very Close range dealing d8 magic damage.",
    },
  },
  Dwarf: {
    top: {
      name: "Thick Skin",
      text: "When taking Minor damage, roll 2d6; if either rolls 6, mark 1 Stress instead of 1 HP.",
    },
    bottom: {
      name: "Increased Fortitude",
      text: "Spend 3 Hope to halve incoming physical damage.",
    },
  },
  Elf: {
    top: {
      name: "Quick Reactions",
      text: "Mark 1 Stress to gain advantage on a reaction roll.",
    },
    bottom: {
      name: "Celestial Trance",
      text: "During a rest, enter a trance to choose an extra downtime move.",
    },
  },
  Faerie: {
    top: {
      name: "Luckbender",
      text: "Once per session, spend 3 Hope to reroll the Duality Dice for yourself or a Close ally.",
    },
    bottom: {
      name: "Wings",
      text: "You can fly; while flying, mark 1 Stress after being targeted to gain +2 Evasion against the attack.",
    },
  },
  Faun: {
    top: {
      name: "Caprine Leap",
      text: "Leap anywhere within Close range as normal movement across obstacles or gaps.",
    },
    bottom: {
      name: "Kick",
      text: "After a Melee hit, mark 1 Stress for +2d6 damage and knock yourself or the target back to Very Close.",
    },
  },
  Firbolg: {
    top: {
      name: "Charge",
      text: "When you succeed on an Agility roll to move from Far/Very Far into Melee, mark 1 Stress to deal 1d12 physical damage to foes in Melee.",
    },
    bottom: {
      name: "Unshakable",
      text: "When you would mark 1 Stress, roll a d6; on a 6, don't mark it.",
    },
  },
  Fungril: {
    top: {
      name: "Fungril Network",
      text: "Make an Instinct roll (12) to communicate across any distance through the mycelial network.",
    },
    bottom: {
      name: "Death Connection",
      text: "Touch a recent corpse and mark 1 Stress to extract one memory from its final moments.",
    },
  },
  Galapa: {
    top: {
      name: "Shell",
      text: "Gain a bonus to your damage thresholds equal to your Proficiency.",
    },
    bottom: {
      name: "Retract",
      text: "Mark 1 Stress to pull into your shell: resistance to physical damage, disadvantage on actions, cannot move.",
    },
  },
  Giant: {
    top: {
      name: "Endurance",
      text: "Gain +1 Hit Point slot at character creation.",
    },
    bottom: {
      name: "Reach",
      text: "Treat any weapon, spell, or feature with Melee range as Very Close instead.",
    },
  },
  Goblin: {
    top: { name: "Surefooted", text: "Ignore disadvantage on Agility rolls." },
    bottom: {
      name: "Danger Sense",
      text: "Once per rest, mark 1 Stress to force an adversary to reroll an attack against you or a Very Close ally.",
    },
  },
  Halfling: {
    top: {
      name: "Luckbringer",
      text: "At the start of each session, everyone in your party gains 1 Hope.",
    },
    bottom: {
      name: "Internal Compass",
      text: "Whenever you roll a 1 on your Hope Die, reroll it.",
    },
  },
  Human: {
    top: {
      name: "High Stamina",
      text: "Gain +1 Stress slot at character creation.",
    },
    bottom: {
      name: "Adaptability",
      text: "When you fail a roll using one of your Experiences, mark 1 Stress to reroll it.",
    },
  },
  Infernis: {
    top: {
      name: "Fearless",
      text: "When you roll with Fear, mark 2 Stress to change it into a roll with Hope instead.",
    },
    bottom: {
      name: "Dread Visage",
      text: "Gain advantage on rolls to intimidate hostile creatures.",
    },
  },
  Katari: {
    top: {
      name: "Feline Instincts",
      text: "When making an Agility roll, spend 2 Hope to reroll your Hope Die.",
    },
    bottom: {
      name: "Retracting Claws",
      text: "Make an Agility attack in Melee; on a hit, the target becomes temporarily Vulnerable.",
    },
  },
  Orc: {
    top: {
      name: "Sturdy",
      text: "While you have only 1 unmarked Hit Point remaining, attacks against you have disadvantage.",
    },
    bottom: {
      name: "Tusks",
      text: "After a Melee weapon hit, spend 1 Hope to gore the target for +1d6 extra damage.",
    },
  },
  Ribbet: {
    top: {
      name: "Amphibious",
      text: "Breathe and move naturally underwater as easily as on land.",
    },
    bottom: {
      name: "Long Tongue",
      text: "Grab objects within Close range, or mark 1 Stress to use your tongue as a Finesse Close weapon (d12 physical).",
    },
  },
  Simiah: {
    top: {
      name: "Natural Climber",
      text: "Gain advantage on Agility rolls involving balancing and climbing.",
    },
    bottom: {
      name: "Nimble",
      text: "Gain a permanent +1 bonus to your Evasion.",
    },
  },
};

/** @type {Record<string, CommunityData>} */
export const SRD_COMMUNITIES = {
  Highborne: {
    feature: {
      name: "Privilege",
      text: "Gain advantage on rolls to consort with nobles, negotiate prices, or leverage status.",
    },
  },
  Loreborne: {
    feature: {
      name: "Well-Read",
      text: "Gain advantage on rolls involving history, culture, or politics of a prominent place or person.",
    },
  },
  Orderborne: {
    feature: {
      name: "Dedicated",
      text: "Record three sayings/values; once per rest, roll a d20 as your Hope Die when acting on one.",
    },
  },
  Ridgeborne: {
    feature: {
      name: "Steady",
      text: "Gain advantage on rolls to traverse cliffs, survive harsh environments, and recall mountain survival.",
    },
  },
  Seaborne: {
    feature: {
      name: "Know the Tide",
      text: "Gain tokens when you roll with Fear (up to your Level); spend them for +1 each on a roll.",
    },
  },
  Slyborne: {
    feature: {
      name: "Scoundrel",
      text: "Gain advantage on rolls to negotiate with criminals, detect lies, or find a safe place to hide.",
    },
  },
  Underborne: {
    feature: {
      name: "Low-Light Living",
      text: "In dim light or shadow, gain advantage on rolls to hide, investigate, or perceive details.",
    },
  },
  Wanderborne: {
    feature: {
      name: "Nomadic Pack",
      text: "Once per session, spend 1 Hope to pull a useful mundane item from your well-traveled pack.",
    },
  },
  Wildborne: {
    feature: {
      name: "Lightfoot",
      text: "Move silently without effort; gain advantage on rolls to move unseen or unheard.",
    },
  },
};

export const CLASS_NAMES = Object.keys(SRD_CLASSES);
export const ANCESTRY_NAMES = Object.keys(SRD_ANCESTRIES);
export const COMMUNITY_NAMES = Object.keys(SRD_COMMUNITIES);

/** @param {string} className */
export function getClassData(className) {
  return SRD_CLASSES[className] ?? SRD_CLASSES.Sorcerer;
}

/** @param {string} className */
export function getSubclassesForClass(className) {
  return Object.keys(getClassData(className).subclasses);
}

/** @param {string} ancestryName */
export function getAncestryData(ancestryName) {
  return SRD_ANCESTRIES[ancestryName] ?? SRD_ANCESTRIES.Human;
}

/** @param {string} communityName */
export function getCommunityData(communityName) {
  return SRD_COMMUNITIES[communityName] ?? SRD_COMMUNITIES.Wanderborne;
}

/**
 * Returns Subclass feature tiers unlocked for the character's current level:
 * Foundation (Lvl 1+), Specialization (Lvl 5+), Mastery (Lvl 8+).
 * @param {string} className
 * @param {string} subclassName
 * @param {number} level
 */
export function getUnlockedSubclassTiers(className, subclassName, level) {
  const classData = getClassData(className);
  const subKey = classData.subclasses[subclassName]
    ? subclassName
    : Object.keys(classData.subclasses)[0];
  const sub = classData.subclasses[subKey];

  /** @type {{ tierLabel: string, features: FeatureEntry[] }[]} */
  const unlocked = [
    { tierLabel: "Foundation (Lvl 1+)", features: sub.foundation },
  ];

  if (level >= 5) {
    unlocked.push({
      tierLabel: "Specialization (Lvl 5+)",
      features: sub.specialization,
    });
  }
  if (level >= 8) {
    unlocked.push({ tierLabel: "Mastery (Lvl 8+)", features: sub.mastery });
  }

  return { subclassName: sub.name, unlocked };
}

/**
 * @typedef {Object} SrdBeastform
 * @property {string} id
 * @property {string} name
 * @property {1 | 2 | 3 | 4} tier
 * @property {string} examples
 * @property {"agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"} bonusTrait
 * @property {number} traitBonus
 * @property {number} evasionBonus
 * @property {"agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"} attackTrait
 * @property {string} attackRange
 * @property {number} dieSides
 * @property {number} flatBonus
 * @property {"Physical" | "Magic"} damageType
 * @property {string[]} advantages
 * @property {FeatureEntry[]} features
 */

/** @type {SrdBeastform[]} */
export const SRD_BEASTFORMS = [
  // --- TIER 1 (Level 1+) ---
  {
    id: "agile-scout",
    name: "Agile Scout",
    tier: 1,
    examples: "Fox, Mouse, Weasel",
    bonusTrait: "agility",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 4,
    flatBonus: 0,
    damageType: "Physical",
    advantages: ["deceive", "locate", "sneak"],
    features: [
      {
        name: "Agile",
        text: "Your movement is silent, and you can spend a Hope to move up to Far range without rolling.",
      },
      {
        name: "Fragile",
        text: "When you take Major or greater damage, you drop out of Beastform.",
      },
    ],
  },
  {
    id: "household-friend",
    name: "Household Friend",
    tier: 1,
    examples: "Cat, Dog, Rabbit",
    bonusTrait: "instinct",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "instinct",
    attackRange: "Melee",
    dieSides: 6,
    flatBonus: 0,
    damageType: "Physical",
    advantages: ["climb", "locate", "protect"],
    features: [
      {
        name: "Companion",
        text: "When you Help an Ally, roll a d8 as your advantage die.",
      },
      {
        name: "Fragile",
        text: "When you take Major or greater damage, you drop out of Beastform.",
      },
    ],
  },
  {
    id: "nimble-grazer",
    name: "Nimble Grazer",
    tier: 1,
    examples: "Deer, Gazelle, Goat",
    bonusTrait: "agility",
    traitBonus: 1,
    evasionBonus: 3,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 6,
    flatBonus: 0,
    damageType: "Physical",
    advantages: ["leap", "sneak", "sprint"],
    features: [
      {
        name: "Elusive Prey",
        text: "When an attack roll against you would succeed, mark a Stress and roll a d4 to add to your Evasion against that attack.",
      },
      {
        name: "Fragile",
        text: "When you take Major or greater damage, you drop out of Beastform.",
      },
    ],
  },
  {
    id: "pack-predator",
    name: "Pack Predator",
    tier: 1,
    examples: "Coyote, Hyena, Wolf",
    bonusTrait: "strength",
    traitBonus: 2,
    evasionBonus: 1,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 2,
    damageType: "Physical",
    advantages: ["attack", "sprint", "track"],
    features: [
      {
        name: "Hobbling Strike",
        text: "On a Melee attack hit, mark a Stress to make the target temporarily Vulnerable.",
      },
      {
        name: "Pack Hunting",
        text: "When you hit an adversary immediately after an ally attacked them, add a d8 to your damage roll.",
      },
    ],
  },
  {
    id: "aquatic-scout",
    name: "Aquatic Scout",
    tier: 1,
    examples: "Eel, Fish, Octopus",
    bonusTrait: "agility",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 4,
    flatBonus: 0,
    damageType: "Physical",
    advantages: ["navigate", "sneak", "swim"],
    features: [
      {
        name: "Aquatic",
        text: "You can breathe and move naturally underwater.",
      },
      {
        name: "Fragile",
        text: "When you take Major or greater damage, you drop out of Beastform.",
      },
    ],
  },
  {
    id: "stalking-arachnid",
    name: "Stalking Arachnid",
    tier: 1,
    examples: "Tarantula, Wolf Spider",
    bonusTrait: "finesse",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "finesse",
    attackRange: "Melee",
    dieSides: 6,
    flatBonus: 1,
    damageType: "Physical",
    advantages: ["attack", "climb", "sneak"],
    features: [
      {
        name: "Venomous Bite",
        text: "On a hit, the target becomes temporarily Poisoned (takes 1d10 direct physical damage each time they act).",
      },
      {
        name: "Webslinger",
        text: "Create strong webbing to traverse hazards or temporarily Restrain a target within Close range (Finesse roll).",
      },
    ],
  },

  // --- TIER 2 (Level 2+) ---
  {
    id: "armored-sentry",
    name: "Armored Sentry",
    tier: 2,
    examples: "Armadillo, Pangolin, Turtle",
    bonusTrait: "strength",
    traitBonus: 1,
    evasionBonus: 1,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 4,
    damageType: "Physical",
    advantages: ["dig", "locate", "protect"],
    features: [
      {
        name: "Armored Shell",
        text: "Resistance to physical damage; mark an Armor Slot to retreat into your shell and reduce damage further.",
      },
      {
        name: "Cannonball",
        text: "Mark a Stress to let an ally throw you at a Close target, dealing d12+2 physical damage on a hit.",
      },
    ],
  },
  {
    id: "powerful-beast",
    name: "Powerful Beast",
    tier: 2,
    examples: "Bear, Bull, Moose",
    bonusTrait: "strength",
    traitBonus: 1,
    evasionBonus: 3,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 4,
    damageType: "Physical",
    advantages: ["navigate", "protect", "scare"],
    features: [
      {
        name: "Rampage",
        text: "When you roll a 1 on a damage die, roll a d10 and add it to the total; before attacking, mark a Stress to gain +1 Proficiency.",
      },
      {
        name: "Thick Hide",
        text: "Gain a +2 bonus to your damage thresholds.",
      },
    ],
  },
  {
    id: "mighty-strider",
    name: "Mighty Strider",
    tier: 2,
    examples: "Camel, Horse, Zebra",
    bonusTrait: "agility",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 1,
    damageType: "Physical",
    advantages: ["leap", "navigate", "sprint"],
    features: [
      {
        name: "Carrier",
        text: "Carry up to two willing allies with you when you move.",
      },
      {
        name: "Trample",
        text: "Mark a Stress to move up to Close range in a straight line through foes, dealing d8+1 physical damage and making them temporarily Vulnerable.",
      },
    ],
  },
  {
    id: "striking-serpent",
    name: "Striking Serpent",
    tier: 2,
    examples: "Cobra, Rattlesnake, Viper",
    bonusTrait: "finesse",
    traitBonus: 1,
    evasionBonus: 2,
    attackTrait: "finesse",
    attackRange: "Very Close",
    dieSides: 8,
    flatBonus: 4,
    damageType: "Physical",
    advantages: ["climb", "deceive", "sprint"],
    features: [
      {
        name: "Venomous Strike",
        text: "Attack any number of targets in Very Close range; on a hit, they become temporarily Poisoned (1d10 direct physical damage when they act).",
      },
      {
        name: "Warning Hiss",
        text: "Mark a Stress to force any number of targets in Melee range to move back to Very Close range.",
      },
    ],
  },
  {
    id: "pouncing-predator",
    name: "Pouncing Predator",
    tier: 2,
    examples: "Cheetah, Lion, Panther",
    bonusTrait: "instinct",
    traitBonus: 1,
    evasionBonus: 3,
    attackTrait: "instinct",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 6,
    damageType: "Physical",
    advantages: ["attack", "climb", "sneak"],
    features: [
      {
        name: "Fleet",
        text: "Spend a Hope to move up to Far range without rolling.",
      },
      {
        name: "Takedown",
        text: "Mark a Stress to move into Melee and strike with +2 Proficiency; on a hit, the target marks a Stress.",
      },
    ],
  },
  {
    id: "winged-beast",
    name: "Winged Beast",
    tier: 2,
    examples: "Hawk, Owl, Raven",
    bonusTrait: "finesse",
    traitBonus: 1,
    evasionBonus: 3,
    attackTrait: "finesse",
    attackRange: "Melee",
    dieSides: 4,
    flatBonus: 2,
    damageType: "Physical",
    advantages: ["deceive", "locate", "scare"],
    features: [
      {
        name: "Bird's-Eye View",
        text: "You can fly at will; once per rest while airborne, ask the GM a question about the scene below without rolling.",
      },
      {
        name: "Hollow Bones",
        text: "Gain a -2 penalty to your damage thresholds.",
      },
    ],
  },

  // --- TIER 3 (Level 5+) ---
  {
    id: "great-predator",
    name: "Great Predator",
    tier: 3,
    examples: "Dire Wolf, Velociraptor, Sabertooth Tiger",
    bonusTrait: "strength",
    traitBonus: 2,
    evasionBonus: 2,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 12,
    flatBonus: 8,
    damageType: "Physical",
    advantages: ["attack", "sneak", "sprint"],
    features: [
      {
        name: "Carrier",
        text: "Carry up to two willing allies with you when you move.",
      },
      {
        name: "Vicious Maul",
        text: "On a hit, spend a Hope to make the target temporarily Vulnerable and gain +1 Proficiency on that damage roll.",
      },
    ],
  },
  {
    id: "mighty-lizard",
    name: "Mighty Lizard",
    tier: 3,
    examples: "Alligator, Crocodile, Gila Monster",
    bonusTrait: "instinct",
    traitBonus: 2,
    evasionBonus: 1,
    attackTrait: "instinct",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 7,
    damageType: "Physical",
    advantages: ["attack", "sneak", "track"],
    features: [
      {
        name: "Physical Defense",
        text: "Gain a +3 bonus to your damage thresholds.",
      },
      {
        name: "Snapping Strike",
        text: "On a Melee hit, spend a Hope to clamp down and make the target temporarily Restrained and Vulnerable.",
      },
    ],
  },
  {
    id: "great-winged-beast",
    name: "Great Winged Beast",
    tier: 3,
    examples: "Giant Eagle, Falcon",
    bonusTrait: "finesse",
    traitBonus: 2,
    evasionBonus: 3,
    attackTrait: "finesse",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 6,
    damageType: "Physical",
    advantages: ["deceive", "distract", "locate"],
    features: [
      {
        name: "Bird's-Eye View",
        text: "You can fly at will; once per rest while airborne, ask the GM a question about the scene below without rolling.",
      },
      {
        name: "Carrier",
        text: "Carry up to two willing allies with you while flying.",
      },
    ],
  },
  {
    id: "aquatic-predator",
    name: "Aquatic Predator",
    tier: 3,
    examples: "Dolphin, Orca, Shark",
    bonusTrait: "agility",
    traitBonus: 2,
    evasionBonus: 4,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 6,
    damageType: "Physical",
    advantages: ["attack", "swim", "track"],
    features: [
      {
        name: "Aquatic",
        text: "You can breathe and move naturally underwater.",
      },
      {
        name: "Vicious Maul",
        text: "On a hit, spend a Hope to make the target temporarily Vulnerable and gain +1 Proficiency on that damage roll.",
      },
    ],
  },
  {
    id: "legendary-beast",
    name: "Legendary Beast (Upgraded Tier 1)",
    tier: 3,
    examples: "Evolved Tier 1 Beastform",
    bonusTrait: "agility",
    traitBonus: 2,
    evasionBonus: 2,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 8,
    flatBonus: 6,
    damageType: "Physical",
    advantages: ["Choose Tier 1 form advantages"],
    features: [
      {
        name: "Evolved",
        text: "Pick a Tier 1 Beastform and upgrade it: +6 to damage rolls, +1 to its trait bonus, and +2 to Evasion. Record your chosen base form in Notes below.",
      },
    ],
  },
  {
    id: "legendary-hybrid",
    name: "Legendary Hybrid (Combine Two Tier 1–2)",
    tier: 3,
    examples: "Griffon, Sphinx",
    bonusTrait: "strength",
    traitBonus: 2,
    evasionBonus: 3,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 8,
    damageType: "Physical",
    advantages: ["Pick 4 advantages from chosen forms"],
    features: [
      {
        name: "Hybrid Features",
        text: "Mark 1 extra Stress to transform. Choose two Tier 1–2 Beastforms and gain 4 of their advantages and 2 of their features. Record choices in Notes below.",
      },
    ],
  },

  // --- TIER 4 (Level 8+) ---
  {
    id: "massive-behemoth",
    name: "Massive Behemoth",
    tier: 4,
    examples: "Elephant, Mammoth, Rhinoceros",
    bonusTrait: "strength",
    traitBonus: 3,
    evasionBonus: 1,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 12,
    flatBonus: 12,
    damageType: "Physical",
    advantages: ["locate", "protect", "scare", "sprint"],
    features: [
      {
        name: "Carrier",
        text: "Carry up to four willing allies with you when you move.",
      },
      {
        name: "Demolish",
        text: "Spend a Hope to charge up to Far range through foes, dealing d8+10 physical damage and making them temporarily Vulnerable.",
      },
      {
        name: "Undaunted",
        text: "Gain a +2 bonus to all damage thresholds.",
      },
    ],
  },
  {
    id: "terrible-lizard",
    name: "Terrible Lizard",
    tier: 4,
    examples: "Brachiosaurus, Tyrannosaurus",
    bonusTrait: "strength",
    traitBonus: 3,
    evasionBonus: 2,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 12,
    flatBonus: 10,
    damageType: "Physical",
    advantages: ["attack", "deceive", "scare", "track"],
    features: [
      {
        name: "Devastating Strikes",
        text: "On a Melee hit dealing Severe damage, mark a Stress to force the target to mark an additional Hit Point.",
      },
      {
        name: "Massive Stride",
        text: "Move up to Far range without rolling and ignore rough terrain.",
      },
    ],
  },
  {
    id: "mythic-aerial-hunter",
    name: "Mythic Aerial Hunter",
    tier: 4,
    examples: "Dragon, Giant Owl, Pterodactyl, Roc",
    bonusTrait: "finesse",
    traitBonus: 3,
    evasionBonus: 4,
    attackTrait: "finesse",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 11,
    damageType: "Physical",
    advantages: ["attack", "deceive", "locate", "navigate"],
    features: [
      {
        name: "Carrier",
        text: "Carry up to three willing allies with you while flying.",
      },
      {
        name: "Deadly Raptor",
        text: "Fly at will; move up to Far range in a straight line to reroll any damage dice showing lower than your Proficiency.",
      },
    ],
  },
  {
    id: "epic-aquatic-beast",
    name: "Epic Aquatic Beast",
    tier: 4,
    examples: "Giant Squid, Whale",
    bonusTrait: "agility",
    traitBonus: 3,
    evasionBonus: 3,
    attackTrait: "agility",
    attackRange: "Melee",
    dieSides: 10,
    flatBonus: 10,
    damageType: "Physical",
    advantages: ["locate", "protect", "scare", "track"],
    features: [
      {
        name: "Ocean Master",
        text: "Breathe and move naturally underwater; on a Melee hit, you can temporarily Restrain the target.",
      },
      {
        name: "Unyielding",
        text: "When you would mark an Armor Slot, roll a d6; on a 5+, reduce severity without marking the slot.",
      },
    ],
  },
  {
    id: "mythic-beast",
    name: "Mythic Beast (Upgraded Tier 1–2)",
    tier: 4,
    examples: "Evolved Tier 1 or Tier 2 Beastform",
    bonusTrait: "strength",
    traitBonus: 3,
    evasionBonus: 3,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 12,
    flatBonus: 9,
    damageType: "Physical",
    advantages: ["Choose Tier 1–2 form advantages"],
    features: [
      {
        name: "Evolved",
        text: "Pick a Tier 1 or Tier 2 Beastform and upgrade it: +9 to damage rolls, +2 to its trait bonus, +3 to Evasion, and step up its damage die by one size. Record choices in Notes below.",
      },
    ],
  },
  {
    id: "mythic-hybrid",
    name: "Mythic Hybrid (Combine Three Tier 1–3)",
    tier: 4,
    examples: "Chimera, Cockatrice, Manticore",
    bonusTrait: "strength",
    traitBonus: 3,
    evasionBonus: 2,
    attackTrait: "strength",
    attackRange: "Melee",
    dieSides: 12,
    flatBonus: 10,
    damageType: "Physical",
    advantages: ["Pick 5 advantages from chosen forms"],
    features: [
      {
        name: "Hybrid Features",
        text: "Mark 2 extra Stress to transform. Choose three Tier 1–3 Beastforms and gain 5 of their advantages and 3 of their features. Record choices in Notes below.",
      },
    ],
  },
];

/** @type {Array<{ id: string, name: string, maxPicks: number, text: string }>} */
export const COMPANION_UPGRADES = [
  {
    id: "intelligent",
    name: "Intelligent",
    maxPicks: 3,
    text: "Your companion gains a permanent +1 bonus to a Companion Experience of your choice.",
  },
  {
    id: "light-in-the-dark",
    name: "Light in the Dark",
    maxPicks: 1,
    text: "Use this upgrade as an additional Hope slot for your character.",
  },
  {
    id: "creature-comfort",
    name: "Creature Comfort",
    maxPicks: 1,
    text: "Once per rest, when you take time during a quiet moment to give your companion love and attention, gain a Hope or clear a Stress.",
  },
  {
    id: "armored",
    name: "Armored",
    maxPicks: 1,
    text: "When your companion would mark a Stress, you can mark one of your Armor Slots instead.",
  },
  {
    id: "vicious",
    name: "Vicious",
    maxPicks: 3,
    text: "Increase your companion's damage die or range by one step (d6 → d8 → d10 → d12; Melee → Very Close → Close → Far).",
  },
  {
    id: "resilient",
    name: "Resilient",
    maxPicks: 3,
    text: "Your companion gains an additional Stress slot.",
  },
  {
    id: "bonded",
    name: "Bonded",
    maxPicks: 1,
    text: "When you mark your last Hit Point, your companion rushes to your side: roll d6s equal to their unmarked Stress; if any roll 6, clear 1 HP.",
  },
  {
    id: "aware",
    name: "Aware",
    maxPicks: 3,
    text: "Your companion gains a permanent +2 bonus to their Evasion.",
  },
];

/**
 * Returns the character's Daggerheart Tier (1–4) based on level.
 * @param {number} level
 * @returns {1 | 2 | 3 | 4}
 */
export function getCharacterTier(level) {
  if (level >= 8) return 4;
  if (level >= 5) return 3;
  if (level >= 2) return 2;
  return 1;
}

/** @param {string} formId */
export function getBeastformById(formId) {
  return SRD_BEASTFORMS.find((f) => f.id === formId) ?? SRD_BEASTFORMS[0];
}
