import { observer } from "mobx-react-lite";
import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  updateDisplayName: (
    newDisplayName: string
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
    const navigate = useNavigate();

    useEffect(() => {
      // Check for OAuth callback when component mounts
      const initializeAuth = async () => {
        console.log("AuthContext: initializeAuth called");
        console.log("AuthContext: Current pathname:", window.location.pathname);
        console.log(
          "AuthContext: Current search params:",
          window.location.search
        );
        console.log("AuthContext: Current authStore state:", {
          isAuthenticated: authStore.isAuthenticated,
          isLoading: authStore.isLoading,
          hasToken: !!authStore.token,
          isGuest: authStore.isGuest,
        });

        // Check for OAuth callback first
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const error = urlParams.get("error");

        console.log("URL params:", window.location.search);
        console.log("Token from URL:", token);

        if (token) {
          // Handle OAuth callback with token using the store
          console.log("Processing OAuth callback with token");
          const success = await authStore.handleOAuthCallback(token);
          console.log("OAuth validation result:", success);

          // Clear URL parameters first
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          if (success) {
            console.log("OAuth success, navigating to lobby");
            navigate("/lobby", { replace: true });
          } else {
            console.error("OAuth validation failed, staying on login");
            navigate("/login", { replace: true });
          }
        } else if (error) {
          // Handle OAuth error
          console.error("OAuth error:", decodeURIComponent(error));
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          navigate("/login", { replace: true });
        } else {
          // Normal authentication check - refresh profile if token exists and user is not a guest
          if (authStore.token && !authStore.isGuest) {
            console.log(
              "AuthContext: Existing token found, refreshing profile"
            );
            try {
              await authStore.refreshProfile();
              // If user is authenticated and on login page, redirect to lobby
              if (
                authStore.isAuthenticated &&
                (window.location.pathname === "/login" ||
                  window.location.pathname === "/")
              ) {
                console.log("User already authenticated, redirecting to lobby");
                navigate("/lobby", { replace: true });
              }
            } catch (error) {
              console.error("Profile refresh failed:", error);
            }
          } else {
            console.log("AuthContext: No existing valid token found");
          }
        }
      };

      initializeAuth();
    }, [navigate]);

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
      updateDisplayName: authStore.updateDisplayName.bind(authStore),
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
