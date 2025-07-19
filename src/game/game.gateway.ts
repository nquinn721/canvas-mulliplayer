import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  AIEnemy,
  GameState,
  Laser,
  Meteor,
  Missile,
  Player,
  PowerUp,
  Projectile,
  Star,
  Wall,
} from "@shared";
import { PowerUpType } from "@shared/classes/PowerUp";
import { Server, Socket } from "socket.io";

interface KeyState {
  w?: boolean;
  a?: boolean;
  s?: boolean;
  d?: boolean;
  [key: string]: boolean | undefined;
}

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.CLIENT_URL || "https://your-cloud-run-url.com"]
        : "http://localhost:5173",
    methods: ["GET", "POST"],
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private players: Map<string, Player> = new Map();
  private aiEnemies: Map<string, AIEnemy> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  private meteors: Map<string, Meteor> = new Map();
  private stars: Map<string, Star> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private walls: Wall[] = [];
  private gameLoopInterval: NodeJS.Timeout;
  private projectileIdCounter = 0;
  private powerUpIdCounter = 0;
  private playerNameCounter = 1;
  private aiEnemyCounter = 1;
  private lastMeteorSpawn = Date.now();
  private meteorSpawnInterval = 8000; // 8 seconds
  private lastStarSpawn = Date.now();
  private starSpawnInterval = 20000; // 20 seconds (normal gameplay)

  // World bounds
  private readonly WORLD_WIDTH = 5000;
  private readonly WORLD_HEIGHT = 5000;
  private readonly WALL_COUNT = 60;
  private readonly POWERUP_COUNT = 20;
  private readonly AI_ENEMY_COUNT = 5; // Number of AI enemies to spawn
  private preferredAIDifficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"; // Default difficulty

  constructor() {
    this.generateWalls();
    this.spawnPowerUps();
    this.spawnAIEnemies();
    this.startGameLoop();
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Don't create player immediately - wait for player name
    client.emit("playerId", client.id);
  }

  @SubscribeMessage("joinGame")
  handleJoinGame(
    @MessageBody() data: { playerName: string },
    @ConnectedSocket() client: Socket
  ) {
    const playerName = data.playerName || `Player ${this.playerNameCounter++}`;
    const spawnPosition = this.getRandomSpawnPosition();

    const player = new Player(
      client.id,
      playerName,
      spawnPosition.x,
      spawnPosition.y
    );

    this.players.set(client.id, player);
    console.log(
      `${playerName} joined the game at (${spawnPosition.x}, ${spawnPosition.y})`
    );
    this.broadcastGameState();
  }

  handleDisconnect(client: Socket) {
    const player = this.players.get(client.id);
    const playerName = player ? player.name : client.id;
    console.log(`${playerName} disconnected`);
    this.players.delete(client.id);
    this.broadcastGameState();
  }

  @SubscribeMessage("input")
  handleInput(
    @MessageBody() keys: KeyState,
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const deltaTime = 16; // Approximate 60 FPS

    // Handle boost mechanics
    if (keys.shift && player.canUseBoost()) {
      player.activateBoost();
    } else {
      player.deactivateBoost();
    }

    // Update boost energy
    player.updateBoostEnergy(deltaTime);

    // Remove roll animation update - no longer needed

    // Update strafe velocity and get movement delta
    const strafeMovement = player.updateStrafeVelocity(deltaTime / 1000);

    // Calculate move speed with boost multiplier
    const baseSpeed = player.speed * (deltaTime / 1000);
    const boostMultiplier = player.isBoostActive ? 2.5 : 1.0;
    const moveSpeed = baseSpeed * boostMultiplier;

    let deltaX = strafeMovement.deltaX; // Start with strafe movement
    let deltaY = strafeMovement.deltaY;

    // Calculate movement deltas based on player angle (mouse direction)
    // W/S move forward/backward relative to where mouse is pointing
    if (keys.w) {
      deltaX += Math.cos(player.angle) * moveSpeed;
      deltaY += Math.sin(player.angle) * moveSpeed;
    }
    if (keys.s) {
      deltaX -= Math.cos(player.angle) * moveSpeed;
      deltaY -= Math.sin(player.angle) * moveSpeed;
    }

    const currentTime = Date.now();

    // A/D for strafing without roll animation
    if (keys.a) {
      // Apply strafe impulse to the left if not already strafing or cooldown available
      if (player.canRoll(currentTime)) {
        player.applyStrafe(-1);
        player.lastRollTime = currentTime; // Update cooldown time
      }
    }
    if (keys.d) {
      // Apply strafe impulse to the right if not already strafing or cooldown available
      if (player.canRoll(currentTime)) {
        player.applyStrafe(1);
        player.lastRollTime = currentTime; // Update cooldown time
      }
    }

    // Use Player class method to update position with collision checking
    player.updatePosition(
      deltaX,
      deltaY,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT,
      (x, y, radius) => this.checkWallCollision(x, y, radius)
    );

    this.players.set(client.id, player);
  }

  @SubscribeMessage("shoot")
  handleShoot(
    @MessageBody()
    data: { x: number; y: number; angle: number; weapon: "laser" | "missile" },
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const currentTime = Date.now();

    // Check missile cooldown
    if (data.weapon === "missile") {
      const MISSILE_COOLDOWN = 2000; // 2 seconds
      if (!player.canShootMissile(currentTime, MISSILE_COOLDOWN)) {
        return; // Still on cooldown
      }
      player.updateMissileTime(currentTime);
    }

    let projectile: Projectile;
    const projectileId = `proj_${this.projectileIdCounter++}`;

    if (data.weapon === "missile") {
      // Get missile stats based on player upgrades
      const missileStats = player.getMissileStats();

      // Create missiles based on upgrade level
      if (missileStats.missileCount === 1) {
        // Single missile (levels 1-2)
        projectile = new Missile(
          data.x,
          data.y,
          data.angle,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );
      } else if (missileStats.missileCount === 2) {
        // Dual shot (level 3) - left and right wing missiles
        const wingOffset = 15; // Distance from center to wing
        const wingAngle = data.angle + Math.PI / 2; // Perpendicular to ship direction

        // Left wing missile
        const leftWingX = data.x + Math.cos(wingAngle) * wingOffset;
        const leftWingY = data.y + Math.sin(wingAngle) * wingOffset;
        const leftAngleOffset = -0.2; // Angle away from nose (left)

        projectile = new Missile(
          leftWingX,
          leftWingY,
          data.angle + leftAngleOffset,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );

        // Right wing missile
        const rightWingX = data.x + Math.cos(wingAngle) * -wingOffset;
        const rightWingY = data.y + Math.sin(wingAngle) * -wingOffset;
        const rightAngleOffset = 0.2; // Angle away from nose (right)

        const rightMissileId = `proj_${this.projectileIdCounter++}`;
        const rightMissile = new Missile(
          rightWingX,
          rightWingY,
          data.angle + rightAngleOffset,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );
        rightMissile.id = rightMissileId;
        this.projectiles.set(rightMissileId, rightMissile);
      } else if (missileStats.missileCount === 3) {
        // Triple shot (level 5) - center, left wing, and right wing missiles

        // Center missile (main)
        projectile = new Missile(
          data.x,
          data.y,
          data.angle,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );

        const wingOffset = 15; // Distance from center to wing
        const wingAngle = data.angle + Math.PI / 2; // Perpendicular to ship direction

        // Left wing missile
        const leftWingX = data.x + Math.cos(wingAngle) * wingOffset;
        const leftWingY = data.y + Math.sin(wingAngle) * wingOffset;
        const leftAngleOffset = -0.15; // Slightly less spread for triple shot

        const leftMissileId = `proj_${this.projectileIdCounter++}`;
        const leftMissile = new Missile(
          leftWingX,
          leftWingY,
          data.angle + leftAngleOffset,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );
        leftMissile.id = leftMissileId;
        this.projectiles.set(leftMissileId, leftMissile);

        // Right wing missile
        const rightWingX = data.x + Math.cos(wingAngle) * -wingOffset;
        const rightWingY = data.y + Math.sin(wingAngle) * -wingOffset;
        const rightAngleOffset = 0.15; // Slightly less spread for triple shot

        const rightMissileId = `proj_${this.projectileIdCounter++}`;
        const rightMissile = new Missile(
          rightWingX,
          rightWingY,
          data.angle + rightAngleOffset,
          client.id,
          missileStats.speed,
          missileStats.damage,
          missileStats.distance,
          missileStats.trackingRange,
          missileStats.turnRate
        );
        rightMissile.id = rightMissileId;
        this.projectiles.set(rightMissileId, rightMissile);
      }
    } else {
      // Get laser stats based on player upgrades
      const laserStats = player.getLaserStats();
      projectile = new Laser(
        data.x,
        data.y,
        data.angle,
        client.id,
        laserStats.speed,
        laserStats.damage,
        laserStats.distance
      );

      // If dual shot is enabled (level 3+), create a second laser
      if (laserStats.dualShot) {
        const secondProjectileId = `proj_${this.projectileIdCounter++}`;
        const angleOffset = 0.1; // Small angle offset for dual shot
        const secondProjectile = new Laser(
          data.x,
          data.y,
          data.angle + angleOffset,
          client.id,
          laserStats.speed,
          laserStats.damage,
          laserStats.distance
        );
        secondProjectile.id = secondProjectileId;
        this.projectiles.set(secondProjectileId, secondProjectile);
      }

      // If backward laser is enabled (level 5+), create a backward laser
      if (laserStats.hasBackwardLaser) {
        const backwardProjectileId = `proj_${this.projectileIdCounter++}`;
        const backwardAngle = data.angle + Math.PI; // 180 degrees opposite
        const backwardProjectile = new Laser(
          data.x,
          data.y,
          backwardAngle,
          client.id,
          laserStats.speed,
          laserStats.damage,
          laserStats.distance
        );
        backwardProjectile.id = backwardProjectileId;
        this.projectiles.set(backwardProjectileId, backwardProjectile);
      }
    }

    // Override the ID with our server-generated one
    projectile.id = projectileId;

    this.projectiles.set(projectileId, projectile);
  }

  @SubscribeMessage("updateAngle")
  handleUpdateAngle(
    @MessageBody() data: { angle: number },
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    player.updateAngle(data.angle);
    this.players.set(client.id, player);
  }

  @SubscribeMessage("changeAIDifficulty")
  handleChangeAIDifficulty(
    @MessageBody() data: { difficulty: "EASY" | "MEDIUM" | "HARD" },
    @ConnectedSocket() client: Socket
  ) {
    console.log(
      `Player ${client.id} requested AI difficulty change to ${data.difficulty}`
    );

    // Update existing AI enemies with new difficulty
    let changedCount = 0;
    this.aiEnemies.forEach((aiEnemy) => {
      aiEnemy.setDifficulty(data.difficulty);
      changedCount++;
    });

    // Store the preferred difficulty for new AI spawns
    this.preferredAIDifficulty = data.difficulty;

    console.log(
      `Changed difficulty for ${changedCount} AI enemies to ${data.difficulty}`
    );

    // Send confirmation back to client
    client.emit("aiDifficultyChanged", {
      difficulty: data.difficulty,
      affectedEnemies: changedCount,
    });
  }

  private startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
      this.broadcastGameState();
    }, 16); // ~60 FPS
  }

  private updateGame() {
    const deltaTime = 16;

    // Update player shields
    this.players.forEach((player) => {
      player.updateShield();
    });

    // Update AI enemies
    this.updateAIEnemies(deltaTime);

    // Update projectiles
    const projectilesToRemove: string[] = [];

    this.projectiles.forEach((projectile, id) => {
      // Special handling for missiles with homing capability
      if (projectile instanceof Missile) {
        // Combine players and AI enemies for missile targeting
        const allTargets = new Map<string, Player>();
        this.players.forEach((player, pid) => allTargets.set(pid, player));
        this.aiEnemies.forEach((aiEnemy, aid) => allTargets.set(aid, aiEnemy));

        (projectile as Missile).updateWithHoming(deltaTime, allTargets);
      } else {
        projectile.update(deltaTime);
      }

      // Check if projectile is out of bounds or expired
      if (
        projectile.x < 0 ||
        projectile.x > this.WORLD_WIDTH ||
        projectile.y < 0 ||
        projectile.y > this.WORLD_HEIGHT ||
        projectile.isExpired()
      ) {
        projectilesToRemove.push(id);
        this.server.emit("projectileExpired", id);
        return;
      }

      // Check wall collisions
      if (this.checkProjectileWallCollision(projectile)) {
        projectilesToRemove.push(id);
        this.server.emit("projectileHit", {
          projectileId: id,
          x: projectile.x,
          y: projectile.y,
          wallHit: true,
        });
        return;
      }

      // Check player collisions
      this.players.forEach((player, playerId) => {
        if (playerId === projectile.ownerId) return; // Don't hit own shots

        const distance = Math.sqrt(
          (player.x - projectile.x) ** 2 + (player.y - projectile.y) ** 2
        );

        if (player.containsPoint(projectile.x, projectile.y)) {
          // Player was hit
          const isDead = player.takeDamage(projectile.damage);

          if (isDead) {
            // Give XP to the killer (if it's not self-damage)
            if (projectile.ownerId !== player.id) {
              const killer = this.players.get(projectile.ownerId);
              if (killer) {
                killer.addExperience(30); // 30 XP for kill
              }
            }

            // Respawn player at a safe location
            player.heal(player.maxHealth); // Fully heal
            const spawnPos = this.getRandomSpawnPosition();
            player.x = spawnPos.x;
            player.y = spawnPos.y;
          }

          projectilesToRemove.push(id);
          this.server.emit("projectileHit", {
            projectileId: id,
            x: projectile.x,
            y: projectile.y,
            targetId: playerId,
          });
        }
      });

      // Check AI enemy collisions
      this.aiEnemies.forEach((aiEnemy, aiId) => {
        if (aiId === projectile.ownerId) return; // Don't hit own shots

        if (aiEnemy.containsPoint(projectile.x, projectile.y)) {
          // AI enemy was hit
          const isDead = aiEnemy.takeDamage(projectile.damage);

          if (isDead) {
            // Respawn AI at a safe location
            aiEnemy.heal(aiEnemy.maxHealth);
            const spawnPos = this.getRandomSpawnPosition();
            aiEnemy.x = spawnPos.x;
            aiEnemy.y = spawnPos.y;
          }

          projectilesToRemove.push(id);
          this.server.emit("projectileHit", {
            projectileId: id,
            x: projectile.x,
            y: projectile.y,
            targetId: aiId,
          });
        }
      });
    });

    // Remove expired projectiles
    projectilesToRemove.forEach((id) => {
      this.projectiles.delete(id);
    });

    // Update meteors
    this.updateMeteors(deltaTime);

    // Update stars
    this.updateStars(deltaTime);

    // Update power-ups and check for collection
    this.updatePowerUps(deltaTime);

    // Update boost energy for all players
    this.players.forEach((player) => {
      player.updateBoostEnergy(deltaTime);

      // Update strafe velocity for all players
      const strafeMovement = player.updateStrafeVelocity(deltaTime / 1000);

      // Apply strafe movement if there's any velocity
      if (
        Math.abs(strafeMovement.deltaX) > 0.01 ||
        Math.abs(strafeMovement.deltaY) > 0.01
      ) {
        player.updatePosition(
          strafeMovement.deltaX,
          strafeMovement.deltaY,
          this.WORLD_WIDTH,
          this.WORLD_HEIGHT,
          (x, y, radius) => this.checkWallCollision(x, y, radius)
        );
      }
    });
  }

  private updatePowerUps(deltaTime: number) {
    const currentTime = Date.now();

    // Update power-ups and check for respawning
    this.powerUps.forEach((powerUp, powerUpId) => {
      // If power-up should respawn, respawn it
      if (powerUp.canRespawn()) {
        powerUp.respawn();
      }
    });

    // Check for power-up collection
    this.players.forEach((player, playerId) => {
      this.powerUps.forEach((powerUp, powerUpId) => {
        if (powerUp.collected) return;

        const distance = Math.sqrt(
          (player.x - powerUp.x) ** 2 + (player.y - powerUp.y) ** 2
        );

        if (distance < player.radius + powerUp.radius) {
          // Check if player can benefit from this power-up
          let canCollect = true;

          if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
            canCollect = player.canBeHealed();
          }

          if (canCollect) {
            // Power-up collected!
            powerUp.collect();

            // Apply upgrade to player based on type
            if (powerUp.type === PowerUpType.BOOST_UPGRADE) {
              player.applyBoostUpgrade();
            } else if (powerUp.type === PowerUpType.LASER_UPGRADE) {
              player.applyLaserUpgrade();
            } else if (powerUp.type === PowerUpType.MISSILE_UPGRADE) {
              player.applyMissileUpgrade();
            } else if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
              player.heal(50); // Heal 50 health points
            } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
              player.applyShield(); // Apply shield protection
            }

            this.server.emit("powerUpCollected", {
              powerUpId: powerUpId,
              playerId: playerId,
              type: powerUp.type,
            });
          }
        }
      });
    });
  }

  private updateAIEnemies(deltaTime: number) {
    this.aiEnemies.forEach((aiEnemy, aiId) => {
      // Update AI behavior - this includes movement and state decisions
      aiEnemy.updateAI(
        deltaTime,
        this.players,
        this.WORLD_WIDTH,
        this.WORLD_HEIGHT,
        (x, y, radius) => this.checkWallCollision(x, y, radius),
        this.powerUps
      );

      // Check if AI wants to shoot using our simple behavior system
      const shootingDecision = aiEnemy.getShootingInfo(this.players);
      if (shootingDecision) {
        this.createAIProjectile(
          aiEnemy,
          shootingDecision.angle,
          shootingDecision.weapon
        );
      }

      // Check projectile collisions with AI enemies
      this.projectiles.forEach((projectile, projectileId) => {
        if (projectile.ownerId === aiId) return; // Don't hit own shots

        if (aiEnemy.containsPoint(projectile.x, projectile.y)) {
          // AI was hit
          const isDead = aiEnemy.takeDamage(projectile.damage);

          if (isDead) {
            // Respawn AI at a safe location
            aiEnemy.heal(aiEnemy.maxHealth);
            const spawnPos = this.getRandomSpawnPosition();
            aiEnemy.x = spawnPos.x;
            aiEnemy.y = spawnPos.y;
          }

          this.projectiles.delete(projectileId);
          this.server.emit("projectileHit", {
            projectileId: projectileId,
            x: projectile.x,
            y: projectile.y,
            targetId: aiId,
          });
        }
      });
    });

    // AI power-up collection
    this.aiEnemies.forEach((aiEnemy, aiId) => {
      this.powerUps.forEach((powerUp, powerUpId) => {
        if (powerUp.collected) return;

        const distance = Math.sqrt(
          (aiEnemy.x - powerUp.x) ** 2 + (aiEnemy.y - powerUp.y) ** 2
        );

        if (distance < aiEnemy.radius + powerUp.radius) {
          // Check if AI can benefit from this power-up
          let canCollect = true;

          if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
            canCollect = aiEnemy.canBeHealed();
          }

          if (canCollect) {
            // Power-up collected by AI!
            powerUp.collect();

            // Apply upgrade to AI based on type
            if (powerUp.type === PowerUpType.BOOST_UPGRADE) {
              aiEnemy.applyBoostUpgrade();
            } else if (powerUp.type === PowerUpType.LASER_UPGRADE) {
              aiEnemy.applyLaserUpgrade();
            } else if (powerUp.type === PowerUpType.MISSILE_UPGRADE) {
              aiEnemy.applyMissileUpgrade();
            } else if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
              aiEnemy.heal(50); // Heal 50 health points
            } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
              aiEnemy.applyShield(); // Apply shield protection
            }

            this.server.emit("powerUpCollected", {
              powerUpId: powerUpId,
              playerId: aiId,
              type: powerUp.type,
            });
          }
        }
      });
    });
  }

  private findClosestPlayerToAI(aiEnemy: AIEnemy): Player | null {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    this.players.forEach((player) => {
      const distance = aiEnemy.getDistanceTo(player.x, player.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });

    return closestPlayer;
  }

  private createAIProjectile(
    aiEnemy: AIEnemy,
    angle: number,
    weapon: "laser" | "missile"
  ) {
    let projectile: Projectile;
    const projectileId = `proj_${this.projectileIdCounter++}`;

    if (weapon === "missile") {
      const missileStats = aiEnemy.getMissileStats();
      projectile = new Missile(
        aiEnemy.x,
        aiEnemy.y,
        angle,
        aiEnemy.id,
        missileStats.speed,
        missileStats.damage,
        missileStats.distance,
        missileStats.trackingRange,
        missileStats.turnRate
      );
    } else {
      const laserStats = aiEnemy.getLaserStats();
      projectile = new Laser(
        aiEnemy.x,
        aiEnemy.y,
        angle,
        aiEnemy.id,
        laserStats.speed,
        laserStats.damage,
        laserStats.distance
      );
    }

    projectile.id = projectileId;
    this.projectiles.set(projectileId, projectile);
  }

  private checkWallCollision(x: number, y: number, radius: number): boolean {
    return this.walls.some((wall) => {
      return (
        x - radius < wall.x + wall.width &&
        x + radius > wall.x &&
        y - radius < wall.y + wall.height &&
        y + radius > wall.y
      );
    });
  }

  private checkProjectileWallCollision(projectile: Projectile): boolean {
    return this.walls.some((wall) => {
      return (
        projectile.x >= wall.x &&
        projectile.x <= wall.x + wall.width &&
        projectile.y >= wall.y &&
        projectile.y <= wall.y + wall.height
      );
    });
  }

  private getRandomSpawnPosition(): { x: number; y: number } {
    const playerRadius = 15;
    const safeDistance = 25; // Extra safe distance from walls
    let x, y;
    let attempts = 0;

    do {
      // Generate random position with safe margins from world edges
      x = Math.random() * (this.WORLD_WIDTH - 2 * safeDistance) + safeDistance;
      y = Math.random() * (this.WORLD_HEIGHT - 2 * safeDistance) + safeDistance;
      attempts++;

      // If we can't find a safe spot after many attempts, use a guaranteed safe zone
      if (attempts > 200) {
        // Use a safe zone in the center of the map
        x = this.WORLD_WIDTH / 2 + (Math.random() - 0.5) * 200;
        y = this.WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 200;
        break;
      }
    } while (
      this.checkWallCollision(x, y, playerRadius + safeDistance) &&
      attempts < 200
    );

    return { x, y };
  }

  private generateWalls() {
    this.walls = [];

    for (let i = 0; i < this.WALL_COUNT; i++) {
      let wall: Wall;
      let attempts = 0;
      let validPosition = false;

      do {
        // Create thinner walls - either long horizontal or vertical walls
        const isHorizontal = Math.random() > 0.5;

        if (isHorizontal) {
          wall = {
            id: `wall_${i}`,
            x: Math.random() * (this.WORLD_WIDTH - 300) + 150,
            y: Math.random() * (this.WORLD_HEIGHT - 100) + 50,
            width: 100 + Math.random() * 200, // 100-300px long
            height: 15 + Math.random() * 20, // 15-35px thick
            color: "#666666",
          };
        } else {
          wall = {
            id: `wall_${i}`,
            x: Math.random() * (this.WORLD_WIDTH - 100) + 50,
            y: Math.random() * (this.WORLD_HEIGHT - 300) + 150,
            width: 15 + Math.random() * 20, // 15-35px thick
            height: 100 + Math.random() * 200, // 100-300px long
            color: "#666666",
          };
        }

        // Check if this wall overlaps with existing walls (with some spacing)
        validPosition = !this.walls.some((existingWall) => {
          const spacing = 50; // Minimum spacing between walls
          return !(
            wall.x + wall.width + spacing < existingWall.x ||
            wall.x > existingWall.x + existingWall.width + spacing ||
            wall.y + wall.height + spacing < existingWall.y ||
            wall.y > existingWall.y + existingWall.height + spacing
          );
        });

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.walls.push(wall);
      }
    }
  }

  private spawnPowerUps() {
    this.powerUps.clear();

    for (let i = 0; i < this.POWERUP_COUNT; i++) {
      this.spawnSinglePowerUp();
    }
  }

  private spawnSinglePowerUp(): void {
    const powerUpRadius = 20;
    const safeDistance = 30; // Safe distance from walls and other power-ups
    let x, y;
    let attempts = 0;

    do {
      x = Math.random() * (this.WORLD_WIDTH - 2 * safeDistance) + safeDistance;
      y = Math.random() * (this.WORLD_HEIGHT - 2 * safeDistance) + safeDistance;
      attempts++;

      if (attempts > 200) {
        // Use a safe zone if we can't find a spot
        x = this.WORLD_WIDTH / 2 + (Math.random() - 0.5) * 1000;
        y = this.WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 1000;
        break;
      }
    } while (
      (this.checkWallCollision(x, y, powerUpRadius + safeDistance) ||
        this.checkPowerUpCollision(x, y, powerUpRadius + safeDistance)) &&
      attempts < 200
    );

    const powerUpId = `powerup_${this.powerUpIdCounter++}`;
    // Randomly choose between all power-up types (20% each)
    const randomValue = Math.random();
    let powerUpType: PowerUpType;
    if (randomValue < 0.2) {
      powerUpType = PowerUpType.BOOST_UPGRADE;
    } else if (randomValue < 0.4) {
      powerUpType = PowerUpType.LASER_UPGRADE;
    } else if (randomValue < 0.6) {
      powerUpType = PowerUpType.MISSILE_UPGRADE;
    } else if (randomValue < 0.8) {
      powerUpType = PowerUpType.HEALTH_PICKUP;
    } else {
      powerUpType = PowerUpType.SHIELD_PICKUP;
    }
    const powerUp = new PowerUp(powerUpId, x, y, powerUpType);
    this.powerUps.set(powerUpId, powerUp);
  }

  private spawnAIEnemies() {
    this.aiEnemies.clear();

    for (let i = 0; i < this.AI_ENEMY_COUNT; i++) {
      const spawnPosition = this.getRandomSpawnPosition();
      const aiId = `ai_${this.aiEnemyCounter++}`;

      // Create a simple AI enemy at the spawn position with difficulty setting
      const aiEnemy = new AIEnemy(
        aiId,
        spawnPosition.x,
        spawnPosition.y,
        this.preferredAIDifficulty
      );

      this.aiEnemies.set(aiId, aiEnemy);
    }
  }

  private checkPowerUpCollision(
    x: number,
    y: number,
    minDistance: number
  ): boolean {
    for (const powerUp of this.powerUps.values()) {
      if (powerUp.collected) continue;

      const distance = Math.sqrt((powerUp.x - x) ** 2 + (powerUp.y - y) ** 2);

      if (distance < minDistance) {
        return true;
      }
    }
    return false;
  }

  private spawnMeteor() {
    const meteorId = `meteor_${Date.now()}_${Math.random()}`;

    // Choose random spawn location on the edge of the world
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX: number, startY: number;

    switch (side) {
      case 0: // Top
        startX = Math.random() * this.WORLD_WIDTH;
        startY = -50;
        break;
      case 1: // Right
        startX = this.WORLD_WIDTH + 50;
        startY = Math.random() * this.WORLD_HEIGHT;
        break;
      case 2: // Bottom
        startX = Math.random() * this.WORLD_WIDTH;
        startY = this.WORLD_HEIGHT + 50;
        break;
      case 3: // Left
        startX = -50;
        startY = Math.random() * this.WORLD_HEIGHT;
        break;
      default:
        startX = 0;
        startY = 0;
    }

    // Choose random target location in the world
    const targetX = Math.random() * this.WORLD_WIDTH;
    const targetY = Math.random() * this.WORLD_HEIGHT;

    const meteor = new Meteor(meteorId, startX, startY, targetX, targetY);
    this.meteors.set(meteorId, meteor);
    this.lastMeteorSpawn = Date.now();

    // Emit meteor spawn event
    this.server.emit("meteorSpawned", {
      meteorId: meteorId,
      x: startX,
      y: startY,
      targetX: targetX,
      targetY: targetY,
    });
  }

  private spawnStar() {
    const starId = `star_${Date.now()}_${Math.random()}`;

    // Choose random location in the world (background stars)
    const x = Math.random() * this.WORLD_WIDTH;
    const y = Math.random() * this.WORLD_HEIGHT;

    // Random lifespan between 15-25 seconds before explosion
    const lifespan = 15000 + Math.random() * 10000;

    const star = new Star(starId, x, y, lifespan);
    this.stars.set(starId, star);
    this.lastStarSpawn = Date.now();

    // Emit star spawn event
    this.server.emit("starSpawned", {
      starId: starId,
      x: x,
      y: y,
      lifespan: lifespan,
    });
  }

  private updateMeteors(deltaTime: number) {
    const currentTime = Date.now();

    // Spawn new meteor if enough time has passed
    if (currentTime - this.lastMeteorSpawn > this.meteorSpawnInterval) {
      this.spawnMeteor();
    }

    const meteorsToRemove: string[] = [];

    this.meteors.forEach((meteor, id) => {
      // Update meteor position
      const isAlive = meteor.update(deltaTime / 1000);

      // Check if meteor is expired (traveled too far)
      if (!isAlive) {
        meteorsToRemove.push(id);
        this.server.emit("meteorExpired", id);
        return;
      }

      // Check wall collisions
      if (this.checkWallCollision(meteor.x, meteor.y, meteor.radius)) {
        meteorsToRemove.push(id);
        this.server.emit("meteorHit", {
          meteorId: id,
          x: meteor.x,
          y: meteor.y,
          wallHit: true,
        });
        return;
      }

      // Check player collisions
      this.players.forEach((player, playerId) => {
        if (meteor.checkCollision(player.x, player.y, player.radius)) {
          const isDead = player.takeDamage(meteor.damage);

          if (isDead) {
            // Respawn player at a safe location
            player.heal(player.maxHealth);
            const spawnPos = this.getRandomSpawnPosition();
            player.x = spawnPos.x;
            player.y = spawnPos.y;
          }

          meteorsToRemove.push(id);
          this.server.emit("meteorHit", {
            meteorId: id,
            x: meteor.x,
            y: meteor.y,
            targetId: playerId,
            damage: meteor.damage,
          });
        }
      });

      // Check AI enemy collisions
      this.aiEnemies.forEach((aiEnemy, aiId) => {
        if (meteor.checkCollision(aiEnemy.x, aiEnemy.y, aiEnemy.radius)) {
          const isDead = aiEnemy.takeDamage(meteor.damage);

          if (isDead) {
            // Respawn AI at a safe location
            aiEnemy.heal(aiEnemy.maxHealth);
            const spawnPos = this.getRandomSpawnPosition();
            aiEnemy.x = spawnPos.x;
            aiEnemy.y = spawnPos.y;
          }

          meteorsToRemove.push(id);
          this.server.emit("meteorHit", {
            meteorId: id,
            x: meteor.x,
            y: meteor.y,
            targetId: aiId,
            damage: meteor.damage,
          });
        }
      });
    });

    // Remove expired meteors
    meteorsToRemove.forEach((id) => {
      this.meteors.delete(id);
    });
  }

  private updateStars(deltaTime: number) {
    const currentTime = Date.now();

    // Spawn new star if enough time has passed
    if (currentTime - this.lastStarSpawn > this.starSpawnInterval) {
      this.spawnStar();
    }

    const starsToRemove: string[] = [];

    this.stars.forEach((star, id) => {
      // Update star state
      const wasExploding = star.isExploding;
      const isAlive = star.update(deltaTime / 1000);

      // Check if star just started exploding
      if (!wasExploding && star.isExploding) {
        // Emit explosion event
        this.server.emit("starExplosion", {
          starId: id,
          x: star.x,
          y: star.y,
          radius: star.explosionRadius,
          damage: star.damage,
        });

        // Check all players in explosion radius
        this.players.forEach((player, playerId) => {
          if (star.isInExplosionRadius(player.x, player.y)) {
            const isDead = player.takeDamage(star.damage);

            // Emit damage event
            this.server.emit("starDamage", {
              starId: id,
              playerId: playerId,
              damage: star.damage,
              x: star.x,
              y: star.y,
            });

            if (isDead) {
              // Respawn player
              const spawnPos = this.getRandomSpawnPosition();
              player.x = spawnPos.x;
              player.y = spawnPos.y;
              player.heal(player.maxHealth);
            }
          }
        });

        // Check AI enemies in explosion radius
        this.aiEnemies.forEach((aiEnemy, aiId) => {
          if (star.isInExplosionRadius(aiEnemy.x, aiEnemy.y)) {
            const isDead = aiEnemy.takeDamage(star.damage);

            if (isDead) {
              // Respawn AI at a safe location
              aiEnemy.heal(aiEnemy.maxHealth);
              const spawnPos = this.getRandomSpawnPosition();
              aiEnemy.x = spawnPos.x;
              aiEnemy.y = spawnPos.y;
            }
          }
        });

        // Chain explosions - damage other stars in explosion radius
        this.stars.forEach((otherStar, otherId) => {
          if (
            otherId !== id &&
            star.isInExplosionRadius(otherStar.x, otherStar.y)
          ) {
            // Force other star to explode soon
            if (!otherStar.isExploding) {
              otherStar.lifespan = Math.min(otherStar.lifespan, 2000); // Force explosion in 2 seconds
            }
          }
        });
      }

      // Remove stars that finished exploding
      if (!isAlive) {
        starsToRemove.push(id);
        this.server.emit("starExpired", id);
      }
    });

    // Remove expired stars
    starsToRemove.forEach((id) => {
      this.stars.delete(id);
    });
  }

  private broadcastGameState() {
    // Serialize players for network transmission
    const serializedPlayers: { [id: string]: any } = {};
    for (const [id, player] of this.players) {
      serializedPlayers[id] = player.serialize();
    }

    // Serialize AI enemies for network transmission
    const serializedAIEnemies: { [id: string]: any } = {};
    for (const [id, aiEnemy] of this.aiEnemies) {
      serializedAIEnemies[id] = aiEnemy.serialize();
    }

    // Serialize power-ups for network transmission
    const serializedPowerUps: { [id: string]: any } = {};
    for (const [id, powerUp] of this.powerUps) {
      serializedPowerUps[id] = powerUp.serialize();
    }

    const gameState: GameState = {
      players: serializedPlayers,
      aiEnemies: serializedAIEnemies,
      walls: this.walls,
      powerUps: serializedPowerUps,
      projectiles: Array.from(this.projectiles.values()).map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        angle: Math.atan2(p.velocityY, p.velocityX),
        speed: p.speed,
        damage: p.damage,
        ownerId: p.ownerId,
        type: p.type as "laser" | "missile",
        createdAt: p.createdAt,
      })),
      meteors: Array.from(this.meteors.values()).map((meteor) =>
        meteor.serialize()
      ),
      stars: Array.from(this.stars.values()).map((star) => star.serialize()),
    };

    this.server.emit("gameState", gameState);
  }
}
