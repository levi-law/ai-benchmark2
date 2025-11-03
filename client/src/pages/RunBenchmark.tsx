import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LogViewer } from "@/components/LogViewer";

export default function RunBenchmark() {
  const [apiUrl, setApiUrl] = useState("https://superai-llm-engine-ccgxnii32a-uc.a.run.app");
  const [versionName, setVersionName] = useState("");
  const [sampleLimit, setSampleLimit] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkId, setBenchmarkId] = useState<number | null>(null);

  const createBenchmark = trpc.benchmark.create.useMutation();
  const { data: benchmarkData } = trpc.benchmark.get.useQuery(
    { id: benchmarkId! },
    { enabled: benchmarkId !== null, refetchInterval: isRunning ? 2000 : false }
  );

  useEffect(() => {
    if (benchmarkData) {
      if (benchmarkData.status === "completed") {
        setIsRunning(false);
        toast.success("Benchmark completed successfully!");
      } else if (benchmarkData.status === "error") {
        setIsRunning(false);
        toast.error("Benchmark failed: " + benchmarkData.errorMessage);
      }
    }
  }, [benchmarkData]);

  const runBenchmark = async () => {
    if (!versionName.trim()) {
      toast.error("Please enter a version name");
      return;
    }

    // Reset state for new benchmark
    setBenchmarkId(null);
    setIsRunning(true);

    try {
      const result = await createBenchmark.mutateAsync({
        versionName,
        apiUrl,
        sampleLimit,
      });

      setBenchmarkId(result.id);
      toast.success("Benchmark started!");
    } catch (err) {
      toast.error("Failed to start benchmark: " + (err as Error).message);
      setIsRunning(false);
    }
  };

  const progress = benchmarkData?.progress || 0;
  const currentTask = benchmarkData?.currentTask || "";
  const status = benchmarkData?.status || "idle";

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
                  disabled={isRunning}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version Name</Label>
                <Input
                  id="version"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g., V5 (4 models + strong judge)"
                  disabled={isRunning}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="samples">Sample Limit</Label>
                <Input
                  id="samples"
                  type="number"
                  value={sampleLimit}
                  onChange={(e) => setSampleLimit(parseInt(e.target.value) || 50)}
                  placeholder="50"
                  min={5}
                  max={100}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground">
                  Number of samples per task (5-100, 50 recommended)
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={runBenchmark}
                disabled={isRunning}
              >
                {isRunning ? (
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
                {status === "idle" && "Ready to start"}
                {status === "pending" && "Initializing..."}
                {status === "running" && currentTask}
                {status === "completed" && "Benchmark completed!"}
                {status === "error" && "Benchmark failed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status !== "idle" && (
                <>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    {progress}% complete
                  </p>
                </>
              )}

              {status === "completed" && benchmarkData && (
                <div className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Results</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>ARC-Easy:</span>
                      <span className="font-mono font-bold">
                        {benchmarkData.arcEasy?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>HellaSwag:</span>
                      <span className="font-mono font-bold">
                        {benchmarkData.hellaswag?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>TruthfulQA:</span>
                      <span className="font-mono font-bold">
                        {benchmarkData.truthfulqa?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-green-500/20 pt-2">
                      <span className="font-semibold">Average:</span>
                      <span className="font-mono text-lg font-bold">
                        {benchmarkData.average?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Error</span>
                  </div>
                  <p className="text-sm">{benchmarkData?.errorMessage}</p>
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
              <strong>Few-shot:</strong> 0 examples (zero-shot evaluation)
            </p>
            <p>
              <strong>Estimated time:</strong> ~20-40 minutes for 50 samples (depending on model count and API latency)
            </p>
            <p>
              <strong>Note:</strong> This uses the actual lm-evaluation-harness Python scripts from /home/ubuntu/superai_benchmark
            </p>
          </CardContent>
        </Card>

        {/* Log Viewer */}
        {benchmarkId && (
          <LogViewer benchmarkId={benchmarkId} />
        )}
      </div>
    </DashboardLayout>
  );
}
