// @ts-nocheck
// =============================================
// StochFin AI Agent System - Base Agent Class
// Abstract base class for all 20 agents
// =============================================

import {
    Agent,
    AgentId,
    AgentCategory,
    AgentConfig,
    AgentContext,
    AgentResult,
    AgentStatus,
    TriggerType
} from './types';

export abstract class BaseAgent<TInput = unknown, TOutput = unknown>
    implements Agent<TInput, TOutput> {

    // =============================================
    // Abstract properties (must be implemented)
    // =============================================

    abstract readonly id: AgentId;
    abstract readonly name: string;
    abstract readonly category: AgentCategory;
    abstract readonly description: string;
    abstract readonly triggers: TriggerType[];

    // =============================================
    // Configuration
    // =============================================

    config: AgentConfig = {
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
        gemini_model: 'gemini-2.0-flash'
    };

    protected context: AgentContext | null = null;

    // =============================================
    // Lifecycle Methods
    // =============================================

    async initialize(context: AgentContext): Promise<void> {
        this.context = context;
        context.log(`[${this.id}] Initializing...`, 'info');
    }

    async cleanup(): Promise<void> {
        this.context?.log(`[${this.id}] Cleaning up...`, 'info');
        this.context = null;
    }

    async healthCheck(): Promise<boolean> {
        return this.config.enabled;
    }

    // =============================================
    // Execution Wrapper
    // =============================================

    async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
        const startTime = Date.now();

        if (!this.config.enabled) {
            return this.createResult('failed', undefined, 'Agent is disabled', startTime);
        }

        await this.initialize(context);

        try {
            context.log(`[${this.id}] Executing with input: ${JSON.stringify(input).slice(0, 200)}...`, 'info');

            // Execute with timeout
            const result = await this.withTimeout(
                this.run(input, context),
                this.config.timeout_ms
            );

            context.log(`[${this.id}] Completed successfully`, 'info');
            return this.createResult('success', result, undefined, startTime);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            context.log(`[${this.id}] Failed: ${errorMessage}`, 'error');
            return this.createResult('failed', undefined, errorMessage, startTime);

        } finally {
            await this.cleanup();
        }
    }

    // =============================================
    // Abstract Run Method (implement in subclass)
    // =============================================

    protected abstract run(input: TInput, context: AgentContext): Promise<TOutput>;

    // =============================================
    // Helper Methods
    // =============================================

    protected createResult(
        status: AgentStatus,
        data: TOutput | undefined,
        error: string | undefined,
        startTime: number,
        geminiTokens?: number
    ): AgentResult<TOutput> {
        return {
            agentId: this.id,
            status,
            data,
            error,
            executionTimeMs: Date.now() - startTime,
            geminiTokensUsed: geminiTokens,
            timestamp: new Date()
        };
    }

    protected async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
        });
        return Promise.race([promise, timeout]);
    }

    protected async callGemini(
        prompt: string,
        context: AgentContext
    ): Promise<{ text: string; tokens: number }> {
        if (!context.gemini) {
            throw new Error('Gemini client not configured');
        }

        const model = context.gemini.models.generateContent({
            model: this.config.gemini_model || 'gemini-2.0-flash',
            contents: prompt
        });

        const response = await model;
        const text = response.text || '';
        const tokens = response.usageMetadata?.totalTokenCount || 0;

        return { text, tokens };
    }

    protected async retry<T>(
        fn: () => Promise<T>,
        retries: number = this.config.max_retries
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.context?.log(`[${this.id}] Retry ${i + 1}/${retries} failed: ${lastError.message}`, 'warn');
                await this.sleep(1000 * Math.pow(2, i)); // Exponential backoff
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    protected sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================================
    // Statistics Helpers
    // =============================================

    protected mean(data: number[]): number {
        if (data.length === 0) return 0;
        return data.reduce((a, b) => a + b, 0) / data.length;
    }

    protected std(data: number[]): number {
        if (data.length < 2) return 0;
        const m = this.mean(data);
        return Math.sqrt(data.reduce((acc, val) => acc + (val - m) ** 2, 0) / (data.length - 1));
    }

    protected percentile(data: number[], p: number): number {
        if (data.length === 0) return 0;
        const sorted = [...data].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) return sorted[lower];
        return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
    }

    protected zScore(value: number, mean: number, std: number): number {
        if (std === 0) return 0;
        return (value - mean) / std;
    }
}
