// =============================================
// StochFin Monte Carlo Engine: Copula Theory
// Modeling tail dependencies and extreme scenarios
// =============================================

import { MersenneTwister, sampleStandardNormal, sampleUniform } from './random';

// =============================================
// Copula Type Definitions
// =============================================

/** Clayton Copula - strong LOWER tail dependence (crash modeling) */
export interface ClaytonCopula {
    type: 'clayton';
    theta: number;  // θ > 0, higher = stronger dependence
}

/** Gumbel Copula - strong UPPER tail dependence (boom/inflation spiral) */
export interface GumbelCopula {
    type: 'gumbel';
    theta: number;  // θ ≥ 1, higher = stronger dependence
}

/** Frank Copula - symmetric, NO tail dependence */
export interface FrankCopula {
    type: 'frank';
    theta: number;  // θ ≠ 0, can be negative for negative dependence
}

/** Student-t Copula - symmetric tail dependence in BOTH tails */
export interface TCopula {
    type: 't';
    correlationMatrix: number[][];
    degreesOfFreedom: number;  // ν, lower = fatter tails
}

/** Gaussian Copula - NO tail dependence (λ_L = λ_U = 0) */
export interface GaussianCopula {
    type: 'gaussian';
    correlationMatrix: number[][];
}

/** Rotated Copula for negative dependencies (e.g., stagflation) */
export interface RotatedCopula {
    type: 'rotated';
    baseCopula: ClaytonCopula | GumbelCopula;
    rotation: 90 | 180 | 270;
}

export type CopulaConfig =
    | ClaytonCopula
    | GumbelCopula
    | FrankCopula
    | TCopula
    | GaussianCopula
    | RotatedCopula;

// =============================================
// Tail Dependence Coefficients
// =============================================

/**
 * Calculate tail dependence coefficient
 * λ_L: probability of extreme negative events occurring together
 * λ_U: probability of extreme positive events occurring together
 */
export function tailDependenceCoefficient(
    copula: Exclude<CopulaConfig, RotatedCopula>,
    tail: 'lower' | 'upper'
): number {
    switch (copula.type) {
        case 'clayton':
            // Clayton: λ_L = 2^(-1/θ), λ_U = 0
            if (tail === 'lower') {
                return Math.pow(2, -1 / copula.theta);
            }
            return 0;

        case 'gumbel':
            // Gumbel: λ_L = 0, λ_U = 2 - 2^(1/θ)
            if (tail === 'upper') {
                return 2 - Math.pow(2, 1 / copula.theta);
            }
            return 0;

        case 'frank':
            // Frank: λ_L = λ_U = 0 (no tail dependence)
            return 0;

        case 't':
            // t-Copula: symmetric, λ_L = λ_U > 0
            // For bivariate with correlation ρ:
            // λ = 2 * t_{ν+1}(-√((ν+1)(1-ρ)/(1+ρ)))
            // Approximation for simplicity:
            const nu = copula.degreesOfFreedom;
            const rho = copula.correlationMatrix[0]?.[1] || 0;
            const x = Math.sqrt((nu + 1) * (1 - rho) / (1 + rho));
            // Simplified: lower ν → higher tail dependence
            return 2 * studentTCDF(-x, nu + 1);

        case 'gaussian':
            // Gaussian: λ_L = λ_U = 0 (CRITICAL: no tail dependence!)
            return 0;

        default:
            return 0;
    }
}

// =============================================
// Copula Sampling Functions
// =============================================

/**
 * Sample from Clayton Copula using conditional method
 * C(u,v) = (u^(-θ) + v^(-θ) - 1)^(-1/θ)
 */
export function sampleClayton(
    rng: MersenneTwister,
    theta: number,
    n: number = 1
): number[][] {
    const samples: number[][] = [];

    for (let i = 0; i < n; i++) {
        const u = sampleUniform(rng, 0, 1);
        const w = sampleUniform(rng, 0, 1);

        // Conditional: v = (u^(-θ) * (w^(-θ/(1+θ)) - 1) + 1)^(-1/θ)
        const v = Math.pow(
            Math.pow(u, -theta) * (Math.pow(w, -theta / (1 + theta)) - 1) + 1,
            -1 / theta
        );

        samples.push([u, v]);
    }

    return samples;
}

/**
 * Sample from Gumbel Copula using Marshall-Olkin method
 * C(u,v) = exp(-((-ln u)^θ + (-ln v)^θ)^(1/θ))
 */
export function sampleGumbel(
    rng: MersenneTwister,
    theta: number,
    n: number = 1
): number[][] {
    const samples: number[][] = [];

    for (let i = 0; i < n; i++) {
        // Sample from stable distribution with α = 1/θ
        const s = sampleStable(rng, 1 / theta);

        // Sample two independent exponentials and scale
        const e1 = -Math.log(sampleUniform(rng, 0, 1));
        const e2 = -Math.log(sampleUniform(rng, 0, 1));

        const u = Math.exp(-Math.pow(e1 / s, 1 / theta));
        const v = Math.exp(-Math.pow(e2 / s, 1 / theta));

        samples.push([u, v]);
    }

    return samples;
}

