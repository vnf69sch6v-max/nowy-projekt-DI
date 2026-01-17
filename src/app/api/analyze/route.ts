import { NextRequest, NextResponse } from 'next/server';
import { analyzeKRSDocument, analyzeFinancialDocument } from '@/lib/ai/document-analyzer';
import { generateMemorandumSections, sectionsToMemorandumContext } from '@/lib/ai/pipeline';
import { generateMemorandum } from '@/lib/documents/generator';
import { generateMockFinancials } from '@/lib/financials/mock';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const krsFile = formData.get('krs') as File | null;
        const financialFile = formData.get('financial') as File | null;

        if (!krsFile) {
            return NextResponse.json(
                { error: 'Wymagany jest odpis z KRS (PDF)' },
                { status: 400 }
            );
        }

        console.log('📄 Received files:');
        console.log(`  - KRS: ${krsFile.name} (${(krsFile.size / 1024).toFixed(1)} KB)`);
        if (financialFile) {
            console.log(`  - Financial: ${financialFile.name} (${(financialFile.size / 1024).toFixed(1)} KB)`);
        }

        // Analizuj odpis KRS
        console.log('🔍 Analyzing KRS document...');
        const krsBuffer = Buffer.from(await krsFile.arrayBuffer());
        const companyData = await analyzeKRSDocument(krsBuffer);
        console.log('✅ KRS data extracted:', companyData.nazwa);

        // Analizuj sprawozdanie finansowe
        let financials;
        if (financialFile) {
            console.log('📊 Analyzing financial document...');
            const financialBuffer = Buffer.from(await financialFile.arrayBuffer());
            financials = await analyzeFinancialDocument(financialBuffer, financialFile.type);
            console.log(`✅ Financial data extracted: ${financials.length} years`);
        } else {
            console.log('⚠️ No financial document, using mock data');
            financials = generateMockFinancials(companyData.nazwa || 'Spółka');
        }

        // Generuj sekcje AI
        console.log('🤖 Generating AI sections...');
        const sections = await generateMemorandumSections(companyData, financials);

        // Konwertuj na kontekst dokumentu
        const context = sectionsToMemorandumContext(companyData, financials, sections);

        // Generuj dokument Word
        console.log('📄 Generating Word document...');
        const documentBuffer = await generateMemorandum(context);

        const filename = `Memorandum_${(companyData.nazwa || 'Spolka').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${Date.now()}.docx`;

        console.log('✅ Document generated successfully!');

        return new NextResponse(new Uint8Array(documentBuffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas analizy dokumentów' },
            { status: 500 }
        );
    }
}
