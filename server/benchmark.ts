import { spawn } from "child_process";
import path from "path";
import { updateBenchmarkResult } from "./db";

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

    // Use minimal clean environment to avoid Python path conflicts with UV
    const cleanEnv: Record<string, string> = {
      PATH: "/usr/bin:/bin:/usr/local/bin",
      HOME: process.env.HOME || "/home/ubuntu",
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
    };
    
    const pythonProcess = spawn("/usr/bin/python3.11", args, {
      cwd: benchmarkDir,
      env: cleanEnv,
    });

    let stdout = "";
    let stderr = "";
    let currentProgress = 0;

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
      const lines = stdout.split("\n");

      // Parse progress from output
      for (const line of lines) {
        if (line.includes("100%")) {
          // Task completed
          if (line.includes("arc_easy")) {
            currentProgress = 33;
            onProgress({
              progress: currentProgress,
              currentTask: "Running HellaSwag...",
              status: "running",
            });
          } else if (line.includes("hellaswag")) {
            currentProgress = 66;
            onProgress({
              progress: currentProgress,
              currentTask: "Running TruthfulQA...",
              status: "running",
            });
          } else if (line.includes("truthfulqa")) {
            currentProgress = 90;
            onProgress({
              progress: currentProgress,
              currentTask: "Finalizing results...",
              status: "running",
            });
          }
        }
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error("[Benchmark stderr]", data.toString());
    });

    pythonProcess.on("close", async (code) => {
      if (code === 0) {
        try {
          // Parse results from output file
          const fs = await import("fs/promises");
          const resultFiles = await fs.readdir(outputDir);
          const jsonFile = resultFiles.find((f) => f.endsWith(".json"));

          if (!jsonFile) {
            throw new Error("No results file found");
          }

          const resultsPath = path.join(outputDir, jsonFile);
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

          onProgress({
            progress: 100,
            status: "completed",
            results: finalResults,
          });

          resolve();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Failed to parse results";
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
        const errorMsg = `Benchmark process exited with code ${code}: ${stderr}`;
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
    });

    pythonProcess.on("error", async (error) => {
      const errorMsg = `Failed to start benchmark: ${error.message}`;
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
