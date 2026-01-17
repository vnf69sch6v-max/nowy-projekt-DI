/**
 * Generator PDF dla memorandum
 * Używa pdf-lib (bez zewnętrznych zależności)
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateMemorandumPDF(content: string, companyName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 10;
    const lineHeight = 14;
    const margin = 50;
    const pageWidth = 595; // A4
    const pageHeight = 842;
    const contentWidth = pageWidth - 2 * margin;

    // Podziel content na linie
    const lines = content.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    let pageNum = 1;

    // Nagłówek na pierwszej stronie
    currentPage.drawText('MEMORANDUM INFORMACYJNE', {
        x: margin,
        y: y,
        size: 16,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    y -= 30;

    currentPage.drawText(companyName, {
        x: margin,
        y: y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
    });
    y -= 40;

    // Rysuj linie
    for (const line of lines) {
        // Nowa strona jeśli potrzeba
        if (y < margin + 50) {
            // Stopka
            currentPage.drawText(`Strona ${pageNum}`, {
                x: pageWidth / 2 - 20,
                y: 30,
                size: 8,
                font,
                color: rgb(0.5, 0.5, 0.5),
            });

            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
            pageNum++;
        }

        // Sprawdź czy nagłówek (zaczyna się od I., II., etc. lub zawiera ═ lub ─)
        const isHeader = /^[IVX]+\.\s/.test(line.trim()) || line.includes('═') || line.includes('─');
        const currentFont = isHeader ? fontBold : font;
        const currentSize = isHeader && /^[IVX]+\.\s/.test(line.trim()) ? 12 : fontSize;

        // Pomiń linie z samymi znakami ramki (długie)
        if (line.match(/^[═─┌┐└┘├┤┬┴┼│]+$/)) {
            y -= lineHeight / 2;
            continue;
        }

        // Zawijanie tekstu
        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = currentFont.widthOfTextAtSize(testLine, currentSize);

            if (textWidth > contentWidth && currentLine) {
                currentPage.drawText(currentLine, {
                    x: margin,
                    y,
                    size: currentSize,
                    font: currentFont,
                    color: rgb(0, 0, 0),
                });
                y -= lineHeight;
                currentLine = word;

                if (y < margin + 50) {
                    currentPage.drawText(`Strona ${pageNum}`, {
                        x: pageWidth / 2 - 20,
                        y: 30,
                        size: 8,
                        font,
                        color: rgb(0.5, 0.5, 0.5),
                    });
                    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                    y = pageHeight - margin;
                    pageNum++;
                }
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            currentPage.drawText(currentLine, {
                x: margin,
                y,
                size: currentSize,
                font: currentFont,
                color: rgb(0, 0, 0),
            });
            y -= lineHeight;
        } else {
            y -= lineHeight / 2; // Pusta linia
        }
    }

    // Stopka ostatniej strony
    currentPage.drawText(`Strona ${pageNum}`, {
        x: pageWidth / 2 - 20,
        y: 30,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Zwróć PDF jako Uint8Array
    return pdfDoc.save();
}
