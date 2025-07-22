import React, { useState } from "react";
import "./App.css";
import GameComponent from "./components/GameComponent";
import HomeMenu from "./components/HomeMenu";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<"home" | "game">("home");
  const [playerName, setPlayerName] = useState("Player");
  const [aiDifficulty, setAIDifficulty] = useState<
    "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
  >("MEDIUM");

  const handleStartGame = (
    name: string,
    difficulty: "EASY" | "MEDIUM" | "HARD"
  ) => {
    setPlayerName(name);
    setAIDifficulty(difficulty);
    setGameState("game");
  };

  const handleReturnToHome = () => {
    setGameState("home");
  };

  if (gameState === "home") {
    return <HomeMenu onStartGame={handleStartGame} />;
  }

  return (
    <GameComponent
      playerName={playerName}
      aiDifficulty={aiDifficulty}
      onReturnToHome={handleReturnToHome}
    />
  );
};

export default App;
