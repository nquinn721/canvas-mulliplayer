import { GameState } from "@shared";
import { io, Socket } from "socket.io-client";
import { authStore } from "../stores";
import { GameStore } from "../stores/GameStore";
import { soundService } from "./SoundService";

export class SocketService {
  private static instance: SocketService | null = null;
  private socket: Socket | null = null;
  private gameStore: GameStore;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private static readonly WINDOW_INSTANCE_KEY =
    "__CANVAS_MULTIPLAYER_SOCKET_SERVICE__";
  private static lastConnectionAttempt: number = 0;
  private static readonly CONNECTION_DEBOUNCE_MS = 1000; // 1 second debounce
  private static isConnecting: boolean = false;
  private static connectionPromise: Promise<void> | null = null;

  // Rate limiting for player damage explosions
  private lastPlayerDamageExplosionTime = 0;
  private playerDamageExplosionCooldown = 1000; // Minimum 1 second between damage explosions

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;

    // Check if there's already an instance in the global window object
    if (
      typeof window !== "undefined" &&
      (window as any)[SocketService.WINDOW_INSTANCE_KEY]
    ) {
      console.warn(
        "SocketService: Global instance already exists, returning existing instance"
      );
      return (window as any)[SocketService.WINDOW_INSTANCE_KEY];
    }

    // Ensure only one instance exists in class level
    if (SocketService.instance && SocketService.instance !== this) {
      console.warn(
        "SocketService: Class instance already exists, disconnecting previous instance"
      );
      SocketService.instance.disconnect();
    }

    SocketService.instance = this;

