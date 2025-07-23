import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import {
  SCORING_CONFIG,
  ScoringUtils,
} from "../../shared/config/ScoringConfig";
import {
  Leaderboard,
  LeaderboardType,
  ScoreCategory,
} from "../entities/leaderboard.entity";
import { User } from "../entities/user.entity";

export interface GameResult {
  userId: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  survivalTimeMs: number;
  powerUpsCollected: number;
  enemiesDestroyed: number;
  meteorsDestroyed: number;
  headshots: number;
  maxKillStreak: number;
  isVictory: boolean;
  isPerfectGame: boolean;
  isFirstBlood: boolean;
  isLastManStanding: boolean;
  damageTaken: number;
  experience: number;
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
  updatedAt: Date;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  /**
   * Calculate and update user score based on game result
   */
  async updatePlayerScore(gameResult: GameResult): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: gameResult.userId },
      });

      if (!user) {
        this.logger.warn(`User ${gameResult.userId} not found`);
        return;
      }

      // Calculate final score using scoring system
      const finalScore = this.calculateFinalScore(gameResult);

      // Update user statistics
      await this.updateUserStatistics(user, gameResult, finalScore);

      // Update leaderboard entries for all types
      await this.updateLeaderboardEntries(user, gameResult, finalScore);

      this.logger.log(
        `Updated scores for user ${user.username}: ${finalScore} points`
      );
    } catch (error) {
      this.logger.error(
        `Error updating player score: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Calculate final score based on game result and scoring config
   */
  private calculateFinalScore(gameResult: GameResult): number {
    let score = gameResult.score;

    // Kill bonuses
    score += gameResult.kills * SCORING_CONFIG.multipliers.kill;
    score += gameResult.assists * SCORING_CONFIG.multipliers.assist;
    score += gameResult.headshots * SCORING_CONFIG.multipliers.headshot;

    // Survival bonus
    score += ScoringUtils.calculateSurvivalScore(
      SCORING_CONFIG,
      gameResult.survivalTimeMs
    );

    // Power-ups and objectives
    score +=
      gameResult.powerUpsCollected *
      SCORING_CONFIG.multipliers.powerUpCollection;
    score +=
      gameResult.enemiesDestroyed * SCORING_CONFIG.multipliers.enemyDestroyed;
    score +=
      gameResult.meteorsDestroyed * SCORING_CONFIG.multipliers.meteorDestroyed;

    // Special bonuses
    if (gameResult.isFirstBlood) {
      score += SCORING_CONFIG.multipliers.firstBlood;
    }
    if (gameResult.isLastManStanding) {
      score += SCORING_CONFIG.multipliers.lastManStanding;
    }
    if (gameResult.isVictory) {
      score += SCORING_CONFIG.multipliers.victory;
    }
    if (gameResult.isPerfectGame) {
      score += SCORING_CONFIG.multipliers.perfectGame;
    }

    // Streak bonus
    if (gameResult.maxKillStreak > 1) {
      score += ScoringUtils.calculateStreakBonus(
        SCORING_CONFIG,
        gameResult.maxKillStreak
      );
    }

    // Penalties
    score += gameResult.damageTaken * SCORING_CONFIG.multipliers.damageTaken;
    score += gameResult.deaths * SCORING_CONFIG.multipliers.death;

    return Math.max(0, Math.floor(score)); // Ensure non-negative integer
  }

  /**
   * Update user statistics
   */
  private async updateUserStatistics(
    user: User,
    gameResult: GameResult,
    finalScore: number
  ): Promise<void> {
    user.gamesPlayed += 1;
    if (gameResult.isVictory) {
      user.gamesWon += 1;
    }
    user.totalKills += gameResult.kills;
    user.totalDeaths += gameResult.deaths;
    user.totalScore += finalScore;
    user.experience += gameResult.experience;

    // Level up if necessary
    const newLevel = ScoringUtils.getLevelFromExperience(
      SCORING_CONFIG,
      user.experience
    );
    if (newLevel > user.playerLevel) {
      user.playerLevel = newLevel;
      this.logger.log(`User ${user.username} leveled up to ${newLevel}!`);
    }

    await this.userRepository.save(user);
  }

  /**
   * Update leaderboard entries for all leaderboard types
   */
  private async updateLeaderboardEntries(
    user: User,
    gameResult: GameResult,
    finalScore: number
  ): Promise<void> {
    const now = new Date();
    const leaderboardTypes = [
      LeaderboardType.ALL_TIME,
      LeaderboardType.DAILY,
      LeaderboardType.WEEKLY,
      LeaderboardType.MONTHLY,
    ];

    for (const type of leaderboardTypes) {
      const { periodStart, periodEnd } = this.getPeriodDates(type, now);

      for (const category of Object.values(ScoreCategory)) {
        await this.updateLeaderboardEntry(
          user,
          type,
          category,
          gameResult,
          finalScore,
          periodStart,
          periodEnd
        );
      }
    }
  }

  /**
   * Update a specific leaderboard entry
   */
  private async updateLeaderboardEntry(
    user: User,
    type: LeaderboardType,
    category: ScoreCategory,
    gameResult: GameResult,
    finalScore: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    let entry = await this.leaderboardRepository.findOne({
      where: {
        userId: user.id,
        type,
        category,
        periodStart,
        periodEnd,
      },
    });

    if (!entry) {
      entry = this.leaderboardRepository.create({
        userId: user.id,
        type,
        category,
        periodStart,
        periodEnd,
        score: 0,
        gamesPlayed: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        survivalTime: 0,
      });
    }

    // Update entry statistics
    entry.gamesPlayed += 1;
    if (gameResult.isVictory) entry.wins += 1;
    entry.kills += gameResult.kills;
    entry.deaths += gameResult.deaths;
    entry.survivalTime += gameResult.survivalTimeMs;

    // Update score based on category
    switch (category) {
      case ScoreCategory.TOTAL_SCORE:
        entry.score += finalScore;
        break;
      case ScoreCategory.KILLS:
        entry.score = entry.kills;
        break;
      case ScoreCategory.SURVIVAL_TIME:
        entry.score = entry.survivalTime;
        break;
      case ScoreCategory.WIN_RATE:
        entry.score = Math.floor((entry.wins / entry.gamesPlayed) * 10000); // Store as basis points
        break;
      case ScoreCategory.EXPERIENCE:
        entry.score = user.experience;
        break;
      case ScoreCategory.LEVEL:
        entry.score = user.playerLevel;
        break;
      case ScoreCategory.KILL_DEATH_RATIO:
        entry.score =
          entry.deaths > 0
            ? Math.floor((entry.kills / entry.deaths) * 1000)
            : entry.kills * 1000;
        break;
    }

    // Calculate derived statistics
    entry.averageScore =
      entry.gamesPlayed > 0 ? entry.score / entry.gamesPlayed : 0;
    entry.winRate =
      entry.gamesPlayed > 0 ? (entry.wins / entry.gamesPlayed) * 100 : 0;
    entry.killDeathRatio =
      entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills;

    await this.leaderboardRepository.save(entry);
  }

  /**
   * Get leaderboard for a specific type and category
   */
  async getLeaderboard(
    type: LeaderboardType,
    category: ScoreCategory,
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardEntry[]> {
    const { periodStart, periodEnd } = this.getPeriodDates(type, new Date());

    const entries = await this.leaderboardRepository
      .createQueryBuilder("leaderboard")
      .leftJoinAndSelect("leaderboard.user", "user")
      .where("leaderboard.type = :type", { type })
      .andWhere("leaderboard.category = :category", { category })
      .andWhere("leaderboard.periodStart = :periodStart", { periodStart })
      .andWhere("leaderboard.periodEnd = :periodEnd", { periodEnd })
      .andWhere("leaderboard.gamesPlayed >= :minGames", {
        minGames: SCORING_CONFIG.leaderboard.minimumGamesForRanking,
      })
      .orderBy("leaderboard.score", "DESC")
      .addOrderBy("leaderboard.updatedAt", "ASC") // Tiebreaker: earlier achievement
      .limit(limit)
      .offset(offset)
      .getMany();

    return entries.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.userId,
      username: entry.user.username,
      displayName: entry.user.displayName,
      score: entry.score,
      gamesPlayed: entry.gamesPlayed,
      wins: entry.wins,
      kills: entry.kills,
      deaths: entry.deaths,
      winRate: entry.winRate,
      killDeathRatio: entry.killDeathRatio,
      averageScore: entry.averageScore,
      survivalTime: entry.survivalTime,
      updatedAt: entry.updatedAt,
    }));
  }

  /**
   * Get user's rank in a specific leaderboard
   */
  async getUserRank(
    userId: string,
    type: LeaderboardType,
    category: ScoreCategory
  ): Promise<number | null> {
    const { periodStart, periodEnd } = this.getPeriodDates(type, new Date());

    const userEntry = await this.leaderboardRepository.findOne({
      where: {
        userId,
        type,
        category,
        periodStart,
        periodEnd,
      },
    });

    if (!userEntry) return null;

    const rankQuery = await this.leaderboardRepository
      .createQueryBuilder("leaderboard")
      .where("leaderboard.type = :type", { type })
      .andWhere("leaderboard.category = :category", { category })
      .andWhere("leaderboard.periodStart = :periodStart", { periodStart })
      .andWhere("leaderboard.periodEnd = :periodEnd", { periodEnd })
      .andWhere("leaderboard.gamesPlayed >= :minGames", {
        minGames: SCORING_CONFIG.leaderboard.minimumGamesForRanking,
      })
      .andWhere(
        "(leaderboard.score > :userScore OR (leaderboard.score = :userScore AND leaderboard.updatedAt < :userUpdated))",
        {
          userScore: userEntry.score,
          userUpdated: userEntry.updatedAt,
        }
      )
      .getCount();

    return rankQuery + 1;
  }

  /**
   * Update rankings for all leaderboard entries (run periodically)
   */
  async updateRankings(): Promise<void> {
    this.logger.log("Starting leaderboard ranking update...");

    try {
      for (const type of Object.values(LeaderboardType)) {
        for (const category of Object.values(ScoreCategory)) {
          await this.updateRankingsForCategory(type, category);
        }
      }

      this.logger.log("Leaderboard ranking update completed");
    } catch (error) {
      this.logger.error(
        `Error updating rankings: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Update rankings for a specific category
   */
  private async updateRankingsForCategory(
    type: LeaderboardType,
    category: ScoreCategory
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getPeriodDates(type, new Date());

    const entries = await this.leaderboardRepository
      .createQueryBuilder("leaderboard")
      .where("leaderboard.type = :type", { type })
      .andWhere("leaderboard.category = :category", { category })
      .andWhere("leaderboard.periodStart = :periodStart", { periodStart })
      .andWhere("leaderboard.periodEnd = :periodEnd", { periodEnd })
      .andWhere("leaderboard.gamesPlayed >= :minGames", {
        minGames: SCORING_CONFIG.leaderboard.minimumGamesForRanking,
      })
      .orderBy("leaderboard.score", "DESC")
      .addOrderBy("leaderboard.updatedAt", "ASC")
      .getMany();

    // Update ranks in batches
    const batchSize = SCORING_CONFIG.leaderboard.rankingUpdateBatchSize;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        batch[j].rank = i + j + 1;
      }

      await this.leaderboardRepository.save(batch);
    }
  }

  /**
   * Clean up old leaderboard entries
   */
  async cleanupOldEntries(): Promise<void> {
    this.logger.log("Starting leaderboard cleanup...");

    try {
      for (const [type, retentionDays] of Object.entries(
        SCORING_CONFIG.leaderboard.retentionDays
      )) {
        if (retentionDays === -1) continue; // Skip permanent entries

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        await this.leaderboardRepository.delete({
          type: type as LeaderboardType,
          periodEnd: LessThan(cutoffDate),
        });
      }

      this.logger.log("Leaderboard cleanup completed");
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`, error.stack);
    }
  }

  /**
   * Get period dates for leaderboard type
   */
  private getPeriodDates(
    type: LeaderboardType,
    date: Date
  ): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(date);
    const periodEnd = new Date(date);

    switch (type) {
      case LeaderboardType.DAILY:
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;

      case LeaderboardType.WEEKLY:
        const dayOfWeek = periodStart.getDay();
        periodStart.setDate(periodStart.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;

      case LeaderboardType.MONTHLY:
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0);
        periodEnd.setHours(23, 59, 59, 999);
        break;

      case LeaderboardType.ALL_TIME:
        periodStart.setTime(0); // Unix epoch
        periodEnd.setFullYear(9999); // Far future
        break;

      case LeaderboardType.SEASONAL:
        // Calculate season based on config
        const seasonLength = SCORING_CONFIG.season.durationDays;
        const epochStart = new Date("2024-01-01"); // Game launch date
        const daysSinceEpoch = Math.floor(
          (date.getTime() - epochStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        const currentSeason = Math.floor(daysSinceEpoch / seasonLength);

        periodStart.setTime(
          epochStart.getTime() +
            currentSeason * seasonLength * 24 * 60 * 60 * 1000
        );
        periodEnd.setTime(
          periodStart.getTime() + seasonLength * 24 * 60 * 60 * 1000 - 1
        );
        break;
    }

    return { periodStart, periodEnd };
  }
}
