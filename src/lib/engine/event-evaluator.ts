// =============================================
// StochFin EventProb Engine: Event Evaluator
// Evaluates events against Monte Carlo trajectories
// =============================================

import { MersenneTwister, sampleStandardNormal } from './random';
import {
    simulateGBMPath,
    simulateOUPath,
    simulateHestonPath,
    simulateJumpDiffusionPath,
    type GBMConfig,
    type OUConfig,
    type HestonConfig,
    type JumpDiffusionConfig
} from './processes';
import { sampleFromCopula, type CopulaConfig } from './copulas';
import { choleskyDecomposition } from './correlation';
import {
    type EventDefinition,
    type ThresholdBreachEvent,
    type CompoundEvent,
    type ConditionalEvent,
    type AtLeastKEvent,
    type SequenceEvent,
    type EventVariable,
    type EventCopulaSpec,
    type EventSimulationConfig,
    type EventProbabilityResult,
    type SDEModelType,
    type GBMParameters,
    type OUParameters,
    type HestonParameters,
    type MertonJumpParameters,
    isThresholdBreach,
    isCompoundEvent,
    isConditionalEvent,
    isAtLeastKEvent,
    isSequenceEvent,
    extractVariables,
    getNumSteps,
    getDtYears,
    DEFAULT_SIMULATION_CONFIG
} from './events';

// =============================================
// Main Simulation Function
// =============================================

/**
 * Run Monte Carlo simulation for an event and calculate probability
 */
export function runEventSimulation(
    event: EventDefinition,
    variables: EventVariable[],
    copulaSpec?: EventCopulaSpec,
    config: EventSimulationConfig = DEFAULT_SIMULATION_CONFIG
): EventProbabilityResult {
    const startTime = Date.now();

    const rng = new MersenneTwister(config.random_seed ?? Date.now());
    const numSteps = getNumSteps(config);
    const dt = getDtYears(config);
    const variableNames = extractVariables(event);

    // Create variable lookup
    const varLookup = new Map<string, EventVariable>();
    variables.forEach(v => varLookup.set(v.name, v));

    // Validate all variables exist
    for (const name of variableNames) {
        if (!varLookup.has(name)) {
            throw new Error(`Variable "${name}" not found in variables list`);
        }
    }

    // Generate all trajectories
    const trajectories = generateTrajectories(
        rng,
        variableNames,
        varLookup,
        numSteps,
        dt,
        config.n_scenarios,
        copulaSpec,
        config.use_copula_noise
    );

    // Evaluate event for each scenario
    const eventOccurred: boolean[] = new Array(config.n_scenarios);
    const perVariableOccurred: Map<string, boolean[]> = new Map();

    // Initialize per-variable tracking
    variableNames.forEach(name => {
        perVariableOccurred.set(name, new Array(config.n_scenarios));
    });

    for (let i = 0; i < config.n_scenarios; i++) {
        const scenarioTrajectories = new Map<string, number[]>();
        variableNames.forEach(name => {
            scenarioTrajectories.set(name, trajectories.get(name)![i]);
        });

        eventOccurred[i] = evaluateEvent(event, scenarioTrajectories);

        // Track per-variable threshold breaches for decomposition
        variableNames.forEach(name => {
            const varEvent = findVariableThreshold(event, name);
            if (varEvent) {
                perVariableOccurred.get(name)![i] = evaluateThresholdBreach(
                    varEvent,
                    scenarioTrajectories.get(name)!
                );
            }
        });
    }

    // Calculate probability with confidence interval
    const probability = calculateProbabilityWithCI(eventOccurred);

    // Calculate decomposition
    const decomposition = calculateDecomposition(
        eventOccurred,
        perVariableOccurred,
        variableNames
    );

    // Calculate percentiles for each variable
    const percentiles = calculatePercentiles(trajectories, variableNames);

    // Calculate VaR and ES if applicable (for portfolio value)
    const { var_99, es_99 } = calculateRiskMetrics(trajectories, variableNames);

    const computationTime = Date.now() - startTime;

    return {
        probability,
        decomposition,
        percentiles,
        var_99,
        es_99,
        n_scenarios: config.n_scenarios,
        computation_time_ms: computationTime
    };
}

