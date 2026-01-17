/**
 * Profesjonalny generator PDF z pdf-lib
 * - Lepsze formatowanie tabel
 * - Style nagłówków
 * - Numeracja stron
 * - Blok podpisów
 * - Parametry oferty
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { KRSCompany, FinancialData } from '@/types';
import { OfferParameters } from '@/lib/ai/streaming-generator';
import { calculateAllRatios, formatPercent, generateFinancialComment } from '@/lib/utils/financial-ratios';

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

    let result = text
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/```[^`]*```/g, '')
        .replace(/`([^`]+)`/g, '$1');

    return result.split('').map(c => polishMap[c] || c).join('')
        .split('').filter(c => c.charCodeAt(0) < 128 || c === ' ').join('');
}

/**
 * Usuwa podwójny spis treści i powtórzenia z treści AI
 */
function removeDuplicateTOC(text: string): string {
    let result = text;

    // Wzorce spisu treści które AI może wygenerować
    const tocPatterns = [
        /Spis\s+tres[c]?i\s*\n[\s\S]*?(?=\n[IVX]+\.\s|MEMORANDUM|$)/gi,
        /^Spis\s+tres[c]?i[\s\S]*?(?=\n\n\n|\nI\.\s)/gim,
        /Table\s+of\s+Contents[\s\S]*?(?=\n\n)/gi,
    ];

    for (const pattern of tocPatterns) {
        result = result.replace(pattern, '');
    }

    // Usuń powtórzony sposób reprezentacji
    result = result.replace(
        /(DO SKLADANIA OSWIADCZEN W IMIENIU SPOLKI[\s\S]{30,300}?PROKURENTEM[\s\S]{0,20}?)(\s*(DO SKLADANIA OSWIADCZEN|Do skladania oswiadczen)[\s\S]{30,300}?(PROKURENTEM|prokurentem)[\s\S]{0,20}?)+/gi,
        '$1'
    );

    // Usuń kolejne identyczne lub bardzo podobne linie
    const lines = result.split('\n');
    const filteredLines: string[] = [];
    let prevLine = '';

    for (const line of lines) {
        const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ');
        const prevNormalized = prevLine.trim().toLowerCase().replace(/\s+/g, ' ');

        // Pomiń jeśli ta sama linia lub bardzo podobna (>90% dopasowania)
        if (normalized === prevNormalized && normalized.length > 20) {
            continue;
        }

        // Pomiń jeśli to podwójny nagłówek sekcji
        if (/^[ivx]+\.\s/i.test(normalized) && /^[ivx]+\.\s/i.test(prevNormalized)) {
            const currSection = normalized.match(/^([ivx]+)\./i)?.[1];
            const prevSection = prevNormalized.match(/^([ivx]+)\./i)?.[1];
            if (currSection === prevSection) {
                continue;
            }
        }

        filteredLines.push(line);
        prevLine = line;
    }

    result = filteredLines.join('\n');

    // Usuń nadmiarowe puste linie
    result = result.replace(/\n{4,}/g, '\n\n\n');

    return result.trim();
}

/**
 * Rysuje wyjustowany tekst (justify) - równomiernie rozkłada słowa
 */
function drawJustifiedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    font: PDFFont,
    color: { red: number; green: number; blue: number },
    isLastLine: boolean = false
): void {
    const words = text.split(' ').filter(w => w.length > 0);

    // Ostatnia linia akapitu - wyrównaj do lewej
    if (isLastLine || words.length <= 2) {
        page.drawText(text, { x, y, size: fontSize, font, color: rgb(color.red, color.green, color.blue) });
        return;
    }

    // Oblicz szerokość każdego słowa
    const wordWidths = words.map(word => font.widthOfTextAtSize(word, fontSize));
    const totalWordWidth = wordWidths.reduce((a, b) => a + b, 0);

    // Oblicz dodatkową przestrzeń między słowami
    const totalSpaceWidth = width - totalWordWidth;
    const spaceCount = words.length - 1;
    const spaceWidth = spaceCount > 0 ? totalSpaceWidth / spaceCount : 0;

    // Rysuj każde słowo z obliczonym odstępem
    let currentX = x;
    for (let i = 0; i < words.length; i++) {
        page.drawText(words[i], { x: currentX, y, size: fontSize, font, color: rgb(color.red, color.green, color.blue) });
        currentX += wordWidths[i] + spaceWidth;
    }
}

/**
 * Formatuje PLN
 */
