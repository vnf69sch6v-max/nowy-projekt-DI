// @ts-nocheck
// =============================================
// Agent 7: Copula Optimizer
// Selects and calibrates optimal copula for dependencies
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    CopulaFit
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface CopulaOptimizerInput {
    series_a: number[];
    series_b: number[];
    variable_names: [string, string];
    copulas_to_test?: CopulaFamily[];
}

export type CopulaFamily = 'gaussian' | 'clayton' | 'gumbel' | 'student_t' | 'frank';

export interface CopulaOptimizerOutput {
    recommended_copula: CopulaFamily;
    ranking: CopulaFitResult[];
    tail_dependence: TailDependenceResult;
    correlation_measures: CorrelationMeasures;
    interpretation: string;
}

export interface CopulaFitResult {
    family: CopulaFamily;
    parameters: Record<string, number>;
    aic: number;
    bic: number;
    tail_lower: number;
    tail_upper: number;
    rank: number;
}

export interface TailDependenceResult {
    lambda_lower: number;
    lambda_upper: number;
    is_asymmetric: boolean;
    tail_type: 'none' | 'lower' | 'upper' | 'both';
}

export interface CorrelationMeasures {
    pearson: number;
    spearman: number;
    kendall_tau: number;
}

// =============================================
// Agent Implementation
// =============================================