// =============================================
// Trajectory Generation
// =============================================

/**
 * Generate Monte Carlo trajectories for all variables
 */
function generateTrajectories(
    rng: MersenneTwister,
    variableNames: string[],
    varLookup: Map<string, EventVariable>,
    numSteps: number,
    dt: number,
    nScenarios: number,
    copulaSpec?: EventCopulaSpec,
    useCopulaNoise: boolean = true
): Map<string, number[][]> {
    const trajectories = new Map<string, number[][]>();
    variableNames.forEach(name => trajectories.set(name, []));

    const d = variableNames.length;

    // Determine noise generation method
    let copulaConfig: CopulaConfig | null = null;
    let correlationMatrix: number[][] | null = null;
    let choleskyL: number[][] | null = null;

    if (d > 1 && copulaSpec && useCopulaNoise) {
        // Use copula-based noise
        copulaConfig = mapCopulaSpecToConfig(copulaSpec);
    } else if (d > 1) {
        // Use default Gaussian correlation (identity = independent)
        correlationMatrix = Array(d).fill(null).map((_, i) =>
            Array(d).fill(0).map((_, j) => i === j ? 1 : 0.3) // Default mild correlation
        );
        choleskyL = choleskyDecomposition(correlationMatrix);
    }

    // Generate all scenarios
    for (let scenario = 0; scenario < nScenarios; scenario++) {
        // Generate correlated noise paths for this scenario
        const noisePaths: number[][] = generateCorrelatedNoisePaths(
            rng, d, numSteps, copulaConfig, choleskyL
        );

        // Simulate each variable
        variableNames.forEach((name, idx) => {
            const variable = varLookup.get(name)!;
            const noise = noisePaths[idx];

            const path = simulateVariablePath(
                rng,
                variable,
                numSteps,
                dt,
                noise
            );

            trajectories.get(name)!.push(path);
        });
    }

    return trajectories;
}

/**
 * Generate correlated noise paths using copula or Cholesky
 */
function generateCorrelatedNoisePaths(
    rng: MersenneTwister,
    d: number,
    numSteps: number,
    copulaConfig: CopulaConfig | null,
    choleskyL: number[][] | null
): number[][] {
    // Each path is numSteps long, for d variables
    const paths: number[][] = Array(d).fill(null).map(() => []);

    for (let t = 0; t < numSteps; t++) {
        let correlatedNoise: number[];

        if (copulaConfig && d === 2) {
            // Sample from copula and transform to normal
            const [u1, u2] = sampleFromCopula(rng, copulaConfig, 1)[0];
            correlatedNoise = [
                normalQuantile(u1),
                normalQuantile(u2)
            ];
        } else if (choleskyL) {
            // Use Cholesky decomposition for Gaussian correlation
            const z = Array(d).fill(0).map(() => sampleStandardNormal(rng));
            correlatedNoise = [];
            for (let i = 0; i < d; i++) {
                let sum = 0;
                for (let j = 0; j <= i; j++) {
                    sum += choleskyL[i][j] * z[j];
                }
                correlatedNoise.push(sum);
            }
        } else {
            // Independent noise
            correlatedNoise = Array(d).fill(0).map(() => sampleStandardNormal(rng));
        }

        for (let i = 0; i < d; i++) {
            paths[i].push(correlatedNoise[i]);
        }
    }

    return paths;
}

/**
 * Simulate a single variable path with pre-generated noise
 */
