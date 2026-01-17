/**
 * Generator PDF dla memorandum
 * Używa pdf-lib z obsługą polskich znaków
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Zamienia polskie znaki na ASCII (pdf-lib nie obsługuje Unicode w StandardFonts)
 */
function sanitizePolish(text: string): string {
    const polishMap: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
        'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
    };

    return text.split('').map(char => polishMap[char] || char).join('');
}

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

    // Sanitize content
    const safeContent = sanitizePolish(content);
    const safeCompanyName = sanitizePolish(companyName);

    const lines = safeContent.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    let pageNum = 1;

    // Header
    currentPage.drawText('MEMORANDUM INFORMACYJNE', {
        x: margin,
        y: y,
        size: 16,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    y -= 30;

    currentPage.drawText(safeCompanyName, {
        x: margin,
        y: y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
    });
    y -= 40;

    for (const line of lines) {
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

        // Check if header
        const isHeader = /^[IVX]+\.\s/.test(line.trim());
        const currentFont = isHeader ? fontBold : font;
        const currentSize = isHeader ? 12 : fontSize;

        // Skip decorative lines
        if (line.match(/^[═─┌┐└┘├┤┬┴┼│]+$/)) {
            y -= lineHeight / 2;
            continue;
        }

        // Word wrap
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
            y -= lineHeight / 2;
        }
    }

    // Footer last page
    currentPage.drawText(`Strona ${pageNum}`, {
        x: pageWidth / 2 - 20,
        y: 30,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
}
