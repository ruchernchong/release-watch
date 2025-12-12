import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { type AIAnalysisResult, analyzeRelease } from "../services/ai.service";
import { getCachedAnalysis, setCachedAnalysis } from "../services/kv.service";
import type { Env } from "../types/env";

export type AIAnalysisParams = {
  repoFullName: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
};

export type AIAnalysisOutput = {
  analysis: AIAnalysisResult | null;
  cached: boolean;
};

const KV_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "1 second",
    backoff: "constant" as const,
  },
  timeout: "10 seconds",
};

const AI_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "2 seconds",
    backoff: "exponential" as const,
  },
  timeout: "30 seconds",
};

export class AIAnalysisWorkflow extends WorkflowEntrypoint<
  Env,
  AIAnalysisParams
> {
  async run(
    event: WorkflowEvent<AIAnalysisParams>,
    step: WorkflowStep,
  ): Promise<AIAnalysisOutput> {
    const { repoFullName, tagName, releaseName, body } = event.payload;

    console.log(`[AIWorkflow] Analyzing ${repoFullName}@${tagName}`);

    // Check cache first
    let cachedAnalysis: AIAnalysisResult | null = null;
    try {
      cachedAnalysis = await step.do(
        `cache-get:${repoFullName}:${tagName}`,
        KV_RETRY_CONFIG,
        async () => {
          return getCachedAnalysis(
            this.env.SUBSCRIPTIONS,
            repoFullName,
            tagName,
          );
        },
      );
    } catch (error) {
      console.error(
        `[AIWorkflow] Cache lookup failed for ${repoFullName}:`,
        error,
      );
    }

    if (cachedAnalysis) {
      console.log(`[AIWorkflow] Cache hit for ${repoFullName}@${tagName}`);
      return { analysis: cachedAnalysis, cached: true };
    }

    // Run AI analysis
    let analysis: AIAnalysisResult | null = null;
    try {
      analysis = await step.do(
        `analyze:${repoFullName}:${tagName}`,
        AI_RETRY_CONFIG,
        async () => {
          return analyzeRelease(
            this.env.AI,
            repoFullName,
            tagName,
            releaseName,
            body,
          );
        },
      );
    } catch (error) {
      console.error(
        `[AIWorkflow] AI analysis failed for ${repoFullName}:`,
        error,
      );
      return { analysis: null, cached: false };
    }

    // Cache the result if analysis succeeded
    if (analysis) {
      const resultToCache = analysis;
      try {
        await step.do(
          `cache-set:${repoFullName}:${tagName}`,
          KV_RETRY_CONFIG,
          async () => {
            await setCachedAnalysis(
              this.env.SUBSCRIPTIONS,
              repoFullName,
              tagName,
              resultToCache,
            );
          },
        );
        console.log(
          `[AIWorkflow] Cached analysis for ${repoFullName}@${tagName}`,
        );
      } catch (error) {
        console.error(
          `[AIWorkflow] Failed to cache analysis for ${repoFullName}:`,
          error,
        );
        // Continue - caching failure is non-critical
      }
    }

    return { analysis, cached: false };
  }
}
