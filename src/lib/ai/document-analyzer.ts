/**
 * Analizator dokumentów przez Gemini Vision
 * Ekstrahuje strukturyzowane dane z PDF i Excel
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model z obsługą Vision
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.1, // Niska dla dokładności ekstrakcji
        maxOutputTokens: 4096,
    },
});

/**
 * Prompt do ekstrakcji danych z odpisu KRS
 */
const KRS_EXTRACTION_PROMPT = `
Przeanalizuj załączony dokument - odpis z Krajowego Rejestru Sądowego.
Wyekstrahuj wszystkie dostępne dane i zwróć je w formacie JSON.

WYMAGANY FORMAT ODPOWIEDZI (tylko JSON, bez markdown):
{
  "nazwa": "pełna nazwa spółki",
  "krs": "numer KRS (10 cyfr)",
  "nip": "numer NIP (10 cyfr)",
  "regon": "numer REGON",
  "forma_prawna": "np. SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
  "adres": {
    "ulica": "nazwa ulicy z numerem",
    "kod_pocztowy": "XX-XXX",
    "miejscowosc": "miasto",
    "kraj": "POLSKA"
  },
  "kapital_zakladowy": 5000,
  "waluta": "PLN",
  "data_powstania": "YYYY-MM-DD",
  "zarzad": [
    { "imie": "Jan", "nazwisko": "Kowalski", "funkcja": "PREZES ZARZĄDU" }
  ],
  "sposob_reprezentacji": "opis sposobu reprezentacji",
  "wspolnicy": [
    { "nazwa": "Jan Kowalski", "udzialy_procent": 50, "wartosc_udzialow": 2500 }
  ],
  "pkd": [
    { "kod": "62.01.Z", "opis": "Działalność związana z oprogramowaniem", "przewazajace": true }
  ]
}

Jeśli jakieś pole nie jest dostępne w dokumencie, pomiń je lub ustaw null.
Zwróć TYLKO JSON, bez żadnego dodatkowego tekstu ani formatowania markdown.
`;

/**
 * Prompt do ekstrakcji danych finansowych
 */
const FINANCIAL_EXTRACTION_PROMPT = `
Przeanalizuj załączony dokument - sprawozdanie finansowe spółki.
Wyekstrahuj dane finansowe dla każdego roku obrotowego.

WYMAGANY FORMAT ODPOWIEDZI (tylko JSON, bez markdown):
{
  "lata": [
    {
      "rok": 2024,
      "przychody_netto": 1000000,
      "zysk_brutto": 150000,
      "zysk_netto": 120000,
      "suma_bilansowa": 2000000,
      "kapital_wlasny": 500000,
      "zobowiazania": 1500000,
      "aktywa_obrotowe": 800000,
      "aktywa_trwale": 1200000,
      "zatrudnienie": 15
    }
  ]
}

Wszystkie wartości finansowe podaj w PLN (pełne złotówki, bez groszy).
Jeśli jakieś pole nie jest dostępne, ustaw 0.
Zwróć TYLKO JSON, bez żadnego dodatkowego tekstu ani formatowania markdown.
`;

/**
 * Analizuje odpis KRS (PDF) i ekstrahuje dane
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS document with Gemini Vision...');

    const base64 = pdfBuffer.toString('base64');

    const result = await model.generateContent([
        KRS_EXTRACTION_PROMPT,
        {
            inlineData: {
                mimeType: 'application/pdf',
                data: base64,
            },
        },
    ]);

    const responseText = result.response.text();
    console.log('Raw KRS response:', responseText.substring(0, 500));

    // Wyciągnij JSON z odpowiedzi
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Nie udało się wyekstrahować danych z dokumentu KRS');
    }

    const data = JSON.parse(jsonMatch[0]);

    // Mapuj na typ KRSCompany
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
 * Analizuje sprawozdanie finansowe (PDF lub Excel) i ekstrahuje dane
 */
