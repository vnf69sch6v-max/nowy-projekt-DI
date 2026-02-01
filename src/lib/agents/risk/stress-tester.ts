// =============================================
// Agent 12: Stress Tester
// Stress testing scenarios and sensitivity analysis
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

export interface StressTesterInput {
    base_probability: number;
    variables: VariableConfig[];
    scenario?: StressScenario;
    custom_shocks?: Record<string, number>;
}

export interface VariableConfig {
    name: string;
    current_value: number;
    historical_std: number;
    model_type: string;
}

export interface StressScenario {
    name: string;
    description: string;
    shocks: Record<string, number>; // variable_name -> shock multiplier
}

export interface StressTesterOutput {
    scenarios_tested: ScenarioResult[];
    sensitivity_analysis: SensitivityResult[];
    worst_case: {
        scenario: string;
        probability: number;
        change_from_base: number;
    };
    recommendations: string[];
}

export interface ScenarioResult {
    scenario_name: string;
    stressed_probability: number;
    change_from_base: number;
    change_pct: number;
    affected_variables: string[];
}

export interface SensitivityResult {
    variable: string;
    shock_pct: number;
    probability_impact: number;
    elasticity: number;
}

// =============================================
// Predefined Scenarios
// =============================================

const PREDEFINED_SCENARIOS: StressScenario[] = [
    {
        name: 'GFC 2008',
        description: 'Global Financial Crisis - extreme market stress',
        shocks: {
            'equity_index': -0.40,
            'volatility': 3.0,
            'credit_spread': 2.5,
            'gdp_growth': -0.08,
            'unemployment': 0.50,
            'interest_rate': -0.02
        }
    },
    {
        name: 'COVID-19 2020',
        description: 'Pandemic shock - sudden economic stop',
        shocks: {
            'equity_index': -0.35,
            'volatility': 4.0,
            'gdp_growth': -0.15,
            'unemployment': 1.0,
            'oil_price': -0.60,
            'consumer_spending': -0.30
        }
    },
    {
        name: 'Stagflation',
        description: 'High inflation + low growth',
        shocks: {
            'inflation': 0.08,
            'gdp_growth': -0.03,
            'interest_rate': 0.04,
            'equity_index': -0.20,
            'bond_yield': 0.03
        }
    },
    {
        name: 'Rate Shock',
        description: 'Sudden interest rate increase',
        shocks: {
            'interest_rate': 0.03,
            'bond_yield': 0.04,
            'equity_index': -0.15,
            'real_estate': -0.20,
            'credit_spread': 0.5
        }
    },
    {
        name: 'Currency Crisis',
        description: 'PLN depreciation shock',
        shocks: {
            'usd_pln': 0.30,
            'eur_pln': 0.25,
            'inflation': 0.05,
            'interest_rate': 0.03,
            'import_costs': 0.25
        }
    }
];

// =============================================
// Agent Implementation
// =============================================

export class StressTesterAgent extends BaseAgent<StressTesterInput, StressTesterOutput> {
    readonly id: AgentId = 'agent-stress-tester';
    readonly name = 'Stress Tester';
    readonly category: AgentCategory = 'risk';
    readonly description = 'Przeprowadza testy warunków skrajnych';
    readonly triggers: TriggerType[] = ['user_action', 'threshold_alert'];

    protected async run(
        input: StressTesterInput,
        context: AgentContext
    ): Promise<StressTesterOutput> {
        const { base_probability, variables } = input;

        context.log(`[${this.id}] Running stress tests from base probability ${(base_probability * 100).toFixed(1)}%`);

        // Run predefined scenarios
        const scenarios_tested: ScenarioResult[] = [];

        for (const scenario of PREDEFINED_SCENARIOS) {
            const result = this.runScenario(base_probability, variables, scenario);
            scenarios_tested.push(result);
        }

        // Run custom scenario if provided
        if (input.scenario) {
            const customResult = this.runScenario(base_probability, variables, input.scenario);
            scenarios_tested.push(customResult);
        }

        // Custom shocks
        if (input.custom_shocks) {
            const customScenario: StressScenario = {
                name: 'Custom',
                description: 'User-defined stress scenario',
                shocks: input.custom_shocks
            };
            scenarios_tested.push(this.runScenario(base_probability, variables, customScenario));
        }

        // Sensitivity analysis
        const sensitivity_analysis = this.runSensitivityAnalysis(base_probability, variables);

        // Find worst case
        const worst = scenarios_tested.reduce((max, s) =>
            s.stressed_probability > max.stressed_probability ? s : max
            , scenarios_tested[0]);

        // Generate recommendations
        const recommendations = this.generateRecommendations(scenarios_tested, sensitivity_analysis, context);

        return {
            scenarios_tested,
            sensitivity_analysis,
            worst_case: {
                scenario: worst.scenario_name,
                probability: worst.stressed_probability,
                change_from_base: worst.change_from_base
            },
            recommendations
        };
    }

