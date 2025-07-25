// This file has been deprecated - KeyState moved to Player class
// Use shared/classes/Player.ts instead

export type { KeyState } from "../classes/Player";

// Game configuration constants
export const GAME_CONFIG = {
  PLAYER_SPEED: 200, // pixels per second
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 800,
  WORLD_WIDTH: 5000,
  WORLD_HEIGHT: 5000,
  PLAYER_SIZE: 20,
  TICK_RATE: 60, // server updates per second
  WALL_COUNT: 150, // number of random walls
  MIN_WALL_SIZE: 30,
  MAX_WALL_SIZE: 120,
};
