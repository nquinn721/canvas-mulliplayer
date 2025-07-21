import { ErrorLoggerService } from "../services/error-logger.service";

interface PerformanceOptions {
  threshold?: number; // milliseconds
  logSlowOperations?: boolean;
  logAllOperations?: boolean;
  context?: Record<string, any>;
}

export function MonitorPerformance(options: PerformanceOptions = {}) {
  const {
    threshold = 1000, // 1 second default threshold
    logSlowOperations = true,
    logAllOperations = false,
    context = {},
  } = options;

  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const methodName = `${target.constructor.name}.${propertyName}`;

      try {
        const result = await method.apply(this, args);
        const executionTime = Date.now() - startTime;

        // Get error logger instance - in a real scenario, you'd inject this properly
        const errorLogger = new ErrorLoggerService();

        if (
          logAllOperations ||
          (logSlowOperations && executionTime > threshold)
        ) {
          await errorLogger.logPerformanceIssue(
            `${methodName} execution time: ${executionTime}ms`,
            {
              method: methodName,
              executionTime,
              threshold,
              args: args.length,
              context,
              slow: executionTime > threshold,
            }
          );
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorLogger = new ErrorLoggerService();

        await errorLogger.logError({
          type: "PERFORMANCE",
          severity: "HIGH",
          message: `Method ${methodName} failed after ${executionTime}ms: ${error.message}`,
          stack: error.stack,
          metadata: {
            method: methodName,
            executionTime,
            args: args.length,
            context,
            error: error.message,
          },
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// Helper decorator for monitoring game loop operations specifically
export function MonitorGameOperation(context: string) {
  return MonitorPerformance({
    threshold: 16, // 16ms threshold for 60fps operations
    logSlowOperations: true,
    context: { gameOperation: context },
  });
}
