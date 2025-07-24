import { observer } from "mobx-react-lite";
import React from "react";
import { gameStore } from "../stores";
import "./GameStats.css";

interface GameStatsProps {
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  currentStreak: number;
  maxStreak: number;
  kda: string;
  hitStreak?: number;
  survivalBonusText?: string;
  survivalMultiplier?: number;
  className?: string;
}

export const GameStats: React.FC<GameStatsProps> = observer(
  ({
    score,
    kills,
    deaths,
    assists,
    currentStreak,
    maxStreak,
    kda,
    hitStreak = 0,
    survivalBonusText = "",
    survivalMultiplier = 1.0,
    className = "",
  }) => {
    const getStreakColor = (streak: number): string => {
      if (streak >= 7) return "#ff0080"; // Godlike - Pink
      if (streak >= 5) return "#ff4500"; // Rampage - Orange Red
      if (streak >= 3) return "#ffd700"; // Multi Kill - Gold
      if (streak >= 2) return "#00ff00"; // Double Kill - Green
      return "#ffffff"; // Default - White
    };

    const getStreakText = (streak: number): string => {
      if (streak >= 7) return "GODLIKE!";
      if (streak >= 5) return "RAMPAGE!";
      if (streak >= 4) return "ULTRA KILL!";
      if (streak >= 3) return "MULTI KILL!";
      if (streak >= 2) return "DOUBLE KILL!";
      return "";
    };

    return (
      <div className={`game-stats ${className}`}>
        <div className="stats-content">
          {/* Score */}
          <div className="stat-item">
            <div className="stat-value">{score.toLocaleString()}</div>
            <div className="stat-label">Score</div>
          </div>

          {/* KDA */}
          <div className="stat-item">
            <div className="stat-value">{kda}</div>
            <div className="stat-label">K/D/A</div>
          </div>

          {/* Connection Status */}
          <div className="connection-status">
            <div
              className={`connection-dot ${gameStore.isConnected ? "connected" : "disconnected"}`}
              title={
                gameStore.isConnected
                  ? `${gameStore.stats.ping || 0}ms`
                  : "Disconnected"
              }
            />
          </div>
        </div>

        {/* Streak Notification */}
        {currentStreak >= 2 && (
          <div className="streak-notification">
            <span
              className="streak-text"
              style={{ color: getStreakColor(currentStreak) }}
            >
              {getStreakText(currentStreak)}
            </span>
          </div>
        )}
      </div>
    );
  }
);
