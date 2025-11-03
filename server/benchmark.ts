import { spawn } from "child_process";
import path from "path";
import { updateBenchmarkResult } from "./db";
import { logStreamManager, createLogEntry } from "./log-stream";

export interface BenchmarkConfig {
  apiUrl: string;
  tasks: string[];
  numFewshot: number;
  limit: number;
}

export interface BenchmarkProgress {
  progress: number;
  currentTask?: string;
  status: "running" | "completed" | "error";
  results?: {
    arc_easy: number;
    hellaswag: number;
    truthfulqa: number;
    average: number;
  };
  errorMessage?: string;
}

export type ProgressCallback = (progress: BenchmarkProgress) => void;

const logger = {
  info: (benchmarkId: number, msg: string, ...args: any[]) => {
    const message = `${msg} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.log(`[Benchmark #${benchmarkId}] INFO:`, msg, ...args);
    logStreamManager.addLog(createLogEntry(benchmarkId, "info", message));
  },
  error: (benchmarkId: number, msg: string, ...args: any[]) => {
    const message = `${msg} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.error(`[Benchmark #${benchmarkId}] ERROR:`, msg, ...args);
    logStreamManager.addLog(createLogEntry(benchmarkId, "error", message));
  },
  debug: (benchmarkId: number, msg: string, ...args: any[]) => {
    const message = `${msg} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.log(`[Benchmark #${benchmarkId}] DEBUG:`, msg, ...args);
    logStreamManager.addLog(createLogEntry(benchmarkId, "debug", message));
  },
  warn: (benchmarkId: number, msg: string, ...args: any[]) => {
    const message = `${msg} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.warn(`[Benchmark #${benchmarkId}] WARN:`, msg, ...args);
    logStreamManager.addLog(createLogEntry(benchmarkId, "info", message));
  },
};

/**
 * Run benchmark using the Python scripts from /home/ubuntu/superai_benchmark
 */
export async function runBenchmark(
  benchmarkId: number,
  config: BenchmarkConfig,
  onProgress: ProgressCallback
): Promise<void> {
  const benchmarkDir = "/home/ubuntu/superai_benchmark";
  const outputDir = path.join(benchmarkDir, `results_web_${benchmarkId}`);

  logger.info(benchmarkId, "Starting benchmark with config:", config);
  logger.info(benchmarkId, "Output directory:", outputDir);

  return new Promise((resolve, reject) => {
    const args = [
      "run_benchmark.py",
      "--tasks",
      config.tasks.join(","),
      "--num_fewshot",
      config.numFewshot.toString(),
      "--limit",
      config.limit.toString(),
      "--output_dir",
      outputDir,
    ];

    logger.debug(benchmarkId, "Python command: python3.11", args.join(" "));

    // Use minimal clean environment to avoid Python path conflicts with UV
    const cleanEnv: Record<string, string> = {
      PATH: "/usr/bin:/bin:/usr/local/bin",
      HOME: "/root",  // Node.js server runs as root
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
    };

    logger.debug(benchmarkId, "Environment:", cleanEnv);
    
    const pythonProcess = spawn("python3.11", ["-u", ...args], {
      cwd: benchmarkDir,
      env: cleanEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    logger.info(benchmarkId, "Python process started with PID:", pythonProcess.pid);

    let stdout = "";
    let stderr = "";
    let currentProgress = 0;
    let lastProgressUpdate = Date.now();

    pythonProcess.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Stream stdout to log viewer
      logStreamManager.addLog(createLogEntry(benchmarkId, "stdout", chunk.trim()));

      const lines = chunk.split("\n");

      // Parse progress from output
      for (const line of lines) {
        if (line.includes("100%")) {
          // Task completed
          if (line.includes("arc_easy")) {
            currentProgress = 33;
            logger.info(benchmarkId, "ARC-Easy completed, progress: 33%");
            updateProgress(benchmarkId, 33, "Running HellaSwag...", onProgress);
          } else if (line.includes("hellaswag")) {
            currentProgress = 66;
            logger.info(benchmarkId, "HellaSwag completed, progress: 66%");
            updateProgress(benchmarkId, 66, "Running TruthfulQA...", onProgress);
          } else if (line.includes("truthfulqa")) {
            currentProgress = 90;
            logger.info(benchmarkId, "TruthfulQA completed, progress: 90%");
            updateProgress(benchmarkId, 90, "Finalizing results...", onProgress);
          }
        }

        // Track any progress indicators
        if (line.match(/\d+%/)) {
          const now = Date.now();
          if (now - lastProgressUpdate > 5000) {
            logger.debug(benchmarkId, "Progress indicator:", line.trim());
            lastProgressUpdate = now;
          }
        }
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      
      // Stream stderr to log viewer
      logStreamManager.addLog(createLogEntry(benchmarkId, "stderr", chunk.trim()));
    });

    pythonProcess.on("close", async (code) => {
      logger.info(benchmarkId, `Python process exited with code: ${code}`);
      logger.debug(benchmarkId, "Final STDOUT length:", stdout.length);
      logger.debug(benchmarkId, "Final STDERR length:", stderr.length);

      if (code === 0) {
        try {
          logger.info(benchmarkId, "Parsing results from:", outputDir);

          // Parse results from output file
          const fs = await import("fs/promises");
          const resultFiles = await fs.readdir(outputDir);
          logger.debug(benchmarkId, "Files in output directory:", resultFiles);

          const jsonFile = resultFiles.find((f) => f.endsWith(".json"));

          if (!jsonFile) {
            throw new Error(`No results file found in ${outputDir}. Files: ${resultFiles.join(", ")}`);
          }

          const resultsPath = path.join(outputDir, jsonFile);
          logger.info(benchmarkId, "Reading results from:", resultsPath);

          const resultsData = await fs.readFile(resultsPath, "utf-8");
          const results = JSON.parse(resultsData);

          logger.debug(benchmarkId, "Raw results structure:", Object.keys(results));
          logger.debug(benchmarkId, "Results.results:", results.results ? Object.keys(results.results) : "N/A");

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

          logger.info(benchmarkId, "Final results:", finalResults);

          // Update database
          await updateBenchmarkResult(benchmarkId, {
            status: "completed",
            progress: 100,
            arcEasy: finalResults.arc_easy,
            hellaswag: finalResults.hellaswag,
            truthfulqa: finalResults.truthfulqa,
            average: finalResults.average,
            completedAt: new Date(),
          });

          logger.info(benchmarkId, "Database updated successfully");

          onProgress({
            progress: 100,
            status: "completed",
            results: finalResults,
          });

          resolve();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Failed to parse results";
          logger.error(benchmarkId, "Error parsing results:", errorMsg);
          logger.error(benchmarkId, "Error stack:", error instanceof Error ? error.stack : "N/A");

          await updateBenchmarkResult(benchmarkId, {
            status: "error",
            errorMessage: errorMsg,
          });
          onProgress({
            progress: 0,
            status: "error",
            errorMessage: errorMsg,
          });
          reject(new Error(errorMsg));
        }
      } else {
        const errorMsg = `Benchmark process exited with code ${code}`;
        logger.error(benchmarkId, errorMsg);
        logger.error(benchmarkId, "STDERR output:", stderr);

        await updateBenchmarkResult(benchmarkId, {
          status: "error",
          errorMessage: `${errorMsg}: ${stderr.slice(0, 500)}`,
        });
        onProgress({
          progress: 0,
          status: "error",
          errorMessage: errorMsg,
        });
        reject(new Error(errorMsg));
      }
    });

    pythonProcess.on("error", async (error) => {
      const errorMsg = `Failed to start benchmark: ${error.message}`;
      logger.error(benchmarkId, errorMsg, error);

      await updateBenchmarkResult(benchmarkId, {
        status: "error",
        errorMessage: errorMsg,
      });
      onProgress({
        progress: 0,
        status: "error",
        errorMessage: errorMsg,
      });
      reject(new Error(errorMsg));
    });
  });
}

async function updateProgress(
  benchmarkId: number,
  progress: number,
  currentTask: string,
  onProgress: ProgressCallback
) {
  try {
    await updateBenchmarkResult(benchmarkId, {
      progress,
      currentTask,
    });
    onProgress({
      progress,
      currentTask,
      status: "running",
    });
  } catch (error) {
    logger.error(benchmarkId, "Failed to update progress:", error);
  }
}
