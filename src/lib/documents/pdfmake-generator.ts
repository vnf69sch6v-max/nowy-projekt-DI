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

    const cleanContent = sanitize(content);
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

            // Tło dla nagłówka sekcji
            currentPage.drawRectangle({
                x: MARGIN - 5,
                y: y - 5,
                width: CONTENT_WIDTH + 10,
                height: 24,
                color: rgb(0.95, 0.95, 0.97),
            });

            currentPage.drawText(trimmed.toUpperCase(), {
                x: MARGIN, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.2)
            });
            y -= 25;
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

        // Numerowany punkt główny (1., 2., 3., etc.)
        if (/^\d+\.\s/.test(trimmed)) {
            y -= 12;

            // Linia oddzielająca
            drawLine(currentPage, MARGIN, y + 8, CONTENT_WIDTH, 0.3, rgb(0.9, 0.9, 0.9));

            currentPage.drawText(trimmed.substring(0, 3), {
                x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.4)
            });

            // Tekst po numerze z wcięciem
            const textAfterNum = trimmed.substring(3);
            const wrappedMainPoint = wrapText(textAfterNum, font, 10, CONTENT_WIDTH - 25);
            for (let i = 0; i < wrappedMainPoint.length; i++) {
                if (y < MARGIN + 50) {
                    addPageFooter(currentPage, pageNum, font);
                    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    y = PAGE_HEIGHT - MARGIN;
                    pageNum++;
                }
                currentPage.drawText(wrappedMainPoint[i], {
                    x: MARGIN + 25, y, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15)
                });
                y -= 14;
            }
            y -= 4;
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

        // Zwykły tekst - z wcięciem 15
        const wrappedLines = wrapText(trimmed, font, 10, CONTENT_WIDTH - 15);
        for (const wLine of wrappedLines) {
            if (y < MARGIN + 50) {
                addPageFooter(currentPage, pageNum, font);
                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
                pageNum++;
            }
            currentPage.drawText(wLine, {
                x: MARGIN + 15, y, size: 10, font, color: rgb(0.2, 0.2, 0.2)
            });
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
        y -= 22;

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

                y -= 20;
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
            y -= 30;

            // Tabela wskaźników
            const ratioLabels = ['Rok', 'ROE', 'ROA', 'ROS', 'Zadluzenie', 'Przychody YoY', 'Zysk YoY'];
            const colW = CONTENT_WIDTH / ratioLabels.length;

            // Nagłówek tabeli
            let xPos = MARGIN;
            for (const label of ratioLabels) {
                currentPage.drawText(label, { x: xPos, y, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
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
                currentPage.drawText(r.roe !== undefined ? `${r.roe.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.roa !== undefined ? `${r.roa.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.ros !== undefined ? `${r.ros.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;
                currentPage.drawText(r.debtRatio !== undefined ? `${r.debtRatio.toFixed(1)}%` : '-', { x: xPos, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
                xPos += colW;

                // Dynamika z kolorami
                const revColor = r.revenueGrowth !== undefined && r.revenueGrowth >= 0 ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
                currentPage.drawText(formatPercent(r.revenueGrowth), { x: xPos, y, size: 8, font, color: revColor });
                xPos += colW;

                const profColor = r.profitGrowth !== undefined && r.profitGrowth >= 0 ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
                currentPage.drawText(formatPercent(r.profitGrowth), { x: xPos, y, size: 8, font, color: profColor });

                y -= 14;
            }

            y -= 10;
            drawLine(currentPage, MARGIN, y, CONTENT_WIDTH, 0.3, rgb(0.8, 0.8, 0.8));
            y -= 15;

            // Komentarz AI do ostatniego roku
            const lastRatio = allRatios[allRatios.length - 1];
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

            // Trend
            y -= 10;
            const trendColor = lastRatio.trend === 'positive' ? rgb(0.2, 0.6, 0.3) :
                lastRatio.trend === 'negative' ? rgb(0.7, 0.2, 0.2) : rgb(0.5, 0.5, 0.5);
            const trendIcon = lastRatio.trend === 'positive' ? '↑' : lastRatio.trend === 'negative' ? '↓' : '→';
            currentPage.drawText(`${trendIcon} ${lastRatio.trendDescription}`, {
                x: MARGIN, y, size: 9, font: fontBold, color: trendColor
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
