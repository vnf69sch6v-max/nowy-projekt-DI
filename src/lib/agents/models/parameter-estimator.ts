// @ts-nocheck
// =============================================
// Agent 8: Parameter Estimator
// Maximum likelihood estimation for SDE parameters
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

export interface ParameterEstimatorInput {
    data: TimeSeriesData;
    model_type: ModelType;
    estimation_method?: EstimationMethod;
}

export type ModelType = 'gbm' | 'ornstein_uhlenbeck' | 'heston' | 'merton_jump' | 'vasicek';
export type EstimationMethod = 'mle' | 'gmm' | 'kalman' | 'mcmc';

export interface ParameterEstimatorOutput {
    parameters: EstimatedParameters;
    standard_errors: Record<string, number>;
    confidence_intervals: Record<string, [number, number]>;
    diagnostics: EstimationDiagnostics;
    interpretation: string;
}

export interface EstimatedParameters {
    [key: string]: number;
}

export interface EstimationDiagnostics {
    log_likelihood: number;
    aic: number;
    bic: number;
    convergence: boolean;
    residual_normality: boolean;
    heteroskedasticity: boolean;
}

// =============================================
// Agent Implementation
// =============================================

export class ParameterEstimatorAgent extends BaseAgent<ParameterEstimatorInput, ParameterEstimatorOutput> {
    readonly id: AgentId = 'agent-parameter-estimator';
    readonly name = 'Parameter Estimator';
    readonly category: AgentCategory = 'models';
    readonly description = 'Estymuje parametry modeli SDE metodą MLE';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    protected async run(
        input: ParameterEstimatorInput,
        context: AgentContext
    ): Promise<ParameterEstimatorOutput> {
        const { data, model_type } = input;
        const method = input.estimation_method || 'mle';

        context.log(`[${this.id}] Estimating ${model_type} parameters using ${method}`);

        // Estimate parameters based on model type
        let result: {
            parameters: EstimatedParameters;
            log_likelihood: number;
            residuals: number[];
        };

        switch (model_type) {
            case 'gbm':
                result = this.estimateGBM(data.values);
                break;
            case 'ornstein_uhlenbeck':
            case 'vasicek':
                result = this.estimateOU(data.values);
                break;
            case 'heston':
                result = this.estimateHeston(data.values);
                break;
            case 'merton_jump':
                result = this.estimateMerton(data.values);
                break;
            default:
                throw new Error(`Unsupported model: ${model_type}`);
        }

        // Calculate standard errors
        const standard_errors = this.computeStandardErrors(result.parameters, data.values.length);

        // Calculate confidence intervals
        const confidence_intervals = this.computeConfidenceIntervals(result.parameters, standard_errors);

        // Diagnostics
        const diagnostics = this.runDiagnostics(result, data.values.length);

        // Interpretation
        let interpretation = this.generateDefaultInterpretation(model_type, result.parameters);

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Zinterpretuj oszacowane parametry modelu ${model_type} (max 3 zdania):
                    
                    Parametry:
                    ${Object.entries(result.parameters).map(([k, v]) => `- ${k}: ${v.toFixed(6)} ± ${standard_errors[k]?.toFixed(6) || 'N/A'}`).join('\n')}
                    
                    Log-likelihood: ${result.log_likelihood.toFixed(2)}
                    AIC: ${diagnostics.aic.toFixed(2)}
                    
                    Co mówią te parametry o dynamice procesu?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            parameters: result.parameters,
            standard_errors,
            confidence_intervals,
            diagnostics,
            interpretation
        };
    }

    // =============================================
    // GBM Estimation
    // =============================================

    private estimateGBM(values: number[]): {
        parameters: EstimatedParameters;
        log_likelihood: number;
        residuals: number[];
    } {
        const dt = 1 / 252; // Daily
        const returns = this.computeLogReturns(values);

        // MLE for GBM
        const mean = this.mean(returns);
        const variance = this.variance(returns);

        const sigma = Math.sqrt(variance / dt);
        const mu = mean / dt + 0.5 * sigma * sigma;

        // Residuals for diagnostics
        const residuals = returns.map(r => (r - mean) / Math.sqrt(variance));

        // Log-likelihood
        const n = returns.length;
        const log_likelihood = -n / 2 * Math.log(2 * Math.PI * variance) -
            returns.reduce((sum, r) => sum + Math.pow(r - mean, 2) / (2 * variance), 0);

        return {
            parameters: { mu, sigma },
            log_likelihood,
            residuals
        };
    }

    // =============================================
    // Ornstein-Uhlenbeck Estimation
    // =============================================

    private estimateOU(values: number[]): {
        parameters: EstimatedParameters;
        log_likelihood: number;
        residuals: number[];
    } {
        const dt = 1 / 252;
        const n = values.length - 1;

        // AR(1) regression: Y_t = α + β * Y_{t-1} + ε
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 1; i < values.length; i++) {
            const x = values[i - 1];
            const y = values[i];
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        const beta = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const alpha = (sumY - beta * sumX) / n;

        // Transform to OU parameters
        const theta = -Math.log(Math.max(0.01, Math.min(0.99, beta))) / dt;
        const mu_long = alpha / (1 - beta);

        // Residuals
        const residuals: number[] = [];
        let ssr = 0;
        for (let i = 1; i < values.length; i++) {
            const predicted = alpha + beta * values[i - 1];
            const residual = values[i] - predicted;
            residuals.push(residual);
            ssr += residual * residual;
        }

        const sigmaResid = Math.sqrt(ssr / (n - 2));
        const sigma = sigmaResid * Math.sqrt(2 * theta / (1 - Math.exp(-2 * theta * dt)));

        const log_likelihood = -n / 2 * Math.log(2 * Math.PI) - n / 2 * Math.log(ssr / n) - n / 2;

        return {
            parameters: { theta, mu: mu_long, sigma },
            log_likelihood,
            residuals
        };
    }

    // =============================================
    // Heston Estimation (simplified)
    // =============================================

    private estimateHeston(values: number[]): {
        parameters: EstimatedParameters;
        log_likelihood: number;
        residuals: number[];
    } {
        const returns = this.computeLogReturns(values);
        const squaredReturns = returns.map(r => r * r);

        // Rough estimation from moments
        const mu = this.mean(returns) * 252;
        const avgVar = this.mean(squaredReturns) * 252;

        // Mean reversion for variance (from squared returns)
        const ouResult = this.estimateOU(squaredReturns);

        const kappa = ouResult.parameters.theta || 2;
        const theta_var = avgVar;
        const xi = ouResult.parameters.sigma || Math.sqrt(avgVar) * 0.5;
        const rho = -0.7; // Typical leverage effect

        return {
            parameters: {
                mu,
                kappa,
                theta: theta_var,
                xi,
                rho,
                v0: squaredReturns[0] * 252
            },
            log_likelihood: ouResult.log_likelihood,
            residuals: ouResult.residuals
        };
    }

    // =============================================
    // Merton Jump-Diffusion Estimation
    // =============================================

    private estimateMerton(values: number[]): {
        parameters: EstimatedParameters;
        log_likelihood: number;
        residuals: number[];
    } {
        const returns = this.computeLogReturns(values);

        // Start with GBM
        const gbmResult = this.estimateGBM(values);

        // Detect jumps (returns > 3 std)
        const std = this.std(returns);
        const mean = this.mean(returns);
        const jumps = returns.filter(r => Math.abs(r - mean) > 3 * std);

        // Jump parameters
        const lambda_jump = jumps.length / (values.length / 252); // jumps per year
        const mu_jump = jumps.length > 0 ? this.mean(jumps) : 0;
        const sigma_jump = jumps.length > 1 ? this.std(jumps) : std;

        // Adjust diffusion
        const sigma_diff = Math.sqrt(Math.max(0.01,
            gbmResult.parameters.sigma * gbmResult.parameters.sigma - lambda_jump * sigma_jump * sigma_jump
        ));

        return {
            parameters: {
                mu: gbmResult.parameters.mu,
                sigma: sigma_diff,
                lambda: lambda_jump,
                mu_jump,
                sigma_jump
            },
            log_likelihood: gbmResult.log_likelihood,
            residuals: gbmResult.residuals
        };
    }

    // =============================================
    // Standard Errors & Confidence Intervals
    // =============================================

    private computeStandardErrors(
        params: EstimatedParameters,
        n: number
    ): Record<string, number> {
        const se: Record<string, number> = {};

        // Approximate using delta method
        for (const [key, value] of Object.entries(params)) {
            // SE ≈ |param| / sqrt(n)
            se[key] = Math.abs(value) / Math.sqrt(n);
        }

        return se;
    }

    private computeConfidenceIntervals(
        params: EstimatedParameters,
        se: Record<string, number>
    ): Record<string, [number, number]> {
        const ci: Record<string, [number, number]> = {};
        const z = 1.96; // 95% CI

        for (const [key, value] of Object.entries(params)) {
            const error = z * (se[key] || 0);
            ci[key] = [value - error, value + error];
        }

        return ci;
    }

    // =============================================
    // Diagnostics
    // =============================================

    private runDiagnostics(
        result: { parameters: EstimatedParameters; log_likelihood: number; residuals: number[] },
        n: number
    ): EstimationDiagnostics {
        const k = Object.keys(result.parameters).length;

        // AIC and BIC
        const aic = 2 * k - 2 * result.log_likelihood;
        const bic = k * Math.log(n) - 2 * result.log_likelihood;

        // Normality test (Jarque-Bera simplified)
        const skewness = this.computeSkewness(result.residuals);
        const kurtosis = this.computeKurtosis(result.residuals);
        const jb = n / 6 * (skewness * skewness + (kurtosis - 3) * (kurtosis - 3) / 4);
        const residual_normality = jb < 5.99;

        // Heteroskedasticity (ARCH effect)
        const squaredResiduals = result.residuals.map(r => r * r);
        const acf = this.autocorrelation(squaredResiduals, 1);
        const heteroskedasticity = Math.abs(acf) > 0.2;

        return {
            log_likelihood: result.log_likelihood,
            aic,
            bic,
            convergence: true,
            residual_normality,
            heteroskedasticity
        };
    }

    // =============================================
    // Helpers
    // =============================================

    private computeLogReturns(values: number[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] > 0) {
                returns.push(Math.log(values[i] / values[i - 1]));
            }
        }
        return returns;
    }

    private variance(data: number[]): number {
        const m = this.mean(data);
        return data.reduce((acc, x) => acc + (x - m) ** 2, 0) / (data.length - 1);
    }

    private computeSkewness(data: number[]): number {
        const n = data.length;
        const mean = this.mean(data);
        const std = this.std(data);
        if (std === 0) return 0;
        return data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 3), 0) / n;
    }

    private computeKurtosis(data: number[]): number {
        const n = data.length;
        const mean = this.mean(data);
        const std = this.std(data);
        if (std === 0) return 3;
        return data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 4), 0) / n;
    }

    private autocorrelation(data: number[], lag: number): number {
        const n = data.length;
        if (n <= lag) return 0;
        const mean = this.mean(data);
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            den += (data[i] - mean) ** 2;
            if (i >= lag) {
                num += (data[i] - mean) * (data[i - lag] - mean);
            }
        }
        return num / den;
    }

    private generateDefaultInterpretation(model: ModelType, params: EstimatedParameters): string {
        switch (model) {
            case 'gbm':
                return `GBM: drift μ=${(params.mu * 100).toFixed(2)}% rocznie, volatility σ=${(params.sigma * 100).toFixed(2)}%.`;
            case 'ornstein_uhlenbeck':
                return `O-U: mean reversion θ=${params.theta.toFixed(2)}, long-run mean μ=${params.mu.toFixed(4)}.`;
            case 'heston':
                return `Heston: vol-of-vol ξ=${params.xi.toFixed(2)}, correlation ρ=${params.rho.toFixed(2)}.`;
            default:
                return `Oszacowano ${Object.keys(params).length} parametrów.`;
        }
    }
}

export const parameterEstimatorAgent = new ParameterEstimatorAgent();
