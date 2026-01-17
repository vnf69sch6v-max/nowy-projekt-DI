/**
 * Generator DOCX dla memorandum
 */

import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, Packer } from 'docx';
import { KRSCompany, FinancialData } from '@/types';

/**
 * Sanitize text - remove markdown
 */
function sanitize(text: string): string {
    return text
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/```[^`]*```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/─+/g, '')
        .replace(/═+/g, '');
}

/**
 * Format PLN value
 */
function formatPLN(value: number | null | undefined): string {
    if (!value) return '-';
    return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

/**
 * Generate DOCX document
 */
export async function generateDocx(
    content: string,
    company: KRSCompany,
    financials: FinancialData[]
): Promise<Buffer> {
    const cleanContent = sanitize(content);
    const lines = cleanContent.split('\n').filter(l => l.trim());

    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
        new Paragraph({
            text: 'MEMORANDUM INFORMACYJNE',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
        })
    );

    children.push(
        new Paragraph({
            text: company.nazwa || 'Spółka',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
        })
    );

    children.push(
        new Paragraph({
            text: `Sporządzone dnia: ${new Date().toLocaleDateString('pl-PL')}`,
            alignment: AlignmentType.CENTER,
        })
    );

    children.push(new Paragraph({ text: '' }));

    // Content
    for (const line of lines) {
        const trimmed = line.trim();

        // Section headers (I., II., etc.)
        if (/^[IVX]+\.\s/.test(trimmed)) {
            children.push(
                new Paragraph({
                    text: trimmed.toUpperCase(),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                })
            );
            continue;
        }

        // Numbered items (1., 2., etc.)
        if (/^\d+\.\s/.test(trimmed)) {
            children.push(
                new Paragraph({
                    text: trimmed,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );
            continue;
        }

        // Regular text
        if (trimmed) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: trimmed, size: 22 })],
                    spacing: { after: 100 },
                })
            );
        }
    }

    // Financial table
    if (financials.length > 0) {
        children.push(new Paragraph({ text: '' }));
        children.push(
            new Paragraph({
                text: 'WYBRANE DANE FINANSOWE',
                heading: HeadingLevel.HEADING_1,
            })
        );

        const tableRows = [
            // Header
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: 'Pozycja', alignment: AlignmentType.CENTER })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                    }),
                    ...financials.map(f => new TableCell({
                        children: [new Paragraph({ text: f.rok.toString(), alignment: AlignmentType.CENTER })],
                        width: { size: 70 / financials.length, type: WidthType.PERCENTAGE },
                    })),
                ],
            }),
            // Data rows
            ...['Przychody netto', 'Zysk netto', 'Suma bilansowa', 'Kapitał własny', 'Zobowiązania'].map((label, idx) => {
                const getValue = (f: FinancialData) => {
                    switch (idx) {
                        case 0: return formatPLN(f.przychodyNetto);
                        case 1: return formatPLN(f.zyskNetto);
                        case 2: return formatPLN(f.sumaBilansowa);
                        case 3: return formatPLN(f.kapitalWlasny);
                        case 4: return formatPLN(f.zobowiazania);
                        default: return '-';
                    }
                };
                return new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: label })] }),
                        ...financials.map(f => new TableCell({
                            children: [new Paragraph({ text: getValue(f), alignment: AlignmentType.RIGHT })],
                        })),
                    ],
                });
            }),
        ];

        children.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            })
        );
    }

    // Signatures section
    children.push(new Paragraph({ text: '' }));
    children.push(
        new Paragraph({
            text: 'PODPISY OSÓB ODPOWIEDZIALNYCH',
            heading: HeadingLevel.HEADING_1,
        })
    );

    for (const person of company.reprezentacja || []) {
        children.push(new Paragraph({ text: '' }));
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${person.imie} ${person.nazwisko}`, bold: true }),
                ],
            })
        );
        children.push(
            new Paragraph({
                children: [new TextRun({ text: person.funkcja || '', italics: true })],
            })
        );
        children.push(
            new Paragraph({
                text: '_'.repeat(40),
                spacing: { before: 200 },
            })
        );
    }

    const doc = new Document({
        sections: [{ children }],
    });

    return Buffer.from(await Packer.toBuffer(doc));
}
