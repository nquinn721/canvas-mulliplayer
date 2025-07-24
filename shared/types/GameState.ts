import { DestructibleWallData } from "../classes/DestructibleWall";
import { EnvironmentalObstacleData } from "../classes/EnvironmentalObstacle";
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
  swarmEnemies: { [id: string]: any }; // Serialized SwarmAI objects
  swarmBases?: { [id: string]: any }; // Serialized SwarmBase objects (optional for backward compatibility)
  projectiles: ProjectileData[];
  meteors: MeteorData[];
  walls: Wall[];
  destructibleWalls?: { [id: string]: DestructibleWallData }; // Optional for backward compatibility
  environmentalObstacles?: { [id: string]: EnvironmentalObstacleData }; // Optional for backward compatibility
  powerUps: { [id: string]: any }; // Serialized PowerUp objects
}
