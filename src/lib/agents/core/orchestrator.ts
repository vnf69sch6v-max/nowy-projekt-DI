// =============================================
// StochFin AI Agent System - Orchestrator
// Routes triggers to appropriate agents
// =============================================

import { GoogleGenAI } from '@google/genai';
import {
    Agent,
    AgentId,
    AgentContext,
    AgentResult,
    AgentTrigger,
    TriggerType,
    AgentExecutionLog
} from './types';

// =============================================
// Agent Registry
// =============================================

class AgentRegistry {
    private agents: Map<AgentId, Agent> = new Map();

    register(agent: Agent): void {
        this.agents.set(agent.id, agent);
        console.log(`[Registry] Registered agent: ${agent.id}`);
    }

    unregister(agentId: AgentId): void {
        this.agents.delete(agentId);
    }

    get(agentId: AgentId): Agent | undefined {
        return this.agents.get(agentId);
    }

    getAll(): Agent[] {
        return Array.from(this.agents.values());
    }

    getByCategory(category: string): Agent[] {
        return this.getAll().filter(a => a.category === category);
    }

    getByTrigger(triggerType: TriggerType): Agent[] {
        return this.getAll().filter(a =>
            a.triggers.includes(triggerType) && a.config.enabled
        );
    }
}

// =============================================
// Agent Orchestrator
// =============================================

export class AgentOrchestrator {
    private registry: AgentRegistry;
    private gemini: GoogleGenAI | null = null;
    private executionLogs: AgentExecutionLog[] = [];

    constructor() {
        this.registry = new AgentRegistry();
        this.initializeGemini();
    }

    // =============================================
    // Initialization
    // =============================================

    private initializeGemini(): void {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (apiKey) {
            this.gemini = new GoogleGenAI({ apiKey });
            console.log('[Orchestrator] Gemini initialized');
        } else {
            console.warn('[Orchestrator] Gemini API key not found');
        }
    }

    // =============================================
    // Agent Registration
    // =============================================

    registerAgent(agent: Agent): void {
        this.registry.register(agent);
    }

    registerAgents(agents: Agent[]): void {
        agents.forEach(a => this.registerAgent(a));
    }

    getRegisteredAgents(): Agent[] {
        return this.registry.getAll();
    }

    // =============================================
    // Trigger Handlers
    // =============================================

    async handleUserAction(
        action: string,
        payload?: Record<string, unknown>,
        userId?: string
    ): Promise<AgentResult[]> {
        const trigger: AgentTrigger = {
            type: 'user_action',
            source: action,
            timestamp: new Date(),
            payload
        };

        return this.executeAgentsForTrigger(trigger, userId);
    }

    async handleCronTrigger(cronId: string): Promise<AgentResult[]> {
        const trigger: AgentTrigger = {
            type: 'cron',
            source: cronId,
            timestamp: new Date()
        };

        return this.executeAgentsForTrigger(trigger);
    }

    async handleDataEvent(
        eventType: string,
        data: Record<string, unknown>
    ): Promise<AgentResult[]> {
        const trigger: AgentTrigger = {
            type: 'data_event',
            source: eventType,
            timestamp: new Date(),
            payload: data
        };

        return this.executeAgentsForTrigger(trigger);
    }

    async handleThresholdAlert(
        alertType: string,
        threshold: number,
        currentValue: number
    ): Promise<AgentResult[]> {
        const trigger: AgentTrigger = {
            type: 'threshold_alert',
            source: alertType,
            timestamp: new Date(),
            payload: { threshold, currentValue }
        };

        return this.executeAgentsForTrigger(trigger);
    }

    // =============================================
    // Execution
    // =============================================

    private async executeAgentsForTrigger(
        trigger: AgentTrigger,
        userId?: string
    ): Promise<AgentResult[]> {
        const agents = this.registry.getByTrigger(trigger.type);

        if (agents.length === 0) {
            console.log(`[Orchestrator] No agents registered for trigger: ${trigger.type}`);
            return [];
        }

        console.log(`[Orchestrator] Executing ${agents.length} agents for trigger: ${trigger.type}`);

        const context = this.createContext(trigger, userId);
        const results: AgentResult[] = [];

        // Execute agents sequentially for now (can be parallelized later)
        for (const agent of agents) {
            const result = await this.executeAgent(agent, trigger.payload || {}, context);
            results.push(result);

            // Share result with other agents
            context.sharedState.set(agent.id, result.data);
        }

        return results;
    }

