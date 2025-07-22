import { Wall } from "../classes/World";
import { ProjectileData } from "../weapons/Projectile";

// Meteor data interface for network transmission
export interface MeteorData {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  damage: number;
  radius: number;
  rotation: number;
  createdAt: number;
}

// Game state interface for network transmission
export interface GameState {
  players: { [id: string]: any }; // Serialized Player objects
  aiEnemies: { [id: string]: any }; // Serialized AIEnemy objects
  projectiles: ProjectileData[];
  meteors: MeteorData[];
  walls: Wall[];
  powerUps: { [id: string]: any }; // Serialized PowerUp objects
}
