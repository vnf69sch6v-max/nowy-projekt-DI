/**
 * Profesjonalny generator dokumentów Word
 * Zgodny z rozporządzeniem Dz.U. 2020.1053
 */

import {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    HeadingLevel,
    BorderStyle,
    Packer,
} from 'docx';
import { KRSCompany, FinancialData } from '@/types';
import { MemorandumSection } from '@/lib/ai/memorandum-generator';

// ============================================
// STYLE
// ============================================

const FONT = 'Times New Roman';
const FONT_SIZE = 24; // 12pt in half-points

function createHeading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
    return new Paragraph({
        text,
        heading: level,
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.LEFT,
    });
}

function createParagraph(text: string): Paragraph {
    return new Paragraph({
        children: [
            new TextRun({
                text,
                font: FONT,
                size: FONT_SIZE,
            }),
        ],
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
    });
}

function createTableCell(text: string, bold: boolean = false): TableCell {
    return new TableCell({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text,
                        font: FONT,
                        size: FONT_SIZE - 2,
                        bold,
                    }),
                ],
            }),
        ],
        margins: { top: 50, bottom: 50, left: 100, right: 100 },
    });
}

// ============================================
// TABELE
// ============================================

function createCompanyDataTable(company: KRSCompany): Table {
    const rows = [
        ['Firma (nazwa)', company.nazwa || '-'],
        ['Forma prawna', company.formaOrganizacyjna || '-'],
        ['Siedziba i adres', company.siedzibaAdres || '-'],
        ['Numer KRS', company.krs || '-'],
        ['NIP', company.nip || '-'],
        ['REGON', company.regon || '-'],
        ['Data powstania', company.dataPowstania || '-'],
        ['Kapitał zakładowy', `${(company.kapitalZakladowy || 0).toLocaleString('pl-PL')} PLN`],
    ];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(([label, value]) =>
            new TableRow({
                children: [
                    createTableCell(label, true),
                    createTableCell(value),
                ],
            })
        ),
    });
}

function createFinancialTable(financials: FinancialData[]): Table {
    const headerRow = new TableRow({
        children: [
            createTableCell('Pozycja', true),
            ...financials.map(f => createTableCell(`${f.rok}`, true)),
        ],
    });

    const formatNumber = (n: number) => n ? n.toLocaleString('pl-PL') : '-';

    const dataRows = [
        ['Przychody netto', ...financials.map(f => formatNumber(f.przychodyNetto))],
        ['Zysk netto', ...financials.map(f => formatNumber(f.zyskNetto))],
        ['Suma bilansowa', ...financials.map(f => formatNumber(f.sumaBilansowa))],
        ['Kapitał własny', ...financials.map(f => formatNumber(f.kapitalWlasny))],
        ['Zobowiązania', ...financials.map(f => formatNumber(f.zobowiazania))],
    ];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            headerRow,
            ...dataRows.map(row =>
                new TableRow({
                    children: row.map((cell, i) => createTableCell(cell, i === 0)),
                })
            ),
        ],
    });
}

// ============================================
// GŁÓWNY GENERATOR
// ============================================

export async function generateProfessionalMemorandum(
    company: KRSCompany,
    financials: FinancialData[],
    sections: MemorandumSection[]
): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [];

    // Tytuł
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: 'MEMORANDUM INFORMACYJNE',
                    font: FONT,
                    size: 36,
                    bold: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        })
    );

    // Nazwa spółki
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: company.nazwa || 'SPÓŁKA',
                    font: FONT,
                    size: 32,
                    bold: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Data
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Wygenerowano: ${new Date().toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}`,
                    font: FONT,
                    size: FONT_SIZE,
                    italics: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
        })
    );

    // Separator
    children.push(
        new Paragraph({
            children: [new TextRun({ text: '─'.repeat(60), font: FONT, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Sekcje
    let sectionNumber = 1;
    for (const section of sections) {
        // Nagłówek sekcji
        children.push(createHeading(`${sectionNumber}. ${section.title} (${section.paragraph})`));

        // Specjalne tabele dla niektórych sekcji
        if (section.id === 'issuer') {
            children.push(createParagraph('Dane rejestrowe emitenta:'));
            children.push(createCompanyDataTable(company));
            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }

        if (section.id === 'financial' && financials.length > 0) {
            children.push(createParagraph('Wybrane dane finansowe (w PLN):'));
            children.push(createFinancialTable(financials));
            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }

        // Treść sekcji (podziel na akapity)
        const paragraphs = section.content.split('\n\n').filter(p => p.trim());
        for (const para of paragraphs) {
            if (para.trim()) {
                children.push(createParagraph(para.trim()));
            }
        }

        sectionNumber++;
    }

    // Stopka
    children.push(
        new Paragraph({
            children: [new TextRun({ text: '─'.repeat(60), font: FONT, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 },
        })
    );

    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: 'WAŻNE INFORMACJE',
                    font: FONT,
                    size: FONT_SIZE,
                    bold: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        })
    );

    children.push(
        createParagraph(
            'Niniejsze memorandum informacyjne zostało sporządzone z wykorzystaniem sztucznej inteligencji (AI) ' +
            'na podstawie danych z Krajowego Rejestru Sądowego oraz dostarczonych dokumentów finansowych. ' +
            'Przed podjęciem decyzji inwestycyjnych zaleca się konsultację z doradcą prawnym i finansowym ' +
            'oraz weryfikację wszystkich danych w źródłach pierwotnych.'
        )
    );

    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Dokument wygenerowany przez system Auto-Memorandum.',
                    font: FONT,
                    size: FONT_SIZE - 4,
                    italics: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
        })
    );

    // Utwórz dokument
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children,
            },
        ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
}
