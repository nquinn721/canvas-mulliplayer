// Difficulty management utilities for the game
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

const DIFFICULTY_STORAGE_KEY = "canvas-multiplayer-difficulty";

export const getDifficulty = (): Difficulty => {
  const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return (saved as Difficulty) || "MEDIUM";
};

export const setDifficulty = (difficulty: Difficulty) => {
  localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
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
