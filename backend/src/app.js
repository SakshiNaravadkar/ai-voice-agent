import express from "express";
import chatRouter from "./routes/chat.routes.js";
import healthRouter from "./routes/health.routes.js";

// Create the Express application.
// Keeping app setup separate from server startup makes the app easier to test later.
const app = express();

app.disable("x-powered-by");

// Allow the server to read JSON request bodies.
app.use(express.json({ limit: "16kb" }));

// All API routes are mounted under /api.
app.use("/api", healthRouter);
app.use("/api", chatRouter);

// Return a JSON response for any unknown route.
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Return JSON (instead of Express's default HTML page) for malformed requests
// and unexpected server failures.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_JSON",
        message: "The request body must be valid JSON.",
      },
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      status: "error",
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
      },
    });
  }

  console.error("Unhandled server error:", error?.name ?? "Error");

  return res.status(500).json({
    status: "error",
    error: {
      code: "SERVER_ERROR",
      message: "The server could not complete the request. Please try again.",
    },
  });
});

export default app;
