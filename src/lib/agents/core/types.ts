// @ts-nocheck
// =============================================
// StochFin AI Agent System - Core Types
// Base interfaces for all 20 agents
// =============================================

import { GoogleGenAI } from '@google/genai';

// =============================================
// Agent Base Types
// =============================================

export type AgentId =
    // Data Agents
    | 'agent-data-collector'
    | 'agent-data-validator'
    | 'agent-anomaly-detector'
    | 'agent-time-series-processor'
    | 'agent-correlation-analyzer'
    // Model Agents
    | 'agent-sde-selector'
    | 'agent-copula-optimizer'
    | 'agent-parameter-estimator'
    | 'agent-backtester'
    | 'agent-model-comparator'
    // Risk Agents
    | 'agent-var-calculator'
    | 'agent-stress-tester'
    | 'agent-tail-risk'
    | 'agent-contagion-detector'
    | 'agent-early-warning'
    // Report Agents
    | 'agent-nl-summarizer'
    | 'agent-insight-generator'
    | 'agent-recommendation-engine'
    | 'agent-alert-composer'
    | 'agent-pdf-builder';

export type AgentCategory = 'data' | 'models' | 'risk' | 'reports';

export type TriggerType =
    | 'user_action'
    | 'cron'
    | 'data_event'
    | 'threshold_alert'
    | 'realtime';

export type AgentStatus = 'idle' | 'running' | 'success' | 'failed';

// =============================================
// Agent Execution Types
// =============================================

export interface AgentTrigger {
    type: TriggerType;
    source: string;
    timestamp: Date;
    payload?: Record<string, unknown>;
}

export interface AgentContext {
    // Identifiers
    executionId: string;
    userId?: string;
    projectId?: string;

    // Trigger info
    trigger: AgentTrigger;

    // Shared state between agents in pipeline
    sharedState: Map<string, unknown>;

    // Gemini client (shared)
    gemini?: GoogleGenAI;

    // Logging
    log: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export interface AgentResult<T = unknown> {
    agentId: AgentId;
    status: AgentStatus;
    data?: T;
    error?: string;
    executionTimeMs: number;
    geminiTokensUsed?: number;
    timestamp: Date;
}

// =============================================
// Agent Interface
// =============================================

export interface Agent<TInput = unknown, TOutput = unknown> {
    // Metadata
    readonly id: AgentId;
    readonly name: string;
    readonly category: AgentCategory;
    readonly description: string;
    readonly triggers: TriggerType[];

    // Configuration
    config: AgentConfig;

    // Lifecycle
    initialize(context: AgentContext): Promise<void>;
    execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
    cleanup(): Promise<void>;

    // Health check
    healthCheck(): Promise<boolean>;
}

export interface AgentConfig {
    enabled: boolean;
    timeout_ms: number;
    max_retries: number;
    gemini_model?: string;
    custom_params?: Record<string, unknown>;
}

// =============================================
// Data Types for Agents
// =============================================

export interface TimeSeriesData {
    variable_name: string;
    values: number[];
    dates: Date[];
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    source?: string;
}

export interface AnomalyResult {
    index: number;
    value: number;
    expected: number;
    deviation: number;
    type: 'spike' | 'dip' | 'trend_break' | 'volatility_shift';
    severity: 'low' | 'medium' | 'high' | 'critical';
    explanation?: string;
}

export interface ModelFit {
    model_type: 'gbm' | 'ornstein_uhlenbeck' | 'heston' | 'merton_jump';
    parameters: Record<string, number>;
    aic: number;
    bic: number;
    log_likelihood: number;
    residuals?: number[];
}

export interface CopulaFit {
    family: 'gaussian' | 'clayton' | 'gumbel' | 'student_t' | 'frank';
    parameters: Record<string, number>;
    aic: number;
    tail_lower: number;
    tail_upper: number;
    kendall_tau: number;
}

export interface RiskMetrics {
    var_95: number;
    var_99: number;
    es_95: number;
    es_99: number;
    max_drawdown: number;
    volatility: number;
}

export interface Alert {
    id: string;
    agent_id: AgentId;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    created_at: Date;
    acknowledged: boolean;
}

// =============================================
// Report Types
// =============================================

export interface InsightItem {
    id: string;
    title: string;
    description: string;
    importance: number; // 1-10
    category: string;
    suggested_actions?: string[];
    data_points?: Record<string, unknown>;
}

export interface RecommendationItem {
    id: string;
    action: string;
    rationale: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimated_impact: string;
    implementation_steps?: string[];
}

export interface MorningBriefing {
    date: Date;
    overall_risk_score: number; // 0-100
    key_alerts: Alert[];
    insights: InsightItem[];
    recommendations: RecommendationItem[];
    summary: string;
}

// =============================================
// External Data Types
// =============================================

export interface NBPExchangeRate {
    currency: string;
    code: string;
    mid: number;
    effectiveDate: string;
}

export interface GUSIndicator {
    id: string;
    name: string;
    value: number;
    unit: string;
    period: string;
}

export interface YahooPriceData {
    ticker: string;
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjusted_close: number;
}

// =============================================
// Agent Execution Logs (for DB)
// =============================================

export interface AgentExecutionLog {
    id: string;
    agent_id: AgentId;
    trigger_type: TriggerType;
    trigger_source: string;
    input_data: Record<string, unknown>;
    output_data: Record<string, unknown>;
    status: AgentStatus;
    error_message?: string;
    execution_time_ms: number;
    gemini_tokens_used?: number;
    created_at: Date;
}

// =============================================
// Correlation Types
// =============================================

export interface CorrelationMatrix {
    variables: string[];
    values: number[][];
    method?: 'pearson' | 'spearman' | 'kendall';
    computed_at?: Date;
}

