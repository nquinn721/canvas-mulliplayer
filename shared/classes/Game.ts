import { GameState } from "../types/GameState";
import { ProjectileData } from "../weapons/Projectile";
import { Player } from "./Player";
import { World } from "./World";

// Main game class that manages the entire game state
export class Game {
  public players: Map<string, Player>;
  public world: World;
  public projectiles: Map<string, any>; // Projectile instances
  public gameConfig: {
    tickRate: number;
    maxPlayers: number;
    respawnTime: number;
  };

  constructor(
    worldWidth: number = 5000,
    worldHeight: number = 5000,
    wallCount: number = 60
  ) {
    this.players = new Map();
    this.world = new World(worldWidth, worldHeight);
    this.world.generateWalls(wallCount);
    this.projectiles = new Map();
    this.gameConfig = {
      tickRate: 60,
      maxPlayers: 20,
      respawnTime: 3000,
    };
  }

  // Add a new player to the game
  addPlayer(id: string, name: string): Player {
    const spawnPosition = this.world.getRandomSpawnPosition();
    const player = new Player(id, name, spawnPosition.x, spawnPosition.y);
    this.players.set(id, player);
    return player;
  }

  // Remove a player from the game
  removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  // Get a player by ID
  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  // Update player position with world collision checking
  updatePlayerPosition(
    playerId: string,
    deltaX: number,
    deltaY: number
  ): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.updatePosition(
      deltaX,
      deltaY,
      this.world.width,
      this.world.height,
      (x, y, radius) => this.world.checkWallCollision(x, y, radius)
    );
    return true;
  }

  // Update player angle
  updatePlayerAngle(playerId: string, angle: number): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.updateAngle(angle);
    return true;
  }

  // Add a projectile to the game
  addProjectile(id: string, projectile: any): void {
    this.projectiles.set(id, projectile);
  }

  // Remove a projectile from the game
  removeProjectile(id: string): boolean {
    return this.projectiles.delete(id);
  }

  // Update all projectiles and handle collisions
  updateProjectiles(deltaTime: number): {
    hitPlayers: Array<{
      projectileId: string;
      playerId: string;
      damage: number;
    }>;
    expiredProjectiles: string[];
    wallHits: string[];
  } {
    const hitPlayers: Array<{
      projectileId: string;
      playerId: string;
      damage: number;
    }> = [];
    const expiredProjectiles: string[] = [];
    const wallHits: string[] = [];

    this.projectiles.forEach((projectile, id) => {
      // Update projectile position
      projectile.update(deltaTime);

      // Check if projectile is expired
      if (projectile.isExpired()) {
        expiredProjectiles.push(id);
        return;
      }

      // Check wall collisions
      if (this.world.checkWallCollision(projectile.x, projectile.y, 1)) {
        wallHits.push(id);
        expiredProjectiles.push(id);
        return;
      }

      // Check player collisions
      this.players.forEach((player, playerId) => {
        if (
          playerId !== projectile.ownerId &&
          player.containsPoint(projectile.x, projectile.y)
        ) {
          const isDead = player.takeDamage(projectile.damage);
          hitPlayers.push({
            projectileId: id,
            playerId,
            damage: projectile.damage,
          });

          if (isDead) {
            // Respawn player
            const spawnPos = this.world.getRandomSpawnPosition();
            player.x = spawnPos.x;
            player.y = spawnPos.y;
            player.heal(player.maxHealth);
          }

          expiredProjectiles.push(id);
        }
      });
    });

    // Remove expired projectiles
    expiredProjectiles.forEach((id) => this.projectiles.delete(id));

    return { hitPlayers, expiredProjectiles, wallHits };
  }

  // Get current game state for network transmission
  getGameState(): GameState {
    // Serialize players
    const serializedPlayers: { [id: string]: any } = {};
    for (const [id, player] of this.players) {
      serializedPlayers[id] = player.serialize();
    }

    // Serialize projectiles
    const serializedProjectiles: ProjectileData[] = Array.from(
      this.projectiles.values()
    ).map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      angle: Math.atan2(p.velocityY, p.velocityX),
      speed: p.speed,
      damage: p.damage,
      ownerId: p.ownerId,
      type: p.type as "laser" | "missile",
      createdAt: p.createdAt,
    }));

    return {
      players: serializedPlayers,
      aiEnemies: {}, // Empty for now since Game class doesn't handle AI enemies
      projectiles: serializedProjectiles,
      walls: this.world.walls,
      powerUps: {}, // Empty for now since Game class doesn't handle power-ups
    };
  }

  // Get game statistics
  getStats(): {
    playerCount: number;
    projectileCount: number;
    wallCount: number;
    worldSize: { width: number; height: number };
  } {
    return {
      playerCount: this.players.size,
      projectileCount: this.projectiles.size,
      wallCount: this.world.walls.length,
      worldSize: { width: this.world.width, height: this.world.height },
    };
  }

  // Reset the game
  reset(): void {
    this.players.clear();
    this.projectiles.clear();
    this.world.generateWalls();
  }
}
