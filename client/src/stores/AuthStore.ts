import { makeAutoObservable, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { authService, AuthUser } from "../services/AuthService";

export class AuthStore {
  // Observable state
  user: AuthUser | null = null;
  token: string | null = null;
  isLoading: boolean = true;
  isAuthenticated: boolean = false;
  isGuest: boolean = false;

  private authServiceInstance = authService;

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
      const response = await this.authServiceInstance.login(
        identifier,
        password
      );

      if (response.success && response.data?.token && response.data?.user) {
        runInAction(() => {
          this.setAuth(response.data!.token, response.data!.user);
        });
      }

      return { success: response.success, message: response.message };
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
      const response = await this.authServiceInstance.register(
        username,
        email,
        password
      );

      if (response.success && response.data?.token && response.data?.user) {
        runInAction(() => {
          this.setAuth(response.data!.token, response.data!.user);
        });
      }

      return { success: response.success, message: response.message };
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
      const response = await this.authServiceInstance.loginAsGuest(username);

      if (response.success && response.data?.token && response.data?.user) {
        runInAction(() => {
          this.setAuth(response.data!.token, response.data!.user);
        });
      }

      return { success: response.success, message: response.message };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.authServiceInstance.initiateGoogleAuth();
      return response;
    } catch (error) {
      return { success: false, message: "Google authentication failed" };
    }
  }

  // Handle OAuth callback (called from AuthContext)
  async handleOAuthCallback(token: string): Promise<boolean> {
    console.log("AuthStore: handleOAuthCallback called with token:", token);
    
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      console.log("AuthStore: Validating token with auth service...");
      const userData =
        await this.authServiceInstance.validateTokenAndSetAuth(token);

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

  async updateUsername(
    newUsername: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response =
        await this.authServiceInstance.updateUsername(newUsername);

      if (response.success && response.data?.user && this.user) {
        runInAction(() => {
          this.user!.username = response.data!.user.username;
          // mobx-persist-store automatically persists the state
        });
      }

      return response;
    } catch (error) {
      return { success: false, message: "Failed to update username" };
    }
  }

  async refreshProfile(): Promise<void> {
    if (!this.token) return;

    try {
      const response = await this.authServiceInstance.getProfile();

      if (response.success && response.data) {
        runInAction(() => {
          this.user = response.data as any;
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
    this.authServiceInstance.logout();
  }

  // Helper methods
  private setAuth(token: string, user: AuthUser): void {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;
    this.isGuest = user.isGuest || false;
    // mobx-persist-store automatically persists the state
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
}
