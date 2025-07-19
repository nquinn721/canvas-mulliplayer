import { GameState } from "../types/GameState";
import { ProjectileData } from "../weapons/Projectile";
import { Meteor } from "./Meteor";
import { Player } from "./Player";
import { Star } from "./Star";
import { World } from "./World";

// Main game class that manages the entire game state
export class Game {
  public players: Map<string, Player>;
  public world: World;
  public projectiles: Map<string, any>; // Projectile instances
  public meteors: Map<string, Meteor>; // Meteor instances
  public stars: Map<string, Star>; // Star instances
  public lastMeteorSpawn: number;
  public meteorSpawnInterval: number;
  public lastStarSpawn: number;
  public starSpawnInterval: number;
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
    this.meteors = new Map();
    this.stars = new Map();
    this.lastMeteorSpawn = Date.now();
    this.meteorSpawnInterval = 8000; // Spawn a meteor every 8 seconds
    this.lastStarSpawn = Date.now();
    this.starSpawnInterval = 20000; // Spawn a star every 20 seconds
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

  // Spawn a random meteor
  spawnMeteor(): void {
    const meteorId = `meteor_${Date.now()}_${Math.random()}`;

    // Choose random spawn location on the edge of the world
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX: number, startY: number;

    switch (side) {
      case 0: // Top
        startX = Math.random() * this.world.width;
        startY = -50;
        break;
      case 1: // Right
        startX = this.world.width + 50;
        startY = Math.random() * this.world.height;
        break;
      case 2: // Bottom
        startX = Math.random() * this.world.width;
        startY = this.world.height + 50;
        break;
      case 3: // Left
        startX = -50;
        startY = Math.random() * this.world.height;
        break;
      default:
        startX = 0;
        startY = 0;
    }

    // Choose random target location in the world
    const targetX = Math.random() * this.world.width;
    const targetY = Math.random() * this.world.height;

    const meteor = new Meteor(meteorId, startX, startY, targetX, targetY);
    this.meteors.set(meteorId, meteor);
    this.lastMeteorSpawn = Date.now();
  }

  // Spawn a random star
  spawnStar(): void {
    const starId = `star_${Date.now()}_${Math.random()}`;

    // Choose random location in the world (background stars)
    const x = Math.random() * this.world.width;
    const y = Math.random() * this.world.height;

    // Random lifespan between 15-25 seconds before explosion
    const lifespan = 15000 + Math.random() * 10000;

    const star = new Star(starId, x, y, lifespan);
    this.stars.set(starId, star);
    this.lastStarSpawn = Date.now();
  }

  // Update all meteors and handle collisions
  updateMeteors(deltaTime: number): {
    hitPlayers: Array<{
      meteorId: string;
      playerId: string;
      damage: number;
    }>;
    expiredMeteors: string[];
    wallHits: string[];
  } {
    const currentTime = Date.now();

    // Spawn new meteor if enough time has passed
    if (currentTime - this.lastMeteorSpawn > this.meteorSpawnInterval) {
      this.spawnMeteor();
    }

    const hitPlayers: Array<{
      meteorId: string;
      playerId: string;
      damage: number;
    }> = [];
    const expiredMeteors: string[] = [];
    const wallHits: string[] = [];

    this.meteors.forEach((meteor, id) => {
      // Update meteor position
      const isAlive = meteor.update(deltaTime);

      // Check if meteor is expired (traveled too far)
      if (!isAlive) {
        expiredMeteors.push(id);
        return;
      }

      // Check wall collisions
      if (this.world.checkWallCollision(meteor.x, meteor.y, meteor.radius)) {
        wallHits.push(id);
        expiredMeteors.push(id);
        return;
      }

      // Check player collisions
      this.players.forEach((player, playerId) => {
        if (meteor.checkCollision(player.x, player.y, player.radius)) {
          const isDead = player.takeDamage(meteor.damage);
          hitPlayers.push({
            meteorId: id,
            playerId,
            damage: meteor.damage,
          });

          if (isDead) {
            // Respawn player
            const spawnPos = this.world.getRandomSpawnPosition();
            player.x = spawnPos.x;
            player.y = spawnPos.y;
            player.heal(player.maxHealth);
          }

          expiredMeteors.push(id);
        }
      });
    });

    // Remove expired meteors
    expiredMeteors.forEach((id) => this.meteors.delete(id));

    return { hitPlayers, expiredMeteors, wallHits };
  }

