// =============================================
// Agent 14: Contagion Detector
// Detects financial contagion and spillover effects
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    TimeSeriesData,
    CorrelationMatrix
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface ContagionDetectorInput {
    variables: TimeSeriesData[];
    crisis_periods?: CrisisPeriod[];
    detection_method?: DetectionMethod;
    significance_level?: number;
}

export interface CrisisPeriod {
    name: string;
    start: Date;
    end: Date;
}

export type DetectionMethod = 'dcc' | 'correlation_breakdown' | 'granger' | 'copula_change';

export interface ContagionDetectorOutput {
    contagion_detected: boolean;
    contagion_events: ContagionEvent[];
    correlation_changes: CorrelationChange[];
    spillover_index: number;
    network_analysis: NetworkAnalysis;
    interpretation: string;
}

export interface ContagionEvent {
    date: Date;
    source_variable: string;
    affected_variables: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    correlation_jump: number;
    description: string;
}

export interface CorrelationChange {
    pair: [string, string];
    pre_crisis_corr: number;
    crisis_corr: number;
    change: number;
    is_significant: boolean;
    z_stat: number;
}

export interface NetworkAnalysis {
    centrality: { variable: string; score: number }[];
    clusters: string[][];
    systemic_risk_contribution: { variable: string; contribution: number }[];
}

// =============================================
// Agent Implementation
// =============================================

export class ContagionDetectorAgent extends BaseAgent<ContagionDetectorInput, ContagionDetectorOutput> {
    readonly id: AgentId = 'agent-contagion-detector';
    readonly name = 'Contagion Detector';
    readonly category: AgentCategory = 'risk';
    readonly description = 'Wykrywa efekty zarażania finansowego';
    readonly triggers: TriggerType[] = ['data_event', 'threshold_alert'];

