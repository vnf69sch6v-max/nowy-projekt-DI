// @ts-nocheck
// =============================================
// StochFin API: Simulations (Connected to Supabase)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

// GET /api/simulations - List all simulations
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        let query = supabase
            .from('simulation_runs')
            .select(`
                id,
                model_id,
                run_type,
                status,
                n_simulations,
                random_seed,
                started_at,
                completed_at,
                compute_time_seconds,
                error_message
            `)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (modelId) {
            query = query.eq('model_id', modelId);
        }

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching simulations:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        // Enrich with model names
        const modelIds = [...new Set((data || []).map(s => s.model_id))];
        const { data: models } = await supabase
            .from('forecast_models')
            .select('id, name')
            .in('id', modelIds);

        const modelMap = new Map((models || []).map(m => [m.id, m.name]));

        const simulationsWithModelNames = (data || []).map(sim => ({
            ...sim,
            model_name: modelMap.get(sim.model_id) || 'Unknown'
        }));

        return NextResponse.json({ data: simulationsWithModelNames, error: null });
    } catch (error) {
        console.error('Error in GET /api/simulations:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/simulations - Start new simulation
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const body = await request.json();
        const { model_id, run_type, n_simulations, random_seed } = body;

        // Validation
        if (!model_id) {
            return NextResponse.json(
                { data: null, error: 'model_id is required' },
                { status: 400 }
            );
        }

        const validRunTypes = ['full_monte_carlo', 'sensitivity', 'stress_test', 'scenario_analysis'];
        if (run_type && !validRunTypes.includes(run_type)) {
            return NextResponse.json(
                { data: null, error: `run_type must be one of: ${validRunTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify model exists
        const { data: model, error: modelError } = await supabase
            .from('forecast_models')
            .select('id, n_simulations')
            .eq('id', model_id)
            .single();

        if (modelError || !model) {
            return NextResponse.json(
                { data: null, error: 'Model not found' },
                { status: 404 }
            );
        }

        // Create simulation run
        const { data, error } = await supabase
            .from('simulation_runs')
            .insert({
                model_id,
                run_type: run_type || 'full_monte_carlo',
                status: 'pending',
                n_simulations: n_simulations || model.n_simulations || 10000,
                random_seed: random_seed || Math.floor(Math.random() * 1000000),
                started_at: new Date().toISOString(),
                created_by: '00000000-0000-0000-0000-000000000000' // TODO: get from auth
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating simulation:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/simulations:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
