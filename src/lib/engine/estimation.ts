// =============================================
// StochFin Monte Carlo Engine: Parameter Estimation
// Estimate process parameters from historical data
// =============================================

import { mean, variance, stdDev } from './aggregator';

// =============================================
// GBM Parameter Estimation
// =============================================

export interface GBMEstimation {
    drift: number;
    drift_std_error: number;
    drift_conf_95: [number, number];
    volatility: number;
    volatility_std_error: number;
    volatility_conf_95: [number, number];
    n_observations: number;
    estimation_period: { start: string; end: string };
    normality_test?: {
        jarque_bera_statistic: number;
        p_value: number;
        is_normal: boolean;
    };
}

/**
 * Estimate GBM parameters from a price/value time series
 * 
 * @param prices Array of prices (must be positive)
 * @param dt Time step in years (e.g., 1/12 for monthly)
 * @param startDate ISO date string
 * @param endDate ISO date string
 */
export function estimateGBMParams(
    prices: number[],
    dt: number,
    startDate?: string,
    endDate?: string
): GBMEstimation {
    const n = prices.length - 1; // Number of returns

    if (n < 3) {
        throw new Error('Need at least 4 data points to estimate GBM parameters');
    }

    // Calculate log returns
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] <= 0 || prices[i - 1] <= 0) {
            throw new Error('Prices must be positive for GBM estimation');
        }
        logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }

    // Estimate volatility (σ)
    const returnStd = stdDev(logReturns);
    const sigma = returnStd / Math.sqrt(dt);
    const sigmaStdError = sigma / Math.sqrt(2 * n);

    // Estimate drift (μ) with Itô correction
    const returnMean = mean(logReturns);
    const mu = returnMean / dt + 0.5 * sigma * sigma;
    const muStdError = sigma / Math.sqrt(n * dt);

    // Confidence intervals
    const z95 = 1.96;

    // Jarque-Bera normality test
    const normalityTest = jarqueBeraTest(logReturns);

    return {
        drift: mu,
        drift_std_error: muStdError,
        drift_conf_95: [mu - z95 * muStdError, mu + z95 * muStdError],
        volatility: sigma,
        volatility_std_error: sigmaStdError,
        volatility_conf_95: [sigma - z95 * sigmaStdError, sigma + z95 * sigmaStdError],
        n_observations: n,
        estimation_period: {
            start: startDate || 'unknown',
            end: endDate || 'unknown'
        },
        normality_test: normalityTest
    };
}

// =============================================
// Ornstein-Uhlenbeck Parameter Estimation
// =============================================

export interface OUEstimation {
    theta: number;            // Mean reversion speed
    theta_std_error: number;
    mu: number;               // Long-term mean
    mu_std_error: number;
    sigma: number;            // Volatility
    sigma_std_error: number;
    half_life_years: number;
    n_observations: number;
    estimation_period: { start: string; end: string };
    is_mean_reverting: boolean;
    warning?: string;
}

/**
 * Estimate Ornstein-Uhlenbeck parameters from time series
 * Uses AR(1) regression: X_t = α + β * X_{t-1} + ε
 * 
 * @param values Time series values
 * @param dt Time step in years
 */
export function estimateOUParams(
    values: number[],
    dt: number,
    startDate?: string,
    endDate?: string
): OUEstimation {
    const n = values.length - 1;

    if (n < 5) {
        throw new Error('Need at least 6 data points to estimate O-U parameters');
    }

    // Prepare data for AR(1) regression
    const x: number[] = values.slice(0, -1);
    const y: number[] = values.slice(1);

    // OLS regression: y = α + β * x
    const xMean = mean(x);
    const yMean = mean(y);

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (x[i] - xMean) * (y[i] - yMean);
        denominator += (x[i] - xMean) ** 2;
    }

    const beta = numerator / denominator;
    const alpha = yMean - beta * xMean;

    // Calculate residuals and their standard deviation
    const residuals: number[] = [];
    for (let i = 0; i < n; i++) {
        residuals.push(y[i] - alpha - beta * x[i]);
    }
    const residualStd = stdDev(residuals);

    // Convert to O-U parameters
    // β = exp(-θ * dt) => θ = -ln(β) / dt
    // μ = α / (1 - β)
    // σ = residualStd * sqrt(-2 * ln(β) / (dt * (1 - β^2)))

    let theta: number;
    let mu: number;
    let sigma: number;
    let isMeanReverting = true;
    let warning: string | undefined;

    if (beta >= 1) {
        // No mean reversion
        isMeanReverting = false;
        theta = 0.001; // Small positive value
        mu = mean(values);
        sigma = stdDev(values) / Math.sqrt(dt);
        warning = 'No evidence of mean reversion. β ≥ 1 suggests unit root or explosive process.';
    } else if (beta <= 0) {
        // Extremely fast mean reversion (or oscillating)
        theta = 10; // Cap at high value
        mu = mean(values);
        sigma = stdDev(values);
        warning = 'Very fast mean reversion detected (β ≤ 0). Consider checking data quality.';
    } else {
        theta = -Math.log(beta) / dt;
        mu = alpha / (1 - beta);
        sigma = residualStd * Math.sqrt(-2 * Math.log(beta) / (dt * (1 - beta ** 2)));
    }

    const halfLife = Math.log(2) / theta;

    // Standard errors (approximate)
    const betaSE = residualStd / Math.sqrt(denominator);
    const thetaSE = betaSE / (beta * dt);
    const muSE = stdDev(values) / Math.sqrt(n);
    const sigmaSE = sigma / Math.sqrt(2 * n);

    return {
        theta,
        theta_std_error: Math.abs(thetaSE),
        mu,
        mu_std_error: muSE,
        sigma,
        sigma_std_error: sigmaSE,
        half_life_years: halfLife,
        n_observations: n,
        estimation_period: {
            start: startDate || 'unknown',
            end: endDate || 'unknown'
        },
        is_mean_reverting: isMeanReverting,
        warning
    };
}

