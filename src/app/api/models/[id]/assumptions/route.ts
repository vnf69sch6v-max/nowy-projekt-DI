// =============================================
// StochFin API: Variable Assumptions CRUD
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/models/[id]/assumptions - Get all assumptions for a model
export async function GET(request: NextRequest, { params }: Params) {
    const { id: modelId } = await params;
    const supabase = createServerClient();

    try {
        const { data, error } = await supabase
            .from('variable_assumptions')
            .select('*')
            .eq('model_id', modelId);

        if (error) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Error in GET /api/models/[id]/assumptions:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/models/[id]/assumptions - Add assumption to model
export async function POST(request: NextRequest, { params }: Params) {
    const { id: modelId } = await params;
    const supabase = createServerClient();

    try {
        const body = await request.json();

        const {
            variable_id,
            is_stochastic,
            stochastic_process,
            distribution_parameters,
            assumptions_narrative,
            sensitivity_flag
        } = body;

        // Validation
        if (!variable_id) {
            return NextResponse.json(
                { data: null, error: 'variable_id is required' },
                { status: 400 }
            );
        }

        // Verify model exists
        const { data: model } = await supabase
            .from('forecast_models')
            .select('id')
            .eq('id', modelId)
            .single();

        if (!model) {
            return NextResponse.json(
                { data: null, error: 'Model not found' },
                { status: 404 }
            );
        }

        // Check for duplicate
        const { data: existing } = await supabase
            .from('variable_assumptions')
            .select('id')
            .eq('model_id', modelId)
            .eq('variable_id', variable_id)
            .single();

        if (existing) {
            return NextResponse.json(
                { data: null, error: 'Assumption for this variable already exists in this model' },
                { status: 409 }
            );
        }

        const { data, error } = await supabase
            .from('variable_assumptions')
            .insert({
                model_id: modelId,
                variable_id,
                is_stochastic: is_stochastic ?? true,
                stochastic_process: stochastic_process || 'pert',
                distribution_parameters: distribution_parameters || {},
                assumptions_narrative: assumptions_narrative || '',
                sensitivity_flag: sensitivity_flag || 'medium'
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/models/[id]/assumptions:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/models/[id]/assumptions - Bulk update assumptions
export async function PUT(request: NextRequest, { params }: Params) {
    const { id: modelId } = await params;
    const supabase = createServerClient();

    try {
        const body = await request.json();
        const { assumptions } = body;

        if (!Array.isArray(assumptions)) {
            return NextResponse.json(
                { data: null, error: 'assumptions must be an array' },
                { status: 400 }
            );
        }

        // Delete existing and insert new
        await supabase
            .from('variable_assumptions')
            .delete()
            .eq('model_id', modelId);

        if (assumptions.length > 0) {
            const toInsert = assumptions.map(a => ({
                model_id: modelId,
                variable_id: a.variable_id,
                is_stochastic: a.is_stochastic ?? true,
                stochastic_process: a.stochastic_process || 'pert',
                distribution_parameters: a.distribution_parameters || {},
                assumptions_narrative: a.assumptions_narrative || '',
                sensitivity_flag: a.sensitivity_flag || 'medium'
            }));

            const { error } = await supabase
                .from('variable_assumptions')
                .insert(toInsert);

            if (error) {
                return NextResponse.json(
                    { data: null, error: error.message },
                    { status: 500 }
                );
            }
        }

        // Fetch updated list
        const { data } = await supabase
            .from('variable_assumptions')
            .select('*')
            .eq('model_id', modelId);

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Error in PUT /api/models/[id]/assumptions:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