    protected async run(
        input: ContagionDetectorInput,
        context: AgentContext
    ): Promise<ContagionDetectorOutput> {
        const { variables } = input;
        const method = input.detection_method || 'correlation_breakdown';
        const alpha = input.significance_level || 0.05;

        context.log(`[${this.id}] Detecting contagion among ${variables.length} variables`);

        // Define crisis periods if not provided
        const crisis_periods = input.crisis_periods || this.autoDetectCrisisPeriods(variables);

        // Analyze correlation changes during crises
        const correlation_changes = this.analyzeCorrelationChanges(variables, crisis_periods, alpha);

        // Detect contagion events
        const contagion_events = this.detectContagionEvents(variables, correlation_changes);

        // Compute spillover index
        const spillover_index = this.computeSpilloverIndex(variables);

        // Network analysis
        const network_analysis = this.performNetworkAnalysis(variables);

        // Overall detection
        const contagion_detected = contagion_events.some(e => e.severity === 'high' || e.severity === 'critical');

        // Generate interpretation
        let interpretation = `Wykryto ${contagion_events.length} potencjalnych zdarzeń zarażania.`;

        if (context.gemini) {
            try {
                const topEvents = contagion_events.slice(0, 3);
                const topCentrality = network_analysis.centrality.slice(0, 3);

                const { text } = await this.callGemini(
                    `Zinterpretuj analizę contagion (max 3 zdania):
                    
                    Spillover index: ${(spillover_index * 100).toFixed(1)}%
                    Wykryte zdarzenia: ${contagion_events.length}
                    Najważniejsze:
                    ${topEvents.map(e => `- ${e.source_variable} → ${e.affected_variables.join(', ')} (${e.severity})`).join('\n')}
                    
                    Centralność:
                    ${topCentrality.map(c => `- ${c.variable}: ${c.score.toFixed(2)}`).join('\n')}
                    
                    Jakie są implikacje dla ryzyka systemowego?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            contagion_detected,
            contagion_events,
            correlation_changes,
            spillover_index,
            network_analysis,
            interpretation
        };
    }

    // =============================================
    // Auto-detect Crisis Periods
    // =============================================

    private autoDetectCrisisPeriods(variables: TimeSeriesData[]): CrisisPeriod[] {
        // Use first variable as proxy, detect high volatility periods
        if (variables.length === 0) return [];

        const data = variables[0];
        const returns = this.computeReturns(data.values);
        const dates = data.dates.slice(1);

        const rollingVol = this.computeRollingVolatility(returns, 20);
        const volThreshold = this.mean(rollingVol) + 2 * this.std(rollingVol);

        const crisisPeriods: CrisisPeriod[] = [];
        let inCrisis = false;
        let crisisStart: Date | null = null;

        for (let i = 0; i < rollingVol.length; i++) {
            if (rollingVol[i] > volThreshold && !inCrisis) {
                inCrisis = true;
                crisisStart = dates[i + 19]; // offset for rolling window
            } else if (rollingVol[i] <= volThreshold && inCrisis && crisisStart) {
                crisisPeriods.push({
                    name: `High Volatility Period ${crisisPeriods.length + 1}`,
                    start: crisisStart,
                    end: dates[i + 19]
                });
                inCrisis = false;
                crisisStart = null;
            }
        }

        return crisisPeriods.slice(0, 5); // Limit to 5 periods
    }

    // =============================================
    // Correlation Changes Analysis
    // =============================================

    private analyzeCorrelationChanges(
        variables: TimeSeriesData[],
        crisisPeriods: CrisisPeriod[],
        alpha: number
    ): CorrelationChange[] {
        const changes: CorrelationChange[] = [];
        const n = variables.length;

        if (crisisPeriods.length === 0) return changes;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const varA = variables[i];
                const varB = variables[j];

                for (const crisis of crisisPeriods) {
                    // Pre-crisis period (same length before crisis)
                    const crisisDays = this.daysBetween(crisis.start, crisis.end);
                    const preStart = new Date(crisis.start);
                    preStart.setDate(preStart.getDate() - crisisDays);

                    const preCrisisA = this.filterByPeriod(varA, preStart, crisis.start);
                    const preCrisisB = this.filterByPeriod(varB, preStart, crisis.start);
                    const crisisA = this.filterByPeriod(varA, crisis.start, crisis.end);
                    const crisisB = this.filterByPeriod(varB, crisis.start, crisis.end);

                    if (preCrisisA.length < 10 || crisisA.length < 10) continue;

                    const preCorr = this.correlation(preCrisisA, preCrisisB);
                    const crisisCorr = this.correlation(crisisA, crisisB);
                    const change = crisisCorr - preCorr;

                    // Fisher z-test for correlation difference
                    const z_stat = this.fisherZTest(preCorr, crisisCorr, preCrisisA.length, crisisA.length);
                    const is_significant = Math.abs(z_stat) > 1.96;

                    changes.push({
                        pair: [varA.variable_name, varB.variable_name],
                        pre_crisis_corr: preCorr,
                        crisis_corr: crisisCorr,
                        change,
                        is_significant,
                        z_stat
                    });
                }
            }
        }

        return changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    }

    // =============================================
    // Contagion Event Detection
    // =============================================

    private detectContagionEvents(
        variables: TimeSeriesData[],
        correlationChanges: CorrelationChange[]
    ): ContagionEvent[] {
        const events: ContagionEvent[] = [];
        const significantChanges = correlationChanges.filter(c => c.is_significant && c.change > 0.2);

        // Group by source variable
        const sourceGroups = new Map<string, CorrelationChange[]>();

        for (const change of significantChanges) {
            const source = change.pair[0];
            if (!sourceGroups.has(source)) {
                sourceGroups.set(source, []);
            }
            sourceGroups.get(source)!.push(change);
        }

        for (const [source, changes] of sourceGroups) {
            if (changes.length >= 2) { // Contagion requires affecting multiple
                const avgJump = this.mean(changes.map(c => c.change));

                let severity: 'low' | 'medium' | 'high' | 'critical';
                if (avgJump > 0.5) severity = 'critical';
                else if (avgJump > 0.35) severity = 'high';
                else if (avgJump > 0.25) severity = 'medium';
                else severity = 'low';

                events.push({
                    date: new Date(),
                    source_variable: source,
                    affected_variables: changes.map(c => c.pair[1]),
                    severity,
                    correlation_jump: avgJump,
                    description: `${source} wykazuje zwiększoną współzależność z ${changes.length} zmiennymi podczas kryzysu`
                });
            }
        }

        return events.sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    // =============================================
    // Spillover Index
    // =============================================

    private computeSpilloverIndex(variables: TimeSeriesData[]): number {
        if (variables.length < 2) return 0;

        // Simplified spillover based on variance decomposition
        const n = variables.length;
        const returns = variables.map(v => this.computeReturns(v.values));

        // Compute cross-correlations at lag 1
        let totalSpillover = 0;
        let totalVariance = 0;

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    totalVariance += 1;
                } else {
                    const lagged = this.laggedCorrelation(returns[i], returns[j], 1);
                    totalSpillover += Math.abs(lagged);
                }
            }
        }

        return totalSpillover / (n * (n - 1));
    }

    // =============================================
    // Network Analysis
    // =============================================

    private performNetworkAnalysis(variables: TimeSeriesData[]): NetworkAnalysis {
        const n = variables.length;
        const returns = variables.map(v => this.computeReturns(v.values));

        // Compute correlation matrix
        const corrMatrix: number[][] = [];
        for (let i = 0; i < n; i++) {
            corrMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                corrMatrix[i][j] = i === j ? 1 : this.correlation(returns[i], returns[j]);
            }
        }

        // Centrality (degree centrality based on strong correlations)
        const centrality = variables.map((v, i) => {
            const strongConnections = corrMatrix[i].filter((c, j) => j !== i && Math.abs(c) > 0.5).length;
            return { variable: v.variable_name, score: strongConnections / (n - 1) };
        }).sort((a, b) => b.score - a.score);

        // Simple clustering (variables with correlation > 0.7)
        const clusters: string[][] = [];
        const assigned = new Set<number>();

        for (let i = 0; i < n; i++) {
            if (assigned.has(i)) continue;

            const cluster = [variables[i].variable_name];
            assigned.add(i);

            for (let j = i + 1; j < n; j++) {
                if (!assigned.has(j) && Math.abs(corrMatrix[i][j]) > 0.7) {
                    cluster.push(variables[j].variable_name);
                    assigned.add(j);
                }
            }

            if (cluster.length > 1) {
                clusters.push(cluster);
            }
        }

        // Systemic risk contribution (based on average correlation)
        const systemic_risk_contribution = variables.map((v, i) => {
            const avgCorr = corrMatrix[i].reduce((sum, c, j) => j !== i ? sum + Math.abs(c) : sum, 0) / (n - 1);
            return { variable: v.variable_name, contribution: avgCorr };
        }).sort((a, b) => b.contribution - a.contribution);

        return {
            centrality,
            clusters,
            systemic_risk_contribution
        };
    }

    // =============================================
    // Helpers
    // =============================================

    private computeReturns(values: number[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] !== 0) {
                returns.push((values[i] - values[i - 1]) / values[i - 1]);
            }
        }
        return returns;
    }

    private computeRollingVolatility(returns: number[], window: number): number[] {
        const vols: number[] = [];
        for (let i = window; i <= returns.length; i++) {
            const windowReturns = returns.slice(i - window, i);
            vols.push(this.std(windowReturns) * Math.sqrt(252));
        }
        return vols;
    }

    private filterByPeriod(data: TimeSeriesData, start: Date, end: Date): number[] {
        const filtered: number[] = [];
        for (let i = 0; i < data.dates.length; i++) {
            if (data.dates[i] >= start && data.dates[i] <= end) {
                filtered.push(data.values[i]);
            }
        }
        return filtered;
    }

    private daysBetween(start: Date, end: Date): number {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    private correlation(x: number[], y: number[]): number {
        const n = Math.min(x.length, y.length);
        if (n < 3) return 0;

        const xSlice = x.slice(0, n);
        const ySlice = y.slice(0, n);
        const meanX = this.mean(xSlice);
        const meanY = this.mean(ySlice);
        const stdX = this.std(xSlice);
        const stdY = this.std(ySlice);

        if (stdX === 0 || stdY === 0) return 0;

        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += (xSlice[i] - meanX) * (ySlice[i] - meanY);
        }

        return sum / ((n - 1) * stdX * stdY);
    }

    private laggedCorrelation(x: number[], y: number[], lag: number): number {
        if (lag >= x.length || lag >= y.length) return 0;
        return this.correlation(x.slice(lag), y.slice(0, -lag));
    }

    private fisherZTest(r1: number, r2: number, n1: number, n2: number): number {
        const z1 = 0.5 * Math.log((1 + r1) / (1 - r1));
        const z2 = 0.5 * Math.log((1 + r2) / (1 - r2));
        const se = Math.sqrt(1 / (n1 - 3) + 1 / (n2 - 3));
        return (z1 - z2) / se;
    }
}

export const contagionDetectorAgent = new ContagionDetectorAgent();
