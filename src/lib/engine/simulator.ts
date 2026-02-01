// =============================================
// StochFin Monte Carlo Engine: Main Simulator
// Orchestrates the full Monte Carlo simulation
// =============================================

import { MersenneTwister } from './random';
import {
    simulateCorrelatedPaths,
    ProcessConfig,
    getTimeStepInYears,
    type TimeStepUnit
} from './processes';
import { choleskyDecomposition, isPositiveDefinite } from './correlation';
import { calculateStatistics, type SimulationStats } from './aggregator';

// =============================================
// Simulation Configuration
// =============================================

export interface SimulationConfig {
    nSimulations: number;
    horizonPeriods: number;
    timeStep: TimeStepUnit;
    randomSeed?: number;
    correlationMethod: 'cholesky' | 'copula_gaussian';
}

export interface VariableConfig {
    id: string;
    code: string;
    processConfig: ProcessConfig;
}

export interface SimulationInput {
    config: SimulationConfig;
    variables: VariableConfig[];
    correlationMatrix: number[][];
    covenants?: CovenantConfig[];
}

export interface CovenantConfig {
    id: string;
    name: string;
    variableCode: string;
    threshold: number;
    operator: '<' | '<=' | '>' | '>=' | '=';
}

// =============================================
// Simulation Results
// =============================================

export interface VariablePeriodResult {
    variableId: string;
    variableCode: string;
    periodIndex: number;
    stats: SimulationStats;
    rawScenarios?: number[];  // Optional - for detailed analysis
}

export interface CovenantPeriodResult {
    covenantId: string;
    covenantName: string;
    periodIndex: number;
    breachProbability: number;
    nBreachScenarios: number;
    avgBreachMagnitude?: number;
}

export interface SimulationResult {
    config: SimulationConfig;
    startedAt: Date;
    completedAt: Date;
    computeTimeMs: number;

    // Results by variable and period
    results: VariablePeriodResult[];

    // Covenant results
    covenantResults?: CovenantPeriodResult[];

    // Raw scenarios (if stored)
    scenariosByVariable?: Map<string, number[][]>;  // variableCode -> [period][scenario]
}

// =============================================
// Main Simulation Function
// =============================================

/**
 * Run full Monte Carlo simulation
 */
export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
    const startTime = Date.now();
    const { config, variables, correlationMatrix, covenants } = input;

    // Validate correlation matrix
    if (!isPositiveDefinite(correlationMatrix)) {
        throw new Error('Correlation matrix is not positive-definite');
    }

    // Initialize RNG
    const rng = new MersenneTwister(config.randomSeed ?? Date.now());

    // Time step in years
    const dt = getTimeStepInYears(config.timeStep);

    // Storage for all scenarios
    const allPaths: number[][][] = [];  // [simulation][variable][period]

    // Run simulations
    for (let sim = 0; sim < config.nSimulations; sim++) {
        // Generate correlated paths for all variables
        const paths = simulateCorrelatedPaths(
            rng,
            variables.map(v => v.processConfig),
            correlationMatrix,
            config.horizonPeriods,
            dt
        );
        allPaths.push(paths);
    }

    // Aggregate results by variable and period
    const results: VariablePeriodResult[] = [];

    for (let varIdx = 0; varIdx < variables.length; varIdx++) {
        const variable = variables[varIdx];

        for (let period = 0; period <= config.horizonPeriods; period++) {
            // Extract all scenario values for this variable at this period
            const scenarioValues: number[] = [];
            for (let sim = 0; sim < config.nSimulations; sim++) {
                scenarioValues.push(allPaths[sim][varIdx][period]);
            }

            // Calculate statistics
            const stats = calculateStatistics(scenarioValues);

            results.push({
                variableId: variable.id,
                variableCode: variable.code,
                periodIndex: period,
                stats,
                // Only store raw scenarios if explicitly requested (memory optimization)
                // rawScenarios: scenarioValues
            });
        }
    }

    // Calculate covenant breach probabilities
    let covenantResults: CovenantPeriodResult[] | undefined;

    if (covenants && covenants.length > 0) {
        covenantResults = [];

        for (const covenant of covenants) {
            const varIdx = variables.findIndex(v => v.code === covenant.variableCode);
            if (varIdx === -1) continue;

            for (let period = 0; period <= config.horizonPeriods; period++) {
                let breachCount = 0;
                let totalBreachMagnitude = 0;

                for (let sim = 0; sim < config.nSimulations; sim++) {
                    const value = allPaths[sim][varIdx][period];
                    const isBreach = evaluateCovenant(value, covenant.threshold, covenant.operator);

                    if (isBreach) {
                        breachCount++;
                        totalBreachMagnitude += Math.abs(value - covenant.threshold);
                    }
                }

                covenantResults.push({
                    covenantId: covenant.id,
                    covenantName: covenant.name,
                    periodIndex: period,
                    breachProbability: breachCount / config.nSimulations,
                    nBreachScenarios: breachCount,
                    avgBreachMagnitude: breachCount > 0 ? totalBreachMagnitude / breachCount : undefined
                });
            }
        }
    }

    const endTime = Date.now();

    return {
        config,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        computeTimeMs: endTime - startTime,
        results,
        covenantResults
    };
}

