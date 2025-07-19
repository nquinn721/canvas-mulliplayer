import { io, Socket } from "socket.io-client";
import { GameState } from "../../../shared";
import { GameStore } from "../stores/GameStore";
import { soundService } from "./SoundService";

export class SocketService {
  private socket: Socket | null = null;
  private gameStore: GameStore;

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  connect(url?: string) {
    if (this.socket?.connected) {
      console.log("Already connected to server");
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
    if (window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    
    // In development, use the local server
    return "http://localhost:3001";
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.gameStore.setConnected(true);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      this.gameStore.setConnected(false);
    });

    // Game events
    this.socket.on("playerId", (id: string) => {
      console.log(`Received playerId: ${id}`);
      this.gameStore.setPlayerId(id);
    });

    this.socket.on("gameState", (gameState: GameState) => {
      this.gameStore.setGameState(gameState);
    });

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

        // Play explosion sound
        if (data.targetId) {
          // Hit a player
          soundService.playSound("explosion", 0.8);
          if (data.targetId === this.gameStore.playerId) {
            // Current player was hit
            soundService.playSound("damage", 0.7);
          }
        } else if (data.wallHit) {
          // Hit a wall
          soundService.playSound("explosion", 0.6);
        }
      }
    );

    // Power-up collection event
    this.socket.on(
      "powerUpCollected",
      (data: { powerUpId: string; playerId: string; type: string }) => {
        if (data.playerId === this.gameStore.playerId) {
          // Current player collected power-up
          soundService.playSound("powerup", 0.8);
        }
      }
    );

    this.socket.on("projectileExpired", (projectileId: string) => {
      this.gameStore.removeProjectile(projectileId);
    });

    // Error handling
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.gameStore.setConnected(false);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.gameStore.setConnected(false);
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
