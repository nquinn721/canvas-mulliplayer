/**
 * Scoring system configuration
 * All scoring-related numbers and rules can be tweaked here
 */

export interface ScoreMultipliers {
  kill: number;
  assist: number;
  survival: number; // Points per second survived
  powerUpCollection: number;
  enemyDestroyed: number;
  meteorDestroyed: number;
  headshot: number;
  multiKill: number;
  streak: number;
  firstBlood: number;
  lastManStanding: number;
  victory: number;
  perfectGame: number; // No deaths
  damageTaken: number; // Negative multiplier
  death: number; // Negative multiplier
  hit: number; // Base points per hit
  consecutiveHit: number; // Bonus per consecutive hit
}

export interface TimeBasedMultipliers {
  rapidKillWindow: number; // Time window in milliseconds for rapid kills
  rapidKillMultiplier: number; // Multiplier for kills within time window
  hitStreakWindow: number; // Time window to maintain hit streak
  hitStreakMultiplier: number; // Multiplier per hit in streak
  comboDuration: number; // Max time for combo to last
  comboDecayRate: number; // How fast combo decays
  // Survival progression bonuses
  survivalBonusInterval: number; // How often survival bonus increases
  survivalBonusMultiplier: number; // How much survival bonus increases
  maxSurvivalMultiplier: number; // Maximum survival multiplier cap
}

export interface StreakBonuses {
  doubleKill: number;
  tripleKill: number;
  multiKill: number;
  ultraKill: number;
  rampage: number;
  unstoppable: number;
  godlike: number;
}

export interface LevelProgressionConfig {
  baseExperience: number;
  experienceMultiplier: number;
  maxLevel: number;
  experiencePerLevel: (level: number) => number;
}

export interface LeaderboardConfig {
  maxEntriesPerCategory: number;
  updateIntervalMinutes: number;
  retentionDays: {
    daily: number;
    weekly: number;
    monthly: number;
    seasonal: number;
    allTime: number; // -1 for permanent
  };
  rankingUpdateBatchSize: number;
  minimumGamesForRanking: number;
}

export interface SeasonConfig {
  durationDays: number;
  seasonalBonusMultiplier: number;
  seasonEndRewards: {
    top1: number;
    top5: number;
    top10: number;
    top50: number;
    top100: number;
    participation: number;
  };
}

export interface ScoringConfig {
  multipliers: ScoreMultipliers;
  timeBasedMultipliers: TimeBasedMultipliers;
  streakBonuses: StreakBonuses;
  levelProgression: LevelProgressionConfig;
  leaderboard: LeaderboardConfig;
  season: SeasonConfig;
}

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  multipliers: {
    kill: 100,
    assist: 50,
    survival: 5, // 5 points per second (increased from 1)
    powerUpCollection: 25,
    enemyDestroyed: 75,
    meteorDestroyed: 10,
    headshot: 150, // Bonus for precision
    multiKill: 50, // Bonus per additional kill in multi-kill
    streak: 25, // Bonus per kill in streak
    firstBlood: 200, // First kill of the match
    lastManStanding: 500, // Survive when all others are eliminated
    victory: 1000, // Win the match
    perfectGame: 2000, // Win without dying
    damageTaken: -0.1, // Small penalty per damage point taken
    death: -50, // Penalty for dying
    hit: 10, // Base points per hit
    consecutiveHit: 5, // Bonus per consecutive hit
  },

  timeBasedMultipliers: {
    rapidKillWindow: 5000, // 5 seconds window for rapid kills
    rapidKillMultiplier: 1.5, // 1.5x multiplier for rapid kills
    hitStreakWindow: 3000, // 3 seconds to maintain hit streak
    hitStreakMultiplier: 1.2, // 1.2x multiplier per hit in streak
    comboDuration: 10000, // 10 seconds max combo duration
    comboDecayRate: 0.1, // 10% decay per second
    // Survival bonus scaling
    survivalBonusInterval: 30000, // Every 30 seconds
    survivalBonusMultiplier: 1.1, // 10% increase every interval
    maxSurvivalMultiplier: 3.0, // Cap at 3x survival points
  },

  streakBonuses: {
    doubleKill: 100,
    tripleKill: 200,
    multiKill: 300,
    ultraKill: 500,
    rampage: 750,
    unstoppable: 1000,
    godlike: 1500,
  },

  levelProgression: {
    baseExperience: 1000,
    experienceMultiplier: 1.2,
    maxLevel: 100,
    experiencePerLevel: (level: number) => {
      return Math.floor(1000 * Math.pow(1.2, level - 1));
    },
  },

  leaderboard: {
    maxEntriesPerCategory: 1000,
    updateIntervalMinutes: 5,
    retentionDays: {
      daily: 7,
      weekly: 30,
      monthly: 365,
      seasonal: 730, // 2 years
      allTime: -1, // Permanent
    },
    rankingUpdateBatchSize: 100,
    minimumGamesForRanking: 5,
  },

  season: {
    durationDays: 90, // 3 months per season
    seasonalBonusMultiplier: 1.5,
    seasonEndRewards: {
      top1: 10000,
      top5: 5000,
      top10: 2500,
      top50: 1000,
      top100: 500,
      participation: 100,
    },
  },
};

