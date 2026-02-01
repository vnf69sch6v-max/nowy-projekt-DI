// =============================================
// StochFin API: Single Simulation Operations (Connected to Supabase)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/simulations/[id] - Get simulation with results
export async function GET(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const includeResults = searchParams.get('include_results') === 'true';

    try {
        // Get simulation
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

        // Get model info
        const { data: model } = await supabase
            .from('forecast_models')
            .select('name, entity_id')
            .eq('id', simulation.model_id)
            .single();

        // Get entity name
        let entityName = null;
        if (model?.entity_id) {
            const { data: entity } = await supabase
                .from('entities')
                .select('name')
                .eq('id', model.entity_id)
                .single();
            entityName = entity?.name;
        }

        let results = undefined;

        if (includeResults && simulation.status === 'completed') {
            // Get aggregated results
            const { data: aggregatedResults } = await supabase
                .from('aggregated_results')
                .select('*')
                .eq('simulation_run_id', id);

            results = (aggregatedResults || []).map(r => ({
                variable_id: r.variable_id,
                period_index: r.period_index,
                period_date: r.period_date,
                mean: r.mean,
                median: r.median,
                std_dev: r.std_dev,
                p05: r.p05,
                p10: r.p10,
                p25: r.p25,
                p50: r.p50,
                p75: r.p75,
                p90: r.p90,
                p95: r.p95,
                min_value: r.min_value,
                max_value: r.max_value,
                prob_negative: r.prob_negative
            }));
        }

        return NextResponse.json({
            data: {
                ...simulation,
                model_name: model?.name,
                entity_name: entityName,
                results
            },
            error: null
        });
    } catch (error) {
        console.error('Error in GET /api/simulations/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH /api/simulations/[id] - Update simulation (e.g., cancel)
export async function PATCH(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();

    try {
        const body = await request.json();
        const { status } = body;

        // Only allow cancellation
        if (status !== 'cancelled') {
            return NextResponse.json(
                { data: null, error: 'Only cancellation is allowed via PATCH' },
                { status: 400 }
            );
        }

        // Check current status
        const { data: currentSim } = await supabase
            .from('simulation_runs')
            .select('status')
            .eq('id', id)
            .single();

        if (!currentSim) {
            return NextResponse.json(
                { data: null, error: 'Simulation not found' },
                { status: 404 }
            );
        }

        if (!['pending', 'running'].includes(currentSim.status)) {
            return NextResponse.json(
                { data: null, error: 'Can only cancel pending or running simulations' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('simulation_runs')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Error in PATCH /api/simulations/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/simulations/[id] - Delete simulation and results
export async function DELETE(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('simulation_runs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting simulation:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: { id, deleted: true }, error: null });
    } catch (error) {
        console.error('Error in DELETE /api/simulations/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
