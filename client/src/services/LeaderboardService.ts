// Define enums locally since they're not exported from the backend config
export enum LeaderboardType {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  ALL_TIME = "all_time",
  SEASONAL = "seasonal",
}

export enum ScoreCategory {
  TOTAL_SCORE = "total_score",
  KILLS = "kills",
  SURVIVAL_TIME = "survival_time",
  WIN_RATE = "win_rate",
  EXPERIENCE = "experience",
  LEVEL = "level",
  KILL_DEATH_RATIO = "kill_death_ratio",
}

export interface GameResult {
  score: number;
  kills: number;
  deaths: number;
  assists?: number;
  survivalTimeMs: number;
  powerUpsCollected?: number;
  enemiesDestroyed?: number;
  meteorsDestroyed?: number;
  headshots?: number;
  maxKillStreak?: number;
  isVictory: boolean;
  isPerfectGame?: boolean;
  isFirstBlood?: boolean;
  isLastManStanding?: boolean;
  damageTaken?: number;
  experience?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  score: number;
  gamesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  winRate: number;
  killDeathRatio: number;
  averageScore: number;
  survivalTime: number;
  updatedAt: string;
}

export interface UserRank {
  rank: number | null;
  type: string;
  category: string;
}

export interface LeaderboardAroundUser {
  userRank: number | null;
  entries: LeaderboardEntry[];
  total: number;
}

export class LeaderboardService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://canvas-game-203453576607.us-east1.run.app/api"
        : "http://localhost:3001/api";
  }

  /**
   * Submit game result to update player score
   */
  async submitScore(
    gameResult: GameResult,
    token: string
  ): Promise<{ message: string; success: boolean }> {
    const response = await fetch(`${this.baseUrl}/leaderboard/submit-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(gameResult),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit score: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get leaderboard for specific type and category
   */
  async getLeaderboard(
    type: LeaderboardType = LeaderboardType.ALL_TIME,
    category: ScoreCategory = ScoreCategory.TOTAL_SCORE,
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams({
      type,
      category,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${this.baseUrl}/leaderboard?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's rank in specific leaderboard
   */
  async getUserRank(
    type: LeaderboardType = LeaderboardType.ALL_TIME,
    category: ScoreCategory = ScoreCategory.TOTAL_SCORE,
    token: string
  ): Promise<UserRank> {
    const params = new URLSearchParams({
      type,
      category,
    });

    const response = await fetch(`${this.baseUrl}/leaderboard/rank?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user rank: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get leaderboard entries around user's position
   */
  async getLeaderboardAroundUser(
    type: LeaderboardType = LeaderboardType.ALL_TIME,
    category: ScoreCategory = ScoreCategory.TOTAL_SCORE,
    range: number = 5,
    token: string
  ): Promise<LeaderboardAroundUser> {
    const params = new URLSearchParams({
      type,
      category,
      range: range.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/leaderboard/around-user?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch leaderboard around user: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get available leaderboard types and categories
   */
  async getCategories(): Promise<{
    types: typeof LeaderboardType;
    categories: typeof ScoreCategory;
  }> {
    const response = await fetch(`${this.baseUrl}/leaderboard/categories`);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Format score for display based on category
   */
  formatScore(score: number, category: ScoreCategory): string {
    switch (category) {
      case ScoreCategory.TOTAL_SCORE:
        return score.toLocaleString();

      case ScoreCategory.KILLS:
        return score.toString();

      case ScoreCategory.SURVIVAL_TIME:
        const seconds = Math.floor(score / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }

      case ScoreCategory.WIN_RATE:
        return `${(score / 100).toFixed(1)}%`;

      case ScoreCategory.EXPERIENCE:
        return score.toLocaleString();

      case ScoreCategory.LEVEL:
        return score.toString();

      case ScoreCategory.KILL_DEATH_RATIO:
        return (score / 1000).toFixed(2);

      default:
        return score.toString();
    }
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: ScoreCategory): string {
    switch (category) {
      case ScoreCategory.TOTAL_SCORE:
        return "Total Score";
      case ScoreCategory.KILLS:
        return "Kills";
      case ScoreCategory.SURVIVAL_TIME:
        return "Survival Time";
      case ScoreCategory.WIN_RATE:
        return "Win Rate";
      case ScoreCategory.EXPERIENCE:
        return "Experience";
      case ScoreCategory.LEVEL:
        return "Level";
      case ScoreCategory.KILL_DEATH_RATIO:
        return "K/D Ratio";
      default:
        return (category as string)
          .replace("_", " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  }

  /**
   * Get type display name
   */
  getTypeDisplayName(type: LeaderboardType): string {
    switch (type) {
      case LeaderboardType.DAILY:
        return "Daily";
      case LeaderboardType.WEEKLY:
        return "Weekly";
      case LeaderboardType.MONTHLY:
        return "Monthly";
      case LeaderboardType.ALL_TIME:
        return "All Time";
      case LeaderboardType.SEASONAL:
        return "Seasonal";
      default:
        return (type as string)
          .replace("_", " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  }

  /**
   * Calculate rank color based on position
   */
  getRankColor(rank: number): string {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    if (rank <= 10) return "#4169E1"; // Royal Blue
    if (rank <= 50) return "#32CD32"; // Lime Green
    if (rank <= 100) return "#FF4500"; // Orange Red
    return "#808080"; // Gray
  }

  /**
   * Get rank badge emoji
   */
  getRankBadge(rank: number): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= 10) return "🏆";
    if (rank <= 50) return "🎖️";
    if (rank <= 100) return "🏅";
    return "📊";
  }
}
