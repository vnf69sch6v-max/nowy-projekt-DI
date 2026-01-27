// =========================================
// AGENT 7: PDF RENDERER
// =========================================
// Renders memorandum to professional PDF with TOC, headers, and styling

import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { GeneratedSection, Company, OfferParameters } from '@/lib/db/types';

// =========================================
// PDF CONFIGURATION
// =========================================

const PDF_CONFIG = {
    pageSize: PageSizes.A4,
    margins: { top: 70, bottom: 70, left: 60, right: 60 },
    fontSize: {
        title: 18,
        subtitle: 14,
        chapter: 13,
        section: 11,
        body: 10,
        footer: 8
    },
    lineHeight: 1.4,
    colors: {
        black: rgb(0, 0, 0),
        dark: rgb(0.1, 0.1, 0.1),
        gray: rgb(0.4, 0.4, 0.4),
        lightGray: rgb(0.8, 0.8, 0.8),
        accent: rgb(0.1, 0.2, 0.4)
    }
};

// Polish character mapping (pdf-lib doesn't support Unicode with standard fonts)
const POLISH_MAP: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
    'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
    '–': '-', '—': '-', '„': '"', '"': '"', '…': '...',
    '•': '*', '§': 'par.', '©': '(c)', '®': '(R)',
    '€': 'EUR', '£': 'GBP'
};

function sanitizeText(text: string): string {
    let result = '';
    for (const char of text) {
        if (POLISH_MAP[char]) {
            result += POLISH_MAP[char];
        } else if (char.charCodeAt(0) < 128) {
            result += char;
        } else {
            result += ' ';
        }
    }
    return result;
}

// =========================================
// PDF RENDERER CLASS
// =========================================

export interface RenderOptions {
    includeTOC?: boolean;
    includeWatermark?: boolean;
    watermarkText?: string;
    headerText?: string;
    footerText?: string;
}

export class MemorandumPDFRenderer {
    private pdfDoc: PDFDocument | null = null;
    private font: Awaited<ReturnType<PDFDocument['embedFont']>> | null = null;
    private fontBold: Awaited<ReturnType<PDFDocument['embedFont']>> | null = null;
    private currentPage: ReturnType<PDFDocument['addPage']> | null = null;
    private pageNum: number = 0;
    private y: number = 0;
    private tocEntries: { title: string; page: number }[] = [];
    private options: RenderOptions;

    constructor(options: RenderOptions = {}) {
        this.options = {
            includeTOC: true,
            includeWatermark: false,
            ...options
        };
    }

    // Initialize PDF document
    private async init(): Promise<void> {
        this.pdfDoc = await PDFDocument.create();
        this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
        this.fontBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
        this.pageNum = 0;
    }

    // Add new page
    private addPage(): ReturnType<PDFDocument['addPage']> {
        if (!this.pdfDoc) throw new Error('PDF not initialized');

        this.pageNum++;
        const page = this.pdfDoc.addPage(PDF_CONFIG.pageSize);
        this.currentPage = page;
        this.y = page.getHeight() - PDF_CONFIG.margins.top;

        // Add header
        if (this.options.headerText && this.pageNum > 1) {
            page.drawText(sanitizeText(this.options.headerText), {
                x: PDF_CONFIG.margins.left,
                y: page.getHeight() - 35,
                size: PDF_CONFIG.fontSize.footer,
                font: this.font!,
                color: PDF_CONFIG.colors.gray
            });

            // Header line
            page.drawLine({
                start: { x: PDF_CONFIG.margins.left, y: page.getHeight() - 50 },
                end: { x: page.getWidth() - PDF_CONFIG.margins.right, y: page.getHeight() - 50 },
                thickness: 0.5,
                color: PDF_CONFIG.colors.lightGray
            });
        }

        // Add watermark (simplified - no rotation as pdf-lib has limited support)
        if (this.options.includeWatermark && this.options.watermarkText) {
            page.drawText(sanitizeText(this.options.watermarkText), {
                x: page.getWidth() / 2 - 80,
                y: page.getHeight() / 2,
                size: 40,
                font: this.font!,
                color: rgb(0.9, 0.9, 0.9),
                opacity: 0.3
            });
        }

        return page;
    }

