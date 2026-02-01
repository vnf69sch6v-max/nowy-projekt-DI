// @ts-nocheck
// =============================================
// StochFin API: Validate Assumptions
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { validateAssumptions } from '@/lib/ai/stochfin-ai';

// POST /api/ai/validate - Validate assumptions for consistency
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { assumptions, correlationMatrix } = body;

        if (!assumptions || !Array.isArray(assumptions)) {
            return NextResponse.json(
                { data: null, error: 'assumptions array is required' },
                { status: 400 }
            );
        }

        const result = await validateAssumptions(assumptions, correlationMatrix);

        return NextResponse.json({ data: result, error: null });
    } catch (error) {
        console.error('Error in /api/ai/validate:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to validate assumptions' },
            { status: 500 }
        );
    }
}
