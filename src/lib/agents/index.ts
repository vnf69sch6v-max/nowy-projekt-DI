// @ts-nocheck
// =============================================
// StochFin AI Agent System - Complete Barrel Export
// 20 Specialized AI Agents for Financial Analysis
// =============================================

// Core Infrastructure
export * from './core/types';
export * from './core/base-agent';
export * from './core/orchestrator';

// Data Agents (1, 2, 3, 4, 5)
export * from './data/collector';
export * from './data/data-validator';
export * from './data/anomaly-detector';
export * from './data/time-series-processor';
export * from './data/correlation-analyzer';

// Model Agents (6, 7, 8, 9, 10)
export * from './models/sde-selector';
export * from './models/copula-optimizer';
export * from './models/parameter-estimator';
export * from './models/backtester';
export * from './models/model-comparator';

// Risk Agents (11, 12, 13, 14, 15)
export * from './risk/var-calculator';
export * from './risk/stress-tester';
export * from './risk/tail-risk';
export * from './risk/contagion-detector';
export * from './risk/early-warning';

// Report Agents (16, 17, 18, 19, 20)
export * from './reports/nl-summarizer';
export * from './reports/insight-generator';
export * from './reports/recommendation-engine';
export * from './reports/alert-composer';
export * from './reports/pdf-builder';

// =============================================
// Agent Registry
// =============================================

import { getOrchestrator } from './core/orchestrator';

// Data Agents
import { dataCollectorAgent } from './data/collector';
import { dataValidatorAgent } from './data/data-validator';
import { anomalyDetectorAgent } from './data/anomaly-detector';
import { timeSeriesProcessorAgent } from './data/time-series-processor';
import { correlationAnalyzerAgent } from './data/correlation-analyzer';

// Model Agents
import { sdeSelectorAgent } from './models/sde-selector';
import { copulaOptimizerAgent } from './models/copula-optimizer';
import { parameterEstimatorAgent } from './models/parameter-estimator';
import { backtesterAgent } from './models/backtester';
import { modelComparatorAgent } from './models/model-comparator';

// Risk Agents
import { varCalculatorAgent } from './risk/var-calculator';
import { stressTesterAgent } from './risk/stress-tester';
import { tailRiskAnalyzerAgent } from './risk/tail-risk';
import { contagionDetectorAgent } from './risk/contagion-detector';
import { earlyWarningAgent } from './risk/early-warning';

// Report Agents
import { nlSummarizerAgent } from './reports/nl-summarizer';
import { insightGeneratorAgent } from './reports/insight-generator';
import { recommendationEngineAgent } from './reports/recommendation-engine';
import { alertComposerAgent } from './reports/alert-composer';
import { pdfReportBuilderAgent } from './reports/pdf-builder';

/**
 * All 20 agent instances organized by category
 */
export const agents = {
    // Data Agents (5)
    dataCollector: dataCollectorAgent,
    dataValidator: dataValidatorAgent,
    anomalyDetector: anomalyDetectorAgent,
    timeSeriesProcessor: timeSeriesProcessorAgent,
    correlationAnalyzer: correlationAnalyzerAgent,

    // Model Agents (5)
    sdeSelector: sdeSelectorAgent,
    copulaOptimizer: copulaOptimizerAgent,
    parameterEstimator: parameterEstimatorAgent,
    backtester: backtesterAgent,
    modelComparator: modelComparatorAgent,

    // Risk Agents (5)
    varCalculator: varCalculatorAgent,
    stressTester: stressTesterAgent,
    tailRiskAnalyzer: tailRiskAnalyzerAgent,
    contagionDetector: contagionDetectorAgent,
    earlyWarning: earlyWarningAgent,

    // Report Agents (5)
    nlSummarizer: nlSummarizerAgent,
    insightGenerator: insightGeneratorAgent,
    recommendationEngine: recommendationEngineAgent,
    alertComposer: alertComposerAgent,
    pdfReportBuilder: pdfReportBuilderAgent
};

/**
 * Agent metadata for UI display
 */
