import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
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
  serveClient(@Req() req: Request, @Res() res: Response) {
    // Skip API routes and socket.io
    if (
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/api")
    ) {
      return res.status(404).json({ error: "Not found" });
    }

    // In production, serve the client app
    if (process.env.NODE_ENV === "production") {
      const indexPath = join(process.cwd(), "client", "dist", "index.html");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
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
