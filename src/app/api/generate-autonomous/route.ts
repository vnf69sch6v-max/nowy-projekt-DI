/**
 * API Route: /api/generate-autonomous
 * 
 * Endpoint dla autonomicznego systemu generowania memorandum
 * Używa Pipeline Orchestrator z 7 agentami
 */

import { NextRequest, NextResponse } from 'next/server';

// Route segment config
export const maxDuration = 300; // 5 minutes for complex generation
export const dynamic = 'force-dynamic';

// Types for request/response
interface GenerateRequest {
    sessionId?: string;
    offerParams?: {
        seriaAkcji?: string;
        liczbaAkcji?: number;
        wartoscNominalna?: number;
        cenaEmisyjna?: number;
        celeEmisji?: string;
    };
}

interface GenerateResponse {
    success: boolean;
    sessionId: string;
    status: string;
    progress: number;
    company?: {
        nazwa: string;
        krs: string;
    };
    sectionsCount?: number;
    errors?: string[];
    pdfBase64?: string;
    markdownContent?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
    try {
        // Parse multipart form data
        const formData = await request.formData();

        const krsFile = formData.get('krsFile') as File | null;
        const financialFile = formData.get('financialFile') as File | null;
        const paramsJson = formData.get('params') as string | null;

        if (!krsFile) {
            return NextResponse.json({
                success: false,
                sessionId: '',
                status: 'ERROR',
                progress: 0,
                errors: ['Brak pliku KRS']
            }, { status: 400 });
        }

        // Parse offer parameters
        let offerParams: GenerateRequest['offerParams'] = {};
        if (paramsJson) {
            try {
                offerParams = JSON.parse(paramsJson);
            } catch {
                console.warn('Failed to parse offer params');
            }
        }

        // Generate session ID
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Import pipeline dynamically to avoid bundling issues
        const { createPipeline } = await import('@/lib/agents/pipeline-orchestrator');
        const { renderMemorandumPDF } = await import('@/lib/agents/pdf-renderer');

        // Create and run pipeline
        const pipeline = createPipeline(sessionId, {
            skipVerification: false,
            maxRetries: 2
        });

        // Run the full pipeline
        const result = await pipeline.run(
            krsFile,
            financialFile || undefined,
            offerParams ? {
                seriaAkcji: offerParams.seriaAkcji,
                liczbaAkcji: offerParams.liczbaAkcji,
                wartoscNominalna: offerParams.wartoscNominalna,
                cenaEmisyjna: offerParams.cenaEmisyjna,
                celeEmisji: offerParams.celeEmisji
            } : undefined
        );

        // Check for errors
        if (result.status === 'ERROR' || !result.sections || result.sections.length === 0) {
            return NextResponse.json({
                success: false,
                sessionId,
                status: result.status,
                progress: result.progress,
                errors: result.errors.length > 0 ? result.errors : ['Nie udało się wygenerować treści']
            }, { status: 500 });
        }

        // Generate PDF
        let pdfBase64: string | undefined;
        try {
            const pdfBytes = await renderMemorandumPDF(
                result.sections,
                result.company || {},
                result.offer
            );
            pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            result.errors.push('Błąd generowania PDF');
        }

        // Get markdown content
        const markdownContent = pipeline.getMarkdown();

        return NextResponse.json({
            success: true,
            sessionId,
            status: result.status,
            progress: 100,
            company: result.company ? {
                nazwa: result.company.nazwa || 'Nieznana',
                krs: result.company.krs || ''
            } : undefined,
            sectionsCount: result.sections.length,
            errors: result.errors.length > 0 ? result.errors : undefined,
            pdfBase64,
            markdownContent
        });

    } catch (error) {
        console.error('Pipeline error:', error);
        return NextResponse.json({
            success: false,
            sessionId: '',
            status: 'ERROR',
            progress: 0,
            errors: [error instanceof Error ? error.message : 'Nieznany błąd']
        }, { status: 500 });
    }
}
