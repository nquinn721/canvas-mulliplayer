import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  GameState,
  Laser,
  Missile,
  Player,
  PowerUp,
  Projectile,
  Wall,
} from "../../shared";
import { PowerUpType } from "../../shared/classes/PowerUp";

interface KeyState {
  w?: boolean;
  a?: boolean;
  s?: boolean;
  d?: boolean;
  [key: string]: boolean | undefined;
}

@WebSocketGateway({
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private players: Map<string, Player> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private walls: Wall[] = [];
  private gameLoopInterval: NodeJS.Timeout;
  private projectileIdCounter = 0;
  private powerUpIdCounter = 0;
  private playerNameCounter = 1;

  // World bounds
  private readonly WORLD_WIDTH = 5000;
  private readonly WORLD_HEIGHT = 5000;
  private readonly WALL_COUNT = 60;
  private readonly POWERUP_COUNT = 20;

  constructor() {
    this.generateWalls();
    this.spawnPowerUps();
    this.startGameLoop();
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    const playerName = `Player ${this.playerNameCounter++}`;
    const spawnPosition = this.getRandomSpawnPosition();

    const player = new Player(
      client.id,
      playerName,
      spawnPosition.x,
      spawnPosition.y
    );

    this.players.set(client.id, player);
    client.emit("playerId", client.id);
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

    // Update roll animation
    player.updateRoll(deltaTime / 1000); // Convert to seconds

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

    // A/D for rolling and quick sideways movement
    if (keys.a) {
      // Start left roll if available
      if (player.startRoll(-1, currentTime)) {
        // Apply smooth strafe impulse to the left
        player.applyStrafe(-1);
      }
    }
    if (keys.d) {
      // Start right roll if available
      if (player.startRoll(1, currentTime)) {
        // Apply smooth strafe impulse to the right
        player.applyStrafe(1);
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

  private startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
      this.broadcastGameState();
    }, 16); // ~60 FPS
  }

  private updateGame() {
    const deltaTime = 16;

    // Update projectiles
    const projectilesToRemove: string[] = [];

    this.projectiles.forEach((projectile, id) => {
      // Special handling for missiles with homing capability
      if (projectile instanceof Missile) {
        (projectile as Missile).updateWithHoming(deltaTime, this.players);
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
    });

    // Remove expired projectiles
    projectilesToRemove.forEach((id) => {
      this.projectiles.delete(id);
    });

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
          // Power-up collected!
          powerUp.collect();

          // Apply upgrade to player based on type
          if (powerUp.type === PowerUpType.BOOST_UPGRADE) {
            player.applyBoostUpgrade();
          } else if (powerUp.type === PowerUpType.LASER_UPGRADE) {
            player.applyLaserUpgrade();
          } else if (powerUp.type === PowerUpType.MISSILE_UPGRADE) {
            player.applyMissileUpgrade();
          }

          this.server.emit("powerUpCollected", {
            powerUpId: powerUpId,
            playerId: playerId,
            type: powerUp.type,
          });
        }
      });
    });
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
    // Randomly choose between boost, laser, and missile upgrades (33/33/33 split)
    const randomValue = Math.random();
    let powerUpType: PowerUpType;
    if (randomValue < 0.33) {
      powerUpType = PowerUpType.BOOST_UPGRADE;
    } else if (randomValue < 0.66) {
      powerUpType = PowerUpType.LASER_UPGRADE;
    } else {
      powerUpType = PowerUpType.MISSILE_UPGRADE;
    }
    const powerUp = new PowerUp(powerUpId, x, y, powerUpType);
    this.powerUps.set(powerUpId, powerUp);
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

  private broadcastGameState() {
    // Serialize players for network transmission
    const serializedPlayers: { [id: string]: any } = {};
    for (const [id, player] of this.players) {
      serializedPlayers[id] = player.serialize();
    }

    // Serialize power-ups for network transmission
    const serializedPowerUps: { [id: string]: any } = {};
    for (const [id, powerUp] of this.powerUps) {
      serializedPowerUps[id] = powerUp.serialize();
    }

    const gameState: GameState = {
      players: serializedPlayers,
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
    };

    this.server.emit("gameState", gameState);
  }
}
