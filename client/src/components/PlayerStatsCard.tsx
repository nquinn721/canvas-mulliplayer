import { observer } from "mobx-react-lite";
import React from "react";
import { scoreService } from "../stores";
import "./PlayerStatsCard.css";

export const PlayerStatsCard: React.FC = observer(() => {
  const stats = scoreService.getDisplayStats();

  return (
    <div className="player-stats-card">
      <div className="stats-header">
        <div className="player-info">
          <h3>{stats.username}</h3>
          <span className="player-type">
            {stats.isGuest ? "Guest Player" : "Registered Player"}
          </span>
        </div>
        <div className="level-badge">
          <span className="level-text">Level {stats.level}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item highlight">
          <div className="stat-value">{stats.highScore.toLocaleString()}</div>
          <div className="stat-label">High Score</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{stats.gamesPlayed}</div>
          <div className="stat-label">Games Played</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{stats.totalKills}</div>
          <div className="stat-label">Total Kills</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">
            {stats.averageScore.toLocaleString()}
          </div>
          <div className="stat-label">Avg Score</div>
        </div>

        {!stats.isGuest && (
          <div className="stat-item">
            <div className="stat-value">
              {stats.experience.toLocaleString()}
            </div>
            <div className="stat-label">Experience</div>
          </div>
        )}
      </div>

      {stats.isGuest && (
        <div className="guest-notice">
          <i className="fas fa-info-circle"></i>
          <span>Login to save your progress across devices!</span>
        </div>
      )}
    </div>
  );
});