/**
 * Evaluate covenant condition
 */
function evaluateCovenant(
    value: number,
    threshold: number,
    operator: '<' | '<=' | '>' | '>=' | '='
): boolean {
    switch (operator) {
        case '<': return value < threshold;
        case '<=': return value <= threshold;
        case '>': return value > threshold;
        case '>=': return value >= threshold;
        case '=': return Math.abs(value - threshold) < 1e-10;
        default: return false;
    }
}

// =============================================
// Sensitivity Analysis
// =============================================

export interface SensitivityInput {
    baseConfig: SimulationInput;
    variableToVary: string;  // variable code
    lowerBound: number;      // multiplier (e.g., 0.8 = -20%)
    upperBound: number;      // multiplier (e.g., 1.2 = +20%)
    outputVariable: string;  // variable code to measure
    nSteps?: number;         // default 10
}

export interface SensitivityResult {
    inputVariableCode: string;
    outputVariableCode: string;
    inputChanges: number[];     // multipliers
    outputMeans: number[];
    outputP10s: number[];
    outputP90s: number[];
    elasticity: number;         // % change output / % change input
    tornadoImpactLow: number;   // impact at lower bound
    tornadoImpactHigh: number;  // impact at upper bound
}

/**
 * Run sensitivity analysis
 */
export async function runSensitivityAnalysis(
    input: SensitivityInput
): Promise<SensitivityResult> {
    const nSteps = input.nSteps ?? 10;
    const steps = [];
    const stepSize = (input.upperBound - input.lowerBound) / (nSteps - 1);

    for (let i = 0; i < nSteps; i++) {
        steps.push(input.lowerBound + i * stepSize);
    }

    const outputMeans: number[] = [];
    const outputP10s: number[] = [];
    const outputP90s: number[] = [];

    for (const multiplier of steps) {
        // Clone config and modify the variable
        const modifiedConfig = JSON.parse(JSON.stringify(input.baseConfig)) as SimulationInput;

        const varToModify = modifiedConfig.variables.find(v => v.code === input.variableToVary);
        if (varToModify && 'initialValue' in varToModify.processConfig.params) {
            (varToModify.processConfig.params as { initialValue: number }).initialValue *= multiplier;
        }

        // Run simulation with reduced iterations for speed
        modifiedConfig.config.nSimulations = Math.min(1000, modifiedConfig.config.nSimulations);

        const result = await runSimulation(modifiedConfig);

        // Find output variable at final period
        const outputResults = result.results.filter(
            r => r.variableCode === input.outputVariable &&
                r.periodIndex === modifiedConfig.config.horizonPeriods
        );

        if (outputResults.length > 0) {
            outputMeans.push(outputResults[0].stats.mean);
            outputP10s.push(outputResults[0].stats.p10);
            outputP90s.push(outputResults[0].stats.p90);
        }
    }

    // Calculate elasticity (at midpoint)
    const midIdx = Math.floor(nSteps / 2);
    const dx = (steps[midIdx + 1] - steps[midIdx - 1]) / 2;
    const dy = (outputMeans[midIdx + 1] - outputMeans[midIdx - 1]) / 2;
    const elasticity = (dy / outputMeans[midIdx]) / (dx / 1);

    return {
        inputVariableCode: input.variableToVary,
        outputVariableCode: input.outputVariable,
        inputChanges: steps,
        outputMeans,
        outputP10s,
        outputP90s,
        elasticity,
        tornadoImpactLow: outputMeans[0] - outputMeans[midIdx],
        tornadoImpactHigh: outputMeans[nSteps - 1] - outputMeans[midIdx]
    };
}

