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
        <div className="stats-header">
          <h3>Stats</h3>
          <div className="connection-indicator">
            <div
              className={`connection-dot ${gameStore.isConnected ? "connected" : "disconnected"}`}
              title={
                gameStore.isConnected
                  ? `Connected (${gameStore.stats.ping || 0}ms)`
                  : "Disconnected"
              }
            />
          </div>
        </div>

        <div className="stats-content">
          {/* Score Section */}
          <div className="stat-group score-group">
            <div className="stat-label">Score</div>
            <div className="stat-value score-value">
              {score.toLocaleString()}
            </div>
          </div>

          {/* KDA Section */}
          <div className="stat-group kda-group">
            <div className="stat-label">K/D/A</div>
            <div className="stat-value kda-value">{kda}</div>
          </div>

          {/* Kill Streak Section */}
          {(currentStreak >= 2 || hitStreak >= 3) && (
            <div className="stat-group streak-group">
              <div className="stat-label">
                {hitStreak >= 3 ? "Hit Streak" : "Streak"}
              </div>
              <div
                className="stat-value streak-status"
                style={{ color: getStreakColor(currentStreak) }}
              >
                {hitStreak >= 3
                  ? `${hitStreak}x hits`
                  : `${currentStreak}x kills`}
              </div>
            </div>
          )}

          {/* Survival Bonus Section */}
          {survivalMultiplier > 1.0 && (
            <div className="stat-group survival-group">
              <div className="stat-label">Survival</div>
              <div
                className="stat-value survival-multiplier"
                style={{ color: "#00ff88" }}
              >
                {survivalMultiplier.toFixed(1)}x
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
