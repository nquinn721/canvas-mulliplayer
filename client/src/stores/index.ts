import { SocketService } from "../services/SocketService";
import { GameStore } from "./GameStore";

// Create a global game store instance
export const gameStore = new GameStore();

// Create socket service using singleton pattern (but don't auto-connect)
export const socketService = SocketService.getInstance(gameStore);

// Connection will be managed by components as needed
