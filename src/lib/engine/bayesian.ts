// =============================================
// StochFin Monte Carlo Engine: Bayesian Updates
// Sequential learning with conjugate priors
// =============================================

// =============================================
// Beta-Bernoulli Conjugate Pair
// For: conversion rates, default probabilities, success rates
// =============================================

export interface BetaPrior {
    type: 'beta';
    alpha: number;  // pseudo-successes (α > 0)
    beta: number;   // pseudo-failures (β > 0)
}

/**
 * Update Beta prior with observed Bernoulli data
 * 
 * Prior: Beta(α, β)
 * Likelihood: Binomial(k successes, n trials)
 * Posterior: Beta(α + k, β + n - k)
 * 
 * The posterior becomes the prior for the next update
 */
export function updateBetaPrior(
    prior: BetaPrior,
    successes: number,
    failures: number
): BetaPrior {
    return {
        type: 'beta',
        alpha: prior.alpha + successes,
        beta: prior.beta + failures
    };
}

/**
 * Get statistics from Beta distribution
 */
export function betaPosteriorStats(prior: BetaPrior): {
    mean: number;
    mode: number | null;
    variance: number;
    credibleInterval95: [number, number];
    effectiveSampleSize: number;
} {
    const { alpha, beta } = prior;

    // Mean: α / (α + β)
    const mean = alpha / (alpha + beta);

    // Mode: (α - 1) / (α + β - 2), only defined for α > 1 and β > 1
    const mode = (alpha > 1 && beta > 1)
        ? (alpha - 1) / (alpha + beta - 2)
        : null;

    // Variance: αβ / ((α + β)² (α + β + 1))
    const variance = (alpha * beta) /
        ((alpha + beta) ** 2 * (alpha + beta + 1));

    // 95% Credible interval (approximation using Beta quantiles)
    const lower = betaQuantile(0.025, alpha, beta);
    const upper = betaQuantile(0.975, alpha, beta);

    // Effective sample size (pseudo-observations)
    const effectiveSampleSize = alpha + beta;

    return {
        mean,
        mode,
        variance,
        credibleInterval95: [lower, upper],
        effectiveSampleSize
    };
}

// =============================================
// Normal-Normal Conjugate Pair
// For: mean estimation with known variance
// =============================================

export interface NormalPrior {
    type: 'normal';
    mu: number;     // prior mean
    sigma: number;  // prior standard deviation
}

/**
 * Update Normal prior with observed Normal data (known variance)
 * 
 * Prior: N(μ₀, σ₀²)
 * Likelihood: N(μ, σ²) with σ known
 * Posterior: N(μ_n, σ_n²) where:
 *   μ_n = (σ²μ₀ + nσ₀²x̄) / (σ² + nσ₀²)
 *   σ_n² = (σ²σ₀²) / (σ² + nσ₀²)
 */
export function updateNormalPrior(
    prior: NormalPrior,
    observations: number[],
    knownVariance: number
): NormalPrior {
    const n = observations.length;
    if (n === 0) return prior;

    const xBar = observations.reduce((a, b) => a + b, 0) / n;
    const priorVariance = prior.sigma ** 2;

    // Posterior precision = prior precision + data precision
    const posteriorVariance = (knownVariance * priorVariance) /
        (knownVariance + n * priorVariance);

    // Posterior mean = weighted average
    const posteriorMean = (knownVariance * prior.mu + n * priorVariance * xBar) /
        (knownVariance + n * priorVariance);

    return {
        type: 'normal',
        mu: posteriorMean,
        sigma: Math.sqrt(posteriorVariance)
    };
}

/**
 * Get statistics from Normal posterior
 */
export function normalPosteriorStats(prior: NormalPrior): {
    mean: number;
    std: number;
    credibleInterval95: [number, number];
    precision: number;
} {
    const { mu, sigma } = prior;

    return {
        mean: mu,
        std: sigma,
        credibleInterval95: [mu - 1.96 * sigma, mu + 1.96 * sigma],
        precision: 1 / (sigma ** 2)
    };
}

// =============================================
// Normal-Inverse-Gamma Conjugate Pair
// For: mean and variance estimation (both unknown)
// =============================================

export interface NormalInverseGammaPrior {
    type: 'normal_inverse_gamma';
    mu: number;      // prior mean location
    lambda: number;  // precision multiplier (pseudo observations for mean)
    alpha: number;   // shape for variance
    beta: number;    // scale for variance
}

/**
 * Update NIG prior with observations (unknown mean and variance)
 */
