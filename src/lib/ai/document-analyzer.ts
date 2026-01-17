/**
 * Analizator dokumentów - TYLKO GEMINI
 * Gemini z retry logic dla 429 errors
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Minimalne prompty
const KRS_PROMPT = `Przeanalizuj odpis KRS i zwróć TYLKO JSON (bez markdown):
{"nazwa":"","krs":"","nip":"","regon":"","forma":"","adres":"","kapital":0,"zarzad":[{"imie":"","nazwisko":"","funkcja":""}],"reprezentacja":"","pkd":[{"kod":"","opis":""}]}`;

const FIN_PROMPT = `Wyekstrahuj dane finansowe. Zwróć TYLKO JSON:
{"lata":[{"rok":2024,"przychody":0,"zysk":0,"bilans":0,"kapital":0,"zobowiazania":0}]}`;

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analizuje PDF przez Gemini z retry
 */
async function analyzeWithGemini(pdfBuffer: Buffer, prompt: string, retries = 3): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const base64 = pdfBuffer.toString('base64');

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Gemini attempt ${attempt}/${retries}...`);

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
            console.log('Gemini response:', text.substring(0, 200));
            return text;
        } catch (error) {
            const err = error as { status?: number; message?: string };
            console.error(`Gemini attempt ${attempt} failed:`, err.message || error);

            if (err.message?.includes('429') || err.message?.includes('quota')) {
                // Rate limit - wait and retry
                const waitTime = attempt * 35000; // 35s, 70s, 105s
                console.log(`Rate limited, waiting ${waitTime / 1000}s...`);
                await sleep(waitTime);
            } else if (attempt === retries) {
                throw new Error(`Gemini API error after ${retries} attempts: ${err.message || 'unknown'}`);
            } else {
                await sleep(5000);
            }
        }
    }

    throw new Error('Gemini analysis failed');
}

/**
 * Parsuje JSON z odpowiedzi AI
 */
function parseJSON(text: string): Record<string, unknown> {
    let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('No JSON in:', text.substring(0, 300));
        throw new Error('Brak JSON w odpowiedzi');
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
    console.log('📄 Analyzing KRS document with Gemini...');

    const response = await analyzeWithGemini(pdfBuffer, KRS_PROMPT);
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

    // Excel - parsuj lokalnie (0 API)
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // PDF - Gemini
    const response = await analyzeWithGemini(buffer, FIN_PROMPT);

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
        return [];
    }
}

/**
 * Parsuje Excel lokalnie (0 API!)
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
