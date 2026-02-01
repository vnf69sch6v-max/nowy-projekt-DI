-- =============================================
-- StochFin Database Schema: Models
-- Schema for forecast models, assumptions, correlations
-- =============================================

-- =============================================
-- SCHEMA: models
-- =============================================
CREATE SCHEMA IF NOT EXISTS models;

-- =============================================
-- Forecast Models
-- =============================================
CREATE TABLE models.forecast_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES core.entities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'archived', 'superseded'
  )),
  base_date DATE NOT NULL,
  horizon_months INTEGER NOT NULL DEFAULT 36,
  time_step VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (time_step IN (
    'monthly', 'quarterly', 'yearly'
  )),
  n_simulations INTEGER NOT NULL DEFAULT 10000,
  random_seed INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

CREATE INDEX idx_models_entity ON models.forecast_models(entity_id);
CREATE INDEX idx_models_status ON models.forecast_models(status);

-- Only one active model per entity
CREATE UNIQUE INDEX idx_unique_active_model 
  ON models.forecast_models(entity_id) 
  WHERE status = 'active';

-- =============================================
-- Variable Assumptions
-- =============================================
CREATE TABLE models.variable_assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  
  -- Stochastic specification
  is_stochastic BOOLEAN NOT NULL DEFAULT TRUE,
  stochastic_process VARCHAR(50) CHECK (stochastic_process IN (
    'gbm', 'ornstein_uhlenbeck', 'poisson', 'triangular',
    'pert', 'normal', 'lognormal', 'student_t',
    'empirical', 'deterministic'
  )),
  
  -- Distribution parameters (JSON structure varies by type)
  distribution_parameters JSONB NOT NULL,
  /*
  Examples:
  GBM: {"drift": 0.05, "drift_std_error": 0.02, "volatility": 0.15, "volatility_std_error": 0.03, "initial_value": 1000000}
  O-U: {"theta": 0.5, "mu": 0.10, "sigma": 0.03, "initial_value": 0.12}
  PERT: {"optimistic": 0.12, "most_likely": 0.08, "pessimistic": 0.02}
  Normal: {"mu": 0.05, "sigma": 0.02}
  Deterministic: {"value": 0.05}
  */
  
  -- Estimation metadata
  parameter_estimation_method VARCHAR(50) CHECK (parameter_estimation_method IN (
    'mle', 'bayesian', 'expert_elicitation', 'regulatory', 'historical_fit'
  )),
  estimation_period_start DATE,
  estimation_period_end DATE,
  n_observations INTEGER,
  
  -- Documentation (REQUIRED)
  assumptions_narrative TEXT NOT NULL,
  
  -- Sensitivity classification
  sensitivity_flag VARCHAR(20) DEFAULT 'medium' CHECK (sensitivity_flag IN (
    'low', 'medium', 'high', 'critical'
  )),
  
  -- Deterministic override (requires justification)
  deterministic_justification TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_variable_per_model UNIQUE (model_id, variable_id)
);

CREATE INDEX idx_assumptions_model ON models.variable_assumptions(model_id);
CREATE INDEX idx_assumptions_variable ON models.variable_assumptions(variable_id);

-- =============================================
-- Correlation Matrices
-- =============================================
CREATE TABLE models.correlation_matrices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'default',
  
  -- Correlation specification
  correlation_type VARCHAR(20) NOT NULL DEFAULT 'pearson' CHECK (correlation_type IN (
    'pearson', 'spearman', 'kendall'
  )),
  
  -- Variables included (ordered list of assumption IDs)
  variable_assumption_ids UUID[] NOT NULL,
  
  -- Correlation matrix (symmetric, must be positive-definite)
  matrix_values FLOAT[][] NOT NULL,
  
  -- Copula specification for tail dependence
  copula_type VARCHAR(30) DEFAULT 'gaussian' CHECK (copula_type IN (
    'gaussian', 'student_t', 'clayton', 'gumbel', 'frank'
  )),
  copula_parameters JSONB,
  
  -- Regime (optional - for crisis scenarios)
  regime_type VARCHAR(20) CHECK (regime_type IN ('normal', 'stress', 'crisis')),
  
  -- Source
  source VARCHAR(50) NOT NULL CHECK (source IN (
    'historical_estimation', 'expert_judgment', 'template', 'regulatory'
  )),
  estimation_details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_correlations_model ON models.correlation_matrices(model_id);

-- =============================================
-- Covenants and Constraints
-- =============================================
CREATE TABLE models.covenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Constraint definition
  constraint_type VARCHAR(30) NOT NULL CHECK (constraint_type IN (
    'max_leverage', 'min_dscr', 'min_cash', 'max_net_debt', 'custom'
  )),
  variable_id UUID REFERENCES core.variable_definitions(id),
  threshold_value DECIMAL(20,4) NOT NULL,
  comparison_operator VARCHAR(10) NOT NULL CHECK (comparison_operator IN (
    '<', '<=', '>', '>=', '='
  )),
  
  -- Consequence of breach
  breach_penalty JSONB,
  /* Example: {"type": "interest_rate_increase", "value": 0.02} */
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_covenants_model ON models.covenants(model_id);

-- =============================================
-- Custom Formulas (for derived variables)
-- =============================================
CREATE TABLE models.custom_formulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
  output_variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  
  -- Formula definition
  formula_expression TEXT NOT NULL,
  /* Examples:
     "REVENUE * GROSS_MARGIN"
     "MAX(0, REVENUE - COGS - OPEX)"
     "IF(DEBT_TO_EBITDA > 4, INTEREST_RATE + 0.02, INTEREST_RATE)"
  */
  
  -- Input variables (for dependency tracking)
  input_variable_ids UUID[] NOT NULL,
  
  -- Evaluation order (lower = earlier)
  execution_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formulas_model ON models.custom_formulas(model_id);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE models.forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.variable_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.correlation_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.covenants ENABLE ROW LEVEL SECURITY;
