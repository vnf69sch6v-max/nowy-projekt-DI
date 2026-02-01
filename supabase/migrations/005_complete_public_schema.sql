-- =============================================
-- StochFin: Complete Fix for Public Schema
-- Drop old schemas and re-create everything in public
-- =============================================

-- First drop dependent objects
DROP TABLE IF EXISTS public.user_notifications CASCADE;
DROP TABLE IF EXISTS public.assumption_changes CASCADE;
DROP TABLE IF EXISTS public.aggregated_results CASCADE;
DROP TABLE IF EXISTS public.simulation_runs CASCADE;
DROP TABLE IF EXISTS public.covenants CASCADE;
DROP TABLE IF EXISTS public.correlation_matrices CASCADE;
DROP TABLE IF EXISTS public.variable_assumptions CASCADE;
DROP TABLE IF EXISTS public.forecast_models CASCADE;
DROP TABLE IF EXISTS public.historical_facts CASCADE;
DROP TABLE IF EXISTS public.variable_definitions CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;

-- Drop from old schemas if they exist
DROP TABLE IF EXISTS simulations.aggregated_results CASCADE;
DROP TABLE IF EXISTS simulations.simulation_runs CASCADE;
DROP TABLE IF EXISTS models.covenants CASCADE;
DROP TABLE IF EXISTS models.correlation_matrices CASCADE;
DROP TABLE IF EXISTS models.variable_assumptions CASCADE;
DROP TABLE IF EXISTS models.forecast_models CASCADE;
DROP TABLE IF EXISTS audit.user_notifications CASCADE;
DROP TABLE IF EXISTS audit.assumption_changes CASCADE;
DROP TABLE IF EXISTS core.historical_facts CASCADE;
DROP TABLE IF EXISTS core.variable_definitions CASCADE;
DROP TABLE IF EXISTS core.entities CASCADE;

-- Drop old schemas
DROP SCHEMA IF EXISTS simulations CASCADE;
DROP SCHEMA IF EXISTS models CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS core CASCADE;

-- =============================================
-- ENUMS (in public schema)
-- =============================================
DROP TYPE IF EXISTS entity_type CASCADE;
DROP TYPE IF EXISTS variable_category CASCADE;
DROP TYPE IF EXISTS data_type CASCADE;
DROP TYPE IF EXISTS stochastic_process CASCADE;
DROP TYPE IF EXISTS model_status CASCADE;
DROP TYPE IF EXISTS simulation_status CASCADE;
DROP TYPE IF EXISTS run_type CASCADE;
DROP TYPE IF EXISTS sensitivity_flag CASCADE;

CREATE TYPE entity_type AS ENUM ('company', 'project', 'asset', 'portfolio');
CREATE TYPE variable_category AS ENUM ('income_statement', 'balance_sheet', 'cash_flow', 'ratio', 'other', 'external');
CREATE TYPE data_type AS ENUM ('monetary', 'percentage', 'ratio', 'integer', 'days');
CREATE TYPE stochastic_process AS ENUM ('deterministic', 'gbm', 'ornstein_uhlenbeck', 'jump_diffusion', 'pert', 'normal', 'lognormal', 'uniform', 'triangular', 'beta', 'empirical');
CREATE TYPE model_status AS ENUM ('draft', 'active', 'archived', 'superseded');
CREATE TYPE simulation_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE run_type AS ENUM ('full_monte_carlo', 'sensitivity', 'stress_test', 'scenario_analysis');
CREATE TYPE sensitivity_flag AS ENUM ('critical', 'high', 'medium', 'low');

-- =============================================
-- TABLES
-- =============================================

-- Entities
CREATE TABLE public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    entity_type entity_type NOT NULL DEFAULT 'company',
    industry VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variable Definitions
CREATE TABLE public.variable_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_pl VARCHAR(255),
    variable_category variable_category NOT NULL,
    data_type data_type NOT NULL,
    typical_process stochastic_process DEFAULT 'deterministic',
    is_driver BOOLEAN DEFAULT false,
    description TEXT,
    calculation_formula TEXT,
    unit VARCHAR(50),
    metadata JSONB DEFAULT '{}'
);

-- Historical Facts
CREATE TABLE public.historical_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES public.variable_definitions(id),
    period_date DATE NOT NULL,
    value DECIMAL(20, 4) NOT NULL,
    source VARCHAR(255),
    confidence VARCHAR(20),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forecast Models
