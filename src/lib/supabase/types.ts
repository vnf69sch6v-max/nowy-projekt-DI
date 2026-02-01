// =============================================
// StochFin Supabase Database Types
// Auto-generated types for database schema
// =============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    core: {
        Tables: {
            entities: {
                Row: {
                    id: string
                    name: string
                    entity_type: 'company' | 'project' | 'portfolio' | 'segment'
                    parent_entity_id: string | null
                    industry: string | null
                    description: string | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                    created_by: string
                }
                Insert: {
                    id?: string
                    name: string
                    entity_type: 'company' | 'project' | 'portfolio' | 'segment'
                    parent_entity_id?: string | null
                    industry?: string | null
                    description?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                    created_by: string
                }
                Update: {
                    id?: string
                    name?: string
                    entity_type?: 'company' | 'project' | 'portfolio' | 'segment'
                    parent_entity_id?: string | null
                    industry?: string | null
                    description?: string | null
                    metadata?: Json
                    updated_at?: string
                }
            }
            variable_definitions: {
                Row: {
                    id: string
                    code: string
                    name: string
                    name_pl: string | null
                    description: string | null
                    variable_category: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'ratio' | 'macro' | 'operational' | 'custom'
                    data_type: 'monetary' | 'percentage' | 'ratio' | 'count' | 'text'
                    default_unit: string | null
                    typical_process: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'deterministic' | null
                    is_driver: boolean
                    is_derived: boolean
                    derivation_formula: string | null
                    bounds_min: number | null
                    bounds_max: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    code: string
                    name: string
                    name_pl?: string | null
                    description?: string | null
                    variable_category: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'ratio' | 'macro' | 'operational' | 'custom'
                    data_type: 'monetary' | 'percentage' | 'ratio' | 'count' | 'text'
                    default_unit?: string | null
                    typical_process?: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'deterministic' | null
                    is_driver?: boolean
                    is_derived?: boolean
                    derivation_formula?: string | null
                    bounds_min?: number | null
                    bounds_max?: number | null
                    created_at?: string
                }
                Update: {
                    code?: string
                    name?: string
                    name_pl?: string | null
                    description?: string | null
                    variable_category?: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'ratio' | 'macro' | 'operational' | 'custom'
                    data_type?: 'monetary' | 'percentage' | 'ratio' | 'count' | 'text'
                    default_unit?: string | null
                    typical_process?: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'deterministic' | null
                    is_driver?: boolean
                    is_derived?: boolean
                    derivation_formula?: string | null
                    bounds_min?: number | null
                    bounds_max?: number | null
                }
            }
            historical_facts: {
                Row: {
                    id: string
                    entity_id: string
                    variable_id: string
                    period_type: 'instant' | 'duration'
                    period_start: string
                    period_end: string | null
                    value: number
                    currency: string | null
                    confidence_level: 'audited_final' | 'audited_preliminary' | 'unaudited' | 'estimated' | 'restated'
                    measurement_error_std: number
                    source_type: string | null
                    source_document_url: string | null
                    source_api: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    entity_id: string
                    variable_id: string
                    period_type: 'instant' | 'duration'
                    period_start: string
                    period_end?: string | null
                    value: number
                    currency?: string | null
                    confidence_level?: 'audited_final' | 'audited_preliminary' | 'unaudited' | 'estimated' | 'restated'
                    measurement_error_std?: number
                    source_type?: string | null
                    source_document_url?: string | null
                    source_api?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                }
                Update: {
                    entity_id?: string
                    variable_id?: string
                    period_type?: 'instant' | 'duration'
                    period_start?: string
                    period_end?: string | null
                    value?: number
                    currency?: string | null
                    confidence_level?: 'audited_final' | 'audited_preliminary' | 'unaudited' | 'estimated' | 'restated'
                    measurement_error_std?: number
                    source_type?: string | null
                    source_document_url?: string | null
                    source_api?: string | null
                    notes?: string | null
                    updated_at?: string
                }
            }
        }
    }
    models: {
        Tables: {
            forecast_models: {
                Row: {
                    id: string
                    entity_id: string
                    name: string
                    description: string | null
                    version: number
                    status: 'draft' | 'active' | 'archived' | 'superseded'
                    base_date: string
                    horizon_months: number
                    time_step: 'monthly' | 'quarterly' | 'yearly'
                    n_simulations: number
                    random_seed: number | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                    created_by: string
                    approved_by: string | null
                    approved_at: string | null
                }
                Insert: {
                    id?: string
                    entity_id: string
                    name: string
                    description?: string | null
                    version?: number
                    status?: 'draft' | 'active' | 'archived' | 'superseded'
                    base_date: string
                    horizon_months?: number
                    time_step?: 'monthly' | 'quarterly' | 'yearly'
                    n_simulations?: number
                    random_seed?: number | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                    created_by: string
                    approved_by?: string | null
                    approved_at?: string | null
                }
                Update: {
                    entity_id?: string
                    name?: string
                    description?: string | null
                    version?: number
                    status?: 'draft' | 'active' | 'archived' | 'superseded'
                    base_date?: string
                    horizon_months?: number
                    time_step?: 'monthly' | 'quarterly' | 'yearly'
                    n_simulations?: number
                    random_seed?: number | null
                    metadata?: Json
                    updated_at?: string
                    approved_by?: string | null
                    approved_at?: string | null
                }
            }
            variable_assumptions: {
                Row: {
                    id: string
                    model_id: string
                    variable_id: string
                    is_stochastic: boolean
                    stochastic_process: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'triangular' | 'pert' | 'normal' | 'lognormal' | 'student_t' | 'empirical' | 'deterministic' | null
                    distribution_parameters: Json
                    parameter_estimation_method: 'mle' | 'bayesian' | 'expert_elicitation' | 'regulatory' | 'historical_fit' | null
                    estimation_period_start: string | null
                    estimation_period_end: string | null
                    n_observations: number | null
                    assumptions_narrative: string
                    sensitivity_flag: 'low' | 'medium' | 'high' | 'critical'
                    deterministic_justification: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    model_id: string
                    variable_id: string
                    is_stochastic?: boolean
                    stochastic_process?: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'triangular' | 'pert' | 'normal' | 'lognormal' | 'student_t' | 'empirical' | 'deterministic' | null
                    distribution_parameters: Json
                    parameter_estimation_method?: 'mle' | 'bayesian' | 'expert_elicitation' | 'regulatory' | 'historical_fit' | null
                    estimation_period_start?: string | null
                    estimation_period_end?: string | null
                    n_observations?: number | null
                    assumptions_narrative: string
                    sensitivity_flag?: 'low' | 'medium' | 'high' | 'critical'
                    deterministic_justification?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    model_id?: string
                    variable_id?: string
                    is_stochastic?: boolean
                    stochastic_process?: 'gbm' | 'ornstein_uhlenbeck' | 'poisson' | 'triangular' | 'pert' | 'normal' | 'lognormal' | 'student_t' | 'empirical' | 'deterministic' | null
                    distribution_parameters?: Json
                    parameter_estimation_method?: 'mle' | 'bayesian' | 'expert_elicitation' | 'regulatory' | 'historical_fit' | null
                    estimation_period_start?: string | null
                    estimation_period_end?: string | null
                    n_observations?: number | null
                    assumptions_narrative?: string
                    sensitivity_flag?: 'low' | 'medium' | 'high' | 'critical'
                    deterministic_justification?: string | null
                    updated_at?: string
                }
            }
            correlation_matrices: {
                Row: {
                    id: string
                    model_id: string
                    name: string
                    correlation_type: 'pearson' | 'spearman' | 'kendall'
                    variable_assumption_ids: string[]
                    matrix_values: number[][]
                    copula_type: 'gaussian' | 'student_t' | 'clayton' | 'gumbel' | 'frank' | null
                    copula_parameters: Json | null
                    regime_type: 'normal' | 'stress' | 'crisis' | null
                    source: 'historical_estimation' | 'expert_judgment' | 'template' | 'regulatory'
                    estimation_details: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    model_id: string
                    name?: string
                    correlation_type?: 'pearson' | 'spearman' | 'kendall'
                    variable_assumption_ids: string[]
                    matrix_values: number[][]
                    copula_type?: 'gaussian' | 'student_t' | 'clayton' | 'gumbel' | 'frank' | null
                    copula_parameters?: Json | null
                    regime_type?: 'normal' | 'stress' | 'crisis' | null
                    source: 'historical_estimation' | 'expert_judgment' | 'template' | 'regulatory'
                    estimation_details?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    model_id?: string
                    name?: string
                    correlation_type?: 'pearson' | 'spearman' | 'kendall'
                    variable_assumption_ids?: string[]
                    matrix_values?: number[][]
                    copula_type?: 'gaussian' | 'student_t' | 'clayton' | 'gumbel' | 'frank' | null
                    copula_parameters?: Json | null
                    regime_type?: 'normal' | 'stress' | 'crisis' | null
                    source?: 'historical_estimation' | 'expert_judgment' | 'template' | 'regulatory'
                    estimation_details?: Json | null
                    updated_at?: string
                }
            }
            covenants: {
                Row: {
                    id: string
                    model_id: string
                    name: string
                    description: string | null
                    constraint_type: 'max_leverage' | 'min_dscr' | 'min_cash' | 'max_net_debt' | 'custom'
                    variable_id: string | null
                    threshold_value: number
                    comparison_operator: '<' | '<=' | '>' | '>=' | '='
                    breach_penalty: Json | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    model_id: string
                    name: string
                    description?: string | null
                    constraint_type: 'max_leverage' | 'min_dscr' | 'min_cash' | 'max_net_debt' | 'custom'
                    variable_id?: string | null
                    threshold_value: number
                    comparison_operator: '<' | '<=' | '>' | '>=' | '='
                    breach_penalty?: Json | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    model_id?: string
                    name?: string
                    description?: string | null
                    constraint_type?: 'max_leverage' | 'min_dscr' | 'min_cash' | 'max_net_debt' | 'custom'
                    variable_id?: string | null
                    threshold_value?: number
                    comparison_operator?: '<' | '<=' | '>' | '>=' | '='
                    breach_penalty?: Json | null
                    is_active?: boolean
                }
            }
        }
    }
    simulations: {
        Tables: {
            simulation_runs: {
                Row: {
                    id: string
                    model_id: string
                    run_type: 'full_monte_carlo' | 'sensitivity' | 'stress_test' | 'scenario_analysis'
                    n_simulations: number
                    random_seed: number | null
                    correlation_method: 'cholesky' | 'copula_gaussian' | 'copula_t' | 'copula_clayton'
                    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'invalidated'
                    started_at: string | null
                    completed_at: string | null
                    compute_time_seconds: number | null
                    error_message: string | null
                    scenarios_storage_path: string | null
                    model_snapshot_id: string | null
                    created_at: string
                    created_by: string
                }
                Insert: {
                    id?: string
                    model_id: string
                    run_type?: 'full_monte_carlo' | 'sensitivity' | 'stress_test' | 'scenario_analysis'
                    n_simulations: number
                    random_seed?: number | null
                    correlation_method?: 'cholesky' | 'copula_gaussian' | 'copula_t' | 'copula_clayton'
                    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'invalidated'
                    started_at?: string | null
                    completed_at?: string | null
                    compute_time_seconds?: number | null
                    error_message?: string | null
                    scenarios_storage_path?: string | null
                    model_snapshot_id?: string | null
                    created_at?: string
                    created_by: string
                }
                Update: {
                    model_id?: string
                    run_type?: 'full_monte_carlo' | 'sensitivity' | 'stress_test' | 'scenario_analysis'
                    n_simulations?: number
                    random_seed?: number | null
                    correlation_method?: 'cholesky' | 'copula_gaussian' | 'copula_t' | 'copula_clayton'
                    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'invalidated'
                    started_at?: string | null
                    completed_at?: string | null
                    compute_time_seconds?: number | null
                    error_message?: string | null
                    scenarios_storage_path?: string | null
                    model_snapshot_id?: string | null
                }
            }
            aggregated_results: {
                Row: {
                    id: string
                    simulation_run_id: string
                    variable_id: string
                    period_index: number
                    period_date: string
                    mean: number
                    median: number
                    mode_estimate: number | null
                    std_dev: number
                    variance: number
                    iqr: number | null
                    coefficient_of_variation: number | null
                    skewness: number | null
                    kurtosis: number | null
                    p01: number
                    p05: number
                    p10: number
                    p25: number
                    p50: number
                    p75: number
                    p90: number
                    p95: number
                    p99: number
                    p001: number | null
                    p999: number | null
                    var_90: number | null
                    var_95: number | null
                    var_99: number | null
                    cvar_90: number | null
                    cvar_95: number | null
                    cvar_99: number | null
                    prob_negative: number | null
                    prob_below_threshold: number | null
                    threshold_value: number | null
                    min_value: number
                    max_value: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    simulation_run_id: string
                    variable_id: string
                    period_index: number
                    period_date: string
                    mean: number
                    median: number
                    mode_estimate?: number | null
                    std_dev: number
                    variance: number
                    iqr?: number | null
                    coefficient_of_variation?: number | null
                    skewness?: number | null
                    kurtosis?: number | null
                    p01: number
                    p05: number
                    p10: number
                    p25: number
                    p50: number
                    p75: number
                    p90: number
                    p95: number
                    p99: number
                    p001?: number | null
                    p999?: number | null
                    var_90?: number | null
                    var_95?: number | null
                    var_99?: number | null
                    cvar_90?: number | null
                    cvar_95?: number | null
                    cvar_99?: number | null
                    prob_negative?: number | null
                    prob_below_threshold?: number | null
                    threshold_value?: number | null
                    min_value: number
                    max_value: number
                    created_at?: string
                }
                Update: {
                    simulation_run_id?: string
                    variable_id?: string
                    period_index?: number
                    period_date?: string
                    mean?: number
                    median?: number
                    mode_estimate?: number | null
                    std_dev?: number
                    variance?: number
                    iqr?: number | null
                    coefficient_of_variation?: number | null
                    skewness?: number | null
                    kurtosis?: number | null
                    p01?: number
                    p05?: number
                    p10?: number
                    p25?: number
                    p50?: number
                    p75?: number
                    p90?: number
                    p95?: number
                    p99?: number
                    p001?: number | null
                    p999?: number | null
                    var_90?: number | null
                    var_95?: number | null
                    var_99?: number | null
                    cvar_90?: number | null
                    cvar_95?: number | null
                    cvar_99?: number | null
                    prob_negative?: number | null
                    prob_below_threshold?: number | null
                    threshold_value?: number | null
                    min_value?: number
                    max_value?: number
                }
            }
        }
    }
    audit: {
        Tables: {
            assumption_changes: {
                Row: {
                    id: string
                    model_id: string
                    variable_assumption_id: string | null
                    correlation_matrix_id: string | null
                    covenant_id: string | null
                    change_type: 'created' | 'parameter_updated' | 'distribution_changed' | 'deleted' | 'correlation_updated' | 'covenant_updated'
                    previous_state: Json | null
                    new_state: Json | null
                    change_reason: string
                    changed_by: string
                    changed_at: string
                    triggered_by: 'user_manual' | 'auto_recalibration' | 'new_data_arrival' | 'model_validation' | 'api_import' | 'backtesting_recommendation' | null
                }
                Insert: {
                    id?: string
                    model_id: string
                    variable_assumption_id?: string | null
                    correlation_matrix_id?: string | null
                    covenant_id?: string | null
                    change_type: 'created' | 'parameter_updated' | 'distribution_changed' | 'deleted' | 'correlation_updated' | 'covenant_updated'
                    previous_state?: Json | null
                    new_state?: Json | null
                    change_reason: string
                    changed_by: string
                    changed_at?: string
                    triggered_by?: 'user_manual' | 'auto_recalibration' | 'new_data_arrival' | 'model_validation' | 'api_import' | 'backtesting_recommendation' | null
                }
                Update: {
                    model_id?: string
                    variable_assumption_id?: string | null
                    correlation_matrix_id?: string | null
                    covenant_id?: string | null
                    change_type?: 'created' | 'parameter_updated' | 'distribution_changed' | 'deleted' | 'correlation_updated' | 'covenant_updated'
                    previous_state?: Json | null
                    new_state?: Json | null
                    change_reason?: string
                    triggered_by?: 'user_manual' | 'auto_recalibration' | 'new_data_arrival' | 'model_validation' | 'api_import' | 'backtesting_recommendation' | null
                }
            }
            user_notifications: {
                Row: {
                    id: string
                    user_id: string
                    notification_type: 'simulation_completed' | 'simulation_failed' | 'assumption_invalidated' | 'risk_alert' | 'covenant_warning' | 'backtest_recommendation' | 'data_quality_issue' | 'correlation_required'
                    severity: 'info' | 'warning' | 'error' | 'critical'
                    title: string
                    message: string
                    model_id: string | null
                    simulation_run_id: string | null
                    is_read: boolean
                    is_dismissed: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    notification_type: 'simulation_completed' | 'simulation_failed' | 'assumption_invalidated' | 'risk_alert' | 'covenant_warning' | 'backtest_recommendation' | 'data_quality_issue' | 'correlation_required'
                    severity?: 'info' | 'warning' | 'error' | 'critical'
                    title: string
                    message: string
                    model_id?: string | null
                    simulation_run_id?: string | null
                    is_read?: boolean
                    is_dismissed?: boolean
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    notification_type?: 'simulation_completed' | 'simulation_failed' | 'assumption_invalidated' | 'risk_alert' | 'covenant_warning' | 'backtest_recommendation' | 'data_quality_issue' | 'correlation_required'
                    severity?: 'info' | 'warning' | 'error' | 'critical'
                    title?: string
                    message?: string
                    model_id?: string | null
                    simulation_run_id?: string | null
                    is_read?: boolean
                    is_dismissed?: boolean
                }
            }
        }
    }
}

// Helper type for table rows
export type CoreEntity = Database['core']['Tables']['entities']['Row']
export type VariableDefinition = Database['core']['Tables']['variable_definitions']['Row']
export type HistoricalFact = Database['core']['Tables']['historical_facts']['Row']
export type ForecastModel = Database['models']['Tables']['forecast_models']['Row']
export type VariableAssumption = Database['models']['Tables']['variable_assumptions']['Row']
export type CorrelationMatrix = Database['models']['Tables']['correlation_matrices']['Row']
export type Covenant = Database['models']['Tables']['covenants']['Row']
export type SimulationRun = Database['simulations']['Tables']['simulation_runs']['Row']
export type AggregatedResult = Database['simulations']['Tables']['aggregated_results']['Row']
