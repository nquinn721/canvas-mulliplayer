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
    speed: 120, // Increased from 50 - much faster base speed
    rushSpeed: 180, // Increased from 65 - 50% faster when rushing
    damage: 3,
    detectionRange: 500, // Reduced from 800 - closer detection for more aggressive behavior
    attackRange: 65, // Increased from 45 - much larger attack range
    separationRadius: 35,
    cohesionRadius: 120,
    alignmentRadius: 100,
    maxAcceleration: 0.8, // Increased from 0.25 - much faster acceleration
    huntingForce: 1.2, // Increased from 0.6 - stronger hunting force
    rushHuntingForce: 1.8, // Increased from 0.9 - much stronger rush force
    separationForce: 0.4,
    cohesionForce: 0.15,
    alignmentForce: 0.1,
    rushTriggerDistance: 80, // Increased from 50 - easier to trigger rush
    rushDuration: 1500,
    attackCooldown: 150, // Reduced from 400 - extremely fast attacks
    radius: 8,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 2,
    groupSpread: 50,
  },
  MEDIUM: {
    health: 5,
    speed: 140, // Increased from 70 - much faster base speed
    rushSpeed: 210, // Increased from 90 - 50% faster when rushing
    damage: 5,
    detectionRange: 600, // Reduced from 800 - closer detection for more aggressive behavior
    attackRange: 75, // Increased from 50 - much larger attack range
    separationRadius: 30,
    cohesionRadius: 100,
    alignmentRadius: 80,
    maxAcceleration: 0.8, // Increased from 0.3 - much faster acceleration
    huntingForce: 1.2, // Increased from 0.7 - stronger hunting force
    rushHuntingForce: 1.8, // Increased from 1.1 - much stronger rush force
    separationForce: 0.35,
    cohesionForce: 0.12,
    alignmentForce: 0.08,
    rushTriggerDistance: 70, // Increased from 45 - easier to trigger rush
    rushDuration: 2000,
    attackCooldown: 120, // Reduced from 350 - extremely fast attacks
    radius: 9,
    spawnDistance: {
      min: 200,
      max: 400,
    },
    groupSize: 3,
    groupSpread: 60,
  },
  HARD: {
    health: 7,
    speed: 160, // Increased from 80 - much faster base speed
    rushSpeed: 240, // Increased from 105 - 50% faster when rushing
    damage: 7,
    detectionRange: 700, // Reduced from 900 - closer detection for more aggressive behavior
    attackRange: 85, // Increased from 55 - much larger attack range
    separationRadius: 25,
    cohesionRadius: 90,
    alignmentRadius: 70,
    maxAcceleration: 0.8, // Increased from 0.35 - much faster acceleration
    huntingForce: 1.2, // Increased from 0.8 - stronger hunting force
    rushHuntingForce: 1.8, // Increased from 1.3 - much stronger rush force
    separationForce: 0.3,
    cohesionForce: 0.1,
    alignmentForce: 0.07,
    rushTriggerDistance: 60, // Increased from 40 - easier to trigger rush
    rushDuration: 2500,
    attackCooldown: 100, // Reduced from 300 - extremely fast attacks
    radius: 10,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 4,
    groupSpread: 70,
  },
  EXPERT: {
    health: 10,
    speed: 180, // Increased from 90 - much faster base speed
    rushSpeed: 270, // Increased from 115 - 50% faster when rushing
    damage: 10,
    detectionRange: 800, // Reduced from 1000 - closer detection for more aggressive behavior
    attackRange: 95, // Increased from 60 - much larger attack range
    separationRadius: 20,
    cohesionRadius: 80,
    alignmentRadius: 60,
    maxAcceleration: 0.8, // Increased from 0.4 - much faster acceleration
    huntingForce: 1.2, // Increased from 0.85 - stronger hunting force
    rushHuntingForce: 1.8, // Increased from 1.4 - much stronger rush force
    separationForce: 0.25,
    cohesionForce: 0.08,
    alignmentForce: 0.05,
    rushTriggerDistance: 50, // Increased from 35 - easier to trigger rush
    rushDuration: 3000,
    attackCooldown: 80, // Reduced from 250 - extremely fast attacks
    radius: 11,
    spawnDistance: {
      min: 200,
      max: 450,
    },
    groupSize: 5,
    groupSpread: 80,
  },
  NIGHTMARE: {
    health: 15,
    speed: 200, // Increased from 100 - much faster base speed
    rushSpeed: 300, // Increased from 130 - 50% faster when rushing
    damage: 15,
    detectionRange: 900, // Reduced from 1200 - closer detection for more aggressive behavior
    attackRange: 105, // Increased from 65 - much larger attack range
    separationRadius: 18,
    cohesionRadius: 70,
    alignmentRadius: 50,
    maxAcceleration: 0.8, // Increased from 0.45 - much faster acceleration
    huntingForce: 1.2, // Increased from 0.9 - stronger hunting force
    rushHuntingForce: 1.8, // Increased from 1.5 - much stronger rush force
    separationForce: 0.2,
    cohesionForce: 0.06,
    alignmentForce: 0.04,
    rushTriggerDistance: 45, // Increased from 30 - easier to trigger rush
    rushDuration: 3500,
    attackCooldown: 60, // Reduced from 200 - extremely fast attacks
    radius: 12,
    spawnDistance: {
      min: 200,
      max: 500,
    },
    groupSize: 6,
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
