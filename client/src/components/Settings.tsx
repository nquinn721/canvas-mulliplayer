import React, { useState } from "react";
import "./Settings.css";

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicEnabled: true,
    masterVolume: 80,
    effectsVolume: 70,
    showFPS: false,
    enableParticles: true,
    graphicsQuality: "high" as "low" | "medium" | "high",
    autoSave: true,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    // TODO: Save settings to localStorage or backend
    localStorage.setItem("gameSettings", JSON.stringify(settings));
    onClose();
  };

  const handleReset = () => {
    setSettings({
      soundEnabled: true,
      musicEnabled: true,
      masterVolume: 80,
      effectsVolume: 70,
      showFPS: false,
      enableParticles: true,
      graphicsQuality: "high",
      autoSave: true,
    });
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>🔊 Audio</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) =>
                    handleSettingChange("soundEnabled", e.target.checked)
                  }
                />
                <span className="checkmark"></span>
                Enable Sound Effects
              </label>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={(e) =>
                    handleSettingChange("musicEnabled", e.target.checked)
                  }
                />
                <span className="checkmark"></span>
                Enable Background Music
              </label>
            </div>

            <div className="setting-item">
              <label className="range-label">
                Master Volume: {settings.masterVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.masterVolume}
                onChange={(e) =>
                  handleSettingChange("masterVolume", parseInt(e.target.value))
                }
                className="volume-slider"
              />
            </div>

            <div className="setting-item">
              <label className="range-label">
                Effects Volume: {settings.effectsVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.effectsVolume}
                onChange={(e) =>
                  handleSettingChange("effectsVolume", parseInt(e.target.value))
                }
                className="volume-slider"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>🎮 Graphics</h3>
            <div className="setting-item">
              <label className="range-label">Graphics Quality</label>
              <select
                value={settings.graphicsQuality}
                onChange={(e) =>
                  handleSettingChange("graphicsQuality", e.target.value)
                }
                className="settings-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.enableParticles}
                  onChange={(e) =>
                    handleSettingChange("enableParticles", e.target.checked)
                  }
                />
                <span className="checkmark"></span>
                Enable Particle Effects
              </label>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showFPS}
                  onChange={(e) =>
                    handleSettingChange("showFPS", e.target.checked)
                  }
                />
                <span className="checkmark"></span>
                Show FPS Counter
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>💾 Gameplay</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) =>
                    handleSettingChange("autoSave", e.target.checked)
                  }
                />
                <span className="checkmark"></span>
                Auto-save Progress
              </label>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <div className="settings-actions">
            <button className="reset-btn" onClick={handleReset}>
              Reset to Default
            </button>
            <div className="primary-actions">
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
