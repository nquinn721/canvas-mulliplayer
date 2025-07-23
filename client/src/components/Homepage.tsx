import React, { useEffect, useRef, useState } from "react";
import { getDisplayName } from "../utils/displayName";
import { useAuth } from "./AuthContext";
import "./Homepage.css";
import { PlayerStatsCard } from "./PlayerStatsCard";
import { TopControls } from "./TopControls";

interface HomepageProps {
  onStartGame: () => void;
  onShowLeaderboard: () => void;
  onShowSettings: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({
  onStartGame,
  onShowLeaderboard,
  onShowSettings,
}) => {
  const { user, logout, updateUsername, updateDisplayName, refreshProfile } =
    useAuth();
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState(getDisplayName(user) || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Use displayName for display, fallback to username
  const displayName = getDisplayName(user);

  // Update newUsername when user data changes
  useEffect(() => {
    if (!showUsernameEdit) {
      setNewUsername(displayName || "");
    }
  }, [user, displayName, showUsernameEdit]);

  // Auto-focus input when edit mode starts
  useEffect(() => {
    if (showUsernameEdit && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select all text for easy replacement
    }
  }, [showUsernameEdit]);

  const handleUsernameUpdate = async () => {
    if (newUsername.trim() === displayName) {
      setShowUsernameEdit(false);
      return;
    }

    setIsUpdating(true);
    setUpdateMessage("");

    try {
      const result = await updateDisplayName(newUsername.trim());
      if (result.success) {
        setUpdateMessage("Display name updated successfully!");
        setShowUsernameEdit(false);
        // Refresh profile to ensure display name is updated
        await refreshProfile();
      } else {
        setUpdateMessage(result.message);
      }
    } catch (error) {
      setUpdateMessage("Failed to update display name");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setUpdateMessage(""), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isUpdating && newUsername.trim()) {
      e.preventDefault();
      handleUsernameUpdate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowUsernameEdit(false);
      setNewUsername(displayName || "");
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "🌐";
      case "email":
        return "📧";
      default:
        return "👤";
    }
  };

  const getAccountTypeLabel = (provider: string, isGuest?: boolean) => {
    if (isGuest) return "Guest Account";
    switch (provider) {
      case "google":
        return "Google Account";
      case "email":
        return "Email Account";
      default:
        return "Local Account";
    }
  };

  return (
    <div className="homepage">
      {/* Top Controls (Connection Status, Volume) */}
      <TopControls showSettings={true} onShowSettings={onShowSettings} />

      <div className="homepage-container">
        {/* Header */}
        <div className="homepage-header">
          <div className="header-content">
            <div className="header-title">
              <h1>SPACE FIGHTERS</h1>
              <p className="welcome-message">Welcome back, Commander!</p>
            </div>
            <div className="header-actions">
              {user.authProvider === "guest" ? (
                <button
                  className="login-button"
                  onClick={() => window.open("/api/auth/google", "_self")}
                >
                  <i className="fas fa-sign-in-alt"></i>
                  Login with Google
                </button>
              ) : (
                <button className="logout-button" onClick={logout}>
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="profile-card">
          <div className="profile-info">
            <div className="avatar-section">
              <div className="user-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">
                    {displayName?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="account-type">
                <span className="provider-icon">
                  {getProviderIcon(user.authProvider)}
                </span>
                <span className="provider-label">
                  {getAccountTypeLabel(user.authProvider, user.isGuest)}
                </span>
              </div>
            </div>

            <div className="user-details">
              <div className="username-section">
                {showUsernameEdit ? (
                  <div className="username-edit">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter new display name"
                      maxLength={20}
                      disabled={isUpdating}
                    />
                    <div className="username-actions">
                      <button
                        onClick={handleUsernameUpdate}
                        disabled={isUpdating || !newUsername.trim()}
                        className="save-btn"
                      >
                        {isUpdating ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setShowUsernameEdit(false);
                          setNewUsername(displayName || "");
                        }}
                        className="cancel-btn"
                        disabled={isUpdating}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="username-display">
                    <h2>{displayName}</h2>
                    <button
                      onClick={() => setShowUsernameEdit(true)}
                      className="edit-username-btn"
                      title="Edit display name"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              {updateMessage && (
                <div
                  className={`update-message ${updateMessage.includes("success") ? "success" : "error"}`}
                >
                  {updateMessage}
                </div>
              )}

              {user.email && <p className="user-email">{user.email}</p>}
            </div>
          </div>
        </div>

        {/* Player Statistics */}
        <PlayerStatsCard />

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="primary-action-btn play-btn" onClick={onStartGame}>
            <span className="btn-icon">🚀</span>
            <span className="btn-text">Start Game</span>
          </button>

          <div className="secondary-actions">
            <button
              className="secondary-action-btn"
              onClick={onShowLeaderboard}
            >
              <span className="btn-icon">🏆</span>
              <span className="btn-text">Leaderboard</span>
            </button>

            <button className="secondary-action-btn" onClick={onShowSettings}>
              <span className="btn-icon">⚙️</span>
              <span className="btn-text">Settings</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <h3>Recent Activity</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💥</div>
              <div className="stat-info">
                <span className="stat-number">{user.kills || 0}</span>
                <span className="stat-description">Total Kills</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💎</div>
              <div className="stat-info">
                <span className="stat-number">{user.experience || 0}</span>
                <span className="stat-description">Experience</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-info">
                <span className="stat-number">
                  {Math.floor((user.totalPlayTime || 0) / 60)}
                </span>
                <span className="stat-description">Minutes Played</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <span className="stat-number">{user.level || 1}</span>
                <span className="stat-description">Current Level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="homepage-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
          <p className="game-version">v1.0.0</p>
        </div>
      </div>
    </div>
  );
};
