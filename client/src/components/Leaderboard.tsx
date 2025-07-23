import React, { useEffect, useState } from "react";
import {
  LeaderboardEntry,
  LeaderboardService,
  LeaderboardType,
  ScoreCategory,
} from "../services/LeaderboardService";
import "./Leaderboard.css";

interface LeaderboardProps {
  onClose: () => void;
  authToken?: string;
  onError?: (error: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  onClose,
  authToken,
  onError,
}) => {
  const [leaderboardService] = useState(() => new LeaderboardService());
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaderboardType>(
    LeaderboardType.ALL_TIME
  );
  const [selectedCategory, setSelectedCategory] = useState<ScoreCategory>(
    ScoreCategory.TOTAL_SCORE
  );
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
    if (authToken) {
      loadUserRank();
    }
  }, [selectedType, selectedCategory, authToken]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await leaderboardService.getLeaderboard(
        selectedType,
        selectedCategory,
        100,
        0
      );
      setEntries(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load leaderboard";
      onError?.(errorMessage);
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    if (!authToken) return;

    try {
      const rankData = await leaderboardService.getUserRank(
        selectedType,
        selectedCategory,
        authToken
      );
      setUserRank(rankData.rank);
    } catch (error) {
      console.error("Failed to load user rank:", error);
      setUserRank(null);
    }
  };

  const handleTypeChange = (type: LeaderboardType) => {
    setSelectedType(type);
  };

  const handleCategoryChange = (category: ScoreCategory) => {
    setSelectedCategory(category);
  };

  const formatScore = (score: number, category: ScoreCategory): string => {
    return leaderboardService.formatScore(score, category);
  };

  const getRankColor = (rank: number): string => {
    return leaderboardService.getRankColor(rank);
  };

  const getRankBadge = (rank: number): string => {
    return leaderboardService.getRankBadge(rank);
  };

  const getRankIcon = (rank: number) => {
    return getRankBadge(rank);
  };

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>🏆 Leaderboard</h2>

          {userRank && (
            <div className="user-rank-display">
              Your Rank:{" "}
              <span
                className="rank-badge"
                style={{ color: getRankColor(userRank) }}
              >
                {getRankBadge(userRank)} #{userRank}
              </span>
            </div>
          )}

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="leaderboard-controls">
          <div className="control-group">
            <label htmlFor="type-select">Period:</label>
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) =>
                handleTypeChange(e.target.value as LeaderboardType)
              }
              className="leaderboard-select"
            >
              {Object.values(LeaderboardType).map((type) => (
                <option key={type} value={type}>
                  {leaderboardService.getTypeDisplayName(type)}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="category-select">Category:</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) =>
                handleCategoryChange(e.target.value as ScoreCategory)
              }
              className="leaderboard-select"
            >
              {Object.values(ScoreCategory).map((category) => (
                <option key={category} value={category}>
                  {leaderboardService.getCategoryDisplayName(category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="leaderboard-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              Loading leaderboard...
            </div>
          ) : entries.length === 0 ? (
            <div className="no-data">
              <p>No leaderboard data available.</p>
              <p>Play some games to see rankings!</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {entries.map((entry) => (
                <div
                  key={`${entry.userId}-${entry.rank}`}
                  className={`leaderboard-entry ${entry.rank <= 3 ? "top-three" : ""}`}
                >
                  <div className="rank-section">
                    <span
                      className="rank-indicator"
                      style={{ color: getRankColor(entry.rank) }}
                    >
                      {getRankIcon(entry.rank)}
                    </span>
                  </div>

                  <div className="player-info">
                    <div className="player-avatar">
                      <div className="avatar-placeholder">
                        {(entry.displayName || entry.username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    </div>
                    <div className="player-details">
                      <span className="player-name">
                        {entry.displayName || entry.username}
                      </span>
                      <span className="games-played">
                        {entry.gamesPlayed} games • {entry.winRate.toFixed(1)}%
                        wins
                      </span>
                      <span className="player-stats">
                        K/D: {entry.killDeathRatio.toFixed(2)} • Avg:{" "}
                        {entry.averageScore.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="score-section">
                    <span className="score">
                      {formatScore(entry.score, selectedCategory)}
                    </span>
                    <span className="score-label">
                      {leaderboardService.getCategoryDisplayName(
                        selectedCategory
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="leaderboard-footer">
          <p>
            Rankings update every 5 minutes • Minimum 5 games required for
            ranking
          </p>
        </div>
      </div>
    </div>
  );
};
