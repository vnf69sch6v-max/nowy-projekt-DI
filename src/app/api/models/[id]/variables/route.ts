// @ts-nocheck
// =============================================
// StochFin: Model Variables API Endpoint
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/models/[id]/variables - Get variables for a model
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('model_variables')
            .select('*')
            .eq('model_id', id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching variables:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Error in GET /api/models/[id]/variables:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/models/[id]/variables - Create a new variable
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('model_variables')
            .insert({
                model_id: id,
                code: body.code,
                name_pl: body.name_pl,
                name_en: body.name_en,
                unit: body.unit,
                process_type: body.process_type || 'gbm',
                process_params: body.process_params || {},
                is_output: body.is_output || false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating variable:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (err) {
        console.error('Error in POST /api/models/[id]/variables:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
