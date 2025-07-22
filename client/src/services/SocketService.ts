import { GameState } from "@shared";
import { io, Socket } from "socket.io-client";
import { GameStore } from "../stores/GameStore";
import { soundService } from "./SoundService";

export class SocketService {
  private socket: Socket | null = null;
  private gameStore: GameStore;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  connect(url?: string) {
    if (this.socket?.connected) {
      return;
    }

    // Automatically determine server URL based on environment
    const serverUrl = url || this.getServerUrl();

    this.socket = io(serverUrl);
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
      this.gameStore.setConnected(true);
      // Start ping measurement for latency compensation
      this.startPingMeasurement();
      // Start heartbeat to maintain connection
      this.startHeartbeat();
    });

    this.socket.on("disconnect", () => {
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
      }) => {
        this.gameStore.handleProjectileHit(data);

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

    // Error handling
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.gameStore.setConnected(false);
    });
  }

  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.gameStore.setConnected(false);
    }
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
