import { observer } from "mobx-react-lite";
import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { AuthUser } from "../services/AuthService";
import { authStore } from "../stores";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
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
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  updateUsername: (
    newUsername: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = observer(
  ({ children }) => {
    useEffect(() => {
      // Check for OAuth callback when component mounts
      const initializeAuth = async () => {
        // Check for OAuth callback first
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const error = urlParams.get("error");

        console.log("URL params:", window.location.search);
        console.log("Token from URL:", token);

        if (token) {
          // Handle OAuth callback with token using the store
          const success = await authStore.handleOAuthCallback(token);
          console.log("OAuth validation result:", success);

          if (success) {
            // Clear URL parameters and redirect to lobby
            window.history.replaceState({}, document.title, "/lobby");
          } else {
            console.error("OAuth validation failed");
            window.history.replaceState({}, document.title, "/login");
          }
        } else if (error) {
          // Handle OAuth error
          console.error("OAuth error:", decodeURIComponent(error));
          window.history.replaceState({}, document.title, "/login");
        } else {
          // Normal authentication check - refresh profile if token exists and user is not a guest
          if (authStore.token && !authStore.isGuest) {
            try {
              await authStore.refreshProfile();
              // If user is authenticated and on login page, redirect to lobby
              if (
                authStore.isAuthenticated &&
                (window.location.pathname === "/login" ||
                  window.location.pathname === "/")
              ) {
                window.history.replaceState({}, document.title, "/lobby");
              }
            } catch (error) {
              console.error("Profile refresh failed:", error);
            }
          }
        }
      };

      initializeAuth();
    }, []);

    const contextValue: AuthContextType = {
      user: authStore.user,
      isAuthenticated: authStore.isAuthenticated,
      isLoading: authStore.isLoading,
      isGuest: authStore.isGuest,
      login: authStore.login.bind(authStore),
      register: authStore.register.bind(authStore),
      loginAsGuest: authStore.loginAsGuest.bind(authStore),
      loginWithGoogle: authStore.loginWithGoogle.bind(authStore),
      updateUsername: authStore.updateUsername.bind(authStore),
      logout: authStore.logout.bind(authStore),
      refreshProfile: authStore.refreshProfile.bind(authStore),
    };

    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  }
);