export function updateNormalInverseGammaPrior(
    prior: NormalInverseGammaPrior,
    observations: number[]
): NormalInverseGammaPrior {
    const n = observations.length;
    if (n === 0) return prior;

    const xBar = observations.reduce((a, b) => a + b, 0) / n;
    const sumSquares = observations.reduce((a, x) => a + (x - xBar) ** 2, 0);

    const { mu: mu0, lambda: lambda0, alpha: alpha0, beta: beta0 } = prior;

    const lambdaN = lambda0 + n;
    const muN = (lambda0 * mu0 + n * xBar) / lambdaN;
    const alphaN = alpha0 + n / 2;
    const betaN = beta0 + 0.5 * sumSquares +
        (lambda0 * n * (xBar - mu0) ** 2) / (2 * lambdaN);

    return {
        type: 'normal_inverse_gamma',
        mu: muN,
        lambda: lambdaN,
        alpha: alphaN,
        beta: betaN
    };
}

// =============================================
// Prior Elicitation Functions
// =============================================

/**
 * Elicit Beta prior from expert knowledge
 * 
 * @param expertMode The most likely value (0-1)
 * @param expertConfidence How confident (0-1), higher = narrower distribution
 */
export function elicitBetaPrior(
    expertMode: number,
    expertConfidence: number
): BetaPrior {
    // Map confidence to equivalent sample size
    // Low confidence: ~2 observations, High: ~100 observations
    const effectiveN = 2 + expertConfidence * 98;

    // Mode = (α - 1) / (α + β - 2)
    // For a given mode m and effective sample size n:
    // α = m * (n - 2) + 1
    // β = (1 - m) * (n - 2) + 1
    const alpha = expertMode * (effectiveN - 2) + 1;
    const beta = (1 - expertMode) * (effectiveN - 2) + 1;

    return {
        type: 'beta',
        alpha: Math.max(1, alpha),
        beta: Math.max(1, beta)
    };
}

/**
 * Elicit Normal prior from expert knowledge
 * 
 * @param expertMean Expected value
 * @param expert95Lower Lower bound of "95% confident" range
 * @param expert95Upper Upper bound of "95% confident" range
 */
export function elicitNormalPrior(
    expertMean: number,
    expert95Lower: number,
    expert95Upper: number
): NormalPrior {
    // 95% CI spans approximately 4 standard deviations
    const range = expert95Upper - expert95Lower;
    const sigma = range / 4;

    return {
        type: 'normal',
        mu: expertMean,
        sigma: sigma
    };
}

/**
 * Create weakly informative Beta prior (near-uniform)
 * Jeffreys prior: Beta(0.5, 0.5)
 * Uniform: Beta(1, 1)
 */
export function weakBetaPrior(type: 'jeffreys' | 'uniform' = 'jeffreys'): BetaPrior {
    return {
        type: 'beta',
        alpha: type === 'jeffreys' ? 0.5 : 1,
        beta: type === 'jeffreys' ? 0.5 : 1
    };
}

/**
 * Create weakly informative Normal prior
 * Centered at 0 with very large variance
 */
export function weakNormalPrior(scale: number = 100): NormalPrior {
    return {
        type: 'normal',
        mu: 0,
        sigma: scale
    };
}

// =============================================
// A/B Testing Utilities
// =============================================

export interface ABTestResult {
    controlPrior: BetaPrior;
    treatmentPrior: BetaPrior;
    probabilityTreatmentBetter: number;
    expectedLift: number;
    credibleIntervalLift: [number, number];
}

/**
 * Analyze A/B test results using Bayesian approach
 */
export function analyzeABTest(
    controlSuccesses: number,
    controlFailures: number,
    treatmentSuccesses: number,
    treatmentFailures: number,
    basePrior: BetaPrior = { type: 'beta', alpha: 1, beta: 1 },
    nSamples: number = 10000
): ABTestResult {
    // Update posteriors
    const controlPosterior = updateBetaPrior(basePrior, controlSuccesses, controlFailures);
    const treatmentPosterior = updateBetaPrior(basePrior, treatmentSuccesses, treatmentFailures);

    // Monte Carlo estimate of P(treatment > control)
    let treatmentWins = 0;
    let totalLift = 0;
    const liftSamples: number[] = [];

    for (let i = 0; i < nSamples; i++) {
        const controlSample = sampleBeta(controlPosterior.alpha, controlPosterior.beta);
        const treatmentSample = sampleBeta(treatmentPosterior.alpha, treatmentPosterior.beta);

        if (treatmentSample > controlSample) treatmentWins++;

        const lift = (treatmentSample - controlSample) / controlSample;
        totalLift += lift;
        liftSamples.push(lift);
    }

    liftSamples.sort((a, b) => a - b);

    return {
        controlPrior: controlPosterior,
        treatmentPrior: treatmentPosterior,
        probabilityTreatmentBetter: treatmentWins / nSamples,
        expectedLift: totalLift / nSamples,
        credibleIntervalLift: [
            liftSamples[Math.floor(nSamples * 0.025)],
            liftSamples[Math.floor(nSamples * 0.975)]
        ]
    };
}

