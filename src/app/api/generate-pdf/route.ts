/**
 * API do generowania PDF z pdfmake
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProfessionalPDF } from '@/lib/documents/pdfmake-generator';
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

        const pdfBytes = await generateProfessionalPDF(content, company, financials || []);

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Memorandum_${company.nazwa?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}.pdf"`,
            },
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'PDF generation failed' },
            { status: 500 }
        );
    }
}
