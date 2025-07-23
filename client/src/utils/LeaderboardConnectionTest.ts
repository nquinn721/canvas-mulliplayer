// Leaderboard connection test utility
// Add this to test the leaderboard API connection in the lobby

import {
  LeaderboardService,
  LeaderboardType,
  ScoreCategory,
} from "../services/LeaderboardService";

export class LeaderboardConnectionTest {
  private leaderboardService: LeaderboardService;

  constructor() {
    this.leaderboardService = new LeaderboardService();
  }

  /**
   * Test basic leaderboard API connectivity
   */
  async testLeaderboardConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Test getting categories (public endpoint)
      const categories = await this.leaderboardService.getCategories();

      if (categories && categories.types && categories.categories) {
        console.log("✅ Leaderboard API: Categories endpoint working");

        // Test getting public leaderboard data
        const leaderboard = await this.leaderboardService.getLeaderboard(
          LeaderboardType.ALL_TIME,
          ScoreCategory.TOTAL_SCORE,
          10,
          0
        );

        console.log(
          `✅ Leaderboard API: Retrieved ${leaderboard.length} entries`
        );

        return {
          success: true,
          message: `Leaderboard connected successfully. Found ${leaderboard.length} entries.`,
        };
      } else {
        return {
          success: false,
          message: "Leaderboard API returned invalid data structure",
        };
      }
    } catch (error) {
      console.error("❌ Leaderboard API connection failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("fetch")) {
        return {
          success: false,
          message:
            "Cannot connect to leaderboard server. Please check if the server is running.",
        };
      } else if (errorMessage.includes("404")) {
        return {
          success: false,
          message:
            "Leaderboard API endpoints not found. Please verify server setup.",
        };
      } else {
        return {
          success: false,
          message: `Leaderboard API error: ${errorMessage}`,
        };
      }
    }
  }

  /**
   * Test authenticated leaderboard features
   */
  async testAuthenticatedFeatures(
    authToken: string
  ): Promise<{ success: boolean; message: string }> {
    if (!authToken) {
      return {
        success: false,
        message: "No authentication token provided",
      };
    }

    try {
      // Test user rank endpoint
      const userRank = await this.leaderboardService.getUserRank(
        LeaderboardType.ALL_TIME,
        ScoreCategory.TOTAL_SCORE,
        authToken
      );

      console.log("✅ Leaderboard API: User rank endpoint working", userRank);

      // Test leaderboard around user
      if (userRank.rank) {
        const aroundUser =
          await this.leaderboardService.getLeaderboardAroundUser(
            LeaderboardType.ALL_TIME,
            ScoreCategory.TOTAL_SCORE,
            5,
            authToken
          );

        console.log(
          `✅ Leaderboard API: Around user endpoint working, got ${aroundUser.entries.length} entries`
        );
      }

      return {
        success: true,
        message: "Authenticated leaderboard features working correctly",
      };
    } catch (error) {
      console.error("❌ Authenticated leaderboard test failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        return {
          success: false,
          message: "Authentication failed. Please login again.",
        };
      } else {
        return {
          success: false,
          message: `Authenticated features error: ${errorMessage}`,
        };
      }
    }
  }

  /**
   * Test score submission (mock data)
   */
  async testScoreSubmission(
    authToken: string
  ): Promise<{ success: boolean; message: string }> {
    if (!authToken) {
      return {
        success: false,
        message: "No authentication token provided for score submission test",
      };
    }

    try {
      // Create a test game result
      const testGameResult = {
        score: 1000,
        kills: 5,
        deaths: 1,
        assists: 2,
        survivalTimeMs: 120000, // 2 minutes
        powerUpsCollected: 3,
        enemiesDestroyed: 8,
        meteorsDestroyed: 15,
        headshots: 2,
        maxKillStreak: 3,
        isVictory: true,
        isPerfectGame: false,
        isFirstBlood: true,
        isLastManStanding: false,
        damageTaken: 250,
        experience: 500,
      };

      console.log("🧪 Testing score submission with mock data...");

      const result = await this.leaderboardService.submitScore(
        testGameResult,
        authToken
      );

      if (result.success) {
        console.log("✅ Leaderboard API: Score submission working");
        return {
          success: true,
          message: "Score submission test successful",
        };
      } else {
        return {
          success: false,
          message: `Score submission failed: ${result.message}`,
        };
      }
    } catch (error) {
      console.error("❌ Score submission test failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `Score submission test error: ${errorMessage}`,
      };
    }
  }

  /**
   * Run comprehensive leaderboard test suite
   */
  async runFullTest(authToken?: string): Promise<{
    overall: boolean;
    results: Array<{ test: string; success: boolean; message: string }>;
  }> {
    const results = [];

    console.log("🚀 Starting leaderboard connection test suite...");

    // Test 1: Basic connection
    const connectionTest = await this.testLeaderboardConnection();
    results.push({
      test: "Basic Connection",
      success: connectionTest.success,
      message: connectionTest.message,
    });

    // Test 2: Authenticated features (if token provided)
    if (authToken) {
      const authTest = await this.testAuthenticatedFeatures(authToken);
      results.push({
        test: "Authenticated Features",
        success: authTest.success,
        message: authTest.message,
      });

      // Test 3: Score submission (if token provided)
      const scoreTest = await this.testScoreSubmission(authToken);
      results.push({
        test: "Score Submission",
        success: scoreTest.success,
        message: scoreTest.message,
      });
    }

    const overall = results.every((r) => r.success);

    console.log("📊 Leaderboard test results:", results);
    console.log(`🏁 Overall result: ${overall ? "✅ PASS" : "❌ FAIL"}`);

    return { overall, results };
  }
}

// Usage example:
/*
// In your lobby component or elsewhere:
const testLeaderboard = async () => {
  const tester = new LeaderboardConnectionTest();
  const authToken = authService.getToken();
  
  const results = await tester.runFullTest(authToken);
  
  if (results.overall) {
    console.log('🎉 Leaderboard is fully connected and working!');
  } else {
    console.error('⚠️ Leaderboard has connection issues:', results.results);
  }
};
*/
