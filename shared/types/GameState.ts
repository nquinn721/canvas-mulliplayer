import { Wall } from "../classes/World";
import { ProjectileData } from "../weapons/Projectile";

// Game state interface for network transmission
export interface GameState {
  players: { [id: string]: any }; // Serialized Player objects
  aiEnemies: { [id: string]: any }; // Serialized AIEnemy objects
  projectiles: ProjectileData[];
  walls: Wall[];
  powerUps: { [id: string]: any }; // Serialized PowerUp objects
}
