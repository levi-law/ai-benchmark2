/**
 * Benchmark Queue Manager
 * Ensures only one benchmark runs at a time to prevent OOM kills
 */

import { runBenchmark, BenchmarkConfig, ProgressCallback } from "./benchmark";
import { updateBenchmarkResult } from "./db";

interface QueuedBenchmark {
  id: number;
  config: BenchmarkConfig;
  onProgress: ProgressCallback;
}

class BenchmarkQueue {
  private queue: QueuedBenchmark[] = [];
  private isProcessing = false;
  private currentBenchmarkId: number | null = null;

  /**
   * Add a benchmark to the queue
   */
  async enqueue(id: number, config: BenchmarkConfig, onProgress: ProgressCallback): Promise<void> {
    console.log(`[BenchmarkQueue] Enqueueing benchmark #${id}`);
    
    this.queue.push({ id, config, onProgress });
    
    // Update status to queued if not first in line
    if (this.queue.length > 1 || this.isProcessing) {
      await updateBenchmarkResult(id, {
        status: "pending",
        currentTask: `Queued (position ${this.queue.length})`,
      });
    }
    
    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Process the next benchmark in the queue
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;
    this.currentBenchmarkId = item.id;

    console.log(`[BenchmarkQueue] Starting benchmark #${item.id} (${this.queue.length} remaining in queue)`);

    try {
      // Update status to running
      await updateBenchmarkResult(item.id, {
        status: "running",
        currentTask: "Starting benchmark...",
      });

      // Run the benchmark
      await runBenchmark(item.id, item.config, item.onProgress);
      
      console.log(`[BenchmarkQueue] Completed benchmark #${item.id}`);
    } catch (error) {
      console.error(`[BenchmarkQueue] Error running benchmark #${item.id}:`, error);
    } finally {
      this.currentBenchmarkId = null;
      this.isProcessing = false;
      
      // Update queue positions for remaining benchmarks
      await this.updateQueuePositions();
      
      // Process next benchmark
      this.processNext();
    }
  }

  /**
   * Update queue positions for all pending benchmarks
   */
  private async updateQueuePositions(): Promise<void> {
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      await updateBenchmarkResult(item.id, {
        status: "pending",
        currentTask: `Queued (position ${i + 1})`,
      });
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      currentBenchmarkId: this.currentBenchmarkId,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Recover pending benchmarks from database on server restart
   */
  async recoverPendingBenchmarks(): Promise<void> {
    const { getAllBenchmarkResults } = await import("./db");
    const allBenchmarks = await getAllBenchmarkResults();
    const pendingBenchmarks = allBenchmarks.filter(b => b.status === "pending");
    
    if (pendingBenchmarks.length > 0) {
      console.log(`[BenchmarkQueue] Recovering ${pendingBenchmarks.length} pending benchmarks`);
      
      for (const benchmark of pendingBenchmarks) {
        // Re-enqueue with default config (will be overridden by actual config if available)
        await this.enqueue(
          benchmark.id,
          {
            apiUrl: benchmark.apiUrl || "https://superai-llm-engine-ccgxnii32a-uc.a.run.app",
            tasks: ["arc_easy", "hellaswag", "truthfulqa_mc2"],
            numFewshot: 0,
            limit: benchmark.sampleLimit || 5,
          },
          () => {} // No progress callback for recovered benchmarks
        );
      }
    }
  }
}

// Export singleton instance
export const benchmarkQueue = new BenchmarkQueue();
