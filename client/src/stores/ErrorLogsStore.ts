import { makeAutoObservable, runInAction } from "mobx";
import { apiService } from "../services/ApiService";

export interface ErrorLogEntry {
  timestamp: string;
  type:
    | "ERROR"
    | "MEMORY_LEAK"
    | "PERFORMANCE"
    | "GAME_LOGIC"
    | "WEBSOCKET"
    | "SYSTEM";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  processInfo?: {
    pid: number;
    uptime: number;
    cpuUsage: {
      user: number;
      system: number;
    };
  };
}

export interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalErrors: number;
  memoryLeaks: number;
  gameLogicErrors: number;
  websocketErrors: number;
}

export interface ServerHealth {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  criticalErrors: number;
  recentErrors: number;
  pid: number;
  nodeVersion: string;
  platform: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  showing?: number;
  hours?: number;
  type?: string;
}

export class ErrorLogsStore {
  // Observable state
  errors: ErrorLogEntry[] = [];
  stats: ErrorStats | null = null;
  health: ServerHealth | null = null;
  loading = false;
  error: string | null = null;

  // Filters
  selectedType = "all";
  selectedSeverity = "all";
  timeRange = 24;
  expandedError: string | null = null;
  autoRefresh = false;

  // Auto-refresh interval
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Actions
  setSelectedType(type: string) {
    this.selectedType = type;
    this.fetchErrorData();
  }

  setSelectedSeverity(severity: string) {
    this.selectedSeverity = severity;
  }

  setTimeRange(hours: number) {
    this.timeRange = hours;
    this.fetchErrorData();
  }

  setExpandedError(errorId: string | null) {
    this.expandedError = errorId;
  }

  setAutoRefresh(enabled: boolean) {
    this.autoRefresh = enabled;

    if (enabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.fetchErrorData();
    }, 30000); // Refresh every 30 seconds
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async fetchErrorData() {
    this.loading = true;
    this.error = null;

    try {
      const params: Record<string, string | number> = {
        hours: this.timeRange,
        limit: 50,
      };

      if (this.selectedType !== "all") {
        params.type = this.selectedType;
      }

      // Fetch all data in parallel
      const [errorsResponse, statsResponse, healthResponse] =
        await Promise.allSettled([
          apiService.get<ApiResponse<ErrorLogEntry[]>>(
            "/api/errors/recent",
            params
          ),
          apiService.get<ApiResponse<ErrorStats>>("/api/errors/stats", {
            hours: this.timeRange,
          }),
          apiService.get<ApiResponse<ServerHealth>>("/api/errors/health"),
        ]);

      runInAction(() => {
        // Handle errors response
        if (
          errorsResponse.status === "fulfilled" &&
          errorsResponse.value.success
        ) {
          this.errors = errorsResponse.value.data || [];
        } else if (errorsResponse.status === "rejected") {
          console.error("Failed to fetch errors:", errorsResponse.reason);
        }

        // Handle stats response
        if (
          statsResponse.status === "fulfilled" &&
          statsResponse.value.success
        ) {
          this.stats = statsResponse.value.data || null;
        } else if (statsResponse.status === "rejected") {
          console.error("Failed to fetch stats:", statsResponse.reason);
        }

        // Handle health response
        if (
          healthResponse.status === "fulfilled" &&
          healthResponse.value.success
        ) {
          this.health = healthResponse.value.data || null;
        } else if (healthResponse.status === "rejected") {
          console.error("Failed to fetch health:", healthResponse.reason);
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error =
          error instanceof Error ? error.message : "Failed to fetch error data";
        console.error("Failed to fetch error data:", error);
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async refreshData() {
    await this.fetchErrorData();
  }

  // Computed values
  get filteredErrors() {
    return this.errors.filter((error) => {
      if (
        this.selectedSeverity !== "all" &&
        error.severity !== this.selectedSeverity
      ) {
        return false;
      }
      return true;
    });
  }

  get hasErrors() {
    return this.filteredErrors.length > 0;
  }

  get criticalErrorCount() {
    return this.filteredErrors.filter((error) => error.severity === "CRITICAL")
      .length;
  }

  get isHealthy() {
    return this.health?.status === "healthy" && this.criticalErrorCount === 0;
  }

  // Utility methods
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  formatMemoryUsage(bytes: number): string {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  downloadErrorLogs() {
    const dataStr = JSON.stringify(this.filteredErrors, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `error-logs-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Cleanup method
  destroy() {
    this.stopAutoRefresh();
  }
}

// Export a singleton instance
export const errorLogsStore = new ErrorLogsStore();
