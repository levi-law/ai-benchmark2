# SuperAI Benchmark Dashboard - TODO

## Core Features

- [x] Dashboard homepage with overview of all benchmark runs
- [x] Run new benchmark interface with configuration options
- [x] Real-time benchmark progress tracking
- [x] Results visualization (charts and tables)
- [x] Version comparison view
- [x] Historical results archive
- [x] Export results functionality

## UI Components

- [x] Benchmark configuration form
- [x] Progress indicator for running benchmarks
- [x] Results table with sorting and filtering
- [ ] Performance charts (line, bar, radar)
- [x] Version comparison cards
- [x] API endpoint configuration

## Backend Integration

- [x] Connect to SuperAI API for health checks
- [x] Run benchmarks via API calls
- [x] Store results in browser localStorage
- [x] Fetch and display historical results

## Polish

- [x] Responsive design for mobile/tablet
- [x] Loading states and error handling
- [x] Toast notifications for actions
- [x] Dark mode support


## Backend API Integration (New)

- [x] Upgrade to web-db-user template for backend support
- [x] Create tRPC endpoints for benchmark execution
- [x] Integrate Python benchmark scripts from /home/ubuntu/superai_benchmark
- [x] Add benchmark job queue and status tracking
- [x] Store benchmark results in database
- [x] Update frontend to call real API endpoints
- [ ] Test end-to-end benchmark execution

## Bug Fixes

- [x] Fix Python version mismatch in benchmark execution (use python3.11 instead of python3.13)

- [x] Fix Python environment PATH issue (Python 3.11 importing from Python 3.13 directories)

- [x] Add production-level logging for benchmark execution
- [x] Fix progress tracking and result display issues
- [x] Debug why benchmark runs but shows no progress
- [x] Fix Python buffering issue causing process to hang

## UI Enhancements

- [x] Add real-time log viewer component
- [x] Stream benchmark logs to frontend via SSE
- [x] Display Python stdout/stderr in log viewer
- [x] Auto-scroll logs as they come in
- [x] Add pause/resume, download, and clear functionality

## Critical Bugs

- [x] Fix Python spawn error (ENOENT) - fixed HOME environment variable
- [x] Add search and filter functionality to log viewer

## Critical Issues

- [x] Debug why benchmark process terminates without creating output directory - process is running correctly, previous error was from failed run
- [x] Check if Python dependencies are available in the server environment - all dependencies working

- [x] Fix UI showing "failed" when benchmark is still running - added 30-second grace period before error checking

- [x] Investigate why UI shows old "failed" benchmarks instead of current running benchmark - UI was not resetting benchmarkId
- [x] Add better UI refresh/polling to show current benchmark status - added state reset on new benchmark

- [ ] Investigate why benchmark fails after successfully loading datasets (100% progress bars shown)
- [ ] Check if there's an error in the actual evaluation phase

- [x] Fix spawn /usr/bin/python3.11 ENOENT error - Changed to use python3.11 without full path to rely on PATH env var

- [x] Investigate why Python process exits with code null after 6 minutes - OOM killer terminated the process
- [x] Check if process is being killed by OOM, timeout, or signal - confirmed OOM kill

- [x] Implement benchmark queue to limit concurrent benchmarks to 1 (prevent OOM kills)
- [ ] Add queue status display in UI showing pending benchmarks

- [x] Debug why new benchmark shows no activity in logs - old benchmarks were consuming resources
- [x] Check if queue system is working correctly - works for new benchmarks, killed old ones

- [x] Add "Quick Test" preset with 5 samples (completes in ~1 minute)
- [x] Add preset buttons to UI for Quick Test (5), Standard (50), Full (100)

- [x] Fix benchmarks stuck in "pending" status - added queue recovery on server restart
- [x] Debug why queue.enqueue() isn't starting benchmarks - queue lost state on restart, now recovers from DB
