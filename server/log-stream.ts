import { EventEmitter } from "events";

export interface LogEntry {
  benchmarkId: number;
  timestamp: string;
  level: "info" | "error" | "debug" | "stdout" | "stderr";
  message: string;
}

class LogStreamManager extends EventEmitter {
  private logs: Map<number, LogEntry[]> = new Map();
  private maxLogsPerBenchmark = 1000;

  addLog(entry: LogEntry) {
    const benchmarkLogs = this.logs.get(entry.benchmarkId) || [];
    benchmarkLogs.push(entry);

    // Keep only the last N logs
    if (benchmarkLogs.length > this.maxLogsPerBenchmark) {
      benchmarkLogs.shift();
    }

    this.logs.set(entry.benchmarkId, benchmarkLogs);

    // Emit to all listeners
    this.emit(`logs:${entry.benchmarkId}`, entry);
    this.emit("logs:all", entry);
  }

  getLogs(benchmarkId: number): LogEntry[] {
    return this.logs.get(benchmarkId) || [];
  }

  clearLogs(benchmarkId: number) {
    this.logs.delete(benchmarkId);
  }

  clearAllLogs() {
    this.logs.clear();
  }
}

export const logStreamManager = new LogStreamManager();

// Helper function to create log entries
export function createLogEntry(
  benchmarkId: number,
  level: LogEntry["level"],
  message: string
): LogEntry {
  return {
    benchmarkId,
    timestamp: new Date().toISOString(),
    level,
    message,
  };
}
