// =============================================
// Agent 11: VaR Calculator
// Calculates Value at Risk using Monte Carlo
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    RiskMetrics
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface VaRCalculatorInput {
    scenarios: number[][]; // Matrix of simulated returns/values
    confidence_levels?: number[]; // Default: [0.95, 0.99]
    portfolio_value?: number;
    horizon_days?: number;
}

export interface VaRCalculatorOutput {
    var_95: number;
    var_99: number;
    es_95: number; // Expected Shortfall (CVaR)
    es_99: number;
    metrics: RiskMetrics;
    interpretation: string;
    breakdown?: VariableRiskBreakdown[];
}

export interface VariableRiskBreakdown {
    variable_name: string;
    marginal_var: number;
    component_var: number;
    contribution_pct: number;
}

// =============================================
// Agent Implementation
// =============================================

export class VaRCalculatorAgent extends BaseAgent<VaRCalculatorInput, VaRCalculatorOutput> {
    readonly id: AgentId = 'agent-var-calculator';
    readonly name = 'VaR Calculator';
    readonly category: AgentCategory = 'risk';
    readonly description = 'Oblicza Value at Risk metodą Monte Carlo';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    // =============================================
    // Main Execution
    // =============================================

    protected async run(
        input: VaRCalculatorInput,
        context: AgentContext
    ): Promise<VaRCalculatorOutput> {
        const confidenceLevels = input.confidence_levels || [0.95, 0.99];
        const portfolioValue = input.portfolio_value || 1000000; // Default 1M PLN
        const horizonDays = input.horizon_days || 1;

        context.log(`[${this.id}] Calculating VaR for ${input.scenarios.length} scenarios`);

        // Flatten scenarios to get portfolio losses
        const losses = this.computePortfolioLosses(input.scenarios);

        // Calculate VaR at different confidence levels
        const var_95 = this.computeHistoricalVaR(losses, 0.95);
        const var_99 = this.computeHistoricalVaR(losses, 0.99);

        // Calculate Expected Shortfall (CVaR)
        const es_95 = this.computeExpectedShortfall(losses, 0.95);
        const es_99 = this.computeExpectedShortfall(losses, 0.99);

        // Additional metrics
        const metrics = this.computeRiskMetrics(losses, portfolioValue);

        // Generate interpretation with Gemini
        let interpretation = `VaR(99%) = ${(var_99 * portfolioValue).toLocaleString('pl-PL')} PLN`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Zinterpretuj te metryki ryzyka dla portfela o wartości ${portfolioValue.toLocaleString()} PLN:
                    - VaR(95%): ${(var_95 * 100).toFixed(2)}%
                    - VaR(99%): ${(var_99 * 100).toFixed(2)}%
                    - ES(99%): ${(es_99 * 100).toFixed(2)}%
                    - Max Drawdown: ${(metrics.max_drawdown * 100).toFixed(2)}%
                    - Volatility: ${(metrics.volatility * 100).toFixed(2)}%
                    
                    Wyjaśnij co te liczby oznaczają dla zarządzającego ryzykiem. Max 3 zdania.`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini interpretation failed: ${e}`, 'warn');
            }
        }

        return {
            var_95,
            var_99,
            es_95,
            es_99,
            metrics,
            interpretation
        };
    }

    // =============================================
    // Portfolio Loss Computation
    // =============================================

    private computePortfolioLosses(scenarios: number[][]): number[] {
        if (scenarios.length === 0) return [];

        // If single variable - just flatten
        if (!Array.isArray(scenarios[0])) {
            return scenarios as unknown as number[];
        }

        // Multi-variable: sum across variables (equal weights for now)
        return scenarios.map(scenario => {
            if (Array.isArray(scenario)) {
                return scenario.reduce((sum, val) => sum + val, 0) / scenario.length;
            }
            return scenario as unknown as number;
        });
    }

    // =============================================
    // Historical VaR
    // =============================================

    computeHistoricalVaR(losses: number[], confidence: number): number {
        if (losses.length === 0) return 0;

        // Sort losses (negative = profit, positive = loss)
        const sorted = [...losses].sort((a, b) => b - a);

        // VaR is the loss at the (1-confidence) percentile
        const index = Math.floor((1 - confidence) * sorted.length);
        return sorted[index] || sorted[sorted.length - 1];
    }

    // =============================================
    // Parametric VaR (assuming normal distribution)
    // =============================================

    computeParametricVaR(mu: number, sigma: number, confidence: number): number {
        // z-score for confidence level
        const zScores: Record<number, number> = {
            0.90: 1.28,
            0.95: 1.645,
            0.99: 2.326,
            0.995: 2.576
        };

        const z = zScores[confidence] || 1.645;
        return mu + z * sigma;
    }

    // =============================================
    // Expected Shortfall (CVaR)
    // =============================================

    computeExpectedShortfall(losses: number[], confidence: number): number {
        if (losses.length === 0) return 0;

        const sorted = [...losses].sort((a, b) => b - a);
        const cutoffIndex = Math.floor((1 - confidence) * sorted.length);

        // Average of losses beyond VaR
        const tailLosses = sorted.slice(0, Math.max(1, cutoffIndex));
        return this.mean(tailLosses);
    }

    // =============================================
    // Additional Risk Metrics
    // =============================================

    computeRiskMetrics(losses: number[], portfolioValue: number): RiskMetrics {
        return {
            var_95: this.computeHistoricalVaR(losses, 0.95) * portfolioValue,
            var_99: this.computeHistoricalVaR(losses, 0.99) * portfolioValue,
            es_95: this.computeExpectedShortfall(losses, 0.95) * portfolioValue,
            es_99: this.computeExpectedShortfall(losses, 0.99) * portfolioValue,
            max_drawdown: this.computeMaxDrawdown(losses),
            volatility: this.std(losses)
        };
    }

    private computeMaxDrawdown(returns: number[]): number {
        if (returns.length === 0) return 0;

        // Convert returns to cumulative wealth
        let peak = 1;
        let maxDrawdown = 0;
        let cumulative = 1;

        for (const r of returns) {
            cumulative *= (1 + r);
            peak = Math.max(peak, cumulative);
            const drawdown = (peak - cumulative) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        return maxDrawdown;
    }

    // =============================================
    // Marginal VaR (contribution analysis)
    // =============================================

    computeMarginalVaR(
        portfolioScenarios: number[][],
        variableIndex: number,
        epsilon: number = 0.01
    ): number {
        // Compute VaR with and without small change in position
        const baseLosses = this.computePortfolioLosses(portfolioScenarios);
        const baseVaR = this.computeHistoricalVaR(baseLosses, 0.99);

        // Shock the variable
        const shockedScenarios = portfolioScenarios.map(scenario => {
            const shocked = [...scenario];
            shocked[variableIndex] *= (1 + epsilon);
            return shocked;
        });

        const shockedLosses = this.computePortfolioLosses(shockedScenarios);
        const shockedVaR = this.computeHistoricalVaR(shockedLosses, 0.99);

        return (shockedVaR - baseVaR) / epsilon;
    }

    // =============================================
    // Stress VaR (stressed scenarios)
    // =============================================

    computeStressVaR(
        scenarios: number[][],
        stressFactor: number = 2.0
    ): number {
        // Apply stress factor to volatility
        const stressedScenarios = scenarios.map(scenario =>
            scenario.map(val => val * stressFactor)
        );

        const losses = this.computePortfolioLosses(stressedScenarios);
        return this.computeHistoricalVaR(losses, 0.99);
    }
}

// =============================================
// Export singleton instance
// =============================================

export const varCalculatorAgent = new VaRCalculatorAgent();
