-- =============================================
-- StochFin: Fix RLS for Development
-- Run this to allow anon access
-- =============================================

-- Option 1: Disable RLS temporarily (fastest for dev)
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

-- Grant basic permissions to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =============================================
-- DONE! Tables are now accessible without RLS
-- =============================================
