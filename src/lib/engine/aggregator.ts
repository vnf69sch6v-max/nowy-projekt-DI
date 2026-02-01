// =============================================
// StochFin Monte Carlo Engine: Aggregator
// Statistical aggregation of simulation results
// =============================================

/**
 * Calculate percentile from sorted array
 * Uses linear interpolation
 */
export function percentile(sortedValues: number[], p: number): number {
    const n = sortedValues.length;
    if (n === 0) throw new Error('Cannot calculate percentile of empty array');
    if (p <= 0) return sortedValues[0];
    if (p >= 100) return sortedValues[n - 1];

    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Calculate mean
 */
export function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate variance (sample variance)
 */
export function variance(values: number[], meanValue?: number): number {
    const n = values.length;
    if (n < 2) return 0;

    const m = meanValue ?? mean(values);
    const sumSq = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
    return sumSq / (n - 1);
}

/**
 * Calculate standard deviation
 */
export function stdDev(values: number[], meanValue?: number): number {
    return Math.sqrt(variance(values, meanValue));
}

/**
 * Calculate skewness (Fisher's definition)
 */
export function skewness(values: number[], meanValue?: number, stdValue?: number): number {
    const n = values.length;
    if (n < 3) return 0;

    const m = meanValue ?? mean(values);
    const s = stdValue ?? stdDev(values, m);
    if (s === 0) return 0;

    const sum = values.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
    return (n / ((n - 1) * (n - 2))) * sum;
}

/**
 * Calculate excess kurtosis
 */
export function kurtosis(values: number[], meanValue?: number, stdValue?: number): number {
    const n = values.length;
    if (n < 4) return 0;

    const m = meanValue ?? mean(values);
    const s = stdValue ?? stdDev(values, m);
    if (s === 0) return 0;

    const sum = values.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
    const rawKurt = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum;
    const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));

    return rawKurt - correction;
}

/**
 * Calculate mode estimate (using histogram binning)
 */
export function modeEstimate(values: number[], numBins: number = 50): number {
    if (values.length === 0) return 0;

    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return min;

    const binWidth = (max - min) / numBins;
    const bins = new Array(numBins).fill(0);

    for (const v of values) {
        const binIndex = Math.min(numBins - 1, Math.floor((v - min) / binWidth));
        bins[binIndex]++;
    }

    let maxBin = 0;
    let maxCount = 0;
    for (let i = 0; i < numBins; i++) {
        if (bins[i] > maxCount) {
            maxCount = bins[i];
            maxBin = i;
        }
    }

    return min + (maxBin + 0.5) * binWidth;
}

/**
 * Value at Risk (VaR)
 * VaR at p% = the p-th percentile of losses (negative returns)
 * For our purposes, we use the (100-p)th percentile of values
 * 
 * E.g., VaR 95 = P5 (5th percentile - the value that 95% of scenarios exceed)
 */
export function valueAtRisk(sortedValues: number[], confidenceLevel: number): number {
    const p = 100 - confidenceLevel;
    return percentile(sortedValues, p);
}

/**
 * Conditional VaR (Expected Shortfall)
 * CVaR at p% = mean of values below VaR
 */
export function conditionalVaR(sortedValues: number[], confidenceLevel: number): number {
    const varLevel = valueAtRisk(sortedValues, confidenceLevel);
    const tailValues = sortedValues.filter(v => v <= varLevel);

    if (tailValues.length === 0) return varLevel;
    return mean(tailValues);
}

/**
 * Probability of negative value
 */
export function probNegative(values: number[]): number {
    if (values.length === 0) return 0;
    const negativeCount = values.filter(v => v < 0).length;
    return negativeCount / values.length;
}

/**
 * Probability below threshold
 */
export function probBelowThreshold(values: number[], threshold: number): number {
    if (values.length === 0) return 0;
    const belowCount = values.filter(v => v < threshold).length;
    return belowCount / values.length;
}

/**
 * Interquartile range
 */
export function iqr(sortedValues: number[]): number {
    return percentile(sortedValues, 75) - percentile(sortedValues, 25);
}

/**
 * Coefficient of variation
 */
export function coefficientOfVariation(meanValue: number, stdValue: number): number {
    if (meanValue === 0) return 0;
    return stdValue / Math.abs(meanValue);
}

// =============================================
// Complete Statistics Bundle
// =============================================

