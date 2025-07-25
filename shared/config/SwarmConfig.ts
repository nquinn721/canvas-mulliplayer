/**
 * Configuration for Swarm AI enemies
 * These are small, fast, aggressive enemies that hunt in packs
 */

export interface SwarmDifficultyConfig {
  health: number;
  speed: number;
  rushSpeed: number;
  damage: number;
  detectionRange: number;
  attackRange: number;
  separationRadius: number;
  cohesionRadius: number;
  alignmentRadius: number;
  maxAcceleration: number;
  huntingForce: number;
  rushHuntingForce: number;
  separationForce: number;
  cohesionForce: number;
  alignmentForce: number;
  rushTriggerDistance: number;
  rushDuration: number;
  attackCooldown: number;
  radius: number;
  spawnDistance: {
    min: number;
    max: number;
  };
  groupSize: number;
  groupSpread: number;
}

export const SWARM_CONFIGS: Record<string, SwarmDifficultyConfig> = {
  EASY: {
    health: 3,
    speed: 90, // Increased from 60 - faster chase speed
    rushSpeed: 140, // Increased from 90 - faster rush speed
    damage: 1, // Keep low damage for easy mode
    detectionRange: 800, // Set to 800px for aggressive chasing
    attackRange: 70, // Increased from 45 - longer attack range
    separationRadius: 35,
    cohesionRadius: 120,
    alignmentRadius: 100,
    maxAcceleration: 0.6, // Increased from 0.4 - better acceleration
    huntingForce: 0.8, // Increased from 0.6 - stronger hunting
    rushHuntingForce: 1.2, // Increased from 0.9 - stronger rush
    separationForce: 0.4,
    cohesionForce: 0.15,
    alignmentForce: 0.1,
    rushTriggerDistance: 800, // Increased from 60 - easier to trigger rush
    rushDuration: 1500,
    attackCooldown: 500, // Reduced from 600 - faster attacks
    radius: 8,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 1, // Keep small groups for easy mode
    groupSpread: 50,
  },
  MEDIUM: {
    health: 5,
    speed: 120, // Increased from 80 - faster chase speed
    rushSpeed: 180, // Increased from 120 - faster rush speed
    damage: 2, // Keep moderate damage
    detectionRange: 800, // Set to 800px for aggressive chasing
    attackRange: 80, // Increased from 50 - longer attack range
    separationRadius: 30,
    cohesionRadius: 100,
    alignmentRadius: 80,
    maxAcceleration: 0.7, // Increased from 0.5 - better acceleration
    huntingForce: 1.0, // Increased from 0.7 - stronger hunting
    rushHuntingForce: 1.5, // Increased from 1.1 - stronger rush
    separationForce: 0.35,
    cohesionForce: 0.12,
    alignmentForce: 0.08,
    rushTriggerDistance: 800, // Increased from 50 - easier to trigger rush
    rushDuration: 2000,
    attackCooldown: 400, // Reduced from 500 - faster attacks
    radius: 9,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 2,
    groupSpread: 60,
  },
  HARD: {
    health: 7,
    speed: 150, // Increased from 100 - faster chase speed
    rushSpeed: 220, // Increased from 150 - faster rush speed
    damage: 3,
    detectionRange: 800, // Set to 800px for aggressive chasing
    attackRange: 90, // Increased from 55 - longer attack range
    separationRadius: 25,
    cohesionRadius: 90,
    alignmentRadius: 70,
    maxAcceleration: 0.8, // Increased from 0.6 - better acceleration
    huntingForce: 1.1, // Increased from 0.8 - stronger hunting
    rushHuntingForce: 1.7, // Increased from 1.3 - stronger rush
    separationForce: 0.3,
    cohesionForce: 0.1,
    alignmentForce: 0.07,
    rushTriggerDistance: 800, // Increased from 40 - easier to trigger rush
    rushDuration: 2500,
    attackCooldown: 300, // Reduced from 400 - faster attacks
    radius: 10,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 3,
    groupSpread: 70,
  },
  EXPERT: {
    health: 10,
    speed: 170, // Increased from 120 - faster chase speed
    rushSpeed: 250, // Increased from 180 - faster rush speed
    damage: 4,
    detectionRange: 800, // Set to 800px for aggressive chasing
    attackRange: 100, // Increased from 60 - longer attack range
    separationRadius: 20,
    cohesionRadius: 80,
    alignmentRadius: 60,
    maxAcceleration: 0.9, // Increased from 0.7 - better acceleration
    huntingForce: 1.2, // Increased from 0.85 - stronger hunting
    rushHuntingForce: 1.8, // Increased from 1.4 - stronger rush
    separationForce: 0.25,
    cohesionForce: 0.08,
    alignmentForce: 0.05,
    rushTriggerDistance: 800, // Increased from 35 - easier to trigger rush
    rushDuration: 3000,
    attackCooldown: 250, // Reduced from 300 - faster attacks
    radius: 11,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 4,
    groupSpread: 80,
  },
  NIGHTMARE: {
    health: 15,
    speed: 190, // Increased from 140 - faster chase speed
    rushSpeed: 280, // Increased from 210 - faster rush speed
    damage: 5,
    detectionRange: 800, // Set to 800px for aggressive chasing
    attackRange: 110, // Increased from 65 - longer attack range
    separationRadius: 18,
    cohesionRadius: 70,
    alignmentRadius: 50,
    maxAcceleration: 1.0, // Increased from 0.8 - better acceleration
    huntingForce: 1.3, // Increased from 0.9 - stronger hunting force
    rushHuntingForce: 2.0, // Increased from 1.5 - stronger rush force
    separationForce: 0.2,
    cohesionForce: 0.06,
    alignmentForce: 0.04,
    rushTriggerDistance: 800, // Rush immediately when detecting player
    rushDuration: 3500,
    attackCooldown: 150, // Reduced from 200 - faster attacks
    radius: 12,
    spawnDistance: {
      min: 200,
      max: 500,
    },
    groupSize: 5,
    groupSpread: 90,
  },
};

export function getSwarmConfig(difficulty: string): SwarmDifficultyConfig {
  const normalizedDifficulty = difficulty.toUpperCase();
  return SWARM_CONFIGS[normalizedDifficulty] || SWARM_CONFIGS.MEDIUM;
}

export function getSwarmDifficultyIndicator(difficulty: string): string {
  switch (difficulty.toUpperCase()) {
    case "EASY":
      return "Swarm-E";
    case "MEDIUM":
      return "Swarm-M";
    case "HARD":
      return "Swarm-H";
    case "EXPERT":
      return "Swarm-X";
    case "NIGHTMARE":
      return "Swarm-N";
    default:
      return "Swarm-M";
  }
}
