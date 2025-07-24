import { GameSessionService } from "../services/GameSessionService";
import { ScoreService } from "../services/ScoreService";
import { SocketService } from "../services/SocketService";
import { ApiStore } from "./ApiStore";
import { AuthStore } from "./AuthStore";
import { GamePreferencesStore } from "./GamePreferencesStore";
import { GameStore } from "./GameStore";
import { SoundStore } from "./SoundStore";

// Create global store instances
export const authStore = new AuthStore();
export const apiStore = new ApiStore();
export const gameStore = new GameStore();
export const soundStore = new SoundStore();
export const gamePreferencesStore = new GamePreferencesStore();

// Initialize ExperienceService with authStore
gameStore.initializeExperienceService(authStore);

// Create service instances
export const scoreService = new ScoreService();
export const gameSessionService = new GameSessionService();

// Create socket service using singleton pattern (but don't auto-connect)
export const socketService = SocketService.getInstance(gameStore);

// Connection will be managed by components as needed