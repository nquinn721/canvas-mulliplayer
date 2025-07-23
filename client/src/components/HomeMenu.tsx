import {
  faCog,
  faRocket,
  faSignOutAlt,
  faUser,
  faVolumeMute,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { soundService } from "../services/SoundService";
import { gameStore, socketService } from "../stores";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import BackgroundCanvas from "./BackgroundCanvas";
import { GameSettingsModal } from "./GameSettingsModal";
import { TopControls } from "./TopControls";
import "./HomeMenu.css";

interface HomeMenuProps {
  onStartGame: (
    playerName: string,
    difficulty: "EASY" | "MEDIUM" | "HARD"
  ) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = observer(({ onStartGame }) => {
  const { user, isAuthenticated, isGuest, loginAsGuest, logout } = useAuth();

  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "EASY" | "MEDIUM" | "HARD"
  >("MEDIUM");
  const [playerName, setPlayerName] = useState(() => {
    // Initialize from localStorage or authenticated username
    return localStorage.getItem("canvas-multiplayer-player-name") || "";
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Update player name when user authentication changes
  useEffect(() => {
    if (user?.username) {
      setPlayerName(user.username);
    }
  }, [user]);

  // Authentication handlers
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleGuestLogin = async () => {
    const guestName = playerName.trim() || undefined;
    const result = await loginAsGuest(guestName);
    if (result.success) {
      setShowAuthModal(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPlayerName("");
  };

  // Save player name to localStorage whenever it changes
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("canvas-multiplayer-player-name", playerName.trim());
    }
  }, [playerName]);

  // Establish socket connection when component mounts
  useEffect(() => {
    let isComponentMounted = true;

    console.log("HomeMenu: Checking connection status...");
    console.log("gameStore.isConnected:", gameStore.isConnected);
    console.log("socketService.isConnected:", socketService.isConnected);

    // Connect to the server if not already connected
    if (!socketService.isConnected && isComponentMounted) {
      console.log("HomeMenu: Attempting to connect...");
      socketService.connect();
    }

    // Cleanup function to prevent issues with React's double-effect in development
    return () => {
      isComponentMounted = false;
    };
  }, []);

  // Handle page unload to cleanup connections
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("HomeMenu: Page unloading, disconnecting socket...");
      socketService.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
      <BackgroundCanvas />

      <div className="stars-background">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Top Controls (Settings, Connection, Volume) */}
      <TopControls 
        showSettings={true}
        onShowSettings={() => setShowSettingsModal(true)}
      />

      <div className="home-content">
        <header className="home-header">
          <h1 className="game-logo">
            <span className="logo-icon">
              <FontAwesomeIcon icon={faRocket} />
            </span>
            Canvas Multiplayer
          </h1>
          <p className="game-subtitle">Space Combat Game</p>
        </header>

        <div className="game-setup">
          {/* Authentication Section */}
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="user-info">
                <div className="user-welcome">
                  <FontAwesomeIcon icon={faUser} className="user-icon" />
                  <span className="welcome-text">
                    Welcome, <strong>{user?.username}</strong>
                    {isGuest && <span className="guest-badge">(Guest)</span>}
                  </span>
                </div>
                <button
                  className="logout-button"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="auth-prompt">
                <p className="auth-message">
                  Sign in to save your progress and use your username as your
                  ship name!
                </p>
                <button
                  className="sign-in-button"
                  onClick={() => setShowAuthModal(true)}
                >
                  <FontAwesomeIcon icon={faUser} />
                  Sign In / Create Account
                </button>
              </div>
            )}
          </div>

          <div className="setup-section">
            <label htmlFor="player-name" className="setup-label">
              {isAuthenticated ? "Ship Name" : "Player Name"}
              {isAuthenticated && !isGuest && (
                <span className="ship-name-note">
                  (Your username will be used as ship name)
                </span>
              )}
            </label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="player-name-input"
              placeholder={
                isAuthenticated && !isGuest
                  ? "Logged in as " + user?.username
                  : "Enter your name..."
              }
              maxLength={20}
              disabled={isAuthenticated && !isGuest}
            />
            {!isAuthenticated &&
              playerName.trim().length > 0 &&
              playerName.trim().length < 3 && (
                <span className="validation-text">
                  Name must be at least 3 characters
                </span>
              )}
            {isAuthenticated && !isGuest && (
              <span className="info-text">
                Want to change your ship name? Update your username in settings
                after joining the game!
              </span>
            )}
          </div>

          <div className="setup-section">
            <label className="setup-label">Difficulty</label>
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
                >
                  <span className="difficulty-name">{difficulty}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="start-button"
            onClick={() => onStartGame(playerName.trim(), selectedDifficulty)}
            disabled={!playerName.trim() || playerName.trim().length < 3}
          >
            Play as Guest
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <GameSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onLoginAsGuest={handleGuestLogin}
      />
    </div>
  );
});

export default HomeMenu;
