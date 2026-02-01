// =============================================
// StochFin API: Single Model Operations (Connected to Supabase)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/models/[id] - Get model by ID with all related data
export async function GET(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();

    try {
        // Get model
        const { data: model, error: modelError } = await supabase
            .from('forecast_models')
            .select('*')
            .eq('id', id)
            .single();

        if (modelError || !model) {
            return NextResponse.json(
                { data: null, error: 'Model not found' },
                { status: 404 }
            );
        }

        // Get assumptions
        const { data: assumptions } = await supabase
            .from('variable_assumptions')
            .select('*')
            .eq('model_id', id);

        // Get correlations
        const { data: correlations } = await supabase
            .from('correlation_matrices')
            .select('*')
            .eq('model_id', id);

        // Get covenants
        const { data: covenants } = await supabase
            .from('covenants')
            .select('*')
            .eq('model_id', id);

        return NextResponse.json({
            data: {
                ...model,
                assumptions: assumptions || [],
                correlations: correlations || [],
                covenants: covenants || []
            },
            error: null
        });
    } catch (error) {
        console.error('Error in GET /api/models/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH /api/models/[id] - Update model
export async function PATCH(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();

    try {
        const body = await request.json();

        // Filter allowed fields
        const allowedFields = [
            'name',
            'description',
            'status',
            'horizon_months',
            'n_simulations'
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { data: null, error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Bump version if status changes to active
        if (updates.status === 'active') {
            const { data: currentModel } = await supabase
                .from('forecast_models')
                .select('version')
                .eq('id', id)
                .single();

            if (currentModel) {
                updates.version = currentModel.version + 1;
            }
        }

        const { data, error } = await supabase
            .from('forecast_models')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating model:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Error in PATCH /api/models/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/models/[id] - Delete model (cascades to assumptions, correlations, etc.)
export async function DELETE(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('forecast_models')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting model:', error);
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: { id, deleted: true }, error: null });
    } catch (error) {
        console.error('Error in DELETE /api/models/[id]:', error);
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
