import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import "./Homepage.css";

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
  const { user, logout, updateUsername } = useAuth();
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  if (!user) return null;

  const handleUsernameUpdate = async () => {
    if (newUsername.trim() === user.username) {
      setShowUsernameEdit(false);
      return;
    }

    setIsUpdating(true);
    setUpdateMessage("");

    try {
      const result = await updateUsername(newUsername.trim());
      if (result.success) {
        setUpdateMessage("Username updated successfully!");
        setShowUsernameEdit(false);
      } else {
        setUpdateMessage(result.message);
      }
    } catch (error) {
      setUpdateMessage("Failed to update username");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setUpdateMessage(""), 3000);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "🌐";
      case "facebook":
        return "📘";
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
      case "facebook":
        return "Facebook Account";
      case "email":
        return "Email Account";
      default:
        return "Local Account";
    }
  };

  return (
    <div className="homepage">
      <div className="homepage-container">
        {/* Header */}
        <div className="homepage-header">
          <h1>Space Fighters</h1>
          <p className="welcome-message">Welcome back, Commander!</p>
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
                    {user.username?.charAt(0).toUpperCase() || "?"}
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
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
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
                          setNewUsername(user.username || "");
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
                    <h2>{user.username}</h2>
                    <button
                      onClick={() => setShowUsernameEdit(true)}
                      className="edit-username-btn"
                      title="Edit username"
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

              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-label">Role:</span>
                  <span className="stat-value">{user.role}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Games Played:</span>
                  <span className="stat-value">{user.gamesPlayed || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Best Score:</span>
                  <span className="stat-value">{user.highScore || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
