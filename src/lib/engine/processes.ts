// =============================================
// StochFin Monte Carlo Engine: Stochastic Processes
// GBM, Ornstein-Uhlenbeck, Jump-Diffusion
// =============================================

import { MersenneTwister, sampleStandardNormal, samplePoisson, sampleNormal } from './random';

/**
 * Time step options
 */
export type TimeStepUnit = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function getTimeStepInYears(unit: TimeStepUnit): number {
    switch (unit) {
        case 'daily': return 1 / 252;      // Trading days
        case 'weekly': return 1 / 52;
        case 'monthly': return 1 / 12;
        case 'quarterly': return 1 / 4;
        case 'yearly': return 1;
    }
}

// =============================================
// Geometric Brownian Motion (GBM)
// dS = μS dt + σS dW
// =============================================

export interface GBMConfig {
    drift: number;          // μ (annualized)
    volatility: number;     // σ (annualized)
    initialValue: number;   // S₀
}

/**
 * Simulate one step of GBM using Euler-Maruyama discretization
 * S(t+dt) = S(t) * exp((μ - σ²/2) * dt + σ * sqrt(dt) * Z)
 * where Z ~ N(0,1)
 */
export function stepGBM(
    rng: MersenneTwister,
    currentValue: number,
    config: GBMConfig,
    dt: number
): number {
    const { drift, volatility } = config;
    const z = sampleStandardNormal(rng);

    // Exact solution (log-Euler)
    const exponent = (drift - 0.5 * volatility * volatility) * dt +
        volatility * Math.sqrt(dt) * z;

    return currentValue * Math.exp(exponent);
}

/**
 * Simulate one step of GBM using Milstein discretization
 * Higher-order scheme: O(Δt) convergence vs Euler's O(√Δt)
 * 
 * S(t+dt) = S(t) + μS(t)dt + σS(t)ΔW + 0.5σ²S(t)(ΔW² - dt)
 * 
 * The additional term 0.5σ²S(t)(ΔW² - dt) is the Milstein correction
 * derived from the Itô lemma applied to the diffusion coefficient.
 */
export function stepGBMMilstein(
    rng: MersenneTwister,
    currentValue: number,
    config: GBMConfig,
    dt: number
): number {
    const { drift, volatility } = config;
    const z = sampleStandardNormal(rng);
    const dW = Math.sqrt(dt) * z;

    // Milstein scheme for GBM
    // For GBM: b(S) = σS, b'(S) = σ
    // Milstein correction: 0.5 * b(S) * b'(S) * (dW² - dt) = 0.5 * σ² * S * (dW² - dt)
    const milsteinCorrection = 0.5 * volatility * volatility * currentValue * (dW * dW - dt);

    return currentValue +
        drift * currentValue * dt +
        volatility * currentValue * dW +
        milsteinCorrection;
}

/**
 * Simulate full GBM path
 * @returns Array of values at each time step
 */
export function simulateGBMPath(
    rng: MersenneTwister,
    config: GBMConfig,
    numSteps: number,
    dt: number,
    scheme: 'euler' | 'milstein' = 'euler'
): number[] {
    const path: number[] = [config.initialValue];
    let current = config.initialValue;

    const stepFn = scheme === 'milstein' ? stepGBMMilstein : stepGBM;

    for (let i = 0; i < numSteps; i++) {
        current = stepFn(rng, current, config, dt);
        // Ensure non-negative (numerical stability)
        current = Math.max(current, 1e-10);
        path.push(current);
    }

    return path;
}

// =============================================
// Ornstein-Uhlenbeck (Mean-Reverting)
// dX = θ(μ - X) dt + σ dW
// =============================================

export interface OUConfig {
    theta: number;          // Mean reversion speed
    mu: number;             // Long-term mean
    sigma: number;          // Volatility
    initialValue: number;   // X₀
}

/**
 * Half-life of mean reversion (in years)
 */
export function ouHalfLife(theta: number): number {
    return Math.log(2) / theta;
}

/**
 * Simulate one step of O-U using exact discretization
 * X(t+dt) = μ + (X(t) - μ) * exp(-θ*dt) + σ * sqrt((1 - exp(-2θdt))/(2θ)) * Z
 */
export function stepOU(
    rng: MersenneTwister,
    currentValue: number,
    config: OUConfig,
    dt: number
): number {
    const { theta, mu, sigma } = config;
    const z = sampleStandardNormal(rng);

    const expTerm = Math.exp(-theta * dt);
    const varianceTerm = sigma * Math.sqrt((1 - Math.exp(-2 * theta * dt)) / (2 * theta));

    return mu + (currentValue - mu) * expTerm + varianceTerm * z;
}

/**
 * Simulate full O-U path
 */
export function simulateOUPath(
    rng: MersenneTwister,
    config: OUConfig,
    numSteps: number,
    dt: number
): number[] {
    const path: number[] = [config.initialValue];
    let current = config.initialValue;

    for (let i = 0; i < numSteps; i++) {
        current = stepOU(rng, current, config, dt);
        path.push(current);
    }

    return path;
}

