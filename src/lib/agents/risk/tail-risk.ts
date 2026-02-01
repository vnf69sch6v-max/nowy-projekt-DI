// @ts-nocheck
// =============================================
// Agent 13: Tail Risk Analyzer
// Extreme value analysis and fat tail detection
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface TailRiskInput {
    returns: number[];
    threshold_percentile?: number;
    confidence_levels?: number[];
}

export interface TailRiskOutput {
    has_fat_tails: boolean;
    tail_index: TailIndex;
    gpd_fit: GPDFit;
    extreme_quantiles: ExtremeQuantile[];
    comparison_to_normal: TailComparison;
    interpretation: string;
}

export interface TailIndex {
    hill_estimator: number;
    pickands_estimator: number;
    confidence_interval: [number, number];
}

export interface GPDFit {
    shape: number;    // xi (tail index)
    scale: number;    // sigma
    threshold: number;
    n_exceedances: number;
    goodness_of_fit: number; // p-value
}

export interface ExtremeQuantile {
    probability: number;
    quantile_normal: number;
    quantile_gpd: number;
    ratio: number;
}

export interface TailComparison {
    kurtosis: number;
    excess_kurtosis: number;
    jarque_bera_stat: number;
    is_normal_rejected: boolean;
    tail_heaviness: 'light' | 'normal' | 'heavy' | 'very_heavy';
}

// =============================================
// Agent Implementation
// =============================================

