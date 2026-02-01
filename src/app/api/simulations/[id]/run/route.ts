// =============================================
// StochFin API: Run Monte Carlo Simulation
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import {
    runSimulation,
    type SimulationInput,
    type SimulationConfig,
    type VariableConfig,
    type ProcessConfig
} from '@/lib/engine';

interface Params {
    params: Promise<{ id: string }>;
}

// POST /api/simulations/[id]/run - Execute Monte Carlo simulation
export async function POST(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();
    const startTime = Date.now();

    try {
        // Get simulation run
        const { data: simulation, error: simError } = await supabase
            .from('simulation_runs')
            .select('*')
            .eq('id', id)
            .single();

        if (simError || !simulation) {
            return NextResponse.json(
                { data: null, error: 'Simulation not found' },
                { status: 404 }
            );
        }

        // Only run pending simulations
        if (simulation.status !== 'pending') {
            return NextResponse.json(
                { data: null, error: `Simulation is already ${simulation.status}` },
                { status: 400 }
            );
        }

        // Update status to running
        await supabase
            .from('simulation_runs')
            .update({ status: 'running' })
            .eq('id', id);

        // Get model with assumptions
        const { data: model, error: modelError } = await supabase
            .from('forecast_models')
            .select('*')
            .eq('id', simulation.model_id)
            .single();

        if (modelError || !model) {
            await supabase
                .from('simulation_runs')
                .update({ status: 'failed', error_message: 'Model not found' })
                .eq('id', id);
            return NextResponse.json(
                { data: null, error: 'Model not found' },
                { status: 404 }
            );
        }

        // Get assumptions
        const { data: assumptions } = await supabase
            .from('variable_assumptions')
            .select('*')
            .eq('model_id', simulation.model_id);

        if (!assumptions || assumptions.length === 0) {
            await supabase
                .from('simulation_runs')
                .update({ status: 'failed', error_message: 'No assumptions defined' })
                .eq('id', id);
            return NextResponse.json(
                { data: null, error: 'No variable assumptions defined for this model' },
                { status: 400 }
            );
        }

        // Get variable definitions
        const variableIds = assumptions.map(a => a.variable_id);
        const { data: variableDefs } = await supabase
            .from('variable_definitions')
            .select('*')
            .in('id', variableIds);

        const varDefMap = new Map((variableDefs || []).map(v => [v.id, v]));

        // Build simulation config
        const config: SimulationConfig = {
            nSimulations: simulation.n_simulations || 10000,
            horizonPeriods: model.horizon_months || 24,
            timeStep: 'monthly',
            randomSeed: simulation.random_seed,
            correlationMethod: 'cholesky'
        };

        // Build variable configs
        const variables: VariableConfig[] = assumptions.map(a => {
            const varDef = varDefMap.get(a.variable_id);
            const params = a.distribution_parameters || {};

            // Map stochastic process to ProcessConfig
            let processConfig: ProcessConfig;

            switch (a.stochastic_process) {
                case 'gbm':
                    processConfig = {
                        type: 'gbm',
                        params: {
                            drift: params.drift || params.mode || 0.05,
                            volatility: params.volatility || 0.15,
                            initialValue: params.initial || 1000000
                        }
                    };
                    break;
                case 'ornstein_uhlenbeck':
                    processConfig = {
                        type: 'ornstein_uhlenbeck',
                        params: {
                            theta: params.mean_reversion || 0.5,
                            mu: params.long_term_mean || params.mode || 0.1,
                            sigma: params.volatility || 0.02,
                            initialValue: params.initial || params.mode || 0.1
                        }
                    };
                    break;
                case 'pert':
                default:
                    // For PERT, use deterministic with mode value
                    const modeValue = params.mode ?? ((params.min ?? 0) + (params.max ?? 1)) / 2;
                    processConfig = {
                        type: 'deterministic',
                        params: {
                            value: modeValue
                        }
                    };
                    break;
            }

            return {
                id: a.variable_id,
                code: varDef?.code || `VAR_${a.variable_id.slice(0, 8)}`,
                processConfig
            };
        });

        // Build correlation matrix (identity for now - TODO: get from model)
        const correlationMatrix: number[][] = variables.map((_, i) =>
            variables.map((_, j) => i === j ? 1 : 0)
        );

        // Prepare simulation input
        const simulationInput: SimulationInput = {
            config,
            variables,
            correlationMatrix
        };

        // Run the simulation
        console.log(`[SimRun ${id}] Starting Monte Carlo with ${config.nSimulations} simulations...`);
        const result = await runSimulation(simulationInput);
        console.log(`[SimRun ${id}] Completed in ${result.computeTimeMs}ms`);

        // Store aggregated results
        const resultInserts = result.results.map(r => ({
            simulation_run_id: id,
            variable_id: r.variableId,
            period_index: r.periodIndex,
            period_date: new Date(Date.now() + r.periodIndex * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            mean: r.stats.mean,
            median: r.stats.median,
            std_dev: r.stats.std_dev,
            variance: r.stats.variance,
            p01: r.stats.p01,
            p05: r.stats.p05,
            p10: r.stats.p10,
            p25: r.stats.p25,
            p50: r.stats.p50,
            p75: r.stats.p75,
            p90: r.stats.p90,
            p95: r.stats.p95,
            p99: r.stats.p99,
            min_value: r.stats.min,
            max_value: r.stats.max,
            prob_negative: r.stats.prob_negative
        }));

        if (resultInserts.length > 0) {
            await supabase.from('aggregated_results').insert(resultInserts);
        }

        // Update simulation status
        const computeTimeSeconds = Math.round((Date.now() - startTime) / 1000);
        await supabase
            .from('simulation_runs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                compute_time_seconds: computeTimeSeconds
            })
            .eq('id', id);

        return NextResponse.json({
            data: {
                id,
                status: 'completed',
                nSimulations: config.nSimulations,
                nVariables: variables.length,
                nPeriods: config.horizonPeriods,
                nResults: result.results.length,
                computeTimeMs: result.computeTimeMs,
                computeTimeSeconds
            },
            error: null
        });

    } catch (error) {
        console.error('Error running simulation:', error);

        // Update simulation as failed
        await supabase
            .from('simulation_runs')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', id);

        return NextResponse.json(
            { data: null, error: error instanceof Error ? error.message : 'Simulation failed' },
            { status: 500 }
        );
    }
}
