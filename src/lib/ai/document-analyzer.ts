/**
 * Analizator dokumentów - Firebase Vertex AI
 * Używa Firebase project z billing dla wyższych limitów
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { KRSCompany, FinancialData, OfferDocumentData } from '@/types';

// Firebase config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize Firebase (singleton)
function getFirebaseApp() {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

// Minimalne prompty
const KRS_PROMPT = `Przeanalizuj odpis KRS i zwróć TYLKO JSON (bez markdown):
{"nazwa":"","krs":"","nip":"","regon":"","forma":"","adres":"","kapital":0,"zarzad":[{"imie":"","nazwisko":"","funkcja":""}],"reprezentacja":"","pkd":[{"kod":"","opis":""}]}`;

// Rozszerzony prompt dla danych finansowych
const FIN_PROMPT = `Przeanalizuj sprawozdanie finansowe i wyekstrahuj WSZYSTKIE dane liczbowe.
Szukaj wartości w bilansie, rachunku zysków i strat, oraz informacji dodatkowych.

Zwróć TYLKO JSON (bez markdown, bez komentarzy):
{
  "lata": [
    {
      "rok": 2025,
      "przychody": 0,
      "koszt_wlasny": 0,
      "zysk_brutto": 0,
      "zysk_netto": 0,
      "bilans": 0,
      "aktywa_trwale": 0,
      "aktywa_obrotowe": 0,
      "zapasy": 0,
      "naleznosci": 0,
      "srodki_pieniezne": 0,
      "kapital_wlasny": 0,
      "kapital_zakladowy": 0,
      "kapital_zapasowy": 0,
      "zysk_z_lat_ubieglych": 0,
      "zobowiazania": 0,
      "zobowiazania_dlugoterminowe": 0,
      "zobowiazania_krotkoterminowe": 0,
      "zatrudnienie": 0
    }
  ]
}

WAŻNE:
- Szukaj danych za WSZYSTKIE lata w dokumencie (zwłaszcza 2023, 2024, 2025)
- Podawaj wartości w PLN (jeśli podane w tys. PLN, pomnóż przez 1000)
- Jeśli brak jakiejś wartości, wpisz 0
- Przychody to "Przychody netto ze sprzedaży" lub "Przychody ze sprzedaży produktów"
- Bilans to "Aktywa razem" lub "Suma bilansowa" lub "Pasywa razem"
- Kapitał własny może być opisany jako "Kapitał (fundusz) własny"`;


/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analizuje PDF przez Firebase Vertex AI Gemini
 */
