import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

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

@Entity("leaderboard")
@Index("idx_leaderboard_ranking", ["type", "category", "score"])
@Index("idx_user_category", ["userId", "type", "category"], { unique: true })
@Index("idx_period", ["periodStart", "periodEnd"])
export class Leaderboard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: LeaderboardType,
  })
  type: LeaderboardType;

  @Column({
    type: "enum",
    enum: ScoreCategory,
  })
  category: ScoreCategory;

  @Column({ type: "bigint", default: 0 })
  score: number;

  @Column({ type: "int", default: 0 })
  rank: number;

  @Column({ type: "int", default: 0 })
  gamesPlayed: number;

  @Column({ type: "int", default: 0 })
  wins: number;

  @Column({ type: "int", default: 0 })
  kills: number;

  @Column({ type: "int", default: 0 })
  deaths: number;

  @Column({ type: "bigint", default: 0 })
  survivalTime: number; // in milliseconds

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  averageScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  killDeathRatio: number;

  @Column({ type: "datetime" })
  periodStart: Date;

  @Column({ type: "datetime" })
  periodEnd: Date;

  @Column({ type: "json", nullable: true })
  metadata: any; // For storing additional game-specific data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  get efficiency(): number {
    return this.gamesPlayed > 0 ? this.score / this.gamesPlayed : 0;
  }

  get averageSurvivalTime(): number {
    return this.gamesPlayed > 0 ? this.survivalTime / this.gamesPlayed : 0;
  }
}
