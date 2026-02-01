// @ts-nocheck
// =============================================
// Agent 5: Correlation Analyzer
// Analyzes and monitors correlations between variables
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    CorrelationMatrix
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface CorrelationAnalyzerInput {
    variables: VariableData[];
    method?: CorrelationMethod;
    rolling_window?: number;
    detect_regime_changes?: boolean;
}

export interface VariableData {
    name: string;
    values: number[];
    dates?: Date[];
}

export type CorrelationMethod = 'pearson' | 'spearman' | 'kendall';

export interface CorrelationAnalyzerOutput {
    correlation_matrix: CorrelationMatrix;
    key_relationships: KeyRelationship[];
    regime_changes: RegimeChange[];
    rolling_correlations: RollingCorrelation[];
    interpretation: string;
}

export interface KeyRelationship {
    variable_a: string;
    variable_b: string;
    correlation: number;
    strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
    direction: 'positive' | 'negative';
    significance: number;
}

export interface RegimeChange {
    variable_pair: [string, string];
    date: Date;
    correlation_before: number;
    correlation_after: number;
    change_magnitude: number;
    description: string;
}

export interface RollingCorrelation {
    variable_pair: [string, string];
    dates: Date[];
    values: number[];
    current: number;
    trend: 'stable' | 'increasing' | 'decreasing';
}

// =============================================
// Agent Implementation
// =============================================

export class CorrelationAnalyzerAgent extends BaseAgent<CorrelationAnalyzerInput, CorrelationAnalyzerOutput> {
    readonly id: AgentId = 'agent-correlation-analyzer';
    readonly name = 'Correlation Analyzer';
    readonly category: AgentCategory = 'data';
    readonly description = 'Analizuje korelacje między zmiennymi';
    readonly triggers: TriggerType[] = ['data_event', 'user_action'];

