-- =============================================
-- StochFin Database Schema: Audit
-- Schema for change tracking and time-travel
-- =============================================

-- =============================================
-- SCHEMA: audit
-- =============================================
CREATE SCHEMA IF NOT EXISTS audit;

-- =============================================
-- Assumption Change Log (Event Sourcing)
-- =============================================
CREATE TABLE audit.assumption_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id),
  
  -- What was changed
  variable_assumption_id UUID,
  correlation_matrix_id UUID,
  covenant_id UUID,
  
  change_type VARCHAR(30) NOT NULL CHECK (change_type IN (
    'created', 'parameter_updated', 'distribution_changed',
    'deleted', 'correlation_updated', 'covenant_updated'
  )),
  
  -- State snapshots
  previous_state JSONB,
  new_state JSONB,
  
  -- Change metadata (REQUIRED)
  change_reason TEXT NOT NULL,
  
  -- Who and when
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Trigger source
  triggered_by VARCHAR(50) CHECK (triggered_by IN (
    'user_manual', 'auto_recalibration',
    'new_data_arrival', 'model_validation', 'api_import', 'backtesting_recommendation'
  ))
);

CREATE INDEX idx_changes_model ON audit.assumption_changes(model_id);
CREATE INDEX idx_changes_time ON audit.assumption_changes(changed_at DESC);
CREATE INDEX idx_changes_variable ON audit.assumption_changes(variable_assumption_id);

-- =============================================
-- Model Snapshots (for Time Travel)
-- =============================================
CREATE TABLE audit.model_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id),
  
  snapshot_date DATE NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN (
    'scheduled_daily', 'before_simulation', 'manual_checkpoint', 'model_approved'
  )),
  
  -- Complete model state
  full_model_state JSONB NOT NULL,
  /*
  {
    "model": { ... forecast_model fields ... },
    "assumptions": [ ... all variable_assumptions ... ],
    "correlations": [ ... all correlation_matrices ... ],
    "covenants": [ ... all covenants ... ]
  }
  */
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_snapshots_model ON audit.model_snapshots(model_id);
CREATE INDEX idx_snapshots_date ON audit.model_snapshots(model_id, snapshot_date DESC);

-- =============================================
-- Backtesting Records
-- =============================================
CREATE TABLE audit.backtest_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models.forecast_models(id),
  
  -- Forecast being tested
  forecast_snapshot_id UUID REFERENCES audit.model_snapshots(id),
  forecast_date DATE NOT NULL,
  
  -- Actual value observed
  variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  target_period DATE NOT NULL,
  
  -- Forecast values at time of forecast
  forecasted_p10 FLOAT,
  forecasted_p50 FLOAT,
  forecasted_p90 FLOAT,
  forecasted_mean FLOAT,
  
  -- Actual value
  actual_value FLOAT,
  
  -- Accuracy metrics
  error FLOAT,  -- actual - forecasted_p50
  absolute_error FLOAT,
  percentage_error FLOAT,
  
  -- Calibration check
  was_within_50_ci BOOLEAN,  -- Was actual in P25-P75?
  was_within_90_ci BOOLEAN,  -- Was actual in P5-P95?
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backtest_model ON audit.backtest_records(model_id);
CREATE INDEX idx_backtest_variable ON audit.backtest_records(variable_id);

-- =============================================
-- User Notifications / Alerts
-- =============================================
CREATE TABLE audit.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'simulation_completed', 'simulation_failed',
    'assumption_invalidated', 'risk_alert',
    'covenant_warning', 'backtest_recommendation',
    'data_quality_issue', 'correlation_required'
  )),
  
  severity VARCHAR(20) NOT NULL CHECK (severity IN (
    'info', 'warning', 'error', 'critical'
  )),
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  model_id UUID REFERENCES models.forecast_models(id),
  simulation_run_id UUID REFERENCES simulations.simulation_runs(id),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON audit.user_notifications(user_id, is_read);
CREATE INDEX idx_notifications_time ON audit.user_notifications(created_at DESC);

-- =============================================
-- Data Quality Flags
-- =============================================
CREATE TABLE audit.data_quality_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES core.entities(id),
  
  flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN (
    'benford_violation', 'beneish_high_score',
    'outlier_detected', 'missing_data',
    'inconsistent_totals', 'unusual_pattern'
  )),
  
  severity VARCHAR(20) NOT NULL CHECK (severity IN (
    'info', 'warning', 'critical'
  )),
  
  description TEXT NOT NULL,
  details JSONB,
  
  -- Affected data
  affected_variable_id UUID REFERENCES core.variable_definitions(id),
  affected_period_start DATE,
  affected_period_end DATE,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quality_entity ON audit.data_quality_flags(entity_id);
CREATE INDEX idx_quality_unresolved ON audit.data_quality_flags(is_resolved) WHERE is_resolved = FALSE;

-- =============================================
-- Trigger: Auto-invalidate simulations on assumption change
-- =============================================
CREATE OR REPLACE FUNCTION audit.invalidate_simulations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE simulations.simulation_runs
  SET status = 'invalidated'
  WHERE model_id = NEW.model_id
    AND status = 'completed'
    AND completed_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_on_assumption_change
AFTER UPDATE ON models.variable_assumptions
FOR EACH ROW
EXECUTE FUNCTION audit.invalidate_simulations();

CREATE TRIGGER trg_invalidate_on_correlation_change
AFTER UPDATE ON models.correlation_matrices
FOR EACH ROW
EXECUTE FUNCTION audit.invalidate_simulations();

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE audit.assumption_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.model_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.user_notifications ENABLE ROW LEVEL SECURITY;
