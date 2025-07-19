import React, { useEffect, useState } from "react";
import "./HomeMenu.css";

interface HomeMenuProps {
  onStartGame: (
    playerName: string,
    difficulty: "EASY" | "MEDIUM" | "HARD"
  ) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onStartGame }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "EASY" | "MEDIUM" | "HARD"
  >("MEDIUM");
  const [playerName, setPlayerName] = useState(() => {
    // Initialize from localStorage or empty string
    return localStorage.getItem("canvas-multiplayer-player-name") || "";
  });

  // Save player name to localStorage whenever it changes
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("canvas-multiplayer-player-name", playerName.trim());
    }
  }, [playerName]);

  const difficultyDescriptions = {
    EASY: {
      color: "#4CAF50",
      description: "Slower, less accurate AI. Good for beginners.",
      details: ["Detection: 800px", "Accuracy: 60%"],
    },
    MEDIUM: {
      color: "#FF9800",
      description: "Balanced AI behavior. Recommended.",
      details: ["Detection: 1200px", "Accuracy: 75%"],
    },
    HARD: {
      color: "#F44336",
      description: "Fast, accurate, aggressive AI. For experts.",
      details: ["Detection: 1600px", "Accuracy: 90%"],
    },
  };

  return (
    <div className="home-menu">
      <div className="stars-background">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="home-content">
        <header className="home-header">
          <h1 className="game-logo">
            <span className="logo-icon">🚀</span>
            Canvas Multiplayer
          </h1>
          <p className="game-subtitle">
            Battle in space with lasers, missiles, and AI enemies!
          </p>
        </header>

        <div className="game-setup">
          <div className="setup-section">
            <label htmlFor="player-name" className="setup-label">
              Player Name
            </label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="player-name-input"
              placeholder="Enter your name..."
              maxLength={20}
            />
            {playerName.trim().length > 0 && playerName.trim().length < 3 && (
              <span className="validation-text">
                Name must be at least 3 characters
              </span>
            )}
          </div>

          <div className="setup-section">
            <label className="setup-label">AI Difficulty</label>
            <div className="difficulty-selector">
              {(
                Object.keys(difficultyDescriptions) as Array<
                  keyof typeof difficultyDescriptions
                >
              ).map((difficulty) => (
                <button
                  key={difficulty}
                  className={`difficulty-button ${selectedDifficulty === difficulty ? "selected" : ""}`}
                  onClick={() => setSelectedDifficulty(difficulty)}
                  style={{
                    borderColor:
                      selectedDifficulty === difficulty
                        ? difficultyDescriptions[difficulty].color
                        : "transparent",
                  }}
                >
                  <div className="difficulty-header">
                    <span
                      className="difficulty-dot"
                      style={{
                        backgroundColor:
                          difficultyDescriptions[difficulty].color,
                      }}
                    />
                    <span className="difficulty-name">{difficulty}</span>
                  </div>
                  <p className="difficulty-description">
                    {difficultyDescriptions[difficulty].description}
                  </p>
                </button>
              ))}
            </div>

            <div className="difficulty-details">
              <h4>
                <span
                  className="details-dot"
                  style={{
                    backgroundColor:
                      difficultyDescriptions[selectedDifficulty].color,
                  }}
                />
                {selectedDifficulty} Settings
              </h4>
              <ul className="difficulty-stats">
                {difficultyDescriptions[selectedDifficulty].details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="game-features">
            <h3>🎮 Game Features & Controls</h3>
            <div className="features-controls-grid">
              <div className="features-section">
                <h4>Features</h4>
                <div className="features-list">
                  <div className="feature-item">⚡ Laser Weapons</div>
                  <div className="feature-item">🚀 Homing Missiles</div>
                  <div className="feature-item">🛡️ Shield System</div>
                  <div className="feature-item">💨 Boost & Strafe</div>
                  <div className="feature-item">⚡ Flash Teleport</div>
                  <div className="feature-item">🎯 Smart AI Enemies</div>
                  <div className="feature-item">⭐ Power-ups</div>
                </div>
              </div>
              <div className="controls-section">
                <h4>Controls</h4>
                <div className="controls-list">
                  <div className="control-item">
                    <strong>W/A/S/D</strong> - Move & Strafe
                  </div>
                  <div className="control-item">
                    <strong>Mouse</strong> - Aim direction
                  </div>
                  <div className="control-item">
                    <strong>Left Click</strong> - Fire Laser
                  </div>
                  <div className="control-item">
                    <strong>Right Click</strong> - Fire Missile
                  </div>
                  <div className="control-item">
                    <strong>F</strong> - Flash Teleport
                  </div>
                  <div className="control-item">
                    <strong>Shift</strong> - Boost speed
                  </div>
                  <div className="control-item">
                    <strong>ESC</strong> - Game menu
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            className="start-button"
            onClick={() => onStartGame(playerName.trim(), selectedDifficulty)}
            disabled={!playerName.trim() || playerName.trim().length < 3}
          >
            <span className="start-button-icon">🎮</span>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeMenu;
