import { exec } from "child_process";
import { promisify } from "util";
import { getAllBenchmarkResults, updateBenchmarkResult } from "./db";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[BenchmarkMonitor] INFO:`, msg, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[BenchmarkMonitor] ERROR:`, msg, ...args),
  debug: (msg: string, ...args: any[]) => console.log(`[BenchmarkMonitor] DEBUG:`, msg, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[BenchmarkMonitor] WARN:`, msg, ...args),
};

interface RunningProcess {
  pid: number;
  benchmarkId: number;
  outputDir: string;
}

/**
 * Monitor running benchmark processes and update database accordingly
 */
export class BenchmarkMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      logger.warn("Monitor already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting benchmark monitor");

    // Check immediately
    await this.checkBenchmarks();

    // Then check every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkBenchmarks().catch((error) => {
        logger.error("Error in monitor loop:", error);
      });
    }, 10000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("Benchmark monitor stopped");
  }

  private async checkBenchmarks() {
    try {
      // Find all running Python benchmark processes
      const runningProcesses = await this.findRunningProcesses();
      logger.debug(`Found ${runningProcesses.length} running benchmark processes`);

      // Get all benchmarks from database that are marked as running
      const dbBenchmarks = await getAllBenchmarkResults();
      const runningInDb = dbBenchmarks.filter((b) => b.status === "running");

      logger.debug(`Found ${runningInDb.length} benchmarks marked as running in database`);

      // Check each running process
      for (const proc of runningProcesses) {
        await this.checkProcess(proc);
      }

      // Check for benchmarks marked as running but no process found
      for (const benchmark of runningInDb) {
        const hasProcess = runningProcesses.some((p) => p.benchmarkId === benchmark.id);
        if (!hasProcess) {
          logger.warn(`Benchmark #${benchmark.id} marked as running but no process found - may have crashed`);
          // Check if results exist
          await this.checkForResults(benchmark.id);
        }
      }
    } catch (error) {
      logger.error("Error checking benchmarks:", error);
    }
  }

  private async findRunningProcesses(): Promise<RunningProcess[]> {
    try {
      const { stdout } = await execAsync(
        'ps aux | grep "run_benchmark.py" | grep "results_web_" | grep -v grep'
      );

      const processes: RunningProcess[] = [];
      const lines = stdout.trim().split("\n").filter((line) => line.length > 0);

      for (const line of lines) {
        const match = line.match(/results_web_(\d+)/);
        if (match) {
          const benchmarkId = parseInt(match[1]);
          const pidMatch = line.match(/^\S+\s+(\d+)/);
          const pid = pidMatch ? parseInt(pidMatch[1]) : 0;

          if (pid > 0) {
            processes.push({
              pid,
              benchmarkId,
              outputDir: `/home/ubuntu/superai_benchmark/results_web_${benchmarkId}`,
            });
          }
        }
      }

      return processes;
    } catch (error: any) {
      // ps grep returns exit code 1 if no matches found
      if (error.code === 1) {
        return [];
      }
      throw error;
    }
  }

  private async checkProcess(proc: RunningProcess) {
    try {
      logger.debug(`Checking process ${proc.pid} for benchmark #${proc.benchmarkId}`);

      // Check if output directory exists and has results
      try {
        const files = await fs.readdir(proc.outputDir);
        const jsonFile = files.find((f) => f.endsWith(".json"));

        if (jsonFile) {
          logger.info(`Found results file for benchmark #${proc.benchmarkId}, parsing...`);
          await this.parseAndSaveResults(proc.benchmarkId, path.join(proc.outputDir, jsonFile));
        } else {
          // Still running, update progress
          logger.debug(`Benchmark #${proc.benchmarkId} still in progress`);
          await updateBenchmarkResult(proc.benchmarkId, {
            status: "running",
            currentTask: "Processing benchmarks...",
          });
        }
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          logger.error(`Error checking output directory for benchmark #${proc.benchmarkId}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Error checking process ${proc.pid}:`, error);
    }
  }

  private async checkForResults(benchmarkId: number) {
    const outputDir = `/home/ubuntu/superai_benchmark/results_web_${benchmarkId}`;

    try {
      const files = await fs.readdir(outputDir);
      const jsonFile = files.find((f) => f.endsWith(".json"));

      if (jsonFile) {
        logger.info(`Found orphaned results for benchmark #${benchmarkId}, parsing...`);
        await this.parseAndSaveResults(benchmarkId, path.join(outputDir, jsonFile));
      } else {
        logger.warn(`No results found for benchmark #${benchmarkId}, marking as error`);
        await updateBenchmarkResult(benchmarkId, {
          status: "error",
          errorMessage: "Benchmark process terminated without producing results",
        });
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.warn(`Output directory not found for benchmark #${benchmarkId}, marking as error`);
        await updateBenchmarkResult(benchmarkId, {
          status: "error",
          errorMessage: "Benchmark process terminated without creating output directory",
        });
      } else {
        logger.error(`Error checking for results for benchmark #${benchmarkId}:`, error);
      }
    }
  }

  private async parseAndSaveResults(benchmarkId: number, resultsPath: string) {
    try {
      const resultsData = await fs.readFile(resultsPath, "utf-8");
      const results = JSON.parse(resultsData);

      const arcEasy = results.results?.arc_easy?.acc_norm || 0;
      const hellaswag = results.results?.hellaswag?.acc_norm || 0;
      const truthfulqa = results.results?.truthfulqa_mc2?.acc || 0;
      const average = (arcEasy + hellaswag + truthfulqa) / 3;

      const finalResults = {
        arc_easy: arcEasy * 100,
        hellaswag: hellaswag * 100,
        truthfulqa: truthfulqa * 100,
        average: average * 100,
      };

      logger.info(`Saving results for benchmark #${benchmarkId}:`, finalResults);

      await updateBenchmarkResult(benchmarkId, {
        status: "completed",
        progress: 100,
        arcEasy: finalResults.arc_easy,
        hellaswag: finalResults.hellaswag,
        truthfulqa: finalResults.truthfulqa,
        average: finalResults.average,
        completedAt: new Date(),
      });

      logger.info(`Successfully saved results for benchmark #${benchmarkId}`);
    } catch (error) {
      logger.error(`Error parsing results for benchmark #${benchmarkId}:`, error);
      await updateBenchmarkResult(benchmarkId, {
        status: "error",
        errorMessage: `Failed to parse results: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }
}

// Singleton instance
export const benchmarkMonitor = new BenchmarkMonitor();
