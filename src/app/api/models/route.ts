// =============================================
// StochFin API: Models CRUD (Connected to Supabase)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

// GET /api/models - List all models
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityId = searchParams.get('entity_id');

    try {
        let query = supabase
            .from('forecast_models')
            .select(`
                id,
                entity_id,
                name,
                description,
                status,
                base_date,
                horizon_months,
                n_simulations,
                version,
                created_at,
                updated_at
            `)
            .order('updated_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (entityId) {
            query = query.eq('entity_id', entityId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching models:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        // Enrich with last simulation data
        const modelsWithSimulations = await Promise.all(
            (data || []).map(async (model) => {
                const { data: lastSim } = await supabase
                    .from('simulation_runs')
                    .select('completed_at, status')
                    .eq('model_id', model.id)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...model,
                    last_simulation_at: lastSim?.completed_at || null,
                };
            })
        );

        return NextResponse.json({ data: modelsWithSimulations, error: null });
    } catch (error) {
        console.error('Error in GET /api/models:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/models - Create new model
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const body = await request.json();

        const {
            entity_id,
            name,
            description,
            base_date,
            horizon_months,
            n_simulations
        } = body;

        // Validation
        if (!entity_id || !name || !base_date) {
            return NextResponse.json(
                { data: null, error: 'Missing required fields: entity_id, name, base_date' },
                { status: 400 }
            );
        }

        if (horizon_months && (horizon_months < 1 || horizon_months > 120)) {
            return NextResponse.json(
                { data: null, error: 'horizon_months must be between 1 and 120' },
                { status: 400 }
            );
        }

        if (n_simulations && (n_simulations < 1000 || n_simulations > 100000)) {
            return NextResponse.json(
                { data: null, error: 'n_simulations must be between 1000 and 100000' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('forecast_models')
            .insert({
                entity_id,
                name,
                description: description || '',
                base_date,
                horizon_months: horizon_months || 24,
                n_simulations: n_simulations || 10000,
                status: 'draft',
                version: 1,
                created_by: '00000000-0000-0000-0000-000000000000' // TODO: get from auth
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating model:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/models:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
