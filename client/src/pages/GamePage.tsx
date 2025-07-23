import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import GameComponent from "../components/GameComponent";

export const GamePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Default difficulty - could be passed as state from lobby in the future
  const [aiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE">("MEDIUM");

  const handleReturnToLobby = () => {
    navigate("/lobby");
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
  if (!isAuthenticated || !user) {
    navigate("/login");
    return null;
  }

  return (
    <GameComponent
      playerName={user.username}
      aiDifficulty={aiDifficulty}
      onReturnToHome={handleReturnToLobby}
    />
  );
};
