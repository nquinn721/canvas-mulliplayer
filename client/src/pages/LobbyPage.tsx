import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { GameSettingsModal } from "../components/GameSettingsModal";
import { Homepage } from "../components/Homepage";
import { Leaderboard } from "../components/Leaderboard";
import { authService } from "../services/AuthService";

export const LobbyPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Handle navigation in useEffect to avoid React Router warnings
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleStartGame = () => {
    navigate("/game");
  };

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
    setError(null); // Clear any previous errors
  };

  const handleShowSettings = () => {
    setShowSettings(true);
  };

  const handleLeaderboardError = (errorMessage: string) => {
    setError(errorMessage);
    console.error("Leaderboard error:", errorMessage);
  };

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
    setError(null);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>Space Fighters</h1>
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (useEffect will handle redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Homepage
        onStartGame={handleStartGame}
        onShowLeaderboard={handleShowLeaderboard}
        onShowSettings={handleShowSettings}
      />
      {showLeaderboard && (
        <Leaderboard
          onClose={handleCloseLeaderboard}
          authToken={authService.getToken() || undefined}
          onError={handleLeaderboardError}
        />
      )}
      {showSettings && (
        <GameSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {error && (
        <div className="error-toast">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-close" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};
