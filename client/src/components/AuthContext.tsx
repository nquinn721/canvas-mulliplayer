import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authService, AuthUser } from "../services/AuthService";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  loginAsGuest: (
    username?: string
  ) => Promise<{ success: boolean; message: string }>;
  updateUsername: (
    newUsername: string
  ) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const initializeAuth = async () => {
      // Check for OAuth callback first
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const error = urlParams.get("error");

      console.log("URL params:", window.location.search);
      console.log("Token from URL:", token);

      if (token) {
        // Handle OAuth callback with token
        try {
          // Validate the token and get user data
          const userData = await authService.validateTokenAndSetAuth(token);
          console.log("OAuth validation result:", userData);
          if (userData) {
            setUser(userData);
            // Clear URL parameters and redirect to lobby
            window.history.replaceState({}, document.title, "/lobby");
          } else {
            console.error("OAuth validation failed");
            window.history.replaceState({}, document.title, "/login");
          }
        } catch (error) {
          console.error("OAuth error:", error);
          window.history.replaceState({}, document.title, "/login");
        }
      } else if (error) {
        // Handle OAuth error
        window.history.replaceState({}, document.title, "/login");
      } else {
        // Normal authentication check
        const existingToken = authService.getToken();
        if (existingToken) {
          try {
            const response = await authService.getProfile();
            if (response.success && response.data) {
              // Backend returns user data directly in response.data
              setUser(response.data as any);
              // If user is authenticated and on login page, redirect to lobby
              if (
                window.location.pathname === "/login" ||
                window.location.pathname === "/"
              ) {
                window.history.replaceState({}, document.title, "/lobby");
              }
            } else {
              // Token is invalid, clear it
              authService.logout();
              setUser(null);
            }
          } catch (error) {
            // Token is invalid, clear it
            authService.logout();
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(identifier, password);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return { success: response.success, message: response.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    setIsLoading(true);
    try {
      const response = await authService.register(username, email, password);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return { success: response.success, message: response.message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async (username?: string) => {
    setIsLoading(true);
    try {
      const response = await authService.loginAsGuest(username);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return { success: response.success, message: response.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsername = async (newUsername: string) => {
    try {
      const response = await authService.updateUsername(newUsername);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return { success: response.success, message: response.message };
    } catch (error) {
      return { success: false, message: "Failed to update username" };
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const response = await authService.initiateGoogleAuth();
      return { success: response.success, message: response.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: authService.isAuthenticated(),
    isGuest: authService.isGuest(),
    isLoading,
    login,
    register,
    loginAsGuest,
    updateUsername,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
