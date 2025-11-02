import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
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

export default function Compare() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [baseline, setBaseline] = useState<string>("");
  const [comparison, setComparison] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("benchmark_results");
    if (stored) {
      const parsed = JSON.parse(stored);
      setResults(parsed);
      if (parsed.length >= 2) {
        setBaseline(parsed[1].id);
        setComparison(parsed[0].id);
      }
    }
  }, []);

  const baselineResult = results.find((r) => r.id === baseline);
  const comparisonResult = results.find((r) => r.id === comparison);

  const getDiff = (base: number, comp: number) => {
    const diff = comp - base;
    return {
      value: diff,
      percentage: base !== 0 ? (diff / base) * 100 : 0,
    };
  };

  const DiffIndicator = ({ diff }: { diff: number }) => {
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          No change
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="flex items-center gap-1 text-green-500">
          <ArrowUp className="h-4 w-4" />
          +{diff.toFixed(2)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-500">
        <ArrowDown className="h-4 w-4" />
        {diff.toFixed(2)}%
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compare Versions</h2>
          <p className="text-muted-foreground">
            Compare performance between different benchmark runs
          </p>
        </div>

        {results.length < 2 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Not enough results to compare</p>
              <p className="text-sm text-muted-foreground">
                Run at least 2 benchmarks to use comparison
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Versions</CardTitle>
                <CardDescription>
                  Choose two benchmark runs to compare
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Baseline</label>
                  <Select value={baseline} onValueChange={setBaseline}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select baseline" />
                    </SelectTrigger>
                    <SelectContent>
                      {results.map((result) => (
                        <SelectItem key={result.id} value={result.id}>
                          {result.version} ({result.average.toFixed(2)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comparison</label>
                  <Select value={comparison} onValueChange={setComparison}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select comparison" />
                    </SelectTrigger>
                    <SelectContent>
                      {results.map((result) => (
                        <SelectItem key={result.id} value={result.id}>
                          {result.version} ({result.average.toFixed(2)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Results */}
            {baselineResult && comparisonResult && (
              <>
                {/* Overall Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Baseline</p>
                        <p className="text-2xl font-bold">
                          {baselineResult.average.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {baselineResult.version}
                        </p>
                      </div>

                      <div className="flex items-center justify-center">
                        <DiffIndicator
                          diff={getDiff(baselineResult.average, comparisonResult.average).value}
                        />
                      </div>

                      <div className="space-y-2 text-right">
                        <p className="text-sm text-muted-foreground">Comparison</p>
                        <p className="text-2xl font-bold">
                          {comparisonResult.average.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comparisonResult.version}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Task-by-Task Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task-by-Task Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ARC-Easy */}
                    <div>
                      <h4 className="mb-3 font-semibold">ARC-Easy</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Baseline</p>
                          <p className="text-xl font-mono font-bold">
                            {baselineResult.arc_easy.toFixed(2)}%
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <DiffIndicator
                            diff={getDiff(baselineResult.arc_easy, comparisonResult.arc_easy).value}
                          />
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">Comparison</p>
                          <p className="text-xl font-mono font-bold">
                            {comparisonResult.arc_easy.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* HellaSwag */}
                    <div>
                      <h4 className="mb-3 font-semibold">HellaSwag</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Baseline</p>
                          <p className="text-xl font-mono font-bold">
                            {baselineResult.hellaswag.toFixed(2)}%
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <DiffIndicator
                            diff={getDiff(baselineResult.hellaswag, comparisonResult.hellaswag).value}
                          />
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">Comparison</p>
                          <p className="text-xl font-mono font-bold">
                            {comparisonResult.hellaswag.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TruthfulQA */}
                    <div>
                      <h4 className="mb-3 font-semibold">TruthfulQA MC2</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Baseline</p>
                          <p className="text-xl font-mono font-bold">
                            {baselineResult.truthfulqa.toFixed(2)}%
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <DiffIndicator
                            diff={getDiff(baselineResult.truthfulqa, comparisonResult.truthfulqa).value}
                          />
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">Comparison</p>
                          <p className="text-xl font-mono font-bold">
                            {comparisonResult.truthfulqa.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <strong>Baseline:</strong> {baselineResult.version} (
                      {new Date(baselineResult.timestamp).toLocaleDateString()})
                    </p>
                    <p>
                      <strong>Comparison:</strong> {comparisonResult.version} (
                      {new Date(comparisonResult.timestamp).toLocaleDateString()})
                    </p>
                    <p>
                      <strong>Overall Change:</strong>{" "}
                      {getDiff(baselineResult.average, comparisonResult.average).value > 0
                        ? "Improvement"
                        : getDiff(baselineResult.average, comparisonResult.average).value < 0
                        ? "Regression"
                        : "No change"}{" "}
                      of{" "}
                      {Math.abs(getDiff(baselineResult.average, comparisonResult.average).value).toFixed(
                        2
                      )}{" "}
                      percentage points
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