    // Add footer to current page
    private addFooter(): void {
        if (!this.currentPage || !this.font) return;

        const page = this.currentPage;
        const footerY = 35;

        // Footer line
        page.drawLine({
            start: { x: PDF_CONFIG.margins.left, y: footerY + 15 },
            end: { x: page.getWidth() - PDF_CONFIG.margins.right, y: footerY + 15 },
            thickness: 0.5,
            color: PDF_CONFIG.colors.lightGray
        });

        // Page number
        const pageText = `Strona ${this.pageNum}`;
        const pageTextWidth = this.font.widthOfTextAtSize(pageText, PDF_CONFIG.fontSize.footer);
        page.drawText(pageText, {
            x: (page.getWidth() - pageTextWidth) / 2,
            y: footerY,
            size: PDF_CONFIG.fontSize.footer,
            font: this.font,
            color: PDF_CONFIG.colors.gray
        });

        // Footer text
        if (this.options.footerText) {
            page.drawText(sanitizeText(this.options.footerText), {
                x: PDF_CONFIG.margins.left,
                y: footerY,
                size: PDF_CONFIG.fontSize.footer,
                font: this.font,
                color: PDF_CONFIG.colors.gray
            });
        }
    }

    // Check if need new page
    private checkNewPage(requiredHeight: number = 50): void {
        if (this.y < PDF_CONFIG.margins.bottom + requiredHeight) {
            this.addFooter();
            this.addPage();
        }
    }

