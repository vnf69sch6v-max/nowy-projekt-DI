/**
 * API do generowania DOCX
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDocx } from '@/lib/documents/docx-generator';
import { KRSCompany, FinancialData } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, company, financials } = body as {
            content: string;
            company: KRSCompany;
            financials: FinancialData[];
        };

        if (!content || !company) {
            return NextResponse.json(
                { error: 'Missing content or company data' },
                { status: 400 }
            );
        }

        const docxBuffer = await generateDocx(content, company, financials || []);

        return new NextResponse(new Uint8Array(docxBuffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Memorandum_${company.nazwa?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}.docx"`,
            },
        });
    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'DOCX generation failed' },
            { status: 500 }
        );
    }
}
