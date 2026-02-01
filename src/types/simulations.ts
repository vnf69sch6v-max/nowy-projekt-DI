// =============================================
// StochFin Type Definitions: Simulations
// Types for simulation runs and results
// =============================================

import type {
    SimulationStatistics,
    RiskMetrics,
    VariableResult
} from './distributions';

// =============================================
// Simulation Run Types
// =============================================

export type RunType =
    | 'full_monte_carlo'
    | 'sensitivity'
    | 'stress_test'
    | 'scenario_analysis';

export type SimulationStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'invalidated';

export type CorrelationMethod =
    | 'cholesky'
    | 'copula_gaussian'
    | 'copula_t'
    | 'copula_clayton';

export interface SimulationRun {
    id: string;
    model_id: string;
    run_type: RunType;
    n_simulations: number;
    random_seed?: number;
    correlation_method: CorrelationMethod;
    status: SimulationStatus;
    started_at?: string;
    completed_at?: string;
    compute_time_seconds?: number;
    error_message?: string;
    scenarios_storage_path?: string;
    model_snapshot_id?: string;
    created_at: string;
    created_by: string;
}

export interface StartSimulationInput {
    model_id: string;
    run_type?: RunType;
    n_simulations?: number;
    random_seed?: number;
    correlation_method?: CorrelationMethod;
}

// =============================================
// Aggregated Result Types
// =============================================

export interface AggregatedResult {
    id: string;
    simulation_run_id: string;
    variable_id: string;
    period_index: number;
    period_date: string;

    // Central tendencies
    mean: number;
    median: number;
    mode_estimate?: number;

    // Dispersion
    std_dev: number;
    variance: number;
    iqr?: number;
    coefficient_of_variation?: number;

    // Shape
    skewness?: number;
    kurtosis?: number;

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

    // Additional tail percentiles
    p001?: number;
    p999?: number;

    // Risk metrics
    var_90?: number;
    var_95?: number;
    var_99?: number;
    cvar_90?: number;
    cvar_95?: number;
    cvar_99?: number;

    // Probability metrics
    prob_negative?: number;
    prob_below_threshold?: number;
    threshold_value?: number;

    // Extremes
    min_value: number;
    max_value: number;

    created_at: string;
}

// =============================================
// Covenant Result Types
// =============================================

export interface CovenantResult {
    id: string;
    simulation_run_id: string;
    covenant_id: string;
    period_index: number;
    period_date: string;
    breach_probability: number;
    avg_breach_magnitude?: number;
    max_breach_magnitude?: number;
    n_breach_scenarios: number;
    created_at: string;
}

// =============================================
// Sensitivity Analysis Types
// =============================================

export interface SensitivityResult {
    id: string;
    simulation_run_id: string;
    input_variable_id: string;
    output_variable_id: string;
    tornado_impact_low?: number;
    tornado_impact_high?: number;
    elasticity?: number;
    correlation_with_output?: number;
    importance_rank?: number;
    created_at: string;
}

// =============================================
// Stress Test Types
// =============================================

export type StressScenarioType =
    | 'recession'
    | 'commodity_shock'
    | 'interest_rate_shock'
    | 'customer_loss'
    | 'supply_chain'
    | 'custom';

export interface StressScenario {
    id: string;
    simulation_run_id: string;
    scenario_name: string;
    scenario_type: StressScenarioType;
    description?: string;
    stress_parameters: Record<string, number>;
    results: Record<string, {
        mean: number;
        p10: number;
        p50: number;
        p90: number;
        prob_negative?: number;
    }>;
    created_at: string;
}

// =============================================
// Simulation Results Bundle
// =============================================

export interface SimulationResultsBundle {
    simulation: SimulationRun;
    results_by_variable: Record<string, AggregatedResult[]>;  // variable_id -> periods
    covenant_results?: CovenantResult[];
    sensitivity_results?: SensitivityResult[];
    stress_scenarios?: StressScenario[];
}

// =============================================
// Dashboard View Types
// =============================================

export interface RiskDashboardData {
    // Key risk metrics
    cash_flow_at_risk_95: number;
    prob_negative_cash_flow: number;
    prob_covenant_breach: Record<string, number>;  // covenant_id -> probability

    // Scenario summary
    scenarios: {
        pessimistic: Record<string, number>;  // variable_code -> P10
        base: Record<string, number>;         // variable_code -> P50
        optimistic: Record<string, number>;   // variable_code -> P90
    };

    // Time series for key variables
    timeseries: {
        variable_code: string;
        periods: string[];  // dates
        p10: number[];
        p25: number[];
        p50: number[];
        p75: number[];
        p90: number[];
    }[];

    // Active alerts
    alerts: RiskAlert[];
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RiskAlert {
    id: string;
    type: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    variable_code?: string;
    period?: string;
    probability?: number;
    threshold?: number;
    created_at: string;
}

// =============================================
// Backtesting Types
// =============================================

export interface BacktestRecord {
    id: string;
    model_id: string;
    forecast_snapshot_id?: string;
    forecast_date: string;
    variable_id: string;
    target_period: string;
    forecasted_p10?: number;
    forecasted_p50?: number;
    forecasted_p90?: number;
    forecasted_mean?: number;
    actual_value?: number;
    error?: number;
    absolute_error?: number;
    percentage_error?: number;
    was_within_50_ci?: boolean;
    was_within_90_ci?: boolean;
    created_at: string;
}

export interface BacktestSummary {
    variable_id: string;
    variable_code: string;
    n_observations: number;
    coverage_50_ci: number;  // % of actuals within P25-P75
    coverage_90_ci: number;  // % of actuals within P5-P95
    mean_error: number;
    mean_absolute_error: number;
    mean_percentage_error: number;
    is_well_calibrated: boolean;
    recommendation?: string;
}
