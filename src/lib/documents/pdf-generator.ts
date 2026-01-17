/**
 * Generator PDF dla memorandum
 * Usuwa wszystkie znaki Unicode nieobsługiwane przez StandardFonts
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Usuwa wszystkie znaki spoza ASCII (0-127)
 */
function sanitizeForPDF(text: string): string {
    const polishMap: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
        'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        '─': '-', '│': '|', '┌': '+', '┐': '+', '└': '+', '┘': '+',
        '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
        '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
        '•': '*', '…': '...',
        '–': '-', '—': '-',
    };

    let result = '';
    for (const char of text) {
        if (polishMap[char]) {
            result += polishMap[char];
        } else if (char.charCodeAt(0) < 128) {
            result += char;
        } else {
            result += ' ';
        }
    }
    return result;
}

export async function generateMemorandumPDF(content: string, companyName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 10;
    const lineHeight = 14;
    const margin = 50;
    const pageWidth = 595;
    const pageHeight = 842;
    const contentWidth = pageWidth - 2 * margin;

    const safeContent = sanitizeForPDF(content);
    const safeCompanyName = sanitizeForPDF(companyName);

    const lines = safeContent.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    let pageNum = 1;

    currentPage.drawText('MEMORANDUM INFORMACYJNE', {
        x: margin, y, size: 16, font: fontBold, color: rgb(0, 0, 0),
    });
    y -= 30;

    currentPage.drawText(safeCompanyName, {
        x: margin, y, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 40;

    for (const line of lines) {
        if (y < margin + 50) {
            currentPage.drawText('Strona ' + pageNum, {
                x: pageWidth / 2 - 20, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
            });
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
            pageNum++;
        }

        const isHeader = /^[IVX]+\.\s/.test(line.trim());
        const currentFont = isHeader ? fontBold : font;
        const currentSize = isHeader ? 12 : fontSize;

        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const textWidth = currentFont.widthOfTextAtSize(testLine, currentSize);

            if (textWidth > contentWidth && currentLine) {
                currentPage.drawText(currentLine, {
                    x: margin, y, size: currentSize, font: currentFont, color: rgb(0, 0, 0),
                });
                y -= lineHeight;
                currentLine = word;

                if (y < margin + 50) {
                    currentPage.drawText('Strona ' + pageNum, {
                        x: pageWidth / 2 - 20, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
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
                x: margin, y, size: currentSize, font: currentFont, color: rgb(0, 0, 0),
            });
            y -= lineHeight;
        } else {
            y -= lineHeight / 2;
        }
    }

    currentPage.drawText('Strona ' + pageNum, {
        x: pageWidth / 2 - 20, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
}
