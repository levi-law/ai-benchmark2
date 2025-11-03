import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Trash2, Download, Pause, Play, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LogEntry {
  benchmarkId: number;
  timestamp: string;
  level: "info" | "error" | "debug" | "stdout" | "stderr";
  message: string;
}

interface LogViewerProps {
  benchmarkId: number;
  className?: string;
}

export function LogViewer({ benchmarkId, className }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<Set<LogEntry["level"]>>(
    new Set<LogEntry["level"]>(["info", "error", "debug", "stdout", "stderr"])
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/logs/${benchmarkId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (isPaused) return;

      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("Connected to log stream");
        } else if (data.type === "history") {
          setLogs(data.logs);
        } else if (data.type === "log") {
          setLogs((prev) => [...prev, data.log]);
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [benchmarkId, isPaused]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const toggleLevel = (level: LogEntry["level"]) => {
    setSelectedLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const filteredLogs = logs.filter((log) => {
    // Filter by level
    if (!selectedLevels.has(log.level)) return false;
    
    // Filter by search query
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const downloadLogs = () => {
    const logText = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark-${benchmarkId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
      case "stderr":
        return "text-red-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-gray-400";
      case "stdout":
        return "text-green-400";
      default:
        return "text-gray-300";
    }
  };

  const getLevelBadge = (level: LogEntry["level"]) => {
    const variants: Record<LogEntry["level"], "default" | "destructive" | "secondary"> = {
      error: "destructive",
      stderr: "destructive",
      info: "default",
      debug: "secondary",
      stdout: "secondary",
    };

    return (
      <Badge variant={variants[level]} className="text-xs font-mono">
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <CardTitle>Real-time Logs</CardTitle>
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Disconnected</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle auto-scroll"
          >
            Auto-scroll: {autoScroll ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadLogs} title="Download logs">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs} title="Clear logs">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Level Filters */}
          <div className="flex gap-1">
            {(["stdout", "stderr", "info", "error", "debug"] as const).map((level) => (
              <Button
                key={level}
                variant={selectedLevels.has(level) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLevel(level)}
                className="text-xs"
              >
                {level.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Log Display */}
        <ScrollArea className="h-[400px] w-full rounded-md border bg-black/50 p-4">
          <div ref={scrollRef} className="space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No logs yet...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs match your filters (showing 0 of {logs.length})
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-gray-500 text-xs shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="shrink-0">{getLevelBadge(log.level)}</span>
                  <span className={`${getLevelColor(log.level)} break-all`}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