function formatPLN(value: number | null | undefined): string {
    if (!value) return '-';
    return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

/**
 * Formatuje liczbę
 */
function formatNumber(value: number | null | undefined): string {
    if (!value) return '-';
    return value.toLocaleString('pl-PL');
}

/**
 * Główna funkcja
 */
export async function generateProfessionalPDF(
    content: string,
    company: KRSCompany,
    financials: FinancialData[],
    offerParams?: OfferParameters | null
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const cleanContent = removeDuplicateTOC(sanitize(content));
    const companyName = sanitize(company.nazwa || 'Spolka');
    const today = new Date().toLocaleDateString('pl-PL');

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    let pageNum = 1;

    // ========================================
    // STRONA TYTUŁOWA
    // ========================================

    y -= 80;
    drawCenteredText(currentPage, 'MEMORANDUM INFORMACYJNE', y, fontBold, 24, rgb(0.1, 0.1, 0.15));

    y -= 40;
    drawCenteredText(currentPage, companyName, y, fontBold, 16, rgb(0.1, 0.1, 0.2));

    y -= 30;
    drawCenteredText(currentPage, `Sporzadzone dnia: ${today}`, y, font, 11, rgb(0.4, 0.4, 0.4));

    y -= 20;
    drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));

    // Tabela danych emitenta
    y -= 30;
    currentPage.drawText('DANE EMITENTA', { x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.15) });

    y -= 20;
    const companyInfo = [
        ['Nazwa:', companyName],
        ['KRS:', company.krs || '-'],
        ['NIP:', company.nip || '-'],
        ['REGON:', company.regon || '-'],
        ['Forma prawna:', sanitize(company.formaOrganizacyjna || '-')],
        ['Siedziba:', sanitize(company.siedzibaAdres || '-')],
        ['Kapital:', formatPLN(company.kapitalZakladowy)],
    ];

    for (const [label, value] of companyInfo) {
        currentPage.drawText(label, { x: MARGIN, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        currentPage.drawText(value.substring(0, 60), { x: MARGIN + 90, y, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 14;
    }

    // ========================================
    // PARAMETRY OFERTY (jeśli podane)
    // ========================================

    if (offerParams && hasOfferData(offerParams)) {
        y -= 20;
        drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.8, 0.8, 0.8));

        y -= 25;
        currentPage.drawText('PARAMETRY OFERTY', { x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.15) });

        y -= 20;

        // Tło dla tabeli parametrów
        const tableHeight = countOfferRows(offerParams) * 14 + 10;
        currentPage.drawRectangle({
            x: MARGIN,
            y: y - tableHeight + 10,
            width: CONTENT_WIDTH,
            height: tableHeight,
            color: rgb(0.97, 0.97, 0.99),
            borderColor: rgb(0.85, 0.85, 0.9),
            borderWidth: 0.5,
        });

        y -= 5;

        const offerInfo: [string, string][] = [];

        if (offerParams.seriaAkcji) {
            offerInfo.push(['Seria akcji:', offerParams.seriaAkcji]);
        }
        if (offerParams.liczbaAkcji) {
            offerInfo.push(['Liczba akcji:', formatNumber(offerParams.liczbaAkcji)]);
        }
        if (offerParams.wartoscNominalna) {
            offerInfo.push(['Wartosc nominalna:', formatPLN(offerParams.wartoscNominalna)]);
        }
        if (offerParams.cenaEmisyjna) {
            offerInfo.push(['Cena emisyjna:', formatPLN(offerParams.cenaEmisyjna)]);
        }
        if (offerParams.celeEmisji) {
            offerInfo.push(['Cele emisji:', sanitize(offerParams.celeEmisji).substring(0, 50) + (offerParams.celeEmisji.length > 50 ? '...' : '')]);
        }
        if (offerParams.terminSubskrypcji) {
            offerInfo.push(['Termin subskrypcji:', offerParams.terminSubskrypcji]);
        }
        if (offerParams.miejsceZapisow) {
            offerInfo.push(['Miejsce zapisow:', sanitize(offerParams.miejsceZapisow).substring(0, 40)]);
        }
        if (offerParams.minimalnaLiczbaAkcji) {
            offerInfo.push(['Min. liczba akcji:', formatNumber(offerParams.minimalnaLiczbaAkcji)]);
        }
        if (offerParams.firmaInwestycyjna) {
            offerInfo.push(['Firma inwestycyjna:', sanitize(offerParams.firmaInwestycyjna).substring(0, 40)]);
        }
        if (offerParams.dataWaznosci) {
            offerInfo.push(['Data waznosci:', offerParams.dataWaznosci]);
        }

        // Wartość emisji (jeśli można obliczyć)
        if (offerParams.liczbaAkcji && offerParams.cenaEmisyjna) {
            const wartoscEmisji = offerParams.liczbaAkcji * offerParams.cenaEmisyjna;
            offerInfo.push(['WARTOSC EMISJI:', formatPLN(wartoscEmisji)]);
        }

        for (const [label, value] of offerInfo) {
            const isTotal = label.startsWith('WARTOSC');
            currentPage.drawText(label, {
                x: MARGIN + 5, y, size: 9,
                font: isTotal ? fontBold : font,
                color: isTotal ? rgb(0.1, 0.3, 0.1) : rgb(0.3, 0.3, 0.3)
            });
            currentPage.drawText(value, {
                x: MARGIN + 120, y, size: 9,
                font: isTotal ? fontBold : font,
                color: isTotal ? rgb(0.1, 0.3, 0.1) : rgb(0.1, 0.1, 0.1)
            });
            y -= 14;
        }
    }

    // Nowa strona
    addPageFooter(currentPage, pageNum, font);
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    pageNum++;

    // ========================================
    // SPIS TREŚCI
    // ========================================

    currentPage.drawText('SPIS TRESCI', { x: MARGIN, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.15) });
    y -= 30;

    // TOC bez numerów stron (2-pass rendering wymagany dla dokładnych numerów)
    const tocSections = [
        'I. WSTEP',
        'II. CZYNNIKI RYZYKA',
        'III. OSOBY ODPOWIEDZIALNE',
        'IV. DANE O OFERCIE AKCJI',
        'V. DANE O EMITENCIE',
        'VI. SPRAWOZDANIA FINANSOWE',
        'VII. ZALACZNIKI',
    ];

    for (const sectionTitle of tocSections) {
        // Tytuł sekcji
        currentPage.drawText(sectionTitle, { x: MARGIN + 10, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });

        // Leader dots (kropki prowadzące) - bez numerów stron
        const titleWidth = font.widthOfTextAtSize(sectionTitle, 11);
        const dotsWidth = CONTENT_WIDTH - titleWidth - 30;
        const dotCount = Math.floor(dotsWidth / 4);
        const dots = '.'.repeat(Math.max(0, dotCount));

        currentPage.drawText(dots, {
            x: MARGIN + 10 + titleWidth + 10,
            y,
            size: 11,
            font,
            color: rgb(0.7, 0.7, 0.7)
        });

        y -= 20;
    }

    y -= 15;
    drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));
    y -= 25;

    // ========================================
    // DISCLAIMER O RYZYKU INWESTYCYJNYM
    // ========================================

    // Tło disclaimer
    currentPage.drawRectangle({
        x: MARGIN,
        y: y - 70,
        width: CONTENT_WIDTH,
        height: 70,
        color: rgb(1, 0.97, 0.92),
        borderColor: rgb(0.9, 0.6, 0.2),
        borderWidth: 1,
    });

    // Ikona ostrzeżenia
    currentPage.drawText('[!] OSTRZEZENIE O RYZYKU', {
        x: MARGIN + 10,
        y: y - 18,
        size: 10,
        font: fontBold,
        color: rgb(0.8, 0.4, 0.1)
    });

    // Tekst ostrzeżenia
    const disclaimerText = 'Inwestowanie w akcje wiaze sie z ryzykiem utraty czesci lub calosci zainwestowanych srodkow. Przed podjciem decyzji inwestycyjnej nalezy zapoznac sie z trescia memorandum informacyjnego, w tym z czynnikami ryzyka.';
    const disclaimerLines = wrapText(disclaimerText, font, 9, CONTENT_WIDTH - 20);
    let disclaimerY = y - 35;
    for (const line of disclaimerLines) {
        currentPage.drawText(line, {
            x: MARGIN + 10,
            y: disclaimerY,
            size: 9,
            font,
            color: rgb(0.3, 0.2, 0.1)
        });
        disclaimerY -= 12;
    }

    y -= 90;
    drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));

    // ========================================
    // TREŚĆ DOKUMENTU - ulepszone formatowanie
    // ========================================

    const lines = cleanContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            y -= 6;
            continue;
        }

        if (y < MARGIN + 80) {
            addPageFooter(currentPage, pageNum, font);
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
            pageNum++;
        }

        // Główny nagłówek sekcji (I., II., III., etc.)
        if (/^[IVX]+\.\s/.test(trimmed)) {
            y -= 25;

            // Określ kolor i symbol na podstawie sekcji
            let sectionColor = rgb(0.95, 0.95, 0.97);
            let sectionIcon = '';

            if (trimmed.includes('RYZY') || trimmed.includes('RISK')) {
                sectionColor = rgb(1, 0.95, 0.93); // Jasnoróżowy dla ryzyk
                sectionIcon = '[!] ';
            } else if (trimmed.includes('FINANS') || trimmed.includes('SPRAWOZD')) {
                sectionColor = rgb(0.93, 0.97, 0.95); // Jasnozielony dla finansów
                sectionIcon = '[$] ';
            } else if (trimmed.includes('OFERT') || trimmed.includes('AKCJI')) {
                sectionColor = rgb(0.93, 0.95, 1); // Jasnoniebieski dla oferty
                sectionIcon = '[>] ';
            } else if (trimmed.includes('EMITENT')) {
                sectionColor = rgb(0.97, 0.95, 0.93); // Jasnożółty dla emitenta
                sectionIcon = '[i] ';
            }

            // Linia dekoracyjna przed sekcją
            drawLine(currentPage, MARGIN, y + 15, CONTENT_WIDTH, 1.5, rgb(0.85, 0.85, 0.88));

            // Tło dla nagłówka sekcji
            currentPage.drawRectangle({
                x: MARGIN - 5,
                y: y - 5,
                width: CONTENT_WIDTH + 10,
                height: 24,
                color: sectionColor,
            });

            // Tekst nagłówka z ikoną
            currentPage.drawText(sectionIcon + trimmed.toUpperCase(), {
                x: MARGIN, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.2)
            });
            y -= 30; // Większy odstęp po nagłówku sekcji
            continue;
        }

        // Podtytuł sekcji (np. "Emitent - podstawowe dane")
        if (/^[A-Z][a-zA-Z\s\-]+$/.test(trimmed) && trimmed.length < 50) {
            y -= 15;
            currentPage.drawText(trimmed, {
                x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.25)
            });
            y -= 18;
            continue;
        }

        // Paragraf (§11., §12., etc.) - specjalne formatowanie
        if (/^§?\d{2,}\.\s/.test(trimmed)) {
            y -= 18; // Większy odstęp przed paragrafem

            // Lekkie tło dla paragrafu
            currentPage.drawRectangle({
                x: MARGIN - 3,
                y: y - 3,
                width: CONTENT_WIDTH + 6,
                height: 18,
                color: rgb(0.98, 0.98, 1),
            });

            // Numer paragrafu (§11)
            const paragraphMatch = trimmed.match(/^(§?\d+\.)\s*(.*)/);
            if (paragraphMatch) {
                currentPage.drawText(paragraphMatch[1], {
                    x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.2, 0.3, 0.5)
                });
                currentPage.drawText(paragraphMatch[2], {
                    x: MARGIN + 35, y, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15)
                });
            } else {
                currentPage.drawText(trimmed, {
                    x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15)
                });
            }
            y -= 16;
            continue;
        }

        // Numerowany punkt główny (1., 2., 3., etc.)
        if (/^\d+\.\s/.test(trimmed)) {
            y -= 8;

            currentPage.drawText(trimmed.substring(0, 3), {
                x: MARGIN + 15, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.4)
            });

            // Tekst po numerze z wcięciem
            const textAfterNum = trimmed.substring(3);
            const wrappedMainPoint = wrapText(textAfterNum, font, 10, CONTENT_WIDTH - 40);
            for (let i = 0; i < wrappedMainPoint.length; i++) {
                if (y < MARGIN + 50) {
                    addPageFooter(currentPage, pageNum, font);
                    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    y = PAGE_HEIGHT - MARGIN;
                    pageNum++;
                }
                currentPage.drawText(wrappedMainPoint[i], {
                    x: MARGIN + 35, y, size: 10, font: i === 0 ? fontBold : font, color: rgb(0.15, 0.15, 0.15)
                });
                y -= 14;
            }
            y -= 2;
            continue;
        }

        // Zagnieżdżony punkt (1.1., 1.2., etc.) lub podpunkt z cyfrą
        if (/^\d+\.\d+\.?\s/.test(trimmed) || /^[a-z]\)\s/.test(trimmed)) {
            const wrappedSub = wrapText(trimmed, font, 9, CONTENT_WIDTH - 40);
            for (let i = 0; i < wrappedSub.length; i++) {
                if (y < MARGIN + 50) {
                    addPageFooter(currentPage, pageNum, font);
                    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    y = PAGE_HEIGHT - MARGIN;
                    pageNum++;
                }
                currentPage.drawText(wrappedSub[i], {
                    x: MARGIN + 30, y, size: 9, font, color: rgb(0.25, 0.25, 0.25)
                });
                y -= 13;
            }
            continue;
        }

        // Linie separacji
        if (/^[-=─]+$/.test(trimmed)) {
            y -= 8;
            continue;
        }

        // Zwykły tekst - z wcięciem i WYJUSTOWANIEM
        // Sprawdź czy zawiera [DO UZUPELNIENIA] i podświetl na czerwono
        const hasPlaceholder = trimmed.includes('[DO UZUPELNIENIA]') ||
            trimmed.includes('[DO UZUPEŁNIENIA]') ||
            trimmed.includes('[_]');

        const textIndent = 20;
        const textWidth = CONTENT_WIDTH - textIndent;

        // Jeśli linia zawiera placeholder - narysuj czerwone tło
        if (hasPlaceholder) {
            const lineHeight = 16;
            currentPage.drawRectangle({
                x: MARGIN + textIndent - 2,
                y: y - 4,
                width: textWidth + 4,
                height: lineHeight,
                color: rgb(1, 0.93, 0.93), // Jasnoróżowe tło
                borderColor: rgb(0.9, 0.5, 0.5),
                borderWidth: 0.5,
            });
        }
        const wrappedLines = wrapText(trimmed, font, 10, textWidth);
        for (let lineIdx = 0; lineIdx < wrappedLines.length; lineIdx++) {
            if (y < MARGIN + 50) {
                addPageFooter(currentPage, pageNum, font);
                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
                pageNum++;
            }
            const isLastLine = lineIdx === wrappedLines.length - 1;
            drawJustifiedText(
                currentPage,
                wrappedLines[lineIdx],
                MARGIN + textIndent,
                y,
                textWidth,
                10,
                font,
                { red: 0.2, green: 0.2, blue: 0.2 },
                isLastLine
            );
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

        const colWidths = [150, ...financials.map(() => 100)];
        const years = financials.map(f => f.rok.toString());

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
        // Nagłówek kolumny trendu
        if (financials.length >= 2) {
            currentPage.drawText('Zmiana YoY', { x: xPos + 5, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        }
        y -= 22;

        // Helper do obliczania trendu
        const calcTrend = (curr: number | null | undefined, prev: number | null | undefined): { text: string; isPositive: boolean } => {
            if (!curr || !prev || prev === 0) return { text: '-', isPositive: true };
            const change = ((curr - prev) / Math.abs(prev)) * 100;
            const arrow = change >= 0 ? '+' : '';
            return {
                text: `${arrow}${change.toFixed(1)}%`,
                isPositive: change >= 0
            };
        };

        // Dane finansowe z trendami
        const rowsData: { label: string; values: string[]; trend?: { text: string; isPositive: boolean } }[] = [
            {
                label: 'Przychody netto',
                values: financials.map(f => formatPLN(f.przychodyNetto)),
                trend: financials.length >= 2 ? calcTrend(financials[0].przychodyNetto, financials[1].przychodyNetto) : undefined
            },
            {
                label: 'Zysk netto',
                values: financials.map(f => formatPLN(f.zyskNetto)),
                trend: financials.length >= 2 ? calcTrend(financials[0].zyskNetto, financials[1].zyskNetto) : undefined
            },
            {
                label: 'Suma bilansowa',
                values: financials.map(f => formatPLN(f.sumaBilansowa)),
                trend: financials.length >= 2 ? calcTrend(financials[0].sumaBilansowa, financials[1].sumaBilansowa) : undefined
            },
            {
                label: 'Kapital wlasny',
                values: financials.map(f => formatPLN(f.kapitalWlasny)),
                trend: financials.length >= 2 ? calcTrend(financials[0].kapitalWlasny, financials[1].kapitalWlasny) : undefined
            },
            {
                label: 'Zobowiazania',
                values: financials.map(f => formatPLN(f.zobowiazania)),
                trend: financials.length >= 2 ? calcTrend(financials[0].zobowiazania, financials[1].zobowiazania) : undefined
            },
        ];

        for (let r = 0; r < rowsData.length; r++) {
            const rowData = rowsData[r];
            xPos = MARGIN + 5;

            if (r % 2 === 1) {
                currentPage.drawRectangle({
                    x: MARGIN,
                    y: y - 5,
                    width: CONTENT_WIDTH,
                    height: 18,
                    color: rgb(0.97, 0.97, 0.97),
                });
            }

            // Nazwa pozycji
            currentPage.drawText(rowData.label, { x: xPos, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
            xPos += colWidths[0];

            // Wartości dla każdego roku
            for (let i = 0; i < rowData.values.length; i++) {
                const colWidth = colWidths[i + 1] || 100;
                const textWidth = font.widthOfTextAtSize(rowData.values[i], 9);
                const rightAlignedX = xPos + colWidth - textWidth - 10;
                currentPage.drawText(rowData.values[i], { x: rightAlignedX, y, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
                xPos += colWidth;
            }

            // Kolumna trendu z kolorami
            if (rowData.trend) {
                const trendColor = rowData.trend.isPositive
                    ? rgb(0.1, 0.6, 0.2)  // zielony dla wzrostu
                    : rgb(0.8, 0.2, 0.1); // czerwony dla spadku
                // Używamy ASCII zamiast Unicode (Helvetica nie obsługuje ↑↓)
                const arrow = rowData.trend.isPositive ? '[+]' : '[-]';
                currentPage.drawText(`${arrow} ${rowData.trend.text}`, {
                    x: xPos + 5, y, size: 9, font: fontBold, color: trendColor
                });
            }

            y -= 18;
        }

        y -= 5;
        drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.5, rgb(0.7, 0.7, 0.7));

        // ========================================
        // WYKRES SŁUPKOWY - Przychody i Zysk
        // ========================================

        if (financials.length >= 2) {
            y -= 30;

            if (y < MARGIN + 150) {
                addPageFooter(currentPage, pageNum, font);
                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
                pageNum++;
            }

            currentPage.drawText('WYKRES: Przychody vs Zysk netto', {
                x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.3)
            });
            y -= 20;

            const chartHeight = 80;
            const chartWidth = CONTENT_WIDTH - 40;
            const barWidth = Math.min(40, (chartWidth / financials.length) - 10);

            // Znajdź max wartość dla skalowania
            const maxVal = Math.max(...financials.map(f => Math.max(f.przychodyNetto || 0, f.zyskNetto || 0)));

            if (maxVal > 0) {
                // Tło wykresu
                currentPage.drawRectangle({
                    x: MARGIN + 20,
                    y: y - chartHeight,
                    width: chartWidth,
                    height: chartHeight,
                    color: rgb(0.98, 0.98, 0.99),
                    borderColor: rgb(0.9, 0.9, 0.9),
                    borderWidth: 0.5,
                });

                // Rysuj słupki
                for (let i = 0; i < financials.length; i++) {
                    const fin = financials[i];
                    const xBase = MARGIN + 40 + i * (chartWidth / financials.length);

                    // Przychody (niebieski)
                    const heightP = ((fin.przychodyNetto || 0) / maxVal) * (chartHeight - 15);
                    if (heightP > 0) {
                        currentPage.drawRectangle({
                            x: xBase,
                            y: y - chartHeight + 5,
                            width: barWidth * 0.45,
                            height: heightP,
                            color: rgb(0.3, 0.5, 0.8),
                        });
                    }

                    // Zysk (zielony)
                    const heightZ = ((fin.zyskNetto || 0) / maxVal) * (chartHeight - 15);
                    if (heightZ > 0) {
                        currentPage.drawRectangle({
                            x: xBase + barWidth * 0.5,
                            y: y - chartHeight + 5,
                            width: barWidth * 0.45,
                            height: heightZ,
                            color: rgb(0.3, 0.7, 0.4),
                        });
                    }

                    // Rok label
                    currentPage.drawText(fin.rok.toString(), {
                        x: xBase + barWidth * 0.2,
                        y: y - chartHeight - 12,
                        size: 8,
                        font,
                        color: rgb(0.4, 0.4, 0.4),
                    });
                }

                // Legenda
                y -= chartHeight + 25;
                currentPage.drawRectangle({ x: MARGIN + 20, y: y + 3, width: 10, height: 8, color: rgb(0.3, 0.5, 0.8) });
                currentPage.drawText('Przychody', { x: MARGIN + 35, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
                currentPage.drawRectangle({ x: MARGIN + 100, y: y + 3, width: 10, height: 8, color: rgb(0.3, 0.7, 0.4) });
                currentPage.drawText('Zysk netto', { x: MARGIN + 115, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

                y -= 30;

                // ========================================
                // DASHBOARD KLUCZOWYCH WSKAZNIKOW (karty)
                // ========================================

                if (financials.length > 0) {
                    const latestFin = financials[financials.length - 1];
                    const prevFin = financials.length > 1 ? financials[financials.length - 2] : null;

                    const cardWidth = (CONTENT_WIDTH - 20) / 3;
                    const cardHeight = 50;

                    // Sprawdzenie miejsca na stronie
                    if (y < MARGIN + cardHeight + 30) {
                        addPageFooter(currentPage, pageNum, font);
                        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                        y = PAGE_HEIGHT - MARGIN;
                        pageNum++;
                    }

                    // Karta 1: Przychody
                    currentPage.drawRectangle({
                        x: MARGIN, y: y - cardHeight,
                        width: cardWidth, height: cardHeight,
                        color: rgb(0.95, 0.97, 1), borderColor: rgb(0.8, 0.85, 0.95), borderWidth: 1,
                    });
                    currentPage.drawText('PRZYCHODY', { x: MARGIN + 10, y: y - 15, size: 8, font, color: rgb(0.4, 0.4, 0.5) });
                    currentPage.drawText(`${((latestFin.przychodyNetto || 0) / 1000000).toFixed(1)} mln PLN`, {
                        x: MARGIN + 10, y: y - 35, size: 12, font: fontBold, color: rgb(0.2, 0.3, 0.5)
                    });
                    // Trend
                    if (prevFin && prevFin.przychodyNetto) {
                        const growth = ((latestFin.przychodyNetto - prevFin.przychodyNetto) / prevFin.przychodyNetto) * 100;
                        const trendColor = growth >= 0 ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
                        const trendText = growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
                        currentPage.drawText(trendText, { x: MARGIN + cardWidth - 40, y: y - 35, size: 10, font: fontBold, color: trendColor });
                    }

                    // Karta 2: Zysk netto
                    currentPage.drawRectangle({
                        x: MARGIN + cardWidth + 10, y: y - cardHeight,
                        width: cardWidth, height: cardHeight,
                        color: rgb(0.95, 1, 0.97), borderColor: rgb(0.8, 0.95, 0.85), borderWidth: 1,
                    });
                    currentPage.drawText('ZYSK NETTO', { x: MARGIN + cardWidth + 20, y: y - 15, size: 8, font, color: rgb(0.4, 0.5, 0.4) });
                    const zyskVal = (latestFin.zyskNetto || 0) / 1000000;
                    const zyskColor = zyskVal >= 0 ? rgb(0.2, 0.5, 0.3) : rgb(0.6, 0.2, 0.2);
                    currentPage.drawText(`${zyskVal.toFixed(1)} mln PLN`, {
                        x: MARGIN + cardWidth + 20, y: y - 35, size: 12, font: fontBold, color: zyskColor
                    });

                    // Karta 3: Kapital wlasny / Zadluzenie
                    currentPage.drawRectangle({
                        x: MARGIN + 2 * cardWidth + 20, y: y - cardHeight,
                        width: cardWidth, height: cardHeight,
                        color: rgb(1, 0.98, 0.95), borderColor: rgb(0.95, 0.9, 0.8), borderWidth: 1,
                    });
                    currentPage.drawText('KAPITAL WLASNY', { x: MARGIN + 2 * cardWidth + 30, y: y - 15, size: 8, font, color: rgb(0.5, 0.45, 0.4) });
                    currentPage.drawText(`${((latestFin.kapitalWlasny || 0) / 1000000).toFixed(1)} mln PLN`, {
                        x: MARGIN + 2 * cardWidth + 30, y: y - 35, size: 12, font: fontBold, color: rgb(0.4, 0.35, 0.3)
                    });
                    // Wskaznik zadluzenia
                    if (latestFin.sumaBilansowa && latestFin.sumaBilansowa > 0) {
                        const debtRatio = ((latestFin.zobowiazania || 0) / latestFin.sumaBilansowa) * 100;
                        const debtColor = debtRatio < 50 ? rgb(0.3, 0.6, 0.3) : rgb(0.6, 0.3, 0.2);
                        currentPage.drawText(`Zadl. ${debtRatio.toFixed(0)}%`, {
                            x: MARGIN + 2 * cardWidth + cardWidth - 50, y: y - 35, size: 9, font, color: debtColor
                        });
                    }

                    y -= cardHeight + 20;
                }
            }
        }

        // ========================================
        // ANALIZA WSKAźNIKÓW FINANSOWYCH
        // ========================================

        const allRatios = calculateAllRatios(financials);

        if (allRatios.length > 0) {
            y -= 30;

            if (y < MARGIN + 200) {
                addPageFooter(currentPage, pageNum, font);
                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
                pageNum++;
            }

            // Tło sekcji
            currentPage.drawRectangle({
                x: MARGIN - 5,
                y: y - 5,
                width: CONTENT_WIDTH + 10,
                height: 24,
                color: rgb(0.93, 0.95, 0.98),
            });

            currentPage.drawText('ANALIZA WSKAZNIKOWA', {
                x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.15, 0.15, 0.25)
            });

            // Rating badge
            const lastRatio = allRatios[allRatios.length - 1];
            const ratingColor = lastRatio.rating.startsWith('A') ? rgb(0.2, 0.6, 0.3) :
                lastRatio.rating.startsWith('B') ? rgb(0.7, 0.5, 0.1) : rgb(0.7, 0.2, 0.2);
            currentPage.drawRectangle({
                x: MARGIN + 180, y: y - 4, width: 45, height: 18,
                color: ratingColor, borderColor: ratingColor, borderWidth: 1,
            });
            currentPage.drawText(lastRatio.rating, {
                x: MARGIN + 190, y: y - 1, size: 10, font: fontBold, color: rgb(1, 1, 1)
            });
            currentPage.drawText(`${lastRatio.score}/100 pkt`, {
                x: MARGIN + 230, y, size: 9, font, color: rgb(0.4, 0.4, 0.5)
            });
            y -= 30;

            // Tabela wskaźników z kolumną Rating
            const ratioLabels = ['Rok', 'Rating', 'ROE', 'ROA', 'ROS', 'Zadl.', 'Przych.YoY', 'Zysk YoY'];
            const colW = CONTENT_WIDTH / ratioLabels.length;

            // Nagłówek tabeli
            let xPos = MARGIN;
            for (const label of ratioLabels) {
                currentPage.drawText(label, { x: xPos, y, size: 7, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                xPos += colW;
            }
            y -= 15;
            drawLine(currentPage, MARGIN, y + 5, CONTENT_WIDTH, 0.5, rgb(0.8, 0.8, 0.8));

            // Dane wskaźników
            for (const r of allRatios) {
                if (y < MARGIN + 50) {
                    addPageFooter(currentPage, pageNum, font);
                    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    y = PAGE_HEIGHT - MARGIN;
                    pageNum++;
                }

                xPos = MARGIN;
                currentPage.drawText(r.rok.toString(), { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;

                // Rating z kolorem
                const rColor = r.rating.startsWith('A') ? rgb(0.2, 0.6, 0.3) :
                    r.rating.startsWith('B') ? rgb(0.6, 0.5, 0.1) : rgb(0.6, 0.2, 0.2);
                currentPage.drawText(`${r.rating} (${r.score})`, { x: xPos, y, size: 7, font: fontBold, color: rColor });
                xPos += colW;

                currentPage.drawText(r.roe !== undefined ? `${r.roe.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.roa !== undefined ? `${r.roa.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.ros !== undefined ? `${r.ros.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.debtRatio !== undefined ? `${r.debtRatio.toFixed(0)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;

                // Dynamika z kolorami
                const revColor = r.revenueGrowth !== undefined && r.revenueGrowth >= 0 ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
                currentPage.drawText(formatPercent(r.revenueGrowth), { x: xPos, y, size: 7, font, color: revColor });
                xPos += colW;

                const profColor = r.profitGrowth !== undefined && r.profitGrowth >= 0 ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
                currentPage.drawText(formatPercent(r.profitGrowth), { x: xPos, y, size: 7, font, color: profColor });

                y -= 14;
            }

            y -= 10;
            drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.3, rgb(0.8, 0.8, 0.8));
            y -= 15;

            // Komentarz AI do ostatniego roku
            const comment = generateFinancialComment(lastRatio);

            if (comment) {
                const commentLines = wrapText(comment, font, 9, CONTENT_WIDTH - 10);
                for (const line of commentLines) {
                    if (y < MARGIN + 50) {
                        addPageFooter(currentPage, pageNum, font);
                        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                        y = PAGE_HEIGHT - MARGIN;
                        pageNum++;
                    }
                    currentPage.drawText(line, { x: MARGIN + 5, y, size: 9, font, color: rgb(0.3, 0.3, 0.4) });
                    y -= 13;
                }
            }

            // Trend z ikonami i kolorami
            y -= 10;
            const trendColor = lastRatio.trend === 'strong_positive' ? rgb(0.1, 0.5, 0.2) :
                lastRatio.trend === 'positive' ? rgb(0.2, 0.6, 0.3) :
                    lastRatio.trend === 'strong_negative' ? rgb(0.6, 0.1, 0.1) :
                        lastRatio.trend === 'negative' ? rgb(0.7, 0.2, 0.2) : rgb(0.5, 0.5, 0.5);
            const trendIcon = lastRatio.trend.includes('positive') ? 'TREND WZROSTOWY' :
                lastRatio.trend.includes('negative') ? 'TREND SPADKOWY' : 'TREND STABILNY';
            currentPage.drawText(trendIcon, {
                x: MARGIN, y, size: 9, font: fontBold, color: trendColor
            });
            y -= 13;
            currentPage.drawText(lastRatio.trendDescription, {
                x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.4, 0.5)
            });
            y -= 20;
        }
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

function hasOfferData(params: OfferParameters): boolean {
    return !!(
        params.seriaAkcji ||
        params.liczbaAkcji ||
        params.wartoscNominalna ||
        params.cenaEmisyjna ||
        params.celeEmisji ||
        params.terminSubskrypcji ||
        params.miejsceZapisow ||
        params.minimalnaLiczbaAkcji ||
        params.firmaInwestycyjna ||
        params.dataWaznosci
    );
}

function countOfferRows(params: OfferParameters): number {
    let count = 0;
    if (params.seriaAkcji) count++;
    if (params.liczbaAkcji) count++;
    if (params.wartoscNominalna) count++;
    if (params.cenaEmisyjna) count++;
    if (params.celeEmisji) count++;
    if (params.terminSubskrypcji) count++;
    if (params.miejsceZapisow) count++;
    if (params.minimalnaLiczbaAkcji) count++;
    if (params.firmaInwestycyjna) count++;
    if (params.dataWaznosci) count++;
    if (params.liczbaAkcji && params.cenaEmisyjna) count++; // wartość emisji
    return count;
}

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

/**
 * Nagłówek strony z nazwą sekcji
 */
function addPageHeader(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    companyName?: string,
    sectionName?: string
) {
    // Lewa strona: "MEMORANDUM INFORMACYJNE"
    page.drawText('MEMORANDUM INFORMACYJNE', {
        x: MARGIN,
        y: PAGE_HEIGHT - 25,
        size: 8,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Prawa strona: nazwa sekcji
    if (sectionName) {
        const sectionWidth = font.widthOfTextAtSize(sectionName, 8);
        page.drawText(sectionName, {
            x: PAGE_WIDTH - MARGIN - sectionWidth,
            y: PAGE_HEIGHT - 25,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.5)
        });
    }

    // Linia pod nagłówkiem
    page.drawLine({
        start: { x: MARGIN, y: PAGE_HEIGHT - 35 },
        end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 35 },
        thickness: 0.3,
        color: rgb(0.8, 0.8, 0.8),
    });
}

/**
 * Callout box dla ostrzeżeń i [DO UZUPEŁNIENIA]
 */
function drawCalloutBox(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    width: number,
    font: PDFFont,
    type: 'warning' | 'info' | 'placeholder'
): number {
    const padding = 8;
    const lineHeight = 12;

    // Kolory w zależności od typu
    const colors = {
        warning: { bg: rgb(1, 0.95, 0.9), border: rgb(0.9, 0.5, 0.3), icon: '[!]' },
        info: { bg: rgb(0.93, 0.95, 1), border: rgb(0.4, 0.5, 0.8), icon: '[i]' },
        placeholder: { bg: rgb(1, 0.93, 0.93), border: rgb(0.8, 0.4, 0.4), icon: '[?]' },
    };

    const style = colors[type];

    // Oblicz wysokość na podstawie tekstu
    const words = text.split(' ');
    let lines = 1;
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, 9) > width - padding * 3) {
            lines++;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    const boxHeight = lines * lineHeight + padding * 2;

    // Tło
    page.drawRectangle({
        x,
        y: y - boxHeight,
        width,
        height: boxHeight,
        color: style.bg,
        borderColor: style.border,
        borderWidth: 1,
    });

    // Ikona
    page.drawText(style.icon, {
        x: x + padding,
        y: y - padding - 9,
        size: 10,
        font,
        color: style.border
    });

    // Tekst (uproszczony - pierwsza linia)
    const maxTextWidth = width - padding * 4 - 20;
    let displayText = text;
    if (font.widthOfTextAtSize(text, 9) > maxTextWidth) {
        displayText = text.substring(0, 80) + '...';
    }
    page.drawText(displayText, {
        x: x + padding + 25,
        y: y - padding - 9,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3)
    });

    return boxHeight;
}

function addPageFooter(
    page: PDFPage,
    pageNum: number,
    font: PDFFont,
    totalPages?: number,
    companyName?: string,
    docDate?: string
) {
    // Lewa strona: nazwa spółki i data
    if (companyName) {
        const leftText = `Memorandum - ${companyName}`;
        page.drawText(leftText, {
            x: MARGIN,
            y: 25,
            size: 7,
            font,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    // Środek: data dokumentu
    if (docDate) {
        const dateWidth = font.widthOfTextAtSize(docDate, 7);
        page.drawText(docDate, {
            x: (PAGE_WIDTH - dateWidth) / 2,
            y: 25,
            size: 7,
            font,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    // Prawa strona: numeracja X z Y
    const pageText = totalPages
        ? `Strona ${pageNum} z ${totalPages}`
        : `Strona ${pageNum}`;
    const width = font.widthOfTextAtSize(pageText, 9);
    page.drawText(pageText, {
        x: PAGE_WIDTH - MARGIN - width,
        y: 25,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Linia separująca nad stopką
    page.drawLine({
        start: { x: MARGIN, y: 40 },
        end: { x: PAGE_WIDTH - MARGIN, y: 40 },
        thickness: 0.3,
        color: rgb(0.8, 0.8, 0.8),
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
