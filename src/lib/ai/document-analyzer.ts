/**
 * Analizator dokumentów - ZOPTYMALIZOWANY
 * 1. pdf-parse do ekstrakcji tekstu (0 tokenów)
 * 2. Fallback: Gemini Vision dla PDF
 * 3. Gemini do analizy (darmowy tier)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Minimalne prompty dla oszczędności tokenów
const KRS_PROMPT = `Wyekstrahuj dane z odpisu KRS. Zwróć TYLKO JSON (bez markdown):
{"nazwa":"","krs":"","nip":"","regon":"","forma":"","adres":"","kapital":0,"data":"","zarzad":[{"imie":"","nazwisko":"","funkcja":""}],"reprezentacja":"","pkd":[{"kod":"","opis":""}]}`;

const FIN_PROMPT = `Wyekstrahuj dane finansowe. Zwróć TYLKO JSON (bez markdown):
{"lata":[{"rok":2024,"przychody":0,"zysk":0,"bilans":0,"kapital":0,"zobowiazania":0}]}`;

/**
 * Ekstrakcja tekstu z PDF - z fallbackiem
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Próba 1: pdf-parse
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = typeof pdfParseModule === 'function'
            ? pdfParseModule
            : (pdfParseModule as { default?: unknown }).default || pdfParseModule;

        const data = await (pdfParse as (buffer: Buffer) => Promise<{ text: string }>)(buffer);

        if (data.text && data.text.length > 100) {
            console.log(`📄 pdf-parse: Extracted ${data.text.length} characters`);
            return data.text;
        }
        throw new Error('PDF text too short');
    } catch (error) {
        console.log('pdf-parse failed, falling back to Gemini Vision:', error);
        return ''; // Pusty tekst - użyjemy Gemini Vision
    }
}

/**
 * Analizuje PDF przez Gemini Vision (gdy pdf-parse nie działa)
 */
async function analyzeWithGeminiVision(pdfBuffer: Buffer, prompt: string): Promise<string> {
    // Użyj gemini-1.5-pro dla lepszego wsparcia PDF
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const base64 = pdfBuffer.toString('base64');

    try {
        console.log('Sending PDF to Gemini 1.5 Pro Vision...');
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
        ]);
        const text = result.response.text();
        console.log('Gemini Vision response:', text.substring(0, 200));
        return text;
    } catch (error) {
        console.error('Gemini Vision error:', error);
        throw new Error('Nie udało się przeanalizować PDF przez Gemini Vision');
    }
}

/**
 * Analizuje tekst przez Gemini (darmowy tier!)
 */
async function analyzeWithGemini(text: string, prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const truncatedText = text.slice(0, 15000);

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
    // Usuń markdown code blocks
    let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('No JSON found in:', text.substring(0, 200));
        throw new Error('Brak JSON w odpowiedzi AI');
    }

    let jsonStr = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

    return JSON.parse(jsonStr);
}

/**
 * Analizuje odpis KRS
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS document...');

    // 1. Próba ekstrakcji tekstu
    const text = await extractTextFromPDF(pdfBuffer);

    let response: string;

    if (text.length > 100) {
        // Mamy tekst - użyj Gemini text
        console.log('Using Gemini text analysis');
        response = await analyzeWithGemini(text, KRS_PROMPT);
    } else {
        // Brak tekstu - użyj Gemini Vision
        console.log('Using Gemini Vision for PDF');
        response = await analyzeWithGeminiVision(pdfBuffer, KRS_PROMPT);
    }

    console.log('Gemini response:', response.substring(0, 300));

    // Parsowanie
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

    // Excel - parsuj lokalnie
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // PDF - próbuj tekst, potem Vision
    const text = await extractTextFromPDF(buffer);

    let response: string;
    if (text.length > 100) {
        response = await analyzeWithGemini(text, FIN_PROMPT);
    } else {
        response = await analyzeWithGeminiVision(buffer, FIN_PROMPT);
    }

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
        console.error('Failed to parse financials');
        return [];
    }
}

/**
 * Parsuje Excel lokalnie
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
