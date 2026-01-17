/**
 * Profesjonalny generator PDF z pdf-lib
 * - Lepsze formatowanie tabel
 * - Style nagłówków
 * - Numeracja stron
 * - Blok podpisów
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { KRSCompany, FinancialData } from '@/types';

// Stałe
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

/**
 * Zamienia polskie znaki i markdown
 */
function sanitize(text: string): string {
    const polishMap: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
        'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        '─': '-', '│': '|', '═': '=', '┼': '+',
        '┌': '+', '┐': '+', '└': '+', '┘': '+',
    };

    // Usuń markdown
    let result = text
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/```[^`]*```/g, '')
        .replace(/`([^`]+)`/g, '$1');

    // Zamień polskie
    return result.split('').map(c => polishMap[c] || c).join('')
        .split('').filter(c => c.charCodeAt(0) < 128 || c === ' ').join('');
}

/**
 * Formatuje PLN
 */
function formatPLN(value: number): string {
    if (!value) return '-';
    return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

/**
 * Główna funkcja
 */
export async function generateProfessionalPDF(
    content: string,
    company: KRSCompany,
    financials: FinancialData[]
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const cleanContent = sanitize(content);
    const companyName = sanitize(company.nazwa || 'Spolka');
    const today = new Date().toLocaleDateString('pl-PL');

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    let pageNum = 1;

    // ========================================
    // STRONA TYTUŁOWA
    // ========================================

    y -= 100;
    drawCenteredText(currentPage, 'MEMORANDUM INFORMACYJNE', y, fontBold, 24, rgb(0.1, 0.1, 0.15));

    y -= 50;
    drawCenteredText(currentPage, companyName, y, fontBold, 18, rgb(0.1, 0.1, 0.2));

    y -= 40;
    drawCenteredText(currentPage, `Sporzadzone dnia: ${today}`, y, font, 12, rgb(0.4, 0.4, 0.4));

    y -= 30;
    drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));

    // Tabela danych emitenta
    y -= 40;
    currentPage.drawText('DANE EMITENTA', { x: MARGIN, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.15) });

    y -= 25;
    const companyInfo = [
        ['Nazwa:', companyName],
        ['KRS:', company.krs || '-'],
        ['NIP:', company.nip || '-'],
        ['REGON:', company.regon || '-'],
        ['Forma prawna:', sanitize(company.formaOrganizacyjna || '-')],
        ['Siedziba:', sanitize(company.siedzibaAdres || '-')],
        ['Kapital:', formatPLN(company.kapitalZakladowy || 0)],
    ];

    for (const [label, value] of companyInfo) {
        currentPage.drawText(label, { x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        currentPage.drawText(value, { x: MARGIN + 100, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 16;
    }

    // Nowa strona
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    pageNum++;

    // ========================================
    // SPIS TREŚCI
    // ========================================

    currentPage.drawText('SPIS TRESCI', { x: MARGIN, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.15) });
    y -= 30;

    const sections = [
        'I. WSTEP',
        'II. CZYNNIKI RYZYKA',
        'III. OSOBY ODPOWIEDZIALNE',
        'IV. DANE O OFERCIE AKCJI',
        'V. DANE O EMITENCIE',
        'VI. SPRAWOZDANIA FINANSOWE',
        'VII. ZALACZNIKI',
    ];

    for (const section of sections) {
        currentPage.drawText(section, { x: MARGIN + 10, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 18;
    }

    y -= 20;
    drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));

    // ========================================
    // TREŚĆ DOKUMENTU
    // ========================================

    const lines = cleanContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            y -= 8;
            continue;
        }

        // Sprawdź czy potrzebna nowa strona
        if (y < MARGIN + 80) {
            addPageFooter(currentPage, pageNum, font);
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
            pageNum++;
        }

        // Nagłówek sekcji (I., II., itd.)
        if (/^[IVX]+\.\s/.test(trimmed)) {
            y -= 15;
            drawLine(currentPage, MARGIN, y + 5, CONTENT_WIDTH, 0.5, rgb(0.8, 0.8, 0.8));
            y -= 10;
            currentPage.drawText(trimmed, { x: MARGIN, y, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
            y -= 20;
            continue;
        }

        // Podsekcja (1., 2., itd.)
        if (/^\d+\.\s/.test(trimmed)) {
            y -= 5;
            currentPage.drawText(trimmed, { x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
            y -= 16;
            continue;
        }

        // Linie separacji
        if (/^[-=]+$/.test(trimmed)) {
            y -= 5;
            drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.3, rgb(0.8, 0.8, 0.8));
            y -= 10;
            continue;
        }

        // Zwykły tekst - word wrap
        const wrappedLines = wrapText(trimmed, font, 10, CONTENT_WIDTH);
        for (const wLine of wrappedLines) {
            if (y < MARGIN + 50) {
                addPageFooter(currentPage, pageNum, font);
                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
                pageNum++;
            }
            currentPage.drawText(wLine, { x: MARGIN, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
            y -= 14;
        }
    }

    // ========================================
    // TABELA FINANSOWA
    // ========================================

    if (financials.length > 0) {
        if (y < MARGIN + 200) {
            addPageFooter(currentPage, pageNum, font);
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
            pageNum++;
        }

        y -= 20;
        currentPage.drawText('WYBRANE DANE FINANSOWE (PLN)', { x: MARGIN, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
        y -= 25;

        // Nagłówek tabeli
        const colWidths = [150, ...financials.map(() => 100)];
        const years = financials.map(f => f.rok.toString());

        // Tło nagłówka
        currentPage.drawRectangle({
            x: MARGIN,
            y: y - 5,
            width: CONTENT_WIDTH,
            height: 20,
            color: rgb(0.92, 0.92, 0.92),
        });

        let xPos = MARGIN + 5;
        currentPage.drawText('Pozycja', { x: xPos, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        xPos += colWidths[0];
        for (let i = 0; i < years.length; i++) {
            currentPage.drawText(years[i], { x: xPos + 30, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
            xPos += colWidths[i + 1] || 100;
        }
        y -= 22;

        // Dane
        const rows = [
            ['Przychody netto', ...financials.map(f => formatPLN(f.przychodyNetto))],
            ['Zysk netto', ...financials.map(f => formatPLN(f.zyskNetto))],
            ['Suma bilansowa', ...financials.map(f => formatPLN(f.sumaBilansowa))],
            ['Kapital wlasny', ...financials.map(f => formatPLN(f.kapitalWlasny))],
            ['Zobowiazania', ...financials.map(f => formatPLN(f.zobowiazania))],
        ];

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            xPos = MARGIN + 5;

            // Alternujące tło
            if (r % 2 === 1) {
                currentPage.drawRectangle({
                    x: MARGIN,
                    y: y - 5,
                    width: CONTENT_WIDTH,
                    height: 18,
                    color: rgb(0.97, 0.97, 0.97),
                });
            }

            currentPage.drawText(row[0], { x: xPos, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
            xPos += colWidths[0];
            for (let i = 1; i < row.length; i++) {
                currentPage.drawText(row[i], { x: xPos, y, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
                xPos += colWidths[i] || 100;
            }
            y -= 18;
        }

        // Linia pod tabelą
        y -= 5;
        drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));
    }

    // ========================================
    // PODPISY
    // ========================================

    addPageFooter(currentPage, pageNum, font);
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    pageNum++;

    currentPage.drawText('PODPISY OSOB ODPOWIEDZIALNYCH', { x: MARGIN, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
    y -= 50;

    for (const person of company.reprezentacja || []) {
        currentPage.drawText(sanitize(`${person.imie} ${person.nazwisko}`), {
            x: MARGIN + 50, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2)
        });
        y -= 15;
        currentPage.drawText(sanitize(person.funkcja || ''), {
            x: MARGIN + 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4)
        });
        y -= 25;
        drawLine(currentPage, MARGIN + 50, y, 200, 0.5, rgb(0.5, 0.5, 0.5));
        y -= 10;
        currentPage.drawText('(podpis)', { x: MARGIN + 120, y, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
        y -= 40;
    }

    addPageFooter(currentPage, pageNum, font);

    return pdfDoc.save();
}

// ========================================
// FUNKCJE POMOCNICZE
// ========================================

function drawCenteredText(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color });
}

function drawLine(page: PDFPage, x: number, y: number, width: number, thickness: number, color: ReturnType<typeof rgb>) {
    page.drawLine({
        start: { x, y },
        end: { x: x + width, y },
        thickness,
        color,
    });
}

function addPageFooter(page: PDFPage, pageNum: number, font: PDFFont) {
    const text = `Strona ${pageNum}`;
    const width = font.widthOfTextAtSize(text, 9);
    page.drawText(text, {
        x: (PAGE_WIDTH - width) / 2,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5)
    });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
}
