import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { Activity, BarChart3, GitCompare, Play, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

interface BenchmarkResult {
  id: string;
  timestamp: string;
  version: string;
  average: number;
  arc_easy: number;
  hellaswag: number;
  truthfulqa: number;
}

export default function Home() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [apiHealth, setApiHealth] = useState<string>("checking");

  useEffect(() => {
    // Load results from localStorage
    const stored = localStorage.getItem("benchmark_results");
    if (stored) {
      setResults(JSON.parse(stored));
    }

    // Check API health
    fetch("https://superai-llm-engine-ccgxnii32a-uc.a.run.app/health")
      .then(res => res.json())
      .then(() => setApiHealth("healthy"))
      .catch(() => setApiHealth("offline"));
  }, []);

  const latestResult = results[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and analyze SuperAI backend performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {apiHealth === "healthy" ? (
                  <span className="text-green-500">Healthy</span>
                ) : apiHealth === "offline" ? (
                  <span className="text-red-500">Offline</span>
                ) : (
                  <span className="text-yellow-500">Checking...</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                SuperAI LLM Engine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestResult ? `${latestResult.average.toFixed(2)}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestResult ? latestResult.version : "No results yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.length}</div>
              <p className="text-xs text-muted-foreground">
                Benchmark executions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.length > 0
                  ? `${Math.max(...results.map(r => r.average)).toFixed(2)}%`
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                All-time high
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with benchmarking your SuperAI backend
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href="/run">
              <Button className="gap-2">
                <Play className="h-4 w-4" />
                Run New Benchmark
              </Button>
            </Link>
            <Link href="/results">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Results
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="outline" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Versions
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>
                Latest benchmark executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{result.version}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {result.average.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ARC: {result.arc_easy.toFixed(0)}% | HS:{" "}
                        {result.hellaswag.toFixed(0)}% | TQ:{" "}
                        {result.truthfulqa.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
