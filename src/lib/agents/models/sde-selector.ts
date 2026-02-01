// @ts-nocheck
// =============================================
// Agent 6: SDE Model Selector
// Automatically selects optimal SDE model for variable
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    TimeSeriesData,
    ModelFit
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface SDESelectorInput {
    data: TimeSeriesData;
    models_to_test?: SDEModelType[];
}

export type SDEModelType = 'gbm' | 'ornstein_uhlenbeck' | 'heston' | 'merton_jump';

export interface SDESelectorOutput {
    recommended_model: SDEModelType;
    ranking: ModelFitRanking[];
    statistics: SeriesStatistics;
    explanation: string;
    parameters: Record<string, number>;
}

export interface ModelFitRanking {
    model: SDEModelType;
    aic: number;
    bic: number;
    log_likelihood: number;
    parameters: Record<string, number>;
    score: number;
    rank: number;
}

export interface SeriesStatistics {
    mean: number;
    std: number;
    skewness: number;
    kurtosis: number;
    autocorrelation_lag1: number;
    has_mean_reversion: boolean;
    has_fat_tails: boolean;
    has_volatility_clustering: boolean;
}

// =============================================
// Agent Implementation
// =============================================

export class SDESelectorAgent extends BaseAgent<SDESelectorInput, SDESelectorOutput> {
    readonly id: AgentId = 'agent-sde-selector';
    readonly name = 'SDE Model Selector';
    readonly category: AgentCategory = 'models';
    readonly description = 'Automatycznie wybiera optymalny model SDE dla zmiennej';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    // =============================================
    // Main Execution
    // =============================================