function simulateVariablePath(
    rng: MersenneTwister,
    variable: EventVariable,
    numSteps: number,
    dt: number,
    noise: number[]
): number[] {
    const path: number[] = [variable.initial_value];
    let current = variable.initial_value;

    switch (variable.sde_model) {
        case 'gbm': {
            const params = variable.parameters as GBMParameters;
            for (let t = 0; t < numSteps; t++) {
                const dW = noise[t] * Math.sqrt(dt);
                // GBM step with Milstein
                const drift = params.mu * current * dt;
                const diffusion = params.sigma * current * dW;
                const milstein = 0.5 * params.sigma * params.sigma * current * (dW * dW - dt);
                current = Math.max(1e-10, current + drift + diffusion + milstein);
                path.push(current);
            }
            break;
        }

        case 'ornstein_uhlenbeck': {
            const params = variable.parameters as OUParameters;
            for (let t = 0; t < numSteps; t++) {
                const dW = noise[t] * Math.sqrt(dt);
                // OU step (Euler)
                current = current + params.theta * (params.mu - current) * dt + params.sigma * dW;
                path.push(current);
            }
            break;
        }

        case 'heston': {
            const params = variable.parameters as HestonParameters;
            let variance = params.initial_variance;
            for (let t = 0; t < numSteps; t++) {
                const dW_S = noise[t] * Math.sqrt(dt);
                // Correlated noise for variance
                const z2 = sampleStandardNormal(rng);
                const dW_v = params.rho * dW_S + Math.sqrt(1 - params.rho * params.rho) * z2 * Math.sqrt(dt);

                // Full Truncation
                const v_plus = Math.max(0, variance);
                const sqrtV = Math.sqrt(v_plus);

                current = current * Math.exp(
                    (params.mu - 0.5 * v_plus) * dt + sqrtV * dW_S
                );
                current = Math.max(1e-10, current);

                variance = variance + params.kappa * (params.theta - v_plus) * dt + params.xi * sqrtV * dW_v;
                path.push(current);
            }
            break;
        }

        case 'merton_jump': {
            const params = variable.parameters as MertonJumpParameters;
            for (let t = 0; t < numSteps; t++) {
                const dW = noise[t] * Math.sqrt(dt);

                // Diffusion part
                let logReturn = (params.mu - 0.5 * params.sigma * params.sigma) * dt
                    + params.sigma * dW;

                // Jump part (Poisson)
                const nJumps = samplePoisson(rng, params.lambda * dt);
                for (let j = 0; j < nJumps; j++) {
                    const jumpSize = params.mu_jump + params.sigma_jump * sampleStandardNormal(rng);
                    logReturn += jumpSize;
                }

                current = current * Math.exp(logReturn);
                current = Math.max(1e-10, current);
                path.push(current);
            }
            break;
        }

        case 'deterministic': {
            const params = variable.parameters as { value: number };
            for (let t = 0; t < numSteps; t++) {
                path.push(params.value);
            }
            break;
        }
    }

    return path;
}

// =============================================
// Event Evaluation
// =============================================

/**
 * Evaluate if an event occurred in a scenario
 */
export function evaluateEvent(
    event: EventDefinition,
    trajectories: Map<string, number[]>
): boolean {
    if (isThresholdBreach(event)) {
        const path = trajectories.get(event.variable);
        if (!path) throw new Error(`Variable "${event.variable}" not found`);
        return evaluateThresholdBreach(event, path);
    }

    if (isCompoundEvent(event)) {
        return evaluateCompoundEvent(event, trajectories);
    }

    if (isConditionalEvent(event)) {
        // For conditional, we handle this at the aggregate level
        // Here we just check if the main event occurred
        return evaluateEvent(event.event, trajectories);
    }

    if (isAtLeastKEvent(event)) {
        return evaluateAtLeastKEvent(event, trajectories);
    }

    if (isSequenceEvent(event)) {
        return evaluateSequenceEvent(event, trajectories);
    }

    throw new Error(`Unknown event type: ${(event as any).type}`);
}

/**
 * Check if threshold is breached at any point in trajectory
 */
export function evaluateThresholdBreach(
    event: ThresholdBreachEvent,
    path: number[]
): boolean {
    for (const value of path) {
        if (compareValues(value, event.operator, event.threshold)) {
            return true;
        }
    }
    return false;
}

