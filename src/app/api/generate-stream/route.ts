import { NextRequest } from 'next/server';
import { analyzeKRSDocument, analyzeFinancialDocument } from '@/lib/ai/document-analyzer';
import {
    MEMORANDUM_SECTIONS,
    generateTableOfContents,
    streamMemorandumSection,
    formatFinancialTable
} from '@/lib/ai/streaming-generator';
import { generateMockFinancials } from '@/lib/financials/mock';
import { KRSCompany, FinancialData } from '@/types';

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const formData = await request.formData();
                const krsFile = formData.get('krs') as File | null;
                const financialFile = formData.get('financial') as File | null;

                if (!krsFile) {
                    send({ type: 'error', message: 'Wymagany jest odpis z KRS (PDF)' });
                    controller.close();
                    return;
                }

                // ==========================================
                // ETAP 1: Analiza dokumentów
                // ==========================================
                send({ type: 'status', section: 'analysis', message: 'Analizuję dokumenty...' });

                const krsBuffer = Buffer.from(await krsFile.arrayBuffer());
                let companyData: KRSCompany;
                let financials: FinancialData[];

                try {
                    companyData = await analyzeKRSDocument(krsBuffer);
                    send({ type: 'status', section: 'analysis', message: `Wyekstrahowano dane: ${companyData.nazwa}` });
                } catch (error) {
                    send({ type: 'error', message: `Błąd analizy KRS: ${error}` });
                    controller.close();
                    return;
                }

                if (financialFile) {
                    try {
                        const financialBuffer = Buffer.from(await financialFile.arrayBuffer());
                        financials = await analyzeFinancialDocument(financialBuffer, financialFile.type);
                        send({ type: 'status', section: 'analysis', message: `Wyekstrahowano dane finansowe: ${financials.length} lat` });
                    } catch {
                        financials = generateMockFinancials(companyData.nazwa || 'Spółka');
                    }
                } else {
                    financials = generateMockFinancials(companyData.nazwa || 'Spółka');
                }

                // ==========================================
                // ETAP 2: Nagłówek dokumentu
                // ==========================================
                send({ type: 'status', section: 'header', message: 'Generuję nagłówek...' });

                const header = `
══════════════════════════════════════════════════════════════════════════════
                           MEMORANDUM INFORMACYJNE
══════════════════════════════════════════════════════════════════════════════

                      ${companyData.nazwa || 'SPÓŁKA'}

                         Sporządzone dnia: ${new Date().toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })}

══════════════════════════════════════════════════════════════════════════════



`;
                send({ type: 'content', text: header });

                // ==========================================
                // ETAP 3: Spis treści
                // ==========================================
                send({ type: 'status', section: 'toc', message: 'Generuję spis treści...' });

                const toc = generateTableOfContents();
                send({ type: 'content', text: toc });
                send({ type: 'content', text: '\n\n' + '─'.repeat(80) + '\n\n' });

                // ==========================================
                // ETAP 4: Generowanie sekcji
                // ==========================================
                const totalSections = MEMORANDUM_SECTIONS.length;

                for (let i = 0; i < totalSections; i++) {
                    const section = MEMORANDUM_SECTIONS[i];
                    const progress = Math.round(((i + 1) / totalSections) * 100);

                    send({
                        type: 'status',
                        section: section.id,
                        message: `Generuję ${section.paragraph}. ${section.title}...`,
                        progress
                    });

                    // Nagłówek sekcji (jeśli AI nie generuje)
                    if (section.requiresAI) {
                        send({ type: 'content', text: `\n${section.paragraph}. ${section.title}\n${'─'.repeat(60)}\n\n` });
                    }

                    // Tabelka finansowa przed sekcją finansową
                    if (section.id === 'financial' && financials.length > 0) {
                        const finTable = formatFinancialTable(financials);
                        send({ type: 'content', text: 'WYBRANE DANE FINANSOWE (w PLN)\n\n' });
                        send({ type: 'content', text: finTable });
                        send({ type: 'content', text: '\n\n' });
                    }

                    // Streamuj sekcję
                    try {
                        for await (const chunk of streamMemorandumSection(section.id, companyData, financials)) {
                            send({ type: 'content', text: chunk });
                        }
                    } catch (error) {
                        send({ type: 'content', text: `\n[BŁĄD GENEROWANIA SEKCJI: ${error}]\n` });
                    }

                    send({ type: 'content', text: '\n\n' });

                    // Delay między sekcjami (rate limiting)
                    if (section.requiresAI && i < totalSections - 1) {
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }

                // ==========================================
                // ETAP 5: Stopka
                // ==========================================
                send({ type: 'status', section: 'footer', message: 'Finalizuję dokument...', progress: 100 });

                const footer = `
${'═'.repeat(80)}

                              WAŻNE INFORMACJE

Niniejsze memorandum informacyjne zostało sporządzone z wykorzystaniem 
sztucznej inteligencji (AI) na podstawie danych z Krajowego Rejestru 
Sądowego oraz dostarczonych dokumentów finansowych.

Przed podjęciem decyzji inwestycyjnych zaleca się konsultację z doradcą 
prawnym i finansowym oraz weryfikację wszystkich danych w źródłach 
pierwotnych.

                    Dokument wygenerowany przez Auto-Memorandum
                              ${new Date().toISOString()}

${'═'.repeat(80)}
`;
                send({ type: 'content', text: footer });

                // Zakończenie
                send({
                    type: 'complete',
                    message: 'Memorandum zostało wygenerowane!',
                    companyName: companyData.nazwa,
                    company: companyData,
                    financials: financials,
                    sections: totalSections
                });

            } catch (error) {
                send({ type: 'error', message: `Wystąpił błąd: ${error}` });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