// =============================================
// Thompson Sampling (Bayesian Bandits)
// =============================================

export interface BanditArm {
    id: string;
    prior: BetaPrior;
    totalPulls: number;
    totalReward: number;
}

/**
 * Select arm using Thompson Sampling
 * Samples from each posterior and picks the highest
 */
export function thompsonSampling(arms: BanditArm[]): string {
    let bestArm = arms[0].id;
    let bestSample = -Infinity;

    for (const arm of arms) {
        const sample = sampleBeta(arm.prior.alpha, arm.prior.beta);
        if (sample > bestSample) {
            bestSample = sample;
            bestArm = arm.id;
        }
    }

    return bestArm;
}

/**
 * Update bandit arm after observing reward
 */
export function updateBanditArm(
    arm: BanditArm,
    reward: 0 | 1
): BanditArm {
    return {
        ...arm,
        prior: updateBetaPrior(arm.prior, reward, 1 - reward),
        totalPulls: arm.totalPulls + 1,
        totalReward: arm.totalReward + reward
    };
}

// =============================================
// Helper Functions
// =============================================

/**
 * Beta distribution quantile (inverse CDF) approximation
 */
function betaQuantile(p: number, alpha: number, beta: number): number {
    // Use normal approximation for large alpha + beta
    if (alpha + beta > 30) {
        const mean = alpha / (alpha + beta);
        const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
        const z = normalQuantile(p);
        return Math.max(0, Math.min(1, mean + z * Math.sqrt(variance)));
    }

    // Binary search for smaller parameters
    let low = 0, high = 1;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const cdf = betaIncomplete(mid, alpha, beta);
        if (cdf < p) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
}

/**
 * Incomplete Beta function (regularized)
 */
function betaIncomplete(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use continued fraction expansion
    const bt = Math.exp(
        gammaLn(a + b) - gammaLn(a) - gammaLn(b) +
        a * Math.log(x) + b * Math.log(1 - x)
    );

    if (x < (a + 1) / (a + b + 2)) {
        return bt * betaCF(x, a, b) / a;
    } else {
        return 1 - bt * betaCF(1 - x, b, a) / b;
    }
}

/**
 * Continued fraction for incomplete beta
 */
function betaCF(x: number, a: number, b: number): number {
    const maxIter = 100;
    const eps = 1e-10;

    let am = 1, bm = 1, az = 1;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let bz = 1 - qab * x / qap;

    for (let m = 1; m <= maxIter; m++) {
        const em = m;
        const tem = em + em;
        let d = em * (b - m) * x / ((qam + tem) * (a + tem));
        const ap = az + d * am;
        const bp = bz + d * bm;
        d = -(a + em) * (qab + em) * x / ((a + tem) * (qap + tem));
        const app = ap + d * az;
        const bpp = bp + d * bz;
        const aold = az;
        am = ap / bpp;
        bm = bp / bpp;
        az = app / bpp;
        bz = 1;
        if (Math.abs(az - aold) < eps * Math.abs(az)) break;
    }

    return az;
}

/**
 * Log Gamma function (Lanczos approximation)
 */
function gammaLn(x: number): number {
    const c = [
        76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.001208650973866179, -0.000005395239384953
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
        ser += c[j] / ++y;
    }

    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Standard normal quantile (inverse CDF)
 */
function normalQuantile(p: number): number {
    // Abramowitz and Stegun approximation
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
 * Sample from Beta distribution using rejection sampling
 */
function sampleBeta(alpha: number, beta: number): number {
    // For α, β > 1, use Gamma-based method
    const gammaA = sampleGamma(alpha);
    const gammaB = sampleGamma(beta);
    return gammaA / (gammaA + gammaB);
}

/**
 * Sample from Gamma(alpha, 1) using Marsaglia-Tsang method
 */
function sampleGamma(alpha: number): number {
    if (alpha < 1) {
        // For alpha < 1, use alpha + 1 and scale
        const u = Math.random();
        return sampleGamma(alpha + 1) * Math.pow(u, 1 / alpha);
    }

    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x: number, v: number;
        do {
            x = normalRandom();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
}

/**
 * Standard normal random using Box-Muller
 */
function normalRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
