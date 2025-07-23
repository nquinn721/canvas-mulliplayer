import { makeAutoObservable, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { io, Socket } from "socket.io-client";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  authProvider: string;
  isGuest?: boolean;
  avatar?: string;
  gamesPlayed?: number;
  highScore?: number;
  totalScore?: number;
  totalKills?: number;
  kills?: number;
  experience?: number;
  totalPlayTime?: number;
  level?: number;
  playerLevel?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
}

export interface AuthStatus {
  isAuthenticated: boolean;
  isGuest: boolean;
  username?: string;
  userId?: string;
}

export class AuthStore {
  // Observable state
  user: AuthUser | null = null;
  token: string | null = null;
  isLoading: boolean = true;
  isAuthenticated: boolean = false;
  isGuest: boolean = false;

  private baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://canvas-game-203453576607.us-east1.run.app/api"
      : "http://localhost:3001/api";

  constructor() {
    makeAutoObservable(this);

    // Make store persistable with mobx-persist-store
    makePersistable(this, {
      name: "AuthStore",
      properties: ["user", "token", "isAuthenticated", "isGuest"],
      storage: window.localStorage,
    }).then(() => {
      console.log("AuthStore hydrated from storage");
      runInAction(() => {
        this.isLoading = false;
      });
    });
  }

  // Actions
  async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.token && data.data?.user) {
        runInAction(() => {
          this.setAuth(data.data!.token, data.data!.user);
        });
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.token && data.data?.user) {
        runInAction(() => {
          this.setAuth(data.data!.token, data.data!.user);
        });
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loginAsGuest(
    username?: string
  ): Promise<{ success: boolean; message: string }> {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      // Generate username if not provided
      let guestUsername = username;
      if (!guestUsername) {
        guestUsername = `Guest_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Create a client-side only guest user (no server call)
      const guestUser: AuthUser = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: guestUsername,
        email: undefined,
        role: "guest",
        authProvider: "guest",
        isGuest: true,
        avatar: undefined,
        gamesPlayed: 0,
        highScore: 0,
        totalScore: 0,
        totalKills: 0,
        kills: 0,
        experience: 0,
        totalPlayTime: 0,
        level: 1,
        playerLevel: 1,
      };

      // Create a fake token for guest users (client-side only)
      const guestToken = `guest_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      runInAction(() => {
        this.setAuth(guestToken, guestUser);
      });

      return {
        success: true,
        message: `Welcome, ${guestUsername}! Playing as guest - your data will be saved locally.`,
      };
    } catch (error) {
      return {
        success: false,
        message: "Guest login failed",
      };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; message: string }> {
    try {
      // Redirect directly to backend OAuth route
      const authUrl = `${this.baseUrl}/auth/google`;
      window.location.href = authUrl;

      return {
        success: true,
        message: "Redirecting to Google...",
      };
    } catch (error) {
      return {
        success: false,
        message: "Google authentication failed",
      };
    }
  }

  // Handle OAuth callback (called from AuthContext)
  async handleOAuthCallback(token: string): Promise<boolean> {
    console.log("AuthStore: handleOAuthCallback called with token:", token);

    runInAction(() => {
      this.isLoading = true;
    });

    try {
      console.log("AuthStore: Validating token with backend...");
      const userData = await this.validateToken(token);

      console.log("AuthStore: Token validation result:", userData);

      if (userData) {
        runInAction(() => {
          console.log("AuthStore: Setting auth with validated user data");
          this.setAuth(token, userData);
        });
        return true;
      }
      console.log("AuthStore: Token validation failed - no user data");
      return false;
    } catch (error) {
      console.error("AuthStore: Error in handleOAuthCallback:", error);
      return false;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Helper method to validate token and get user data
  private async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async updateUsername(
    newUsername: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.token) {
        return { success: false, message: "No authentication token available" };
      }

      const response = await fetch(`${this.baseUrl}/auth/username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.user && this.user) {
        runInAction(() => {
          this.user!.username = data.data!.user.username;
          // mobx-persist-store automatically persists the state
        });
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async refreshProfile(): Promise<void> {
    if (!this.token) return;

    // Skip API call for guest users
    if (this.isGuest || this.user?.isGuest) return;

    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        // If unauthorized, clear auth data
        if (response.status === 401) {
          this.logout();
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        runInAction(() => {
          // Backend returns user data directly in data.data
          this.user = data.data as any;
          // mobx-persist-store automatically persists the state
        });
      } else {
        // Token might be invalid
        this.logout();
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      this.logout();
    }
  }

  logout(): void {
    runInAction(() => {
      this.clearAuth();
    });
  }

  // Helper methods
  private setAuth(token: string, user: AuthUser): void {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;
    this.isGuest = user.isGuest || false;
    // mobx-persist-store automatically persists the state
  }

  // Public method for external services to set auth
  public setAuthenticationData(token: string, user: AuthUser): void {
    runInAction(() => {
      this.setAuth(token, user);
    });
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    this.isGuest = false;
    // mobx-persist-store automatically persists the state
  }

  // Getters for easy access
  get username(): string | null {
    return this.user?.username || null;
  }

  get userId(): string | null {
    return this.user?.id || null;
  }

  get userRole(): string | null {
    return this.user?.role || null;
  }

  get authToken(): string | null {
    return this.token;
  }

  // Method to get auth headers for API calls
  getAuthHeaders(): Record<string, string> {
    if (this.token) {
      return {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      };
    }
    return {
      "Content-Type": "application/json",
    };
  }

  // Socket.io integration
  connectToGame(): Socket {
    const socketUrl =
      process.env.NODE_ENV === "production"
        ? "https://canvas-game-203453576607.us-east1.run.app"
        : "http://localhost:3001";

    const socket = io(socketUrl, {
      auth: {
        token: this.token,
      },
    });

    // Listen for authentication status from server
    socket.on("authStatus", (status: AuthStatus) => {
      console.log("Authentication status:", status);
    });

    // Listen for username updates from server
    socket.on(
      "usernameUpdated",
      (data: { newUsername: string; message: string }) => {
        console.log("Username updated:", data);
        if (this.user) {
          runInAction(() => {
            this.user!.username = data.newUsername;
            // mobx-persist-store automatically persists the state
          });
        }
      }
    );

    // Listen for errors
    socket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);
    });

    return socket;
  }

  // Update user score on server
  async updateUserScore(
    score: number,
    kills: number = 0,
    deaths: number = 0
  ): Promise<{ success: boolean; message: string }> {
    if (!this.token || !this.user || this.isGuest) {
      return { success: false, message: "No authenticated user to update" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/update-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ score, kills, deaths }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Update local user data with the latest from server
        runInAction(() => {
          this.user = { ...this.user!, ...data.user };
        });
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      console.error("Error updating user score:", error);
      return {
        success: false,
        message: "Network error occurred while updating score",
      };
    }
  }

  // Helper method to update username through socket
  updateUsernameViaSocket(socket: Socket, newUsername: string) {
    socket.emit("updateUsername", { newUsername });
  }
}