async function analyzeWithGemini(pdfBuffer: Buffer, prompt: string, retries = 3): Promise<string> {
    const app = getFirebaseApp();
    const vertexAI = getVertexAI(app);
    const model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });

    const base64 = pdfBuffer.toString('base64');

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Firebase Vertex AI attempt ${attempt}/${retries}...`);

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
            const err = error as { message?: string };
            console.error(`Attempt ${attempt} failed:`, err.message || error);

            if (err.message?.includes('429') || err.message?.includes('quota')) {
                const waitTime = attempt * 30000;
                console.log(`Rate limited, waiting ${waitTime / 1000}s...`);
                await sleep(waitTime);
            } else if (attempt === retries) {
                throw new Error(`Gemini error: ${err.message || 'unknown'}`);
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

    return JSON.parse(jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
}

/**
 * Analizuje odpis KRS
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS with Firebase Vertex AI...');

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

    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    const response = await analyzeWithGemini(buffer, FIN_PROMPT);

    try {
        const d = parseJSON(response) as {
            lata?: Array<{
                rok: number;
                przychody?: number;
                zysk_brutto?: number;
                zysk_netto?: number;
                zysk?: number;
                bilans?: number;
                aktywa_trwale?: number;
                aktywa_obrotowe?: number;
                kapital_wlasny?: number;
                kapital?: number;
                zobowiazania?: number;
                zobowiazania_dlugoterminowe?: number;
                zobowiazania_krotkoterminowe?: number;
                zatrudnienie?: number;
            }>
        };

        return (d.lata || []).map(y => ({
            rok: y.rok,
            przychodyNetto: y.przychody || 0,
            zyskBrutto: y.zysk_brutto || y.zysk || 0,
            zyskNetto: y.zysk_netto || y.zysk || 0,
            sumaBilansowa: y.bilans || 0,
            kapitalWlasny: y.kapital_wlasny || y.kapital || 0,
            zobowiazania: y.zobowiazania || (y.zobowiazania_dlugoterminowe || 0) + (y.zobowiazania_krotkoterminowe || 0),
            aktywaObrotowe: y.aktywa_obrotowe || 0,
            aktywaTrwale: y.aktywa_trwale || 0,
            zatrudnienie: y.zatrudnienie || 0,
        }));
    } catch {
        return [];
    }
}

async function parseExcelFinancials(buffer: Buffer): Promise<FinancialData[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log('📊 Parsing Excel with', workbook.SheetNames.length, 'sheets');

    const financials: FinancialData[] = [];

    // Funkcja do znalezienia wartości po wzorcu nazwy
    const findValue = (row: Record<string, unknown>, patterns: string[]): number => {
        for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            for (const pattern of patterns) {
                if (keyLower.includes(pattern.toLowerCase())) {
                    const val = row[key];
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                        const num = parseFloat(val.replace(/[\s,]/g, '').replace(',', '.'));
                        if (!isNaN(num)) return num;
                    }
                }
            }
        }
        return 0;
    };

    // Sprawdź wszystkie arkusze
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`  Sheet "${sheetName}":`, data.length, 'rows');

        for (const row of data) {
            const r = row as Record<string, unknown>;

            // Szukaj roku w różnych formatach
            let rok = 0;
            for (const key of Object.keys(r)) {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('rok') || keyLower.includes('year') || keyLower.includes('okres')) {
                    const val = r[key];
                    if (typeof val === 'number' && val > 2000 && val < 2100) {
                        rok = val;
                        break;
                    }
                }
            }

            // Jeśli nie znaleziono roku, spróbuj wyciągnąć z pierwszej kolumny
            if (rok === 0) {
                const firstVal = Object.values(r)[0];
                if (typeof firstVal === 'number' && firstVal > 2000 && firstVal < 2100) {
                    rok = firstVal;
                }
            }

            if (rok > 0) {
                const existing = financials.find(f => f.rok === rok);
                if (existing) {
                    // Uzupełnij brakujące dane
                    if (!existing.przychodyNetto) existing.przychodyNetto = findValue(r, ['przychod', 'revenue', 'sprzedaż']);
                    if (!existing.zyskNetto) existing.zyskNetto = findValue(r, ['zysk netto', 'net profit', 'wynik netto']);
                    if (!existing.zyskBrutto) existing.zyskBrutto = findValue(r, ['zysk brutto', 'gross profit']);
                    if (!existing.sumaBilansowa) existing.sumaBilansowa = findValue(r, ['suma bilansowa', 'aktywa razem', 'total assets']);
                    if (!existing.kapitalWlasny) existing.kapitalWlasny = findValue(r, ['kapitał własny', 'equity', 'fundusz własny']);
                    if (!existing.zobowiazania) existing.zobowiazania = findValue(r, ['zobowiązania', 'liabilities']);
                    if (!existing.aktywaObrotowe) existing.aktywaObrotowe = findValue(r, ['aktywa obrotowe', 'current assets']);
                    if (!existing.aktywaTrwale) existing.aktywaTrwale = findValue(r, ['aktywa trwałe', 'fixed assets']);
                } else {
                    financials.push({
                        rok,
                        przychodyNetto: findValue(r, ['przychod', 'revenue', 'sprzedaż']),
                        zyskBrutto: findValue(r, ['zysk brutto', 'gross profit']),
                        zyskNetto: findValue(r, ['zysk netto', 'net profit', 'wynik netto']),
                        sumaBilansowa: findValue(r, ['suma bilansowa', 'aktywa razem', 'total assets']),
                        kapitalWlasny: findValue(r, ['kapitał własny', 'equity', 'fundusz własny']),
                        zobowiazania: findValue(r, ['zobowiązania', 'liabilities']),
                        aktywaObrotowe: findValue(r, ['aktywa obrotowe', 'current assets']),
                        aktywaTrwale: findValue(r, ['aktywa trwałe', 'fixed assets']),
                    });
                }
            }
        }
    }

    // Sortuj chronologicznie
    financials.sort((a, b) => a.rok - b.rok);

    console.log('📊 Extracted', financials.length, 'years of data');
    return financials;
}

// Prompt dla dokumentu ofertowego
const OFFER_PROMPT = `Przeanalizuj ten dokument dotyczący emisji akcji (warunki oferty, uchwała WZA, memorandum).
Wyekstrahuj parametry oferty i zwróć TYLKO JSON (bez markdown):
{
  "seria": "seria akcji np. B, C",
  "liczba": 100000,
  "nominalna": 0.10,
  "cena": 5.00,
  "cele": "opis celów emisji",
  "termin": "data rozpoczęcia - data zakończenia",
  "miejsce": "gdzie składać zapisy",
  "minLiczba": 100,
  "firma": "nazwa firmy inwestycyjnej jeśli jest",
  "uchwala": "numer uchwały WZA",
  "dataUchwaly": "data uchwały",
  "gwarancja": "czy jest gwarancja emisji"
}
Jeśli jakiejś informacji nie ma w dokumencie, użyj null.`;

/**
 * Analizuje dokument z parametrami oferty (warunki emisji, uchwała WZA)
 */
export async function analyzeOfferDocument(pdfBuffer: Buffer): Promise<OfferDocumentData> {
    console.log('📋 Analyzing offer document with Firebase Vertex AI...');

    const response = await analyzeWithGemini(pdfBuffer, OFFER_PROMPT);

    try {
        const d = parseJSON(response) as Record<string, unknown>;

        return {
            seriaAkcji: d.seria ? String(d.seria) : undefined,
            liczbaAkcji: d.liczba ? Number(d.liczba) : undefined,
            wartoscNominalna: d.nominalna ? Number(d.nominalna) : undefined,
            cenaEmisyjna: d.cena ? Number(d.cena) : undefined,
            celeEmisji: d.cele ? String(d.cele) : undefined,
            terminSubskrypcji: d.termin ? String(d.termin) : undefined,
            miejsceZapisow: d.miejsce ? String(d.miejsce) : undefined,
            minimalnaLiczbaAkcji: d.minLiczba ? Number(d.minLiczba) : undefined,
            firmaInwestycyjna: d.firma ? String(d.firma) : undefined,
            uchwalaWZA: d.uchwala ? String(d.uchwala) : undefined,
            dataUchwaly: d.dataUchwaly ? String(d.dataUchwaly) : undefined,
            gwarancjaEmisji: d.gwarancja ? String(d.gwarancja) : undefined,
        };
    } catch (error) {
        console.error('Error parsing offer document:', error);
        return {};
    }
}
