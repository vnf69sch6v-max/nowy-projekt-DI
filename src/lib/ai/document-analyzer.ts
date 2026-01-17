/**
 * Analizator dokumentów - ZOPTYMALIZOWANY
 * 1. pdf-parse do ekstrakcji tekstu (0 tokenów)
 * 2. Gemini do analizy (darmowy tier)
 * 3. Claude tylko gdy Gemini nie działa
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Minimalne prompty dla oszczędności tokenów
const KRS_PROMPT = `Wyekstrahuj dane z odpisu KRS. Zwróć TYLKO JSON:
{"nazwa":"","krs":"","nip":"","regon":"","forma":"","adres":"","kapital":0,"data":"","zarzad":[{"imie":"","nazwisko":"","funkcja":""}],"reprezentacja":"","pkd":[{"kod":"","opis":""}]}`;

const FIN_PROMPT = `Wyekstrahuj dane finansowe. Zwróć TYLKO JSON:
{"lata":[{"rok":2024,"przychody":0,"zysk":0,"bilans":0,"kapital":0,"zobowiazania":0}]}`;

/**
 * Ekstrakcja tekstu z PDF (0 tokenów!)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Dynamic import for pdf-parse
        const pdfParseModule = await import('pdf-parse');
        // Try different ways to access the function
        const pdfParse = typeof pdfParseModule === 'function'
            ? pdfParseModule
            : (pdfParseModule as { default?: unknown }).default || pdfParseModule;

        const data = await (pdfParse as (buffer: Buffer) => Promise<{ text: string }>)(buffer);
        console.log(`📄 Extracted ${data.text.length} characters from PDF`);
        return data.text;
    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error('Nie udało się odczytać PDF. Sprawdź czy plik nie jest zabezpieczony.');
    }
}

/**
 * Analizuje tekst przez Gemini (darmowy tier!)
 */
async function analyzeWithGemini(text: string, prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Ogranicz tekst do 10000 znaków dla oszczędności
    const truncatedText = text.slice(0, 10000);

    try {
        const result = await model.generateContent(`${prompt}\n\nTEKST:\n${truncatedText}`);
        return result.response.text();
    } catch (error) {
        console.error('Gemini error:', error);
        throw error;
    }
}

/**
 * Parsuje JSON z odpowiedzi AI
 */
function parseJSON(text: string): Record<string, unknown> {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Brak JSON w odpowiedzi AI');
    }

    let jsonStr = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');

    return JSON.parse(jsonStr);
}

/**
 * Analizuje odpis KRS
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS document...');

    // 1. Ekstrakcja tekstu (0 tokenów)
    const text = await extractTextFromPDF(pdfBuffer);

    // 2. Analiza przez Gemini (darmowy)
    const response = await analyzeWithGemini(text, KRS_PROMPT);
    console.log('Gemini response:', response.substring(0, 200));

    // 3. Parsowanie
    const d = parseJSON(response) as Record<string, unknown>;

    return {
        krs: String(d.krs || ''),
        nip: String(d.nip || ''),
        regon: String(d.regon || ''),
        nazwa: String(d.nazwa || 'Nieznana spółka'),
        formaOrganizacyjna: String(d.forma || ''),
        siedzibaAdres: String(d.adres || ''),
        kapitalZakladowy: Number(d.kapital) || 0,
        dataPowstania: String(d.data || ''),
        reprezentacja: Array.isArray(d.zarzad) ? d.zarzad.map((z: { imie?: string; nazwisko?: string; funkcja?: string }) => ({
            imie: z.imie || '',
            nazwisko: z.nazwisko || '',
            funkcja: z.funkcja || '',
        })) : [],
        sposobReprezentacji: String(d.reprezentacja || ''),
        wspolnicy: [],
        pkd: Array.isArray(d.pkd) ? d.pkd.map((p: { kod?: string; opis?: string }) => ({
            kod: p.kod || '',
            opis: p.opis || '',
            przewazajaca: false,
        })) : [],
        pkdPrzewazajace: Array.isArray(d.pkd) && d.pkd.length > 0 ? d.pkd[0]?.opis || '' : '',
    };
}

/**
 * Analizuje sprawozdanie finansowe
 */
export async function analyzeFinancialDocument(
    buffer: Buffer,
    mimeType: string
): Promise<FinancialData[]> {
    console.log('📊 Analyzing financial document...');

    // Excel - parsuj lokalnie (0 tokenów!)
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // PDF - ekstrakcja tekstu + Gemini
    const text = await extractTextFromPDF(buffer);
    const response = await analyzeWithGemini(text, FIN_PROMPT);

    try {
        const d = parseJSON(response) as {
            lata?: Array<{
                rok: number;
                przychody: number;
                zysk: number;
                bilans: number;
                kapital: number;
                zobowiazania: number;
            }>
        };

        return (d.lata || []).map(y => ({
            rok: y.rok,
            przychodyNetto: y.przychody || 0,
            zyskBrutto: y.zysk || 0,
            zyskNetto: y.zysk || 0,
            sumaBilansowa: y.bilans || 0,
            kapitalWlasny: y.kapital || 0,
            zobowiazania: y.zobowiazania || 0,
            aktywaObrotowe: 0,
            aktywaTrwale: 0,
        }));
    } catch {
        console.error('Failed to parse financials, returning empty');
        return [];
    }
}

/**
 * Parsuje Excel lokalnie (0 tokenów!)
 */
async function parseExcelFinancials(buffer: Buffer): Promise<FinancialData[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const financials: FinancialData[] = [];

    for (const row of data) {
        const r = row as Record<string, unknown>;
        const rok = r['Rok'] || r['rok'] || r['Year'];
        if (rok && typeof rok === 'number') {
            financials.push({
                rok,
                przychodyNetto: Number(r['Przychody'] || 0),
                zyskBrutto: Number(r['Zysk brutto'] || 0),
                zyskNetto: Number(r['Zysk netto'] || 0),
                sumaBilansowa: Number(r['Suma bilansowa'] || 0),
                kapitalWlasny: Number(r['Kapitał własny'] || 0),
                zobowiazania: Number(r['Zobowiązania'] || 0),
                aktywaObrotowe: 0,
                aktywaTrwale: 0,
            });
        }
    }

    return financials;
}
