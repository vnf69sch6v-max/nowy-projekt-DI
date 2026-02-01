-- =============================================
-- StochFin: Complete Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- SCHEMAS
-- =============================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS models;
CREATE SCHEMA IF NOT EXISTS simulations;
CREATE SCHEMA IF NOT EXISTS audit;

-- =============================================
-- ENUMS
-- =============================================

-- Core enums
CREATE TYPE core.entity_type AS ENUM ('company', 'project', 'portfolio', 'segment');
CREATE TYPE core.variable_category AS ENUM ('income_statement', 'balance_sheet', 'cash_flow', 'ratio', 'macro', 'operational', 'custom');
CREATE TYPE core.data_type AS ENUM ('monetary', 'percentage', 'ratio', 'count', 'text');
CREATE TYPE core.typical_process AS ENUM ('gbm', 'ornstein_uhlenbeck', 'poisson', 'deterministic');
CREATE TYPE core.period_type AS ENUM ('instant', 'duration');
CREATE TYPE core.confidence_level AS ENUM ('audited_final', 'audited_preliminary', 'unaudited', 'estimated', 'restated');

-- Models enums
CREATE TYPE models.model_status AS ENUM ('draft', 'active', 'archived', 'superseded');
CREATE TYPE models.time_step AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE models.stochastic_process AS ENUM ('gbm', 'ornstein_uhlenbeck', 'poisson', 'triangular', 'pert', 'normal', 'lognormal', 'student_t', 'empirical', 'deterministic');
CREATE TYPE models.estimation_method AS ENUM ('mle', 'bayesian', 'expert_elicitation', 'regulatory', 'historical_fit');
CREATE TYPE models.sensitivity_flag AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE models.correlation_type AS ENUM ('pearson', 'spearman', 'kendall');
CREATE TYPE models.copula_type AS ENUM ('gaussian', 'student_t', 'clayton', 'gumbel', 'frank');
CREATE TYPE models.regime_type AS ENUM ('normal', 'stress', 'crisis');
CREATE TYPE models.correlation_source AS ENUM ('historical_estimation', 'expert_judgment', 'template', 'regulatory');
CREATE TYPE models.constraint_type AS ENUM ('max_leverage', 'min_dscr', 'min_cash', 'max_net_debt', 'custom');
CREATE TYPE models.comparison_operator AS ENUM ('<', '<=', '>', '>=', '=');

-- Simulations enums
CREATE TYPE simulations.run_type AS ENUM ('full_monte_carlo', 'sensitivity', 'stress_test', 'scenario_analysis');
CREATE TYPE simulations.correlation_method AS ENUM ('cholesky', 'copula_gaussian', 'copula_t', 'copula_clayton');
CREATE TYPE simulations.run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'invalidated');

-- Audit enums
CREATE TYPE audit.change_type AS ENUM ('created', 'parameter_updated', 'distribution_changed', 'deleted', 'correlation_updated', 'covenant_updated');
CREATE TYPE audit.trigger_type AS ENUM ('user_manual', 'auto_recalibration', 'new_data_arrival', 'model_validation', 'api_import', 'backtesting_recommendation');
CREATE TYPE audit.notification_type AS ENUM ('simulation_completed', 'simulation_failed', 'assumption_invalidated', 'risk_alert', 'covenant_warning', 'backtest_recommendation', 'data_quality_issue', 'correlation_required');
CREATE TYPE audit.severity AS ENUM ('info', 'warning', 'error', 'critical');

-- =============================================
-- CORE TABLES
-- =============================================

CREATE TABLE core.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    entity_type core.entity_type NOT NULL,
    parent_entity_id UUID REFERENCES core.entities(id),
    industry TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL
);

