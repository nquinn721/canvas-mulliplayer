import {
  faBolt,
  faCog,
  faGamepad,
  faGun,
  faRobot,
  faRocket,
  faTimes,
  faVolumeMute,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { soundService } from "../services/SoundService";
import BackgroundCanvas from "./BackgroundCanvas";
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundService.isSoundMuted());

  // Volume toggle handler
  const handleVolumeToggle = () => {
    const newMutedState = soundService.toggleMute();
    setIsMuted(newMutedState);
  };

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

      {/* Settings Cog Button */}
      <button
        className="settings-cog"
        onClick={() => setShowSettingsModal(true)}
        title="Game Settings & Controls"
      >
        <FontAwesomeIcon icon={faCog} />
      </button>

      {/* Volume Toggle Button */}
      <button
        className={`volume-toggle ${isMuted ? "muted" : "unmuted"}`}
        onClick={handleVolumeToggle}
        title={isMuted ? "Unmute Sound" : "Mute Sound"}
      >
        <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
      </button>

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
            Start Game
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSettingsModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowSettingsModal(false)}
            >
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
                  <FontAwesomeIcon icon={faRobot} /> AI Bot Difficulty Settings
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
                      Primary weapon with unlimited ammo. Fast firing rate,
                      moderate damage.
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
                      Heat-seeking missiles that track enemies. High damage,
                      limited ammo.
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeMenu;
