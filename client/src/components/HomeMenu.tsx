import {
  faRocket,
  faSignOutAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { useSocketStatus } from "../hooks/useSocket";
import { gamePreferencesStore } from "../stores";
import { Difficulty, getDifficulty } from "../utils/difficultyUtils";
import { getDisplayName } from "../utils/displayName";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import BackgroundCanvas from "./BackgroundCanvas";
import { GameSettingsModal } from "./GameSettingsModal";
import "./HomeMenu.css";
import { TopControls } from "./TopControls";

interface HomeMenuProps {
  onStartGame: (playerName: string, difficulty: Difficulty) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = observer(({ onStartGame }) => {
  const { user, isAuthenticated, isGuest, loginAsGuest, logout } = useAuth();

  const [playerName, setPlayerName] = useState(() => {
    // Initialize from store or authenticated username
    return gamePreferencesStore.playerName || "";
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Update player name when user authentication changes
  useEffect(() => {
    if (user) {
      const displayName = getDisplayName(user);
      if (displayName) {
        setPlayerName(displayName);
      }
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

  // Use socket status hook for consistent connection checking
  const { isConnected } = useSocketStatus();

  // Save player name to store whenever it changes
  useEffect(() => {
    if (playerName.trim()) {
      gamePreferencesStore.setPlayerName(playerName.trim());
    }
  }, [playerName]);

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

          <button
            className="start-button"
            onClick={() => onStartGame(playerName.trim(), getDifficulty())}
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
