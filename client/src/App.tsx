import React, { useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./components/AuthContext";
import GameComponent from "./components/GameComponent";
import HomeMenu from "./components/HomeMenu";
import { Homepage } from "./components/Homepage";
import { Leaderboard } from "./components/Leaderboard";
import { Settings } from "./components/Settings";

const AppContent: React.FC = () => {
  const [gameState, setGameState] = useState<"home" | "homepage" | "game">(
    "home"
  );
  const [playerName, setPlayerName] = useState("Player");
  const [aiDifficulty, setAIDifficulty] = useState<
    "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
  >("MEDIUM");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { user, isAuthenticated, isLoading } = useAuth();

  const handleStartGame = (
    name: string,
    difficulty: "EASY" | "MEDIUM" | "HARD"
  ) => {
    setPlayerName(name);
    setAIDifficulty(difficulty);
    setGameState("game");
  };

  const handleStartGameFromHomepage = () => {
    if (user) {
      setPlayerName(user.username);
      setGameState("game");
    }
  };

  const handleReturnToHome = () => {
    // Return to appropriate home screen based on auth status
    setGameState(isAuthenticated ? "homepage" : "home");
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

  // Render based on game state and authentication
  if (gameState === "game") {
    return (
      <GameComponent
        playerName={playerName}
        aiDifficulty={aiDifficulty}
        onReturnToHome={handleReturnToHome}
      />
    );
  }

  // Show Homepage for authenticated users, HomeMenu for guests
  if (isAuthenticated && user) {
    return (
      <>
        <Homepage
          onStartGame={handleStartGameFromHomepage}
          onShowLeaderboard={handleShowLeaderboard}
          onShowSettings={handleShowSettings}
        />
        {showLeaderboard && (
          <Leaderboard onClose={() => setShowLeaderboard(false)} />
        )}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return (
    <>
      <HomeMenu onStartGame={handleStartGame} />
      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