/**
 * Evaluate compound event (AND/OR)
 */
function evaluateCompoundEvent(
    event: CompoundEvent,
    trajectories: Map<string, number[]>
): boolean {
    if (event.operator === 'AND') {
        return event.conditions.every(cond => evaluateEvent(cond, trajectories));
    } else {
        return event.conditions.some(cond => evaluateEvent(cond, trajectories));
    }
}

/**
 * Evaluate at-least-k event
 */
function evaluateAtLeastKEvent(
    event: AtLeastKEvent,
    trajectories: Map<string, number[]>
): boolean {
    let count = 0;
    for (const subEvent of event.events) {
        const path = trajectories.get(subEvent.variable);
        if (path && evaluateThresholdBreach(subEvent, path)) {
            count++;
        }
    }
    return count >= event.k;
}

/**
 * Evaluate sequence event (A then B within max_gap)
 */
function evaluateSequenceEvent(
    event: SequenceEvent,
    trajectories: Map<string, number[]>
): boolean {
    // Find first occurrence of first event
    const firstIdx = findFirstOccurrence(event.first, trajectories);
    if (firstIdx === -1) return false;

    // Check if second event occurs within max_gap after first
    const maxIdx = firstIdx + Math.ceil(event.max_gap_months);
    return checkEventInRange(event.then, trajectories, firstIdx, maxIdx);
}

/**
 * Find first time step where event occurs
 */
function findFirstOccurrence(
    event: EventDefinition,
    trajectories: Map<string, number[]>
): number {
    if (!isThresholdBreach(event)) {
        return -1; // Only support threshold for now
    }

    const path = trajectories.get(event.variable);
    if (!path) return -1;

    for (let i = 0; i < path.length; i++) {
        if (compareValues(path[i], event.operator, event.threshold)) {
            return i;
        }
    }
    return -1;
}

/**
 * Check if event occurs in a specific range
 */
function checkEventInRange(
    event: EventDefinition,
    trajectories: Map<string, number[]>,
    startIdx: number,
    endIdx: number
): boolean {
    if (!isThresholdBreach(event)) return false;

    const path = trajectories.get(event.variable);
    if (!path) return false;

    for (let i = startIdx; i <= Math.min(endIdx, path.length - 1); i++) {
        if (compareValues(path[i], event.operator, event.threshold)) {
            return true;
        }
    }
    return false;
}

/**
 * Compare values using operator
 */
function compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
        case '>': return value > threshold;
        case '<': return value < threshold;
        case '>=': return value >= threshold;
        case '<=': return value <= threshold;
        case '==': return Math.abs(value - threshold) < 1e-10;
        case '!=': return Math.abs(value - threshold) >= 1e-10;
        default: return false;
    }
}

// =============================================
// Statistics Calculation
// =============================================

/**
 * Calculate probability with Wilson confidence interval
 */
function calculateProbabilityWithCI(
    occurred: boolean[]
): { mean: number; ci_90: [number, number]; ci_95: [number, number] } {
    const n = occurred.length;
    const k = occurred.filter(x => x).length;
    const p = k / n;

    // Wilson score interval
    const ci_90 = wilsonConfidenceInterval(k, n, 0.10);
    const ci_95 = wilsonConfidenceInterval(k, n, 0.05);

    return { mean: p, ci_90, ci_95 };
}

/**
 * Wilson score confidence interval for proportion
 */
function wilsonConfidenceInterval(
    k: number,
    n: number,
    alpha: number
): [number, number] {
    const p = k / n;
    const z = normalQuantile(1 - alpha / 2);

    const denominator = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / denominator;
    const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;

    return [
        Math.max(0, center - margin),
        Math.min(1, center + margin)
    ];
}

/**
 * Calculate decomposition of joint probability
 */
