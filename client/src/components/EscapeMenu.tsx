import React from "react";
import "./EscapeMenu.css";

interface EscapeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: string;
  playerCount: number;
  enemyCount: number;
  isConnected: boolean;

  // Audio controls
  isMuted: boolean;
  onMuteToggle: () => void;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
  onMusicVolumeChange: (volume: number) => void;

  // AI difficulty controls
  currentAIDifficulty: string;
  onAIDifficultyChange: (difficulty: "EASY" | "MEDIUM" | "HARD") => void;

  // Navigation
  onReturnToHome?: () => void;
}

const EscapeMenu: React.FC<EscapeMenuProps> = ({
  isOpen,
  onClose,
  connectionStatus,
  playerCount,
  enemyCount,
  isConnected,
  isMuted,
  onMuteToggle,
  masterVolume,
  sfxVolume,
  musicVolume,
  onMasterVolumeChange,
  onSfxVolumeChange,
  onMusicVolumeChange,
  currentAIDifficulty,
  onAIDifficultyChange,
  onReturnToHome,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="escape-menu-backdrop" onClick={handleBackdropClick}>
      <div className="escape-menu">
        <div className="escape-menu-header">
          <h2>⚙️ Game Menu</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="escape-menu-content">
          {/* Connection Status */}
          <div className="menu-section">
            <h3>🌐 Connection</h3>
            <div className="status-item">
              <span className="status-label">Server</span>
              <span
                className={`status-value ${isConnected ? "connected" : "disconnected"}`}
              >
                {connectionStatus}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Players</span>
              <span className="status-value">{playerCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Enemies</span>
              <span className="status-value">{enemyCount}</span>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="menu-section">
            <h3>🔊 Audio</h3>
            <div className="audio-controls">
              <button
                onClick={onMuteToggle}
                className={`mute-button ${isMuted ? "muted" : ""}`}
              >
                {isMuted ? "🔇 Unmute" : "🔊 Mute"}
              </button>

              {!isMuted && (
                <div className="volume-controls">
                  <div className="volume-control">
                    <label>Master: {Math.round(masterVolume * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={masterVolume}
                      onChange={(e) =>
                        onMasterVolumeChange(parseFloat(e.target.value))
                      }
                      className="volume-slider"
                    />
                  </div>
                  <div className="volume-control">
                    <label>SFX: {Math.round(sfxVolume * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={sfxVolume}
                      onChange={(e) =>
                        onSfxVolumeChange(parseFloat(e.target.value))
                      }
                      className="volume-slider"
                    />
                  </div>
                  <div className="volume-control">
                    <label>Music: {Math.round(musicVolume * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicVolume}
                      onChange={(e) =>
                        onMusicVolumeChange(parseFloat(e.target.value))
                      }
                      className="volume-slider"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="menu-tip">
              <span className="tip-icon">💡</span>
              Click canvas to start ambient music
            </div>
          </div>

          {/* Controls Guide */}
          <div className="menu-section">
            <h3>🎮 Controls</h3>
            <div className="controls-grid">
              <div className="control-key">
                <strong>W</strong>
                Forward
              </div>
              <div className="control-key">
                <strong>S</strong>
                Backward
              </div>
              <div className="control-key">
                <strong>A</strong>
                Strafe Left
              </div>
              <div className="control-key">
                <strong>D</strong>
                Strafe Right
              </div>
              <div className="control-key">
                <strong>Mouse</strong>
                Aim & Shoot
              </div>
              <div className="control-key">
                <strong>Shift</strong>
                Boost
              </div>
              <div className="control-key">
                <strong>Right Click</strong>
                Secondary Fire (Missiles)
              </div>
              <div className="control-key">
                <strong>F</strong>
                Flash Teleport
              </div>
              <div className="control-key">
                <strong>Escape</strong>
                Menu
              </div>
            </div>
          </div>

          {/* AI Difficulty Controls */}
          <div className="menu-section">
            <h3>🤖 AI Difficulty</h3>
            <div className="ai-difficulty-controls">
              <button
                onClick={() => onAIDifficultyChange("EASY")}
                className={`difficulty-button easy ${currentAIDifficulty === "EASY" ? "active" : ""}`}
              >
                🟢 Easy
                {currentAIDifficulty === "EASY" && (
                  <span className="selected-indicator"> ✓</span>
                )}
              </button>
              <button
                onClick={() => onAIDifficultyChange("MEDIUM")}
                className={`difficulty-button medium ${currentAIDifficulty === "MEDIUM" ? "active" : ""}`}
              >
                🟡 Medium
                {currentAIDifficulty === "MEDIUM" && (
                  <span className="selected-indicator"> ✓</span>
                )}
              </button>
              <button
                onClick={() => onAIDifficultyChange("HARD")}
                className={`difficulty-button hard ${currentAIDifficulty === "HARD" ? "active" : ""}`}
              >
                🔴 Hard
                {currentAIDifficulty === "HARD" && (
                  <span className="selected-indicator"> ✓</span>
                )}
              </button>
            </div>
            <div className="menu-tip">
              <span className="tip-icon">💡</span>
              Current: <strong>{currentAIDifficulty}</strong> - Changes AI
              behavior for new enemies
            </div>
          </div>

          {/* Weapons */}
          <div className="menu-section">
            <h3>⚔️ Weapons</h3>
            <div className="status-item">
              <span className="status-label">Primary</span>
              <span className="status-value">Laser Cannon</span>
            </div>
            <div className="status-item">
              <span className="status-label">Secondary</span>
              <span className="status-value">Missiles</span>
            </div>
          </div>

          {/* Game Tips */}
          <div className="menu-section">
            <h3>💡 Tips</h3>
            <div className="menu-tip">
              • Collect power-ups to upgrade your weapons
              <br />
              • Use boost to escape dangerous situations
              <br />
              • Strafe to dodge incoming projectiles
              <br />
              • Watch out for AI enemies!
              <br />• Press Escape to pause and open this menu
            </div>
          </div>

          {/* Return to Home */}
          {onReturnToHome && (
            <div className="menu-section">
              <button className="return-home-button" onClick={onReturnToHome}>
                🏠 Return to Home Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EscapeMenu;
