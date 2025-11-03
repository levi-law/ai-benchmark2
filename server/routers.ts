import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createBenchmarkResult, getAllBenchmarkResults, getBenchmarkResult, updateBenchmarkResult } from "./db";
import { benchmarkQueue } from "./benchmark-queue";
import { EventEmitter } from "events";

const benchmarkEmitter = new EventEmitter();

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  benchmark: router({
    // Create a new benchmark run
    create: publicProcedure
      .input(
        z.object({
          versionName: z.string(),
          apiUrl: z.string().url(),
          sampleLimit: z.number().min(5).max(100),
        })
      )
      .mutation(async ({ input }) => {
        const result = await createBenchmarkResult({
          versionName: input.versionName,
          apiUrl: input.apiUrl,
          sampleLimit: input.sampleLimit,
          status: "pending",
          progress: 0,
        });

        // Add benchmark to queue (runs one at a time to prevent OOM)
        setImmediate(async () => {
          try {
            await benchmarkQueue.enqueue(
              result.id,
              {
                apiUrl: input.apiUrl,
                tasks: ["arc_easy", "hellaswag", "truthfulqa_mc2"],
                numFewshot: 0,
                limit: input.sampleLimit,
              },
              (progress) => {
                benchmarkEmitter.emit(`progress-${result.id}`, progress);
              }
            );
          } catch (error) {
            console.error("Benchmark error:", error);
          }
        });

        return result;
      }),

    // Get all benchmark results
    list: publicProcedure.query(async () => {
      return getAllBenchmarkResults();
    }),

    // Get a specific benchmark result
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBenchmarkResult(input.id);
      }),

    // Subscribe to benchmark progress (for SSE)
    subscribeProgress: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBenchmarkResult(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
