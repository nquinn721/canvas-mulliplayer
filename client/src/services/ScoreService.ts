import { authStore, gamePreferencesStore } from "../stores";

export interface GameResult {
  score: number;
  kills: number;
  deaths?: number;
  timeElapsed: number;
  difficulty: string;
}

export class ScoreService {
  async saveGameResult(
    gameResult: GameResult
  ): Promise<{ success: boolean; message: string }> {
    const { score, kills, deaths = 0 } = gameResult;

    try {
      if (authStore.isAuthenticated && !authStore.isGuest) {
        // Save to server for logged-in users
        const result = await authStore.updateUserScore(score, kills, deaths);
        if (result.success) {
          return {
            success: true,
            message: `Score saved! New high score: ${authStore.user?.highScore || score}`,
          };
        } else {
          // Fallback to guest storage if server update fails
          gamePreferencesStore.updateGuestScore(score, kills);
          return {
            success: true,
            message: "Score saved locally (server update failed)",
          };
        }
      } else {
        // Save to localStorage for guest users
        const previousHighScore = gamePreferencesStore.guestHighScore;
        gamePreferencesStore.updateGuestScore(score, kills);
        const isNewHighScore = score > previousHighScore;
        return {
          success: true,
          message: isNewHighScore
            ? `New high score: ${score}!`
            : `Score: ${score}. Best: ${gamePreferencesStore.guestHighScore}`,
        };
      }
    } catch (error) {
      console.error("Error saving game result:", error);
      // Always fallback to guest storage on error
      gamePreferencesStore.updateGuestScore(score, kills);
      return {
        success: true,
        message: "Score saved locally",
      };
    }
  }

  getCurrentStats() {
    if (authStore.isAuthenticated && !authStore.isGuest && authStore.user) {
      // Return server stats for logged-in users
      return {
        highScore: authStore.user.highScore || 0,
        totalScore: authStore.user.totalScore || 0,
        gamesPlayed: authStore.user.gamesPlayed || 0,
        totalKills: authStore.user.totalKills || 0,
        level: authStore.user.playerLevel || 1,
        experience: authStore.user.experience || 0,
        username: authStore.user.username,
        isGuest: false,
      };
    } else {
      // Return guest stats from localStorage
      return {
        highScore: gamePreferencesStore.guestHighScore,
        totalScore: gamePreferencesStore.guestHighScore, // For guests, high score is the total
        gamesPlayed: gamePreferencesStore.guestGamesPlayed,
        totalKills: gamePreferencesStore.guestTotalKills,
        level: Math.floor(gamePreferencesStore.guestHighScore / 1000) + 1,
        experience: gamePreferencesStore.guestHighScore,
        username: gamePreferencesStore.playerName || "Guest",
        isGuest: true,
      };
    }
  }

  getDisplayStats() {
    const stats = this.getCurrentStats();
    return {
      ...stats,
      averageScore:
        stats.gamesPlayed > 0
          ? Math.round(stats.totalScore / stats.gamesPlayed)
          : 0,
      killDeathRatio: stats.totalKills, // Simplified since we don't track deaths yet
    };
  }
}
