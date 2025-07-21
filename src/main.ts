import { NestFactory } from "@nestjs/core";
import * as express from "express";
import { join } from "path";
import { AppModule } from "./app.module";
import { ErrorLoggerService } from "./services/error-logger.service";

async function bootstrap() {
  let errorLogger: ErrorLoggerService;

  try {
    const app = await NestFactory.create(AppModule);

    // Get error logger service from the application context
    errorLogger = app.get(ErrorLoggerService);

    // Enable CORS for development and production
    app.enableCors({
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL || true // Allow configured frontend URL in production
          : [
              "http://localhost:5173", // Default Vite dev server
              "http://localhost:5174", // Alternative Vite dev server port
              /^http:\/\/localhost:\d+$/, // Allow any localhost port in development
            ],
      methods: ["GET", "POST"],
      credentials: true,
    });

    // Serve static files in production
    if (process.env.NODE_ENV === "production") {
      const clientPath = join(process.cwd(), "client", "dist");
      console.log(`Serving static files from: ${clientPath}`);

      // Serve static assets (CSS, JS, images, etc.)
      app.use("/assets", express.static(join(clientPath, "assets")));
      app.use("/vite.svg", express.static(join(clientPath, "vite.svg")));

      // Serve other static files with proper cache headers
      app.use(
        express.static(clientPath, {
          maxAge: "1d", // Cache static assets for 1 day
          setHeaders: (res, path) => {
            // Don't cache index.html
            if (path.endsWith("index.html")) {
              res.setHeader(
                "Cache-Control",
                "no-cache, no-store, must-revalidate"
              );
            }
          },
        })
      );
    }

    // Use PORT environment variable for Cloud Run or default to 3001
    const port = process.env.PORT || 3001;
    await app.listen(port, "0.0.0.0"); // Bind to all interfaces for Cloud Run
    console.log(`Game server running on http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    // Log successful startup
    await errorLogger.logError({
      type: "SYSTEM",
      severity: "LOW",
      message: `Server started successfully on port ${port}`,
      metadata: {
        port,
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error("Failed to start server:", error);

    // Try to log the error if possible
    if (errorLogger) {
      await errorLogger.logSystemError(error, "CRITICAL");
    } else {
      // Fallback error logging to file if service isn't available
      const fs = require("fs");
      const path = require("path");
      const errorDir = path.join(process.cwd(), "errors");

      if (!fs.existsSync(errorDir)) {
        fs.mkdirSync(errorDir, { recursive: true });
      }

      const errorLog = {
        timestamp: new Date().toISOString(),
        type: "SYSTEM",
        severity: "CRITICAL",
        message: `Bootstrap failed: ${error.message}`,
        stack: error.stack,
        metadata: {
          source: "bootstrap",
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      fs.appendFileSync(
        path.join(
          errorDir,
          `system-${new Date().toISOString().split("T")[0]}.log`
        ),
        JSON.stringify(errorLog) + "\n"
      );
    }

    process.exit(1);
  }
}

bootstrap();