function calculateDecomposition(
    jointOccurred: boolean[],
    perVariableOccurred: Map<string, boolean[]>,
    variableNames: string[]
): EventProbabilityResult['decomposition'] {
    const n = jointOccurred.length;

    // Per-variable probabilities
    const perVariable: Record<string, number> = {};
    variableNames.forEach(name => {
        const arr = perVariableOccurred.get(name);
        if (arr) {
            perVariable[name] = arr.filter(x => x).length / n;
        }
    });

    // Joint probability (actual)
    const jointCopula = jointOccurred.filter(x => x).length / n;

    // Independent joint probability (product)
    let jointIndependent = 1;
    Object.values(perVariable).forEach(p => {
        jointIndependent *= p;
    });

    // Risk multiplier
    const multiplier = jointIndependent > 0 ? jointCopula / jointIndependent : 1;

    return {
        per_variable: perVariable,
        joint_independent: jointIndependent,
        joint_copula: jointCopula,
        copula_risk_multiplier: multiplier
    };
}

/**
 * Calculate percentiles for each variable at horizon
 */
function calculatePercentiles(
    trajectories: Map<string, number[][]>,
    variableNames: string[]
): Record<string, { p5: number; p25: number; p50: number; p75: number; p95: number }> {
    const result: Record<string, any> = {};

    variableNames.forEach(name => {
        const paths = trajectories.get(name);
        if (!paths || paths.length === 0) return;

        // Get final values (at horizon)
        const finalValues = paths.map(path => path[path.length - 1]);
        finalValues.sort((a, b) => a - b);

        result[name] = {
            p5: percentile(finalValues, 5),
            p25: percentile(finalValues, 25),
            p50: percentile(finalValues, 50),
            p75: percentile(finalValues, 75),
            p95: percentile(finalValues, 95)
        };
    });

    return result;
}

/**
 * Calculate VaR and ES (for first variable, typically portfolio value)
 */
function calculateRiskMetrics(
    trajectories: Map<string, number[][]>,
    variableNames: string[]
): { var_99?: number; es_99?: number } {
    if (variableNames.length === 0) return {};

    const firstVar = variableNames[0];
    const paths = trajectories.get(firstVar);
    if (!paths || paths.length === 0) return {};

    // Calculate returns at horizon relative to initial
    const initialValue = paths[0][0];
    const returns = paths.map(path => {
        const finalValue = path[path.length - 1];
        return (finalValue - initialValue) / initialValue;
    });
    returns.sort((a, b) => a - b);

    const var_99 = percentile(returns, 1); // 99% VaR is 1st percentile

    // ES = mean of returns below VaR
    const belowVaR = returns.filter(r => r <= var_99);
    const es_99 = belowVaR.length > 0
        ? belowVaR.reduce((a, b) => a + b, 0) / belowVaR.length
        : var_99;

    return { var_99, es_99 };
}

// =============================================
// Helper Functions
// =============================================

/**
 * Map copula spec to CopulaConfig
 */
function mapCopulaSpecToConfig(spec: EventCopulaSpec): CopulaConfig {
    switch (spec.family) {
        case 'gaussian':
            return {
                type: 'gaussian',
                correlationMatrix: [[1, spec.parameters.rho || 0.5], [spec.parameters.rho || 0.5, 1]]
            };
        case 'student_t':
            return {
                type: 't',
                correlationMatrix: [[1, spec.parameters.rho || 0.5], [spec.parameters.rho || 0.5, 1]],
                degreesOfFreedom: spec.parameters.nu || 4
            };
        case 'clayton':
            return { type: 'clayton', theta: spec.parameters.theta || 2 };
        case 'gumbel':
            return { type: 'gumbel', theta: spec.parameters.theta || 2 };
        case 'frank':
            return { type: 'frank', theta: spec.parameters.theta || 5 };
        case 'rotated_clayton_90':
            return {
                type: 'rotated',
                baseCopula: { type: 'clayton', theta: spec.parameters.theta || 2 },
                rotation: 90
            };
        default:
            // Default to Gaussian
            return {
                type: 'gaussian',
                correlationMatrix: [[1, 0.5], [0.5, 1]]
            };
    }
}

