-- =============================================
-- StochFin: Fix - Move tables to public schema
-- Run this AFTER 001_stochfin_schema.sql
-- =============================================

-- Drop RLS policies that reference old schema
DROP POLICY IF EXISTS "Users can view all entities" ON core.entities;
DROP POLICY IF EXISTS "Users can create entities" ON core.entities;
DROP POLICY IF EXISTS "Users can update own entities" ON core.entities;
DROP POLICY IF EXISTS "Users can delete own entities" ON core.entities;
DROP POLICY IF EXISTS "Anyone can view variable definitions" ON core.variable_definitions;
DROP POLICY IF EXISTS "Users can view facts for their entities" ON core.historical_facts;
DROP POLICY IF EXISTS "Users can insert facts" ON core.historical_facts;
DROP POLICY IF EXISTS "Users can view all models" ON models.forecast_models;
DROP POLICY IF EXISTS "Users can create models" ON models.forecast_models;
DROP POLICY IF EXISTS "Users can update own models" ON models.forecast_models;
DROP POLICY IF EXISTS "Users can delete own models" ON models.forecast_models;
DROP POLICY IF EXISTS "Users can view assumptions" ON models.variable_assumptions;
DROP POLICY IF EXISTS "Users can manage assumptions" ON models.variable_assumptions;
DROP POLICY IF EXISTS "Users can view correlations" ON models.correlation_matrices;
DROP POLICY IF EXISTS "Users can manage correlations" ON models.correlation_matrices;
DROP POLICY IF EXISTS "Users can view covenants" ON models.covenants;
DROP POLICY IF EXISTS "Users can manage covenants" ON models.covenants;
DROP POLICY IF EXISTS "Users can view simulations" ON simulations.simulation_runs;
DROP POLICY IF EXISTS "Users can create simulations" ON simulations.simulation_runs;
DROP POLICY IF EXISTS "Users can update own simulations" ON simulations.simulation_runs;
DROP POLICY IF EXISTS "Users can view results" ON simulations.aggregated_results;
DROP POLICY IF EXISTS "System can insert results" ON simulations.aggregated_results;
DROP POLICY IF EXISTS "Users can view audit log" ON audit.assumption_changes;
DROP POLICY IF EXISTS "System can insert audit log" ON audit.assumption_changes;
DROP POLICY IF EXISTS "Users can view own notifications" ON audit.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON audit.user_notifications;

-- Move tables from custom schemas to public schema
ALTER TABLE core.entities SET SCHEMA public;
ALTER TABLE core.variable_definitions SET SCHEMA public;
ALTER TABLE core.historical_facts SET SCHEMA public;
ALTER TABLE models.forecast_models SET SCHEMA public;
ALTER TABLE models.variable_assumptions SET SCHEMA public;
ALTER TABLE models.correlation_matrices SET SCHEMA public;
ALTER TABLE models.covenants SET SCHEMA public;
ALTER TABLE simulations.simulation_runs SET SCHEMA public;
ALTER TABLE simulations.aggregated_results SET SCHEMA public;
ALTER TABLE audit.assumption_changes SET SCHEMA public;
ALTER TABLE audit.user_notifications SET SCHEMA public;

-- Move enums to public (they stay in their original schema but are accessible)
-- No action needed for enums, they work across schemas

-- =============================================
-- RE-CREATE RLS POLICIES for public schema
-- =============================================

-- Entities
CREATE POLICY "Users can view all entities" ON public.entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create entities" ON public.entities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update entities" ON public.entities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete entities" ON public.entities FOR DELETE TO authenticated USING (true);

-- Variable definitions
CREATE POLICY "Anyone can view variable definitions" ON public.variable_definitions FOR SELECT TO authenticated USING (true);

-- Historical facts
CREATE POLICY "Users can manage facts" ON public.historical_facts FOR ALL TO authenticated USING (true);

-- Forecast models
CREATE POLICY "Users can view all models" ON public.forecast_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create models" ON public.forecast_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update models" ON public.forecast_models FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete models" ON public.forecast_models FOR DELETE TO authenticated USING (true);

-- Variable assumptions
CREATE POLICY "Users can manage assumptions" ON public.variable_assumptions FOR ALL TO authenticated USING (true);

-- Correlation matrices
CREATE POLICY "Users can manage correlations" ON public.correlation_matrices FOR ALL TO authenticated USING (true);

-- Covenants
CREATE POLICY "Users can manage covenants" ON public.covenants FOR ALL TO authenticated USING (true);

-- Simulation runs
CREATE POLICY "Users can view simulations" ON public.simulation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create simulations" ON public.simulation_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update simulations" ON public.simulation_runs FOR UPDATE TO authenticated USING (true);

-- Aggregated results
CREATE POLICY "Users can view results" ON public.aggregated_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert results" ON public.aggregated_results FOR INSERT TO authenticated WITH CHECK (true);

-- Audit
CREATE POLICY "Users can view audit" ON public.assumption_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit" ON public.assumption_changes FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
CREATE POLICY "Users can manage notifications" ON public.user_notifications FOR ALL TO authenticated USING (true);

-- For anon access during development (remove in production):
CREATE POLICY "Anon can view entities" ON public.entities FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view variable definitions" ON public.variable_definitions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view models" ON public.forecast_models FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage models" ON public.forecast_models FOR ALL TO anon USING (true);
CREATE POLICY "Anon can manage assumptions" ON public.variable_assumptions FOR ALL TO anon USING (true);
CREATE POLICY "Anon can view simulations" ON public.simulation_runs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage simulations" ON public.simulation_runs FOR ALL TO anon USING (true);
CREATE POLICY "Anon can view results" ON public.aggregated_results FOR SELECT TO anon USING (true);