// Helper functions for score calculation
export class ScoringUtils {
  static calculateKillScore(
    config: ScoringConfig,
    isHeadshot: boolean = false,
    streakCount: number = 0,
    isFirstBlood: boolean = false
  ): number {
    let score = config.multipliers.kill;

    if (isHeadshot) {
      score += config.multipliers.headshot;
    }

    if (isFirstBlood) {
      score += config.multipliers.firstBlood;
    }

    if (streakCount > 1) {
      score += config.multipliers.streak * (streakCount - 1);
    }

    return score;
  }

  static calculateStreakBonus(
    config: ScoringConfig,
    killCount: number
  ): number {
    if (killCount >= 7) return config.streakBonuses.godlike;
    if (killCount >= 6) return config.streakBonuses.unstoppable;
    if (killCount >= 5) return config.streakBonuses.rampage;
    if (killCount >= 4) return config.streakBonuses.ultraKill;
    if (killCount >= 3) return config.streakBonuses.multiKill;
    if (killCount >= 2) return config.streakBonuses.tripleKill;
    if (killCount >= 1) return config.streakBonuses.doubleKill;
    return 0;
  }

  static calculateSurvivalScore(
    config: ScoringConfig,
    survivalTimeMs: number
  ): number {
    const survivalTimeSeconds = Math.floor(survivalTimeMs / 1000);
    return survivalTimeSeconds * config.multipliers.survival;
  }

  static calculateExperienceForLevel(
    config: ScoringConfig,
    targetLevel: number
  ): number {
    let totalExperience = 0;
    for (let level = 1; level < targetLevel; level++) {
      totalExperience += config.levelProgression.experiencePerLevel(level);
    }
    return totalExperience;
  }

  static getLevelFromExperience(
    config: ScoringConfig,
    experience: number
  ): number {
    let level = 1;
    let requiredExperience = 0;

    while (
      level < config.levelProgression.maxLevel &&
      experience >= requiredExperience
    ) {
      requiredExperience += config.levelProgression.experiencePerLevel(level);
      if (experience >= requiredExperience) {
        level++;
      }
    }

    return level;
  }

  static getExperienceForNextLevel(
    config: ScoringConfig,
    currentLevel: number,
    currentExperience: number
  ): number {
    if (currentLevel >= config.levelProgression.maxLevel) {
      return 0; // Max level reached
    }

    const experienceForCurrentLevel = this.calculateExperienceForLevel(
      config,
      currentLevel
    );
    const experienceForNextLevel = this.calculateExperienceForLevel(
      config,
      currentLevel + 1
    );

    return experienceForNextLevel - currentExperience;
  }