    // Store in global window object to prevent React StrictMode duplicates
    if (typeof window !== "undefined") {
      (window as any)[SocketService.WINDOW_INSTANCE_KEY] = this;
    }
  }

  static getInstance(gameStore?: GameStore): SocketService {
    // First check window global
    if (
      typeof window !== "undefined" &&
      (window as any)[SocketService.WINDOW_INSTANCE_KEY]
    ) {
      return (window as any)[SocketService.WINDOW_INSTANCE_KEY];
    }

    // Then check class static
    if (!SocketService.instance && gameStore) {
      SocketService.instance = new SocketService(gameStore);
    }
    return SocketService.instance!;
  }

  static resetInstance() {
    if (SocketService.instance) {
      SocketService.instance.disconnect();
      SocketService.instance = null;
    }

    // Clear window global as well
    if (typeof window !== "undefined") {
      delete (window as any)[SocketService.WINDOW_INSTANCE_KEY];
    }
  }

  connect(url?: string) {
    const now = Date.now();

    // Check for browser session lock to prevent React StrictMode double connections
    const sessionKey = "socket-service-lock";
    if (typeof window !== "undefined") {
      const existingLock = sessionStorage.getItem(sessionKey);
      if (existingLock) {
        const lockTime = parseInt(existingLock);
        // If lock is less than 2 seconds old, skip connection
        if (now - lockTime < 2000) {
          console.log(
            "SocketService: Connection attempt blocked by session lock (React StrictMode protection)"
          );
          return;
        }
      }
      // Set new lock
      sessionStorage.setItem(sessionKey, now.toString());
    }

    // Debounce connection attempts to prevent React StrictMode double calls
    if (
      now - SocketService.lastConnectionAttempt <
      SocketService.CONNECTION_DEBOUNCE_MS
    ) {
      console.log("SocketService: Connection attempt debounced");
      return;
    }
    SocketService.lastConnectionAttempt = now;

    // Return early if already connected or connecting
    if (this.socket?.connected) {
      console.log(
        "SocketService: Already connected, skipping connection attempt"
      );
      return;
    }

    // If we have a socket that's in the process of connecting, wait for it
    if (this.socket && !this.socket.connected && this.socket.id === undefined) {
      console.log("SocketService: Already connecting, waiting for completion");
      return;
    }

    // If we have a socket that's not connected, clean it up first
    if (this.socket && !this.socket.connected) {
      console.log("SocketService: Cleaning up existing disconnected socket");
      this.socket.removeAllListeners();
      this.socket = null;
    }

    // Automatically determine server URL based on environment
    const serverUrl = url || this.getServerUrl();
    console.log("SocketService: Connecting to", serverUrl);
    console.log(
      "SocketService: Auth token:",
      authStore.token ? `${authStore.token.substring(0, 20)}...` : "No token"
    );
    console.log("SocketService: User state:", {
      isAuthenticated: authStore.isAuthenticated,
      isGuest: authStore.isGuest,
      username: authStore.user?.username,
    });

    this.socket = io(serverUrl, {
      // Prevent duplicate connections
      forceNew: true,
      // Set timeout for connection attempts
      timeout: 10000,
      // Pass authentication token if available
      auth: {
        token: authStore.token,
      },
    });

    this.gameStore.setSocket(this.socket);
    this.setupEventListeners();
  }

  private getServerUrl(): string {
    // In production, use the same domain as the client
    if (window.location.hostname !== "localhost") {
      return `${window.location.protocol}//${window.location.host}`;
    }

    // In development, use the local server
    return "http://localhost:3001";
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log(
        "SocketService: Connected successfully with ID:",
        this.socket?.id
      );
      console.log(
        "SocketService: Connection established, setting connected state"
      );
      this.gameStore.setConnected(true);

      // Clear session lock on successful connection
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("socket-service-lock");
      }

      // Start ping measurement for latency compensation
      this.startPingMeasurement();
      // Start heartbeat to maintain connection
      this.startHeartbeat();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("SocketService: Disconnected, reason:", reason);
      this.gameStore.setConnected(false);
      // Stop heartbeat on disconnect
      this.stopHeartbeat();
    });

    // Latency compensation events
    this.socket.on("pong", (timestamp: number) => {
      // Handled in GameStore.measurePing()
    });

    this.socket.on(
      "inputAck",
      (data: { inputId: number; serverPosition: any }) => {
        // Mark input as processed for reconciliation
        if (this.gameStore.latencyCompensation) {
          this.gameStore.latencyCompensation.markInputsAsProcessed(
            data.inputId
          );
        }
      }
    );

    // Game events
    this.socket.on("playerId", (id: string) => {
      this.gameStore.setPlayerId(id);
    });

    this.socket.on("gameState", (gameState: GameState) => {
      this.gameStore.setGameState(gameState);
    });

    this.socket.on(
      "playerRespawned",
      (data: {
        playerId: string;
        playerName: string;
        x: number;
        y: number;
      }) => {
        // Player respawned notification - add spawn indicator
        if (data.playerId === this.gameStore.playerId) {
          // Current player respawned successfully
          // The death menu will automatically hide when health > 0 due to the useEffect in GameComponent

          // Create spawn indicator effect
          this.gameStore.createSpawnIndicator(data.x, data.y);
        }
      }
    );

    // Projectile events
    this.socket.on(
      "projectileHit",
      (data: {
        projectileId: string;
        x: number;
        y: number;
        targetId?: string;
        wallHit?: boolean;
        damage?: number;
        ownerId?: string;
      }) => {
        this.gameStore.handleProjectileHit(data);

        // Track hits for scoring if this was the current player's projectile
        if (
          data.ownerId === this.gameStore.playerId &&
          data.targetId &&
          !data.wallHit
        ) {
          this.gameStore.addHit(data.damage || 0);
        }

        const currentPlayer = this.gameStore.currentPlayer;
        const explosionPos = { x: data.x, y: data.y };
        const listenerPos = currentPlayer
          ? { x: currentPlayer.x, y: currentPlayer.y }
          : explosionPos;

        // Play explosion sound with distance-based volume
        if (data.targetId) {
          // Hit a player
          soundService.playSound("explosion", 0.8);
          if (data.targetId === this.gameStore.playerId) {
            // Current player was hit - always full volume for damage
            soundService.playSound("damage", 0.7);
          }
        } else if (data.wallHit) {
          // Hit a wall
          soundService.playSound("explosion", 0.6);
        }
      }
    );

    // Meteor events
    this.socket.on(
      "meteorSpawned",
      (data: {
        meteorId: string;
        x: number;
        y: number;
        targetX: number;
        targetY: number;
      }) => {
        // Meteors are handled through the game state, no special handling needed
        // Could add sound effect here if desired
      }
    );

    this.socket.on(
      "meteorHit",
      (data: {
        meteorId: string;
        x: number;
        y: number;
        targetId?: string;
        wallHit?: boolean;
        damage?: number;
      }) => {
        const currentPlayer = this.gameStore.currentPlayer;
        const explosionPos = { x: data.x, y: data.y };
        const listenerPos = currentPlayer
          ? { x: currentPlayer.x, y: currentPlayer.y }
          : explosionPos;

        // Play explosion sound with distance-based volume
        if (data.targetId) {
          // Hit a player or AI
          soundService.playSound("explosion", 1.0);
          if (data.targetId === this.gameStore.playerId) {
            // Current player was hit - always full volume for damage
            soundService.playSound("damage", 0.9);
          }
        } else if (data.wallHit) {
          // Hit a wall
          soundService.playSound("explosion", 0.8);
        }

        // Handle meteor hit effects
        this.gameStore.handleMeteorHit(data);
      }
    );

    this.socket.on("meteorExpired", (meteorId: string) => {
      // Meteors are handled through the game state, no special handling needed
    });

    // Power-up collection event
    this.socket.on(
      "powerUpCollected",
      (data: { powerUpId: string; playerId: string; type: string }) => {
        if (data.playerId === this.gameStore.playerId) {
          // Current player collected power-up - always full volume
          soundService.playSound("powerup", 0.8);
        } else {
          // Another player collected power-up - use distance-based volume
          const currentPlayer = this.gameStore.currentPlayer;
          const powerUp = this.gameStore.gameState.powerUps[data.powerUpId];

          if (currentPlayer && powerUp) {
            soundService.playSound("powerup", 0.8);
          }
        }
      }
    );

    this.socket.on("projectileExpired", (projectileId: string) => {
      this.gameStore.removeProjectile(projectileId);
    });

    // Flash ability event
    this.socket.on(
      "flashCompleted",
      (data: {
        playerId: string;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
      }) => {
        // Create particle effect for flash teleportation
        this.gameStore.particleSystem.createFlashEffect(
          data.fromX,
          data.fromY,
          data.toX,
          data.toY
        );

        // Play flash sound effect
        if (data.playerId === this.gameStore.playerId) {
          // Current player flashed - play at full volume
          soundService.playSound("teleport", 0.8);
        } else {
          // Another player flashed - distance-based volume
          const currentPlayer = this.gameStore.currentPlayer;
          if (currentPlayer) {
            soundService.playSound("teleport", 0.5);
          }
        }
      }
    );

    // AI difficulty change confirmation
    this.socket.on(
      "aiDifficultyChanged",
      (data: { difficulty: string; affectedEnemies: number }) => {
        // You could add a toast notification here if desired
      }
    );

    // AI difficulty change rejection
    this.socket.on(
      "aiDifficultyChangeRejected",
      (data: {
        reason: string;
        message: string;
        remainingCooldown?: number;
        currentDifficulty: string;
        lastChangedBy: string;
      }) => {
        console.warn("AI difficulty change rejected:", data.message);
        // You could show a toast notification to the user here
        alert(`Cannot change AI difficulty: ${data.message}`);
      }
    );

    // Abilities reset confirmation
    this.socket.on("abilitiesReset", (data: { playerId: string }) => {
      if (data.playerId === this.gameStore.playerId) {
        console.log("Abilities have been reset to starting levels");
      }
    });

    // Kill events for stats tracking
    this.socket.on(
      "playerKill",
      (data: { killType: string; victim: string; xpGained: number }) => {
        // Track the kill in game stats
        if (data.killType === "player") {
          this.gameStore.addKill();
        } else if (data.killType === "ai") {
          this.gameStore.addKill(); // AI kills also count as kills
        }

        // Play kill sound effect
        soundService.playSound("kill", 0.8);

        console.log(
          `Kill recorded: ${data.killType} kill (${data.victim}) - ${data.xpGained} XP`
        );
      }
    );

    // Player damage events
    this.socket.on(
      "playerDamaged",
      (data: {
        playerId: string;
        damage: number;
        attackerId: string;
        attackerType: string;
        x: number;
        y: number;
      }) => {
        // Only process damage for the current player
        if (data.playerId === this.gameStore.playerId) {
          // Track damage taken in stats
          this.gameStore.addDamageTaken(data.damage);

          // Create explosion effect at the damage location (rate limited)
          const now = Date.now();
          if (
            now - this.lastPlayerDamageExplosionTime >
            this.playerDamageExplosionCooldown
          ) {
            console.log(
              `Player damage explosion at (${data.x}, ${data.y}) from ${data.attackerType}`
            );
            this.gameStore.particleSystem.createExplosion(
              data.x,
              data.y,
              "laser"
            );
            this.lastPlayerDamageExplosionTime = now;
          } else {
            console.log(`Player damage explosion throttled (too frequent)`);
          }

          // Play hurt sound effect
          soundService.playSound("hurt", 0.6);

          console.log(
            `Player took ${data.damage} damage from ${data.attackerType} ${data.attackerId}`
          );
        }
      }
    );

    // Error handling
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.gameStore.setConnected(false);
    });
  }

  disconnect() {
    console.log("SocketService: Disconnecting...");
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.gameStore.setConnected(false);
    }

    // Clear session lock on disconnect
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("socket-service-lock");
    }

    // Note: We DON'T clear the static instance anymore
    // This preserves the singleton pattern across reconnections
    // Only resetInstance() should clear the singleton for testing purposes
  }

  // Start heartbeat to maintain connection stability
  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("heartbeat");
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Start periodic ping measurement for latency compensation
  private startPingMeasurement() {
    // Measure ping every 2 seconds
    setInterval(() => {
      this.gameStore.measurePing();
    }, 2000);
  }

  // Join the game with a specific player name
  joinGame(playerName: string) {
    if (this.socket?.connected) {
      this.socket.emit("joinGame", { playerName });
    }
  }

  // Utility methods to check connection status
  get isConnected() {
    return this.socket?.connected || false;
  }

  get socketId() {
    return this.socket?.id;
  }
}
