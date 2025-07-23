// Difficulty management utilities for the game
import { gamePreferencesStore } from "../stores";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const getDifficulty = (): Difficulty => {
  return gamePreferencesStore.difficulty;
};

export const setDifficulty = (difficulty: Difficulty) => {
  gamePreferencesStore.setDifficulty(difficulty);
};

export const difficultyInfo = {
  EASY: {
    color: "#4CAF50",
    description: "Slower, less accurate AI. Good for beginners.",
    details: {
      detection: "800px",
      accuracy: "60%",
      reaction: "Slow",
      aggression: "Low",
    },
  },
  MEDIUM: {
    color: "#FF9800",
    description: "Balanced AI behavior. Recommended.",
    details: {
      detection: "1200px",
      accuracy: "75%",
      reaction: "Normal",
      aggression: "Balanced",
    },
  },
  HARD: {
    color: "#F44336",
    description: "Fast, accurate, aggressive AI. For experts.",
    details: {
      detection: "1600px",
      accuracy: "90%",
      reaction: "Fast",
      aggression: "High",
    },
  },
};
