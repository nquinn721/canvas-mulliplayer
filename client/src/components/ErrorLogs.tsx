import {
  faBug,
  faChartLine,
  faClock,
  faDownload,
  faFilter,
  faGamepad,
  faMemory,
  faRefresh,
  faServer,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react-lite";
import React, { useEffect } from "react";
import { errorLogsStore } from "../stores/ErrorLogsStore";
import "./ErrorLogs.css";

export const ErrorLogs: React.FC = observer(() => {
  const errorTypeIcons = {
    ERROR: faBug,
    MEMORY_LEAK: faMemory,
    PERFORMANCE: faChartLine,
    GAME_LOGIC: faGamepad,
    WEBSOCKET: faWifi,
    SYSTEM: faServer,
  };

  const severityColors = {
    LOW: "#28a745",
    MEDIUM: "#ffc107",
    HIGH: "#fd7e14",
    CRITICAL: "#dc3545",
  };

  useEffect(() => {
    // Initial data fetch
    errorLogsStore.fetchErrorData();

    // Cleanup on unmount
    return () => {
      errorLogsStore.destroy();
    };
  }, []);

  return (
    <div className="error-logs-container">
      {/* Header */}
      <div className="error-logs-header">
        <h3>
          <FontAwesomeIcon icon={faBug} /> Server Error Logs
        </h3>
        <div className="error-logs-controls">
          <button
            className={`auto-refresh-btn ${errorLogsStore.autoRefresh ? "active" : ""}`}
            onClick={() =>
              errorLogsStore.setAutoRefresh(!errorLogsStore.autoRefresh)
            }
            title="Auto-refresh every 30 seconds"
          >
            <FontAwesomeIcon
              icon={faRefresh}
              spin={errorLogsStore.autoRefresh}
            />
          </button>
          <button
            className="download-btn"
            onClick={() => errorLogsStore.downloadErrorLogs()}
            title="Download logs"
          >
            <FontAwesomeIcon icon={faDownload} />
          </button>
          <button
            className="refresh-btn"
            onClick={() => errorLogsStore.refreshData()}
            disabled={errorLogsStore.loading}
          >
            <FontAwesomeIcon icon={faRefresh} spin={errorLogsStore.loading} />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {errorLogsStore.error && (
        <div className="error-message">
          <strong>Error:</strong> {errorLogsStore.error}
        </div>
      )}

      {/* Server Health Status */}
      {errorLogsStore.health && (
        <div className={`server-health ${errorLogsStore.health.status}`}>
          <div className="health-header">
            <h4>
              <FontAwesomeIcon icon={faServer} /> Server Health
            </h4>
            <span className={`health-status ${errorLogsStore.health.status}`}>
              {errorLogsStore.health.status.toUpperCase()}
            </span>
          </div>
          <div className="health-stats">
            <div className="health-stat">
              <span className="stat-label">Uptime:</span>
              <span className="stat-value">
                {errorLogsStore.formatUptime(errorLogsStore.health.uptime)}
              </span>
            </div>
            <div className="health-stat">
              <span className="stat-label">Memory:</span>
              <span className="stat-value">
                {errorLogsStore.health.memory.heapUsed}MB /{" "}
                {errorLogsStore.health.memory.heapTotal}MB
              </span>
            </div>
            <div className="health-stat">
              <span className="stat-label">Critical Errors:</span>
              <span
                className={`stat-value ${errorLogsStore.health.criticalErrors > 0 ? "error" : "success"}`}
              >
                {errorLogsStore.health.criticalErrors}
              </span>
            </div>
            <div className="health-stat">
              <span className="stat-label">Recent Errors:</span>
              <span className="stat-value">
                {errorLogsStore.health.recentErrors}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {errorLogsStore.stats && (
        <div className="error-stats">
          <h4>
            <FontAwesomeIcon icon={faChartLine} /> Error Statistics (Last{" "}
            {errorLogsStore.timeRange}h)
          </h4>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{errorLogsStore.stats.total}</div>
              <div className="stat-label">Total Errors</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-number">
                {errorLogsStore.stats.criticalErrors}
              </div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-card memory">
              <div className="stat-number">
                {errorLogsStore.stats.memoryLeaks}
              </div>
              <div className="stat-label">Memory Leaks</div>
            </div>
            <div className="stat-card game">
              <div className="stat-number">
                {errorLogsStore.stats.gameLogicErrors}
              </div>
              <div className="stat-label">Game Logic</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="error-filters">
        <div className="filter-group">
          <label>
            <FontAwesomeIcon icon={faClock} /> Time Range:
          </label>
          <select
            value={errorLogsStore.timeRange}
            onChange={(e) =>
              errorLogsStore.setTimeRange(parseInt(e.target.value))
            }
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last week</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <FontAwesomeIcon icon={faFilter} /> Type:
          </label>
          <select
            value={errorLogsStore.selectedType}
            onChange={(e) => errorLogsStore.setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="ERROR">General Errors</option>
            <option value="MEMORY_LEAK">Memory Leaks</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="GAME_LOGIC">Game Logic</option>
            <option value="WEBSOCKET">WebSocket</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Severity:</label>
          <select
            value={errorLogsStore.selectedSeverity}
            onChange={(e) => errorLogsStore.setSelectedSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="error-list">
        {errorLogsStore.loading && (
          <div className="loading">Loading error logs...</div>
        )}

        {!errorLogsStore.loading && !errorLogsStore.hasErrors && (
          <div className="no-errors">
            <FontAwesomeIcon icon={faBug} />
            <p>No errors found for the selected filters.</p>
          </div>
        )}

        {!errorLogsStore.loading &&
          errorLogsStore.filteredErrors.map((error, index) => (
            <div
              key={`${error.timestamp}-${index}`}
              className={`error-item ${error.severity.toLowerCase()}`}
            >
              <div
                className="error-header"
                onClick={() =>
                  errorLogsStore.setExpandedError(
                    errorLogsStore.expandedError ===
                      `${error.timestamp}-${index}`
                      ? null
                      : `${error.timestamp}-${index}`
                  )
                }
              >
                <div className="error-type">
                  <FontAwesomeIcon icon={errorTypeIcons[error.type]} />
                  <span>{error.type}</span>
                </div>
                <div
                  className="error-severity"
                  style={{ color: severityColors[error.severity] }}
                >
                  {error.severity}
                </div>
                <div className="error-time">
                  {errorLogsStore.formatTimestamp(error.timestamp)}
                </div>
              </div>

              <div className="error-message">{error.message}</div>

              {errorLogsStore.expandedError ===
                `${error.timestamp}-${index}` && (
                <div className="error-details">
                  {error.stack && (
                    <div className="error-stack">
                      <h5>Stack Trace:</h5>
                      <pre>{error.stack}</pre>
                    </div>
                  )}

                  {error.metadata && Object.keys(error.metadata).length > 0 && (
                    <div className="error-metadata">
                      <h5>Metadata:</h5>
                      <pre>{JSON.stringify(error.metadata, null, 2)}</pre>
                    </div>
                  )}

                  {error.memoryUsage && (
                    <div className="error-memory">
                      <h5>Memory Usage:</h5>
                      <div className="memory-stats">
                        <span>
                          Heap Used:{" "}
                          {errorLogsStore.formatMemoryUsage(
                            error.memoryUsage.heapUsed
                          )}
                        </span>
                        <span>
                          Heap Total:{" "}
                          {errorLogsStore.formatMemoryUsage(
                            error.memoryUsage.heapTotal
                          )}
                        </span>
                        <span>
                          External:{" "}
                          {errorLogsStore.formatMemoryUsage(
                            error.memoryUsage.external
                          )}
                        </span>
                        <span>
                          RSS:{" "}
                          {errorLogsStore.formatMemoryUsage(
                            error.memoryUsage.rss
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {error.processInfo && (
                    <div className="error-process">
                      <h5>Process Info:</h5>
                      <div className="process-stats">
                        <span>PID: {error.processInfo.pid}</span>
                        <span>
                          Uptime:{" "}
                          {errorLogsStore.formatUptime(
                            error.processInfo.uptime
                          )}
                        </span>
                        <span>
                          CPU User:{" "}
                          {Math.round(error.processInfo.cpuUsage.user / 1000)}ms
                        </span>
                        <span>
                          CPU System:{" "}
                          {Math.round(error.processInfo.cpuUsage.system / 1000)}
                          ms
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
});