  // Update all stars and handle explosions
  updateStars(deltaTime: number): {
    explosions: Array<{
      starId: string;
      x: number;
      y: number;
      radius: number;
      damage: number;
    }>;
    hitPlayers: Array<{
      starId: string;
      playerId: string;
      damage: number;
    }>;
    expiredStars: string[];
  } {
    const currentTime = Date.now();

    // Spawn new star if enough time has passed
    if (currentTime - this.lastStarSpawn > this.starSpawnInterval) {
      this.spawnStar();
    }

    const explosions: Array<{
      starId: string;
      x: number;
      y: number;
      radius: number;
      damage: number;
    }> = [];
    const hitPlayers: Array<{
      starId: string;
      playerId: string;
      damage: number;
    }> = [];
    const expiredStars: string[] = [];

    this.stars.forEach((star, id) => {
      // Update star state
      const wasExploding = star.isExploding;
      const isAlive = star.update(deltaTime);

      // Check if star just started exploding
      if (!wasExploding && star.isExploding) {
        explosions.push({
          starId: id,
          x: star.x,
          y: star.y,
          radius: star.explosionRadius,
          damage: star.damage,
        });

        // Check all entities in explosion radius
        this.players.forEach((player, playerId) => {
          if (star.isInExplosionRadius(player.x, player.y)) {
            const isDead = player.takeDamage(star.damage);
            hitPlayers.push({
              starId: id,
              playerId,
              damage: star.damage,
            });

            if (isDead) {
              // Respawn player
              const spawnPos = this.world.getRandomSpawnPosition();
              player.x = spawnPos.x;
              player.y = spawnPos.y;
              player.heal(player.maxHealth);
            }
          }
        });

        // Damage other stars in explosion radius
        this.stars.forEach((otherStar, otherId) => {
          if (
            otherId !== id &&
            star.isInExplosionRadius(otherStar.x, otherStar.y)
          ) {
            // Chain explosion - reduce other star's lifespan
            if (!otherStar.isExploding) {
              otherStar.lifespan = Math.min(otherStar.lifespan, 2000); // Force explosion in 2 seconds
            }
          }
        });
      }

      // Remove stars that finished exploding
      if (!isAlive) {
        expiredStars.push(id);
      }
    });

    // Remove expired stars
    expiredStars.forEach((id) => this.stars.delete(id));

    return { explosions, hitPlayers, expiredStars };
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

    // Serialize meteors
    const serializedMeteors = Array.from(this.meteors.values()).map((meteor) =>
      meteor.serialize()
    );

    // Serialize stars
    const serializedStars = Array.from(this.stars.values()).map((star) =>
      star.serialize()
    );

    return {
      players: serializedPlayers,
      aiEnemies: {}, // Empty for now since Game class doesn't handle AI enemies
      projectiles: serializedProjectiles,
      meteors: serializedMeteors,
      stars: serializedStars,
      walls: this.world.walls,
      powerUps: {}, // Empty for now since Game class doesn't handle power-ups
    };
  }

  // Get game statistics
  getStats(): {
    playerCount: number;
    projectileCount: number;
    meteorCount: number;
    starCount: number;
    wallCount: number;
    worldSize: { width: number; height: number };
  } {
    return {
      playerCount: this.players.size,
      projectileCount: this.projectiles.size,
      meteorCount: this.meteors.size,
      starCount: this.stars.size,
      wallCount: this.world.walls.length,
      worldSize: { width: this.world.width, height: this.world.height },
    };
  }

  // Reset the game
  reset(): void {
    this.players.clear();
    this.projectiles.clear();
    this.meteors.clear();
    this.stars.clear();
    this.lastMeteorSpawn = Date.now();
    this.lastStarSpawn = Date.now();
    this.world.generateWalls();
  }
}
