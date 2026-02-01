// =============================================
// StochFin EventProb Engine: Event Types & DSL
// Domain Specific Language for event definitions
// =============================================

// =============================================
// Base Types
// =============================================

/** Event types supported by the system */
export type EventType =
    | 'threshold_breach'   // Variable crosses threshold
    | 'compound'           // Multiple conditions (AND/OR)
    | 'conditional'        // P(A | B)
    | 'sequence'           // A then B within time window
    | 'at_least_k';        // K of N events occur

/** Comparison operators for threshold conditions */
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';

/** Logical operators for compound events */
export type LogicalOperator = 'AND' | 'OR';

/** SDE model types */
export type SDEModelType =
    | 'gbm'
    | 'ornstein_uhlenbeck'
    | 'heston'
    | 'merton_jump'
    | 'deterministic';

/** Data frequency */
export type DataFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// =============================================
// Event Definition DSL
// =============================================

/**
 * Simple threshold breach event
 * Example: "P(debt_to_ebitda > 6.0) within 24 months"
 */
export interface ThresholdBreachEvent {
    type: 'threshold_breach';
    variable: string;
    operator: ComparisonOperator;
    threshold: number;
    horizon_months: number;
    label?: string;
}

/**
 * Compound event with AND/OR logic
 * Example: "P(inflation > 8% AND gdp < 0%) = Stagflation"
 */
export interface CompoundEvent {
    type: 'compound';
    operator: LogicalOperator;
    conditions: EventDefinition[];
    horizon_months: number;
    label?: string;
}

/**
 * Conditional event P(A | B)
 * Example: "P(company_B_default | company_A_default)"
 */
export interface ConditionalEvent {
    type: 'conditional';
    event: EventDefinition;
    given: EventDefinition;
    horizon_months: number;
    label?: string;
}

/**
 * Sequence event - A happens, then B within time window
 * Example: "P(recession THEN inflation > 10% within 12 months)"
 */
export interface SequenceEvent {
    type: 'sequence';
    first: EventDefinition;
    then: EventDefinition;
    max_gap_months: number;
    horizon_months: number;
    label?: string;
}

/**
 * At-least-K event - K or more of N events occur
 * Example: "P(at least 3 of 5 companies default)"
 */
export interface AtLeastKEvent {
    type: 'at_least_k';
    k: number;
    events: ThresholdBreachEvent[];
    horizon_months: number;
    label?: string;
}

/** Union type for all event definitions */
export type EventDefinition =
    | ThresholdBreachEvent
    | CompoundEvent
    | ConditionalEvent
    | SequenceEvent
    | AtLeastKEvent;

// =============================================
// SDE Model Parameters
// =============================================

/** GBM parameters: dS = μS dt + σS dW */
export interface GBMParameters {
    mu: number;      // Drift (annual)
    sigma: number;   // Volatility (annual)
}

/** Ornstein-Uhlenbeck parameters: dX = θ(μ - X)dt + σ dW */
export interface OUParameters {
    theta: number;   // Mean reversion speed
    mu: number;      // Long-term mean
    sigma: number;   // Volatility
}

/** Heston parameters (stochastic volatility) */
export interface HestonParameters {
    mu: number;              // Drift
    theta: number;           // Long-term variance
    kappa: number;           // Mean reversion speed
    xi: number;              // Vol of vol
    rho: number;             // Correlation (leverage effect)
    initial_variance: number;
}

/** Merton Jump-Diffusion parameters */
export interface MertonJumpParameters {
    mu: number;          // Drift
    sigma: number;       // Diffusion volatility
    lambda: number;      // Jump intensity (per year)
    mu_jump: number;     // Mean jump size (log)
    sigma_jump: number;  // Jump size volatility
}

/** Union type for all SDE parameters */
export type SDEParameters =
    | GBMParameters
    | OUParameters
    | HestonParameters
    | MertonJumpParameters
    | { value: number };  // For deterministic

// =============================================
// Variable Configuration
// =============================================

