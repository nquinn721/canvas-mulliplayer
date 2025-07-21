import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

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
  memoryUsage?: NodeJS.MemoryUsage;
  processInfo?: {
    pid: number;
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
  };
}

@Injectable()
export class ErrorLoggerService {
  private readonly errorDir = path.join(process.cwd(), "errors");
  private readonly maxLogFileSize = 10 * 1024 * 1024; // 10MB
  private readonly maxLogFiles = 10;

  // Memory monitoring
  private lastMemoryCheck = Date.now();
  private memoryCheckInterval = 30000; // Check every 30 seconds
  private memoryThreshold = 500 * 1024 * 1024; // 500MB threshold
  private memoryIncreaseThreshold = 50 * 1024 * 1024; // 50MB increase threshold
  private previousMemoryUsage = process.memoryUsage().heapUsed;

  constructor() {
    this.ensureErrorDirectoryExists();
    this.startMemoryMonitoring();
    this.setupProcessMonitoring();
  }

  private ensureErrorDirectoryExists(): void {
    if (!fs.existsSync(this.errorDir)) {
      fs.mkdirSync(this.errorDir, { recursive: true });
    }
  }

  private getLogFileName(type: string): string {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.errorDir, `${type.toLowerCase()}-${date}.log`);
  }

  private rotateLogFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rotatedPath = filePath.replace(".log", `-${timestamp}.log`);
        fs.renameSync(filePath, rotatedPath);

        // Clean up old log files
        this.cleanupOldLogs();
      }
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs
        .readdirSync(this.errorDir)
        .filter((file) => file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join(this.errorDir, file),
          stats: fs.statSync(path.join(this.errorDir, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      if (files.length > this.maxLogFiles) {
        files.slice(this.maxLogFiles).forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  private formatLogEntry(entry: ErrorLogEntry): string {
    const logLine = {
      timestamp: entry.timestamp,
      type: entry.type,
      severity: entry.severity,
      message: entry.message,
      ...(entry.stack && { stack: entry.stack }),
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.memoryUsage && { memory: entry.memoryUsage }),
      ...(entry.processInfo && { process: entry.processInfo }),
    };

    return JSON.stringify(logLine) + "\n";
  }

  public async logError(entry: Partial<ErrorLogEntry>): Promise<void> {
    try {
      const fullEntry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        type: entry.type || "ERROR",
        severity: entry.severity || "MEDIUM",
        message: entry.message || "Unknown error",
        stack: entry.stack,
        metadata: entry.metadata,
        memoryUsage: process.memoryUsage(),
        processInfo: {
          pid: process.pid,
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage(),
        },
      };

      const logFile = this.getLogFileName(fullEntry.type);
      this.rotateLogFile(logFile);

      const logEntry = this.formatLogEntry(fullEntry);
      await fs.promises.appendFile(logFile, logEntry);

      // Also log critical errors to console
      if (fullEntry.severity === "CRITICAL") {
        console.error(`CRITICAL ERROR [${fullEntry.type}]:`, fullEntry.message);
        if (fullEntry.stack) {
          console.error("Stack trace:", fullEntry.stack);
        }
      }
    } catch (writeError) {
      console.error("Failed to write error log:", writeError);
    }
  }

  public async logGameLogicError(
    error: Error,
    context: Record<string, any> = {}
  ): Promise<void> {
    await this.logError({
      type: "GAME_LOGIC",
      severity: "HIGH",
      message: `Game logic error: ${error.message}`,
      stack: error.stack,
      metadata: {
        context,
        playerCount: context.playerCount || 0,
        gameState: context.gameState || "unknown",
      },
    });
  }

  public async logWebSocketError(
    error: Error,
    socketId?: string,
    event?: string
  ): Promise<void> {
    await this.logError({
      type: "WEBSOCKET",
      severity: "MEDIUM",
      message: `WebSocket error: ${error.message}`,
      stack: error.stack,
      metadata: {
        socketId,
        event,
        timestamp: Date.now(),
      },
    });
  }

  public async logMemoryLeak(
    usage: NodeJS.MemoryUsage,
    threshold: number
  ): Promise<void> {
    await this.logError({
      type: "MEMORY_LEAK",
      severity: "HIGH",
      message: `Potential memory leak detected. Heap usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB, Threshold: ${Math.round(threshold / 1024 / 1024)}MB`,
      metadata: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
        threshold,
      },
    });
  }

  public async logPerformanceIssue(
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logError({
      type: "PERFORMANCE",
      severity: "MEDIUM",
      message,
      metadata: {
        ...metadata,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  }

  public async logSystemError(
    error: Error,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH"
  ): Promise<void> {
    await this.logError({
      type: "SYSTEM",
      severity,
      message: `System error: ${error.message}`,
      stack: error.stack,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const currentMemory = process.memoryUsage();
      const now = Date.now();

      // Check for memory threshold breach
      if (currentMemory.heapUsed > this.memoryThreshold) {
        this.logMemoryLeak(currentMemory, this.memoryThreshold);
      }

      // Check for rapid memory increase
      const memoryIncrease = currentMemory.heapUsed - this.previousMemoryUsage;
      if (memoryIncrease > this.memoryIncreaseThreshold) {
        this.logError({
          type: "MEMORY_LEAK",
          severity: "MEDIUM",
          message: `Rapid memory increase detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB in ${Math.round((now - this.lastMemoryCheck) / 1000)}s`,
          metadata: {
            previousUsage: this.previousMemoryUsage,
            currentUsage: currentMemory.heapUsed,
            increase: memoryIncrease,
            timeInterval: now - this.lastMemoryCheck,
          },
        });
      }

      this.previousMemoryUsage = currentMemory.heapUsed;
      this.lastMemoryCheck = now;
    }, this.memoryCheckInterval);
  }

  private setupProcessMonitoring(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      this.logError({
        type: "SYSTEM",
        severity: "CRITICAL",
        message: `Uncaught exception: ${error.message}`,
        stack: error.stack,
        metadata: {
          fatal: true,
          source: "uncaughtException",
        },
      }).then(() => {
        console.error("CRITICAL: Uncaught exception logged. Exiting process.");
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      this.logError({
        type: "SYSTEM",
        severity: "HIGH",
        message: `Unhandled promise rejection: ${reason}`,
        stack: reason instanceof Error ? reason.stack : undefined,
        metadata: {
          reason: reason instanceof Error ? reason.message : String(reason),
          promise: promise.toString(),
          source: "unhandledRejection",
        },
      });
    });

    // Handle warnings
    process.on("warning", (warning) => {
      this.logError({
        type: "SYSTEM",
        severity: "LOW",
        message: `Process warning: ${warning.message}`,
        metadata: {
          name: warning.name,
          code: (warning as any).code,
          source: "processWarning",
        },
      });
    });

    // Handle SIGTERM and SIGINT for graceful shutdown
    const gracefulShutdown = (signal: string) => {
      this.logError({
        type: "SYSTEM",
        severity: "MEDIUM",
        message: `Received ${signal}. Initiating graceful shutdown.`,
        metadata: {
          signal,
          uptime: process.uptime(),
          source: "gracefulShutdown",
        },
      }).then(() => {
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  }

  // Utility method to get recent errors for monitoring dashboards
  public async getRecentErrors(
    hours: number = 24,
    type?: string
  ): Promise<ErrorLogEntry[]> {
    const errors: ErrorLogEntry[] = [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const files = fs
        .readdirSync(this.errorDir)
        .filter((file) => file.endsWith(".log"))
        .filter((file) => !type || file.startsWith(type.toLowerCase()));

      for (const file of files) {
        const filePath = path.join(this.errorDir, file);
        const content = await fs.promises.readFile(filePath, "utf-8");
        const lines = content
          .trim()
          .split("\n")
          .filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry: ErrorLogEntry = JSON.parse(line);
            const entryTime = new Date(entry.timestamp);
            if (entryTime >= cutoffTime) {
              errors.push(entry);
            }
          } catch (parseError) {
            // Skip malformed log entries
          }
        }
      }

      return errors.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Failed to read recent errors:", error);
      return [];
    }
  }

  // Get error statistics
  public async getErrorStats(hours: number = 24): Promise<Record<string, any>> {
    const errors = await this.getRecentErrors(hours);

    const stats = {
      total: errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      criticalErrors: errors.filter((e) => e.severity === "CRITICAL").length,
      memoryLeaks: errors.filter((e) => e.type === "MEMORY_LEAK").length,
      gameLogicErrors: errors.filter((e) => e.type === "GAME_LOGIC").length,
      websocketErrors: errors.filter((e) => e.type === "WEBSOCKET").length,
    };

    errors.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }
}
