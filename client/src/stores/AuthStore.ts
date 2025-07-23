import { makeAutoObservable, runInAction } from "mobx";
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

    // Initialize from localStorage
    this.initializeFromStorage();
  }

  // Initialize auth state from localStorage
  private initializeFromStorage() {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedToken && savedUser) {
      try {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
        this.isGuest = this.user?.isGuest || false;
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        this.clearAuth();
      }
    }
    this.isLoading = false;
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
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const userData =
        await this.authServiceInstance.validateTokenAndSetAuth(token);

      if (userData) {
        runInAction(() => {
          this.setAuth(token, userData);
        });
        return true;
      }
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
          localStorage.setItem("authUser", JSON.stringify(this.user));
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
          localStorage.setItem("authUser", JSON.stringify(this.user));
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

    // Store in localStorage
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    this.isGuest = false;

    // Clear localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
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
