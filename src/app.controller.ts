import { Controller, Get, Next, Req, Res } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { join } from "path";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    };
  }

  // Catch-all route for client-side routing
  @Get("*")
  serveClient(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    console.log(`Request path: ${req.path}, NODE_ENV: ${process.env.NODE_ENV}`);

    // Skip API routes and socket.io - let NestJS handle them
    if (
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/auth")
    ) {
      // Don't handle these routes - let NestJS continue processing
      return next();
    }

    // In production, serve the client app
    if (process.env.NODE_ENV === "production") {
      const indexPath = join(process.cwd(), "client", "dist", "index.html");
      console.log(`Serving client from: ${indexPath}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
          console.error("Current working directory:", process.cwd());
          console.error("Full path attempted:", indexPath);
          res.status(500).json({ error: "Internal server error" });
        }
      });
    } else {
      // In development, return a simple message
      res.json({
        message: "Canvas Multiplayer Game Server",
        environment: "development",
        clientUrl: "http://localhost:5173",
      });
    }
  }
}
