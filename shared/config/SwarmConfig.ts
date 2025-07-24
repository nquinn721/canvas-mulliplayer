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
    speed: 60, // Reduced from 120 - much slower and less aggressive
    rushSpeed: 90, // Reduced from 180 - slower rush speed
    damage: 1, // Reduced from 3 - much less damage
    detectionRange: 400, // Reduced from 500 - shorter detection range
    attackRange: 45, // Reduced from 65 - smaller attack range
    separationRadius: 35,
    cohesionRadius: 120,
    alignmentRadius: 100,
    maxAcceleration: 0.4, // Reduced from 0.8 - slower acceleration
    huntingForce: 0.6, // Reduced from 1.2 - weaker hunting force
    rushHuntingForce: 0.9, // Reduced from 1.8 - weaker rush force
    separationForce: 0.4,
    cohesionForce: 0.15,
    alignmentForce: 0.1,
    rushTriggerDistance: 60, // Reduced from 80 - harder to trigger rush
    rushDuration: 1500,
    attackCooldown: 600, // Increased from 150 - much slower attacks
    radius: 8,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 1, // Reduced from 2 - smaller groups
    groupSpread: 50,
  },
  MEDIUM: {
    health: 5,
    speed: 80, // Reduced from 140 - slower base speed
    rushSpeed: 120, // Reduced from 210 - slower rush speed
    damage: 2, // Reduced from 5 - much less damage
    detectionRange: 450, // Reduced from 600 - shorter detection range
    attackRange: 50, // Reduced from 75 - smaller attack range
    separationRadius: 30,
    cohesionRadius: 100,
    alignmentRadius: 80,
    maxAcceleration: 0.5, // Reduced from 0.8 - slower acceleration
    huntingForce: 0.7, // Reduced from 1.2 - weaker hunting force
    rushHuntingForce: 1.1, // Reduced from 1.8 - weaker rush force
    separationForce: 0.35,
    cohesionForce: 0.12,
    alignmentForce: 0.08,
    rushTriggerDistance: 50, // Reduced from 70 - harder to trigger rush
    rushDuration: 2000,
    attackCooldown: 500, // Increased from 120 - much slower attacks
    radius: 9,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 2, // Reduced from 3 - smaller groups
    groupSpread: 60,
  },
  HARD: {
    health: 7,
    speed: 100, // Reduced from 160 - slower base speed
    rushSpeed: 150, // Reduced from 240 - slower rush speed
    damage: 3, // Reduced from 7 - much less damage
    detectionRange: 500, // Reduced from 700 - shorter detection range
    attackRange: 55, // Reduced from 85 - smaller attack range
    separationRadius: 25,
    cohesionRadius: 90,
    alignmentRadius: 70,
    maxAcceleration: 0.6, // Reduced from 0.8 - slower acceleration
    huntingForce: 0.8, // Reduced from 1.2 - weaker hunting force
    rushHuntingForce: 1.3, // Reduced from 1.8 - weaker rush force
    separationForce: 0.3,
    cohesionForce: 0.1,
    alignmentForce: 0.07,
    rushTriggerDistance: 40, // Reduced from 60 - harder to trigger rush
    rushDuration: 2500,
    attackCooldown: 400, // Increased from 100 - much slower attacks
    radius: 10,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 3, // Reduced from 4 - smaller groups
    groupSpread: 70,
  },
  EXPERT: {
    health: 10,
    speed: 120, // Reduced from 180 - slower base speed
    rushSpeed: 180, // Reduced from 270 - slower rush speed
    damage: 4, // Reduced from 10 - much less damage
    detectionRange: 550, // Reduced from 800 - shorter detection range
    attackRange: 60, // Reduced from 95 - smaller attack range
    separationRadius: 20,
    cohesionRadius: 80,
    alignmentRadius: 60,
    maxAcceleration: 0.7, // Reduced from 0.8 - slower acceleration
    huntingForce: 0.85, // Reduced from 1.2 - weaker hunting force
    rushHuntingForce: 1.4, // Reduced from 1.8 - weaker rush force
    separationForce: 0.25,
    cohesionForce: 0.08,
    alignmentForce: 0.05,
    rushTriggerDistance: 35, // Reduced from 50 - harder to trigger rush
    rushDuration: 3000,
    attackCooldown: 300, // Increased from 80 - much slower attacks
    radius: 11,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 4, // Reduced from 5 - smaller groups
    groupSpread: 80,
  },
  NIGHTMARE: {
    health: 15,
    speed: 140, // Reduced from 200 - slower base speed
    rushSpeed: 210, // Reduced from 300 - slower rush speed
    damage: 5, // Reduced from 15 - much less damage
    detectionRange: 600, // Reduced from 900 - shorter detection range
    attackRange: 65, // Reduced from 105 - smaller attack range
    separationRadius: 18,
    cohesionRadius: 70,
    alignmentRadius: 50,
    maxAcceleration: 0.8, // Same as before - keep some challenge
    huntingForce: 0.9, // Reduced from 1.2 - weaker hunting force
    rushHuntingForce: 1.5, // Reduced from 1.8 - weaker rush force
    separationForce: 0.2,
    cohesionForce: 0.06,
    alignmentForce: 0.04,
    rushTriggerDistance: 30, // Reduced from 45 - harder to trigger rush
    rushDuration: 3500,
    attackCooldown: 200, // Increased from 60 - much slower attacks
    radius: 12,
    spawnDistance: {
      min: 200,
      max: 500,
    },
    groupSize: 5, // Reduced from 6 - smaller groups
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
