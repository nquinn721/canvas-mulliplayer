import { OnModuleDestroy } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
  DestructibleWall,
  EnvironmentalObstacle,
  GameState,
  Laser,
  Meteor,
  Missile,
  ObstacleType,
  Player,
  PowerUp,
  Projectile,
  SwarmBase,
  Wall,
  WallType,
  XP_REWARDS,
  calculateExplosionDamage,
  calculateWeaponDamage,
  getSwarmBaseConfigForDifficulty,
  getSwarmBaseSpawnConfig,
  getSwarmConfig,
  shouldTriggerChainReaction,
} from "@shared";
import { EnhancedAIEnemy } from "@shared/classes/EnhancedAIEnemy";
import { PowerUpType } from "@shared/classes/PowerUp";
import { SwarmAI } from "@shared/classes/SwarmAI";
import { Server, Socket } from "socket.io";
import { AuthService } from "../services/auth.service";
import { ErrorLoggerService } from "../services/error-logger.service";

interface KeyState {
  w?: boolean;
  a?: boolean;
  s?: boolean;
  d?: boolean;
  [key: string]: boolean | undefined;
}

interface ClientData {
  lastHeartbeat: number;
  playerName?: string;
  userId?: string;
  isAuthenticated?: boolean;
  isGuest?: boolean;
}

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.CLIENT_URL || "https://your-cloud-run-url.com"]
        : [
            "http://localhost:5173", // Default Vite dev server
            "http://localhost:5174", // Alternative Vite dev server port
            /^http:\/\/localhost:\d+$/, // Allow any localhost port in development
          ],
    methods: ["GET", "POST"],
  },
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private players: Map<string, Player> = new Map();
  private aiEnemies: Map<string, EnhancedAIEnemy> = new Map();
  private swarmEnemies: Map<string, SwarmAI> = new Map();
  private swarmBases: Map<string, SwarmBase> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  private meteors: Map<string, Meteor> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private walls: Wall[] = [];
  private destructibleWalls: Map<string, DestructibleWall> = new Map();
  private environmentalObstacles: Map<string, EnvironmentalObstacle> =
    new Map();
  private gameLoopInterval: NodeJS.Timeout;
  private projectileIdCounter = 0;
  private powerUpIdCounter = 0;
  private playerNameCounter = 1;
  private aiEnemyCounter = 1;
  private lastMeteorSpawn = Date.now();
  private meteorSpawnInterval = 8000; // 8 seconds
  private lastSwarmSpawn = 0; // Track when we last spawned swarms
  private swarmSpawnInterval = 15000; // 15 seconds minimum between swarm spawns (increased from 8)

  // World bounds
  private readonly WORLD_WIDTH = 5000;
  private readonly WORLD_HEIGHT = 5000;
  private readonly WALL_COUNT = 40; // Reduced regular walls
  private readonly DESTRUCTIBLE_WALL_COUNT = 15; // New destructible walls
  private readonly OBSTACLE_COUNT = 10; // Environmental obstacles
  private readonly POWERUP_COUNT = 20;
  private readonly AI_ENEMY_COUNT = 5; // Number of AI enemies to spawn
  private preferredAIDifficulty:
    | "EASY"
    | "MEDIUM"
    | "HARD"
    | "EXPERT"
    | "NIGHTMARE" = "MEDIUM"; // Default difficulty
  private lastDifficultyChangeBy: string | null = null; // Track who last changed difficulty
  private difficultyChangeTimestamp: number = 0; // When was it last changed
  private readonly DIFFICULTY_CHANGE_COOLDOWN = 500; // 0.5 seconds cooldown between changes (reduced for faster testing)
  private gameLoopActive: boolean = false; // Track if game loop should be running

  private readonly connectedClients = new Map<string, ClientData>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds

  constructor(
    private readonly errorLogger: ErrorLoggerService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {
    this.generateWalls();
    this.spawnPowerUps();
    this.spawnAIEnemies();
    this.spawnSwarmBases(); // Spawn 5 swarm bases
    // Swarm enemies now spawn only from bases
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    // Don't start game loop until players join
  }

  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const clientsToRemove: string[] = [];

      this.connectedClients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          console.log(`Client ${clientId} timed out - removing`);
          clientsToRemove.push(clientId);
        }
      });

      clientsToRemove.forEach((clientId) => {
        this.connectedClients.delete(clientId);
        if (this.players.has(clientId)) {
          this.players.delete(clientId);
          this.broadcastGameState();
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  async handleConnection(client: Socket) {
    try {
      console.log(`Client connected: ${client.id}`);

      // Try to authenticate the user if token is provided
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      console.log(
        `Token received for client ${client.id}:`,
        token ? `${token.substring(0, 20)}...` : "No token"
      );

      let authenticatedUser = null;
      let isGuest = true;

      if (token) {
        try {
          // Check if it's a guest token first
          if (token.startsWith("guest_token_")) {
            // Handle guest token - just establish guest status
            // The actual username will be provided in the joinGame event
            authenticatedUser = {
              id: token, // Use the token itself as the ID for consistency
              username: "Guest", // Placeholder, will be updated in joinGame
              isGuest: true,
            };
            isGuest = true;
          } else {
            // Try to verify as a real JWT token
            const payload = this.jwtService.verify(token);
            if (payload.sub.startsWith("guest_")) {
              // Guest user with token
              authenticatedUser = {
                id: payload.sub,
                username: payload.username,
                isGuest: true,
              };
              isGuest = true;
            } else {
              // Regular authenticated user
              authenticatedUser = await this.authService.getUserById(
                payload.sub
              );
              isGuest = false;
            }
          }
        } catch (error) {
          console.log(`Invalid token for client ${client.id}:`, error.message);
          // Continue as anonymous user
        }
      } else {
        // No token provided - treat as anonymous guest
        console.log(
          `No token provided for client ${client.id}, treating as anonymous guest`
        );
        authenticatedUser = {
          id: `anonymous_${client.id}`,
          username: "Anonymous Guest",
          isGuest: true,
        };
        isGuest = true;
      }

      // Track connection with authentication data
      this.connectedClients.set(client.id, {
        lastHeartbeat: Date.now(),
        userId: authenticatedUser?.id,
        playerName:
          authenticatedUser?.displayName || authenticatedUser?.username,
        isAuthenticated: !!authenticatedUser,
        isGuest: isGuest,
      });

      // Only emit player ID once per connection
      client.emit("playerId", client.id);

      // Emit authentication status
      client.emit("authStatus", {
        isAuthenticated: !!authenticatedUser,
        isGuest: isGuest,
        username: authenticatedUser?.username,
        displayName: authenticatedUser?.displayName,
        userId: authenticatedUser?.id,
      });

      // Set up heartbeat for this client
      client.on("heartbeat", () => {
        const clientData = this.connectedClients.get(client.id);
        if (clientData) {
          clientData.lastHeartbeat = Date.now();
        }
      });
    } catch (error) {
      this.errorLogger.logWebSocketError(error, client.id, "connection");
    }
  }

  @SubscribeMessage("joinGame")
  handleJoinGame(
    @MessageBody() data: { playerName?: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      console.log(`Player attempting to join game: ${client.id}`);
      console.log(`Received playerName from client: "${data.playerName}"`);
      const clientData = this.connectedClients.get(client.id);
      console.log(`Client data:`, {
        isAuthenticated: clientData?.isAuthenticated,
        isGuest: clientData?.isGuest,
        storedPlayerName: clientData?.playerName,
      });

      // Determine player name priority: provided name for guests, authenticated username for logged in users
      let playerName: string;

      if (
        clientData?.isAuthenticated &&
        !clientData.isGuest &&
        clientData.playerName
      ) {
        // Use authenticated username as ship name (only for non-guest authenticated users)
        playerName = clientData.playerName;
      } else if (data.playerName) {
        // Use provided player name (for guests or override)
        playerName = data.playerName;
      } else {
        // Generate default name
        playerName = `Player ${this.playerNameCounter++}`;
      }

      console.log(`Final determined playerName: "${playerName}"`);

      // Update client tracking with final player name
      if (clientData) {
        clientData.playerName = playerName;
      }

      // Check if player already exists (reconnection case)
      let player = this.players.get(client.id);
      if (player) {
        // For guest users with different names, treat as new player (force respawn)
        if (clientData?.isGuest && player.name !== playerName) {
          console.log(
            `Guest user ${player.name} changing name to ${playerName} - creating new player`
          );
          // Remove old player
          this.players.delete(client.id);
          // Create new player with fresh properties
          const spawnPosition = this.getRandomSpawnPosition();
          player = new Player(
            client.id,
            playerName,
            spawnPosition.x,
            spawnPosition.y
          );
          this.players.set(client.id, player);
          console.log(
            `${playerName} joined as new guest player at (${spawnPosition.x}, ${spawnPosition.y})`
          );
        } else {
          // Normal reconnection, just update the name if needed
          player.name = playerName;
          console.log(`${playerName} reconnected`);
        }
      } else {
        // New player joining
        const spawnPosition = this.getRandomSpawnPosition();
        player = new Player(
          client.id,
          playerName,
          spawnPosition.x,
          spawnPosition.y
        );
        this.players.set(client.id, player);
        console.log(
          `${playerName} joined the game at (${spawnPosition.x}, ${spawnPosition.y})`
        );
      }

      // Check if we should start the game loop when first player joins
      this.checkGameLoopState();

      // Swarm bases will spawn swarms automatically - no need for manual spawning

      // Send current AI difficulty status to the new player
      client.emit("aiDifficultyStatus", {
        currentDifficulty: this.preferredAIDifficulty,
        lastChangedBy: this.lastDifficultyChangeBy,
        changeTimestamp: this.difficultyChangeTimestamp,
        aiEnemyCount: this.aiEnemies.size,
        availableDifficulties: [
          "EASY",
          "MEDIUM",
          "HARD",
          "EXPERT",
          "NIGHTMARE",
        ],
      });

      this.broadcastGameState();
    } catch (error) {
      this.errorLogger.logGameLogicError(error, {
        playerId: client.id,
        playerName: data?.playerName,
        context: "joinGame",
        playerCount: this.players.size,
      });
    }
  }

  @SubscribeMessage("updateUsername")
  async handleUpdateUsername(
    @MessageBody() data: { newUsername: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);

      if (!clientData?.isAuthenticated || clientData.isGuest) {
        client.emit("error", {
          message: "Only authenticated users can change usernames",
        });
        return;
      }

      // Update username in database
      try {
        await this.authService.updateUsername(clientData.userId!, {
          username: data.newUsername,
        });

        // Update local client data
        clientData.playerName = data.newUsername;

        // Update player name in game
        const player = this.players.get(client.id);
        if (player) {
          player.name = data.newUsername;
        }

        // Notify client of successful update
        client.emit("usernameUpdated", {
          newUsername: data.newUsername,
          message: "Username updated successfully",
        });

        // Broadcast updated game state so other players see the new name
        this.broadcastGameState();
      } catch (error) {
        client.emit("error", {
          message: error.message || "Failed to update username",
        });
      }
    } catch (error) {
      this.errorLogger.logWebSocketError(error, client.id, "updateUsername");
    }
  }

  @SubscribeMessage("updateDisplayName")
  async handleUpdateDisplayName(
    @MessageBody() data: { newDisplayName: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);

      if (!clientData?.isAuthenticated || clientData.isGuest) {
        client.emit("error", {
          message: "Only authenticated users can change display names",
        });
        return;
      }

      // Update display name in database
      try {
        await this.authService.updateDisplayName(clientData.userId!, {
          displayName: data.newDisplayName,
        });

        // Update local client data to use display name as ship name
        clientData.playerName = data.newDisplayName;

        // Update player name in game
        const player = this.players.get(client.id);
        if (player) {
          player.name = data.newDisplayName;
        }

        // Notify client of successful update
        client.emit("displayNameUpdated", {
          newDisplayName: data.newDisplayName,
          message: "Display name updated successfully",
        });

        // Broadcast updated game state so other players see the new name
        this.broadcastGameState();
      } catch (error) {
        client.emit("error", {
          message: error.message || "Failed to update display name",
        });
      }
    } catch (error) {
      this.errorLogger.logWebSocketError(error, client.id, "updateDisplayName");
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const player = this.players.get(client.id);
      const playerName = player ? player.name : client.id;
      console.log(`${playerName} disconnected`);

      // Remove from tracking
      this.connectedClients.delete(client.id);
      this.players.delete(client.id);

      // Check if we should pause the game loop when no real players are connected
      this.checkGameLoopState();

      this.broadcastGameState();
    } catch (error) {
      this.errorLogger.logWebSocketError(error, client.id, "disconnect");
    }
  }

  // Cleanup method called when the module is destroyed
  onModuleDestroy() {
    console.log("GameGateway: Cleaning up resources...");

    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear all maps to prevent memory leaks
    this.players.clear();
    this.connectedClients.clear();
    this.aiEnemies.clear();
    this.swarmEnemies.clear();
    this.projectiles.clear();
    this.meteors.clear();
    this.powerUps.clear();
    this.walls = [];

    this.gameLoopActive = false;
    console.log("GameGateway: Cleanup completed");
  }

  // Check if game loop should be running based on player count
  private checkGameLoopState() {
    const hasRealPlayers = this.players.size > 0;

    if (hasRealPlayers && !this.gameLoopActive) {
      console.log("Starting game loop - real players connected");
      this.startGameLoop();
    } else if (!hasRealPlayers && this.gameLoopActive) {
      console.log("Pausing game loop - no real players connected");
      this.pauseGameLoop();
    }
  }

  // Pause the game loop to save resources
  private pauseGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.gameLoopActive = false;
  }

  @SubscribeMessage("input")
  handleInput(
    @MessageBody() data: KeyState & { inputId?: number; angle?: number },
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const deltaTime = 16; // Approximate 60 FPS
    const keys = data;

    // Update player angle if provided
    if (data.angle !== undefined) {
      player.updateAngle(data.angle);
    }

    // Handle boost mechanics
    if (keys.shift && player.canUseBoost()) {
      player.activateBoost();
    } else {
      player.deactivateBoost();
    }
    // Remove roll animation update - no longer needed

    // Update strafe velocity and get movement delta
    const strafeMovement = player.updateStrafeVelocity(deltaTime / 1000);

    // Calculate move speed with boost multiplier
    const baseSpeed = player.speed * (deltaTime / 1000);
    const boostMultiplier = player.getBoostMultiplier();
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

    // A/D for slow continuous strafing (no cooldown, continuous movement)
    let continuousStrafeX = 0;
    let continuousStrafeY = 0;
    if (keys.a) {
      const slowStrafe = player.applyContinuousStrafe(-1, deltaTime / 1000);
      continuousStrafeX += slowStrafe.deltaX;
      continuousStrafeY += slowStrafe.deltaY;
    }
    if (keys.d) {
      const slowStrafe = player.applyContinuousStrafe(1, deltaTime / 1000);
      continuousStrafeX += slowStrafe.deltaX;
      continuousStrafeY += slowStrafe.deltaY;
    }

    // Q/E for fast strafe impulse (with cooldown, like the old A/D)
    if (keys.q) {
      // Apply strafe impulse to the left if not already strafing or cooldown available
      if (player.canRoll(currentTime)) {
        player.applyStrafe(-1);
        player.lastRollTime = currentTime; // Update cooldown time
      }
    }
    if (keys.e) {
      // Apply strafe impulse to the right if not already strafing or cooldown available
      if (player.canRoll(currentTime)) {
        player.applyStrafe(1);
        player.lastRollTime = currentTime; // Update cooldown time
      }
    }

    // Add continuous strafe to the total movement
    deltaX += continuousStrafeX;
    deltaY += continuousStrafeY;

    // Use Player class method to update position with collision checking
    player.updatePosition(
      deltaX,
      deltaY,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT,
      (x, y, radius) => this.checkWallCollision(x, y, radius)
    );

    this.players.set(client.id, player);

    // Send input acknowledgment for reconciliation
    if (data.inputId !== undefined) {
      client.emit("inputAck", {
        inputId: data.inputId,
        serverPosition: { x: player.x, y: player.y, angle: player.angle },
      });
    }
  }

  @SubscribeMessage("ping")
  handlePing(
    @MessageBody() timestamp: number,
    @ConnectedSocket() client: Socket
  ) {
    // Simple ping/pong for latency measurement
    client.emit("pong", timestamp);
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
      const missileStats = player.getMissileStats();
      if (!player.canShootMissile(currentTime, missileStats.cooldown)) {
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

  @SubscribeMessage("flash")
  handleFlash(
    @MessageBody() data: { mouseX: number; mouseY: number },
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const currentTime = Date.now();

    // Check if flash is available
    if (!player.canFlash(currentTime)) {
      return; // Still on cooldown
    }

    const originalX = player.x;
    const originalY = player.y;

    // Perform the flash teleportation
    const flashResult = player.flashTeleport(
      data.mouseX,
      data.mouseY,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT,
      (x, y, radius) => this.checkWallCollision(x, y, radius)
    );

    if (flashResult.success) {
      // Update player in the map
      this.players.set(client.id, player);

      // Emit flash completed event with positions for particle effects
      this.server.emit("flashCompleted", {
        playerId: client.id,
        fromX: originalX,
        fromY: originalY,
        toX: player.x,
        toY: player.y,
      });
    }
  }

  @SubscribeMessage("resetAbilities")
  handleResetAbilities(@ConnectedSocket() client: Socket) {
    const player = this.players.get(client.id);
    if (!player) return;

    // Reset all ability levels to their starting values
    player.laserUpgradeLevel = 1;
    player.missileUpgradeLevel = 1;
    player.flashUpgradeLevel = 1;
    player.boostUpgradeLevel = 0;

    // Reset boost expiration
    player.boostUpgradeExpiration = 0;

    // Update player in the map
    this.players.set(client.id, player);

    // Emit abilities reset event
    this.server.emit("abilitiesReset", {
      playerId: client.id,
    });
  }

  @SubscribeMessage("changeAIDifficulty")
  handleChangeAIDifficulty(
    @MessageBody()
    data: { difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE" },
    @ConnectedSocket() client: Socket
  ) {
    const currentTime = Date.now();
    const player = this.players.get(client.id);
    const playerName = player?.name || `Player ${client.id.substring(0, 6)}`;

    console.log(
      `${playerName} requested AI difficulty change to ${data.difficulty}`
    );

    // Check cooldown to prevent spam, but allow same player to change immediately
    if (
      this.lastDifficultyChangeBy &&
      this.lastDifficultyChangeBy !== playerName && // Allow same player to change immediately
      currentTime - this.difficultyChangeTimestamp <
        this.DIFFICULTY_CHANGE_COOLDOWN
    ) {
      const remainingCooldown = Math.ceil(
        (this.DIFFICULTY_CHANGE_COOLDOWN -
          (currentTime - this.difficultyChangeTimestamp)) /
          1000
      );

      client.emit("aiDifficultyChangeRejected", {
        reason: "cooldown",
        message: `AI difficulty was recently changed by another player. Please wait ${remainingCooldown} seconds.`,
        remainingCooldown: remainingCooldown,
        currentDifficulty: this.preferredAIDifficulty,
        lastChangedBy: this.lastDifficultyChangeBy,
      });
      return;
    }

    // Update existing AI enemies with new difficulty
    let changedCount = 0;
    this.aiEnemies.forEach((aiEnemy) => {
      aiEnemy.setDifficulty(data.difficulty);
      changedCount++;
    });

    // Store the preferred difficulty for new AI spawns
    const previousDifficulty = this.preferredAIDifficulty;
    this.preferredAIDifficulty = data.difficulty;
    this.lastDifficultyChangeBy = playerName;
    this.difficultyChangeTimestamp = currentTime;

    console.log(
      `${playerName} changed difficulty for ${changedCount} AI enemies from ${previousDifficulty} to ${data.difficulty}`
    );

    // Broadcast the change to ALL players (not just the requester)
    this.server.emit("aiDifficultyChanged", {
      difficulty: data.difficulty,
      previousDifficulty: previousDifficulty,
      changedBy: playerName,
      affectedEnemies: changedCount,
      timestamp: currentTime,
    });

    // Send special confirmation to the player who made the change
    client.emit("aiDifficultyChangeConfirmed", {
      difficulty: data.difficulty,
      previousDifficulty: previousDifficulty,
      affectedEnemies: changedCount,
    });
  }

  @SubscribeMessage("getAIDifficultyStatus")
  handleGetAIDifficultyStatus(@ConnectedSocket() client: Socket) {
    client.emit("aiDifficultyStatus", {
      currentDifficulty: this.preferredAIDifficulty,
      lastChangedBy: this.lastDifficultyChangeBy,
      changeTimestamp: this.difficultyChangeTimestamp,
      aiEnemyCount: this.aiEnemies.size,
      availableDifficulties: ["EASY", "MEDIUM", "HARD", "EXPERT", "NIGHTMARE"],
    });
  }

  @SubscribeMessage("respawn")
  handleRespawn(
    @MessageBody() data: { playerName: string },
    @ConnectedSocket() client: Socket
  ) {
    const player = this.players.get(client.id);
    if (!player) {
      console.log(`No player found for respawn request from ${client.id}`);
      return;
    }

    // Only allow respawn if player is actually dead
    if (player.isAlive()) {
      console.log(`Player ${player.name} tried to respawn while still alive`);
      return;
    }

    // Find a safe spawn location
    const spawnLocation = this.findSafeSpawnLocation();

    // Reset player to full health and move to spawn location
    player.x = spawnLocation.x;
    player.y = spawnLocation.y;
    player.health = player.maxHealth;
    player.boostEnergy = player.maxBoostEnergy;

    // Reset any temporary effects but keep upgrades
    player.shieldHealth = 0;
    player.hasShield = false;
    player.shieldExpiration = 0;

    console.log(
      `Player ${player.name} respawned at (${spawnLocation.x}, ${spawnLocation.y})`
    );

    // Notify all clients about the respawn
    this.server.emit("playerRespawned", {
      playerId: client.id,
      playerName: player.name,
      x: player.x,
      y: player.y,
    });
  }

  @SubscribeMessage("clientDebugLogs")
  handleClientDebugLogs(
    @MessageBody() data: { logs: any[]; clientInfo: any },
    @ConnectedSocket() client: Socket
  ) {
    try {
      // Process each debug log from the client
      for (const logEntry of data.logs) {
        this.errorLogger.logError({
          type: "GAME_LOGIC",
          severity: logEntry.severity || "MEDIUM",
          message: `CLIENT DEBUG: ${logEntry.message}`,
          metadata: {
            clientId: client.id,
            logType: logEntry.type,
            originalMetadata: logEntry.metadata,
            clientInfo: data.clientInfo,
            timestamp: logEntry.timestamp,
          },
        });
      }

      console.log(
        `Received ${data.logs.length} debug logs from client ${client.id}`
      );
    } catch (error) {
      console.error("Failed to process client debug logs:", error);
    }
  }

  private findSafeSpawnLocation(): { x: number; y: number } {
    const WORLD_WIDTH = 5000;
    const WORLD_HEIGHT = 5000;
    const SAFE_DISTANCE = 200; // Minimum distance from other entities
    const MAX_ATTEMPTS = 50;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const x = Math.random() * (WORLD_WIDTH - 200) + 100;
      const y = Math.random() * (WORLD_HEIGHT - 200) + 100;

      let isSafe = true;

      // Check distance from other players
      for (const otherPlayer of this.players.values()) {
        if (otherPlayer.isAlive()) {
          const distance = Math.sqrt(
            (x - otherPlayer.x) ** 2 + (y - otherPlayer.y) ** 2
          );
          if (distance < SAFE_DISTANCE) {
            isSafe = false;
            break;
          }
        }
      }

      // Check distance from AI enemies
      if (isSafe) {
        for (const aiEnemy of this.aiEnemies.values()) {
          const distance = Math.sqrt(
            (x - aiEnemy.x) ** 2 + (y - aiEnemy.y) ** 2
          );
          if (distance < SAFE_DISTANCE) {
            isSafe = false;
            break;
          }
        }
      }

      if (isSafe) {
        return { x, y };
      }
    }

    // If no safe location found, spawn at world center
    return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
  }

  private startGameLoop() {
    try {
      // Don't start if already active
      if (this.gameLoopActive) {
        return;
      }

      console.log("STARTING GAME LOOP - Real players connected!");

      this.gameLoopInterval = setInterval(() => {
        try {
          this.updateGame();
          this.broadcastGameState();
        } catch (error) {
          this.errorLogger.logGameLogicError(error, {
            context: "gameLoop",
            playerCount: this.players.size,
            aiEnemyCount: this.aiEnemies.size,
            projectileCount: this.projectiles.size,
          });
        }
      }, 16); // ~60 FPS

      this.gameLoopActive = true;
    } catch (error) {
      this.errorLogger.logGameLogicError(error, {
        context: "startGameLoop",
        playerCount: this.players.size,
      });
    }
  }

  private updateGame() {
    const deltaTime = 16;

    // Skip expensive operations if no real players are connected
    const hasRealPlayers = this.players.size > 0;

    // Debug logging every few seconds
    const currentTime = Date.now();
    if (currentTime % 5000 < 20) {
      // Log every ~5 seconds
      console.log(`=== GAME UPDATE ===`);
      console.log(
        `Players: ${this.players.size}, Swarms: ${this.swarmEnemies.size}, AI: ${this.aiEnemies.size}`
      );
      console.log(`Real players present: ${hasRealPlayers}`);
      console.log(`===================`);
    }

    // Update player shields
    this.players.forEach((player) => {
      player.updateShield();
    });

    // Update AI enemies (only if we have real players to interact with)
    if (hasRealPlayers) {
      this.updateAIEnemies(deltaTime);
      this.updateSwarmEnemies(deltaTime);
    }

    // Update destructible objects and their particles
    this.updateDestructibleObjects(deltaTime);

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

      // Check wall and destructible object collisions
      const collisionResult = this.checkProjectileWallCollision(projectile);
      if (collisionResult.collision) {
        projectilesToRemove.push(id);

        if (collisionResult.regularWall) {
          // Hit regular wall
          this.server.emit("projectileHit", {
            projectileId: id,
            x: projectile.x,
            y: projectile.y,
            wallHit: true,
          });
        } else if (collisionResult.destructibleWall) {
          // Hit destructible wall
          this.handleDestructibleWallHit(
            projectile,
            collisionResult.destructibleWall
          );
        } else if (collisionResult.obstacle) {
          // Hit environmental obstacle
          this.handleObstacleHit(projectile, collisionResult.obstacle);
        }
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
                killer.addExperience(XP_REWARDS.playerKill); // 50 XP for player kill
                console.log(
                  `Player ${killer.name} killed ${player.name} and gained ${XP_REWARDS.playerKill} XP`
                );

                // Emit kill event to the killer
                this.server.to(killer.id).emit("playerKill", {
                  killType: "player",
                  victim: player.name,
                  xpGained: XP_REWARDS.playerKill,
                });
              }
            }

            // Player is dead - they will need to use death menu to respawn
            // Don't auto-respawn here anymore
          }

          projectilesToRemove.push(id);
          this.server.emit("projectileHit", {
            projectileId: id,
            x: projectile.x,
            y: projectile.y,
            targetId: playerId,
            damage: projectile.damage,
            ownerId: projectile.ownerId,
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
            // Give XP to the killer (if it's a player's projectile)
            const killer = this.players.get(projectile.ownerId);
            if (killer) {
              killer.addExperience(XP_REWARDS.aiEnemyKill); // 20 XP for killing AI enemy
              console.log(
                `Player ${killer.name} killed AI enemy and gained ${XP_REWARDS.aiEnemyKill} XP`
              );

              // Emit kill event to the killer
              this.server.to(killer.id).emit("playerKill", {
                killType: "ai",
                victim: "AI Enemy",
                xpGained: XP_REWARDS.aiEnemyKill,
              });
            }

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
            damage: projectile.damage,
            ownerId: projectile.ownerId,
          });
        }
      });

      // Check swarm base collisions
      this.swarmBases.forEach((base, baseId) => {
        if (base.isDestroyed) return;

        const distance = Math.sqrt(
          (base.x - projectile.x) ** 2 + (base.y - projectile.y) ** 2
        );

        if (distance <= base.radius) {
          // Base was hit
          const wasDestroyed = base.takeDamage(projectile.damage);

          if (wasDestroyed) {
            console.log(`Swarm base ${baseId} destroyed!`);

            // Remove all swarms from this base using the proper cleanup function
            const swarmsToRemove: string[] = [];
            this.swarmEnemies.forEach((swarm, swarmId) => {
              if (swarm.baseId === baseId) {
                swarmsToRemove.push(swarmId);
              }
            });

            swarmsToRemove.forEach((swarmId) => {
              this.removeSwarmEnemy(swarmId);
            });

            // Clear the base's swarm tracking (redundant but ensures consistency)
            base.spawnedSwarms.clear();

            // Give XP to the killer
            const killer = this.players.get(projectile.ownerId);
            if (killer) {
              // Use the base's configured XP reward
              killer.addExperience(base.xpReward);
              console.log(
                `Player ${killer.name} destroyed swarm base and gained ${base.xpReward} XP`
              );

              // Emit kill event to the killer
              this.server.to(killer.id).emit("playerKill", {
                killType: "swarmBase",
                victim: "Swarm Base",
                xpGained: base.xpReward,
              });
            }
          }

          projectilesToRemove.push(id);
          this.server.emit("projectileHit", {
            projectileId: id,
            x: projectile.x,
            y: projectile.y,
            targetId: baseId,
            damage: projectile.damage,
            ownerId: projectile.ownerId,
          });
        }
      });
    });

    // Remove expired projectiles
    projectilesToRemove.forEach((id) => {
      this.projectiles.delete(id);
    });

    // Update meteors (only spawn new ones if we have real players)
    this.updateMeteors(deltaTime, hasRealPlayers);

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
          } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
            canCollect = player.canPickupShield();
          }

          if (canCollect) {
            // Apply upgrade to player based on type and check if successful
            let powerUpApplied = true;

            if (powerUp.type === PowerUpType.BOOST_UPGRADE) {
              player.applyBoostUpgrade();
            } else if (powerUp.type === PowerUpType.LASER_UPGRADE) {
              player.applyLaserUpgrade();
            } else if (powerUp.type === PowerUpType.MISSILE_UPGRADE) {
              player.applyMissileUpgrade();
            } else if (powerUp.type === PowerUpType.FLASH_UPGRADE) {
              player.applyFlashUpgrade();
            } else if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
              powerUpApplied = player.applyHealthPickup();
            } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
              powerUpApplied = player.applyShield();
            }

            // Only collect the power-up if it was successfully applied
            if (powerUpApplied) {
              powerUp.collect();

              this.server.emit("powerUpCollected", {
                powerUpId: powerUpId,
                playerId: playerId,
                type: powerUp.type,
              });
            }
          }
        }
      });
    });
  }

  private updateAIEnemies(deltaTime: number) {
    this.aiEnemies.forEach((aiEnemy, aiId) => {
      // Update AI behavior with enhanced pathfinding
      aiEnemy.updateAI(
        deltaTime,
        this.players,
        this.WORLD_WIDTH,
        this.WORLD_HEIGHT,
        this.walls,
        (x, y, radius) => this.checkWallCollision(x, y, radius)
      );

      // Check if AI wants to shoot using enhanced line-of-sight system
      const shootingDecision = aiEnemy.getShootingInfo(
        this.players,
        this.walls
      );
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
            damage: projectile.damage,
            ownerId: projectile.ownerId,
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
          } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
            canCollect = aiEnemy.canPickupShield();
          }

          if (canCollect) {
            // Apply upgrade to AI based on type and check if successful
            let powerUpApplied = true;

            if (powerUp.type === PowerUpType.BOOST_UPGRADE) {
              aiEnemy.applyBoostUpgrade();
            } else if (powerUp.type === PowerUpType.LASER_UPGRADE) {
              aiEnemy.applyLaserUpgrade();
            } else if (powerUp.type === PowerUpType.MISSILE_UPGRADE) {
              aiEnemy.applyMissileUpgrade();
            } else if (powerUp.type === PowerUpType.FLASH_UPGRADE) {
              aiEnemy.applyFlashUpgrade();
            } else if (powerUp.type === PowerUpType.HEALTH_PICKUP) {
              powerUpApplied = aiEnemy.applyHealthPickup();
            } else if (powerUp.type === PowerUpType.SHIELD_PICKUP) {
              powerUpApplied = aiEnemy.applyShield();
            }

            // Only collect the power-up if it was successfully applied
            if (powerUpApplied) {
              powerUp.collect();

              this.server.emit("powerUpCollected", {
                powerUpId: powerUpId,
                playerId: aiId,
                type: powerUp.type,
              });
            }
          }
        }
      });
    });
  }

  private findClosestPlayerToAI(aiEnemy: EnhancedAIEnemy): Player | null {
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
    aiEnemy: EnhancedAIEnemy,
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

  private updateSwarmEnemies(deltaTime: number) {
    const currentTime = Date.now();

    // Update swarm bases and spawn new swarms
    this.updateSwarmBases(currentTime);

    // Update existing swarm enemies
    this.swarmEnemies.forEach((swarmEnemy, swarmId) => {
      // Create swarm context for AI behavior
      const swarmContext = {
        deltaTime,
        players: this.players,
        swarmMembers: this.swarmEnemies,
        worldWidth: this.WORLD_WIDTH,
        worldHeight: this.WORLD_HEIGHT,
        walls: this.walls,
        checkWallCollision: (x: number, y: number, radius: number) =>
          this.checkWallCollision(x, y, radius),
        closestPlayer: this.findClosestPlayerToSwarm(swarmEnemy),
        distanceToPlayer: 0,
        currentTime,
      };

      // Calculate distance to closest player
      if (swarmContext.closestPlayer) {
        swarmContext.distanceToPlayer = Math.sqrt(
          Math.pow(swarmContext.closestPlayer.x - swarmEnemy.x, 2) +
            Math.pow(swarmContext.closestPlayer.y - swarmEnemy.y, 2)
        );
      } else {
        swarmContext.distanceToPlayer = Infinity;
      }

      // Update swarm AI behavior
      swarmEnemy.update(swarmContext);

      // Check for attack collisions with players
      this.players.forEach((player, playerId) => {
        if (player.health <= 0) return;

        const distance = Math.sqrt(
          Math.pow(player.x - swarmEnemy.x, 2) +
            Math.pow(player.y - swarmEnemy.y, 2)
        );

        // Swarm enemies attack when within attack range (not just collision)
        const attackRange = swarmEnemy.getAttackRange();
        if (distance <= attackRange) {
          // Check attack cooldown using swarm's lastAttackTime
          const currentTime = Date.now();
          const timeSinceLastAttack = currentTime - swarmEnemy.lastAttackTime;
          const attackCooldown = swarmEnemy.getAttackCooldown();

          // Balanced attack logic - reasonable cooldown requirement
          const shouldAttack =
            timeSinceLastAttack >= attackCooldown * 0.8 || // Need 80% of cooldown (96ms instead of 120ms)
            swarmEnemy.lastAttackTime === 0;

          // Only log attacks when they actually execute (reduce spam)
          if (shouldAttack) {
            console.log(
              `[SWARM ATTACK] ${swarmId} attacking ${player.name}: distance=${distance.toFixed(1)}, damage=${swarmEnemy.calculateAttackDamage()}`
            );
          }

          if (shouldAttack) {
            const damage = swarmEnemy.calculateAttackDamage();
            const wasKilled = player.takeDamage(damage);

            // Update last attack time
            swarmEnemy.lastAttackTime = currentTime;

            console.log(
              `[SWARM ATTACK EXECUTED] ${swarmId} hit player ${player.name} for ${damage} damage! Player health: ${player.health}`
            );

            // Emit damage event
            this.server.emit("playerDamaged", {
              playerId,
              damage,
              attackerId: swarmId,
              attackerType: "swarm",
              x: player.x,
              y: player.y,
            });

            // If player was killed, give XP to all nearby swarm enemies
            if (wasKilled) {
              // Player was killed by swarm - could add logging here if needed
            }

            // Push swarm enemy back slightly to prevent spam damage
            const pushAngle = Math.atan2(
              swarmEnemy.y - player.y,
              swarmEnemy.x - player.x
            );
            const pushDistance = 3; // Minimal push distance for maximum aggression
            swarmEnemy.x += Math.cos(pushAngle) * pushDistance;
            swarmEnemy.y += Math.sin(pushAngle) * pushDistance;
          }
        }
      });

      // Check projectile collisions with swarm enemies
      this.projectiles.forEach((projectile, projectileId) => {
        if (projectile.ownerId === swarmId) return; // Don't hit own shots

        if (swarmEnemy.containsPoint(projectile.x, projectile.y)) {
          // Take damage
          swarmEnemy.takeDamage(projectile.damage);

          // Award XP to shooter if swarm dies
          if (swarmEnemy.health <= 0) {
            const shooterPlayer = this.players.get(projectile.ownerId);
            if (shooterPlayer) {
              // Award XP for killing swarm enemy (configured amount)
              shooterPlayer.addExperience(XP_REWARDS.swarmEnemyKill);

              // Emit kill event for client notification
              this.server.emit("enemyKilled", {
                killerId: projectile.ownerId,
                killerName: shooterPlayer.name,
                targetId: swarmId,
                targetType: "swarm",
                xpGained: XP_REWARDS.swarmEnemyKill,
              });
            }

            // Remove dead swarm enemy (properly removes from base tracking too)
            this.removeSwarmEnemy(swarmId);

            // Dynamic spawning will handle creating new swarms when needed
          }

          this.projectiles.delete(projectileId);
          this.server.emit("projectileHit", {
            projectileId: projectileId,
            x: projectile.x,
            y: projectile.y,
            targetId: swarmId,
            damage: projectile.damage,
            ownerId: projectile.ownerId,
          });
        }
      });
    });

    // Cleanup swarm enemies that are too far from all players
    this.cleanupDistantSwarmEnemies();
  }

  private cleanupDistantSwarmEnemies() {
    const maxDistanceFromAnyPlayer = 2000; // Increased significantly - only cleanup swarms that are very far
    const swarmsToRemove: string[] = [];

    this.swarmEnemies.forEach((swarmEnemy, swarmId) => {
      let closestPlayerDistance = Infinity;

      // Find closest player to this swarm enemy
      this.players.forEach((player) => {
        if (player.health <= 0) return;

        const distance = Math.sqrt(
          Math.pow(player.x - swarmEnemy.x, 2) +
            Math.pow(player.y - swarmEnemy.y, 2)
        );

        if (distance < closestPlayerDistance) {
          closestPlayerDistance = distance;
        }
      });

      // Mark for removal if too far from all players
      if (closestPlayerDistance > maxDistanceFromAnyPlayer) {
        swarmsToRemove.push(swarmId);
      }
    });

    // Remove distant swarm enemies
    swarmsToRemove.forEach((swarmId) => {
      this.removeSwarmEnemy(swarmId);
    });
  }

  private maintainMinimumSwarmCount() {
    // Swarms now spawn only from bases - this method is disabled
    return;
  }

  private findClosestPlayerToSwarm(swarmEnemy: SwarmAI): Player | null {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    this.players.forEach((player) => {
      if (player.health <= 0) return; // Skip dead players

      const distance = Math.sqrt(
        Math.pow(player.x - swarmEnemy.x, 2) +
          Math.pow(player.y - swarmEnemy.y, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });

    return closestPlayer;
  }

  private updateSwarmBases(currentTime: number) {
    this.swarmBases.forEach((base, baseId) => {
      if (base.isDestroyed) return;

      // Check if base should spawn a new swarm
      if (base.shouldSpawn()) {
        // Limit swarms per base (max 3 active swarms per base)
        const activeSwarms = Array.from(this.swarmEnemies.values()).filter(
          (swarm) => swarm.baseId === baseId
        );

        if (activeSwarms.length < 3) {
          this.spawnSwarmFromBase(base);
          base.markSpawned();
        }
      }
    });
  }

  private removeSwarmEnemy(swarmId: string): void {
    const swarm = this.swarmEnemies.get(swarmId);
    if (swarm) {
      // Remove from base tracking if it belongs to a base
      if (swarm.baseId) {
        const base = this.swarmBases.get(swarm.baseId);
        if (base) {
          base.removeSwarm(swarmId);
        }
      }

      // Remove from main swarm enemies map
      this.swarmEnemies.delete(swarmId);
    }
  }

  private spawnSwarmFromBase(base: SwarmBase) {
    const swarmId = `swarm_${this.aiEnemyCounter++}`;

    // Use base's spawn position configuration
    const spawnPos = base.getSpawnPosition();
    const x = spawnPos.x;
    const y = spawnPos.y;

    // Create swarm with base patrol behavior
    const swarmEnemy = new SwarmAI(
      swarmId,
      x,
      y,
      this.preferredAIDifficulty,
      "#cc2244", // Dark red color
      base.id,
      base.x,
      base.y
    );

    // Set up base patrol with the base's patrol radius
    swarmEnemy.setupBasePatrol(base.id, base.x, base.y, base.patrolRadius);

    this.swarmEnemies.set(swarmId, swarmEnemy);
    base.addSwarm(swarmId); // Use the new addSwarm method

    console.log(
      `Spawned swarm ${swarmId} from base ${base.id} at (${x.toFixed(1)}, ${y.toFixed(1)}) with patrol radius ${base.patrolRadius}`
    );
  }

  private maybeRespawnSwarmEnemy() {
    // Keep a minimum number of swarm enemies active
    const minSwarmCount = 2; // Reduced from 6 - fewer minimum swarms
    const maxSwarmCount = 6; // Reduced from 12 - fewer maximum swarms

    if (this.swarmEnemies.size < minSwarmCount && this.players.size > 0) {
      // Spawn new swarm enemy near a random player
      const playerArray = Array.from(this.players.values());
      const randomPlayer =
        playerArray[Math.floor(Math.random() * playerArray.length)];

      // Spawn at a distance from the player
      const spawnDistance = 200 + Math.random() * 100; // 200-300 pixels away
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnX = randomPlayer.x + Math.cos(spawnAngle) * spawnDistance;
      const spawnY = randomPlayer.y + Math.sin(spawnAngle) * spawnDistance;

      // Clamp to world bounds
      const clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, spawnX));
      const clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, spawnY));

      // Create new swarm enemy
      const swarmId = `swarm_${this.aiEnemyCounter++}`;
      const swarmEnemy = new SwarmAI(
        swarmId,
        clampedX,
        clampedY,
        this.preferredAIDifficulty,
        "#cc2244"
      );

      this.swarmEnemies.set(swarmId, swarmEnemy);
    }
  }

  private checkWallCollision(x: number, y: number, radius: number): boolean {
    const wallBuffer = 10; // Add 10px buffer around all walls for smoother collision

    // Check regular walls
    const wallCollision = this.walls.some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (wallCollision) return true;

    // Check destructible walls
    const destructibleCollision = Array.from(
      this.destructibleWalls.values()
    ).some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (destructibleCollision) return true;

    // Check environmental obstacles
    const obstacleCollision = Array.from(
      this.environmentalObstacles.values()
    ).some((obstacle) => {
      return obstacle.containsPoint(x, y, radius + wallBuffer);
    });

    if (obstacleCollision) return true;

    // Check swarm bases - they are solid and block movement
    const baseCollision = Array.from(this.swarmBases.values()).some((base) => {
      if (base.isDestroyed) return false; // Destroyed bases don't block

      const dx = x - base.x;
      const dy = y - base.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if entity would collide with the base (using base radius + entity radius + buffer)
      return distance < base.radius + radius + wallBuffer;
    });

    return baseCollision;
  }

  private checkProjectileWallCollision(projectile: Projectile): {
    collision: boolean;
    destructibleWall?: DestructibleWall;
    obstacle?: EnvironmentalObstacle;
    regularWall?: boolean;
  } {
    const wallBuffer = 5; // Smaller buffer for projectiles since they're smaller

    // Check regular walls first
    const regularWallHit = this.walls.some((wall) => {
      return (
        projectile.x >= wall.x - wallBuffer &&
        projectile.x <= wall.x + wall.width + wallBuffer &&
        projectile.y >= wall.y - wallBuffer &&
        projectile.y <= wall.y + wall.height + wallBuffer
      );
    });

    if (regularWallHit) {
      return { collision: true, regularWall: true };
    }

    // Check destructible walls
    for (const wall of this.destructibleWalls.values()) {
      if (
        projectile.x >= wall.x - wallBuffer &&
        projectile.x <= wall.x + wall.width + wallBuffer &&
        projectile.y >= wall.y - wallBuffer &&
        projectile.y <= wall.y + wall.height + wallBuffer
      ) {
        return { collision: true, destructibleWall: wall };
      }
    }

    // Check environmental obstacles
    for (const obstacle of this.environmentalObstacles.values()) {
      if (obstacle.containsPoint(projectile.x, projectile.y, wallBuffer)) {
        return { collision: true, obstacle: obstacle };
      }
    }

    return { collision: false };
  }

  private handleDestructibleWallHit(
    projectile: Projectile,
    wall: DestructibleWall
  ): void {
    // Calculate damage based on weapon type
    const weaponType = projectile.type as "laser" | "missile";
    const damage = this.calculateWeaponDamage(
      projectile.damage,
      weaponType,
      "destructible_wall"
    );

    // Apply damage to wall
    const destroyed = wall.takeDamage(damage);

    // Emit wall hit event
    this.server.emit("wallHit", {
      projectileId: projectile.id,
      wallId: wall.id,
      x: projectile.x,
      y: projectile.y,
      damage: damage,
      destroyed: destroyed,
      wallHealth: wall.currentHealth,
      wallMaxHealth: wall.maxHealth,
    });

    if (destroyed) {
      // Remove wall and create destruction particles
      this.destructibleWalls.delete(wall.id);

      // Give XP to the shooter
      const shooter = this.players.get(projectile.ownerId);
      if (shooter) {
        const xpReward = Math.round(10 * 0.5); // 5 XP for wall destruction
        shooter.addExperience(xpReward);
      }

      this.server.emit("wallDestroyed", {
        wallId: wall.id,
        x: wall.x,
        y: wall.y,
        particles: wall.createDestructionParticles(),
      });
    }
  }

  private handleObstacleHit(
    projectile: Projectile,
    obstacle: EnvironmentalObstacle
  ): void {
    // Calculate damage based on weapon type
    const weaponType = projectile.type as "laser" | "missile";
    const damage = this.calculateWeaponDamage(
      projectile.damage,
      weaponType,
      "environmental_obstacle"
    );

    // Apply damage to obstacle
    const result = obstacle.takeDamage(damage);

    // Emit obstacle hit event
    this.server.emit("obstacleHit", {
      projectileId: projectile.id,
      obstacleId: obstacle.id,
      x: projectile.x,
      y: projectile.y,
      damage: damage,
      destroyed: result.destroyed,
      obstacleHealth: obstacle.currentHealth,
      obstacleMaxHealth: obstacle.maxHealth,
    });

    if (result.destroyed) {
      // Remove obstacle
      this.environmentalObstacles.delete(obstacle.id);

      // Give XP to the shooter
      const shooter = this.players.get(projectile.ownerId);
      if (shooter) {
        const xpReward = Math.round(25 * 0.5); // 12.5 XP for obstacle destruction
        shooter.addExperience(xpReward);
      }

      // Handle explosion if obstacle is explosive
      if (result.explosion) {
        this.handleExplosion(
          result.explosion.x,
          result.explosion.y,
          result.explosion.radius,
          result.explosion.damage,
          projectile.ownerId
        );
      }

      this.server.emit("obstacleDestroyed", {
        obstacleId: obstacle.id,
        x: obstacle.x,
        y: obstacle.y,
        particles: obstacle.createDestructionParticles(),
        explosion: result.explosion,
      });
    }
  }

  private handleExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    ownerId: string
  ): void {
    // Find all players and AI within explosion radius
    const affectedEntities: Array<{
      id: string;
      entity: Player | EnhancedAIEnemy | SwarmAI;
      distance: number;
    }> = [];

    // Check players
    this.players.forEach((player, playerId) => {
      const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
      if (distance <= radius) {
        affectedEntities.push({ id: playerId, entity: player, distance });
      }
    });

    // Check AI enemies
    this.aiEnemies.forEach((ai, aiId) => {
      const distance = Math.sqrt((ai.x - x) ** 2 + (ai.y - y) ** 2);
      if (distance <= radius) {
        affectedEntities.push({ id: aiId, entity: ai, distance });
      }
    });

    // Check swarm enemies
    this.swarmEnemies.forEach((swarm, swarmId) => {
      const distance = Math.sqrt((swarm.x - x) ** 2 + (swarm.y - y) ** 2);
      if (distance <= radius) {
        affectedEntities.push({ id: swarmId, entity: swarm, distance });
      }
    });

    // Apply damage to affected entities
    affectedEntities.forEach(({ id, entity, distance }) => {
      const explosionDamage = this.calculateExplosionDamage(
        distance,
        radius,
        damage
      );
      if (explosionDamage > 0) {
        const isDead = entity.takeDamage(explosionDamage);

        if (isDead && entity instanceof Player) {
          // Handle player death from explosion
          // Give XP to the explosion owner (if it's not self-damage)
          if (ownerId !== id) {
            const killer = this.players.get(ownerId);
            if (killer) {
              killer.addExperience(XP_REWARDS.playerKill);
              console.log(
                `Player ${killer.name} killed ${entity.name} with explosion and gained ${XP_REWARDS.playerKill} XP`
              );

              // Emit kill event to the killer
              this.server.to(killer.id).emit("playerKill", {
                killType: "explosion",
                victim: entity.name,
                xpGained: XP_REWARDS.playerKill,
              });
            }
          }
        } else if (isDead && entity instanceof EnhancedAIEnemy) {
          // Handle AI death from explosion
          this.aiEnemies.delete(id);
          const killer = this.players.get(ownerId);
          if (killer) {
            killer.addExperience(XP_REWARDS.aiEnemyKill);
          }
        } else if (isDead && entity instanceof SwarmAI) {
          // Handle swarm death from explosion
          this.removeSwarmEnemy(id);
          const killer = this.players.get(ownerId);
          if (killer) {
            killer.addExperience(XP_REWARDS.swarmEnemyKill);
          }
        }
      }
    });

    // Check for chain reactions with other explosive obstacles
    this.environmentalObstacles.forEach((obstacle, obstacleId) => {
      const distance = Math.sqrt((obstacle.x - x) ** 2 + (obstacle.y - y) ** 2);
      if (distance <= radius && this.shouldTriggerChainReaction()) {
        // Trigger chain explosion
        const result = obstacle.takeDamage(damage);
        if (result.destroyed && result.explosion) {
          this.environmentalObstacles.delete(obstacleId);
          this.handleExplosion(
            result.explosion.x,
            result.explosion.y,
            result.explosion.radius,
            result.explosion.damage,
            ownerId
          );
        }
      }
    });

    // Emit explosion event
    this.server.emit("explosion", {
      x,
      y,
      radius,
      damage,
      affectedEntities: affectedEntities.map((e) => ({
        id: e.id,
        damage: this.calculateExplosionDamage(e.distance, radius, damage),
      })),
    });
  }

  private calculateWeaponDamage(
    baseDamage: number,
    weaponType: "laser" | "missile",
    targetType: "destructible_wall" | "environmental_obstacle"
  ): number {
    return calculateWeaponDamage(baseDamage, weaponType, targetType);
  }

  private calculateExplosionDamage(
    distance: number,
    explosionRadius: number,
    baseDamage: number
  ): number {
    return calculateExplosionDamage(distance, explosionRadius, baseDamage);
  }

  private shouldTriggerChainReaction(): boolean {
    return shouldTriggerChainReaction();
  }

  private updateDestructibleObjects(deltaTime: number): void {
    // Update destructible wall particles
    this.destructibleWalls.forEach((wall) => {
      wall.updateParticles(deltaTime);
    });

    // Update environmental obstacles and their particles
    this.environmentalObstacles.forEach((obstacle) => {
      obstacle.update(deltaTime);
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
    this.destructibleWalls.clear();
    this.environmentalObstacles.clear();

    // Generate regular indestructible walls
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

        // Check if this wall overlaps with existing objects
        validPosition = !this.getAllCollisionObjects().some(
          (existingObject) => {
            const spacing = 120; // Increased spacing to prevent narrow gaps
            return !(
              wall.x + wall.width + spacing < existingObject.x ||
              wall.x > existingObject.x + existingObject.width + spacing ||
              wall.y + wall.height + spacing < existingObject.y ||
              wall.y > existingObject.y + existingObject.height + spacing
            );
          }
        );

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.walls.push(wall);
      }
    }

    // Generate destructible walls
    for (let i = 0; i < this.DESTRUCTIBLE_WALL_COUNT; i++) {
      let attempts = 0;
      let validPosition = false;
      let destructibleWall: DestructibleWall;

      do {
        // Random wall type with weighted distribution
        const wallTypes = Object.values(WallType);
        const weights = [0.3, 0.2, 0.15, 0.15, 0.1, 0.1]; // Concrete most common
        const randomValue = Math.random();
        let cumulative = 0;
        let selectedType = WallType.CONCRETE;

        for (let j = 0; j < wallTypes.length; j++) {
          cumulative += weights[j];
          if (randomValue <= cumulative) {
            selectedType = wallTypes[j];
            break;
          }
        }

        destructibleWall = DestructibleWall.generateRandom(
          `destructible_wall_${i}`,
          this.WORLD_WIDTH,
          this.WORLD_HEIGHT,
          selectedType
        );

        // Check if this wall overlaps with existing objects
        validPosition = !this.getAllCollisionObjects().some(
          (existingObject) => {
            const spacing = 100; // Spacing for destructible walls
            return !(
              destructibleWall.x + destructibleWall.width + spacing <
                existingObject.x ||
              destructibleWall.x >
                existingObject.x + existingObject.width + spacing ||
              destructibleWall.y + destructibleWall.height + spacing <
                existingObject.y ||
              destructibleWall.y >
                existingObject.y + existingObject.height + spacing
            );
          }
        );

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.destructibleWalls.set(destructibleWall.id, destructibleWall);
      }
    }

    // Generate environmental obstacles
    for (let i = 0; i < this.OBSTACLE_COUNT; i++) {
      let attempts = 0;
      let validPosition = false;
      let obstacle: EnvironmentalObstacle;

      do {
        // Random obstacle type with weighted distribution
        const obstacleTypes = Object.values(ObstacleType);
        const weights = [0.25, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05]; // Asteroids and debris most common
        const randomValue = Math.random();
        let cumulative = 0;
        let selectedType = ObstacleType.ASTEROID;

        for (let j = 0; j < obstacleTypes.length; j++) {
          cumulative += weights[j];
          if (randomValue <= cumulative) {
            selectedType = obstacleTypes[j];
            break;
          }
        }

        obstacle = EnvironmentalObstacle.generateRandom(
          `obstacle_${i}`,
          this.WORLD_WIDTH,
          this.WORLD_HEIGHT,
          selectedType
        );

        // Check if this obstacle overlaps with existing objects
        validPosition = !this.getAllCollisionObjects().some(
          (existingObject) => {
            const spacing = 120; // More spacing for obstacles
            const obstacleWidth = obstacle.getWidth();
            const obstacleHeight = obstacle.getHeight();

            return !(
              obstacle.x - obstacleWidth / 2 + obstacleWidth + spacing <
                existingObject.x ||
              obstacle.x - obstacleWidth / 2 >
                existingObject.x + existingObject.width + spacing ||
              obstacle.y - obstacleHeight / 2 + obstacleHeight + spacing <
                existingObject.y ||
              obstacle.y - obstacleHeight / 2 >
                existingObject.y + existingObject.height + spacing
            );
          }
        );

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.environmentalObstacles.set(obstacle.id, obstacle);
      }
    }

    console.log(
      `Generated environment: ${this.walls.length} walls, ${this.destructibleWalls.size} destructible walls, ${this.environmentalObstacles.size} obstacles`
    );
  }

  // Get all collision objects for overlap checking during generation
  private getAllCollisionObjects(): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    const objects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    // Add regular walls
    objects.push(...this.walls);

    // Add destructible walls
    objects.push(
      ...Array.from(this.destructibleWalls.values()).map((wall) => ({
        x: wall.x,
        y: wall.y,
        width: wall.width,
        height: wall.height,
      }))
    );

    // Add environmental obstacles (convert to rectangular bounds)
    objects.push(
      ...Array.from(this.environmentalObstacles.values()).map((obstacle) => {
        const width = obstacle.getWidth();
        const height = obstacle.getHeight();
        return {
          x: obstacle.x - width / 2,
          y: obstacle.y - height / 2,
          width: width,
          height: height,
        };
      })
    );

    return objects;
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
    // Randomly choose between all power-up types (~16.67% each)
    const randomValue = Math.random();
    let powerUpType: PowerUpType;
    if (randomValue < 0.167) {
      powerUpType = PowerUpType.BOOST_UPGRADE;
    } else if (randomValue < 0.334) {
      powerUpType = PowerUpType.LASER_UPGRADE;
    } else if (randomValue < 0.501) {
      powerUpType = PowerUpType.MISSILE_UPGRADE;
    } else if (randomValue < 0.668) {
      powerUpType = PowerUpType.FLASH_UPGRADE;
    } else if (randomValue < 0.834) {
      powerUpType = PowerUpType.HEALTH_PICKUP;
    } else {
      powerUpType = PowerUpType.SHIELD_PICKUP;
    }
    const powerUp = new PowerUp(powerUpId, x, y, powerUpType);
    this.powerUps.set(powerUpId, powerUp);
  }

  private spawnAIEnemies() {
    this.aiEnemies.clear();
    // Don't clear swarm enemies here - they're managed by bases now

    for (let i = 0; i < this.AI_ENEMY_COUNT; i++) {
      const spawnPosition = this.getRandomSpawnPosition();
      const aiId = `ai_${this.aiEnemyCounter++}`;

      // Create an enhanced AI enemy with pathfinding capabilities
      const aiEnemy = new EnhancedAIEnemy(
        aiId,
        spawnPosition.x,
        spawnPosition.y,
        this.preferredAIDifficulty
      );

      this.aiEnemies.set(aiId, aiEnemy);
    }
  }

  private spawnSwarmBases() {
    this.swarmBases.clear();
    this.swarmEnemies.clear(); // Clear existing swarms

    // Use difficulty-based spawn configuration
    const spawnConfig = getSwarmBaseSpawnConfig(this.preferredAIDifficulty);
    const BASE_COUNT = spawnConfig.baseCount;
    console.log(
      `Spawning ${BASE_COUNT} swarm bases for ${this.preferredAIDifficulty} difficulty`
    );

    for (let i = 0; i < BASE_COUNT; i++) {
      let attempts = 0;
      let position;

      // Find a good position for the base (away from walls and other bases)
      do {
        position = this.getRandomSpawnPosition();
        attempts++;
      } while (
        attempts < spawnConfig.spawnAttempts &&
        !this.isValidBasePosition(position.x, position.y)
      );

      const baseId = `base_${i + 1}`;
      // All bases use the same DEFAULT type now
      const base = new SwarmBase(baseId, position.x, position.y, "DEFAULT");
      this.swarmBases.set(baseId, base);

      console.log(
        `Spawned swarm base ${baseId} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`
      );
    }
  }

  private isValidBasePosition(x: number, y: number): boolean {
    // Use configuration for positioning constraints
    const baseConfig = getSwarmBaseConfigForDifficulty(
      this.preferredAIDifficulty
    );
    const MIN_DISTANCE_FROM_OTHER_BASES = baseConfig.minDistanceFromOtherBases;
    const BASE_RADIUS = baseConfig.radius;
    const SAFE_DISTANCE = baseConfig.minDistanceFromWalls;

    // Check collision with walls and obstacles (but not other bases yet)
    if (
      this.checkWallCollisionExcludingBases(x, y, BASE_RADIUS + SAFE_DISTANCE)
    ) {
      return false;
    }

    // Check distance from other bases
    for (const base of this.swarmBases.values()) {
      const dx = x - base.x;
      const dy = y - base.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_DISTANCE_FROM_OTHER_BASES) {
        return false;
      }
    }

    return true;
  }

  private checkWallCollisionExcludingBases(
    x: number,
    y: number,
    radius: number
  ): boolean {
    const wallBuffer = 10; // Add 10px buffer around all walls for smoother collision

    // Check regular walls
    const wallCollision = this.walls.some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (wallCollision) return true;

    // Check destructible walls
    const destructibleCollision = Array.from(
      this.destructibleWalls.values()
    ).some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (destructibleCollision) return true;

    // Check environmental obstacles
    const obstacleCollision = Array.from(
      this.environmentalObstacles.values()
    ).some((obstacle) => {
      return obstacle.containsPoint(x, y, radius + wallBuffer);
    });

    return obstacleCollision;
  }
  private spawnSwarmEnemies() {
    this.swarmEnemies.clear();

    // Spawn swarms in groups of 3-5 enemies
    const swarmGroups = 2; // Number of swarm groups
    const enemiesPerGroup = 4; // 4 enemies per group

    for (let group = 0; group < swarmGroups; group++) {
      // Find a spawn position for the group center
      const groupCenter = this.getRandomSpawnPosition();

      for (let i = 0; i < enemiesPerGroup; i++) {
        const swarmId = `swarm_${this.aiEnemyCounter++}`;

        // Spawn group members near the center with some spread
        const spread = 50; // 50 pixel spread around group center
        const angle = (i / enemiesPerGroup) * Math.PI * 2;
        const distance = Math.random() * spread;

        const x = groupCenter.x + Math.cos(angle) * distance;
        const y = groupCenter.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        const clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, x));
        const clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, y));

        const swarmEnemy = new SwarmAI(
          swarmId,
          clampedX,
          clampedY,
          this.preferredAIDifficulty,
          "#cc2244" // Dark red color for aggressive appearance
        );

        this.swarmEnemies.set(swarmId, swarmEnemy);
      }
    }
  }

  private forceSpawnSwarms() {
    const swarmConfig = getSwarmConfig(this.preferredAIDifficulty);

    // Spawn fewer groups of swarms for less overwhelming gameplay
    const swarmGroups = 1; // Reduced from 2 - spawn only 1 group
    const enemiesPerGroup = swarmConfig.groupSize;

    console.log(
      `Force spawning ${swarmGroups * enemiesPerGroup} swarm enemies immediately (${swarmGroups} groups of ${enemiesPerGroup})`
    );

    for (let group = 0; group < swarmGroups; group++) {
      // Get a spawn position
      const groupCenter = this.getSwarmSpawnPosition();

      for (let i = 0; i < enemiesPerGroup; i++) {
        const swarmId = `swarm_${this.aiEnemyCounter++}`;

        // Spawn group members near the center with some spread
        const spread = swarmConfig.groupSpread;
        const angle = (i / enemiesPerGroup) * Math.PI * 2;
        const distance = Math.random() * spread;

        let x = groupCenter.x + Math.cos(angle) * distance;
        let y = groupCenter.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        let clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, x));
        let clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, y));

        // Check for wall collision and adjust if needed
        let positionAttempts = 0;
        while (
          this.checkWallCollision(
            clampedX,
            clampedY,
            swarmConfig.radius + 10
          ) &&
          positionAttempts < 10
        ) {
          // Try a new position with smaller spread
          const newAngle = Math.random() * Math.PI * 2;
          const newDistance = Math.random() * (spread * 0.5); // Use smaller spread for retries
          x = groupCenter.x + Math.cos(newAngle) * newDistance;
          y = groupCenter.y + Math.sin(newAngle) * newDistance;
          clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, x));
          clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, y));
          positionAttempts++;
        }

        if (positionAttempts >= 10) {
          console.log(
            `Warning: Could not find wall-free position for force-spawned swarm ${swarmId}, using fallback`
          );
          const safePos = this.getRandomSpawnPosition();
          clampedX = safePos.x;
          clampedY = safePos.y;
        }

        const swarmEnemy = new SwarmAI(
          swarmId,
          clampedX,
          clampedY,
          this.preferredAIDifficulty,
          "#cc2244"
        );

        this.swarmEnemies.set(swarmId, swarmEnemy);
        console.log(
          `Force spawned swarm enemy ${swarmId} at (${clampedX}, ${clampedY})`
        );
      }
    }

    // Update last spawn time
    this.lastSwarmSpawn = Date.now();
  }

  private checkAndSpawnSwarmEnemies() {
    const currentTime = Date.now();

    // Get swarm config for current difficulty
    const swarmConfig = getSwarmConfig(this.preferredAIDifficulty);

    // Don't spawn if at max capacity or too many AI enemies total
    const maxSwarms = 15; // Increased from 8 - allow up to 15 swarm enemies at once
    if (this.swarmEnemies.size >= maxSwarms || this.aiEnemies.size > 8) return;

    // Check if enough time has passed since last spawn
    if (currentTime - this.lastSwarmSpawn < this.swarmSpawnInterval) return;

    // Check if any player is in a spawn zone OR if we haven't spawned in a while
    let shouldSpawn = false;
    const spawnDistance = 400; // Increased from 300 - larger trigger zone but they spawn further away

    // Force spawn if no swarms exist and players are present
    if (this.swarmEnemies.size === 0 && this.players.size > 0) {
      shouldSpawn = true;
      console.log(
        "Force spawning swarms - no swarms exist and players are present"
      );
    } else {
      // Check spawn zones
      this.players.forEach((player) => {
        if (player.health <= 0) return;

        // Check if player is near world edges (common spawn areas for swarms)
        const nearLeftEdge = player.x < spawnDistance;
        const nearRightEdge = player.x > this.WORLD_WIDTH - spawnDistance;
        const nearTopEdge = player.y < spawnDistance;
        const nearBottomEdge = player.y > this.WORLD_HEIGHT - spawnDistance;

        // Check if player is in center area (another spawn zone)
        const centerX = this.WORLD_WIDTH / 2;
        const centerY = this.WORLD_HEIGHT / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(player.x - centerX, 2) + Math.pow(player.y - centerY, 2)
        );
        const nearCenter = distanceFromCenter < spawnDistance;

        if (
          nearLeftEdge ||
          nearRightEdge ||
          nearTopEdge ||
          nearBottomEdge ||
          nearCenter
        ) {
          shouldSpawn = true;
        }
      });
    }
    if (shouldSpawn) {
      // Get swarm config for current difficulty
      const swarmConfig = getSwarmConfig(this.preferredAIDifficulty);

      // Spawn 2 swarm groups when triggered (increased from 1)
      const swarmGroups = 2;
      const enemiesPerGroup = swarmConfig.groupSize;

      console.log(
        `Spawning ${swarmGroups} swarm groups: ${swarmGroups * enemiesPerGroup} total enemies with difficulty ${this.preferredAIDifficulty}`
      );

      for (let group = 0; group < swarmGroups; group++) {
        // Find a spawn position away from players but not too far
        const groupCenter = this.getSwarmSpawnPosition();

        for (let i = 0; i < enemiesPerGroup; i++) {
          const swarmId = `swarm_${this.aiEnemyCounter++}`;

          // Spawn group members near the center with some spread
          const spread = swarmConfig.groupSpread;
          const angle = (i / enemiesPerGroup) * Math.PI * 2;
          const distance = Math.random() * spread;

          let x = groupCenter.x + Math.cos(angle) * distance;
          let y = groupCenter.y + Math.sin(angle) * distance;

          // Clamp to world bounds
          let clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, x));
          let clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, y));

          // Check for wall collision and adjust if needed
          let positionAttempts = 0;
          while (
            this.checkWallCollision(
              clampedX,
              clampedY,
              swarmConfig.radius + 10
            ) &&
            positionAttempts < 10
          ) {
            // Try a new position with smaller spread
            const newAngle = Math.random() * Math.PI * 2;
            const newDistance = Math.random() * (spread * 0.5); // Use smaller spread for retries
            x = groupCenter.x + Math.cos(newAngle) * newDistance;
            y = groupCenter.y + Math.sin(newAngle) * newDistance;
            clampedX = Math.max(50, Math.min(this.WORLD_WIDTH - 50, x));
            clampedY = Math.max(50, Math.min(this.WORLD_HEIGHT - 50, y));
            positionAttempts++;
          }

          if (positionAttempts >= 10) {
            console.log(
              `Warning: Could not find wall-free position for swarm ${swarmId}, using fallback`
            );
            const safePos = this.getRandomSpawnPosition();
            clampedX = safePos.x;
            clampedY = safePos.y;
          }

          const swarmEnemy = new SwarmAI(
            swarmId,
            clampedX,
            clampedY,
            this.preferredAIDifficulty,
            "#cc2244"
          );

          this.swarmEnemies.set(swarmId, swarmEnemy);
          console.log(
            `Spawned swarm enemy ${swarmId} at (${clampedX}, ${clampedY}) with difficulty ${this.preferredAIDifficulty}`
          );
        }
      }

      // Update last spawn time
      this.lastSwarmSpawn = currentTime;
    }
  }

  private getSwarmSpawnPosition(): { x: number; y: number } {
    // Get swarm config for spawn distances
    const swarmConfig = getSwarmConfig(this.preferredAIDifficulty);

    // Find a position that's not too close to players but not at world edge
    let attempts = 0;
    const maxAttempts = 50; // Increased attempts to find valid position
    const minDistanceFromPlayer = swarmConfig.spawnDistance.min;
    const maxDistanceFromPlayer = swarmConfig.spawnDistance.max;
    const swarmRadius = swarmConfig.radius;
    const safeDistance = 20; // Extra buffer from walls

    while (attempts < maxAttempts) {
      const x = Math.random() * (this.WORLD_WIDTH - 200) + 100;
      const y = Math.random() * (this.WORLD_HEIGHT - 200) + 100;

      let validPosition = true;

      // Check wall collision first
      if (this.checkWallCollision(x, y, swarmRadius + safeDistance)) {
        validPosition = false;
        attempts++;
        continue;
      }

      // Check distance from all players
      this.players.forEach((player) => {
        const distance = Math.sqrt(
          Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2)
        );

        if (
          distance < minDistanceFromPlayer ||
          distance > maxDistanceFromPlayer
        ) {
          validPosition = false;
        }
      });

      if (validPosition) {
        console.log(
          `Found valid swarm spawn position at (${x.toFixed(1)}, ${y.toFixed(1)}) after ${attempts + 1} attempts`
        );
        return { x, y };
      }

      attempts++;
    }

    // Fallback: Use safe spawn position method
    console.log(
      `Could not find valid swarm spawn position after ${maxAttempts} attempts, using safe fallback`
    );
    const safePos = this.getRandomSpawnPosition();
    return { x: safePos.x, y: safePos.y };
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

  private updateMeteors(deltaTime: number, hasRealPlayers: boolean = true) {
    const currentTime = Date.now();

    // Only spawn new meteors if there are real players to interact with them
    if (
      hasRealPlayers &&
      currentTime - this.lastMeteorSpawn > this.meteorSpawnInterval
    ) {
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
            // Player is dead - they will need to use death menu to respawn
            // Don't auto-respawn here anymore
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

    // Serialize swarm AI enemies for network transmission
    const serializedSwarmEnemies: { [id: string]: any } = {};
    for (const [id, swarmEnemy] of this.swarmEnemies) {
      serializedSwarmEnemies[id] = swarmEnemy.serialize();
    }

    // Serialize swarm bases for network transmission
    const serializedSwarmBases: { [id: string]: any } = {};
    for (const [id, base] of this.swarmBases) {
      serializedSwarmBases[id] = {
        id: base.id,
        x: base.x,
        y: base.y,
        health: base.health,
        maxHealth: base.maxHealth,
        isDestroyed: base.isDestroyed,
        radius: base.radius,
      };
    }

    // Serialize power-ups for network transmission
    const serializedPowerUps: { [id: string]: any } = {};
    for (const [id, powerUp] of this.powerUps) {
      serializedPowerUps[id] = powerUp.serialize();
    }

    // Serialize destructible walls for network transmission
    const serializedDestructibleWalls: { [id: string]: any } = {};
    for (const [id, wall] of this.destructibleWalls) {
      serializedDestructibleWalls[id] = wall.serialize();
    }

    // Serialize environmental obstacles for network transmission
    const serializedObstacles: { [id: string]: any } = {};
    for (const [id, obstacle] of this.environmentalObstacles) {
      serializedObstacles[id] = obstacle.serialize();
    }

    const gameState: GameState = {
      players: serializedPlayers,
      aiEnemies: serializedAIEnemies,
      swarmEnemies: serializedSwarmEnemies,
      swarmBases: serializedSwarmBases,
      walls: this.walls,
      destructibleWalls: serializedDestructibleWalls,
      environmentalObstacles: serializedObstacles,
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
    };

    this.server.emit("gameState", gameState);
  }
}
