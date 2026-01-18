import "dotenv/config";
import "dotenv/config";
import { type Request, Response, NextFunction } from "express";
import { serveStatic } from "./static";
import { createApp, log } from "./app";

let app: import("express").Express;
let httpServer: import("http").Server;











const port = parseInt(process.env.PORT || "5001", 10);

(async () => {
  try {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;

    // In development, attach Vite dev middlewares for the client
    if (process.env.NODE_ENV !== "production") {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } else {
      // In production (local/Cloud Run), serve static client if present
      try {
        serveStatic(app);
      } catch {
        // If static assets are not present (e.g., using Firebase Hosting), skip
      }
    }

    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
        log("Application fully initialized");
      },
    );
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
})();
