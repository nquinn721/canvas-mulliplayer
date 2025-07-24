import { makeAutoObservable } from "mobx";
import {
  calculateLevelFromExperience,
  getExperienceRequiredForLevel,
} from "../../../shared/config/ExperienceConfig";
import { AuthStore } from "../stores/AuthStore";

export interface PlayerExperienceData {
  experience: number;
  level: number;
  experienceToNextLevel: number;
  experienceRequiredForNextLevel: number;
  progressPercent: number;
}

/**
 * Service to manage player experience and level data
 * Handles both authenticated users (from database) and guests (from localStorage)
 */
export class ExperienceService {
  private authStore: AuthStore;
  private localStorageKey = "canvas-game-guest-experience";

  constructor(authStore: AuthStore) {
    makeAutoObservable(this);
    this.authStore = authStore;
  }

  /**
   * Get current player's experience data
   * Returns data from user record if authenticated, localStorage if guest
   */
  getCurrentExperienceData(): PlayerExperienceData {
    if (
      this.authStore.isAuthenticated &&
      !this.authStore.isGuest &&
      this.authStore.user
    ) {
      // Authenticated user - use data from user record
      const experience = this.authStore.user.experience || 0;

      // Always calculate level from experience using ExperienceConfig (single source of truth)
      const calculatedLevel = calculateLevelFromExperience(experience);

      // Update user's playerLevel if it doesn't match calculated level
      if (this.authStore.user.playerLevel !== calculatedLevel) {
        this.authStore.user.playerLevel = calculatedLevel;
      }

      return this.calculateProgressionInfo(experience);
    } else {
      // Guest user - use localStorage
      return this.getGuestExperienceData();
    }
  }

  /**
   * Add experience points to the current player
   * Updates user record if authenticated, localStorage if guest
   */
  addExperience(xpGained: number) {
    if (
      this.authStore.isAuthenticated &&
      !this.authStore.isGuest &&
      this.authStore.user
    ) {
      // Authenticated user - update user record
      const currentXP = this.authStore.user.experience || 0;
      const newXP = currentXP + xpGained;
      const newLevel = calculateLevelFromExperience(newXP);

      // Update user object in AuthStore (this will be synced to server)
      this.authStore.user.experience = newXP;
      this.authStore.user.playerLevel = newLevel;

      // TODO: Send update to server to persist in database
      this.updateServerExperience(newXP, newLevel);
    } else {
      // Guest user - update localStorage
      this.updateGuestExperience(xpGained);
    }
  }

  /**
   * Get guest experience data from localStorage
   */
  private getGuestExperienceData(): PlayerExperienceData {
    try {
      const storedData = localStorage.getItem(this.localStorageKey);
      let experience = 0;

      if (storedData) {
        const parsed = JSON.parse(storedData);
        experience = parsed.experience || 0;
      }

      return this.calculateProgressionInfo(experience);
    } catch (error) {
      console.warn("Failed to load guest experience from localStorage:", error);
      return this.calculateProgressionInfo(0);
    }
  }

  /**
   * Update guest experience in localStorage
   */
  private updateGuestExperience(xpGained: number) {
    try {
      const currentData = this.getGuestExperienceData();
      const newExperience = currentData.experience + xpGained;
      const newLevel = calculateLevelFromExperience(newExperience);

      const dataToStore = {
        experience: newExperience,
        level: newLevel,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn("Failed to save guest experience to localStorage:", error);
    }
  }

  /**
   * Calculate progression information from total experience
   */
  private calculateProgressionInfo(
    totalExperience: number
  ): PlayerExperienceData {
    const level = calculateLevelFromExperience(totalExperience);
    const xpForCurrentLevel = getExperienceRequiredForLevel(level);
    const xpForNextLevel = getExperienceRequiredForLevel(level + 1);
    const xpInCurrentLevel = totalExperience - xpForCurrentLevel;
    const xpRequiredForNextLevel = xpForNextLevel - xpForCurrentLevel;
    const progressPercent =
      xpRequiredForNextLevel > 0
        ? (xpInCurrentLevel / xpRequiredForNextLevel) * 100
        : 100;

    return {
      experience: totalExperience,
      level: level,
      experienceToNextLevel: xpInCurrentLevel,
      experienceRequiredForNextLevel: xpRequiredForNextLevel,
      progressPercent: Math.min(progressPercent, 100),
    };
  }

  /**
   * Send experience update to server for authenticated users
   */
  private async updateServerExperience(experience: number, level: number) {
    if (!this.authStore.isAuthenticated || this.authStore.isGuest) {
      return;
    }

    // Use AuthStore's updateExperience method
    await this.authStore.updateExperience(experience, level);
  }

  /**
   * Reset guest experience (useful for testing or new guest sessions)
   */
  resetGuestExperience() {
    try {
      localStorage.removeItem(this.localStorageKey);
    } catch (error) {
      console.warn("Failed to reset guest experience:", error);
    }
  }

  /**
   * Check if player leveled up after gaining experience
   */
  checkForLevelUp(oldLevel: number, newLevel: number): boolean {
    return newLevel > oldLevel;
  }
}
