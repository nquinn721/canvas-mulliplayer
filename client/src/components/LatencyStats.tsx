import { observer } from "mobx-react-lite";
import React from "react";
import { gameStore } from "../stores";
import "./LatencyStats.css";

export const LatencyStats: React.FC = observer(() => {
  const stats = gameStore.getLatencyStats();

  if (!stats) {
    return null;
  }

  return (
    <div className="latency-stats">
      <h4>Network Stats</h4>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Ping:</span>
          <span className="stat-value">{Math.round(stats.latency)}ms</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Input Buffer:</span>
          <span className="stat-value">{stats.inputHistorySize}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">State Buffer:</span>
          <span className="stat-value">{stats.gameStateHistorySize}</span>
        </div>
      </div>

      <div className="compensation-toggles">
        <h5>Latency Compensation</h5>
        <label className="toggle-option">
          <input
            type="checkbox"
            checked={stats.predictionEnabled}
            onChange={(e) => gameStore.togglePrediction(e.target.checked)}
          />
          Client Prediction
        </label>
        <label className="toggle-option">
          <input
            type="checkbox"
            checked={stats.interpolationEnabled}
            onChange={(e) => gameStore.toggleInterpolation(e.target.checked)}
          />
          Interpolation
        </label>
        <label className="toggle-option">
          <input
            type="checkbox"
            checked={stats.reconciliationEnabled}
            onChange={(e) => gameStore.toggleReconciliation(e.target.checked)}
          />
          Server Reconciliation
        </label>
      </div>

      <div className="ping-indicator">
        <div className={`ping-bar ${getPingColor(stats.latency)}`}>
          <div
            className="ping-fill"
            style={{ width: `${Math.min(100, (stats.latency / 200) * 100)}%` }}
          />
        </div>
        <span className="ping-text">{getPingStatus(stats.latency)}</span>
      </div>
    </div>
  );
});

function getPingColor(ping: number): string {
  if (ping < 50) return "good";
  if (ping < 100) return "okay";
  if (ping < 200) return "poor";
  return "bad";
}

function getPingStatus(ping: number): string {
  if (ping < 50) return "Excellent";
  if (ping < 100) return "Good";
  if (ping < 200) return "Fair";
  return "Poor";
}
