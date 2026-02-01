// @ts-nocheck
// =============================================
// StochFin API: Generate Narrative
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { generateNarrative, streamNarrative } from '@/lib/ai/stochfin-ai';

// POST /api/ai/narrative - Generate narrative from simulation results
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { simulationResults, modelContext, stream } = body;

        if (!simulationResults) {
            return NextResponse.json(
                { data: null, error: 'simulationResults is required' },
                { status: 400 }
            );
        }

        // Streaming response
        if (stream) {
            const encoder = new TextEncoder();
            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of streamNarrative(simulationResults, modelContext)) {
                            controller.enqueue(encoder.encode(chunk));
                        }
                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                }
            });

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked'
                }
            });
        }

        // Non-streaming response
        const result = await generateNarrative(simulationResults, modelContext);

        return NextResponse.json({ data: result, error: null });
    } catch (error) {
        console.error('Error in /api/ai/narrative:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to generate narrative' },
            { status: 500 }
        );
    }
}
