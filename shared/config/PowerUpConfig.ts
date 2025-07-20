/**
 * Power-up configuration settings
 * All power-up related numbers can be tweaked here
 */

export interface LaserUpgradeConfig {
  baseSpeed: number;
  baseDamage: number;
  baseDistance: number;
  baseFireRate: number;
  speedMultiplierPerLevel: number;
  damageMultiplierPerLevel: number;
  distanceMultiplierPerLevel: number;
  fireRateMultiplierPerLevel: number;
  maxLevel: number;
  experienceReward: number;
}

export interface MissileUpgradeConfig {
  baseSpeed: number;
  baseDamage: number;
  baseDistance: number;
  baseTrackingRange: number;
  baseTurnRate: number;
  speedMultiplierPerLevel: number;
  damageMultiplierPerLevel: number;
  distanceMultiplierPerLevel: number;
  trackingRangeMultiplierPerLevel: number;
  turnRateMultiplierPerLevel: number;
  dualShotLevel: number;
  tripleShotLevel: number;
  maxLevel: number;
  experienceReward: number;
}

export interface FlashUpgradeConfig {
  baseCooldown: number;
  baseCharges: number;
  baseDistance: number;
  cooldownReductionPerLevel: number;
  chargeIncreasePerLevel: number;
  distanceIncreasePerLevel: number;
  maxLevel: number;
  experienceReward: number;
}

export interface BoostUpgradeConfig {
  baseMultiplier: number;
  speedBonusPerLevel: number;
  baseDrainRate: number;
  baseRegenRate: number;
  drainReductionPerLevel: number;
  regenMultiplierPerLevel: number;
  energyRefillPercentage: number;
  maxLevel: number;
  durationMs: number; // Set to 0 for permanent upgrade, >0 for temporary
  experienceReward: number;
}

export interface HealthPickupConfig {
  healAmount: number;
  experienceReward: number;
}

export interface ShieldPickupConfig {
  shieldAmount: number;
  durationMs: number; // Duration the shield lasts (always temporary)
  experienceReward: number;
}

export interface PowerUpSpawningConfig {
  spawnIntervalMs: number;
  maxPowerUpsOnMap: number;
  despawnTimeMs: number;
  spawnChances: {
    laserUpgrade: number;
    missileUpgrade: number;
    flashUpgrade: number;
    boostUpgrade: number;
    healthPickup: number;
    shieldPickup: number;
  };
}

export const POWER_UP_CONFIG = {
  laserUpgrade: {
    baseSpeed: 800,
    baseDamage: 25,
    baseDistance: 1000,
    baseFireRate: 120, // milliseconds between shots
    speedMultiplierPerLevel: 0.1, // 10% increase per level
    damageMultiplierPerLevel: 0.15, // 15% increase per level
    distanceMultiplierPerLevel: 0.15, // 15% increase per level
    fireRateMultiplierPerLevel: 0.2, // 20% faster (lower cooldown) per level
    maxLevel: 5,
    experienceReward: 10,
  } as LaserUpgradeConfig,

  missileUpgrade: {
    baseSpeed: 400,
    baseDamage: 50, // Reduced from 75
    baseDistance: 1200,
    baseTrackingRange: 300,
    baseTurnRate: 3,
    speedMultiplierPerLevel: 0.1, // 10% increase per level
    damageMultiplierPerLevel: 0.15, // 15% increase per level
    distanceMultiplierPerLevel: 0.15, // 15% increase per level
    trackingRangeMultiplierPerLevel: 0.1, // 10% increase per level
    turnRateMultiplierPerLevel: 0.2, // 20% increase per level
    dualShotLevel: 3, // Level 3+ fires 2 missiles
    tripleShotLevel: 5, // Level 5 fires 3 missiles
    maxLevel: 5,
    experienceReward: 10,
  } as MissileUpgradeConfig,

  flashUpgrade: {
    baseCooldown: 10000, // 10 seconds
    baseCharges: 3,
    baseDistance: 200,
    cooldownReductionPerLevel: 0.15, // 15% faster cooldown per level
    chargeIncreasePerLevel: 1, // +1 charge per level
    distanceIncreasePerLevel: 0.2, // 20% more distance per level
    maxLevel: 5,
    experienceReward: 10,
  } as FlashUpgradeConfig,

  boostUpgrade: {
    baseMultiplier: 2.5,
    speedBonusPerLevel: 0.5, // Each level adds 0.5x more speed
    baseDrainRate: 35, // Energy units per second
    baseRegenRate: 55, // Energy units per second when not boosting
    drainReductionPerLevel: 0.3, // 30% less drain per level
    regenMultiplierPerLevel: 0.5, // 50% faster regen per level
    energyRefillPercentage: 1.0, // 100% energy refill
    maxLevel: 4,
    durationMs: 0, // 0 = permanent upgrade (no expiration)
    experienceReward: 10,
  } as BoostUpgradeConfig,

  healthPickup: {
    healAmount: 50, // Amount of health to restore
    experienceReward: 5,
  } as HealthPickupConfig,

  shieldPickup: {
    shieldAmount: 75, // Shield points
    durationMs: 30000, // 30 seconds
    experienceReward: 5,
  } as ShieldPickupConfig,

  spawning: {
    spawnIntervalMs: 15000, // Spawn a power-up every 15 seconds
    maxPowerUpsOnMap: 8, // Maximum power-ups on map at once
    despawnTimeMs: 60000, // Power-ups despawn after 1 minute if not collected
    spawnChances: {
      laserUpgrade: 0.2, // 20%
      missileUpgrade: 0.2, // 20%
      flashUpgrade: 0.15, // 15%
      boostUpgrade: 0.15, // 15%
      healthPickup: 0.2, // 20%
      shieldPickup: 0.1, // 10%
    },
  } as PowerUpSpawningConfig,
};