    private runScenario(
        base_probability: number,
        variables: VariableConfig[],
        scenario: StressScenario
    ): ScenarioResult {
        let probabilityMultiplier = 1;
        const affectedVariables: string[] = [];

        for (const variable of variables) {
            const shock = scenario.shocks[variable.name.toLowerCase().replace(/\s+/g, '_')];
            if (shock !== undefined) {
                // Simplified impact calculation
                const impact = Math.abs(shock) * (1 + variable.historical_std);
                probabilityMultiplier *= (1 + impact * 0.5);
                affectedVariables.push(variable.name);
            }
        }

        // Apply multiplier but cap at reasonable bounds
        const stressed_probability = Math.min(0.99, Math.max(0.01, base_probability * probabilityMultiplier));
        const change_from_base = stressed_probability - base_probability;

        return {
            scenario_name: scenario.name,
            stressed_probability,
            change_from_base,
            change_pct: base_probability > 0 ? (change_from_base / base_probability) * 100 : 0,
            affected_variables: affectedVariables
        };
    }

    private runSensitivityAnalysis(
        base_probability: number,
        variables: VariableConfig[]
    ): SensitivityResult[] {
        const results: SensitivityResult[] = [];
        const shockLevels = [0.1, 0.25, 0.5]; // 10%, 25%, 50% shocks

        for (const variable of variables) {
            for (const shock_pct of shockLevels) {
                // Approximate probability impact
                const impact = shock_pct * variable.historical_std * 0.3;
                const stressed = Math.min(0.99, base_probability * (1 + impact));
                const probability_impact = stressed - base_probability;

                // Elasticity: % change in probability / % change in variable
                const elasticity = base_probability > 0
                    ? (probability_impact / base_probability) / shock_pct
                    : 0;

                results.push({
                    variable: variable.name,
                    shock_pct,
                    probability_impact,
                    elasticity
                });
            }
        }

        return results;
    }

    private generateRecommendations(
        scenarios: ScenarioResult[],
        sensitivity: SensitivityResult[],
        context: AgentContext
    ): string[] {
        const recommendations: string[] = [];

        // Find highest impact scenarios
        const highImpactScenarios = scenarios.filter(s => s.change_pct > 50);
        if (highImpactScenarios.length > 0) {
            recommendations.push(
                `Monitoruj scenariusze o wysokim wpływie: ${highImpactScenarios.map(s => s.scenario_name).join(', ')}`
            );
        }

        // Find most sensitive variables
        const highElasticity = sensitivity.filter(s => Math.abs(s.elasticity) > 1);
        const uniqueVars = [...new Set(highElasticity.map(s => s.variable))];
        if (uniqueVars.length > 0) {
            recommendations.push(
                `Zmienne o wysokiej wrażliwości: ${uniqueVars.join(', ')} - rozważ hedging`
            );
        }

        // General recommendations based on worst case
        const worst = scenarios.reduce((max, s) =>
            s.stressed_probability > max.stressed_probability ? s : max
            , scenarios[0]);

        if (worst.stressed_probability > 0.5) {
            recommendations.push(
                `UWAGA: W scenariuszu "${worst.scenario_name}" prawdopodobieństwo przekracza 50%`
            );
        }

        return recommendations;
    }
}

export const stressTesterAgent = new StressTesterAgent();