CREATE TABLE core.variable_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_pl TEXT,
    description TEXT,
    variable_category core.variable_category NOT NULL,
    data_type core.data_type NOT NULL,
    default_unit TEXT,
    typical_process core.typical_process,
    is_driver BOOLEAN DEFAULT FALSE,
    is_derived BOOLEAN DEFAULT FALSE,
    derivation_formula TEXT,
    bounds_min NUMERIC,
    bounds_max NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE core.historical_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES core.entities(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
    period_type core.period_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE,
    value NUMERIC NOT NULL,
    currency TEXT DEFAULT 'PLN',
    confidence_level core.confidence_level DEFAULT 'unaudited',
    measurement_error_std NUMERIC DEFAULT 0,
    source_type TEXT,
    source_document_url TEXT,
    source_api TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- =============================================
-- MODELS TABLES
-- =============================================

CREATE TABLE models.forecast_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES core.entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    status models.model_status DEFAULT 'draft',
    base_date DATE NOT NULL,
    horizon_months INTEGER DEFAULT 24,
    time_step models.time_step DEFAULT 'monthly',
    n_simulations INTEGER DEFAULT 10000,
    random_seed INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ
);

CREATE TABLE models.variable_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
    is_stochastic BOOLEAN DEFAULT TRUE,
    stochastic_process models.stochastic_process,
    distribution_parameters JSONB NOT NULL DEFAULT '{}',
    parameter_estimation_method models.estimation_method,
    estimation_period_start DATE,
    estimation_period_end DATE,
    n_observations INTEGER,
    assumptions_narrative TEXT NOT NULL DEFAULT '',
    sensitivity_flag models.sensitivity_flag DEFAULT 'medium',
    deterministic_justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, variable_id)
);

CREATE TABLE models.correlation_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Default',
    correlation_type models.correlation_type DEFAULT 'pearson',
    variable_assumption_ids UUID[] NOT NULL,
    matrix_values NUMERIC[][] NOT NULL,
    copula_type models.copula_type,
    copula_parameters JSONB,
    regime_type models.regime_type DEFAULT 'normal',
    source models.correlation_source NOT NULL,
    estimation_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE models.covenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    constraint_type models.constraint_type NOT NULL,
    variable_id UUID REFERENCES core.variable_definitions(id),
    threshold_value NUMERIC NOT NULL,
    comparison_operator models.comparison_operator NOT NULL,
    breach_penalty JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SIMULATIONS TABLES
-- =============================================

CREATE TABLE simulations.simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
    run_type simulations.run_type DEFAULT 'full_monte_carlo',
    n_simulations INTEGER NOT NULL,
    random_seed INTEGER,
    correlation_method simulations.correlation_method DEFAULT 'cholesky',
    status simulations.run_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    compute_time_seconds INTEGER,
    error_message TEXT,
    scenarios_storage_path TEXT,
    model_snapshot_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL
);

CREATE TABLE simulations.aggregated_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_run_id UUID NOT NULL REFERENCES simulations.simulation_runs(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
    period_index INTEGER NOT NULL,
    period_date DATE NOT NULL,
    mean NUMERIC NOT NULL,
    median NUMERIC NOT NULL,
    mode_estimate NUMERIC,
    std_dev NUMERIC NOT NULL,
    variance NUMERIC NOT NULL,
    iqr NUMERIC,
    coefficient_of_variation NUMERIC,
    skewness NUMERIC,
    kurtosis NUMERIC,
    p01 NUMERIC NOT NULL,
    p05 NUMERIC NOT NULL,
    p10 NUMERIC NOT NULL,
    p25 NUMERIC NOT NULL,
    p50 NUMERIC NOT NULL,
    p75 NUMERIC NOT NULL,
    p90 NUMERIC NOT NULL,
    p95 NUMERIC NOT NULL,
    p99 NUMERIC NOT NULL,
    p001 NUMERIC,
    p999 NUMERIC,
    var_90 NUMERIC,
    var_95 NUMERIC,
    var_99 NUMERIC,
    cvar_90 NUMERIC,
    cvar_95 NUMERIC,
    cvar_99 NUMERIC,
    prob_negative NUMERIC,
    prob_below_threshold NUMERIC,
    threshold_value NUMERIC,
    min_value NUMERIC NOT NULL,
    max_value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(simulation_run_id, variable_id, period_index)
);

