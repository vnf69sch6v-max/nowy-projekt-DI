/**
 * Analizator dokumentów przez Gemini Vision
 * Z retry logic i obsługą rate limiting
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Konfiguracja modelu
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
    },
});

// Rate limiting
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000; // 5 sekund

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper z retry i exponential backoff
 */
async function callGeminiWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    attempt: number = 1
): Promise<T> {
    try {
        return await operation();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota')) {
            if (attempt < MAX_RETRIES) {
                const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`⏳ Rate limit hit for ${operationName}, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
                await delay(waitTime);
                return callGeminiWithRetry(operation, operationName, attempt + 1);
            }

            // Po wyczerpaniu prób - zwróć przyjazny komunikat
            throw new Error(`Przekroczono limit API Gemini. Poczekaj kilka minut i spróbuj ponownie. (Pozostała przerwa: ~45 sekund)`);
        }

        throw error;
    }
}

/**
 * Prompt do ekstrakcji danych z odpisu KRS
 */
const KRS_EXTRACTION_PROMPT = `
Przeanalizuj załączony dokument - odpis z Krajowego Rejestru Sądowego.
Wyekstrahuj wszystkie dostępne dane i zwróć je w formacie JSON.

WYMAGANY FORMAT (tylko JSON, bez markdown):
{
  "nazwa": "pełna nazwa spółki",
  "krs": "numer KRS",
  "nip": "numer NIP",
  "regon": "numer REGON",
  "forma_prawna": "np. SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
  "adres": {
    "ulica": "nazwa ulicy z numerem",
    "kod_pocztowy": "XX-XXX",
    "miejscowosc": "miasto"
  },
  "kapital_zakladowy": 5000,
  "data_powstania": "YYYY-MM-DD",
  "zarzad": [
    { "imie": "Jan", "nazwisko": "Kowalski", "funkcja": "PREZES ZARZĄDU" }
  ],
  "sposob_reprezentacji": "opis",
  "wspolnicy": [
    { "nazwa": "Jan Kowalski", "udzialy_procent": 50 }
  ],
  "pkd": [
    { "kod": "62.01.Z", "opis": "Działalność związana z oprogramowaniem", "przewazajace": true }
  ]
}

Zwróć TYLKO JSON.
`;

/**
 * Prompt do ekstrakcji danych finansowych
 */
const FINANCIAL_EXTRACTION_PROMPT = `
Przeanalizuj załączony dokument - sprawozdanie finansowe.
Wyekstrahuj dane finansowe dla każdego roku.

WYMAGANY FORMAT (tylko JSON):
{
  "lata": [
    {
      "rok": 2024,
      "przychody_netto": 1000000,
      "zysk_netto": 120000,
      "suma_bilansowa": 2000000,
      "kapital_wlasny": 500000,
      "zobowiazania": 1500000
    }
  ]
}

Wszystkie wartości w PLN. Zwróć TYLKO JSON.
`;

/**
 * Analizuje odpis KRS
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS document with Gemini Vision...');

    const base64 = pdfBuffer.toString('base64');

    const operation = async () => {
        const result = await model.generateContent([
            KRS_EXTRACTION_PROMPT,
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
        ]);
        return result.response.text();
    };

    const responseText = await callGeminiWithRetry(operation, 'KRS analysis');
    console.log('Raw KRS response:', responseText.substring(0, 300));

    // Wyciągnij JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Nie udało się wyekstrahować danych z dokumentu KRS. Upewnij się, że to poprawny odpis.');
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
        krs: data.krs || '',
        nip: data.nip || '',
        regon: data.regon || '',
        nazwa: data.nazwa || 'Nieznana spółka',
        formaOrganizacyjna: data.forma_prawna || '',
        siedzibaAdres: data.adres
            ? `${data.adres.ulica || ''}, ${data.adres.kod_pocztowy || ''} ${data.adres.miejscowosc || ''}`
            : '',
        kapitalZakladowy: data.kapital_zakladowy || 0,
        dataPowstania: data.data_powstania || '',
        reprezentacja: (data.zarzad || []).map((z: { imie: string; nazwisko: string; funkcja: string }) => ({
            imie: z.imie,
            nazwisko: z.nazwisko,
            funkcja: z.funkcja,
        })),
        sposobReprezentacji: data.sposob_reprezentacji || '',
        wspolnicy: (data.wspolnicy || []).map((w: { nazwa: string; udzialy_procent?: number; wartosc_udzialow?: number }) => ({
            nazwa: w.nazwa,
            udzialy: w.udzialy_procent,
            wartoscUdzialow: w.wartosc_udzialow,
        })),
        pkd: (data.pkd || []).map((p: { kod: string; opis: string; przewazajace?: boolean }) => ({
            kod: p.kod,
            opis: p.opis,
            przewazajaca: p.przewazajace || false,
        })),
        pkdPrzewazajace: data.pkd?.find((p: { przewazajace?: boolean }) => p.przewazajace)?.opis || data.pkd?.[0]?.opis || '',
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

    // Dla Excel - parsuj lokalnie (bez API call)
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // Dla PDF - użyj Gemini Vision z retry
    const base64 = buffer.toString('base64');

    const operation = async () => {
        const result = await model.generateContent([
            FINANCIAL_EXTRACTION_PROMPT,
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
        ]);
        return result.response.text();
    };

    try {
        const responseText = await callGeminiWithRetry(operation, 'Financial analysis');
        console.log('Raw financial response:', responseText.substring(0, 300));

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('Could not extract financial data from PDF');
            return [];
        }

        const data = JSON.parse(jsonMatch[0]);

        return (data.lata || []).map((year: {
            rok: number;
            przychody_netto: number;
            zysk_brutto?: number;
            zysk_netto: number;
            suma_bilansowa: number;
            kapital_wlasny: number;
            zobowiazania: number;
            aktywa_obrotowe?: number;
            aktywa_trwale?: number;
        }) => ({
            rok: year.rok,
            przychodyNetto: year.przychody_netto || 0,
            zyskBrutto: year.zysk_brutto || year.zysk_netto || 0,
            zyskNetto: year.zysk_netto || 0,
            sumaBilansowa: year.suma_bilansowa || 0,
            kapitalWlasny: year.kapital_wlasny || 0,
            zobowiazania: year.zobowiazania || 0,
            aktywaObrotowe: year.aktywa_obrotowe || 0,
            aktywaTrwale: year.aktywa_trwale || 0,
        }));
    } catch (error) {
        console.error('Financial analysis failed:', error);
        return []; // Zwróć pustą tablicę - użyje mock
    }
}

/**
 * Parsuje Excel lokalnie (bez API)
 */
async function parseExcelFinancials(buffer: Buffer): Promise<FinancialData[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log('Excel data rows:', data.length);

    const financials: FinancialData[] = [];

    for (const row of data) {
        const r = row as Record<string, unknown>;
        const rok = r['Rok'] || r['rok'] || r['Year'];
        if (rok && typeof rok === 'number') {
            financials.push({
                rok: rok,
                przychodyNetto: Number(r['Przychody'] || r['przychody_netto'] || 0),
                zyskBrutto: Number(r['Zysk brutto'] || r['zysk_brutto'] || 0),
                zyskNetto: Number(r['Zysk netto'] || r['zysk_netto'] || 0),
                sumaBilansowa: Number(r['Suma bilansowa'] || r['suma_bilansowa'] || 0),
                kapitalWlasny: Number(r['Kapitał własny'] || r['kapital_wlasny'] || 0),
                zobowiazania: Number(r['Zobowiązania'] || r['zobowiazania'] || 0),
                aktywaObrotowe: Number(r['Aktywa obrotowe'] || 0),
                aktywaTrwale: Number(r['Aktywa trwałe'] || 0),
            });
        }
    }

    return financials;
}
