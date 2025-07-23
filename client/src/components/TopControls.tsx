import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVolumeMute,
  faVolumeUp,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import { gameStore } from "../stores";
import { soundService } from "../services/SoundService";
import "./TopControls.css";

interface TopControlsProps {
  showSettings?: boolean;
  onShowSettings?: () => void;
  className?: string;
}

export const TopControls: React.FC<TopControlsProps> = observer(
  ({ showSettings = false, onShowSettings, className = "" }) => {
    const [isMuted, setIsMuted] = useState(() => {
      try {
        return soundService.isSoundMuted();
      } catch (error) {
        console.warn("Failed to get sound mute status:", error);
        return false;
      }
    });

    // Volume toggle handler
    const handleVolumeToggle = () => {
      try {
        const newMutedState = soundService.toggleMute();
        setIsMuted(newMutedState);
      } catch (error) {
        console.error("Failed to toggle sound:", error);
      }
    };

    return (
      <div className={`top-controls ${className}`}>
        {/* Settings Button */}
        {showSettings && onShowSettings && (
          <button
            className="settings-cog"
            onClick={onShowSettings}
            title="Game Settings & Controls"
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        )}

        {/* Connection Status Indicator */}
        <div
          className={`connection-status ${gameStore.isConnected ? "connected" : "disconnected"}`}
          title={
            gameStore.isConnected
              ? `Connected to server${gameStore.stats.ping ? ` (${gameStore.stats.ping}ms)` : ""}`
              : "Disconnected from server"
          }
        >
          <div className="connection-light"></div>
        </div>

        {/* Volume Toggle Button */}
        <button
          className={`volume-toggle ${isMuted ? "muted" : "unmuted"}`}
          onClick={handleVolumeToggle}
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
        </button>
      </div>
    );
  }
);
