import { NextRequest, NextResponse } from 'next/server';
import { analyzeKRSDocument, analyzeFinancialDocument } from '@/lib/ai/document-analyzer';
import { generateFullMemorandum } from '@/lib/ai/memorandum-generator';
import { generateProfessionalMemorandum } from '@/lib/documents/word-generator';
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

        console.log('📄 Processing documents...');
        console.log(`  - KRS: ${krsFile.name} (${(krsFile.size / 1024).toFixed(1)} KB)`);

        // 1. Analizuj KRS przez Claude
        console.log('🔍 Step 1: Analyzing KRS with Claude...');
        const krsBuffer = Buffer.from(await krsFile.arrayBuffer());
        const companyData = await analyzeKRSDocument(krsBuffer);
        console.log('✅ KRS extracted:', companyData.nazwa);

        // 2. Analizuj finanse (jeśli dostępne)
        let financials;
        if (financialFile) {
            console.log(`  - Financial: ${financialFile.name}`);
            console.log('📊 Step 2: Analyzing financial document...');
            const financialBuffer = Buffer.from(await financialFile.arrayBuffer());
            financials = await analyzeFinancialDocument(financialBuffer, financialFile.type);
            console.log(`✅ Financials extracted: ${financials.length} years`);
        } else {
            console.log('⚠️ No financial document, using mock data');
            financials = generateMockFinancials(companyData.nazwa || 'Spółka');
        }

        // 3. Generuj sekcje memorandum przez Claude (sekcja po sekcji)
        console.log('📝 Step 3: Generating memorandum sections with Claude...');
        const memorandum = await generateFullMemorandum(companyData, financials);
        console.log(`✅ Generated ${memorandum.sections.length} sections`);

        // 4. Generuj dokument Word
        console.log('📄 Step 4: Generating Word document...');
        const documentBuffer = await generateProfessionalMemorandum(
            companyData,
            financials,
            memorandum.sections
        );

        const filename = `Memorandum_${(companyData.nazwa || 'Spolka')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .slice(0, 30)}_${Date.now()}.docx`;

        console.log('✅ Document generated successfully!');
        console.log(`   Estimated tokens used: ${memorandum.tokensUsed}`);

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
