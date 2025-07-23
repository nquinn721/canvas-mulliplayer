import { authStore, gamePreferencesStore } from "../stores";

export class GameSessionService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSessionActive: boolean = false;

  constructor() {
    // Bind methods to preserve 'this' context
    this.startSession = this.startSession.bind(this);
    this.endSession = this.endSession.bind(this);
    this.syncToServer = this.syncToServer.bind(this);
    this.updateScore = this.updateScore.bind(this);
    this.addKill = this.addKill.bind(this);
    this.addDeath = this.addDeath.bind(this);
  }

  // Start a new game session
  startSession() {
    if (this.isSessionActive) {
      console.warn("Session already active");
      return;
    }

    console.log("Starting new game session...");
    this.isSessionActive = true;
    gamePreferencesStore.startNewSession();

    // Set up periodic sync for logged-in users (every 2 minutes)
    if (authStore.isAuthenticated && !authStore.isGuest) {
      this.syncInterval = setInterval(() => {
        if (gamePreferencesStore.needsSync()) {
          this.syncToServer();
        }
      }, 120000); // 2 minutes
    }
  }

  // End the current session
  async endSession() {
    if (!this.isSessionActive) {
      console.warn("No active session to end");
      return;
    }

    console.log("Ending game session...");
    this.isSessionActive = false;

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Final sync for logged-in users
    if (authStore.isAuthenticated && !authStore.isGuest) {
      await this.syncToServer(true); // Force sync on session end
    }

    // Commit session data to guest totals
    gamePreferencesStore.endSession();
  }

  // Update score in real-time
  updateScore(newScore: number) {
    if (!this.isSessionActive) return;
    gamePreferencesStore.updateSessionScore(newScore);
  }

  // Add a kill in real-time
  addKill() {
    if (!this.isSessionActive) return;
    gamePreferencesStore.addSessionKill();
  }

  // Add a death in real-time
  addDeath() {
    if (!this.isSessionActive) return;
    gamePreferencesStore.addSessionDeath();
  }

  // Sync current session data to server
  private async syncToServer(forceSync: boolean = false) {
    if (!authStore.isAuthenticated || authStore.isGuest) {
      return;
    }

    if (!forceSync && !gamePreferencesStore.needsSync()) {
      return;
    }

    try {
      const sessionData = gamePreferencesStore.getSessionData();

      // Only sync if there's meaningful data
      if (
        sessionData.score === 0 &&
        sessionData.kills === 0 &&
        sessionData.deaths === 0
      ) {
        return;
      }

      console.log("Syncing session data to server:", sessionData);

      const response = await authStore.updateUserScore(
        sessionData.score,
        sessionData.kills,
        sessionData.deaths
      );

      if (response.success) {
        gamePreferencesStore.markSynced();
        console.log("Session data synced successfully");
      } else {
        console.error("Failed to sync session data:", response.message);
      }
    } catch (error) {
      console.error("Error syncing session data:", error);
    }
  }

  // Get current session stats
  getSessionStats() {
    return gamePreferencesStore.currentSessionStats;
  }

  // Check if session is active
  isActive() {
    return this.isSessionActive;
  }

  // Force sync now (useful for manual sync)
  async forceSyncNow() {
    if (this.isSessionActive) {
      await this.syncToServer(true);
    }
  }
}
