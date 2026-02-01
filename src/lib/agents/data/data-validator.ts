// =============================================
// Agent 2: Data Validator
// Validates data quality and integrity
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    TimeSeriesData
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface DataValidatorInput {
    data: TimeSeriesData[];
    validation_rules?: ValidationRule[];
    strictness?: 'lenient' | 'standard' | 'strict';
}

export interface ValidationRule {
    type: ValidationRuleType;
    params?: Record<string, number | string>;
}

export type ValidationRuleType =
    | 'no_nulls'
    | 'no_duplicates'
    | 'monotonic_dates'
    | 'range_check'
    | 'stationarity'
    | 'no_outliers'
    | 'minimum_length'
    | 'frequency_check';

export interface DataValidatorOutput {
    is_valid: boolean;
    overall_quality_score: number;
    series_reports: SeriesValidationReport[];
    issues: ValidationIssue[];
    recommendations: string[];
}

export interface SeriesValidationReport {
    variable_name: string;
    is_valid: boolean;
    quality_score: number;
    completeness: number;
    issues_count: number;
    statistics: DataStatistics;
}

export interface DataStatistics {
    count: number;
    missing: number;
    min: number;
    max: number;
    mean: number;
    std: number;
    skewness: number;
    kurtosis: number;
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    rule: ValidationRuleType;
    variable: string;
    message: string;
    affected_indices?: number[];
}

// =============================================
// Agent Implementation
// =============================================

export class DataValidatorAgent extends BaseAgent<DataValidatorInput, DataValidatorOutput> {
    readonly id: AgentId = 'agent-data-validator';
    readonly name = 'Data Validator';
    readonly category: AgentCategory = 'data';
    readonly description = 'Waliduje jakość i integralność danych';
    readonly triggers: TriggerType[] = ['data_event', 'user_action'];

    protected async run(
        input: DataValidatorInput,
        context: AgentContext
    ): Promise<DataValidatorOutput> {
        const { data } = input;
        const strictness = input.strictness || 'standard';
        const rules = input.validation_rules || this.getDefaultRules(strictness);

        context.log(`[${this.id}] Validating ${data.length} data series with ${rules.length} rules`);

        const issues: ValidationIssue[] = [];
        const series_reports: SeriesValidationReport[] = [];

        for (const series of data) {
            const report = this.validateSeries(series, rules, issues);
            series_reports.push(report);
        }

        // Overall validation result
        const is_valid = issues.filter(i => i.severity === 'error').length === 0;
        const overall_quality_score = series_reports.reduce((sum, r) => sum + r.quality_score, 0) / series_reports.length;

        // Generate recommendations
        const recommendations = this.generateRecommendations(issues, context.gemini !== undefined);

        return {
            is_valid,
            overall_quality_score,
            series_reports,
            issues,
            recommendations
        };
    }

    // =============================================
    // Default Rules
    // =============================================

    private getDefaultRules(strictness: 'lenient' | 'standard' | 'strict'): ValidationRule[] {
        const baseRules: ValidationRule[] = [
            { type: 'no_nulls' },
            { type: 'monotonic_dates' },
            { type: 'minimum_length', params: { min: 30 } }
        ];

        if (strictness === 'standard' || strictness === 'strict') {
            baseRules.push(
                { type: 'no_duplicates' },
                { type: 'no_outliers', params: { threshold: 4 } }
            );
        }

        if (strictness === 'strict') {
            baseRules.push(
                { type: 'stationarity' },
                { type: 'range_check', params: { min: -1, max: 1 } }
            );
        }

        return baseRules;
    }

    // =============================================
    // Series Validation
    // =============================================

    private validateSeries(
        series: TimeSeriesData,
        rules: ValidationRule[],
        issues: ValidationIssue[]
    ): SeriesValidationReport {
        const varName = series.variable_name;
        const values = series.values;
        const dates = series.dates;

        let issueCount = 0;

        // Run each validation rule
        for (const rule of rules) {
            const ruleIssues = this.runRule(rule, varName, values, dates);
            issues.push(...ruleIssues);
            issueCount += ruleIssues.length;
        }

        // Compute statistics
        const statistics = this.computeStatistics(values);

        // Compute completeness
        const nullCount = values.filter(v => v === null || isNaN(v)).length;
        const completeness = 1 - nullCount / values.length;

        // Quality score (0-100)
        const errorCount = issues.filter(i => i.variable === varName && i.severity === 'error').length;
        const warningCount = issues.filter(i => i.variable === varName && i.severity === 'warning').length;
        const quality_score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

        return {
            variable_name: varName,
            is_valid: errorCount === 0,
            quality_score,
            completeness,
            issues_count: issueCount,
            statistics
        };
    }

    // =============================================
    // Rule Execution
    // =============================================

    private runRule(
        rule: ValidationRule,
        varName: string,
        values: number[],
        dates: Date[]
    ): ValidationIssue[] {
        switch (rule.type) {
            case 'no_nulls':
                return this.checkNoNulls(varName, values);
            case 'no_duplicates':
                return this.checkNoDuplicates(varName, dates);
            case 'monotonic_dates':
                return this.checkMonotonicDates(varName, dates);
            case 'range_check':
                return this.checkRange(varName, values, rule.params as { min: number; max: number });
            case 'no_outliers':
                return this.checkOutliers(varName, values, rule.params?.threshold as number || 4);
            case 'minimum_length':
                return this.checkMinLength(varName, values, rule.params?.min as number || 30);
            case 'stationarity':
                return this.checkStationarity(varName, values);
            default:
                return [];
        }
    }

