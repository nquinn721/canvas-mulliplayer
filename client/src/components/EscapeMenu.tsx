import {
  faGamepad,
  faHome,
  faRobot,
  faTimes,
  faVolumeUp,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  selectedMusicTrack: number;
  onMusicTrackChange: (trackNumber: number) => void;

  // AI difficulty controls
  currentAIDifficulty: string;
  onAIDifficultyChange: (
    difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
  ) => void;

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
  selectedMusicTrack,
  onMusicTrackChange,
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
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faGamepad} /> Game Menu
          </h2>
        </div>

        <div className="modal-body">
          {/* Exit to Main Menu Button */}
          <div className="settings-section">
            <button className="exit-main-menu-button" onClick={onReturnToHome}>
              <FontAwesomeIcon icon={faHome} /> Exit to Main Menu
            </button>
          </div>

          {/* Connection Status */}
          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faWifi} /> Connection Status
            </h3>
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-header">
                  <strong>Server Status</strong>
                </div>
                <span
                  className={`status-value ${isConnected ? "connected" : "disconnected"}`}
                >
                  {connectionStatus}
                </span>
              </div>
              <div className="setting-item">
                <div className="setting-header">
                  <strong>Players Online</strong>
                </div>
                <span className="status-value">{playerCount}</span>
              </div>
              <div className="setting-item">
                <div className="setting-header">
                  <strong>AI Enemies</strong>
                </div>
                <span className="status-value">{enemyCount}</span>
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faVolumeUp} /> Audio Controls
            </h3>
            <div className="audio-controls">
              <button
                onClick={onMuteToggle}
                className={`mute-button ${isMuted ? "muted" : ""}`}
              >
                <FontAwesomeIcon icon={faVolumeUp} />{" "}
                {isMuted ? "Unmute All" : "Mute All"}
              </button>

              {!isMuted && (
                <div className="volume-controls">
                  <div className="volume-control">
                    <label>
                      Master Volume: {Math.round(masterVolume * 100)}%
                    </label>
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
                    <label>Sound Effects: {Math.round(sfxVolume * 100)}%</label>
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
                    <label>
                      Music Volume: {Math.round(musicVolume * 100)}%
                    </label>
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

                  {/* Music Track Selection */}
                  <div className="music-track-selection">
                    <label>Background Music Track:</label>
                    <div className="music-tracks">
                      {[1, 2, 3, 4].map((trackNumber) => (
                        <button
                          key={trackNumber}
                          className={`music-track-button ${
                            selectedMusicTrack === trackNumber ? "selected" : ""
                          }`}
                          onClick={() => onMusicTrackChange(trackNumber)}
                        >
                          Track {trackNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Difficulty Controls */}
          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faRobot} /> AI Difficulty
            </h3>
            <div className="difficulty-controls">
              <div className="current-difficulty">
                Current:{" "}
                <span
                  className={`difficulty-badge ${currentAIDifficulty.toLowerCase()}`}
                >
                  {currentAIDifficulty}
                </span>
              </div>
              <div className="difficulty-buttons">
                {(
                  ["EASY", "MEDIUM", "HARD", "EXPERT", "NIGHTMARE"] as const
                ).map((difficulty) => (
                  <button
                    key={difficulty}
                    className={`difficulty-button ${
                      currentAIDifficulty === difficulty ? "selected" : ""
                    }`}
                    onClick={() => onAIDifficultyChange(difficulty)}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Guide */}
          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faGamepad} /> Controls Guide
            </h3>
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
                Slow Strafe Left
              </div>
              <div className="control-key">
                <strong>D</strong>
                Slow Strafe Right
              </div>
              <div className="control-key">
                <strong>Q</strong>
                Fast Strafe Left
              </div>
              <div className="control-key">
                <strong>E</strong>
                Fast Strafe Right
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
        </div>
      </div>
    </div>
  );
};

export default EscapeMenu;
