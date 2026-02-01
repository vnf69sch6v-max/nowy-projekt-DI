// =============================================
// StochFin Type Definitions: Distributions
// Core types for probability distributions
// =============================================

/**
 * Supported distribution types
 */
export type DistributionType =
    | 'normal'
    | 'lognormal'
    | 'triangular'
    | 'pert'
    | 'student_t'
    | 'empirical'
    | 'uniform';

/**
 * Supported stochastic processes
 */
export type StochasticProcess =
    | 'gbm'                // Geometric Brownian Motion
    | 'ornstein_uhlenbeck' // Mean-reverting process
    | 'poisson'            // Count process
    | 'jump_diffusion'     // GBM with jumps
    | 'deterministic';     // Fixed value (requires justification)

/**
 * Source of distribution parameters
 */
export type ParameterSource =
    | 'historical_fit'
    | 'expert_elicitation'
    | 'regulatory_constraint'
    | 'template'
    | 'derived';

// =============================================
// Distribution Parameter Types
// =============================================

export interface NormalParams {
    mu: number;      // Mean
    sigma: number;   // Standard deviation
}

export interface LognormalParams {
    mu: number;      // Log-mean
    sigma: number;   // Log-std
}

export interface TriangularParams {
    min: number;
    mode: number;
    max: number;
}

export interface PertParams {
    optimistic: number;
    most_likely: number;
    pessimistic: number;
    lambda?: number;  // Shape parameter (default 4)
}

export interface StudentTParams {
    mu: number;
    sigma: number;
    nu: number;      // Degrees of freedom
}

export interface EmpiricalParams {
    samples: number[];
}

export interface UniformParams {
    min: number;
    max: number;
}

export type DistributionParams =
    | NormalParams
    | LognormalParams
    | TriangularParams
    | PertParams
    | StudentTParams
    | EmpiricalParams
    | UniformParams;

// =============================================
// GBM / O-U Process Parameters
// =============================================

export interface GBMParams {
    drift: number;           // μ - expected return
    drift_std_error?: number;
    volatility: number;      // σ - volatility
    volatility_std_error?: number;
    initial_value: number;
}

export interface OrnsteinUhlenbeckParams {
    theta: number;           // Mean reversion speed
    mu: number;              // Long-term mean
    sigma: number;           // Volatility
    initial_value: number;
    half_life_years?: number; // ln(2)/theta
}

export interface PoissonParams {
    lambda: number;          // Rate parameter
}

export interface JumpDiffusionParams extends GBMParams {
    jump_intensity: number;  // λ - jumps per year
    jump_mean: number;       // μ_j - avg jump size
    jump_std: number;        // σ_j - jump volatility
}

export type ProcessParams =
    | GBMParams
    | OrnsteinUhlenbeckParams
    | PoissonParams
    | JumpDiffusionParams
    | { value: number };     // Deterministic

// =============================================
// Distribution Object (Core Abstraction)
// =============================================

/**
 * The fundamental unit of uncertainty in StochFin.
 * Replaces primitive float for all forecasted values.
 */
export interface DistributionObject {
    distribution_type: DistributionType;
    parameters: DistributionParams;
    metadata: {
        source: ParameterSource;
        confidence_level: number;  // 0-1
        last_updated?: string;     // ISO timestamp
        assumptions_id?: string;   // Link to assumption
        estimation_period?: {
            start: string;
            end: string;
        };
        n_observations?: number;
    };
}

// =============================================
// Parameter Estimate (with uncertainty)
// =============================================

/**
 * Parameter estimate with confidence interval
 */
export interface ParameterEstimate {
    value: number;
    std_error?: number;
    confidence_95?: [number, number];
    source?: string;
}

// =============================================
// Simulation Result Types
// =============================================

/**
 * Statistical summary of simulation results
 */
export interface SimulationStatistics {
    // Central tendency
    mean: number;
    median: number;
    mode?: number;

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

    // Extremes
    min: number;
    max: number;
}

/**
 * Risk metrics derived from simulation
 */
export interface RiskMetrics {
    // Value at Risk
    var_90: number;
    var_95: number;
    var_99: number;

    // Conditional VaR (Expected Shortfall)
    cvar_90: number;
    cvar_95: number;
    cvar_99: number;

    // Probability metrics
    prob_negative: number;
    prob_below_threshold?: number;
    threshold_value?: number;
}

/**
 * Combined result for a single variable at a single period
 */
export interface VariableResult {
    variable_id: string;
    variable_code: string;
    period_index: number;
    period_date: string;
    statistics: SimulationStatistics;
    risk_metrics: RiskMetrics;
}

// =============================================
// Correlation Types
// =============================================

export type CorrelationType = 'pearson' | 'spearman' | 'kendall';

export type CopulaType =
    | 'gaussian'
    | 'student_t'
    | 'clayton'
    | 'gumbel'
    | 'frank';

export interface CorrelationMatrix {
    variables: string[];           // Variable IDs in order
    correlation_type: CorrelationType;
    matrix: number[][];            // Symmetric matrix
    copula_type?: CopulaType;
    copula_parameters?: Record<string, number>;
    regime?: 'normal' | 'stress' | 'crisis';
}

// =============================================
// Utility Types
// =============================================

/**
 * Scenario - one realization from Monte Carlo
 */
export interface Scenario {
    index: number;
    values: Record<string, number>;  // variable_code -> value
}

/**
 * Full scenario set
 */
export interface ScenarioSet {
    n_scenarios: number;
    period_index: number;
    scenarios: Scenario[];
}
