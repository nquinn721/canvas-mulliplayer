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
  kills?: number;
  experience?: number;
  totalPlayTime?: number;
  level?: number;
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

class AuthService {
  private token: string | null = null;
  private user: AuthUser | null = null;
  private baseUrl = "http://localhost:3001/api";

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("authUser");
      }
    }
  }

  // Authentication methods
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        this.setAuth(data.data.token, data.data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async login(identifier: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        this.setAuth(data.data.token, data.data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async loginAsGuest(username?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        this.setAuth(data.data.token, data.data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async updateUsername(newUsername: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data && this.user) {
        // Update local user data
        this.user.username = data.data.user.username;
        localStorage.setItem("authUser", JSON.stringify(this.user));
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  // OAuth methods
  async initiateGoogleAuth(): Promise<{
    success: boolean;
    authUrl?: string;
    message: string;
  }> {
    try {
      // Redirect directly to backend OAuth route
      const authUrl = `${this.baseUrl}/auth/google`;
      window.location.href = authUrl;

      return {
        success: true,
        authUrl,
        message: "Redirecting to Google...",
      };
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  // Handle OAuth callback (called when user returns from OAuth provider)
  async handleOAuthCallback(): Promise<AuthResponse> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const error = urlParams.get("error");

      if (error) {
        return {
          success: false,
          message: decodeURIComponent(error),
        };
      }

      if (token) {
        // Token is provided in URL, use it directly
        const userData = await this.validateToken(token);
        if (userData) {
          this.setAuth(token, userData);
          // Clear URL parameters after successful OAuth
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          return {
            success: true,
            message: "OAuth authentication successful",
            data: { token, user: userData },
          };
        }
      }

      return {
        success: false,
        message: "No valid token received from OAuth",
      };
    } catch (error) {
      return {
        success: false,
        message: "OAuth callback failed",
      };
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
        return data.data?.user || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getProfile(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        this.user = data.data.user;
        localStorage.setItem("authUser", JSON.stringify(this.user));
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  // Utility methods
  private setAuth(token: string, user: AuthUser) {
    this.token = token;
    this.user = user;
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user && !this.user.isGuest;
  }

  isGuest(): boolean {
    return !!this.user?.isGuest;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getUsername(): string | null {
    return this.user?.username || null;
  }

  // Socket.io integration
  connectToGame(): Socket {
    const socket = io("http://localhost:3001", {
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
          this.user.username = data.newUsername;
          localStorage.setItem("authUser", JSON.stringify(this.user));
        }
      }
    );

    // Listen for errors
    socket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);
    });

    return socket;
  }

  // Helper method to update username through socket
  updateUsernameViaSocket(socket: Socket, newUsername: string) {
    socket.emit("updateUsername", { newUsername });
  }
}

export const authService = new AuthService();