    protected async run(
        input: CorrelationAnalyzerInput,
        context: AgentContext
    ): Promise<CorrelationAnalyzerOutput> {
        const { variables } = input;
        const method = input.method || 'pearson';
        const windowSize = input.rolling_window || 60;

        context.log(`[${this.id}] Analyzing correlations for ${variables.length} variables`);

        // Build correlation matrix
        const correlation_matrix = this.buildCorrelationMatrix(variables, method);

        // Identify key relationships
        const key_relationships = this.identifyKeyRelationships(correlation_matrix, variables);

        // Rolling correlations
        const rolling_correlations = this.computeRollingCorrelations(variables, windowSize);

        // Detect regime changes
        let regime_changes: RegimeChange[] = [];
        if (input.detect_regime_changes) {
            regime_changes = this.detectRegimeChanges(variables, windowSize);
        }

        // Generate interpretation
        let interpretation = `Przeanalizowano ${variables.length} zmiennych.`;

        if (context.gemini) {
            try {
                const strongRelations = key_relationships.filter(r => r.strength === 'strong' || r.strength === 'very_strong');
                const { text } = await this.callGemini(
                    `Zinterpretuj analizę korelacji (max 3 zdania):
                    
                    Zmienne: ${variables.map(v => v.name).join(', ')}
                    Silne zależności:
                    ${strongRelations.slice(0, 5).map(r => `- ${r.variable_a} ↔ ${r.variable_b}: ${r.correlation.toFixed(3)} (${r.direction})`).join('\n')}
                    
                    Zmiany reżimu: ${regime_changes.length}
                    
                    Jakie wnioski dla modelowania?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            correlation_matrix,
            key_relationships,
            regime_changes,
            rolling_correlations,
            interpretation
        };
    }

    // =============================================
    // Correlation Matrix
    // =============================================

    private buildCorrelationMatrix(
        variables: VariableData[],
        method: CorrelationMethod
    ): CorrelationMatrix {
        const n = variables.length;
        const names = variables.map(v => v.name);
        const values: number[][] = [];

        for (let i = 0; i < n; i++) {
            const row: number[] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    row.push(1);
                } else {
                    const corr = this.computeCorrelation(
                        variables[i].values,
                        variables[j].values,
                        method
                    );
                    row.push(corr);
                }
            }
            values.push(row);
        }

        return { variables: names, values };
    }

    private computeCorrelation(
        x: number[],
        y: number[],
        method: CorrelationMethod
    ): number {
        const n = Math.min(x.length, y.length);
        if (n < 3) return 0;

        const xSlice = x.slice(0, n);
        const ySlice = y.slice(0, n);

        switch (method) {
            case 'pearson':
                return this.pearsonCorrelation(xSlice, ySlice);
            case 'spearman':
                return this.spearmanCorrelation(xSlice, ySlice);
            case 'kendall':
                return this.kendallCorrelation(xSlice, ySlice);
            default:
                return this.pearsonCorrelation(xSlice, ySlice);
        }
    }

    private pearsonCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        const meanX = this.mean(x);
        const meanY = this.mean(y);
        const stdX = this.std(x);
        const stdY = this.std(y);

        if (stdX === 0 || stdY === 0) return 0;

        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += (x[i] - meanX) * (y[i] - meanY);
        }

        return sum / ((n - 1) * stdX * stdY);
    }

    private spearmanCorrelation(x: number[], y: number[]): number {
        const rankX = this.toRanks(x);
        const rankY = this.toRanks(y);
        return this.pearsonCorrelation(rankX, rankY);
    }

    private kendallCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        let concordant = 0;
        let discordant = 0;

        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                const sign = (x[i] - x[j]) * (y[i] - y[j]);
                if (sign > 0) concordant++;
                else if (sign < 0) discordant++;
            }
        }

        return (concordant - discordant) / (n * (n - 1) / 2);
    }

    private toRanks(data: number[]): number[] {
        const indexed = data.map((v, i) => ({ v, i }));
        indexed.sort((a, b) => a.v - b.v);

        const ranks = new Array(data.length);
        indexed.forEach((item, rank) => {
            ranks[item.i] = rank + 1;
        });

        return ranks;
    }

    // =============================================
    // Key Relationships
    // =============================================

    private identifyKeyRelationships(
        matrix: CorrelationMatrix,
        variables: VariableData[]
    ): KeyRelationship[] {
        const relationships: KeyRelationship[] = [];
        const n = matrix.variables.length;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const corr = matrix.values[i][j];
                const absCorr = Math.abs(corr);

                let strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
                if (absCorr >= 0.8) strength = 'very_strong';
                else if (absCorr >= 0.6) strength = 'strong';
                else if (absCorr >= 0.4) strength = 'moderate';
                else strength = 'weak';

                // Calculate significance (simplified t-test)
                const nObs = Math.min(variables[i].values.length, variables[j].values.length);
                const t = corr * Math.sqrt((nObs - 2) / (1 - corr * corr));
                const pvalue = 2 * (1 - this.normalCDF(Math.abs(t)));

                relationships.push({
                    variable_a: matrix.variables[i],
                    variable_b: matrix.variables[j],
                    correlation: corr,
                    strength,
                    direction: corr >= 0 ? 'positive' : 'negative',
                    significance: pvalue
                });
            }
        }

        // Sort by absolute correlation
        relationships.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

        return relationships;
    }

    // =============================================
    // Rolling Correlations
    // =============================================

    private computeRollingCorrelations(
        variables: VariableData[],
        windowSize: number
    ): RollingCorrelation[] {
        const results: RollingCorrelation[] = [];
        const n = variables.length;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const rolling = this.computeRollingWindow(
                    variables[i],
                    variables[j],
                    windowSize
                );
                results.push(rolling);
            }
        }

        return results;
    }

    private computeRollingWindow(
        a: VariableData,
        b: VariableData,
        windowSize: number
    ): RollingCorrelation {
        const n = Math.min(a.values.length, b.values.length);
        const dates: Date[] = [];
        const values: number[] = [];

        for (let end = windowSize; end <= n; end++) {
            const start = end - windowSize;
            const aWindow = a.values.slice(start, end);
            const bWindow = b.values.slice(start, end);

            const corr = this.pearsonCorrelation(aWindow, bWindow);
            values.push(corr);

            if (a.dates && a.dates[end - 1]) {
                dates.push(a.dates[end - 1]);
            }
        }

        // Determine trend
        let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
        if (values.length > 10) {
            const firstHalf = this.mean(values.slice(0, Math.floor(values.length / 2)));
            const secondHalf = this.mean(values.slice(-Math.floor(values.length / 2)));
            const diff = secondHalf - firstHalf;

            if (diff > 0.1) trend = 'increasing';
            else if (diff < -0.1) trend = 'decreasing';
        }

        return {
            variable_pair: [a.name, b.name],
            dates,
            values,
            current: values[values.length - 1] || 0,
            trend
        };
    }

    // =============================================
    // Regime Change Detection
    // =============================================

    private detectRegimeChanges(
        variables: VariableData[],
        windowSize: number
    ): RegimeChange[] {
        const changes: RegimeChange[] = [];
        const n = variables.length;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const detected = this.detectPairRegimeChange(
                    variables[i],
                    variables[j],
                    windowSize
                );
                changes.push(...detected);
            }
        }

        // Sort by magnitude
        changes.sort((a, b) => Math.abs(b.change_magnitude) - Math.abs(a.change_magnitude));

        return changes;
    }

    private detectPairRegimeChange(
        a: VariableData,
        b: VariableData,
        windowSize: number
    ): RegimeChange[] {
        const changes: RegimeChange[] = [];
        const n = Math.min(a.values.length, b.values.length);

        if (n < windowSize * 3) return changes;

        const threshold = 0.3; // Significant change threshold

        for (let mid = windowSize; mid <= n - windowSize; mid++) {
            const before = this.pearsonCorrelation(
                a.values.slice(mid - windowSize, mid),
                b.values.slice(mid - windowSize, mid)
            );
            const after = this.pearsonCorrelation(
                a.values.slice(mid, mid + windowSize),
                b.values.slice(mid, mid + windowSize)
            );

            const change = Math.abs(after - before);

            if (change > threshold) {
                changes.push({
                    variable_pair: [a.name, b.name],
                    date: a.dates?.[mid] || new Date(),
                    correlation_before: before,
                    correlation_after: after,
                    change_magnitude: after - before,
                    description: `Zmiana korelacji z ${before.toFixed(2)} na ${after.toFixed(2)}`
                });
                mid += windowSize; // Skip ahead
            }
        }

        return changes;
    }

    // =============================================
    // Helpers
    // =============================================

    private normalCDF(x: number): number {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
        const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return 0.5 * (1.0 + sign * y);
    }
}

export const correlationAnalyzerAgent = new CorrelationAnalyzerAgent();
