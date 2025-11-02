import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BenchmarkProgress {
  status: "idle" | "running" | "completed" | "error";
  progress: number;
  currentTask?: string;
  results?: {
    arc_easy: number;
    hellaswag: number;
    truthfulqa: number;
    average: number;
  };
}

export default function RunBenchmark() {
  const [apiUrl, setApiUrl] = useState("https://superai-llm-engine-ccgxnii32a-uc.a.run.app");
  const [versionName, setVersionName] = useState("");
  const [sampleLimit, setSampleLimit] = useState("50");
  const [benchmarkProgress, setBenchmarkProgress] = useState<BenchmarkProgress>({
    status: "idle",
    progress: 0,
  });

  const runBenchmark = async () => {
    if (!versionName.trim()) {
      toast.error("Please enter a version name");
      return;
    }

    setBenchmarkProgress({ status: "running", progress: 0, currentTask: "Checking API health..." });

    try {
      // Check API health
      const healthRes = await fetch(`${apiUrl}/health`);
      if (!healthRes.ok) throw new Error("API is not healthy");

      setBenchmarkProgress({ status: "running", progress: 10, currentTask: "Running ARC-Easy..." });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate benchmark run (in real implementation, this would call the actual benchmark)
      const tasks = [
        { name: "ARC-Easy", progress: 40 },
        { name: "HellaSwag", progress: 70 },
        { name: "TruthfulQA", progress: 100 },
      ];

      for (const task of tasks) {
        setBenchmarkProgress({
          status: "running",
          progress: task.progress,
          currentTask: `Running ${task.name}...`,
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Simulate results (in real implementation, parse actual results)
      const results = {
        arc_easy: 48.0,
        hellaswag: 24.0,
        truthfulqa: 48.93,
        average: 40.31,
      };

      // Save results to localStorage
      const benchmarkResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        version: versionName,
        ...results,
      };

      const stored = localStorage.getItem("benchmark_results");
      const existingResults = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        "benchmark_results",
        JSON.stringify([benchmarkResult, ...existingResults])
      );

      setBenchmarkProgress({
        status: "completed",
        progress: 100,
        results,
      });

      toast.success("Benchmark completed successfully!");
    } catch (error) {
      setBenchmarkProgress({
        status: "error",
        progress: 0,
      });
      toast.error("Benchmark failed: " + (error as Error).message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Run Benchmark</h2>
          <p className="text-muted-foreground">
            Execute HF Open LLM Leaderboard benchmarks on your SuperAI backend
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Set up your benchmark parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version Name</Label>
                <Input
                  id="version"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g., V5 (4 models + strong judge)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="samples">Sample Limit</Label>
                <Input
                  id="samples"
                  type="number"
                  value={sampleLimit}
                  onChange={(e) => setSampleLimit(e.target.value)}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                  Number of samples per task (50 recommended)
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={runBenchmark}
                disabled={benchmarkProgress.status === "running"}
              >
                {benchmarkProgress.status === "running" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Benchmark
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                {benchmarkProgress.status === "idle" && "Ready to start"}
                {benchmarkProgress.status === "running" && benchmarkProgress.currentTask}
                {benchmarkProgress.status === "completed" && "Benchmark completed!"}
                {benchmarkProgress.status === "error" && "Benchmark failed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {benchmarkProgress.status !== "idle" && (
                <>
                  <Progress value={benchmarkProgress.progress} />
                  <p className="text-sm text-muted-foreground">
                    {benchmarkProgress.progress}% complete
                  </p>
                </>
              )}

              {benchmarkProgress.status === "completed" && benchmarkProgress.results && (
                <div className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Results</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>ARC-Easy:</span>
                      <span className="font-mono font-bold">
                        {benchmarkProgress.results.arc_easy.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>HellaSwag:</span>
                      <span className="font-mono font-bold">
                        {benchmarkProgress.results.hellaswag.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>TruthfulQA:</span>
                      <span className="font-mono font-bold">
                        {benchmarkProgress.results.truthfulqa.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-green-500/20 pt-2">
                      <span className="font-semibold">Average:</span>
                      <span className="font-mono text-lg font-bold">
                        {benchmarkProgress.results.average.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {benchmarkProgress.status === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>An error occurred during benchmarking</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Tasks:</strong> ARC-Easy, HellaSwag, TruthfulQA MC2
            </p>
            <p>
              <strong>Few-shot:</strong> 5 examples per task
            </p>
            <p>
              <strong>Estimated time:</strong> ~20-30 minutes for 50 samples (depending on model count)
            </p>
            <p>
              <strong>Note:</strong> This is a simulated benchmark for demo purposes. In production, this would call the actual lm-evaluation-harness.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
