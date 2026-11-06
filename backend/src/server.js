import "dotenv/config";
import app from "./app.js";

// The port can be changed by setting a PORT environment variable.
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`AI Voice Agent backend is running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Close the server cleanly when the process is stopped (Ctrl+C).
// This also prevents port conflicts when watch mode restarts the server.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}. Shutting down...`);
    server.close(() => process.exit(0));
  });
}
