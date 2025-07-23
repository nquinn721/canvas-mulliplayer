import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum UserRole {
  GUEST = "guest",
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  FACEBOOK = "facebook",
  GUEST = "guest",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    type: "enum",
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  facebookId: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: "Unnamed Player" })
  displayName: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpires: Date;

  // Game Statistics
  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  gamesWon: number;

  @Column({ default: 0 })
  totalKills: number;

  @Column({ default: 0 })
  totalDeaths: number;

  @Column({ default: 0 })
  totalScore: number;

  @Column({ default: 0 })
  highScore: number;

  @Column({ default: 1 })
  playerLevel: number;

  @Column({ default: 0 })
  experience: number;

  @Column({ type: "json", nullable: true })
  preferences: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  // Helper methods
  get isGuest(): boolean {
    return this.authProvider === AuthProvider.GUEST;
  }

  get hasAdminAccess(): boolean {
    return (
      this.isAdmin ||
      this.role === UserRole.ADMIN ||
      this.role === UserRole.SUPER_ADMIN
    );
  }

  get winRate(): number {
    return this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed) * 100 : 0;
  }

  get killDeathRatio(): number {
    return this.totalDeaths > 0
      ? this.totalKills / this.totalDeaths
      : this.totalKills;
  }
}