/** Configuration for a variable in an event */
export interface EventVariable {
    name: string;
    label?: string;
    sde_model: SDEModelType;
    parameters: SDEParameters;
    initial_value: number;
    data_frequency: DataFrequency;
    prior?: PriorDistribution;
    time_series_ref?: string;
}

/** Prior distribution configuration */
export interface PriorDistribution {
    type: 'beta' | 'normal' | 'gamma' | 'uniform';
    parameters: Record<string, number>;
    source: 'expert' | 'empirical' | 'weak';
}

// =============================================
// Copula Configuration
// =============================================

/** Copula family types */
export type CopulaFamily =
    | 'gaussian'
    | 'student_t'
    | 'clayton'
    | 'gumbel'
    | 'frank'
    | 'rotated_clayton_90'
    | 'rotated_clayton_180'
    | 'rotated_clayton_270'
    | 'rotated_gumbel_90'
    | 'rotated_gumbel_180'
    | 'rotated_gumbel_270'
    | 'vine_c'
    | 'vine_d'
    | 'vine_r';

/** Copula specification for event */
export interface EventCopulaSpec {
    variable_pair?: [string, string];  // null for multivariate
    family: CopulaFamily;
    parameters: Record<string, number>;
    tail_dependence?: {
        lambda_lower: number;
        lambda_upper: number;
    };
    auto_selected?: boolean;
    goodness_of_fit?: {
        aic: number;
        bic: number;
        cramer_von_mises_p: number;
    };
}

// =============================================
// Simulation Configuration
// =============================================

/** Configuration for Monte Carlo simulation */
export interface EventSimulationConfig {
    n_scenarios: number;
    horizon_months: number;
    dt_months: number;
    discretization: 'euler' | 'milstein';
    random_seed?: number;
    use_copula_noise: boolean;
}

/** Default simulation config */
export const DEFAULT_SIMULATION_CONFIG: EventSimulationConfig = {
    n_scenarios: 10000,
    horizon_months: 12,
    dt_months: 1,
    discretization: 'milstein',
    use_copula_noise: true
};

// =============================================
// Simulation Results
// =============================================

/** Result of event probability calculation */
export interface EventProbabilityResult {
    probability: {
        mean: number;
        ci_90: [number, number];
        ci_95: [number, number];
    };
    decomposition: {
        per_variable: Record<string, number>;  // P(threshold) per variable
        joint_independent: number;              // P(A) * P(B) if independent
        joint_copula: number;                   // Actual P(A ∩ B) with copula
        copula_risk_multiplier: number;         // joint_copula / joint_independent
    };
    model_comparison?: {
        gaussian: number;
        clayton: number;
        gumbel: number;
        student_t: number;
    };
    percentiles: Record<string, {
        p5: number;
        p25: number;
        p50: number;
        p75: number;
        p95: number;
    }>;
    var_99?: number;
    es_99?: number;
    n_scenarios: number;
    computation_time_ms: number;
}

// =============================================
// Bayesian Version
// =============================================

/** Bayesian version for hypothesis tracking */
export interface BayesianVersion {
    id: string;
    event_id: string;
    version_number: string;
    parent_version_id?: string;

    prior_state: Record<string, PriorDistribution>;
    posterior_state: Record<string, PriorDistribution>;
    data_used?: {
        observations: number[];
        source: string;
        period: string;
    };

    probability_estimate: {
        mean: number;
        median: number;
        p5: number;
        p10: number;
        p25: number;
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        hdi_90: [number, number];
    };

    n_simulations: number;
    copula_used?: CopulaFamily;
    model_comparison?: Record<string, number>;

    inflation_applied: boolean;
    notes?: string;
    computed_at: Date;
}

// =============================================
// Full Event Model (for DB/API)
// =============================================

/** Complete event model with all associated data */
export interface EventModel {
    id: string;
    user_id: string;
    project_id?: string;

    name: string;
    description?: string;
    event_type: EventType;
    definition: EventDefinition;

    variables: EventVariable[];
    copula_specs: EventCopulaSpec[];

