// Game integration example for leaderboard system
// Add this to your game logic to automatically submit scores

import { GameResult, LeaderboardService } from "../services/LeaderboardService";

export class GameLeaderboardIntegration {
  private leaderboardService: LeaderboardService;
  private authToken: string | null = null;

  constructor() {
    this.leaderboardService = new LeaderboardService();
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Call this when a game ends to submit the score
   */
  async submitGameResult(gameStats: {
    finalScore: number;
    kills: number;
    deaths: number;
    assists?: number;
    gameStartTime: number;
    gameEndTime: number;
    powerUpsCollected?: number;
    enemiesDestroyed?: number;
    meteorsDestroyed?: number;
    headshots?: number;
    maxKillStreak?: number;
    isWinner: boolean;
    damageTaken?: number;
    experienceGained?: number;
  }): Promise<boolean> {
    if (!this.authToken) {
      console.warn("No auth token available, skipping score submission");
      return false;
    }

    try {
      const gameResult: GameResult = {
        score: gameStats.finalScore,
        kills: gameStats.kills,
        deaths: gameStats.deaths,
        assists: gameStats.assists || 0,
        survivalTimeMs: gameStats.gameEndTime - gameStats.gameStartTime,
        powerUpsCollected: gameStats.powerUpsCollected || 0,
        enemiesDestroyed: gameStats.enemiesDestroyed || 0,
        meteorsDestroyed: gameStats.meteorsDestroyed || 0,
        headshots: gameStats.headshots || 0,
        maxKillStreak: gameStats.maxKillStreak || 0,
        isVictory: gameStats.isWinner,
        isPerfectGame: gameStats.isWinner && gameStats.deaths === 0,
        isFirstBlood: this.checkIfFirstBlood(gameStats.kills),
        isLastManStanding: this.checkIfLastManStanding(gameStats.isWinner),
        damageTaken: gameStats.damageTaken || 0,
        experience: gameStats.experienceGained || 0,
      };

      const response = await this.leaderboardService.submitScore(
        gameResult,
        this.authToken
      );

      if (response.success) {
        console.log("Score submitted successfully:", response.message);
        return true;
      } else {
        console.error("Failed to submit score:", response.message);
        return false;
      }
    } catch (error) {
      console.error("Error submitting score to leaderboard:", error);
      return false;
    }
  }

  /**
   * Get current user's rank
   */
  async getUserRank(type = "all_time", category = "total_score") {
    if (!this.authToken) return null;

    try {
      const rankData = await this.leaderboardService.getUserRank(
        type as any,
        category as any,
        this.authToken
      );
      return rankData.rank;
    } catch (error) {
      console.error("Error getting user rank:", error);
      return null;
    }
  }

  /**
   * Check if this kill is the first blood of the match
   * This would need to be implemented based on your game logic
   */
  private checkIfFirstBlood(kills: number): boolean {
    // Implement your first blood detection logic here
    // For example, check if this is the first kill in the current match
    return false; // Placeholder
  }

  /**
   * Check if the player is the last man standing
   * This would need to be implemented based on your game logic
   */
  private checkIfLastManStanding(isWinner: boolean): boolean {
    // Implement your last man standing detection logic here
    // For example, check if the player won while being the only survivor
    return false; // Placeholder
  }
}

// Example usage in your game loop:

/*
// Initialize the integration
const leaderboardIntegration = new GameLeaderboardIntegration();

// Set auth token when user logs in
function onUserLogin(token: string) {
  leaderboardIntegration.setAuthToken(token);
}

// Call when game ends
function onGameEnd(gameData: any) {
  const gameStats = {
    finalScore: gameData.score,
    kills: gameData.playerStats.kills,
    deaths: gameData.playerStats.deaths,
    assists: gameData.playerStats.assists,
    gameStartTime: gameData.startTime,
    gameEndTime: gameData.endTime,
    powerUpsCollected: gameData.playerStats.powerUps,
    enemiesDestroyed: gameData.playerStats.enemies,
    meteorsDestroyed: gameData.playerStats.meteors,
    headshots: gameData.playerStats.headshots,
    maxKillStreak: gameData.playerStats.maxStreak,
    isWinner: gameData.result === 'victory',
    damageTaken: gameData.playerStats.damage,
    experienceGained: gameData.playerStats.experience,
  };

  leaderboardIntegration.submitGameResult(gameStats)
    .then(success => {
      if (success) {
        // Show success message to user
        console.log('Your score has been submitted to the leaderboard!');
      }
    });
}

// Show user's current rank
async function showUserRank() {
  const rank = await leaderboardIntegration.getUserRank();
  if (rank) {
    console.log(`Your current rank: #${rank}`);
  }
}
*/