export const agentMeta = [
    // Data
    { id: 'agent-data-collector', name: 'Data Collector', category: 'data', icon: '📊', color: '#3b82f6' },
    { id: 'agent-data-validator', name: 'Data Validator', category: 'data', icon: '✅', color: '#3b82f6' },
    { id: 'agent-anomaly-detector', name: 'Anomaly Detector', category: 'data', icon: '🔍', color: '#3b82f6' },
    { id: 'agent-time-series-processor', name: 'Time Series Processor', category: 'data', icon: '📈', color: '#3b82f6' },
    { id: 'agent-correlation-analyzer', name: 'Correlation Analyzer', category: 'data', icon: '🔗', color: '#3b82f6' },

    // Models
    { id: 'agent-sde-selector', name: 'SDE Model Selector', category: 'models', icon: '🧮', color: '#8b5cf6' },
    { id: 'agent-copula-optimizer', name: 'Copula Optimizer', category: 'models', icon: '🔀', color: '#8b5cf6' },
    { id: 'agent-parameter-estimator', name: 'Parameter Estimator', category: 'models', icon: '📐', color: '#8b5cf6' },
    { id: 'agent-backtester', name: 'Backtester', category: 'models', icon: '⏮️', color: '#8b5cf6' },
    { id: 'agent-model-comparator', name: 'Model Comparator', category: 'models', icon: '⚖️', color: '#8b5cf6' },

    // Risk
    { id: 'agent-var-calculator', name: 'VaR Calculator', category: 'risk', icon: '📉', color: '#ef4444' },
    { id: 'agent-stress-tester', name: 'Stress Tester', category: 'risk', icon: '💥', color: '#ef4444' },
    { id: 'agent-tail-risk', name: 'Tail Risk Analyzer', category: 'risk', icon: '🦎', color: '#ef4444' },
    { id: 'agent-contagion-detector', name: 'Contagion Detector', category: 'risk', icon: '🦠', color: '#ef4444' },
    { id: 'agent-early-warning', name: 'Early Warning', category: 'risk', icon: '⚠️', color: '#ef4444' },

    // Reports
    { id: 'agent-nl-summarizer', name: 'NL Summarizer', category: 'reports', icon: '📝', color: '#22c55e' },
    { id: 'agent-insight-generator', name: 'Insight Generator', category: 'reports', icon: '💡', color: '#22c55e' },
    { id: 'agent-recommendation-engine', name: 'Recommendation Engine', category: 'reports', icon: '🎯', color: '#22c55e' },
    { id: 'agent-alert-composer', name: 'Alert Composer', category: 'reports', icon: '🔔', color: '#22c55e' },
    { id: 'agent-pdf-builder', name: 'PDF Report Builder', category: 'reports', icon: '📄', color: '#22c55e' }
];

/**
 * Initialize all 20 agents with the orchestrator
 */
export function initializeAgentSystem() {
    const orchestrator = getOrchestrator();

    orchestrator.registerAgents([
        // Data
        dataCollectorAgent,
        dataValidatorAgent,
        anomalyDetectorAgent,
        timeSeriesProcessorAgent,
        correlationAnalyzerAgent,

        // Models
        sdeSelectorAgent,
        copulaOptimizerAgent,
        parameterEstimatorAgent,
        backtesterAgent,
        modelComparatorAgent,

        // Risk
        varCalculatorAgent,
        stressTesterAgent,
        tailRiskAnalyzerAgent,
        contagionDetectorAgent,
        earlyWarningAgent,

        // Reports
        nlSummarizerAgent,
        insightGeneratorAgent,
        recommendationEngineAgent,
        alertComposerAgent,
        pdfReportBuilderAgent
    ]);

    console.log('[AgentSystem] ✅ Registered 20 AI agents');
    return orchestrator;
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string) {
    return Object.values(agents).find(agent => agent.id === id);
}

/**
 * Get agents by category
 */
export function getAgentsByCategory(category: 'data' | 'models' | 'risk' | 'reports') {
    return Object.values(agents).filter(agent => agent.category === category);
}

/**
 * Get agent count by category
 */
export function getAgentCounts() {
    return {
        data: 5,
        models: 5,
        risk: 5,
        reports: 5,
        total: 20
    };
}
