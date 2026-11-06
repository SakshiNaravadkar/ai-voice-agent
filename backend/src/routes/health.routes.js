import { Router } from "express";

const router = Router();

// GET /api/health
// A simple endpoint used to confirm that the backend is running.
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "AI Voice Agent backend is running",
    timestamp: new Date().toISOString(),
    uptime: `${Math.round(process.uptime())}s`,
  });
});

export default router;
