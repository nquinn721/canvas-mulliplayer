import React from "react";
import "./Leaderboard.css";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  gamesPlayed: number;
  avatar?: string;
}

interface LeaderboardProps {
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  // Mock data - replace with real API call
  const leaderboardData: LeaderboardEntry[] = [
    { rank: 1, username: "AceStarPilot", score: 15420, gamesPlayed: 127 },
    { rank: 2, username: "CosmicHunter", score: 14850, gamesPlayed: 98 },
    { rank: 3, username: "VoidDestroyer", score: 13990, gamesPlayed: 156 },
    { rank: 4, username: "StarCommander", score: 12780, gamesPlayed: 89 },
    { rank: 5, username: "GalaxyDefender", score: 11650, gamesPlayed: 134 },
    { rank: 6, username: "NebulaKnight", score: 10890, gamesPlayed: 76 },
    { rank: 7, username: "PlasmaMaster", score: 9840, gamesPlayed: 92 },
    { rank: 8, username: "SolarFlare", score: 8920, gamesPlayed: 67 },
    { rank: 9, username: "MeteorStrike", score: 8350, gamesPlayed: 58 },
    { rank: 10, username: "AstroWarrior", score: 7690, gamesPlayed: 71 },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-modal">
        <div className="leaderboard-header">
          <h2>🏆 Leaderboard</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="leaderboard-content">
          <div className="leaderboard-list">
            {leaderboardData.map((entry) => (
              <div
                key={entry.rank}
                className={`leaderboard-entry ${entry.rank <= 3 ? "top-three" : ""}`}
              >
                <div className="rank-section">
                  <span className="rank-indicator">
                    {getRankIcon(entry.rank)}
                  </span>
                </div>

                <div className="player-info">
                  <div className="player-avatar">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="player-details">
                    <span className="player-name">{entry.username}</span>
                    <span className="games-played">
                      {entry.gamesPlayed} games
                    </span>
                  </div>
                </div>

                <div className="score-section">
                  <span className="score">{entry.score.toLocaleString()}</span>
                  <span className="score-label">points</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="leaderboard-footer">
          <p>Compete with players worldwide!</p>
        </div>
      </div>
    </div>
  );
};
