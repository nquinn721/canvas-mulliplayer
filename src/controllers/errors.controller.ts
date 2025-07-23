import { Controller, Get, Query } from "@nestjs/common";
import { ErrorLoggerService } from "../services/error-logger.service";

// Simple IP-based guard for development - replace with proper auth in production

@Controller("errors")
export class ErrorsController {
  constructor(private readonly errorLogger: ErrorLoggerService) {}

  @Get("recent")
  async getRecentErrors(
    @Query("hours") hours?: string,
    @Query("type") type?: string,
    @Query("limit") limit?: string
  ) {
    try {
      const hoursNum = hours ? parseInt(hours, 10) : 24;
      const limitNum = limit ? parseInt(limit, 10) : 100;

      const errors = await this.errorLogger.getRecentErrors(hoursNum, type);

      // Limit results for performance
      const limitedErrors = errors.slice(0, limitNum);

      return {
        success: true,
        data: limitedErrors,
        total: errors.length,
        showing: limitedErrors.length,
        hours: hoursNum,
        type: type || "all",
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch error logs",
        message: error.message,
      };
    }
  }

  @Get("stats")
  async getErrorStats(@Query("hours") hours?: string) {
    try {
      const hoursNum = hours ? parseInt(hours, 10) : 24;
      const stats = await this.errorLogger.getErrorStats(hoursNum);

      return {
        success: true,
        data: stats,
        hours: hoursNum,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch error statistics",
        message: error.message,
      };
    }
  }

  @Get("health")
  async getServerHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const cpuUsage = process.cpuUsage();

      // Get recent critical errors (last 1 hour)
      const recentCriticalErrors = await this.errorLogger.getRecentErrors(1);
      const criticalErrors = recentCriticalErrors.filter(
        (e) => e.severity === "CRITICAL"
      );

      // Calculate memory usage in MB
      const memoryMB = {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      };

      // Determine server health status
      const isHealthy =
        criticalErrors.length === 0 &&
        memoryMB.heapUsed < 500 && // Less than 500MB
        uptime > 60; // Running for more than 1 minute

      return {
        success: true,
        data: {
          status: isHealthy ? "healthy" : "warning",
          uptime: Math.round(uptime),
          memory: memoryMB,
          cpu: {
            user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
            system: Math.round(cpuUsage.system / 1000),
          },
          criticalErrors: criticalErrors.length,
          recentErrors: recentCriticalErrors.length,
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch server health",
        message: error.message,
      };
    }
  }
}
