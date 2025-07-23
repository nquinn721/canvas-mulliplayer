import { makeAutoObservable } from "mobx";
import { authStore } from "./index";

export class ApiStore {
  private baseUrl: string;

  constructor() {
    makeAutoObservable(this);
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://canvas-game-203453576607.us-east1.run.app/api"
        : "http://localhost:3001/api";
  }

  // Generic API method with automatic auth headers
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    // Merge auth headers with provided headers
    const headers = {
      ...authStore.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle 401 unauthorized - token might be expired
      if (response.status === 401 && authStore.isAuthenticated) {
        console.warn("API request unauthorized - logging out");
        authStore.logout();
        return { success: false, message: "Authentication expired" };
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Convenience methods for different HTTP verbs
  async get<T = any>(
    endpoint: string
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    body?: any
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(
    endpoint: string,
    body?: any
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(
    endpoint: string
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Specific API methods for common operations
  async getUserProfile(): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    return this.get("/auth/profile");
  }

  async updateUsername(
    newUsername: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    return this.put("/auth/username", { username: newUsername });
  }

  async getGameStats(): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    return this.get("/game/stats");
  }

  async getLeaderboard(): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    return this.get("/game/leaderboard");
  }

  // Admin endpoints
  async getAllUsers(): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    return this.get("/auth/admin/users");
  }

  async updateUserRole(
    userId: string,
    role: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    return this.put(`/auth/admin/users/${userId}/role`, { role });
  }
}
