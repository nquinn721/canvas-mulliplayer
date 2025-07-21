import { SocketService } from "../services/SocketService";
import { GameStore } from "./GameStore";

// Create a global game store instance
export const gameStore = new GameStore();

// Create and connect socket service
export const socketService = new SocketService(gameStore);

// Auto-connect when the module is loaded
socketService.connect();