export class TailRiskAnalyzerAgent extends BaseAgent<TailRiskInput, TailRiskOutput> {
    readonly id: AgentId = 'agent-tail-risk';
    readonly name = 'Tail Risk Analyzer';
    readonly category: AgentCategory = 'risk';
    readonly description = 'Analizuje ryzyko ekstremalne (ogony rozkładu)';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    protected async run(
        input: TailRiskInput,
        context: AgentContext
    ): Promise<TailRiskOutput> {
        const { returns } = input;
        const threshold_percentile = input.threshold_percentile || 95;
        const confidence_levels = input.confidence_levels || [0.99, 0.999, 0.9999];

        context.log(`[${this.id}] Analyzing tail risk for ${returns.length} observations`);

        // Compute tail index
        const tail_index = this.estimateTailIndex(returns);

        // Fit GPD to exceedances
        const gpd_fit = this.fitGPD(returns, threshold_percentile);

        // Compute extreme quantiles
        const extreme_quantiles = this.computeExtremeQuantiles(
            returns, gpd_fit, confidence_levels
        );

        // Compare to normal distribution
        const comparison_to_normal = this.compareToNormal(returns);

        // Determine if fat tails
        const has_fat_tails = comparison_to_normal.excess_kurtosis > 1 ||
            gpd_fit.shape > 0.1;

        // Generate interpretation
        let interpretation = `Rozkład ${has_fat_tails ? 'ma grube ogony' : 'jest zbliżony do normalnego'}.`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Zinterpretuj analizę ogonów rozkładu (max 3 zdania):
                    - Excess kurtosis: ${comparison_to_normal.excess_kurtosis.toFixed(2)}
                    - GPD shape (xi): ${gpd_fit.shape.toFixed(3)}
                    - Tail heaviness: ${comparison_to_normal.tail_heaviness}
                    - Extreme quantile (99.9%): ${extreme_quantiles.find(q => q.probability === 0.999)?.quantile_gpd.toFixed(4) || 'N/A'}
                    
                    Jakie są implikacje dla zarządzania ryzykiem?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            has_fat_tails,
            tail_index,
            gpd_fit,
            extreme_quantiles,
            comparison_to_normal,
            interpretation
        };
    }

    // =============================================
    // Tail Index Estimation
    // =============================================

    private estimateTailIndex(data: number[]): TailIndex {
        const sorted = [...data].sort((a, b) => b - a); // descending
        const k = Math.floor(Math.sqrt(data.length)); // number of order statistics

        // Hill estimator (for right tail)
        const hillEstimator = this.hillEstimator(sorted, k);

        // Pickands estimator
        const pickandsEstimator = this.pickandsEstimator(sorted, k);

        // Bootstrap CI (simplified - use asymptotic SE)
        const se = hillEstimator / Math.sqrt(k);
        const ci: [number, number] = [
            hillEstimator - 1.96 * se,
            hillEstimator + 1.96 * se
        ];

        return {
            hill_estimator: hillEstimator,
            pickands_estimator: pickandsEstimator,
            confidence_interval: ci
        };
    }

    private hillEstimator(sorted: number[], k: number): number {
        if (k < 2 || sorted[k - 1] <= 0) return 1;

        let sum = 0;
        for (let i = 0; i < k - 1; i++) {
            if (sorted[i] > 0 && sorted[k - 1] > 0) {
                sum += Math.log(sorted[i] / sorted[k - 1]);
            }
        }

        return sum / (k - 1);
    }

    private pickandsEstimator(sorted: number[], k: number): number {
        const k2 = Math.floor(k / 2);
        const k4 = Math.floor(k / 4);

        if (k4 < 1 || sorted[k2] === sorted[k] || sorted[k4] === sorted[k2]) {
            return 1;
        }

        return (1 / Math.log(2)) * Math.log(
            (sorted[k4] - sorted[k2]) / (sorted[k2] - sorted[k])
        );
    }

    // =============================================
    // GPD Fitting (Generalized Pareto Distribution)
    // =============================================

    private fitGPD(data: number[], threshold_percentile: number): GPDFit {
        const threshold = this.percentile(data, threshold_percentile);
        const exceedances = data.filter(x => x > threshold).map(x => x - threshold);

        if (exceedances.length < 10) {
            return {
                shape: 0,
                scale: this.std(exceedances) || 1,
                threshold,
                n_exceedances: exceedances.length,
                goodness_of_fit: 1
            };
        }

        // Method of moments estimation for GPD
        const mean_exc = this.mean(exceedances);
        const var_exc = this.variance(exceedances);

        // MoM estimators
        const shape = 0.5 * (mean_exc * mean_exc / var_exc - 1);
        const scale = 0.5 * mean_exc * (mean_exc * mean_exc / var_exc + 1);

        return {
            shape: Math.max(-0.5, Math.min(1, shape)),
            scale: Math.max(0.001, scale),
            threshold,
            n_exceedances: exceedances.length,
            goodness_of_fit: 0.5 // Placeholder
        };
    }

    // =============================================
    // Extreme Quantile Computation
    // =============================================

    private computeExtremeQuantiles(
        data: number[],
        gpd: GPDFit,
        probabilities: number[]
    ): ExtremeQuantile[] {
        const n = data.length;
        const mean = this.mean(data);
        const std = this.std(data);

        return probabilities.map(p => {
            // Normal quantile
            const zNormal = this.normalQuantile(p);
            const quantile_normal = mean + zNormal * std;

            // GPD quantile
            const nu = gpd.n_exceedances / n;
            const m = 1 - p;
            let quantile_gpd: number;

            if (Math.abs(gpd.shape) < 0.001) {
                quantile_gpd = gpd.threshold + gpd.scale * Math.log(nu / m);
            } else {
                quantile_gpd = gpd.threshold +
                    (gpd.scale / gpd.shape) * (Math.pow(nu / m, gpd.shape) - 1);
            }

            return {
                probability: p,
                quantile_normal,
                quantile_gpd,
                ratio: quantile_gpd / (quantile_normal || 1)
            };
        });
    }

    // =============================================
    // Comparison to Normal
    // =============================================

    private compareToNormal(data: number[]): TailComparison {
        const n = data.length;
        const mean = this.mean(data);
        const std = this.std(data);

        // Compute moments
        let m3 = 0, m4 = 0;
        for (const x of data) {
            const z = (x - mean) / std;
            m3 += Math.pow(z, 3);
            m4 += Math.pow(z, 4);
        }

        const skewness = m3 / n;
        const kurtosis = m4 / n;
        const excess_kurtosis = kurtosis - 3;

        // Jarque-Bera test
        const jb = (n / 6) * (skewness * skewness + 0.25 * excess_kurtosis * excess_kurtosis);

        // Determine tail heaviness
        let tail_heaviness: 'light' | 'normal' | 'heavy' | 'very_heavy';
        if (excess_kurtosis < -0.5) tail_heaviness = 'light';
        else if (excess_kurtosis < 1) tail_heaviness = 'normal';
        else if (excess_kurtosis < 5) tail_heaviness = 'heavy';
        else tail_heaviness = 'very_heavy';

        return {
            kurtosis,
            excess_kurtosis,
            jarque_bera_stat: jb,
            is_normal_rejected: jb > 5.99, // chi2(2) at 5%
            tail_heaviness
        };
    }

    // =============================================
    // Helper Methods
    // =============================================

    private variance(data: number[]): number {
        const m = this.mean(data);
        return data.reduce((acc, x) => acc + (x - m) ** 2, 0) / (data.length - 1);
    }

    private normalQuantile(p: number): number {
        // Approximation of inverse normal CDF
        const a = [
            -3.969683028665376e+01,
            2.209460984245205e+02,
            -2.759285104469687e+02,
            1.383577518672690e+02,
            -3.066479806614716e+01,
            2.506628277459239e+00
        ];
        const b = [
            -5.447609879822406e+01,
            1.615858368580409e+02,
            -1.556989798598866e+02,
            6.680131188771972e+01,
            -1.328068155288572e+01
        ];
        const c = [
            -7.784894002430293e-03,
            -3.223964580411365e-01,
            -2.400758277161838e+00,
            -2.549732539343734e+00,
            4.374664141464968e+00,
            2.938163982698783e+00
        ];
        const d = [
            7.784695709041462e-03,
            3.224671290700398e-01,
            2.445134137142996e+00,
            3.754408661907416e+00
        ];

        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        let q: number, r: number;

        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        } else if (p <= pHigh) {
            q = p - 0.5;
            r = q * q;
            return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
                (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        }
    }
}

export const tailRiskAnalyzerAgent = new TailRiskAnalyzerAgent();
