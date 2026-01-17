import createReport from 'docx-templates';
import { MemorandumContext, FinancialData } from '@/types';
import path from 'path';
import fs from 'fs/promises';

/**
 * Generuje dokument Word z memorandum informacyjnym
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
        // Jeśli nie ma szablonu, użyj prostego formatu tekstowego
        console.warn('Template not found, generating simple document');
        return generateSimpleDocument(data);
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
 * Generuje prosty dokument bez szablonu (fallback)
 */
async function generateSimpleDocument(data: MemorandumContext): Promise<Buffer> {
    // Dynamiczny import docx dla fallbacku
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = docx;

    // Helper functions using imported classes
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
                            children: [new Paragraph({ text: value })],
                        }),
                    ],
                })
            ),
        });
    }

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
                // Header
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pozycja', bold: true })] })] }),
                        ...financials.map(f =>
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.rok.toString(), bold: true })] })] })
                        ),
                    ],
                }),
                // Rows
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
                    // Tytuł
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
                                size: 32,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                    }),

                    // Data generacji
                    new Paragraph({
                        text: `Wygenerowano: ${data.data_generacji}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 800 },
                    }),

                    // Sekcja 1: Dane rejestrowe
                    new Paragraph({
                        text: '1. DANE REJESTROWE',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    createInfoTable([
                        ['NIP', data.nip],
                        ['KRS', data.krs],
                        ['REGON', data.regon],
                        ['Forma prawna', data.forma_prawna],
                        ['Adres', data.adres_pelny],
                        ['Data powstania', data.data_powstania],
                    ]),

                    // Sekcja 2: Kapitał
                    new Paragraph({
                        text: '2. KAPITAŁ ZAKŁADOWY',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        text: `Kapitał zakładowy spółki wynosi ${data.kapital_zakladowy} ${data.waluta}.`,
                        spacing: { after: 200 },
                    }),

                    // Sekcja 3: Zarząd
                    new Paragraph({
                        text: '3. REPREZENTACJA (ZARZĄD)',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        text: `Sposób reprezentacji: ${data.sposob_reprezentacji}`,
                        spacing: { after: 200 },
                    }),

                    ...data.reprezentacja.map(osoba =>
                        new Paragraph({
                            text: `• ${osoba.imie} ${osoba.nazwisko} - ${osoba.funkcja}`,
                            spacing: { after: 100 },
                        })
                    ),

                    // Sekcja 4: Przedmiot działalności
                    new Paragraph({
                        text: '4. PRZEDMIOT DZIAŁALNOŚCI',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        text: `Przeważająca działalność: ${data.pkd_przewazajace}`,
                        spacing: { after: 200 },
                    }),

                    // Sekcja 5: Dane finansowe
                    new Paragraph({
                        text: '5. WYBRANE DANE FINANSOWE',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    createFinancialsTable(data.finanse),

                    // Sekcja 6: Czynniki ryzyka
                    new Paragraph({
                        text: '6. CZYNNIKI RYZYKA',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    ...data.ryzyka.flatMap(ryzyko => [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${ryzyko.tytul.toUpperCase()} `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: `[${ryzyko.kategoria}]`,
                                    italics: true,
                                }),
                            ],
                            spacing: { before: 200, after: 100 },
                        }),
                        new Paragraph({
                            text: ryzyko.opis,
                            spacing: { after: 200 },
                        }),
                    ]),

                    // Sekcja 7: Podsumowanie AI
                    new Paragraph({
                        text: '7. PODSUMOWANIE',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        text: data.podsumowanie_ai,
                        spacing: { after: 400 },
                    }),

                    // Stopka
                    new Paragraph({
                        text: '---',
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        text: 'Dokument wygenerowany automatycznie przez system Auto-Memorandum.',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 },
                    }),

                    new Paragraph({
                        text: 'Przed podjęciem decyzji inwestycyjnych zaleca się konsultację z doradcą prawnym i finansowym.',
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                ],
            },
        ],
    });

    return await Packer.toBuffer(doc);
}
