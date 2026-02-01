-- =============================================
-- StochFin: Test Data
-- Run this to create sample entity for testing
-- =============================================

-- Create test entity
INSERT INTO public.entities (id, name, entity_type, industry, description, metadata, created_by)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'TechCorp Polska Sp. z o.o.',
    'company',
    'technology',
    'Przykładowa spółka technologiczna do testów StochFin',
    '{"sector": "IT", "region": "Polska", "employees": 150}',
    '00000000-0000-0000-0000-000000000000'
);

-- Create second test entity
INSERT INTO public.entities (id, name, entity_type, industry, description, metadata, created_by)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'NewTech Acquisition Target',
    'project',
    'technology',
    'Cel akwizycyjny - startup AI',
    '{"valuation": 5000000, "stage": "Series A"}',
    '00000000-0000-0000-0000-000000000000'
);

-- Create test forecast model
INSERT INTO public.forecast_models (id, entity_id, name, description, status, base_date, horizon_months, n_simulations, created_by)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Prognoza Q1 2026',
    'Model bazowy z założeniami dla pierwszego kwartału 2026',
    'active',
    '2026-01-01',
    24,
    10000,
    '00000000-0000-0000-0000-000000000000'
);

-- Create second test model (draft)
INSERT INTO public.forecast_models (id, entity_id, name, description, status, base_date, horizon_months, n_simulations, created_by)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Scenariusz pesymistyczny',
    'Stress test z wysoką inflacją i spadkiem popytu',
    'draft',
    '2026-01-01',
    12,
    5000,
    '00000000-0000-0000-0000-000000000000'
);

-- Create third test model for acquisition
INSERT INTO public.forecast_models (id, entity_id, name, description, status, base_date, horizon_months, n_simulations, created_by)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'Akwizycja NewTech',
    'Model due diligence dla przejęcia startupu',
    'active',
    '2026-02-01',
    36,
    15000,
    '00000000-0000-0000-0000-000000000000'
);

-- Get variable IDs for assumptions
-- We'll use the seeded variable definitions

-- Add assumptions for first model (Revenue, COGS, EBITDA)
INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 
    'b0000000-0000-0000-0000-000000000001',
    id,
    true,
    'pert',
    '{"min": 0.02, "mode": 0.05, "max": 0.10}',
    'Wzrost przychodów bazowany na historycznych trendach branży IT',
    'high'
FROM public.variable_definitions WHERE code = 'REVENUE_GROWTH';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 
    'b0000000-0000-0000-0000-000000000001',
    id,
    true,
    'ornstein_uhlenbeck',
    '{"mean_reversion": 0.65, "volatility": 0.05, "long_term_mean": 0.65}',
    'Udział COGS stabilny z tendencją do 65%',
    'medium'
FROM public.variable_definitions WHERE code = 'COGS_RATIO';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 
    'b0000000-0000-0000-0000-000000000001',
    id,
    true,
    'pert',
    '{"min": 0.15, "mode": 0.22, "max": 0.28}',
    'Marża EBITDA w przedziale 15-28%',
    'critical'
FROM public.variable_definitions WHERE code = 'EBITDA_MARGIN';

INSERT INTO public.variable_assumptions (model_id, variable_id, is_stochastic, stochastic_process, distribution_parameters, assumptions_narrative, sensitivity_flag)
SELECT 
    'b0000000-0000-0000-0000-000000000001',
    id,
    true,
    'ornstein_uhlenbeck',
    '{"mean_reversion": 0.05, "volatility": 0.01, "long_term_mean": 0.05}',
    'Stopa procentowa z długoterminowym celem 5%',
    'high'
FROM public.variable_definitions WHERE code = 'INTEREST_RATE';

-- Create a completed simulation run
INSERT INTO public.simulation_runs (id, model_id, run_type, n_simulations, status, started_at, completed_at, compute_time_seconds, created_by)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'full_monte_carlo',
    10000,
    'completed',
    '2026-01-30 10:00:00+00',
    '2026-01-30 10:02:35+00',
    155,
    '00000000-0000-0000-0000-000000000000'
);

-- Add aggregated results for the simulation
INSERT INTO public.aggregated_results (simulation_run_id, variable_id, period_index, period_date, mean, median, std_dev, variance, p01, p05, p10, p25, p50, p75, p90, p95, p99, min_value, max_value, prob_negative)
SELECT 
    'c0000000-0000-0000-0000-000000000001',
    id,
    12,
    '2026-12-31',
    1250000,
    1180000,
    420000,
    176400000000,
    -450000,
    -120000,
    280000,
    720000,
    1180000,
    1650000,
    2100000,
    2450000,
    3200000,
    -850000,
    4500000,
    0.12
FROM public.variable_definitions WHERE code = 'FREE_CASH_FLOW';

INSERT INTO public.aggregated_results (simulation_run_id, variable_id, period_index, period_date, mean, median, std_dev, variance, p01, p05, p10, p25, p50, p75, p90, p95, p99, min_value, max_value, prob_negative)
SELECT 
    'c0000000-0000-0000-0000-000000000001',
    id,
    12,
    '2026-12-31',
    2800000,
    2750000,
    580000,
    336400000000,
    1200000,
    1650000,
    1920000,
    2380000,
    2750000,
    3150000,
    3580000,
    3920000,
    4650000,
    850000,
    5800000,
    0.00
FROM public.variable_definitions WHERE code = 'EBITDA';

-- =============================================
-- DONE! Test data created
-- =============================================