export async function analyzeFinancialDocument(
    buffer: Buffer,
    mimeType: string
): Promise<FinancialData[]> {
    console.log('📊 Analyzing financial document...');

    // Dla Excel - parsuj lokalnie
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // Dla PDF - użyj Gemini Vision
    const base64 = buffer.toString('base64');

    const result = await model.generateContent([
        FINANCIAL_EXTRACTION_PROMPT,
        {
            inlineData: {
                mimeType: 'application/pdf',
                data: base64,
            },
        },
    ]);

    const responseText = result.response.text();
    console.log('Raw financial response:', responseText.substring(0, 500));

    // Wyciągnij JSON z odpowiedzi
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.warn('Could not extract financial data, using empty array');
        return [];
    }

    const data = JSON.parse(jsonMatch[0]);

    // Mapuj na typ FinancialData
    return (data.lata || []).map((year: {
        rok: number;
        przychody_netto: number;
        zysk_brutto: number;
        zysk_netto: number;
        suma_bilansowa: number;
        kapital_wlasny: number;
        zobowiazania: number;
        aktywa_obrotowe: number;
        aktywa_trwale: number;
        zatrudnienie?: number;
    }) => ({
        rok: year.rok,
        przychodyNetto: year.przychody_netto || 0,
        zyskBrutto: year.zysk_brutto || 0,
        zyskNetto: year.zysk_netto || 0,
        sumaBilansowa: year.suma_bilansowa || 0,
        kapitalWlasny: year.kapital_wlasny || 0,
        zobowiazania: year.zobowiazania || 0,
        aktywaObrotowe: year.aktywa_obrotowe || 0,
        aktywaTrwale: year.aktywa_trwale || 0,
        zatrudnienie: year.zatrudnienie,
    }));
}

/**
 * Parsuje Excel z danymi finansowymi
 */
async function parseExcelFinancials(buffer: Buffer): Promise<FinancialData[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Znajdź arkusz z danymi
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Konwertuj na JSON
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Excel data rows:', data.length);

    // Próbuj zmapować dane - to zależy od struktury Excel
    // Tutaj zakładamy uproszczoną strukturę
    const financials: FinancialData[] = [];

    for (const row of data) {
        const r = row as Record<string, unknown>;
        // Szukaj roku w różnych kolumnach
        const rok = r['Rok'] || r['rok'] || r['Year'] || r['year'];
        if (rok && typeof rok === 'number') {
            financials.push({
                rok: rok,
                przychodyNetto: Number(r['Przychody'] || r['przychody_netto'] || r['Revenue'] || 0),
                zyskBrutto: Number(r['Zysk brutto'] || r['zysk_brutto'] || 0),
                zyskNetto: Number(r['Zysk netto'] || r['zysk_netto'] || r['Net Income'] || 0),
                sumaBilansowa: Number(r['Suma bilansowa'] || r['suma_bilansowa'] || r['Total Assets'] || 0),
                kapitalWlasny: Number(r['Kapitał własny'] || r['kapital_wlasny'] || r['Equity'] || 0),
                zobowiazania: Number(r['Zobowiązania'] || r['zobowiazania'] || r['Liabilities'] || 0),
                aktywaObrotowe: Number(r['Aktywa obrotowe'] || r['aktywa_obrotowe'] || 0),
                aktywaTrwale: Number(r['Aktywa trwałe'] || r['aktywa_trwale'] || 0),
                zatrudnienie: Number(r['Zatrudnienie'] || r['zatrudnienie'] || 0) || undefined,
            });
        }
    }

    // Jeśli nie udało się sparsować, użyj Gemini do analizy
    if (financials.length === 0) {
        console.log('Could not parse Excel directly, converting to text for AI analysis...');
        const textData = XLSX.utils.sheet_to_csv(sheet);

        const result = await model.generateContent([
            FINANCIAL_EXTRACTION_PROMPT + '\n\nDANE W FORMACIE CSV:\n' + textData,
        ]);

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return (parsed.lata || []).map((year: {
                rok: number;
                przychody_netto: number;
                zysk_brutto: number;
                zysk_netto: number;
                suma_bilansowa: number;
                kapital_wlasny: number;
                zobowiazania: number;
                aktywa_obrotowe: number;
                aktywa_trwale: number;
                zatrudnienie?: number;
            }) => ({
                rok: year.rok,
                przychodyNetto: year.przychody_netto || 0,
                zyskBrutto: year.zysk_brutto || 0,
                zyskNetto: year.zysk_netto || 0,
                sumaBilansowa: year.suma_bilansowa || 0,
                kapitalWlasny: year.kapital_wlasny || 0,
                zobowiazania: year.zobowiazania || 0,
                aktywaObrotowe: year.aktywa_obrotowe || 0,
                aktywaTrwale: year.aktywa_trwale || 0,
                zatrudnienie: year.zatrudnienie,
            }));
        }
    }

    return financials;
}