CREATE TABLE public.forecast_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status model_status DEFAULT 'draft',
    base_date DATE NOT NULL,
    horizon_months INTEGER DEFAULT 24,
    n_simulations INTEGER DEFAULT 10000,
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variable Assumptions
CREATE TABLE public.variable_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.forecast_models(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES public.variable_definitions(id),
    is_stochastic BOOLEAN DEFAULT true,
    stochastic_process stochastic_process DEFAULT 'pert',
    distribution_parameters JSONB DEFAULT '{}',
    assumptions_narrative TEXT,
    sensitivity_flag sensitivity_flag DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, variable_id)
);

-- Correlation Matrices
CREATE TABLE public.correlation_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.forecast_models(id) ON DELETE CASCADE,
    var1_id UUID NOT NULL REFERENCES public.variable_definitions(id),
    var2_id UUID NOT NULL REFERENCES public.variable_definitions(id),
    correlation DECIMAL(5, 4) NOT NULL CHECK (correlation >= -1 AND correlation <= 1),
    basis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Covenants
CREATE TABLE public.covenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.forecast_models(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variable_code VARCHAR(50) NOT NULL,
    threshold DECIMAL(20, 4) NOT NULL,
    operator VARCHAR(10) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation Runs
CREATE TABLE public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.forecast_models(id) ON DELETE CASCADE,
    run_type run_type DEFAULT 'full_monte_carlo',
    n_simulations INTEGER NOT NULL,
    random_seed INTEGER,
    status simulation_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    compute_time_seconds INTEGER,
    error_message TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated Results
CREATE TABLE public.aggregated_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL REFERENCES public.variable_definitions(id),
    period_index INTEGER NOT NULL,
    period_date DATE,
    mean DECIMAL(20, 4),
    median DECIMAL(20, 4),
    std_dev DECIMAL(20, 4),
    variance DECIMAL(20, 4),
    p01 DECIMAL(20, 4),
    p05 DECIMAL(20, 4),
    p10 DECIMAL(20, 4),
    p25 DECIMAL(20, 4),
    p50 DECIMAL(20, 4),
    p75 DECIMAL(20, 4),
    p90 DECIMAL(20, 4),
    p95 DECIMAL(20, 4),
    p99 DECIMAL(20, 4),
    min_value DECIMAL(20, 4),
    max_value DECIMAL(20, 4),
    prob_negative DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assumption Changes (Audit)
CREATE TABLE public.assumption_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.forecast_models(id) ON DELETE CASCADE,
    assumption_id UUID REFERENCES public.variable_assumptions(id) ON DELETE SET NULL,
    change_type VARCHAR(20) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_reason TEXT
);

-- User Notifications
CREATE TABLE public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_entities_type ON public.entities(entity_type);
CREATE INDEX idx_entities_industry ON public.entities(industry);
CREATE INDEX idx_historical_facts_entity ON public.historical_facts(entity_id);
CREATE INDEX idx_historical_facts_variable ON public.historical_facts(variable_id);
CREATE INDEX idx_historical_facts_date ON public.historical_facts(period_date);
CREATE INDEX idx_forecast_models_entity ON public.forecast_models(entity_id);
CREATE INDEX idx_forecast_models_status ON public.forecast_models(status);
CREATE INDEX idx_variable_assumptions_model ON public.variable_assumptions(model_id);
CREATE INDEX idx_variable_assumptions_variable ON public.variable_assumptions(variable_id);
CREATE INDEX idx_simulation_runs_model ON public.simulation_runs(model_id);
CREATE INDEX idx_simulation_runs_status ON public.simulation_runs(status);
CREATE INDEX idx_aggregated_results_run ON public.aggregated_results(simulation_run_id);
CREATE INDEX idx_aggregated_results_variable ON public.aggregated_results(variable_id);

