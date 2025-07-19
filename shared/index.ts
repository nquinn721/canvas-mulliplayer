// Main shared exports - use these for clean imports

// Core types
export type { GameState, MeteorData, StarData } from "./types/GameState";

// Classes with their interfaces
export { AIEnemy } from "./classes/AIEnemy";
export { Camera } from "./classes/Camera";
export { Game } from "./classes/Game";
export { Meteor } from "./classes/Meteor";
export { Player } from "./classes/Player";
export type { KeyState } from "./classes/Player";
export { PowerUp, PowerUpType } from "./classes/PowerUp";
export { Star } from "./classes/Star";
export { World } from "./classes/World";
export type { Wall } from "./classes/World";

// Weapon classes with projectile interface
export { Laser } from "./weapons/Laser";
export { Missile } from "./weapons/Missile";
export { Projectile } from "./weapons/Projectile";
export type { ProjectileData } from "./weapons/Projectile";