// =============================================
// Statistical Tests
// =============================================

interface JarqueBeraResult {
    jarque_bera_statistic: number;
    p_value: number;
    is_normal: boolean;
}

/**
 * Jarque-Bera test for normality
 */
function jarqueBeraTest(values: number[]): JarqueBeraResult {
    const n = values.length;
    if (n < 8) {
        return { jarque_bera_statistic: 0, p_value: 1, is_normal: true };
    }

    const m = mean(values);
    const s = stdDev(values, m);

    if (s === 0) {
        return { jarque_bera_statistic: 0, p_value: 1, is_normal: true };
    }

    // Calculate skewness and kurtosis
    let sumCubed = 0;
    let sumFourth = 0;
    for (const v of values) {
        const z = (v - m) / s;
        sumCubed += z ** 3;
        sumFourth += z ** 4;
    }

    const S = sumCubed / n;  // Skewness
    const K = sumFourth / n - 3;  // Excess kurtosis

    // Jarque-Bera statistic
    const JB = (n / 6) * (S ** 2 + K ** 2 / 4);

    // Approximate p-value from chi-squared(2) distribution
    const pValue = 1 - chiSquaredCDF(JB, 2);

    return {
        jarque_bera_statistic: JB,
        p_value: pValue,
        is_normal: pValue >= 0.05
    };
}

/**
 * Chi-squared CDF approximation
 */
function chiSquaredCDF(x: number, k: number): number {
    if (x <= 0) return 0;

    // Gamma function approximation for small k
    const gamma = (n: number): number => {
        if (n === 1) return 1;
        if (n === 0.5) return Math.sqrt(Math.PI);
        return (n - 1) * gamma(n - 1);
    };

    // Incomplete gamma function approximation using series
    const incompleteGamma = (a: number, x: number): number => {
        let sum = 0;
        let term = 1 / a;
        for (let n = 0; n < 100; n++) {
            sum += term;
            term *= x / (a + n + 1);
            if (Math.abs(term) < 1e-10) break;
        }
        return Math.pow(x, a) * Math.exp(-x) * sum;
    };

    const a = k / 2;
    return incompleteGamma(a, x / 2) / gamma(a);
}

// =============================================
// Automatic Process Selection
// =============================================

export type RecommendedProcess = 'gbm' | 'ornstein_uhlenbeck' | 'deterministic';

export interface ProcessRecommendation {
    recommended: RecommendedProcess;
    confidence: number;
    reasoning: string;
    warnings: string[];
}

/**
 * Recommend appropriate stochastic process based on data characteristics
 */
export function recommendProcess(
    values: number[],
    variableName: string,
    variableType: 'monetary' | 'percentage' | 'ratio' | 'count'
): ProcessRecommendation {
    const warnings: string[] = [];

    // Check for non-positive values (GBM requirement)
    const hasNonPositive = values.some(v => v <= 0);

    // Check for bounded values (suggests mean-reversion)
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const meanVal = mean(values);
    const stdVal = stdDev(values);
    const cv = stdVal / Math.abs(meanVal);

    // Keywords suggesting mean-reversion
    const meanRevertingKeywords = ['margin', 'marża', 'roe', 'roa', 'ratio', 'rate', 'stopa', 'wskaźnik'];
    const isMeanRevertingName = meanRevertingKeywords.some(k =>
        variableName.toLowerCase().includes(k)
    );

    // Keywords suggesting growth process
    const growthKeywords = ['revenue', 'przychody', 'price', 'cena', 'sales', 'sprzedaż'];
    const isGrowthName = growthKeywords.some(k =>
        variableName.toLowerCase().includes(k)
    );

    // Low variation suggests deterministic
    if (cv < 0.03 && values.length >= 5) {
        return {
            recommended: 'deterministic',
            confidence: 0.9,
            reasoning: 'Very low coefficient of variation (< 3%) suggests stable, predictable values.',
            warnings
        };
    }

    // Percentage/ratio types
    if (variableType === 'percentage' || variableType === 'ratio' || isMeanRevertingName) {
        return {
            recommended: 'ornstein_uhlenbeck',
            confidence: 0.8,
            reasoning: 'Ratios and percentages typically exhibit mean reversion due to competitive forces.',
            warnings
        };
    }

    // Monetary values with strict positivity
    if (variableType === 'monetary' && !hasNonPositive || isGrowthName) {
        return {
            recommended: 'gbm',
            confidence: 0.8,
            reasoning: 'Monetary values like revenue typically follow Geometric Brownian Motion (compound growth).',
            warnings: hasNonPositive ? ['Values include zero or negative numbers - GBM may not be appropriate'] : []
        };
    }

    // Default based on data characteristics
    if (hasNonPositive) {
        return {
            recommended: 'ornstein_uhlenbeck',
            confidence: 0.6,
            reasoning: 'Data includes non-positive values, ruling out GBM. Ornstein-Uhlenbeck allows any real values.',
            warnings: ['Consider whether mean-reversion is economically justified']
        };
    }

    return {
        recommended: 'gbm',
        confidence: 0.5,
        reasoning: 'Defaulting to GBM for positive-valued data. Consider domain knowledge for better selection.',
        warnings: ['Low confidence - please verify process choice based on economic reasoning']
    };
}
