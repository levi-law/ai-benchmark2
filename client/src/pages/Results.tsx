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
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Results() {
  const { data: results = [], isLoading } = trpc.benchmark.list.useQuery();

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
          <Button onClick={exportResults} className="gap-2" disabled={results.length === 0 || isLoading}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading results...</span>
              </div>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">ARC-Easy</TableHead>
                    <TableHead className="text-right">HellaSwag</TableHead>
                    <TableHead className="text-right">TruthfulQA</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.versionName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(result.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            result.status === "completed"
                              ? "bg-green-500/10 text-green-500"
                              : result.status === "running"
                              ? "bg-blue-500/10 text-blue-500"
                              : result.status === "error"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {result.status}
                          {result.status === "running" && ` (${result.progress}%)`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.arcEasy ? `${result.arcEasy.toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.hellaswag ? `${result.hellaswag.toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.truthfulqa ? `${result.truthfulqa.toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {result.average ? `${result.average.toFixed(2)}%` : "-"}
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
