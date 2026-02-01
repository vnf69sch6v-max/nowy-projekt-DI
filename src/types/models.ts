// =============================================
// StochFin Type Definitions: Models
// Types for entities, forecast models, assumptions
// =============================================

import type {
    StochasticProcess,
    ProcessParams,
    CorrelationMatrix,
    ParameterEstimate
} from './distributions';

// =============================================
// Entity Types
// =============================================

export type EntityType = 'company' | 'project' | 'portfolio' | 'segment';

export interface Entity {
    id: string;
    name: string;
    entity_type: EntityType;
    parent_entity_id?: string;
    industry?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    created_by: string;
}

export interface CreateEntityInput {
    name: string;
    entity_type: EntityType;
    parent_entity_id?: string;
    industry?: string;
    description?: string;
}

// =============================================
// Variable Definition Types
// =============================================

export type VariableCategory =
    | 'income_statement'
    | 'balance_sheet'
    | 'cash_flow'
    | 'ratio'
    | 'macro'
    | 'operational'
    | 'custom';

export type DataType = 'monetary' | 'percentage' | 'ratio' | 'count' | 'text';

export interface VariableDefinition {
    id: string;
    code: string;
    name: string;
    name_pl?: string;
    description?: string;
    variable_category: VariableCategory;
    data_type: DataType;
    default_unit?: string;
    typical_process?: StochasticProcess;
    is_driver: boolean;
    is_derived: boolean;
    derivation_formula?: string;
    bounds_min?: number;
    bounds_max?: number;
}

// =============================================
// Historical Fact Types
// =============================================

export type ConfidenceLevel =
    | 'audited_final'
    | 'audited_preliminary'
    | 'unaudited'
    | 'estimated'
    | 'restated';

export interface HistoricalFact {
    id: string;
    entity_id: string;
    variable_id: string;
    period_type: 'instant' | 'duration';
    period_start: string;
    period_end?: string;
    value: number;
    currency?: string;
    confidence_level: ConfidenceLevel;
    measurement_error_std: number;
    source_type?: string;
    source_document_url?: string;
    notes?: string;
    created_at: string;
}

export interface CreateHistoricalFactInput {
    entity_id: string;
    variable_id: string;
    period_type: 'instant' | 'duration';
    period_start: string;
    period_end?: string;
    value: number;
    currency?: string;
    confidence_level?: ConfidenceLevel;
    source_type?: string;
    notes?: string;
}

// =============================================
// Forecast Model Types
// =============================================

export type ModelStatus = 'draft' | 'active' | 'archived' | 'superseded';
export type TimeStep = 'monthly' | 'quarterly' | 'yearly';

export interface ForecastModel {
    id: string;
    entity_id: string;
    name: string;
    description?: string;
    version: number;
    status: ModelStatus;
    base_date: string;
    horizon_months: number;
    time_step: TimeStep;
    n_simulations: number;
    random_seed?: number;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    created_by: string;
    approved_by?: string;
    approved_at?: string;
}

export interface CreateModelInput {
    entity_id: string;
    name: string;
    description?: string;
    base_date: string;
    horizon_months?: number;
    time_step?: TimeStep;
    n_simulations?: number;
}

// =============================================
// Variable Assumption Types
// =============================================

export type EstimationMethod =
    | 'mle'
    | 'bayesian'
    | 'expert_elicitation'
    | 'regulatory'
    | 'historical_fit';

export type SensitivityFlag = 'low' | 'medium' | 'high' | 'critical';

export interface VariableAssumption {
    id: string;
    model_id: string;
    variable_id: string;
    variable?: VariableDefinition;  // Joined data

    is_stochastic: boolean;
    stochastic_process?: StochasticProcess;
    distribution_parameters: ProcessParams;

    parameter_estimation_method?: EstimationMethod;
    estimation_period_start?: string;
    estimation_period_end?: string;
    n_observations?: number;

    assumptions_narrative: string;  // REQUIRED
    sensitivity_flag: SensitivityFlag;
    deterministic_justification?: string;

    created_at: string;
    updated_at: string;
}

export interface CreateAssumptionInput {
    model_id: string;
    variable_id: string;
    is_stochastic: boolean;
    stochastic_process?: StochasticProcess;
    distribution_parameters: ProcessParams;
    parameter_estimation_method?: EstimationMethod;
    assumptions_narrative: string;
    sensitivity_flag?: SensitivityFlag;
    deterministic_justification?: string;
}

// =============================================
// Correlation Matrix (Model-specific)
// =============================================

export type CorrelationSource =
    | 'historical_estimation'
    | 'expert_judgment'
    | 'template'
    | 'regulatory';

export interface ModelCorrelationMatrix {
    id: string;
    model_id: string;
    name: string;
    correlation_type: 'pearson' | 'spearman' | 'kendall';
    variable_assumption_ids: string[];
    matrix_values: number[][];
    copula_type?: string;
    copula_parameters?: Record<string, number>;
    regime_type?: 'normal' | 'stress' | 'crisis';
    source: CorrelationSource;
    estimation_details?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// =============================================
// Covenant Types
// =============================================

export type CovenantType =
    | 'max_leverage'
    | 'min_dscr'
    | 'min_cash'
    | 'max_net_debt'
    | 'custom';

export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '=';

export interface Covenant {
    id: string;
    model_id: string;
    name: string;
    description?: string;
    constraint_type: CovenantType;
    variable_id?: string;
    threshold_value: number;
    comparison_operator: ComparisonOperator;
    breach_penalty?: {
        type: string;
        value: number;
    };
    is_active: boolean;
    created_at: string;
}

// =============================================
// Full Model with Relations
// =============================================

export interface FullForecastModel extends ForecastModel {
    entity: Entity;
    assumptions: VariableAssumption[];
    correlations: ModelCorrelationMatrix[];
    covenants: Covenant[];
}