export class CopulaOptimizerAgent extends BaseAgent<CopulaOptimizerInput, CopulaOptimizerOutput> {
    readonly id: AgentId = 'agent-copula-optimizer';
    readonly name = 'Copula Optimizer';
    readonly category: AgentCategory = 'models';
    readonly description = 'Wybiera i kalibruje optymalną kopułę';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    protected async run(
        input: CopulaOptimizerInput,
        context: AgentContext
    ): Promise<CopulaOptimizerOutput> {
        const { series_a, series_b, variable_names } = input;
        const copulasToTest = input.copulas_to_test ||
            ['gaussian', 'clayton', 'gumbel', 'student_t', 'frank'];

        context.log(`[${this.id}] Optimizing copula for ${variable_names[0]} × ${variable_names[1]}`);

        // Convert to uniform marginals (pseudo-observations)
        const u = this.toUniform(series_a);
        const v = this.toUniform(series_b);

        // Compute correlation measures
        const correlation_measures = this.computeCorrelationMeasures(series_a, series_b);

        // Fit all copulas
        const fits: CopulaFitResult[] = [];

        for (const family of copulasToTest) {
            const fit = this.fitCopula(u, v, family, correlation_measures.kendall_tau);
            fits.push(fit);
        }

        // Rank by AIC
        fits.sort((a, b) => a.aic - b.aic);
        fits.forEach((f, i) => { f.rank = i + 1; });

        const best = fits[0];

        // Compute overall tail dependence
        const tail_dependence: TailDependenceResult = {
            lambda_lower: best.tail_lower,
            lambda_upper: best.tail_upper,
            is_asymmetric: Math.abs(best.tail_lower - best.tail_upper) > 0.05,
            tail_type: this.getTailType(best.tail_lower, best.tail_upper)
        };

        // Generate interpretation
        let interpretation = `Kopuła ${best.family} najlepiej opisuje zależność.`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Zinterpretuj wybór kopuły (max 3 zdania):
                    - Zmienne: ${variable_names.join(' i ')}
                    - Wybrana kopuła: ${best.family}
                    - Kendall tau: ${correlation_measures.kendall_tau.toFixed(3)}
                    - Tail dependence (lower): ${tail_dependence.lambda_lower.toFixed(3)}
                    - Tail dependence (upper): ${tail_dependence.lambda_upper.toFixed(3)}
                    
                    Co to oznacza dla modelowania zależności?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            recommended_copula: best.family,
            ranking: fits,
            tail_dependence,
            correlation_measures,
            interpretation
        };
    }

    // =============================================
    // Copula Fitting
    // =============================================

    private fitCopula(
        u: number[],
        v: number[],
        family: CopulaFamily,
        tau: number
    ): CopulaFitResult {
        const n = u.length;
        let parameters: Record<string, number>;
        let logLik: number;
        let tail_lower = 0;
        let tail_upper = 0;

        switch (family) {
            case 'gaussian':
                const rho = Math.sin(Math.PI * tau / 2);
                parameters = { rho };
                logLik = this.gaussianCopulaLogLik(u, v, rho);
                break;

            case 'clayton':
                const theta_c = Math.max(0.01, 2 * tau / (1 - tau));
                parameters = { theta: theta_c };
                logLik = this.claytonCopulaLogLik(u, v, theta_c);
                tail_lower = Math.pow(2, -1 / theta_c);
                break;

            case 'gumbel':
                const theta_g = Math.max(1, 1 / (1 - tau));
                parameters = { theta: theta_g };
                logLik = this.gumbelCopulaLogLik(u, v, theta_g);
                tail_upper = 2 - Math.pow(2, 1 / theta_g);
                break;

            case 'student_t':
                const rho_t = Math.sin(Math.PI * tau / 2);
                const nu = 4; // Fixed degrees of freedom (can be estimated)
                parameters = { rho: rho_t, nu };
                logLik = this.studentTCopulaLogLik(u, v, rho_t, nu);
                tail_lower = tail_upper = this.studentTTailDep(rho_t, nu);
                break;

            case 'frank':
                const theta_f = this.frankThetaFromTau(tau);
                parameters = { theta: theta_f };
                logLik = this.frankCopulaLogLik(u, v, theta_f);
                break;

            default:
                parameters = {};
                logLik = 0;
        }

        const k = Object.keys(parameters).length;

        return {
            family,
            parameters,
            aic: 2 * k - 2 * logLik,
            bic: k * Math.log(n) - 2 * logLik,
            tail_lower,
            tail_upper,
            rank: 0
        };
    }

    // =============================================
    // Log-Likelihood Functions (simplified)
    // =============================================

    private gaussianCopulaLogLik(u: number[], v: number[], rho: number): number {
        if (Math.abs(rho) >= 1) return -Infinity;

        const n = u.length;
        let ll = -n / 2 * Math.log(1 - rho * rho);

        for (let i = 0; i < n; i++) {
            const x = this.normalQuantile(Math.max(0.001, Math.min(0.999, u[i])));
            const y = this.normalQuantile(Math.max(0.001, Math.min(0.999, v[i])));
            ll -= (rho * rho * (x * x + y * y) - 2 * rho * x * y) / (2 * (1 - rho * rho));
        }

        return ll;
    }

    private claytonCopulaLogLik(u: number[], v: number[], theta: number): number {
        if (theta <= 0) return -Infinity;

        let ll = 0;
        for (let i = 0; i < u.length; i++) {
            const ui = Math.max(0.001, u[i]);
            const vi = Math.max(0.001, v[i]);
            ll += Math.log(1 + theta);
            ll += -(1 + theta) * Math.log(ui);
            ll += -(1 + theta) * Math.log(vi);
            ll += -(2 + 1 / theta) * Math.log(Math.pow(ui, -theta) + Math.pow(vi, -theta) - 1);
        }

        return ll;
    }

    private gumbelCopulaLogLik(u: number[], v: number[], theta: number): number {
        if (theta < 1) return -Infinity;

        let ll = 0;
        for (let i = 0; i < u.length; i++) {
            const ui = Math.max(0.001, Math.min(0.999, u[i]));
            const vi = Math.max(0.001, Math.min(0.999, v[i]));
            const lu = -Math.log(ui);
            const lv = -Math.log(vi);
            const A = Math.pow(Math.pow(lu, theta) + Math.pow(lv, theta), 1 / theta);

            ll -= A;
            ll += Math.log(A + theta - 1);
            ll += (theta - 1) * (Math.log(lu) + Math.log(lv));
            ll += (1 / theta - 2) * Math.log(Math.pow(lu, theta) + Math.pow(lv, theta));
            ll -= Math.log(ui * vi);
        }

        return ll;
    }

    private studentTCopulaLogLik(u: number[], v: number[], rho: number, nu: number): number {
        // Simplified - use Gaussian as approximation
        return this.gaussianCopulaLogLik(u, v, rho) * 0.95;
    }

    private frankCopulaLogLik(u: number[], v: number[], theta: number): number {
        if (Math.abs(theta) < 0.001) return -Infinity;

        let ll = 0;
        for (let i = 0; i < u.length; i++) {
            const ui = u[i];
            const vi = v[i];
            const et = Math.exp(-theta);
            const etu = Math.exp(-theta * ui);
            const etv = Math.exp(-theta * vi);

            const num = -theta * (1 - et) * etu * etv;
            const den = Math.pow((1 - et) - (1 - etu) * (1 - etv), 2);

            if (den > 0) {
                ll += Math.log(Math.abs(num / den));
            }
        }

        return ll;
    }

    // =============================================
    // Helper Methods
    // =============================================

    private toUniform(data: number[]): number[] {
        const n = data.length;
        const sorted = [...data].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
        const ranks = new Array(n);

        sorted.forEach((item, rank) => {
            ranks[item.i] = (rank + 1) / (n + 1);
        });

        return ranks;
    }

    private computeCorrelationMeasures(x: number[], y: number[]): CorrelationMeasures {
        const n = x.length;
        const meanX = this.mean(x);
        const meanY = this.mean(y);
        const stdX = this.std(x);
        const stdY = this.std(y);

        // Pearson
        let pearson = 0;
        for (let i = 0; i < n; i++) {
            pearson += (x[i] - meanX) * (y[i] - meanY);
        }
        pearson /= (n - 1) * stdX * stdY;

        // Spearman (on ranks)
        const rankX = this.toUniform(x);
        const rankY = this.toUniform(y);
        let spearman = 0;
        const meanRankX = this.mean(rankX);
        const meanRankY = this.mean(rankY);
        for (let i = 0; i < n; i++) {
            spearman += (rankX[i] - meanRankX) * (rankY[i] - meanRankY);
        }
        spearman /= (n - 1) * this.std(rankX) * this.std(rankY);

        // Kendall tau (simplified)
        let concordant = 0;
        let discordant = 0;
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                const sign = (x[i] - x[j]) * (y[i] - y[j]);
                if (sign > 0) concordant++;
                else if (sign < 0) discordant++;
            }
        }
        const kendall_tau = (concordant - discordant) / (n * (n - 1) / 2);

        return { pearson, spearman, kendall_tau };
    }

    private studentTTailDep(rho: number, nu: number): number {
        // Approximate tail dependence for Student-t copula
        const t = Math.sqrt((nu + 1) * (1 - rho) / (1 + rho));
        return 2 * (1 - this.normalCDF(t));
    }

    private frankThetaFromTau(tau: number): number {
        // Approximate inversion
        return tau * 5.736;
    }

    private getTailType(lower: number, upper: number): 'none' | 'lower' | 'upper' | 'both' {
        const threshold = 0.01;
        const hasLower = lower > threshold;
        const hasUpper = upper > threshold;

        if (hasLower && hasUpper) return 'both';
        if (hasLower) return 'lower';
        if (hasUpper) return 'upper';
        return 'none';
    }

    private normalQuantile(p: number): number {
        const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
            1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
            6.680131188771972e+01, -1.328068155288572e+01];

        const q = p - 0.5;
        const r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }

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

export const copulaOptimizerAgent = new CopulaOptimizerAgent();
