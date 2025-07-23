import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { LeaderboardType, ScoreCategory } from "../entities/leaderboard.entity";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import {
  GameResult,
  LeaderboardEntry,
  LeaderboardService,
} from "../services/leaderboard.service";

export class UpdateScoreDto {
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

export class LeaderboardQueryDto {
  type?: LeaderboardType;
  category?: ScoreCategory;
  limit?: number;
  offset?: number;
}

@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Submit game result and update player score
   */
  @Post("submit-score")
  @UseGuards(JwtAuthGuard)
  async submitScore(
    @Request() req: any,
    @Body() scoreData: UpdateScoreDto
  ): Promise<{ message: string; success: boolean }> {
    try {
      const gameResult: GameResult = {
        userId: req.user.id,
        score: scoreData.score,
        kills: scoreData.kills,
        deaths: scoreData.deaths,
        assists: scoreData.assists || 0,
        survivalTimeMs: scoreData.survivalTimeMs,
        powerUpsCollected: scoreData.powerUpsCollected || 0,
        enemiesDestroyed: scoreData.enemiesDestroyed || 0,
        meteorsDestroyed: scoreData.meteorsDestroyed || 0,
        headshots: scoreData.headshots || 0,
        maxKillStreak: scoreData.maxKillStreak || 0,
        isVictory: scoreData.isVictory,
        isPerfectGame: scoreData.isPerfectGame || false,
        isFirstBlood: scoreData.isFirstBlood || false,
        isLastManStanding: scoreData.isLastManStanding || false,
        damageTaken: scoreData.damageTaken || 0,
        experience: scoreData.experience || 0,
      };

      await this.leaderboardService.updatePlayerScore(gameResult);

      return {
        message: "Score updated successfully",
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update score: ${error.message}`);
    }
  }

  /**
   * Get leaderboard for specific type and category
   */
  @Get()
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto
  ): Promise<LeaderboardEntry[]> {
    const type = query.type || LeaderboardType.ALL_TIME;
    const category = query.category || ScoreCategory.TOTAL_SCORE;
    const limit = Math.min(query.limit || 100, 1000); // Max 1000 entries
    const offset = query.offset || 0;

    if (!Object.values(LeaderboardType).includes(type)) {
      throw new BadRequestException("Invalid leaderboard type");
    }

    if (!Object.values(ScoreCategory).includes(category)) {
      throw new BadRequestException("Invalid score category");
    }

    return this.leaderboardService.getLeaderboard(
      type,
      category,
      limit,
      offset
    );
  }

  /**
   * Get user's rank in specific leaderboard
   */
  @Get("rank")
  @UseGuards(JwtAuthGuard)
  async getUserRank(
    @Request() req: any,
    @Query("type") type: LeaderboardType = LeaderboardType.ALL_TIME,
    @Query("category") category: ScoreCategory = ScoreCategory.TOTAL_SCORE
  ): Promise<{ rank: number | null; type: string; category: string }> {
    if (!Object.values(LeaderboardType).includes(type)) {
      throw new BadRequestException("Invalid leaderboard type");
    }

    if (!Object.values(ScoreCategory).includes(category)) {
      throw new BadRequestException("Invalid score category");
    }

    const rank = await this.leaderboardService.getUserRank(
      req.user.id,
      type,
      category
    );

    return {
      rank,
      type,
      category,
    };
  }

  /**
   * Get available leaderboard types and categories
   */
  @Get("categories")
  getCategories(): {
    types: typeof LeaderboardType;
    categories: typeof ScoreCategory;
  } {
    return {
      types: LeaderboardType,
      categories: ScoreCategory,
    };
  }

  /**
   * Get user's position around their rank (e.g., 5 above and 5 below)
   */
  @Get("around-user")
  @UseGuards(JwtAuthGuard)
  async getLeaderboardAroundUser(
    @Request() req: any,
    @Query("type") type: LeaderboardType = LeaderboardType.ALL_TIME,
    @Query("category") category: ScoreCategory = ScoreCategory.TOTAL_SCORE,
    @Query("range") range: number = 5
  ): Promise<{
    userRank: number | null;
    entries: LeaderboardEntry[];
    total: number;
  }> {
    if (!Object.values(LeaderboardType).includes(type)) {
      throw new BadRequestException("Invalid leaderboard type");
    }

    if (!Object.values(ScoreCategory).includes(category)) {
      throw new BadRequestException("Invalid score category");
    }

    const userRank = await this.leaderboardService.getUserRank(
      req.user.id,
      type,
      category
    );

    if (!userRank) {
      throw new NotFoundException("User not found in leaderboard");
    }

    const rangeNum = Math.min(Math.max(range, 1), 50); // Limit range to 1-50
    const offset = Math.max(0, userRank - rangeNum - 1);
    const limit = rangeNum * 2 + 1;

    const entries = await this.leaderboardService.getLeaderboard(
      type,
      category,
      limit,
      offset
    );

    return {
      userRank,
      entries,
      total: entries.length,
    };
  }

  /**
   * Manually trigger leaderboard ranking update (admin only)
   */
  @Post("update-rankings")
  @UseGuards(JwtAuthGuard)
  async updateRankings(
    @Request() req: any
  ): Promise<{ message: string; success: boolean }> {
    // Check if user has admin access
    if (
      !req.user.isAdmin &&
      req.user.role !== "admin" &&
      req.user.role !== "super_admin"
    ) {
      throw new BadRequestException("Insufficient permissions");
    }

    try {
      await this.leaderboardService.updateRankings();
      return {
        message: "Rankings updated successfully",
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update rankings: ${error.message}`
      );
    }
  }

  /**
   * Manually trigger leaderboard cleanup (admin only)
   */
  @Post("cleanup")
  @UseGuards(JwtAuthGuard)
  async cleanupOldEntries(
    @Request() req: any
  ): Promise<{ message: string; success: boolean }> {
    // Check if user has admin access
    if (
      !req.user.isAdmin &&
      req.user.role !== "admin" &&
      req.user.role !== "super_admin"
    ) {
      throw new BadRequestException("Insufficient permissions");
    }

    try {
      await this.leaderboardService.cleanupOldEntries();
      return {
        message: "Cleanup completed successfully",
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to cleanup: ${error.message}`);
    }
  }
}