/**
 * Sample from Frank Copula
 * C(u,v) = -1/θ * ln(1 + (e^(-θu) - 1)(e^(-θv) - 1)/(e^(-θ) - 1))
 */
export function sampleFrank(
    rng: MersenneTwister,
    theta: number,
    n: number = 1
): number[][] {
    const samples: number[][] = [];

    for (let i = 0; i < n; i++) {
        const u = sampleUniform(rng, 0, 1);
        const w = sampleUniform(rng, 0, 1);

        // Conditional sampling
        const a = 1 - Math.exp(-theta);
        const b = Math.exp(-theta * u);

        const v = -Math.log(1 - a / (w * (1 - b) / b + 1)) / theta;

        samples.push([u, Math.max(0, Math.min(1, v))]);
    }

    return samples;
}

/**
 * Sample from Gaussian Copula
 * Uses Cholesky decomposition
 */
export function sampleGaussianCopula(
    rng: MersenneTwister,
    correlationMatrix: number[][],
    n: number = 1
): number[][] {
    const dim = correlationMatrix.length;
    const L = choleskyLocal(correlationMatrix);
    const samples: number[][] = [];

    for (let i = 0; i < n; i++) {
        // Generate independent standard normals
        const z = Array(dim).fill(0).map(() => sampleStandardNormal(rng));

        // Apply Cholesky to get correlated normals
        const correlatedZ: number[] = [];
        for (let j = 0; j < dim; j++) {
            let sum = 0;
            for (let k = 0; k <= j; k++) {
                sum += L[j][k] * z[k];
            }
            correlatedZ.push(sum);
        }

        // Transform to uniform via Φ(z)
        const u = correlatedZ.map(zi => normalCDF(zi));
        samples.push(u);
    }

    return samples;
}

/**
 * Sample from Student-t Copula
 * More complex than Gaussian due to degree of freedom scaling
 */
export function sampleTCopula(
    rng: MersenneTwister,
    correlationMatrix: number[][],
    degreesOfFreedom: number,
    n: number = 1
): number[][] {
    const dim = correlationMatrix.length;
    const L = choleskyLocal(correlationMatrix);
    const samples: number[][] = [];

    for (let i = 0; i < n; i++) {
        // Generate independent standard normals
        const z = Array(dim).fill(0).map(() => sampleStandardNormal(rng));

        // Apply Cholesky to get correlated normals
        const correlatedZ: number[] = [];
        for (let j = 0; j < dim; j++) {
            let sum = 0;
            for (let k = 0; k <= j; k++) {
                sum += L[j][k] * z[k];
            }
            correlatedZ.push(sum);
        }

        // Sample from χ² distribution with ν degrees of freedom
        const chiSquared = sampleChiSquared(rng, degreesOfFreedom);
        const scale = Math.sqrt(degreesOfFreedom / chiSquared);

        // Scale the normals and transform via t-CDF
        const u = correlatedZ.map(zi => studentTCDF(zi * scale, degreesOfFreedom));
        samples.push(u);
    }

    return samples;
}

/**
 * Sample from rotated copula
 * 90° rotation: (1-v, u)
 * 180° rotation: (1-u, 1-v) - "survival copula"
 * 270° rotation: (v, 1-u)
 */
export function sampleRotatedCopula(
    rng: MersenneTwister,
    config: RotatedCopula,
    n: number = 1
): number[][] {
    // Sample from base copula
    let baseSamples: number[][];
    if (config.baseCopula.type === 'clayton') {
        baseSamples = sampleClayton(rng, config.baseCopula.theta, n);
    } else {
        baseSamples = sampleGumbel(rng, config.baseCopula.theta, n);
    }

    // Apply rotation
    return baseSamples.map(([u, v]) => {
        switch (config.rotation) {
            case 90:
                return [1 - v, u];
            case 180:
                return [1 - u, 1 - v];
            case 270:
                return [v, 1 - u];
            default:
                return [u, v];
        }
    });
}

// =============================================
// Unified Copula Sampling Interface
// =============================================

/**
 * Sample from any copula configuration
 * Returns n pairs of [u, v] ∈ [0,1]²
 */