    current_probability?: number;
    current_ci?: [number, number];
    last_computed_at?: Date;

    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

// =============================================
// Type Guards
// =============================================

export function isThresholdBreach(event: EventDefinition): event is ThresholdBreachEvent {
    return event.type === 'threshold_breach';
}

export function isCompoundEvent(event: EventDefinition): event is CompoundEvent {
    return event.type === 'compound';
}

export function isConditionalEvent(event: EventDefinition): event is ConditionalEvent {
    return event.type === 'conditional';
}

export function isSequenceEvent(event: EventDefinition): event is SequenceEvent {
    return event.type === 'sequence';
}

export function isAtLeastKEvent(event: EventDefinition): event is AtLeastKEvent {
    return event.type === 'at_least_k';
}

// =============================================
// Validation
// =============================================

/** Validation result */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/** Validate event definition */
export function validateEventDefinition(event: EventDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check type
    if (!event.type) {
        errors.push('Event type is required');
        return { valid: false, errors, warnings };
    }

    // Check horizon
    if (event.horizon_months <= 0) {
        errors.push('Horizon must be positive');
    }

    // Type-specific validation
    switch (event.type) {
        case 'threshold_breach':
            if (!event.variable) errors.push('Variable name is required');
            if (!event.operator) errors.push('Operator is required');
            if (event.threshold === undefined) errors.push('Threshold is required');
            if (!isValidOperator(event.operator)) {
                errors.push(`Invalid operator: ${event.operator}`);
            }
            break;

        case 'compound':
            if (!event.operator || !['AND', 'OR'].includes(event.operator)) {
                errors.push('Compound operator must be AND or OR');
            }
            if (!event.conditions || event.conditions.length < 2) {
                errors.push('Compound event requires at least 2 conditions');
            } else {
                // Recursively validate conditions
                event.conditions.forEach((cond, i) => {
                    const subResult = validateEventDefinition(cond);
                    subResult.errors.forEach(e => errors.push(`Condition ${i + 1}: ${e}`));
                    subResult.warnings.forEach(w => warnings.push(`Condition ${i + 1}: ${w}`));
                });
            }
            break;

        case 'conditional':
            if (!event.event) errors.push('Main event is required');
            if (!event.given) errors.push('Given condition is required');
            break;

        case 'at_least_k':
            if (event.k <= 0) errors.push('K must be positive');
            if (!event.events || event.events.length < event.k) {
                errors.push(`Need at least ${event.k} events for at_least_k`);
            }
            break;

        case 'sequence':
            if (!event.first) errors.push('First event is required');
            if (!event.then) errors.push('Then event is required');
            if (event.max_gap_months <= 0) {
                errors.push('Max gap must be positive');
            }
            break;
    }

    return { valid: errors.length === 0, errors, warnings };
}

function isValidOperator(op: string): op is ComparisonOperator {
    return ['>', '<', '>=', '<=', '==', '!='].includes(op);
}

// =============================================
// Helpers
// =============================================

/** Extract all variable names from an event definition */
export function extractVariables(event: EventDefinition): string[] {
    const variables: Set<string> = new Set();

    function extract(e: EventDefinition) {
        switch (e.type) {
            case 'threshold_breach':
                variables.add(e.variable);
                break;
            case 'compound':
                e.conditions.forEach(extract);
                break;
            case 'conditional':
                extract(e.event);
                extract(e.given);
                break;
            case 'sequence':
                extract(e.first);
                extract(e.then);
                break;
            case 'at_least_k':
                e.events.forEach(ev => variables.add(ev.variable));
                break;
        }
    }

    extract(event);
    return Array.from(variables);
}

/** Get all variable pairs for copula specification */
export function getVariablePairs(variables: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
            pairs.push([variables[i], variables[j]]);
        }
    }
    return pairs;
}

/** Convert months to years */
export function monthsToYears(months: number): number {
    return months / 12;
}

/** Get number of time steps */
export function getNumSteps(config: EventSimulationConfig): number {
    return Math.ceil(config.horizon_months / config.dt_months);
}

/** Get dt in years */
export function getDtYears(config: EventSimulationConfig): number {
    return config.dt_months / 12;
}
