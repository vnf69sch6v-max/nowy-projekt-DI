-- =============================================
-- StochFin Database Schema: Simulations
-- Schema for simulation runs and results
-- =============================================

-- =============================================
-- SCHEMA: simulations
-- =============================================
CREATE SCHEMA IF NOT EXISTS simulations;

-- =============================================
-- Simulation Runs
-- =============================================
CREATE TABLE simulations.simulation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id),
  
  -- Run configuration
  run_type VARCHAR(30) NOT NULL DEFAULT 'full_monte_carlo' CHECK (run_type IN (
    'full_monte_carlo', 'sensitivity', 'stress_test', 'scenario_analysis'
  )),
  n_simulations INTEGER NOT NULL,
  random_seed INTEGER,
  
  -- Correlation method
  correlation_method VARCHAR(30) NOT NULL DEFAULT 'cholesky' CHECK (correlation_method IN (
    'cholesky', 'copula_gaussian', 'copula_t', 'copula_clayton'
  )),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled', 'invalidated'
  )),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  compute_time_seconds FLOAT,
  
  -- Error handling
  error_message TEXT,
  
  -- Storage reference for full scenarios (Firebase Storage path)
  scenarios_storage_path TEXT,
  
  -- Model snapshot (for reproducibility)
  model_snapshot_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX idx_runs_model ON simulations.simulation_runs(model_id);
CREATE INDEX idx_runs_status ON simulations.simulation_runs(status);
CREATE INDEX idx_runs_created ON simulations.simulation_runs(created_at DESC);

-- =============================================
-- Aggregated Results (always stored in DB)
-- =============================================
CREATE TABLE simulations.aggregated_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID NOT NULL REFERENCES simulations.simulation_runs(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  
  -- Period info
  period_index INTEGER NOT NULL,
  period_date DATE NOT NULL,
  
  -- Central tendencies
  mean FLOAT NOT NULL,
  median FLOAT NOT NULL,
  mode_estimate FLOAT,
  
  -- Dispersion
  std_dev FLOAT NOT NULL,
  variance FLOAT NOT NULL,
  iqr FLOAT,
  coefficient_of_variation FLOAT,
  
  -- Shape
  skewness FLOAT,
  kurtosis FLOAT,
  
  -- Percentiles
  p01 FLOAT NOT NULL,
  p05 FLOAT NOT NULL,
  p10 FLOAT NOT NULL,
  p25 FLOAT NOT NULL,
  p50 FLOAT NOT NULL,
  p75 FLOAT NOT NULL,
  p90 FLOAT NOT NULL,
  p95 FLOAT NOT NULL,
  p99 FLOAT NOT NULL,
  
  -- Additional percentiles for tail analysis
  p001 FLOAT,  -- 0.1%
  p999 FLOAT,  -- 99.9%
  
  -- Risk metrics
  var_90 FLOAT,
  var_95 FLOAT,
  var_99 FLOAT,
  cvar_90 FLOAT,
  cvar_95 FLOAT,
  cvar_99 FLOAT,
  
  -- Probability metrics
  prob_negative FLOAT,
  prob_below_threshold FLOAT,
  threshold_value FLOAT,
  
  -- Min/Max observed
  min_value FLOAT NOT NULL,
  max_value FLOAT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_result UNIQUE (simulation_run_id, variable_id, period_index)
);

CREATE INDEX idx_results_run ON simulations.aggregated_results(simulation_run_id);
CREATE INDEX idx_results_variable ON simulations.aggregated_results(variable_id);
CREATE INDEX idx_results_run_variable ON simulations.aggregated_results(simulation_run_id, variable_id);

-- =============================================
-- Covenant Breach Results
-- =============================================
CREATE TABLE simulations.covenant_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID NOT NULL REFERENCES simulations.simulation_runs(id) ON DELETE CASCADE,
  covenant_id UUID NOT NULL REFERENCES models.covenants(id),
  
  period_index INTEGER NOT NULL,
  period_date DATE NOT NULL,
  
  -- Probability of breach
  breach_probability FLOAT NOT NULL,
  
  -- Breach severity (average overshoot when breached)
  avg_breach_magnitude FLOAT,
  max_breach_magnitude FLOAT,
  
  -- Number of scenarios with breach
  n_breach_scenarios INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_covenant_result UNIQUE (simulation_run_id, covenant_id, period_index)
);

CREATE INDEX idx_covenant_results_run ON simulations.covenant_results(simulation_run_id);

-- =============================================
-- Sensitivity Analysis Results
-- =============================================
CREATE TABLE simulations.sensitivity_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID NOT NULL REFERENCES simulations.simulation_runs(id) ON DELETE CASCADE,
  
  -- Input variable that was varied
  input_variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  
  -- Output variable being measured
  output_variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  
  -- Sensitivity metrics
  tornado_impact_low FLOAT,   -- Impact when input is at P10
  tornado_impact_high FLOAT,  -- Impact when input is at P90
  elasticity FLOAT,           -- % change in output / % change in input
  correlation_with_output FLOAT,
  
  -- Ranking
  importance_rank INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensitivity_run ON simulations.sensitivity_results(simulation_run_id);

-- =============================================
-- Stress Test Scenarios
-- =============================================
CREATE TABLE simulations.stress_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID NOT NULL REFERENCES simulations.simulation_runs(id) ON DELETE CASCADE,
  
  scenario_name VARCHAR(255) NOT NULL,
  scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN (
    'recession', 'commodity_shock', 'interest_rate_shock', 
    'customer_loss', 'supply_chain', 'custom'
  )),
  description TEXT,
  
  -- Stress parameters
  stress_parameters JSONB NOT NULL,
  /* Example:
  {
    "REVENUE_GROWTH": -0.15,
    "GROSS_MARGIN": -0.05,
    "INTEREST_RATE": 0.03
  }
  */
  
  -- Results under stress
  results JSONB NOT NULL,
  /* Example:
  {
    "FCF": {"mean": -500000, "p10": -1200000, "prob_negative": 0.85},
    "DEBT_TO_EBITDA": {"mean": 5.2, "prob_above_covenant": 0.72}
  }
  */
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE simulations.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations.aggregated_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations.covenant_results ENABLE ROW LEVEL SECURITY;