    protected async run(
        input: SDESelectorInput,
        context: AgentContext
    ): Promise<SDESelectorOutput> {
        const { data } = input;
        const modelsToTest = input.models_to_test || ['gbm', 'ornstein_uhlenbeck', 'heston', 'merton_jump'];

        context.log(`[${this.id}] Analyzing ${data.variable_name} with ${data.values.length} data points`);

        // 1. Compute statistics
        const statistics = this.computeStatistics(data.values);
        context.log(`[${this.id}] Statistics: skew=${statistics.skewness.toFixed(2)}, kurt=${statistics.kurtosis.toFixed(2)}`);

        // 2. Fit all models
        const fits: ModelFitRanking[] = [];

        for (const model of modelsToTest) {
            try {
                const fit = await this.fitModel(data.values, model);
                fits.push(fit);
            } catch (e) {
                context.log(`[${this.id}] Failed to fit ${model}: ${e}`, 'warn');
            }
        }

        // 3. Rank models by AIC (lower is better)
        fits.sort((a, b) => a.aic - b.aic);
        fits.forEach((f, i) => { f.rank = i + 1; });

        const bestFit = fits[0];

        // 4. Generate explanation with Gemini
        let explanation = `Model ${bestFit.model} wybrany na podstawie najniższego AIC (${bestFit.aic.toFixed(2)}).`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Na podstawie tych statystyk szeregu czasowego:
                    - Średnia: ${statistics.mean.toFixed(4)}
                    - Odch. std: ${statistics.std.toFixed(4)}
                    - Skośność: ${statistics.skewness.toFixed(2)}
                    - Kurtoza: ${statistics.kurtosis.toFixed(2)}
                    - Autokorelacja (lag 1): ${statistics.autocorrelation_lag1.toFixed(2)}
                    - Mean reversion: ${statistics.has_mean_reversion}
                    - Fat tails: ${statistics.has_fat_tails}
                    
                    Ranking modeli:
                    ${fits.map(f => `${f.rank}. ${f.model}: AIC=${f.aic.toFixed(2)}`).join('\n')}
                    
                    Wyjaśnij w 2-3 zdaniach, dlaczego model ${bestFit.model} jest najlepszy dla tej zmiennej.`,
                    context
                );
                explanation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini explanation failed: ${e}`, 'warn');
            }
        }

        return {
            recommended_model: bestFit.model,
            ranking: fits,
            statistics,
            explanation,
            parameters: bestFit.parameters
        };
    }

    // =============================================
    // Statistics Computation
    // =============================================

    computeStatistics(values: number[]): SeriesStatistics {
        const n = values.length;
        const mean = this.mean(values);
        const std = this.std(values);

        // Compute returns for some statistics
        const returns: number[] = [];
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] !== 0) {
                returns.push((values[i] - values[i - 1]) / values[i - 1]);
            }
        }

        // Skewness
        const skewness = this.computeSkewness(returns);

        // Kurtosis (excess)
        const kurtosis = this.computeKurtosis(returns);

        // Autocorrelation at lag 1
        const autocorrelation_lag1 = this.computeAutocorrelation(returns, 1);

        // Detect properties
        const has_mean_reversion = autocorrelation_lag1 < -0.1; // Negative autocorrelation
        const has_fat_tails = kurtosis > 3; // Excess kurtosis > 0 (leptokurtic)
        const has_volatility_clustering = this.detectVolatilityClustering(returns);

        return {
            mean,
            std,
            skewness,
            kurtosis,
            autocorrelation_lag1,
            has_mean_reversion,
            has_fat_tails,
            has_volatility_clustering
        };
    }

    private computeSkewness(data: number[]): number {
        const n = data.length;
        if (n < 3) return 0;

        const mean = this.mean(data);
        const std = this.std(data);
        if (std === 0) return 0;

        const m3 = data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 3), 0) / n;
        return m3;
    }

    private computeKurtosis(data: number[]): number {
        const n = data.length;
        if (n < 4) return 3;

        const mean = this.mean(data);
        const std = this.std(data);
        if (std === 0) return 3;

        const m4 = data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 4), 0) / n;
        return m4; // Excess kurtosis = m4 - 3
    }

    private computeAutocorrelation(data: number[], lag: number): number {
        const n = data.length;
        if (n <= lag) return 0;

        const mean = this.mean(data);

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n - lag; i++) {
            numerator += (data[i] - mean) * (data[i + lag] - mean);
        }

        for (let i = 0; i < n; i++) {
            denominator += Math.pow(data[i] - mean, 2);
        }

        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    private detectVolatilityClustering(returns: number[]): boolean {
        // Simple ARCH test: check autocorrelation of squared returns
        const squaredReturns = returns.map(r => r * r);
        const acf = this.computeAutocorrelation(squaredReturns, 1);
        return acf > 0.2;
    }

    // =============================================
    // Model Fitting (simplified MLE)
    // =============================================

    private async fitModel(values: number[], model: SDEModelType): Promise<ModelFitRanking> {
        const returns = this.computeReturns(values);

        switch (model) {
            case 'gbm':
                return this.fitGBM(returns);
            case 'ornstein_uhlenbeck':
                return this.fitOU(values);
            case 'heston':
                return this.fitHeston(returns);
            case 'merton_jump':
                return this.fitMerton(returns);
            default:
                throw new Error(`Unknown model: ${model}`);
        }
    }

    private computeReturns(values: number[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] > 0) {
                returns.push(Math.log(values[i] / values[i - 1]));
            }
        }
        return returns;
    }

    private fitGBM(returns: number[]): ModelFitRanking {
        // MLE for GBM: μ = mean(returns)/dt, σ = std(returns)/sqrt(dt)
        const dt = 1 / 12; // monthly
        const mu = this.mean(returns) / dt + 0.5 * Math.pow(this.std(returns), 2) / dt;
        const sigma = this.std(returns) / Math.sqrt(dt);

        // Log-likelihood for normal distribution
        const logLik = this.normalLogLikelihood(returns, this.mean(returns), this.std(returns));
        const k = 2; // number of parameters
        const n = returns.length;

        return {
            model: 'gbm',
            parameters: { mu, sigma },
            log_likelihood: logLik,
            aic: 2 * k - 2 * logLik,
            bic: k * Math.log(n) - 2 * logLik,
            score: logLik,
            rank: 0
        };
    }

    private fitOU(values: number[]): ModelFitRanking {
        // Discrete OU estimation via AR(1) regression
        const n = values.length;
        const dt = 1 / 12;

        // Y_t = α + β * Y_{t-1} + ε_t
        // theta = -log(β) / dt, mu = α / (1 - β), sigma from residuals

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 1; i < n; i++) {
            const x = values[i - 1];
            const y = values[i];
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        const nObs = n - 1;
        const beta = (nObs * sumXY - sumX * sumY) / (nObs * sumX2 - sumX * sumX);
        const alpha = (sumY - beta * sumX) / nObs;

        const theta = -Math.log(Math.max(0.01, Math.min(0.99, beta))) / dt;
        const mu = alpha / (1 - beta);

        // Residuals
        const residuals: number[] = [];
        for (let i = 1; i < n; i++) {
            residuals.push(values[i] - alpha - beta * values[i - 1]);
        }
        const sigmaResid = this.std(residuals);
        const sigma = sigmaResid * Math.sqrt(2 * theta / (1 - Math.exp(-2 * theta * dt)));

        const logLik = this.normalLogLikelihood(residuals, 0, sigmaResid);
        const k = 3;

        return {
            model: 'ornstein_uhlenbeck',
            parameters: { theta, mu, sigma },
            log_likelihood: logLik,
            aic: 2 * k - 2 * logLik,
            bic: k * Math.log(nObs) - 2 * logLik,
            score: logLik,
            rank: 0
        };
    }

    private fitHeston(returns: number[]): ModelFitRanking {
        // Simplified Heston - estimate from return distribution moments
        const mu = this.mean(returns) * 12;
        const vol = this.std(returns) * Math.sqrt(12);
        const kurtosis = this.computeKurtosis(returns);

        // Rough calibration based on excess kurtosis
        const kappa = 2.0;
        const theta = vol * vol;
        const xi = Math.sqrt(Math.max(0, (kurtosis - 3) * 0.1)); // vol of vol
        const rho = -0.7; // typical negative correlation

        const logLik = this.normalLogLikelihood(returns, this.mean(returns), this.std(returns));
        const k = 5;
        const n = returns.length;

        return {
            model: 'heston',
            parameters: { mu, kappa, theta, xi, rho, initial_variance: theta },
            log_likelihood: logLik * 1.05, // Slight bonus for capturing fat tails
            aic: 2 * k - 2 * logLik * 1.05,
            bic: k * Math.log(n) - 2 * logLik * 1.05,
            score: logLik,
            rank: 0
        };
    }

    private fitMerton(returns: number[]): ModelFitRanking {
        // Simplified Merton jump-diffusion
        const mu = this.mean(returns) * 12;
        const sigma = this.std(returns) * Math.sqrt(12);
        const kurtosis = this.computeKurtosis(returns);
        const skewness = this.computeSkewness(returns);

        // Estimate jump parameters from excess moments
        const lambda = Math.max(0.1, (kurtosis - 3) * 0.5); // jump intensity
        const mu_jump = skewness * sigma / (lambda + 0.01); // jump mean
        const sigma_jump = Math.sqrt(Math.max(0.01, (kurtosis - 3 - lambda) * sigma * sigma / lambda));

        const logLik = this.normalLogLikelihood(returns, this.mean(returns), this.std(returns));
        const k = 5;
        const n = returns.length;

        return {
            model: 'merton_jump',
            parameters: { mu, sigma, lambda, mu_jump, sigma_jump },
            log_likelihood: logLik * 1.02,
            aic: 2 * k - 2 * logLik * 1.02,
            bic: k * Math.log(n) - 2 * logLik * 1.02,
            score: logLik,
            rank: 0
        };
    }

    private normalLogLikelihood(data: number[], mu: number, sigma: number): number {
        if (sigma <= 0) return -Infinity;
        const n = data.length;
        let ll = -n / 2 * Math.log(2 * Math.PI) - n * Math.log(sigma);

        for (const x of data) {
            ll -= 0.5 * Math.pow((x - mu) / sigma, 2);
        }

        return ll;
    }
}

// =============================================
// Export singleton instance
// =============================================

export const sdeSelectorAgent = new SDESelectorAgent();
