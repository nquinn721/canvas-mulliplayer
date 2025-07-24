// Main shared exports - use these for clean imports

// Core types
export type { GameState, MeteorData } from "./types/GameState";

// Classes with their interfaces
export { Camera } from "./classes/Camera";
export { EnhancedAIEnemy } from "./classes/EnhancedAIEnemy";
export { Meteor } from "./classes/Meteor";
export { Player } from "./classes/Player";
export type { KeyState } from "./classes/Player";
export { PowerUp, PowerUpType } from "./classes/PowerUp";
export { SwarmAI } from "./classes/SwarmAI";
export { SwarmBase } from "./classes/SwarmBase";
export { World } from "./classes/World";
export type { ExtendedWall, Wall } from "./classes/World";

// Destructible environment classes
export {
  DestructibleWall,
  WALL_TYPE_CONFIGS,
  WallType,
} from "./classes/DestructibleWall";
export type {
  DestructibleWallData,
  WallParticle,
  WallTypeConfig,
} from "./classes/DestructibleWall";
export {
  EnvironmentalObstacle,
  OBSTACLE_TYPE_CONFIGS,
  ObstacleType,
} from "./classes/EnvironmentalObstacle";
export type {
  EnvironmentalObstacleData,
  ObstacleTypeConfig,
} from "./classes/EnvironmentalObstacle";

// Utilities
export { PathfindingUtils } from "./utils/PathfindingUtils";

// Weapon classes with projectile interface
export { Laser } from "./weapons/Laser";
export { Missile } from "./weapons/Missile";
export { Projectile } from "./weapons/Projectile";
export type { ProjectileData } from "./weapons/Projectile";

// Configuration files
export {
  AUDIO_CONFIG,
  calculateExplosionDamage,
  calculateWeaponDamage,
  EXPLOSION_CONFIG,
  GAMEPLAY_CONFIG,
  getSpawnConfiguration,
  PARTICLE_CONFIG,
  shouldTriggerChainReaction,
  SPAWN_CONFIGURATIONS,
  STRATEGIC_CONFIG,
  VISUAL_EFFECTS_CONFIG,
  WEAPON_DAMAGE_MULTIPLIERS,
} from "./config/DestructibleEnvironmentConfig";
export type {
  AudioConfig,
  ExplosionConfig,
  GameplayConfig,
  ParticleConfig,
  SpawnRateConfig,
  StrategicConfig,
  VisualEffectsConfig,
  WeaponDamageConfig,
} from "./config/DestructibleEnvironmentConfig";
export {
  calculateLevelFromExperience,
  EXPERIENCE_CONFIG,
  getExperienceRequiredForLevel,
  getExperienceRequiredForNextLevel,
  getLevelProgressionInfo,
  getXPReward,
  LEVEL_PROGRESSION,
  XP_REWARDS,
} from "./config/ExperienceConfig";
export { POWER_UP_CONFIG } from "./config/PowerUpConfig";
export {
  SCORING_CONFIG,
  ScoringUtils,
  type ScoreMultipliers,
  type ScoringConfig,
  type StreakBonuses,
  type TimeBasedMultipliers,
} from "./config/ScoringConfig";
export {
  getSwarmConfig,
  getSwarmDifficultyIndicator,
  SWARM_CONFIGS,
  type SwarmDifficultyConfig,
} from "./config/SwarmConfig";
