import { makeAutoObservable } from "mobx";
import { makePersistable } from "mobx-persist-store";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export class GamePreferencesStore {
  difficulty: Difficulty = "MEDIUM";
  playerName: string = "";
  guestHighScore: number = 0;
  guestGamesPlayed: number = 0;
  guestTotalKills: number = 0;
  guestTotalDeaths: number = 0;
  guestTotalScore: number = 0;

  // Current session data (always saved to localStorage)
  currentSessionScore: number = 0;
  currentSessionKills: number = 0;
  currentSessionDeaths: number = 0;
  currentSessionStartTime: number = 0;
  lastSyncTime: number = 0;

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: "GamePreferencesStore",
      properties: [
        "difficulty",
        "playerName",
        "guestHighScore",
        "guestGamesPlayed",
        "guestTotalKills",
        "guestTotalDeaths",
        "guestTotalScore",
        "currentSessionScore",
        "currentSessionKills",
        "currentSessionDeaths",
        "currentSessionStartTime",
        "lastSyncTime",
      ],
      storage: window.localStorage,
    });
  }

  // Actions
  setDifficulty(difficulty: Difficulty) {
    this.difficulty = difficulty;
  }

  setPlayerName(name: string) {
    this.playerName = name;
  }

  // Guest score management
  updateGuestScore(score: number, kills: number = 0) {
    if (score > this.guestHighScore) {
      this.guestHighScore = score;
    }
    this.guestGamesPlayed += 1;
    this.guestTotalKills += kills;
  }

  // Real-time session tracking (always saved to localStorage)
  startNewSession() {
    this.currentSessionScore = 0;
    this.currentSessionKills = 0;
    this.currentSessionDeaths = 0;
    this.currentSessionStartTime = Date.now();
    this.lastSyncTime = Date.now();
  }

  updateSessionScore(score: number) {
    this.currentSessionScore = score;
  }

  addSessionKill() {
    this.currentSessionKills += 1;
  }

  addSessionDeath() {
    this.currentSessionDeaths += 1;
  }

  markSynced() {
    this.lastSyncTime = Date.now();
  }

  // Check if session data needs syncing (every 2 minutes)
  needsSync(): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    return timeSinceLastSync >= 120000; // 2 minutes in milliseconds
  }

  // Get session data for syncing
  getSessionData() {
    return {
      score: this.currentSessionScore,
      kills: this.currentSessionKills,
      deaths: this.currentSessionDeaths,
      sessionDuration: Date.now() - this.currentSessionStartTime,
      startTime: this.currentSessionStartTime,
    };
  }

  // End session and commit to guest totals
  endSession() {
    // Update guest totals
    this.guestTotalScore += this.currentSessionScore;
    this.guestTotalKills += this.currentSessionKills;
    this.guestTotalDeaths += this.currentSessionDeaths;

    if (this.currentSessionScore > this.guestHighScore) {
      this.guestHighScore = this.currentSessionScore;
    }

    this.guestGamesPlayed += 1;

    // Reset session data
    this.currentSessionScore = 0;
    this.currentSessionKills = 0;
    this.currentSessionDeaths = 0;
    this.currentSessionStartTime = 0;
    this.lastSyncTime = 0;
  }

  resetGuestStats() {
    this.guestHighScore = 0;
    this.guestGamesPlayed = 0;
    this.guestTotalKills = 0;
    this.guestTotalDeaths = 0;
    this.guestTotalScore = 0;
  }

  // Getters for display
  get guestStats() {
    return {
      highScore: this.guestHighScore,
      gamesPlayed: this.guestGamesPlayed,
      totalKills: this.guestTotalKills,
      totalDeaths: this.guestTotalDeaths,
      totalScore: this.guestTotalScore,
      averageScore:
        this.guestGamesPlayed > 0
          ? Math.round(this.guestTotalScore / this.guestGamesPlayed)
          : 0,
      kda:
        this.guestTotalDeaths > 0
          ? (this.guestTotalKills / this.guestTotalDeaths).toFixed(2)
          : this.guestTotalKills.toString(),
    };
  }

  get currentSessionStats() {
    return {
      score: this.currentSessionScore,
      kills: this.currentSessionKills,
      deaths: this.currentSessionDeaths,
      sessionTime:
        this.currentSessionStartTime > 0
          ? Date.now() - this.currentSessionStartTime
          : 0,
      kda:
        this.currentSessionDeaths > 0
          ? (this.currentSessionKills / this.currentSessionDeaths).toFixed(2)
          : this.currentSessionKills.toString(),
    };
  }
}