-- =============================================
-- AUDIT TABLES
-- =============================================

CREATE TABLE audit.assumption_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models.forecast_models(id) ON DELETE CASCADE,
    variable_assumption_id UUID,
    correlation_matrix_id UUID,
    covenant_id UUID,
    change_type audit.change_type NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    change_reason TEXT NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_by audit.trigger_type
);

CREATE TABLE audit.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type audit.notification_type NOT NULL,
    severity audit.severity DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    model_id UUID REFERENCES models.forecast_models(id) ON DELETE SET NULL,
    simulation_run_id UUID REFERENCES simulations.simulation_runs(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_entities_parent ON core.entities(parent_entity_id);
CREATE INDEX idx_entities_type ON core.entities(entity_type);

CREATE INDEX idx_historical_facts_entity ON core.historical_facts(entity_id);
CREATE INDEX idx_historical_facts_variable ON core.historical_facts(variable_id);
CREATE INDEX idx_historical_facts_period ON core.historical_facts(period_start, period_end);

CREATE INDEX idx_forecast_models_entity ON models.forecast_models(entity_id);
CREATE INDEX idx_forecast_models_status ON models.forecast_models(status);

CREATE INDEX idx_variable_assumptions_model ON models.variable_assumptions(model_id);
CREATE INDEX idx_variable_assumptions_variable ON models.variable_assumptions(variable_id);

CREATE INDEX idx_correlation_matrices_model ON models.correlation_matrices(model_id);
CREATE INDEX idx_covenants_model ON models.covenants(model_id);

CREATE INDEX idx_simulation_runs_model ON simulations.simulation_runs(model_id);
CREATE INDEX idx_simulation_runs_status ON simulations.simulation_runs(status);

CREATE INDEX idx_aggregated_results_run ON simulations.aggregated_results(simulation_run_id);
CREATE INDEX idx_aggregated_results_variable ON simulations.aggregated_results(variable_id);

CREATE INDEX idx_assumption_changes_model ON audit.assumption_changes(model_id);
CREATE INDEX idx_user_notifications_user ON audit.user_notifications(user_id);
CREATE INDEX idx_user_notifications_unread ON audit.user_notifications(user_id) WHERE is_read = FALSE;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE core.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.variable_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.historical_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.variable_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.correlation_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE models.covenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations.aggregated_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.assumption_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for authenticated users - adjust as needed)
CREATE POLICY "Users can view all entities" ON core.entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create entities" ON core.entities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own entities" ON core.entities FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own entities" ON core.entities FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Anyone can view variable definitions" ON core.variable_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view facts for their entities" ON core.historical_facts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert facts" ON core.historical_facts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view all models" ON models.forecast_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create models" ON models.forecast_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own models" ON models.forecast_models FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own models" ON models.forecast_models FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can view assumptions" ON models.variable_assumptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage assumptions" ON models.variable_assumptions FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view correlations" ON models.correlation_matrices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage correlations" ON models.correlation_matrices FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view covenants" ON models.covenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage covenants" ON models.covenants FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view simulations" ON simulations.simulation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create simulations" ON simulations.simulation_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own simulations" ON simulations.simulation_runs FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can view results" ON simulations.aggregated_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert results" ON simulations.aggregated_results FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view audit log" ON audit.assumption_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit log" ON audit.assumption_changes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view own notifications" ON audit.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON audit.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON core.entities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_historical_facts_updated_at BEFORE UPDATE ON core.historical_facts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_forecast_models_updated_at BEFORE UPDATE ON models.forecast_models FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_variable_assumptions_updated_at BEFORE UPDATE ON models.variable_assumptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_correlation_matrices_updated_at BEFORE UPDATE ON models.correlation_matrices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA: Variable Definitions
-- =============================================