/**
 * Find threshold event for a specific variable
 */
function findVariableThreshold(
    event: EventDefinition,
    varName: string
): ThresholdBreachEvent | null {
    if (isThresholdBreach(event) && event.variable === varName) {
        return event;
    }
    if (isCompoundEvent(event)) {
        for (const cond of event.conditions) {
            const found = findVariableThreshold(cond, varName);
            if (found) return found;
        }
    }
    if (isConditionalEvent(event)) {
        return findVariableThreshold(event.event, varName)
            || findVariableThreshold(event.given, varName);
    }
    if (isAtLeastKEvent(event)) {
        return event.events.find(e => e.variable === varName) || null;
    }
    return null;
}

/**
 * Percentile calculation
 */
function percentile(sorted: number[], p: number): number {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Normal quantile (inverse CDF) - Rational approximation
 */
function normalQuantile(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // Rational approximation for standard normal quantile
    const a = [
        -3.969683028665376e+01, 2.209460984245205e+02,
        -2.759285104469687e+02, 1.383577518672690e+02,
        -3.066479806614716e+01, 2.506628277459239e+00
    ];
    const b = [
        -5.447609879822406e+01, 1.615858368580409e+02,
        -1.556989798598866e+02, 6.680131188771972e+01,
        -1.328068155288572e+01
    ];
    const c = [
        -7.784894002430293e-03, -3.223964580411365e-01,
        -2.400758277161838e+00, -2.549732539343734e+00,
        4.374664141464968e+00, 2.938163982698783e+00
    ];
    const d = [
        7.784695709041462e-03, 3.224671290700398e-01,
        2.445134137142996e+00, 3.754408661907416e+00
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

/**
 * Sample from Poisson distribution
 */
function samplePoisson(rng: MersenneTwister, lambda: number): number {
    if (lambda < 30) {
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        do {
            k++;
            p *= rng.random();
        } while (p > L);
        return k - 1;
    } else {
        return Math.round(Math.max(0, lambda + Math.sqrt(lambda) * sampleStandardNormal(rng)));
    }
}

// =============================================
// Model Comparison
// =============================================

/**
 * Run simulation with multiple copula models for comparison
 */
export function runEventSimulationWithComparison(
    event: EventDefinition,
    variables: EventVariable[],
    config: EventSimulationConfig = DEFAULT_SIMULATION_CONFIG
): EventProbabilityResult {
    // Run with different copulas
    const gaussianSpec: EventCopulaSpec = {
        family: 'gaussian',
        parameters: { rho: 0.5 }
    };

    const claytonSpec: EventCopulaSpec = {
        family: 'clayton',
        parameters: { theta: 2.0 }
    };

    const studentTSpec: EventCopulaSpec = {
        family: 'student_t',
        parameters: { rho: 0.5, nu: 4 }
    };

    const gumbelSpec: EventCopulaSpec = {
        family: 'gumbel',
        parameters: { theta: 2.0 }
    };

    // Use same seed for fair comparison
    const baseSeed = config.random_seed ?? Date.now();

    const gaussianResult = runEventSimulation(event, variables, gaussianSpec, {
        ...config,
        random_seed: baseSeed
    });

    const claytonResult = runEventSimulation(event, variables, claytonSpec, {
        ...config,
        random_seed: baseSeed
    });

    const studentTResult = runEventSimulation(event, variables, studentTSpec, {
        ...config,
        random_seed: baseSeed
    });

    const gumbelResult = runEventSimulation(event, variables, gumbelSpec, {
        ...config,
        random_seed: baseSeed
    });

    // Return Clayton as main result (conservative for crash scenarios)
    return {
        ...claytonResult,
        model_comparison: {
            gaussian: gaussianResult.probability.mean,
            clayton: claytonResult.probability.mean,
            gumbel: gumbelResult.probability.mean,
            student_t: studentTResult.probability.mean
        }
    };
}