export function sampleFromCopula(
    rng: MersenneTwister,
    copula: CopulaConfig,
    n: number = 1
): number[][] {
    switch (copula.type) {
        case 'clayton':
            return sampleClayton(rng, copula.theta, n);
        case 'gumbel':
            return sampleGumbel(rng, copula.theta, n);
        case 'frank':
            return sampleFrank(rng, copula.theta, n);
        case 'gaussian':
            return sampleGaussianCopula(rng, copula.correlationMatrix, n);
        case 't':
            return sampleTCopula(rng, copula.correlationMatrix, copula.degreesOfFreedom, n);
        case 'rotated':
            return sampleRotatedCopula(rng, copula, n);
        default:
            throw new Error(`Unknown copula type`);
    }
}

// =============================================
// Copula Parameter Estimation
// =============================================

/**
 * Estimate Kendall's tau from sample data
 * Used for fitting copula parameters
 */
export function kendallsTau(u: number[], v: number[]): number {
    const n = u.length;
    let concordant = 0;
    let discordant = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const sign = (u[i] - u[j]) * (v[i] - v[j]);
            if (sign > 0) concordant++;
            else if (sign < 0) discordant++;
        }
    }

    return (concordant - discordant) / (n * (n - 1) / 2);
}

/**
 * Fit Clayton copula parameter from Kendall's tau
 * τ = θ / (θ + 2)  =>  θ = 2τ / (1 - τ)
 */
export function fitClaytonFromTau(tau: number): ClaytonCopula {
    const theta = 2 * tau / (1 - tau);
    return {
        type: 'clayton',
        theta: Math.max(0.01, theta)  // Ensure positive
    };
}

/**
 * Fit Gumbel copula parameter from Kendall's tau
 * τ = 1 - 1/θ  =>  θ = 1 / (1 - τ)
 */
export function fitGumbelFromTau(tau: number): GumbelCopula {
    const theta = 1 / (1 - tau);
    return {
        type: 'gumbel',
        theta: Math.max(1, theta)  // Must be ≥ 1
    };
}

/**
 * Fit Frank copula parameter from Kendall's tau
 * More complex relationship, use numerical approximation
 */
export function fitFrankFromTau(tau: number): FrankCopula {
    // Approximate: θ ≈ sign(τ) * (1 + |τ|) * π / (sqrt(1 - τ²))
    // This is a rough approximation; full solution requires Debye function
    const sign = tau >= 0 ? 1 : -1;
    const absTau = Math.abs(tau);
    const theta = sign * (1 + absTau) * Math.PI / Math.sqrt(1 - absTau * absTau + 0.01);

    return {
        type: 'frank',
        theta: theta
    };
}

// =============================================
// Scenario Recommendations
// =============================================

/**
 * Get recommended copula for specific financial scenarios
 */
export function getCopulaForScenario(scenario: 'crash' | 'boom' | 'stagflation' | 'normal'): CopulaConfig {
    switch (scenario) {
        case 'crash':
            // Market crash: assets crash together
            return { type: 'clayton', theta: 2.5 };

        case 'boom':
            // Inflation spiral, simultaneous gains
            return { type: 'gumbel', theta: 3.0 };

        case 'stagflation':
            // Negative relationship: high inflation + low growth
            return {
                type: 'rotated',
                baseCopula: { type: 'gumbel', theta: 2.0 },
                rotation: 90
            };

        case 'normal':
        default:
            // Normal times: Gaussian copula (no tail dependence)
            return {
                type: 'gaussian',
                correlationMatrix: [[1, 0.5], [0.5, 1]]
            };
    }
}

// =============================================
// Helper Functions
// =============================================

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

/** Student-t CDF approximation */
function studentTCDF(x: number, nu: number): number {
    // For large ν, approximate with normal
    if (nu > 100) return normalCDF(x);

    // Simplified approximation for lower ν
    const t = x / Math.sqrt(nu);
    const z = x * Math.sqrt(1 - 2 / nu);
    return normalCDF(z) + (normalCDF(x) - normalCDF(z)) * Math.exp(-nu / 20);
}

/** Sample from χ² distribution with n degrees of freedom */
function sampleChiSquared(rng: MersenneTwister, n: number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const z = sampleStandardNormal(rng);
        sum += z * z;
    }
    return sum;
}

/** Sample from stable distribution (simplified for Gumbel copula) */
function sampleStable(rng: MersenneTwister, alpha: number): number {
    // Simplified: use Γ(1-α) approximation for Gumbel
    const u = Math.PI * (sampleUniform(rng, 0, 1) - 0.5);
    const w = -Math.log(sampleUniform(rng, 0, 1));

    if (Math.abs(alpha - 1) < 0.01) {
        return Math.tan(u);
    }

    const s = Math.pow(
        Math.sin(alpha * u) / Math.pow(Math.cos(u), 1 / alpha),
        1
    ) * Math.pow(
        Math.cos(u - alpha * u) / w,
        (1 - alpha) / alpha
    );

    return Math.max(0.001, s);
}

/** Local Cholesky decomposition */
function choleskyLocal(matrix: number[][]): number[][] {
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