// =============================================
// Jump-Diffusion (Merton Model)
// dS = μS dt + σS dW + S dJ
// where J is a compound Poisson process
// =============================================

export interface JumpDiffusionConfig {
    drift: number;           // μ (continuous drift)
    volatility: number;      // σ (continuous volatility)
    jumpIntensity: number;   // λ (jumps per year)
    jumpMean: number;        // μ_J (average jump size, in log terms)
    jumpStd: number;         // σ_J (jump size volatility)
    initialValue: number;
}

/**
 * Simulate one step of jump-diffusion
 */
export function stepJumpDiffusion(
    rng: MersenneTwister,
    currentValue: number,
    config: JumpDiffusionConfig,
    dt: number
): number {
    const { drift, volatility, jumpIntensity, jumpMean, jumpStd } = config;

    // Diffusion part (GBM)
    const z = sampleStandardNormal(rng);
    const diffusion = (drift - 0.5 * volatility * volatility) * dt +
        volatility * Math.sqrt(dt) * z;

    // Jump part
    const numJumps = samplePoisson(rng, jumpIntensity * dt);
    let jumpEffect = 0;

    for (let j = 0; j < numJumps; j++) {
        jumpEffect += sampleNormal(rng, jumpMean, jumpStd);
    }

    return currentValue * Math.exp(diffusion + jumpEffect);
}

/**
 * Simulate full jump-diffusion path
 */
export function simulateJumpDiffusionPath(
    rng: MersenneTwister,
    config: JumpDiffusionConfig,
    numSteps: number,
    dt: number
): number[] {
    const path: number[] = [config.initialValue];
    let current = config.initialValue;

    for (let i = 0; i < numSteps; i++) {
        current = stepJumpDiffusion(rng, current, config, dt);
        path.push(current);
    }

    return path;
}

// =============================================
// Heston Stochastic Volatility Model
// dS = μS dt + √v S dW_S  (price)
// dv = κ(θ - v) dt + ξ√v dW_v  (variance)
// Corr(dW_S, dW_v) = ρ
// =============================================

export interface HestonConfig {
    drift: number;           // μ - expected return (annualized)
    theta: number;           // θ - long-term variance
    kappa: number;           // κ - mean reversion speed
    xi: number;              // ξ - vol of vol
    rho: number;             // ρ - correlation (-0.7 typical for equities)
    initialPrice: number;    // S₀
    initialVariance: number; // v₀
}

/**
 * Check Feller condition: 2κθ > ξ²
 * If satisfied, variance process stays strictly positive
 */
export function checkFellerCondition(config: HestonConfig): {
    satisfied: boolean;
    ratio: number;
} {
    const fellerValue = 2 * config.kappa * config.theta;
    const xiSquared = config.xi * config.xi;
    return {
        satisfied: fellerValue > xiSquared,
        ratio: fellerValue / xiSquared
    };
}

/**
 * Simulate one step of Heston model using Full Truncation scheme
 * Full Truncation: apply max(0, v) before computing sqrt and drift
 * This is more stable than reflection or absorption schemes
 */
export function stepHeston(
    rng: MersenneTwister,
    currentPrice: number,
    currentVariance: number,
    config: HestonConfig,
    dt: number
): { price: number; variance: number } {
    const { drift, theta, kappa, xi, rho } = config;

    // Generate correlated Brownian increments
    const z1 = sampleStandardNormal(rng);
    const z2 = sampleStandardNormal(rng);

    // Correlated innovations: dW_S and dW_v
    const dW_S = Math.sqrt(dt) * z1;
    const dW_v = Math.sqrt(dt) * (rho * z1 + Math.sqrt(1 - rho * rho) * z2);

    // Full Truncation scheme: use max(0, v) for sqrt and drift
    const v_plus = Math.max(0, currentVariance);
    const sqrtV = Math.sqrt(v_plus);

    // Price dynamics (log-Euler for positivity)
    const logReturn = (drift - 0.5 * v_plus) * dt + sqrtV * dW_S;
    const newPrice = currentPrice * Math.exp(logReturn);

    // Variance dynamics (CIR process with Full Truncation)
    // dv = κ(θ - v⁺) dt + ξ√(v⁺) dW_v
    const newVariance = currentVariance +
        kappa * (theta - v_plus) * dt +
        xi * sqrtV * dW_v;

    return {
        price: Math.max(newPrice, 1e-10),
        variance: newVariance  // Can be negative, handled in next step
    };
}

/**
 * Simulate full Heston path
 * Returns both price and variance paths
 */