    async executeAgent(
        agent: Agent,
        input: unknown,
        context?: AgentContext
    ): Promise<AgentResult> {
        const ctx = context || this.createContext({
            type: 'user_action',
            source: 'direct',
            timestamp: new Date()
        });

        const result = await agent.execute(input, ctx);

        // Log execution
        this.logExecution(result, ctx);

        return result;
    }

    async executeAgentById(
        agentId: AgentId,
        input: unknown,
        userId?: string
    ): Promise<AgentResult> {
        const agent = this.registry.get(agentId);

        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        const context = this.createContext({
            type: 'user_action',
            source: 'direct',
            timestamp: new Date(),
            payload: input as Record<string, unknown>
        }, userId);

        return this.executeAgent(agent, input, context);
    }

    // =============================================
    // Pipeline Execution
    // =============================================

    async executePipeline(
        agentIds: AgentId[],
        initialInput: unknown,
        userId?: string
    ): Promise<AgentResult[]> {
        const context = this.createContext({
            type: 'user_action',
            source: 'pipeline',
            timestamp: new Date()
        }, userId);

        const results: AgentResult[] = [];
        let currentInput = initialInput;

        for (const agentId of agentIds) {
            const agent = this.registry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            const result = await this.executeAgent(agent, currentInput, context);
            results.push(result);

            if (result.status === 'failed') {
                console.error(`[Orchestrator] Pipeline failed at agent: ${agentId}`);
                break;
            }

            // Pass output as input to next agent
            currentInput = result.data;
            context.sharedState.set(agentId, result.data);
        }

        return results;
    }

    async executeParallel(
        agentIds: AgentId[],
        input: unknown,
        userId?: string
    ): Promise<AgentResult[]> {
        const context = this.createContext({
            type: 'user_action',
            source: 'parallel',
            timestamp: new Date()
        }, userId);

        const promises = agentIds.map(async (agentId) => {
            const agent = this.registry.get(agentId);
            if (!agent) {
                return {
                    agentId,
                    status: 'failed' as const,
                    error: `Agent not found: ${agentId}`,
                    executionTimeMs: 0,
                    timestamp: new Date()
                };
            }
            return this.executeAgent(agent, input, context);
        });

        return Promise.all(promises);
    }

    // =============================================
    // Context Creation
    // =============================================

    private createContext(trigger: AgentTrigger, userId?: string): AgentContext {
        return {
            executionId: crypto.randomUUID(),
            userId,
            trigger,
            sharedState: new Map(),
            gemini: this.gemini || undefined,
            log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
                const timestamp = new Date().toISOString();
                const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
                switch (level) {
                    case 'error':
                        console.error(`${prefix} ${message}`);
                        break;
                    case 'warn':
                        console.warn(`${prefix} ${message}`);
                        break;
                    default:
                        console.log(`${prefix} ${message}`);
                }
            }
        };
    }

    // =============================================
    // Logging
    // =============================================

    private logExecution(result: AgentResult, context: AgentContext): void {
        const log: AgentExecutionLog = {
            id: crypto.randomUUID(),
            agent_id: result.agentId,
            trigger_type: context.trigger.type,
            trigger_source: context.trigger.source,
            input_data: context.trigger.payload || {},
            output_data: result.data as Record<string, unknown> || {},
            status: result.status,
            error_message: result.error,
            execution_time_ms: result.executionTimeMs,
            gemini_tokens_used: result.geminiTokensUsed,
            created_at: new Date()
        };

        this.executionLogs.push(log);

        // Keep only last 1000 logs in memory
        if (this.executionLogs.length > 1000) {
            this.executionLogs = this.executionLogs.slice(-1000);
        }
    }

    getExecutionLogs(): AgentExecutionLog[] {
        return [...this.executionLogs];
    }

    // =============================================
    // Status & Health
    // =============================================

    async healthCheck(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const agent of this.registry.getAll()) {
            try {
                results[agent.id] = await agent.healthCheck();
            } catch {
                results[agent.id] = false;
            }
        }

        return results;
    }

    getStatus(): {
        geminiAvailable: boolean;
        registeredAgents: number;
        enabledAgents: number;
        recentExecutions: number;
    } {
        const agents = this.registry.getAll();
        return {
            geminiAvailable: this.gemini !== null,
            registeredAgents: agents.length,
            enabledAgents: agents.filter(a => a.config.enabled).length,
            recentExecutions: this.executionLogs.length
        };
    }
}

// =============================================
// Singleton Instance
// =============================================

let orchestratorInstance: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new AgentOrchestrator();
    }
    return orchestratorInstance;
}

export { AgentRegistry };
