import { SocketService } from "../services/SocketService";
import { ApiStore } from "./ApiStore";
import { AuthStore } from "./AuthStore";
import { GameStore } from "./GameStore";

// Create global store instances
export const authStore = new AuthStore();
export const apiStore = new ApiStore();
export const gameStore = new GameStore();

// Create socket service using singleton pattern (but don't auto-connect)
export const socketService = SocketService.getInstance(gameStore);

// Connection will be managed by components as needed