// =============================================
// Stress Test
// =============================================

export interface StressScenario {
    name: string;
    description: string;
    shocks: Record<string, number>;  // variableCode -> shock value (additive or multiplicative)
    shockType: 'additive' | 'multiplicative';
}

export interface StressTestResult {
    scenarioName: string;
    results: Map<string, SimulationStats>;  // variableCode -> stats at final period
}

/**
 * Run stress test with predefined scenarios
 */
export async function runStressTest(
    baseConfig: SimulationInput,
    scenario: StressScenario
): Promise<StressTestResult> {
    const stressedConfig = JSON.parse(JSON.stringify(baseConfig)) as SimulationInput;

    // Apply shocks
    for (const [varCode, shock] of Object.entries(scenario.shocks)) {
        const variable = stressedConfig.variables.find(v => v.code === varCode);
        if (!variable) continue;

        if ('initialValue' in variable.processConfig.params) {
            const params = variable.processConfig.params as { initialValue: number };
            if (scenario.shockType === 'multiplicative') {
                params.initialValue *= shock;
            } else {
                params.initialValue += shock;
            }
        }

        if ('mu' in variable.processConfig.params) {
            const params = variable.processConfig.params as { mu: number };
            if (scenario.shockType === 'multiplicative') {
                params.mu *= shock;
            } else {
                params.mu += shock;
            }
        }
    }

    // Run simulation
    const result = await runSimulation(stressedConfig);

    // Collect final period results
    const resultsMap = new Map<string, SimulationStats>();
    const finalPeriod = stressedConfig.config.horizonPeriods;

    for (const r of result.results) {
        if (r.periodIndex === finalPeriod) {
            resultsMap.set(r.variableCode, r.stats);
        }
    }

    return {
        scenarioName: scenario.name,
        results: resultsMap
    };
}

// =============================================
// Predefined Stress Scenarios
// =============================================

export const PREDEFINED_STRESS_SCENARIOS: StressScenario[] = [
    {
        name: 'Recession',
        description: 'Economic recession with revenue decline and margin compression',
        shocks: {
            'REVENUE_GROWTH': -0.15,
            'GROSS_MARGIN': -0.05,
            'INTEREST_RATE': 0.02
        },
        shockType: 'additive'
    },
    {
        name: 'Interest Rate Shock',
        description: 'Sharp increase in interest rates',
        shocks: {
            'INTEREST_RATE': 0.03,
            'REVENUE_GROWTH': -0.03
        },
        shockType: 'additive'
    },
    {
        name: 'Customer Loss',
        description: 'Loss of major customer (20% revenue impact)',
        shocks: {
            'REVENUE_GROWTH': 0.8,
            'GROSS_MARGIN': 0.95
        },
        shockType: 'multiplicative'
    }
];