-- =============================================
-- SEED DATA
-- =============================================
INSERT INTO public.variable_definitions (code, name, name_pl, variable_category, data_type, typical_process, is_driver) VALUES
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
('INTEREST_RATE', 'Interest Rate', 'Stopa procentowa', 'external', 'percentage', 'ornstein_uhlenbeck', true),
('TAX_RATE', 'Effective Tax Rate', 'Efektywna stopa podatkowa', 'income_statement', 'percentage', 'deterministic', true),
('NET_INCOME', 'Net Income', 'Zysk netto', 'income_statement', 'monetary', 'deterministic', false),
('CAPEX', 'Capital Expenditures', 'Nakłady inwestycyjne', 'cash_flow', 'monetary', 'pert', true),
('CAPEX_RATIO', 'CapEx to Revenue Ratio', 'CapEx / Przychody', 'ratio', 'percentage', 'triangular', true),
('NWC_CHANGE', 'Net Working Capital Change', 'Zmiana KON', 'cash_flow', 'monetary', 'normal', true),
('NWC_DAYS', 'Net Working Capital Days', 'Dni KON', 'ratio', 'days', 'ornstein_uhlenbeck', true),
('FREE_CASH_FLOW', 'Free Cash Flow', 'Wolne przepływy pieniężne', 'cash_flow', 'monetary', 'deterministic', false),
('TOTAL_DEBT', 'Total Debt', 'Łączne zadłużenie', 'balance_sheet', 'monetary', 'deterministic', false),
('CASH', 'Cash & Equivalents', 'Środki pieniężne', 'balance_sheet', 'monetary', 'deterministic', false),
('NET_DEBT', 'Net Debt', 'Dług netto', 'balance_sheet', 'monetary', 'deterministic', false),
('DSCR', 'Debt Service Coverage Ratio', 'DSCR', 'ratio', 'ratio', 'deterministic', false),
('LEVERAGE', 'Net Debt / EBITDA', 'Dźwignia', 'ratio', 'ratio', 'deterministic', false),
('EQUITY', 'Shareholders Equity', 'Kapitał własny', 'balance_sheet', 'monetary', 'deterministic', false);

-- =============================================
-- DISABLE RLS FOR DEVELOPMENT
-- =============================================
ALTER TABLE public.entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_assumptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.correlation_matrices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.covenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregated_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumption_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =============================================
-- TEST DATA
-- =============================================

INSERT INTO public.entities (id, name, entity_type, industry, description, created_by) VALUES
('a0000000-0000-0000-0000-000000000001', 'TechCorp Polska Sp. z o.o.', 'company', 'technology', 'Przykładowa spółka technologiczna', '00000000-0000-0000-0000-000000000000'),
('a0000000-0000-0000-0000-000000000002', 'NewTech Acquisition Target', 'project', 'technology', 'Cel akwizycyjny - startup AI', '00000000-0000-0000-0000-000000000000');

INSERT INTO public.forecast_models (id, entity_id, name, description, status, base_date, horizon_months, n_simulations, created_by) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prognoza Q1 2026', 'Model bazowy z założeniami dla Q1 2026', 'active', '2026-01-01', 24, 10000, '00000000-0000-0000-0000-000000000000'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Scenariusz pesymistyczny', 'Stress test z wysoką inflacją', 'draft', '2026-01-01', 12, 5000, '00000000-0000-0000-0000-000000000000'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Akwizycja NewTech', 'Model due diligence', 'active', '2026-02-01', 36, 15000, '00000000-0000-0000-0000-000000000000');

-- Add variable assumptions
INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 'b0000000-0000-0000-0000-000000000001', id, true, 'pert', '{"min": 0.02, "mode": 0.05, "max": 0.10}', 'Wzrost przychodów 5% +/- 3%', 'high'
FROM public.variable_definitions WHERE code = 'REVENUE_GROWTH';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 'b0000000-0000-0000-0000-000000000001', id, true, 'ornstein_uhlenbeck', '{"mean_reversion": 0.5, "volatility": 0.05, "long_term_mean": 0.65}', 'Udział COGS 65%', 'medium'
FROM public.variable_definitions WHERE code = 'COGS_RATIO';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 'b0000000-0000-0000-0000-000000000001', id, true, 'pert', '{"min": 0.15, "mode": 0.22, "max": 0.28}', 'Marża EBITDA 15-28%', 'critical'
FROM public.variable_definitions WHERE code = 'EBITDA_MARGIN';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 'b0000000-0000-0000-0000-000000000001', id, true, 'ornstein_uhlenbeck', '{"mean_reversion": 0.3, "volatility": 0.01, "long_term_mean": 0.055}', 'Stopa 5.5%', 'high'
FROM public.variable_definitions WHERE code = 'INTEREST_RATE';

-- =============================================
-- DONE!
-- =============================================
