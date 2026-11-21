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
    top: { name: "Purposeful Design", text: "Choose one Experience tied to your built purpose and gain a permanent +1 to it." },
    bottom: { name: "Efficient", text: "During a Short Rest, you may choose one Long Rest downtime move instead." },
  },
  Drakona: {
    top: { name: "Scales", text: "When you would take Severe damage, mark 1 Stress to mark 1 fewer Hit Point." },
    bottom: { name: "Elemental Breath", text: "Use your chosen element as an Instinct weapon within Very Close range dealing d8 magic damage." },
  },
  Dwarf: {
    top: { name: "Thick Skin", text: "When taking Minor damage, roll 2d6; if either rolls 6, mark 1 Stress instead of 1 HP." },
    bottom: { name: "Increased Fortitude", text: "Spend 3 Hope to halve incoming physical damage." },
  },
  Elf: {
    top: { name: "Quick Reactions", text: "Mark 1 Stress to gain advantage on a reaction roll." },
    bottom: { name: "Celestial Trance", text: "During a rest, enter a trance to choose an extra downtime move." },
  },
  Faerie: {
    top: { name: "Luckbender", text: "Once per session, spend 3 Hope to reroll the Duality Dice for yourself or a Close ally." },
    bottom: { name: "Wings", text: "You can fly; while flying, mark 1 Stress after being targeted to gain +2 Evasion against the attack." },
  },
  Faun: {
    top: { name: "Caprine Leap", text: "Leap anywhere within Close range as normal movement across obstacles or gaps." },
    bottom: { name: "Kick", text: "After a Melee hit, mark 1 Stress for +2d6 damage and knock yourself or the target back to Very Close." },
  },
  Firbolg: {
    top: { name: "Charge", text: "When you succeed on an Agility roll to move from Far/Very Far into Melee, mark 1 Stress to deal 1d12 physical damage to foes in Melee." },
    bottom: { name: "Unshakable", text: "When you would mark 1 Stress, roll a d6; on a 6, don't mark it." },
  },
  Fungril: {
    top: { name: "Fungril Network", text: "Make an Instinct roll (12) to communicate across any distance through the mycelial network." },
    bottom: { name: "Death Connection", text: "Touch a recent corpse and mark 1 Stress to extract one memory from its final moments." },
  },
  Galapa: {
    top: { name: "Shell", text: "Gain a bonus to your damage thresholds equal to your Proficiency." },
    bottom: { name: "Retract", text: "Mark 1 Stress to pull into your shell: resistance to physical damage, disadvantage on actions, cannot move." },
  },
  Giant: {
    top: { name: "Endurance", text: "Gain +1 Hit Point slot at character creation." },
    bottom: { name: "Reach", text: "Treat any weapon, spell, or feature with Melee range as Very Close instead." },
  },
  Goblin: {
    top: { name: "Surefooted", text: "Ignore disadvantage on Agility rolls." },
    bottom: { name: "Danger Sense", text: "Once per rest, mark 1 Stress to force an adversary to reroll an attack against you or a Very Close ally." },
  },
  Halfling: {
    top: { name: "Luckbringer", text: "At the start of each session, everyone in your party gains 1 Hope." },
    bottom: { name: "Internal Compass", text: "Whenever you roll a 1 on your Hope Die, reroll it." },
  },
  Human: {
    top: { name: "High Stamina", text: "Gain +1 Stress slot at character creation." },
    bottom: { name: "Adaptability", text: "When you fail a roll using one of your Experiences, mark 1 Stress to reroll it." },
  },
  Infernis: {
    top: { name: "Fearless", text: "When you roll with Fear, mark 2 Stress to change it into a roll with Hope instead." },
    bottom: { name: "Dread Visage", text: "Gain advantage on rolls to intimidate hostile creatures." },
  },
  Katari: {
    top: { name: "Feline Instincts", text: "When making an Agility roll, spend 2 Hope to reroll your Hope Die." },
    bottom: { name: "Retracting Claws", text: "Make an Agility attack in Melee; on a hit, the target becomes temporarily Vulnerable." },
  },
  Orc: {
    top: { name: "Sturdy", text: "While you have only 1 unmarked Hit Point remaining, attacks against you have disadvantage." },
    bottom: { name: "Tusks", text: "After a Melee weapon hit, spend 1 Hope to gore the target for +1d6 extra damage." },
  },
  Ribbet: {
    top: { name: "Amphibious", text: "Breathe and move naturally underwater as easily as on land." },
    bottom: { name: "Long Tongue", text: "Grab objects within Close range, or mark 1 Stress to use your tongue as a Finesse Close weapon (d12 physical)." },
  },
  Simiah: {
    top: { name: "Natural Climber", text: "Gain advantage on Agility rolls involving balancing and climbing." },
    bottom: { name: "Nimble", text: "Gain a permanent +1 bonus to your Evasion." },
  },
};

/** @type {Record<string, CommunityData>} */
export const SRD_COMMUNITIES = {
  Highborne: {
    feature: { name: "Privilege", text: "Gain advantage on rolls to consort with nobles, negotiate prices, or leverage status." },
  },
  Loreborne: {
    feature: { name: "Well-Read", text: "Gain advantage on rolls involving history, culture, or politics of a prominent place or person." },
  },
  Orderborne: {
    feature: { name: "Dedicated", text: "Record three sayings/values; once per rest, roll a d20 as your Hope Die when acting on one." },
  },
  Ridgeborne: {
    feature: { name: "Steady", text: "Gain advantage on rolls to traverse cliffs, survive harsh environments, and recall mountain survival." },
  },
  Seaborne: {
    feature: { name: "Know the Tide", text: "Gain tokens when you roll with Fear (up to your Level); spend them for +1 each on a roll." },
  },
  Slyborne: {
    feature: { name: "Scoundrel", text: "Gain advantage on rolls to negotiate with criminals, detect lies, or find a safe place to hide." },
  },
  Underborne: {
    feature: { name: "Low-Light Living", text: "In dim light or shadow, gain advantage on rolls to hide, investigate, or perceive details." },
  },
  Wanderborne: {
    feature: { name: "Nomadic Pack", text: "Once per session, spend 1 Hope to pull a useful mundane item from your well-traveled pack." },
  },
  Wildborne: {
    feature: { name: "Lightfoot", text: "Move silently without effort; gain advantage on rolls to move unseen or unheard." },
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
  const unlocked = [{ tierLabel: "Foundation (Lvl 1+)", features: sub.foundation }];

  if (level >= 5) {
    unlocked.push({ tierLabel: "Specialization (Lvl 5+)", features: sub.specialization });
  }
  if (level >= 8) {
    unlocked.push({ tierLabel: "Mastery (Lvl 8+)", features: sub.mastery });
  }

  return { subclassName: sub.name, unlocked };
}