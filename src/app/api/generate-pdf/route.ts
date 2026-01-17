/**
 * API do generowania PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProfessionalPDF } from '@/lib/documents/pdfmake-generator';
import { KRSCompany, FinancialData } from '@/types';
import { OfferParameters } from '@/lib/ai/streaming-generator';
import { postProcessContent } from '@/lib/utils/post-processing';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, company, financials, offerParams } = body as {
            content: string;
            company: KRSCompany;
            financials: FinancialData[];
            offerParams?: OfferParameters;
        };

        if (!content || !company) {
            return NextResponse.json(
                { error: 'Missing content or company data' },
                { status: 400 }
            );
        }

        // Post-processing treści przed generowaniem PDF
        const fin = financials?.length > 0 ? financials[financials.length - 1] : null;
        const processedContent = postProcessContent(content, {
            companyName: company.nazwa,
            pkd: company.pkdPrzewazajace,
            hasExport: false, // TODO: wyciągnąć z danych
            hasLoans: (fin?.zobowiazania || 0) > 0,
        });

        const pdfBytes = await generateProfessionalPDF(processedContent, company, financials || [], offerParams);

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