// Validation function to ensure spawn chances add up to 1.0
export function validatePowerUpConfig(): boolean {
  const chances = POWER_UP_CONFIG.spawning.spawnChances;
  const total = Object.values(chances).reduce((sum, chance) => sum + chance, 0);
  const tolerance = 0.001; // Allow small floating point errors

  if (Math.abs(total - 1.0) > tolerance) {
    console.warn(`Power-up spawn chances sum to ${total}, should be 1.0`);
    return false;
  }

  return true;
}

// Helper function to get calculated stats for a given level
export function getLaserStats(level: number) {
  const config = POWER_UP_CONFIG.laserUpgrade;
  if (level <= 1) {
    return {
      speed: config.baseSpeed,
      damage: config.baseDamage,
      distance: config.baseDistance,
      fireRate: config.baseFireRate,
    };
  }

  const levelAboveBase = level - 1;
  return {
    speed: Math.floor(
      config.baseSpeed * (1 + levelAboveBase * config.speedMultiplierPerLevel)
    ),
    damage: Math.floor(
      config.baseDamage * (1 + levelAboveBase * config.damageMultiplierPerLevel)
    ),
    distance: Math.floor(
      config.baseDistance *
        (1 + levelAboveBase * config.distanceMultiplierPerLevel)
    ),
    fireRate: Math.floor(
      config.baseFireRate /
        (1 + levelAboveBase * config.fireRateMultiplierPerLevel)
    ),
  };
}

export function getMissileStats(level: number) {
  const config = POWER_UP_CONFIG.missileUpgrade;

  // Determine missile count
  let missileCount = 1;
  if (level >= config.tripleShotLevel) {
    missileCount = 3;
  } else if (level >= config.dualShotLevel) {
    missileCount = 2;
  }

  if (level <= 1) {
    return {
      speed: config.baseSpeed,
      damage: config.baseDamage,
      distance: config.baseDistance,
      trackingRange: config.baseTrackingRange,
      turnRate: config.baseTurnRate,
      missileCount,
      dualShot: level >= config.dualShotLevel,
    };
  }

  const levelAboveBase = level - 1;
  return {
    speed: Math.floor(
      config.baseSpeed * (1 + levelAboveBase * config.speedMultiplierPerLevel)
    ),
    damage: Math.floor(
      config.baseDamage * (1 + levelAboveBase * config.damageMultiplierPerLevel)
    ),
    distance: Math.floor(
      config.baseDistance *
        (1 + levelAboveBase * config.distanceMultiplierPerLevel)
    ),
    trackingRange: Math.floor(
      config.baseTrackingRange *
        (1 + levelAboveBase * config.trackingRangeMultiplierPerLevel)
    ),
    turnRate:
      config.baseTurnRate *
      (1 + levelAboveBase * config.turnRateMultiplierPerLevel),
    missileCount,
    dualShot: level >= config.dualShotLevel,
  };
}

export function getFlashStats(level: number) {
  const config = POWER_UP_CONFIG.flashUpgrade;
  if (level <= 1) {
    return {
      cooldown: config.baseCooldown,
      charges: config.baseCharges,
      distance: config.baseDistance,
    };
  }

  const levelAboveBase = level - 1;
  return {
    cooldown: Math.floor(
      config.baseCooldown /
        (1 + levelAboveBase * config.cooldownReductionPerLevel)
    ),
    charges:
      config.baseCharges + levelAboveBase * config.chargeIncreasePerLevel,
    distance: Math.floor(
      config.baseDistance *
        (1 + levelAboveBase * config.distanceIncreasePerLevel)
    ),
  };
}

export function getBoostStats(level: number) {
  const config = POWER_UP_CONFIG.boostUpgrade;
  const speedMultiplier =
    config.baseMultiplier + level * config.speedBonusPerLevel;
  const drainReduction = 1 + level * config.drainReductionPerLevel;
  const regenMultiplier = 1 + level * config.regenMultiplierPerLevel;

  return {
    speedMultiplier,
    drainRate: config.baseDrainRate / (regenMultiplier * drainReduction),
    regenRate: config.baseRegenRate * regenMultiplier,
    energyRefillPercentage: config.energyRefillPercentage,
    durationMs: config.durationMs,
  };
}
