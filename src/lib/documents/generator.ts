import createReport from 'docx-templates';
import { MemorandumContext, FinancialData } from '@/types';
import path from 'path';
import fs from 'fs/promises';

/**
 * Generuje dokument Word z memorandum informacyjnym
 * Używa sekcji wygenerowanych przez AI
 */
export async function generateMemorandum(
    data: MemorandumContext
): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'memorandum.docx');

    // Sprawdź czy szablon istnieje
    try {
        await fs.access(templatePath);
        const template = await fs.readFile(templatePath);
        const report = await createReport({
            template,
            data,
            cmdDelimiter: ['{', '}'],
        });
        return Buffer.from(report);
    } catch {
        // Jeśli nie ma szablonu, generuj dokument z sekcjami AI
        console.warn('Template not found, generating document with AI sections');
        return generateAIPoweredDocument(data);
    }
}

// Format helpers
function formatLabel(key: string): string {
    const labels: Record<string, string> = {
        przychodyNetto: 'Przychody netto',
        zyskNetto: 'Zysk netto',
        sumaBilansowa: 'Suma bilansowa',
        kapitalWlasny: 'Kapitał własny',
    };
    return labels[key] || key;
}

function formatAmount(amount: number): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
}

/**
 * Generuje dokument z sekcjami wygenerowanymi przez AI
 */
