import {
  faBolt,
  faBug,
  faCog,
  faGamepad,
  faGun,
  faRobot,
  faRocket,
  faTimes,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { soundService } from "../services/SoundService";
import { getDifficulty, setDifficulty, Difficulty } from "../utils/difficultyUtils";
import { ErrorLogs } from "./ErrorLogs";

interface GameSettingsModalProps {
  onClose: () => void;
}

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  onClose,
}) => {
  const [selectedMusicTrack, setSelectedMusicTrack] = useState(() =>
    soundService.getMusicTrack()
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState(getDifficulty);

  const handleMusicTrackChange = (trackNumber: number) => {
    setSelectedMusicTrack(trackNumber);
    soundService.setMusicTrack(trackNumber);
  };

  const handleDifficultyChange = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setDifficulty(difficulty);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faCog} /> Game Settings & Controls
          </h2>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faRobot} /> AI Difficulty Selection
            </h3>
            <div className="difficulty-selector">
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((difficulty) => (
                <button
                  key={difficulty}
                  className={`difficulty-button ${selectedDifficulty === difficulty ? "selected" : ""} ${difficulty.toLowerCase()}`}
                  onClick={() => handleDifficultyChange(difficulty)}
                >
                  <span className="difficulty-name">{difficulty}</span>
                </button>
              ))}
            </div>
            <p className="current-difficulty">
              Current Difficulty: <strong style={{ color: selectedDifficulty === "EASY" ? "#4CAF50" : selectedDifficulty === "MEDIUM" ? "#FF9800" : "#F44336" }}>
                {selectedDifficulty}
              </strong>
            </p>
          </div>

          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faRobot} /> AI Bot Difficulty Reference
            </h3>
            <div className="settings-grid">
              <div className="setting-item easy">
                <div className="setting-header">
                  <span className="difficulty-dot easy-dot"></span>
                  <strong>EASY</strong>
                </div>
                <ul>
                  <li>Detection Range: 800px</li>
                  <li>Accuracy: 60%</li>
                  <li>Reaction Speed: Slow</li>
                  <li>Aggression: Low</li>
                </ul>
              </div>

              <div className="setting-item medium">
                <div className="setting-header">
                  <span className="difficulty-dot medium-dot"></span>
                  <strong>MEDIUM</strong>
                </div>
                <ul>
                  <li>Detection Range: 1200px</li>
                  <li>Accuracy: 75%</li>
                  <li>Reaction Speed: Normal</li>
                  <li>Aggression: Balanced</li>
                </ul>
              </div>

              <div className="setting-item hard">
                <div className="setting-header">
                  <span className="difficulty-dot hard-dot"></span>
                  <strong>HARD</strong>
                </div>
                <ul>
                  <li>Detection Range: 1600px</li>
                  <li>Accuracy: 90%</li>
                  <li>Reaction Speed: Fast</li>
                  <li>Aggression: High</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faRocket} /> Weapons & Combat Systems
            </h3>
            <div className="weapons-grid">
              <div className="weapon-item">
                <div className="weapon-header">
                  <span className="weapon-icon">
                    <FontAwesomeIcon icon={faGun} />
                  </span>
                  <strong>Laser Cannons</strong>
                </div>
                <p>
                  Primary weapon with unlimited ammo. Fast firing rate, moderate
                  damage.
                </p>
                <span className="weapon-key">Left Click</span>
              </div>

              <div className="weapon-item">
                <div className="weapon-header">
                  <span className="weapon-icon">
                    <FontAwesomeIcon icon={faRocket} />
                  </span>
                  <strong>Homing Missiles</strong>
                </div>
                <p>
                  Heat-seeking missiles that track enemies. High damage, limited
                  ammo.
                </p>
                <span className="weapon-key">Right Click</span>
              </div>

              <div className="weapon-item">
                <div className="weapon-header">
                  <span className="weapon-icon">
                    <FontAwesomeIcon icon={faBolt} />
                  </span>
                  <strong>Flash Teleport</strong>
                </div>
                <p>
                  Instant teleportation ability. Cooldown-based defensive
                  maneuver.
                </p>
                <span className="weapon-key">F Key</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faGamepad} /> Flight Controls
            </h3>
            <div className="controls-grid">
              <div className="control-group">
                <h4>Movement Controls</h4>
                <div className="control-item">
                  <span className="control-key">W / S</span>
                  <span>Thrust Forward / Reverse</span>
                </div>
                <div className="control-item">
                  <span className="control-key">A / D</span>
                  <span>Precision Strafe Left / Right</span>
                </div>
                <div className="control-item">
                  <span className="control-key">Q / E</span>
                  <span>Combat Strafe Left / Right</span>
                </div>
                <div className="control-item">
                  <span className="control-key">Shift</span>
                  <span>Afterburner Boost</span>
                </div>
              </div>

              <div className="control-group">
                <h4>Combat Controls</h4>
                <div className="control-item">
                  <span className="control-key">Mouse</span>
                  <span>Target Acquisition & Aiming</span>
                </div>
                <div className="control-item">
                  <span className="control-key">Left Click</span>
                  <span>Fire Laser Cannons</span>
                </div>
                <div className="control-item">
                  <span className="control-key">Right Click</span>
                  <span>Launch Homing Missile</span>
                </div>
                <div className="control-item">
                  <span className="control-key">F</span>
                  <span>Flash Teleport</span>
                </div>
                <div className="control-item">
                  <span className="control-key">ESC</span>
                  <span>Tactical Pause Menu</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faVolumeUp} /> Background Music
            </h3>
            <div className="music-selection">
              <p>Choose your preferred background music track:</p>
              <div className="music-tracks">
                {[1, 2, 3, 4].map((trackNumber) => (
                  <button
                    key={trackNumber}
                    className={`music-track-button ${
                      selectedMusicTrack === trackNumber ? "selected" : ""
                    }`}
                    onClick={() => handleMusicTrackChange(trackNumber)}
                  >
                    Track {trackNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <FontAwesomeIcon icon={faBug} /> Server Error Logs
            </h3>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: "15px",
              }}
            >
              Monitor server health and view recent error logs for debugging
              purposes.
            </p>
            <ErrorLogs />
          </div>
        </div>
      </div>
    </div>
  );
};