export function simulateHestonPath(
    rng: MersenneTwister,
    config: HestonConfig,
    numSteps: number,
    dt: number
): { prices: number[]; variances: number[] } {
    const prices: number[] = [config.initialPrice];
    const variances: number[] = [config.initialVariance];

    let currentPrice = config.initialPrice;
    let currentVariance = config.initialVariance;

    for (let i = 0; i < numSteps; i++) {
        const result = stepHeston(rng, currentPrice, currentVariance, config, dt);
        currentPrice = result.price;
        currentVariance = result.variance;

        prices.push(currentPrice);
        variances.push(Math.max(0, currentVariance));  // Store positive for output
    }

    return { prices, variances };
}

/**
 * Calculate implied volatility smile from Heston model
 * Useful for option pricing calibration
 */
export function hestonImpliedVolatility(config: HestonConfig): number {
    // Approximate long-term implied volatility
    // This is a simplification; full calibration requires Fourier methods
    return Math.sqrt(config.theta);
}

// =============================================
// Process Factory
// =============================================

export type ProcessType = 'gbm' | 'ornstein_uhlenbeck' | 'jump_diffusion' | 'heston' | 'deterministic';

export interface ProcessConfig {
    type: ProcessType;
    params: GBMConfig | OUConfig | JumpDiffusionConfig | HestonConfig | { value: number };
    discretizationScheme?: 'euler' | 'milstein';  // For GBM
}

/**
 * Simulate a path for any process type
 * For Heston, returns only price path. Use simulateHestonPath directly for variance.
 */
export function simulatePath(
    rng: MersenneTwister,
    config: ProcessConfig,
    numSteps: number,
    dt: number
): number[] {
    switch (config.type) {
        case 'gbm':
            const scheme = config.discretizationScheme || 'euler';
            return simulateGBMPath(rng, config.params as GBMConfig, numSteps, dt, scheme);

        case 'ornstein_uhlenbeck':
            return simulateOUPath(rng, config.params as OUConfig, numSteps, dt);

        case 'jump_diffusion':
            return simulateJumpDiffusionPath(rng, config.params as JumpDiffusionConfig, numSteps, dt);

        case 'heston':
            const hestonResult = simulateHestonPath(rng, config.params as HestonConfig, numSteps, dt);
            return hestonResult.prices;

        case 'deterministic':
            const value = (config.params as { value: number }).value;
            return Array(numSteps + 1).fill(value);

        default:
            throw new Error(`Unknown process type: ${config.type}`);
    }
}

// =============================================
// Correlated Process Simulation
// =============================================

/**
 * Simulate multiple correlated processes
 * Uses Cholesky decomposition to correlate the normal innovations
 */
export function simulateCorrelatedPaths(
    rng: MersenneTwister,
    configs: ProcessConfig[],
    correlationMatrix: number[][],
    numSteps: number,
    dt: number
): number[][] {
    const n = configs.length;
    const paths: number[][] = configs.map(c => {
        if (c.type === 'gbm') {
            return [(c.params as GBMConfig).initialValue];
        } else if (c.type === 'ornstein_uhlenbeck') {
            return [(c.params as OUConfig).initialValue];
        } else if (c.type === 'jump_diffusion') {
            return [(c.params as JumpDiffusionConfig).initialValue];
        } else {
            return [(c.params as { value: number }).value];
        }
    });

    // Cholesky decomposition of correlation matrix
    const L = choleskyDecomp(correlationMatrix);

    for (let step = 0; step < numSteps; step++) {
        // Generate independent standard normals
        const z: number[] = [];
        for (let i = 0; i < n; i++) {
            z.push(sampleStandardNormal(rng));
        }

        // Apply Cholesky to get correlated normals
        const correlatedZ: number[] = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += L[i][j] * z[j];
            }
            correlatedZ.push(sum);
        }

        // Step each process using correlated innovation
        for (let i = 0; i < n; i++) {
            const config = configs[i];
            const currentValue = paths[i][paths[i].length - 1];
            let nextValue: number;

            if (config.type === 'gbm') {
                const p = config.params as GBMConfig;
                const exponent = (p.drift - 0.5 * p.volatility * p.volatility) * dt +
                    p.volatility * Math.sqrt(dt) * correlatedZ[i];
                nextValue = currentValue * Math.exp(exponent);
            } else if (config.type === 'ornstein_uhlenbeck') {
                const p = config.params as OUConfig;
                const expTerm = Math.exp(-p.theta * dt);
                const varianceTerm = p.sigma * Math.sqrt((1 - Math.exp(-2 * p.theta * dt)) / (2 * p.theta));
                nextValue = p.mu + (currentValue - p.mu) * expTerm + varianceTerm * correlatedZ[i];
            } else {
                nextValue = currentValue;
            }

            paths[i].push(nextValue);
        }
    }

    return paths;
}

// Inline Cholesky for this module
function choleskyDecomp(matrix: number[][]): number[][] {
    const n = matrix.length;
    const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            if (j === i) {
                for (let k = 0; k < j; k++) sum += L[j][k] * L[j][k];
                L[i][j] = Math.sqrt(Math.max(0.0001, matrix[i][j] - sum));
            } else {
                for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
                L[i][j] = (matrix[i][j] - sum) / L[j][j];
            }
        }
    }
    return L;
}