export interface SimulationStats {
    // Sample size
    n: number;

    // Central tendency
    mean: number;
    median: number;
    mode: number;

    // Dispersion
    std_dev: number;
    variance: number;
    iqr: number;
    coefficient_of_variation: number;

    // Shape
    skewness: number;
    kurtosis: number;

    // Percentiles
    p01: number;
    p05: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p001?: number;
    p999?: number;

    // Risk metrics
    var_90: number;
    var_95: number;
    var_99: number;
    cvar_90: number;
    cvar_95: number;
    cvar_99: number;

    // Probability metrics
    prob_negative: number;
    prob_below_threshold?: number;
    threshold_value?: number;

    // Extremes
    min: number;
    max: number;
}

/**
 * Calculate all statistics for a set of values
 */
export function calculateStatistics(
    values: number[],
    threshold?: number
): SimulationStats {
    if (values.length === 0) {
        throw new Error('Cannot calculate statistics for empty array');
    }

    // Sort once for all percentile calculations
    const sorted = [...values].sort((a, b) => a - b);

    // Central measures
    const meanVal = mean(values);
    const medianVal = percentile(sorted, 50);
    const modeVal = modeEstimate(values);

    // Dispersion
    const varianceVal = variance(values, meanVal);
    const stdVal = Math.sqrt(varianceVal);
    const iqrVal = iqr(sorted);
    const cvVal = coefficientOfVariation(meanVal, stdVal);

    // Shape
    const skewnessVal = skewness(values, meanVal, stdVal);
    const kurtosisVal = kurtosis(values, meanVal, stdVal);

    // Risk metrics
    const var90 = valueAtRisk(sorted, 90);
    const var95 = valueAtRisk(sorted, 95);
    const var99 = valueAtRisk(sorted, 99);
    const cvar90 = conditionalVaR(sorted, 90);
    const cvar95 = conditionalVaR(sorted, 95);
    const cvar99 = conditionalVaR(sorted, 99);

    const result: SimulationStats = {
        n: values.length,

        mean: meanVal,
        median: medianVal,
        mode: modeVal,

        std_dev: stdVal,
        variance: varianceVal,
        iqr: iqrVal,
        coefficient_of_variation: cvVal,

        skewness: skewnessVal,
        kurtosis: kurtosisVal,

        p01: percentile(sorted, 1),
        p05: percentile(sorted, 5),
        p10: percentile(sorted, 10),
        p25: percentile(sorted, 25),
        p50: medianVal,
        p75: percentile(sorted, 75),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),

        var_90: var90,
        var_95: var95,
        var_99: var99,
        cvar_90: cvar90,
        cvar_95: cvar95,
        cvar_99: cvar99,

        prob_negative: probNegative(values),

        min: sorted[0],
        max: sorted[sorted.length - 1]
    };

    // Extreme percentiles for large samples
    if (values.length >= 1000) {
        result.p001 = percentile(sorted, 0.1);
        result.p999 = percentile(sorted, 99.9);
    }

    // Threshold probability
    if (threshold !== undefined) {
        result.prob_below_threshold = probBelowThreshold(values, threshold);
        result.threshold_value = threshold;
    }

    return result;
}

/**
 * Format statistics for display
 */
export function formatStatistics(stats: SimulationStats, decimals: number = 2): string {
    const f = (n: number) => n.toFixed(decimals);

    return `
Statistics (n=${stats.n}):
  Mean: ${f(stats.mean)} | Median: ${f(stats.median)} | Mode: ${f(stats.mode)}
  Std Dev: ${f(stats.std_dev)} | Variance: ${f(stats.variance)}
  Skewness: ${f(stats.skewness)} | Kurtosis: ${f(stats.kurtosis)}
  
Percentiles:
  P1: ${f(stats.p01)} | P5: ${f(stats.p05)} | P10: ${f(stats.p10)}
  P25: ${f(stats.p25)} | P50: ${f(stats.p50)} | P75: ${f(stats.p75)}
  P90: ${f(stats.p90)} | P95: ${f(stats.p95)} | P99: ${f(stats.p99)}
  
Risk Metrics:
  VaR 95%: ${f(stats.var_95)} | CVaR 95%: ${f(stats.cvar_95)}
  P(Negative): ${(stats.prob_negative * 100).toFixed(1)}%
  Min: ${f(stats.min)} | Max: ${f(stats.max)}
  `.trim();
}
