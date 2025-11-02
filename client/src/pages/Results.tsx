import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardLayout from "@/components/DashboardLayout";
import { Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BenchmarkResult {
  id: string;
  timestamp: string;
  version: string;
  average: number;
  arc_easy: number;
  hellaswag: number;
  truthfulqa: number;
}

export default function Results() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = () => {
    const stored = localStorage.getItem("benchmark_results");
    if (stored) {
      setResults(JSON.parse(stored));
    }
  };

  const deleteResult = (id: string) => {
    const updated = results.filter((r) => r.id !== id);
    localStorage.setItem("benchmark_results", JSON.stringify(updated));
    setResults(updated);
    toast.success("Result deleted");
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `benchmark-results-${new Date().toISOString()}.json`;
    link.click();
    toast.success("Results exported");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Results</h2>
            <p className="text-muted-foreground">
              View and manage all benchmark results
            </p>
          </div>
          <Button onClick={exportResults} className="gap-2" disabled={results.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {results.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No results yet</p>
              <p className="text-sm text-muted-foreground">
                Run your first benchmark to see results here
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Results</CardTitle>
              <CardDescription>
                {results.length} benchmark{results.length !== 1 ? "s" : ""} executed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">ARC-Easy</TableHead>
                    <TableHead className="text-right">HellaSwag</TableHead>
                    <TableHead className="text-right">TruthfulQA</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.arc_easy.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.hellaswag.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.truthfulqa.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {result.average.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteResult(result.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Performance Context */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Top Models (GPT-4, Claude-3):</span>
              <span className="font-mono font-bold">80-90%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Strong Open Models (Llama-3, Mixtral):</span>
              <span className="font-mono font-bold">70-80%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mid-tier Models:</span>
              <span className="font-mono font-bold">60-70%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Baseline Models:</span>
              <span className="font-mono font-bold">50-60%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Random Guessing:</span>
              <span className="font-mono font-bold">~25%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
