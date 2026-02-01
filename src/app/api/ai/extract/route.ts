// =============================================
// StochFin API: AI Endpoints
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import {
    extractAssumptions,
    validateAssumptions,
    generateNarrative
} from '@/lib/ai/stochfin-ai';

// POST /api/ai/extract - Extract assumptions from document
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { documentText, focusVariables, horizonMonths } = body;

        if (!documentText || typeof documentText !== 'string') {
            return NextResponse.json(
                { data: null, error: 'documentText is required' },
                { status: 400 }
            );
        }

        if (documentText.length > 50000) {
            return NextResponse.json(
                { data: null, error: 'Document too long (max 50,000 characters)' },
                { status: 400 }
            );
        }

        const result = await extractAssumptions(documentText, {
            focusVariables,
            horizonMonths
        });

        return NextResponse.json({ data: result, error: null });
    } catch (error) {
        console.error('Error in /api/ai/extract:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to extract assumptions' },
            { status: 500 }
        );
    }
}
