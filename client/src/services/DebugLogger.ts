/**
 * Client-side debug logger that sends debug information to the server
 * This helps track down issues like the red ship rendering bug
 */

export interface DebugLogEntry {
  timestamp: string;
  type: "RENDERING" | "CONTROL" | "STATE" | "CONNECTION" | "GENERAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logQueue: DebugLogEntry[] = [];
  private sendInterval: number = 5000; // Send logs every 5 seconds
  private maxQueueSize: number = 50;
  private socket: any = null;

  private constructor() {
    this.startLogSender();
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public setSocket(socket: any): void {
    this.socket = socket;
  }

  public log(
    type: DebugLogEntry["type"],
    severity: DebugLogEntry["severity"],
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      metadata,
      stackTrace: new Error().stack,
    };

    this.logQueue.push(entry);

    // Also log to console for immediate debugging
    const logMethod =
      severity === "CRITICAL" || severity === "HIGH"
        ? "error"
        : severity === "MEDIUM"
          ? "warn"
          : "log";
    console[logMethod](`[${type}] ${message}`, metadata || "");

    // Prevent queue from growing too large
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }

    // Send immediately for critical issues
    if (severity === "CRITICAL") {
      this.sendLogs();
    }
  }

  // Convenience methods for specific types
  public logRenderingIssue(
    message: string,
    metadata?: Record<string, any>,
    severity: DebugLogEntry["severity"] = "MEDIUM"
  ): void {
    this.log("RENDERING", severity, message, metadata);
  }

  public logControlIssue(
    message: string,
    metadata?: Record<string, any>,
    severity: DebugLogEntry["severity"] = "HIGH"
  ): void {
    this.log("CONTROL", severity, message, metadata);
  }

  public logStateIssue(
    message: string,
    metadata?: Record<string, any>,
    severity: DebugLogEntry["severity"] = "MEDIUM"
  ): void {
    this.log("STATE", severity, message, metadata);
  }

  public logConnectionIssue(
    message: string,
    metadata?: Record<string, any>,
    severity: DebugLogEntry["severity"] = "HIGH"
  ): void {
    this.log("CONNECTION", severity, message, metadata);
  }

  private startLogSender(): void {
    setInterval(() => {
      this.sendLogs();
    }, this.sendInterval);
  }

  private sendLogs(): void {
    if (this.logQueue.length === 0 || !this.socket) {
      return;
    }

    try {
      // Send logs to server
      this.socket.emit("clientDebugLogs", {
        logs: [...this.logQueue],
        clientInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        },
      });

      // Clear the queue after sending
      this.logQueue = [];
    } catch (error) {
      console.error("Failed to send debug logs to server:", error);
    }
  }

  // Method to manually flush logs
  public flush(): void {
    this.sendLogs();
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();
