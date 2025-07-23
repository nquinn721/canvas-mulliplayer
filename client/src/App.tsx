import React, { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { GamePage } from "./pages/GamePage";
import { LobbyPage } from "./pages/LobbyPage";
import { LoginPage } from "./pages/LoginPage";
import { socketService } from "./stores";

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route component that redirects authenticated users to lobby
const AuthenticatedRedirect: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Navigate to="/lobby" replace /> : <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthenticatedRedirect>
            <LoginPage />
          </AuthenticatedRedirect>
        }
      />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  // Global socket connection management
  useEffect(() => {
    console.log("App: Initializing global socket connection...");

    // Establish socket connection when app starts
    socketService.connect();

    // Only disconnect when the browser window/tab is actually closing
    const handleBeforeUnload = () => {
      console.log("App: Browser closing, disconnecting socket...");
      socketService.disconnect();
    };

    // Only listen for actual browser window closing, not React navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup only on app unmount (which rarely happens in SPAs)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Don't disconnect here - let beforeunload handle it
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;