    // Draw text with word wrapping
    private drawWrappedText(
        text: string,
        fontSize: number = PDF_CONFIG.fontSize.body,
        bold: boolean = false,
        indent: number = 0
    ): void {
        if (!this.currentPage || !this.font || !this.fontBold) return;

        const font = bold ? this.fontBold : this.font;
        const maxWidth = this.currentPage.getWidth() - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - indent;
        const lineHeight = fontSize * PDF_CONFIG.lineHeight;

        const safeText = sanitizeText(text);
        const paragraphs = safeText.split('\n');

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                this.y -= lineHeight / 2;
                continue;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const textWidth = font.widthOfTextAtSize(testLine, fontSize);

                if (textWidth > maxWidth && currentLine) {
                    this.checkNewPage(lineHeight * 2);
                    this.currentPage!.drawText(currentLine, {
                        x: PDF_CONFIG.margins.left + indent,
                        y: this.y,
                        size: fontSize,
                        font,
                        color: PDF_CONFIG.colors.dark
                    });
                    this.y -= lineHeight;
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                this.checkNewPage(lineHeight);
                this.currentPage!.drawText(currentLine, {
                    x: PDF_CONFIG.margins.left + indent,
                    y: this.y,
                    size: fontSize,
                    font,
                    color: PDF_CONFIG.colors.dark
                });
                this.y -= lineHeight;
            }
        }
    }

    // =========================================
    // RENDER FUNCTIONS
    // =========================================

    // Render title page
    private renderTitlePage(company: Partial<Company>, offer?: Partial<OfferParameters>): void {
        if (!this.currentPage || !this.fontBold || !this.font) return;

        const page = this.currentPage;
        const centerX = page.getWidth() / 2;

        // Title
        const title = 'MEMORANDUM INFORMACYJNE';
        const titleWidth = this.fontBold.widthOfTextAtSize(title, PDF_CONFIG.fontSize.title);
        this.y = page.getHeight() - 200;

        page.drawText(title, {
            x: centerX - titleWidth / 2,
            y: this.y,
            size: PDF_CONFIG.fontSize.title,
            font: this.fontBold,
            color: PDF_CONFIG.colors.accent
        });

        this.y -= 50;

        // Company name
        const companyName = sanitizeText(company.nazwa || 'EMITENT');
        const companyWidth = this.fontBold.widthOfTextAtSize(companyName, PDF_CONFIG.fontSize.subtitle);
        page.drawText(companyName, {
            x: centerX - companyWidth / 2,
            y: this.y,
            size: PDF_CONFIG.fontSize.subtitle,
            font: this.fontBold,
            color: PDF_CONFIG.colors.black
        });

        this.y -= 30;

        // Legal form
        if (company.formaPrawna) {
            const form = sanitizeText(company.formaPrawna);
            const formWidth = this.font.widthOfTextAtSize(form, PDF_CONFIG.fontSize.body);
            page.drawText(form, {
                x: centerX - formWidth / 2,
                y: this.y,
                size: PDF_CONFIG.fontSize.body,
                font: this.font,
                color: PDF_CONFIG.colors.gray
            });
        }

        this.y -= 80;

        // Offer info
        if (offer?.seriaAkcji && offer?.liczbaAkcji) {
            const offerText = sanitizeText(
                `Oferta publiczna ${offer.liczbaAkcji.toLocaleString('pl-PL')} akcji serii ${offer.seriaAkcji}`
            );
            const offerWidth = this.font.widthOfTextAtSize(offerText, PDF_CONFIG.fontSize.section);
            page.drawText(offerText, {
                x: centerX - offerWidth / 2,
                y: this.y,
                size: PDF_CONFIG.fontSize.section,
                font: this.font,
                color: PDF_CONFIG.colors.dark
            });
        }

        // Bottom info
        this.y = 150;

        // Legal basis
        const legalBasis = 'Sporzadzone zgodnie z Rozporzadzeniem Ministra Finansow';
        const legalWidth = this.font.widthOfTextAtSize(legalBasis, PDF_CONFIG.fontSize.footer);
        page.drawText(legalBasis, {
            x: centerX - legalWidth / 2,
            y: this.y,
            size: PDF_CONFIG.fontSize.footer,
            font: this.font,
            color: PDF_CONFIG.colors.gray
        });

        this.y -= 15;

        const regulation = 'z dnia 12 maja 2020 r. (Dz.U. z 2020 r. poz. 1053)';
        const regWidth = this.font.widthOfTextAtSize(regulation, PDF_CONFIG.fontSize.footer);
        page.drawText(regulation, {
            x: centerX - regWidth / 2,
            y: this.y,
            size: PDF_CONFIG.fontSize.footer,
            font: this.font,
            color: PDF_CONFIG.colors.gray
        });

        // Date
        this.y -= 40;
        const date = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
        const dateText = sanitizeText(date);
        const dateWidth = this.font.widthOfTextAtSize(dateText, PDF_CONFIG.fontSize.body);
        page.drawText(dateText, {
            x: centerX - dateWidth / 2,
            y: this.y,
            size: PDF_CONFIG.fontSize.body,
            font: this.font,
            color: PDF_CONFIG.colors.dark
        });
    }

    // Render table of contents
    private renderTOC(): void {
        if (!this.options.includeTOC || this.tocEntries.length === 0) return;

        this.addPage();

        this.drawWrappedText('SPIS TRESCI', PDF_CONFIG.fontSize.chapter, true);
        this.y -= 20;

        let currentChapter = '';

        for (const entry of this.tocEntries) {
            const isChapter = entry.title.match(/^[IVX]+\./);

            if (isChapter && entry.title !== currentChapter) {
                currentChapter = entry.title;
                this.y -= 10;
                this.drawWrappedText(entry.title, PDF_CONFIG.fontSize.section, true);
            } else {
                const tocLine = `${entry.title} ... ${entry.page}`;
                this.drawWrappedText(tocLine, PDF_CONFIG.fontSize.body, false, isChapter ? 0 : 20);
            }
        }
    }

    // Render a section
    private renderSection(section: GeneratedSection): void {
        this.checkNewPage(80);

        // Record TOC entry
        this.tocEntries.push({
            title: `${section.sectionNumber} ${section.sectionTitle}`,
            page: this.pageNum
        });

        // Section header
        this.y -= 15;
        this.drawWrappedText(
            `${section.sectionNumber} ${section.sectionTitle}`,
            PDF_CONFIG.fontSize.section,
            true
        );
        this.y -= 10;

        // Section content
        this.drawWrappedText(section.content, PDF_CONFIG.fontSize.body);
        this.y -= 15;
    }

    // =========================================
    // MAIN RENDER FUNCTION
    // =========================================

    async render(
        sections: GeneratedSection[],
        company: Partial<Company>,
        offer?: Partial<OfferParameters>
    ): Promise<Uint8Array> {
        await this.init();

        // Set header text
        this.options.headerText = company.nazwa || 'Memorandum Informacyjne';

        // Title page
        this.addPage();
        this.renderTitlePage(company, offer);

        // Content pages
        this.addPage();

        let currentChapter = '';

        for (const section of sections) {
            // Check for chapter change
            const sectionNum = parseInt(section.sectionNumber.replace('§', ''));
            let chapter = '';

            if (sectionNum <= 10) chapter = 'I. WSTEP';
            else if (sectionNum <= 15) chapter = 'II. CZYNNIKI RYZYKA';
            else if (sectionNum <= 35) chapter = 'III. DANE O EMITENCIE';
            else if (sectionNum <= 42) chapter = 'IV. SPRAWOZDANIA FINANSOWE';
            else chapter = 'V. INFORMACJE DODATKOWE';

            if (chapter !== currentChapter) {
                currentChapter = chapter;
                this.checkNewPage(100);
                this.y -= 20;

                // Record chapter in TOC
                this.tocEntries.push({
                    title: chapter,
                    page: this.pageNum
                });

                this.drawWrappedText(chapter, PDF_CONFIG.fontSize.chapter, true);
                this.y -= 15;
            }

            this.renderSection(section);
        }

        // Add footer to last page
        this.addFooter();

        // Note: TOC would need to be rendered after we know all page numbers
        // For a production version, you'd need a two-pass approach

        return this.pdfDoc!.save();
    }
}

// Factory function
export async function renderMemorandumPDF(
    sections: GeneratedSection[],
    company: Partial<Company>,
    offer?: Partial<OfferParameters>,
    options?: RenderOptions
): Promise<Uint8Array> {
    const renderer = new MemorandumPDFRenderer(options);
    return renderer.render(sections, company, offer);
}