async function generateAIPoweredDocument(data: MemorandumContext): Promise<Buffer> {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = docx;

    // Helper: konwertuje tekst AI na paragrafy
    function textToParagraphs(text: string | undefined, spacing = 200): InstanceType<typeof Paragraph>[] {
        if (!text) return [];
        return text.split('\n\n').filter(p => p.trim()).map(paragraph =>
            new Paragraph({
                text: paragraph.trim(),
                spacing: { after: spacing },
            })
        );
    }

    // Helper: tworzy tabelę informacyjną
    function createInfoTable(rows: [string, string][]) {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: rows.map(([label, value]) =>
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 30, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({
                                children: [new TextRun({ text: label, bold: true })]
                            })],
                        }),
                        new TableCell({
                            width: { size: 70, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ text: value || 'brak danych' })],
                        }),
                    ],
                })
            ),
        });
    }

    // Helper: tworzy tabelę finansową
    function createFinancialsTable(financials: FinancialData[]) {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pozycja', bold: true })] })] }),
                        ...financials.map(f =>
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.rok.toString(), bold: true })] })] })
                        ),
                    ],
                }),
                ...(['przychodyNetto', 'zyskNetto', 'sumaBilansowa', 'kapitalWlasny'] as const).map(key =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: formatLabel(key) })] }),
                            ...financials.map(f =>
                                new TableCell({ children: [new Paragraph({ text: formatAmount(f[key]) })] })
                            ),
                        ],
                    })
                ),
            ],
        });
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Calibri',
                        size: 24,
                    },
                },
            },
        },
        sections: [
            {
                properties: {},
                children: [
                    // ========== STRONA TYTUŁOWA ==========
                    new Paragraph({
                        text: 'MEMORANDUM INFORMACYJNE',
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: data.nazwa_spolki,
                                bold: true,
                                size: 36,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                    }),

                    new Paragraph({
                        text: `Wygenerowano: ${data.data_generacji}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),

                    new Paragraph({
                        text: 'Dokument sporządzony z wykorzystaniem sztucznej inteligencji',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 800 },
                    }),

                    // ========== 1. WSTĘP (AI) ==========
                    new Paragraph({
                        text: '1. WSTĘP',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.sekcja_wstep),

                    // ========== 2. DANE REJESTROWE ==========
                    new Paragraph({
                        text: '2. DANE REJESTROWE EMITENTA',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    createInfoTable([
                        ['Pełna nazwa', data.nazwa_spolki],
                        ['NIP', data.nip],
                        ['KRS', data.krs],
                        ['REGON', data.regon],
                        ['Forma prawna', data.forma_prawna],
                        ['Adres siedziby', data.adres_pelny],
                        ['Data powstania', data.data_powstania],
                    ]),

                    // ========== 3. KAPITAŁ I STRUKTURA (AI) ==========
                    new Paragraph({
                        text: '3. KAPITAŁ ZAKŁADOWY I STRUKTURA WŁASNOŚCIOWA',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.sekcja_kapital),

                    new Paragraph({
                        text: `Kapitał zakładowy spółki wynosi ${data.kapital_zakladowy} ${data.waluta}.`,
                        spacing: { before: 200, after: 200 },
                    }),

                    // ========== 4. ORGANY SPÓŁKI (AI) ==========
                    new Paragraph({
                        text: '4. ORGANY SPÓŁKI I SPOSÓB REPREZENTACJI',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.sekcja_zarzad),

                    new Paragraph({
                        text: `Sposób reprezentacji: ${data.sposob_reprezentacji}`,
                        spacing: { before: 200, after: 200 },
                    }),

                    new Paragraph({
                        text: 'Skład zarządu:',
                        spacing: { before: 200, after: 100 },
                        children: [new TextRun({ text: 'Skład zarządu:', bold: true })],
                    }),

                    ...data.reprezentacja.map(osoba =>
                        new Paragraph({
                            text: `• ${osoba.imie} ${osoba.nazwisko} - ${osoba.funkcja}`,
                            spacing: { after: 100 },
                        })
                    ),

                    // ========== 5. PRZEDMIOT DZIAŁALNOŚCI (AI) ==========
                    new Paragraph({
                        text: '5. PRZEDMIOT I ZAKRES DZIAŁALNOŚCI',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.sekcja_dzialalnosc),

                    new Paragraph({
                        text: `Przeważająca działalność: ${data.pkd_przewazajace}`,
                        spacing: { before: 200, after: 200 },
                    }),

                    // ========== 6. SYTUACJA FINANSOWA (AI) ==========
                    new Paragraph({
                        text: '6. SYTUACJA FINANSOWA I WYNIKI DZIAŁALNOŚCI',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.sekcja_finanse),

                    new Paragraph({
                        text: 'Wybrane dane finansowe:',
                        spacing: { before: 300, after: 200 },
                        children: [new TextRun({ text: 'Wybrane dane finansowe:', bold: true })],
                    }),

                    createFinancialsTable(data.finanse),

                    // ========== 7. CZYNNIKI RYZYKA ==========
                    new Paragraph({
                        text: '7. CZYNNIKI RYZYKA',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    new Paragraph({
                        text: 'Inwestowanie w papiery wartościowe wiąże się z określonymi ryzykami. Poniżej przedstawiono kluczowe czynniki ryzyka zidentyfikowane dla Emitenta.',
                        spacing: { after: 300 },
                    }),

                    ...data.ryzyka.flatMap((ryzyko, index) => [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${index + 1}. ${ryzyko.tytul.toUpperCase()}`,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: ` [${ryzyko.kategoria.toUpperCase()}]`,
                                    italics: true,
                                    color: ryzyko.istotnosc === 'wysoka' ? 'CC0000' : '666666',
                                }),
                                ryzyko.istotnosc === 'wysoka' ? new TextRun({
                                    text: ' ⚠️',
                                }) : new TextRun({ text: '' }),
                            ],
                            spacing: { before: 300, after: 100 },
                        }),
                        new Paragraph({
                            text: ryzyko.opis,
                            spacing: { after: 200 },
                        }),
                    ]),

                    // ========== 8. PODSUMOWANIE (AI) ==========
                    new Paragraph({
                        text: '8. PODSUMOWANIE',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }),

                    ...textToParagraphs(data.podsumowanie_ai),

                    // ========== STOPKA ==========
                    new Paragraph({
                        text: '─'.repeat(50),
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600, after: 300 },
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'WAŻNE INFORMACJE',
                                bold: true,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),

                    new Paragraph({
                        text: 'Niniejsze memorandum informacyjne zostało sporządzone z wykorzystaniem sztucznej inteligencji (AI) na podstawie publicznie dostępnych danych z Krajowego Rejestru Sądowego oraz symulowanych danych finansowych.',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 },
                    }),

                    new Paragraph({
                        text: 'Dokument wygenerowany automatycznie przez system Auto-Memorandum.',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 },
                    }),

                    new Paragraph({
                        text: 'Przed podjęciem decyzji inwestycyjnych zaleca się konsultację z doradcą prawnym i finansowym oraz weryfikację wszystkich danych w źródłach pierwotnych.',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                ],
            },
        ],
    });

    return await Packer.toBuffer(doc);
}
