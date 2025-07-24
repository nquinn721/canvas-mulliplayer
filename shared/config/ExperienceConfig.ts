/**
 * Experience and leveling configuration settings
 * All XP rewards and level progression can be tweaked here
 */

export interface CombatRewards {
  playerKill: number;
  aiEnemyKill: number;
  swarmEnemyKill: number; // XP for killing swarm enemies
  playerAssist: number; // For future implementation
  aiEnemyAssist: number; // For future implementation
}

export interface SurvivalRewards {
  timeAliveBonus: number; // XP per minute alive
  damageTakenPenalty: number; // XP lost per damage taken (optional)
}

export interface LevelProgression {
  baseExperienceRequired: number; // XP needed for level 2
  experienceMultiplier: number; // Multiplier increase per level
  maxLevel: number; // Maximum achievable level (0 = unlimited)
  experienceFormula: "linear" | "exponential" | "custom";
}

export interface ExperienceConfig {
  combat: CombatRewards;
  survival: SurvivalRewards;
  progression: LevelProgression;
}

export const EXPERIENCE_CONFIG: ExperienceConfig = {
  combat: {
    playerKill: 50, // 50 XP for killing a real player
    aiEnemyKill: 20, // 20 XP for killing an AI enemy
    swarmEnemyKill: 10, // 10 XP for killing a swarm enemy (weaker but numerous)
    playerAssist: 15, // 15 XP for assisting in player kill (future feature)
    aiEnemyAssist: 5, // 5 XP for assisting in AI kill (future feature)
  },

  survival: {
    timeAliveBonus: 10, // 10 XP per minute alive (future feature)
    damageTakenPenalty: 0, // No penalty for taking damage (set to > 0 to enable)
  },

  progression: {
    baseExperienceRequired: 100, // Level 1 → 2 requires 100 XP
    experienceMultiplier: 1.5, // Each level requires 50% more XP than previous
    maxLevel: 50, // Maximum level 50 (set to 0 for unlimited)
    experienceFormula: "exponential", // Options: "linear", "exponential", "custom"
    // "linear": Even progression (100, 200, 300, 400...)
    // "exponential": Increasing difficulty (100, 250, 475, 812...)
    // "custom": Slower start, then accelerates (100, 130, 180, 250...)
  },
};

/**
 * Calculate the total XP required to reach a specific level
 * @param targetLevel The level to calculate XP for (level 1 = 0 XP)
 * @returns Total XP required to reach the target level
 */
export function getExperienceRequiredForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;

  const config = EXPERIENCE_CONFIG.progression;
  let totalXP = 0;

  switch (config.experienceFormula) {
    case "linear":
      // Linear: Level 2 = 100, Level 3 = 200, Level 4 = 300, etc.
      totalXP = (targetLevel - 1) * config.baseExperienceRequired;
      break;

    case "exponential":
      // Exponential: Level 2 = 100, Level 3 = 250, Level 4 = 475, etc.
      for (let level = 2; level <= targetLevel; level++) {
        const xpForThisLevel = Math.floor(
          config.baseExperienceRequired *
            Math.pow(config.experienceMultiplier, level - 2)
        );
        totalXP += xpForThisLevel;
      }
      break;

    case "custom":
      // Custom formula - can be modified for specific progression curves
      for (let level = 2; level <= targetLevel; level++) {
        // Custom: Slower growth initially, then accelerates
        const levelFactor = Math.pow(level - 1, 1.3);
        const xpForThisLevel = Math.floor(
          config.baseExperienceRequired * levelFactor
        );
        totalXP += xpForThisLevel;
      }
      break;

    default:
      totalXP = (targetLevel - 1) * config.baseExperienceRequired;
  }

  return totalXP;
}

/**
 * Calculate XP required for the next level from current level
 * @param currentLevel The player's current level
 * @returns XP needed to reach the next level
 */
export function getExperienceRequiredForNextLevel(
  currentLevel: number
): number {
  return (
    getExperienceRequiredForLevel(currentLevel + 1) -
    getExperienceRequiredForLevel(currentLevel)
  );
}

/**
 * Calculate what level a player should be based on their total XP
 * @param totalExperience The player's total accumulated XP
 * @returns The level the player should be at
 */
export function calculateLevelFromExperience(totalExperience: number): number {
  if (totalExperience < 0) return 1;

  const config = EXPERIENCE_CONFIG.progression;
  let level = 1;
  let xpNeeded = 0;

  // Find the highest level where total XP requirement is <= player's XP
  while (level < (config.maxLevel || 999)) {
    const nextLevelXP = getExperienceRequiredForLevel(level + 1);
    if (totalExperience >= nextLevelXP) {
      level++;
    } else {
      break;
    }
  }

  return level;
}

/**
 * Get level progression information for display
 * @param currentLevel Player's current level
 * @param currentExperience Player's total XP
 * @returns Object with progression details
 */
export function getLevelProgressionInfo(
  currentLevel: number,
  currentExperience: number
) {
  const currentLevelXP = getExperienceRequiredForLevel(currentLevel);
  const nextLevelXP = getExperienceRequiredForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentExperience - currentLevelXP;
  const xpNeededForCurrentLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min(
    100,
    (xpInCurrentLevel / xpNeededForCurrentLevel) * 100
  );

  return {
    currentLevel,
    currentExperience,
    currentLevelXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForCurrentLevel,
    xpToNextLevel: xpNeededForCurrentLevel - xpInCurrentLevel,
    progressPercentage,
    isMaxLevel: currentLevel >= (EXPERIENCE_CONFIG.progression.maxLevel || 999),
  };
}

/**
 * Validation function to ensure experience config is valid
 */
export function validateExperienceConfig(): boolean {
  const config = EXPERIENCE_CONFIG;

  if (config.progression.baseExperienceRequired <= 0) {
    console.warn("Base experience required must be positive");
    return false;
  }

  if (config.progression.experienceMultiplier <= 0) {
    console.warn("Experience multiplier must be positive");
    return false;
  }

  if (config.combat.playerKill < 0 || config.combat.aiEnemyKill < 0) {
    console.warn("Combat rewards cannot be negative");
    return false;
  }

  return true;
}

// Export commonly used values for convenience
export const XP_REWARDS = EXPERIENCE_CONFIG.combat;
export const LEVEL_PROGRESSION = EXPERIENCE_CONFIG.progression;

// Helper function to get XP reward for different actions
export function getXPReward(action: keyof CombatRewards): number {
  return EXPERIENCE_CONFIG.combat[action];
}

// Level progression examples for documentation
export function generateLevelChart(maxLevel: number = 10): void {
  console.log("Level Progression Chart:");
  console.log("Level | Total XP | XP for Level | XP to Next");
  console.log("------|----------|--------------|------------");

  for (let level = 1; level <= maxLevel; level++) {
    const totalXP = getExperienceRequiredForLevel(level);
    const xpForLevel =
      level === 1 ? 0 : getExperienceRequiredForNextLevel(level - 1);
    const xpToNext =
      level < maxLevel ? getExperienceRequiredForNextLevel(level) : 0;

    console.log(
      `  ${level.toString().padStart(2)}  |  ${totalXP.toString().padStart(6)}  |  ${xpForLevel.toString().padStart(10)}  |  ${xpToNext.toString().padStart(10)}`
    );
  }
}
