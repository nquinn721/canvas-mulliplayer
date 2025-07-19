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

// Star data interface for network transmission
export interface StarData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  explosionRadius: number;
  createdAt: number;
  lifespan: number;
  isExploding: boolean;
  explosionStartTime: number;
  explosionDuration: number;
  twinklePhase: number;
  brightness: number;
}

// Game state interface for network transmission
export interface GameState {
  players: { [id: string]: any }; // Serialized Player objects
  aiEnemies: { [id: string]: any }; // Serialized AIEnemy objects
  projectiles: ProjectileData[];
  meteors: MeteorData[];
  stars: StarData[];
  walls: Wall[];
  powerUps: { [id: string]: any }; // Serialized PowerUp objects
}
