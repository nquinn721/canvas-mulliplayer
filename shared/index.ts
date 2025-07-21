// Main shared exports - use these for clean imports

// Core types
export type { GameState, MeteorData, StarData } from "./types/GameState";

// Classes with their interfaces
export { Camera } from "./classes/Camera";
export { EnhancedAIEnemy } from "./classes/EnhancedAIEnemy";
export { Meteor } from "./classes/Meteor";
export { Player } from "./classes/Player";
export type { KeyState } from "./classes/Player";
export { PowerUp, PowerUpType } from "./classes/PowerUp";
export { Star } from "./classes/Star";
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
export { POWER_UP_CONFIG } from "./config/PowerUpConfig";
export { 
  EXPERIENCE_CONFIG, 
  XP_REWARDS, 
  LEVEL_PROGRESSION,
  getExperienceRequiredForLevel,
  getExperienceRequiredForNextLevel,
  calculateLevelFromExperience,
  getLevelProgressionInfo,
  getXPReward
} from "./config/ExperienceConfig";