  static calculateHitScore(
    config: ScoringConfig,
    consecutiveHits: number = 0,
    hitStreakMultiplier: number = 1.0
  ): number {
    let score = config.multipliers.hit;

    // Add consecutive hit bonus
    if (consecutiveHits > 1) {
      score += config.multipliers.consecutiveHit * (consecutiveHits - 1);
    }

    // Apply hit streak multiplier
    score = Math.floor(score * hitStreakMultiplier);

    return score;
  }

  static calculateRapidKillMultiplier(
    config: ScoringConfig,
    killTimes: number[],
    currentTime: number
  ): number {
    const rapidKillWindow = config.timeBasedMultipliers.rapidKillWindow;
    const recentKills = killTimes.filter(
      (time) => currentTime - time <= rapidKillWindow
    );

    if (recentKills.length >= 2) {
      return config.timeBasedMultipliers.rapidKillMultiplier;
    }

    return 1.0;
  }

  static calculateComboMultiplier(
    config: ScoringConfig,
    comboStartTime: number,
    currentTime: number,
    actionCount: number
  ): number {
    const elapsed = currentTime - comboStartTime;
    const maxDuration = config.timeBasedMultipliers.comboDuration;

    if (elapsed > maxDuration) {
      return 1.0; // Combo expired
    }

    // Calculate decay
    const decayRate = config.timeBasedMultipliers.comboDecayRate;
    const timeRatio = elapsed / maxDuration;
    const decay = 1.0 - timeRatio * decayRate;

    // Base multiplier increases with action count
    const baseMultiplier = 1.0 + actionCount * 0.1;

    return Math.max(1.0, baseMultiplier * decay);
  }

  static updateHitStreak(
    config: ScoringConfig,
    lastHitTime: number,
    currentTime: number,
    currentStreak: number
  ): { streak: number; multiplier: number } {
    const hitStreakWindow = config.timeBasedMultipliers.hitStreakWindow;
    const timeSinceLastHit = currentTime - lastHitTime;

    if (timeSinceLastHit <= hitStreakWindow) {
      // Maintain or increase streak
      const newStreak = currentStreak + 1;
      const multiplier = Math.pow(
        config.timeBasedMultipliers.hitStreakMultiplier,
        Math.min(newStreak - 1, 5) // Cap at 5x multiplier
      );
      return { streak: newStreak, multiplier };
    } else {
      // Reset streak
      return { streak: 1, multiplier: 1.0 };
    }
  }

  static calculateProgressiveSurvivalScore(
    config: ScoringConfig,
    survivalTimeMs: number
  ): { score: number; multiplier: number } {
    const survivalTimeSeconds = Math.floor(survivalTimeMs / 1000);
    const baseSurvival = config.multipliers.survival;

    // Calculate how many bonus intervals have passed
    const bonusIntervals = Math.floor(
      survivalTimeMs / config.timeBasedMultipliers.survivalBonusInterval
    );

    // Calculate progressive multiplier
    let multiplier = 1.0;
    for (let i = 0; i < bonusIntervals; i++) {
      multiplier *= config.timeBasedMultipliers.survivalBonusMultiplier;
    }

    // Cap the multiplier
    multiplier = Math.min(
      multiplier,
      config.timeBasedMultipliers.maxSurvivalMultiplier
    );

    // Calculate score with progressive bonus
    const progressiveScore = Math.floor(
      baseSurvival * multiplier * survivalTimeSeconds
    );

    return { score: progressiveScore, multiplier };
  }

  static getSurvivalBonusText(
    survivalTimeMs: number,
    config: ScoringConfig
  ): string {
    const bonusIntervals = Math.floor(
      survivalTimeMs / config.timeBasedMultipliers.survivalBonusInterval
    );
    if (bonusIntervals === 0) return "";

    const multiplier = Math.min(
      Math.pow(
        config.timeBasedMultipliers.survivalBonusMultiplier,
        bonusIntervals
      ),
      config.timeBasedMultipliers.maxSurvivalMultiplier
    );

    return `Survival Bonus: ${multiplier.toFixed(1)}x`;
  }
}

// Export the configuration
export const SCORING_CONFIG = DEFAULT_SCORING_CONFIG;
