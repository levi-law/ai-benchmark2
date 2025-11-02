import { Request, Response } from "express";
import { logStreamManager, LogEntry } from "./log-stream";

export function setupLogSSE(req: Request, res: Response) {
  const benchmarkId = parseInt(req.params.benchmarkId);

  if (isNaN(benchmarkId)) {
    res.status(400).json({ error: "Invalid benchmark ID" });
    return;
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", benchmarkId })}\n\n`);

  // Send existing logs
  const existingLogs = logStreamManager.getLogs(benchmarkId);
  if (existingLogs.length > 0) {
    res.write(`data: ${JSON.stringify({ type: "history", logs: existingLogs })}\n\n`);
  }

  // Listen for new logs
  const logHandler = (entry: LogEntry) => {
    res.write(`data: ${JSON.stringify({ type: "log", log: entry })}\n\n`);
  };

  logStreamManager.on(`logs:${benchmarkId}`, logHandler);

  // Cleanup on client disconnect
  req.on("close", () => {
    logStreamManager.off(`logs:${benchmarkId}`, logHandler);
    res.end();
  });

  // Send keepalive every 30 seconds
  const keepaliveInterval = setInterval(() => {
    res.write(`:keepalive\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(keepaliveInterval);
  });
}
