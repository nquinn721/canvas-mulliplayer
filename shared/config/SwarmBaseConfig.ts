/**
 * Configuration for Swarm Base structures
 * These are stationary defensive structures that spawn swarms
 */

export interface SwarmBaseConfig {
  health: number;
  maxHealth: number;
  radius: number; // Visual size and collision radius
  patrolRadius: number; // Area where spawned swarms patrol
  spawnInterval: number; // Time between spawns in milliseconds
  spawnDistance: {
    min: number; // Minimum distance from base center to spawn swarms
    max: number; // Maximum distance from base center to spawn swarms
  };
  maxSpawnedSwarms: number; // Maximum number of swarms a base can have active
  spawnCooldownAfterDamage: number; // Extra delay after taking damage
  xpReward: number; // XP given when base is destroyed
  minDistanceFromWalls: number; // Minimum distance from walls when spawning
  minDistanceFromOtherBases: number; // Minimum distance between bases
}

export const SWARM_BASE_CONFIGS = {
  DEFAULT: {
    health: 100,
    maxHealth: 100,
    radius: 25,
    patrolRadius: 300,
    spawnInterval: 10000, // 10 seconds
    spawnDistance: {
      min: 30,
      max: 50,
    },
    maxSpawnedSwarms: 20, // Limit swarms per base to prevent overwhelming
    spawnCooldownAfterDamage: 3000, // 3 second delay after taking damage
    xpReward: 60, // 3x normal swarm kill XP
    minDistanceFromWalls: 50,
    minDistanceFromOtherBases: 200,
  },
};

export type SwarmBaseType = keyof typeof SWARM_BASE_CONFIGS;

export function getSwarmBaseConfig(
  type: SwarmBaseType = "DEFAULT"
): SwarmBaseConfig {
  return SWARM_BASE_CONFIGS[type] || SWARM_BASE_CONFIGS.DEFAULT;
}

/**
 * Difficulty-based base configuration selector
 * Uses the same DEFAULT base type for all difficulties
 */
export function getSwarmBaseConfigForDifficulty(
  difficulty: string
): SwarmBaseConfig {
  // All difficulties use the same base type now
  return getSwarmBaseConfig("DEFAULT");
}

/**
 * Get base spawn configuration for the entire map
 */
export interface SwarmBaseSpawnConfig {
  baseCount: number;
  spawnAttempts: number; // Max attempts to find valid position
  distributionStrategy: "random" | "corners" | "perimeter" | "clustered";
}

export const SWARM_BASE_SPAWN_CONFIGS = {
  EASY: {
    baseCount: 3,
    spawnAttempts: 15,
    distributionStrategy: "random" as const,
  },
  MEDIUM: {
    baseCount: 5,
    spawnAttempts: 20,
    distributionStrategy: "random" as const,
  },
  HARD: {
    baseCount: 7,
    spawnAttempts: 25,
    distributionStrategy: "perimeter" as const,
  },
  EXPERT: {
    baseCount: 8,
    spawnAttempts: 30,
    distributionStrategy: "clustered" as const,
  },
  NIGHTMARE: {
    baseCount: 10,
    spawnAttempts: 35,
    distributionStrategy: "perimeter" as const,
  },
};

export function getSwarmBaseSpawnConfig(
  difficulty: string
): SwarmBaseSpawnConfig {
  const normalizedDifficulty = difficulty.toUpperCase();
  return (
    SWARM_BASE_SPAWN_CONFIGS[
      normalizedDifficulty as keyof typeof SWARM_BASE_SPAWN_CONFIGS
    ] || SWARM_BASE_SPAWN_CONFIGS.MEDIUM
  );
}