INSERT INTO core.variable_definitions (code, name, name_pl, variable_category, data_type, typical_process, is_driver) VALUES
('REVENUE', 'Revenue', 'Przychody', 'income_statement', 'monetary', 'gbm', true),
('REVENUE_GROWTH', 'Revenue Growth Rate', 'Wzrost przychodów', 'income_statement', 'percentage', 'ornstein_uhlenbeck', true),
('COGS', 'Cost of Goods Sold', 'Koszt własny sprzedaży', 'income_statement', 'monetary', 'gbm', false),
('COGS_RATIO', 'COGS to Revenue Ratio', 'Udział COGS w przychodach', 'ratio', 'percentage', 'ornstein_uhlenbeck', true),
('GROSS_PROFIT', 'Gross Profit', 'Zysk brutto', 'income_statement', 'monetary', 'deterministic', false),
('OPEX', 'Operating Expenses', 'Koszty operacyjne', 'income_statement', 'monetary', 'gbm', false),
('OPEX_GROWTH', 'OpEx Growth Rate', 'Wzrost kosztów operacyjnych', 'income_statement', 'percentage', 'ornstein_uhlenbeck', true),
('EBITDA', 'EBITDA', 'EBITDA', 'income_statement', 'monetary', 'deterministic', false),
('EBITDA_MARGIN', 'EBITDA Margin', 'Marża EBITDA', 'ratio', 'percentage', 'ornstein_uhlenbeck', true),
('DEPRECIATION', 'Depreciation & Amortization', 'Amortyzacja', 'income_statement', 'monetary', 'deterministic', false),
('EBIT', 'EBIT', 'EBIT', 'income_statement', 'monetary', 'deterministic', false),
('INTEREST_EXPENSE', 'Interest Expense', 'Koszty odsetkowe', 'income_statement', 'monetary', 'deterministic', false),
('INTEREST_RATE', 'Interest Rate', 'Stopa procentowa', 'macro', 'percentage', 'ornstein_uhlenbeck', true),
('TAX_RATE', 'Effective Tax Rate', 'Efektywna stopa podatkowa', 'income_statement', 'percentage', 'deterministic', false),
('NET_INCOME', 'Net Income', 'Zysk netto', 'income_statement', 'monetary', 'deterministic', false),
('CAPEX', 'Capital Expenditures', 'Nakłady inwestycyjne', 'cash_flow', 'monetary', 'gbm', true),
('WORKING_CAPITAL', 'Working Capital', 'Kapitał obrotowy', 'balance_sheet', 'monetary', 'deterministic', false),
('DELTA_WC', 'Change in Working Capital', 'Zmiana kapitału obrotowego', 'cash_flow', 'monetary', 'deterministic', false),
('FREE_CASH_FLOW', 'Free Cash Flow', 'Wolny przepływ pieniężny', 'cash_flow', 'monetary', 'deterministic', false),
('DEBT', 'Total Debt', 'Dług całkowity', 'balance_sheet', 'monetary', 'deterministic', false),
('CASH', 'Cash & Equivalents', 'Środki pieniężne', 'balance_sheet', 'monetary', 'deterministic', false),
('NET_DEBT', 'Net Debt', 'Dług netto', 'balance_sheet', 'monetary', 'deterministic', false),
('DSCR', 'Debt Service Coverage Ratio', 'Wskaźnik pokrycia obsługi długu', 'ratio', 'ratio', 'deterministic', false),
('LEVERAGE', 'Leverage (Net Debt / EBITDA)', 'Dźwignia finansowa', 'ratio', 'ratio', 'deterministic', false),
('GDP_GROWTH', 'GDP Growth Rate', 'Wzrost PKB', 'macro', 'percentage', 'ornstein_uhlenbeck', true),
('INFLATION', 'Inflation Rate', 'Inflacja', 'macro', 'percentage', 'ornstein_uhlenbeck', true);

-- =============================================
-- DONE!
-- =============================================
