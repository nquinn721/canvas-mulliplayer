import React from "react";
import { observer } from "mobx-react-lite";
import { gameStore } from "../stores";
import "./ConnectionStatus.css";

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = observer(
  ({ className = "", showLabel = true }) => {
    const isConnected = gameStore.isConnected;
    const ping = gameStore.ping;

    const getConnectionStatus = () => {
      if (!isConnected) {
        return {
          status: "disconnected",
          color: "#ff4444",
          label: "Disconnected",
          icon: "●"
        };
      }

      if (ping === null || ping === 0) {
        return {
          status: "connecting",
          color: "#ffaa00",
          label: "Connecting...",
          icon: "●"
        };
      }

      if (ping < 50) {
        return {
          status: "excellent",
          color: "#00ff00",
          label: `Connected (${ping}ms)`,
          icon: "●"
        };
      } else if (ping < 100) {
        return {
          status: "good",
          color: "#88ff00",
          label: `Connected (${ping}ms)`,
          icon: "●"
        };
      } else if (ping < 200) {
        return {
          status: "fair",
          color: "#ffaa00",
          label: `Connected (${ping}ms)`,
          icon: "●"
        };
      } else {
        return {
          status: "poor",
          color: "#ff6600",
          label: `Connected (${ping}ms)`,
          icon: "●"
        };
      }
    };

    const connectionInfo = getConnectionStatus();

    return (
      <div className={`connection-status ${className}`}>
        <div className="connection-indicator">
          <span
            className={`connection-dot ${connectionInfo.status}`}
            style={{ color: connectionInfo.color }}
          >
            {connectionInfo.icon}
          </span>
          {showLabel && (
            <span className="connection-label">{connectionInfo.label}</span>
          )}
        </div>
      </div>
    );
  }
);
