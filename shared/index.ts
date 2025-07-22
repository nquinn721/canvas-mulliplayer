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
export { World } from "./classes/World";
export type { Wall } from "./classes/World";

// Utilities
export { PathfindingUtils } from "./utils/PathfindingUtils";

// Weapon classes with projectile interface
export { Laser } from "./weapons/Laser";
export { Missile } from "./weapons/Missile";
export { Projectile } from "./weapons/Projectile";
export type { ProjectileData } from "./weapons/Projectile";

// Configuration files
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
