import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { Homepage } from "../components/Homepage";
import { Leaderboard } from "../components/Leaderboard";
import { Settings } from "../components/Settings";

export const LobbyPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate("/game");
  };

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
  };

  const handleShowSettings = () => {
    setShowSettings(true);
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

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate("/login");
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
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
};