    private checkNoNulls(varName: string, values: number[]): ValidationIssue[] {
        const nullIndices = values.map((v, i) => (v === null || isNaN(v)) ? i : -1).filter(i => i >= 0);
        if (nullIndices.length > 0) {
            return [{
                severity: nullIndices.length > values.length * 0.1 ? 'error' : 'warning',
                rule: 'no_nulls',
                variable: varName,
                message: `${nullIndices.length} brakujących wartości (${(nullIndices.length / values.length * 100).toFixed(1)}%)`,
                affected_indices: nullIndices.slice(0, 10)
            }];
        }
        return [];
    }

    private checkNoDuplicates(varName: string, dates: Date[]): ValidationIssue[] {
        const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
        const duplicates = dateStrings.filter((d, i) => dateStrings.indexOf(d) !== i);
        if (duplicates.length > 0) {
            return [{
                severity: 'error',
                rule: 'no_duplicates',
                variable: varName,
                message: `${duplicates.length} zduplikowanych dat`
            }];
        }
        return [];
    }

    private checkMonotonicDates(varName: string, dates: Date[]): ValidationIssue[] {
        for (let i = 1; i < dates.length; i++) {
            if (dates[i] <= dates[i - 1]) {
                return [{
                    severity: 'error',
                    rule: 'monotonic_dates',
                    variable: varName,
                    message: 'Daty nie są monotoniczne (rosnące)',
                    affected_indices: [i - 1, i]
                }];
            }
        }
        return [];
    }

    private checkRange(varName: string, values: number[], params: { min: number; max: number }): ValidationIssue[] {
        const outOfRange = values.map((v, i) => (v < params.min || v > params.max) ? i : -1).filter(i => i >= 0);
        if (outOfRange.length > 0) {
            return [{
                severity: 'warning',
                rule: 'range_check',
                variable: varName,
                message: `${outOfRange.length} wartości poza zakresem [${params.min}, ${params.max}]`,
                affected_indices: outOfRange.slice(0, 10)
            }];
        }
        return [];
    }

    private checkOutliers(varName: string, values: number[], threshold: number): ValidationIssue[] {
        const mean = this.mean(values);
        const std = this.std(values);
        const outliers = values.map((v, i) => Math.abs(v - mean) / std > threshold ? i : -1).filter(i => i >= 0);
        if (outliers.length > 0) {
            return [{
                severity: 'warning',
                rule: 'no_outliers',
                variable: varName,
                message: `${outliers.length} outlierów (>${threshold}σ)`,
                affected_indices: outliers.slice(0, 10)
            }];
        }
        return [];
    }

    private checkMinLength(varName: string, values: number[], minLength: number): ValidationIssue[] {
        if (values.length < minLength) {
            return [{
                severity: 'error',
                rule: 'minimum_length',
                variable: varName,
                message: `Za mało danych: ${values.length} < ${minLength} wymaganych`
            }];
        }
        return [];
    }

    private checkStationarity(varName: string, values: number[]): ValidationIssue[] {
        // Simple ADF-like test: check if mean is stable across subsets
        const n = values.length;
        if (n < 60) return [];

        const thirds = [
            values.slice(0, Math.floor(n / 3)),
            values.slice(Math.floor(n / 3), Math.floor(2 * n / 3)),
            values.slice(Math.floor(2 * n / 3))
        ];

        const means = thirds.map(t => this.mean(t));
        const overallMean = this.mean(values);
        const overallStd = this.std(values);

        const maxDeviation = Math.max(...means.map(m => Math.abs(m - overallMean)));

        if (maxDeviation > 0.5 * overallStd) {
            return [{
                severity: 'warning',
                rule: 'stationarity',
                variable: varName,
                message: 'Szereg może nie być stacjonarny (zmieniająca się średnia)'
            }];
        }
        return [];
    }

    // =============================================
    // Statistics
    // =============================================

    private computeStatistics(values: number[]): DataStatistics {
        const valid = values.filter(v => v !== null && !isNaN(v));
        const n = valid.length;

        if (n === 0) {
            return { count: 0, missing: values.length, min: 0, max: 0, mean: 0, std: 0, skewness: 0, kurtosis: 0 };
        }

        const mean = this.mean(valid);
        const std = this.std(valid);

        let skewness = 0, kurtosis = 0;
        if (std > 0) {
            for (const v of valid) {
                const z = (v - mean) / std;
                skewness += Math.pow(z, 3);
                kurtosis += Math.pow(z, 4);
            }
            skewness /= n;
            kurtosis = kurtosis / n - 3;
        }

        return {
            count: n,
            missing: values.length - n,
            min: Math.min(...valid),
            max: Math.max(...valid),
            mean,
            std,
            skewness,
            kurtosis
        };
    }

    // =============================================
    // Recommendations
    // =============================================

    private generateRecommendations(issues: ValidationIssue[], hasGemini: boolean): string[] {
        const recs: string[] = [];

        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;

        if (errorCount > 0) {
            recs.push('🚨 Napraw błędy krytyczne przed dalszą analizą');
        }

        if (issues.some(i => i.rule === 'no_nulls')) {
            recs.push('Uzupełnij brakujące dane interpolacją lub usuń niekompletne rekordy');
        }

        if (issues.some(i => i.rule === 'no_outliers')) {
            recs.push('Rozważ winsoryzację lub usunięcie outlierów');
        }

        if (issues.some(i => i.rule === 'stationarity')) {
            recs.push('Szereg niestacjonarny - rozważ różnicowanie lub detrending');
        }

        if (errorCount === 0 && warningCount === 0) {
            recs.push('✅ Dane są gotowe do analizy');
        }

        return recs;
    }
}

export const dataValidatorAgent = new DataValidatorAgent();
