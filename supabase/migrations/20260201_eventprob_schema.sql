-- =============================================
-- EventProb Engine - Database Schema Migration
-- StochFin Event Probability Module
-- =============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: events - User-defined event definitions
-- =============================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Event metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'threshold_breach', 
        'compound', 
        'conditional', 
        'sequence', 
        'at_least_k'
    )),
    
    -- Formal event definition (DSL)
    definition_json JSONB NOT NULL,
    
    -- Time horizon
    horizon_months INTEGER NOT NULL CHECK (horizon_months > 0),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Latest results cache
    current_probability DECIMAL(5,4),
    current_ci_lower DECIMAL(5,4),
    current_ci_upper DECIMAL(5,4),
    last_computed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_is_active ON events(is_active);

-- =============================================
-- Table: event_variables - Variables linked to events
-- =============================================
CREATE TABLE IF NOT EXISTS event_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- Variable identification
    variable_name VARCHAR(100) NOT NULL,
    variable_label VARCHAR(200), -- Human-readable label
    
    -- SDE Model configuration
    sde_model VARCHAR(50) NOT NULL CHECK (sde_model IN (
        'gbm',
        'ornstein_uhlenbeck', 
        'heston',
        'merton_jump',
        'deterministic'
    )),
    sde_parameters JSONB NOT NULL,
    -- GBM: {mu, sigma}
    -- OU: {theta, mu, sigma}
    -- Heston: {mu, theta, kappa, xi, rho, initial_variance}
    -- Merton: {mu, sigma, lambda, mu_jump, sigma_jump}
    
    -- Initial value and frequency
    initial_value DECIMAL NOT NULL,
    data_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (data_frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    )),
    
    -- Bayesian prior configuration
    prior_distribution JSONB,
    -- {type: 'beta'|'normal'|'gamma', parameters: {...}, source: 'expert'|'empirical'}
    
    current_posterior JSONB,
    
    -- Reference to historical data
    time_series_ref VARCHAR(500),
    
    -- Auto-selection flags
    model_auto_selected BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, variable_name)
);

CREATE INDEX idx_event_variables_event_id ON event_variables(event_id);

-- =============================================
-- Table: copula_specifications - Dependency definitions
-- =============================================
CREATE TABLE IF NOT EXISTS copula_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- Variable pair (null for Vine copula covering all)
    variable_pair TEXT[], -- ['var_1', 'var_2'] or NULL for multivariate
    
    -- Copula family
    copula_family VARCHAR(50) NOT NULL CHECK (copula_family IN (
        'gaussian',
        'student_t',
        'clayton',
        'gumbel',
        'frank',
        'rotated_clayton_90',
        'rotated_clayton_180',
        'rotated_clayton_270',
        'rotated_gumbel_90',
        'rotated_gumbel_180',
        'rotated_gumbel_270',
        'vine_c',
        'vine_d',
        'vine_r'
    )),
    
    -- Parameters
    parameters JSONB NOT NULL,
    -- Gaussian: {rho}
    -- Student-t: {rho, nu}
    -- Clayton/Gumbel/Frank: {theta}
    -- Vine: {structure: [...], pair_copulas: [...]}
    
    -- Tail dependence (computed)
    tail_dependence JSONB,
    -- {lambda_lower, lambda_upper}
    
    -- Estimation metadata
    estimation_method VARCHAR(50) DEFAULT 'mle' CHECK (estimation_method IN (
        'mle', 'rank_correlation', 'kendall_tau', 'manual'
    )),
    estimation_window JSONB,
    -- {start_date, end_date, n_observations}
    
    -- Goodness of fit
    goodness_of_fit JSONB,
    -- {aic, bic, cramer_von_mises_p, selected_reason}
    
    auto_selected BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_copula_specs_event_id ON copula_specifications(event_id);

-- =============================================
-- Table: bayesian_versions - Hypothesis version history
-- =============================================
CREATE TABLE IF NOT EXISTS bayesian_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- Version numbering (Git-like)
    version_number VARCHAR(20) NOT NULL,
    parent_version_id UUID REFERENCES bayesian_versions(id),
    
    -- State snapshots
    prior_state JSONB NOT NULL,
    -- Per-variable priors used in this version
    
    posterior_state JSONB NOT NULL,
    -- Per-variable posteriors after update
    
    -- Data that triggered update
    data_used JSONB,
    -- {observations: [...], source, period}
    
    -- Probability estimates
    probability_estimate JSONB NOT NULL,
    -- {mean, median, p5, p10, p25, p50, p75, p90, p95, hdi_90_lower, hdi_90_upper}
    
    -- Simulation metadata
    n_simulations INTEGER NOT NULL,
    copula_used VARCHAR(50),
    
    -- Comparison with alternative models
    model_comparison JSONB,
    -- {gaussian_prob, clayton_prob, student_t_prob, copula_multiplier}
    
    -- Flags
    inflation_applied BOOLEAN DEFAULT false,
    -- Anti-overconfidence flag
    
    notes TEXT,
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, version_number)
);

CREATE INDEX idx_bayesian_versions_event_id ON bayesian_versions(event_id);
CREATE INDEX idx_bayesian_versions_parent ON bayesian_versions(parent_version_id);

-- =============================================
-- Table: simulation_cache - Cached MC results
-- =============================================
CREATE TABLE IF NOT EXISTS simulation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    version_id UUID REFERENCES bayesian_versions(id) ON DELETE CASCADE,
    
    -- Cache key (for invalidation)
    config_hash VARCHAR(64) NOT NULL,
    -- SHA-256 of: event_def + sde_params + copula_params + n_sim
    
    -- Storage reference (for large scenario files)
    scenarios_ref VARCHAR(500),
    -- Path to Firebase Storage file with raw trajectories
    
    n_scenarios INTEGER NOT NULL,
    
    -- Summary statistics (for quick access)
    summary_stats JSONB NOT NULL,
    -- {
    --   probability: {mean, ci_90: [lo, hi]},
    --   decomposition: {p_var1, p_var2, p_joint_independent, p_joint_copula},
    --   percentiles: {var1: {p5, p25, p50, p75, p95}, var2: {...}},
    --   var_99, es_99
    -- }
    
    computation_time_ms INTEGER,
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    UNIQUE(event_id, config_hash)
);

CREATE INDEX idx_simulation_cache_event_id ON simulation_cache(event_id);
CREATE INDEX idx_simulation_cache_hash ON simulation_cache(config_hash);
CREATE INDEX idx_simulation_cache_expires ON simulation_cache(expires_at);

-- =============================================
-- Row Level Security Policies
-- =============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE copula_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayesian_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_cache ENABLE ROW LEVEL SECURITY;

-- Events: users can only see their own
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = user_id);

-- Event variables: cascade from events
CREATE POLICY "Users can manage event variables" ON event_variables
    FOR ALL USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
    );

-- Copula specs: cascade from events
CREATE POLICY "Users can manage copula specs" ON copula_specifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
    );

-- Bayesian versions: cascade from events
CREATE POLICY "Users can manage bayesian versions" ON bayesian_versions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
    );

-- Simulation cache: cascade from events
CREATE POLICY "Users can manage simulation cache" ON simulation_cache
    FOR ALL USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
    );

-- =============================================
-- Trigger for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_variables_updated_at
    BEFORE UPDATE ON event_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copula_specs_updated_at
    BEFORE UPDATE ON copula_specifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
