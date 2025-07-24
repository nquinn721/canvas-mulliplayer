/**
 * Configuration for destructible environment system
 * This file controls damage values, spawn rates, and explosion effects
 */

// Damage multipliers for different weapon types against walls
export interface WeaponDamageConfig {
  laser: number; // Basic laser damage multiplier
  missile: number; // Missile damage multiplier
  explosion: number; // Explosion damage from explosive obstacles
}

// Configuration for different weapon effectiveness against destructible objects
export const WEAPON_DAMAGE_MULTIPLIERS: Record<string, WeaponDamageConfig> = {
  // Destructible walls - moderate damage from all sources
  destructible_wall: {
    laser: 0.8, // Lasers do 80% damage to walls
    missile: 1.5, // Missiles are more effective against walls
    explosion: 2.0, // Explosions do double damage to walls
  },

  // Environmental obstacles - varied effectiveness
  environmental_obstacle: {
    laser: 1.0, // Normal laser damage
    missile: 1.2, // Slightly more effective missiles
    explosion: 1.8, // High explosion damage
  },
};

// Spawn rate configuration for world generation
export interface SpawnRateConfig {
  regularWalls: number;
  destructibleWalls: number;
  environmentalObstacles: number;
}

// Different spawn configurations for various game modes
export const SPAWN_CONFIGURATIONS: Record<string, SpawnRateConfig> = {
  // Standard game mode - balanced mix
  standard: {
    regularWalls: 40,
    destructibleWalls: 15,
    environmentalObstacles: 10,
  },

  // Destruction mode - more destructible objects
  destruction: {
    regularWalls: 20,
    destructibleWalls: 25,
    environmentalObstacles: 20,
  },

  // Fortress mode - more regular walls for defense
  fortress: {
    regularWalls: 60,
    destructibleWalls: 10,
    environmentalObstacles: 5,
  },

  // Chaos mode - mostly destructible and explosive
  chaos: {
    regularWalls: 10,
    destructibleWalls: 30,
    environmentalObstacles: 25,
  },
};

// Particle system configuration
export interface ParticleConfig {
  maxParticlesPerObject: number;
  particleLifetime: number; // milliseconds
  particleSpeed: number;
  gravityStrength: number;
  airResistance: number;
}

export const PARTICLE_CONFIG: ParticleConfig = {
  maxParticlesPerObject: 50,
  particleLifetime: 3000, // 3 seconds
  particleSpeed: 200, // pixels per second
  gravityStrength: 50, // downward acceleration
  airResistance: 0.98, // velocity multiplier per frame
};

// Explosion configuration
export interface ExplosionConfig {
  baseRadius: number;
  baseDamage: number;
  damageDropoff: number; // How much damage decreases with distance
  chainReactionChance: number; // Probability of triggering nearby explosions
  screenShakeIntensity: number;
  particleMultiplier: number;
}

export const EXPLOSION_CONFIG: ExplosionConfig = {
  baseRadius: 100,
  baseDamage: 40,
  damageDropoff: 0.6, // Damage = baseDamage * (1 - distance/radius) * damageDropoff
  chainReactionChance: 0.3, // 30% chance to trigger nearby explosives
  screenShakeIntensity: 15,
  particleMultiplier: 2.0, // 2x normal particles for explosions
};

// Audio configuration for destructible environment
export interface AudioConfig {
  wallHitVolume: number;
  wallDestroyVolume: number;
  explosionVolume: number;
  particleVolume: number;
}

export const AUDIO_CONFIG: AudioConfig = {
  wallHitVolume: 0.4,
  wallDestroyVolume: 0.7,
  explosionVolume: 0.8,
  particleVolume: 0.2,
};

// Visual effects configuration
export interface VisualEffectsConfig {
  damageColorTransition: number; // How quickly color changes with damage (0-1)
  healthBarThreshold: number; // Show health bar when below this percentage
  criticalDamageThreshold: number; // Consider "critically damaged" below this
  animationSpeed: number; // Multiplier for rotation/pulsing animations
  screenShakeEnabled: boolean;
  particleTrailsEnabled: boolean;
}

export const VISUAL_EFFECTS_CONFIG: VisualEffectsConfig = {
  damageColorTransition: 0.8,
  healthBarThreshold: 0.9, // Show health bar when below 90%
  criticalDamageThreshold: 0.3, // Critical damage below 30%
  animationSpeed: 1.0,
  screenShakeEnabled: true,
  particleTrailsEnabled: true,
};

// Gameplay balance configuration
export interface GameplayConfig {
  destructionRewardsXP: boolean;
  xpRewardMultiplier: number;
  wallDestructionScore: number;
  obstacleDestructionScore: number;
  explosionChainBonusMultiplier: number;
  respawnDestructibleWalls: boolean;
  respawnDelay: number; // milliseconds
}

export const GAMEPLAY_CONFIG: GameplayConfig = {
  destructionRewardsXP: true,
  xpRewardMultiplier: 0.5, // 50% XP for environmental destruction
  wallDestructionScore: 10,
  obstacleDestructionScore: 25,
  explosionChainBonusMultiplier: 1.5, // 1.5x score for chain explosions
  respawnDestructibleWalls: false, // Don't respawn destroyed walls (permanent changes)
  respawnDelay: 60000, // 1 minute respawn delay if enabled
};

// Strategic configuration - affects AI behavior and player tactics
export interface StrategicConfig {
  aiAvoidExplosiveObjects: boolean;
  aiTargetDestructibleCover: boolean;
  playerCanUseCoverTactics: boolean;
  destructionAffectsPathfinding: boolean;
}

export const STRATEGIC_CONFIG: StrategicConfig = {
  aiAvoidExplosiveObjects: true, // AI tries to avoid explosive obstacles when low health
  aiTargetDestructibleCover: true, // AI will try to destroy player cover
  playerCanUseCoverTactics: true, // Players can use destructible objects as temporary cover
  destructionAffectsPathfinding: true, // Update pathfinding when objects are destroyed
};

/**
 * Get spawn configuration based on game mode
 */
export function getSpawnConfiguration(
  gameMode: string = "standard"
): SpawnRateConfig {
  return SPAWN_CONFIGURATIONS[gameMode] || SPAWN_CONFIGURATIONS.standard;
}

/**
 * Calculate weapon damage against destructible object
 */
export function calculateWeaponDamage(
  baseDamage: number,
  weaponType: "laser" | "missile" | "explosion",
  targetType: "destructible_wall" | "environmental_obstacle"
): number {
  const multiplier = WEAPON_DAMAGE_MULTIPLIERS[targetType]?.[weaponType] || 1.0;
  return Math.round(baseDamage * multiplier);
}

/**
 * Calculate explosion damage based on distance
 */
export function calculateExplosionDamage(
  distance: number,
  explosionRadius: number,
  baseDamage: number
): number {
  if (distance >= explosionRadius) return 0;

  const distanceRatio = distance / explosionRadius;
  const damageRatio = (1 - distanceRatio) * EXPLOSION_CONFIG.damageDropoff;

  return Math.round(baseDamage * damageRatio);
}

/**
 * Check if explosion should trigger chain reaction
 */
export function shouldTriggerChainReaction(): boolean {
  return Math.random() < EXPLOSION_CONFIG.chainReactionChance;
}
