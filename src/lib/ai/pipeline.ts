/**
 * Zaawansowany generator memorandum z pipeline'em sekcyjnym
 * Każda sekcja dokumentu jest generowana przez dedykowany prompt AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData, RiskFactor, MemorandumContext } from '@/types';
import { getKeyArticlesForMemorandum, formatArticlesForAI } from '@/lib/knowledge/ksh';
import {
    LEGAL_SYSTEM_PROMPT,
    INTRO_SECTION_PROMPT,
    CAPITAL_SECTION_PROMPT,
    BOARD_SECTION_PROMPT,
    BUSINESS_SECTION_PROMPT,
    FINANCIALS_SECTION_PROMPT,
    RISK_ANALYSIS_PROMPT,
    SUMMARY_SECTION_PROMPT,
} from './prompts/system';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Konfiguracja modelu
const modelConfig = {
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.3, // Niska temperatura dla spójności prawniczej
        topP: 0.8,
        maxOutputTokens: 4096,
    },
};

/**
 * Struktura wygenerowanych sekcji memorandum
 */
export interface GeneratedSections {
    intro: string;
    capital: string;
    board: string;
    business: string;
    financials: string;
    risks: RiskFactor[];
    summary: string;
}

/**
 * Główny pipeline generowania memorandum
 */
export async function generateMemorandumSections(
    company: KRSCompany,
    financials: FinancialData[]
): Promise<GeneratedSections> {
    console.log('🚀 Starting AI memorandum generation pipeline...');

    // 1. Pobierz kontekst prawny z KSH
    console.log('📚 Loading relevant KSH articles...');
    const kshArticles = await getKeyArticlesForMemorandum(company.formaOrganizacyjna || 'sp. z o.o.');

    // 2. Przygotuj dane wskaźnikowe
    const ratios = calculateRatios(financials);

    // 3. Generuj sekcje równolegle (gdzie możliwe)
    console.log('✍️ Generating sections in parallel...');

    const [intro, capital, board, business] = await Promise.all([
        generateIntroSection(company),
        generateCapitalSection(company, kshArticles.capital),
        generateBoardSection(company, kshArticles.board),
        generateBusinessSection(company),
    ]);

    // 4. Sekcje finansowe i ryzyka (sekwencyjnie - ryzyka potrzebują kontekstu)
    console.log('📊 Generating financial analysis...');
    const financialsSection = await generateFinancialsSection(company, financials, ratios);

    console.log('⚠️ Analyzing risks...');
    const risks = await generateRisksSection(company, financials, ratios, kshArticles);

    // 5. Podsumowanie (potrzebuje wszystkich danych)
    console.log('📝 Generating summary...');
    const summary = await generateSummarySection(company, financials, risks);

    console.log('✅ All sections generated successfully!');

    return {
        intro,
        capital,
        board,
        business,
        financials: financialsSection,
        risks,
        summary,
    };
}

/**
 * Generuje sekcję wstępną
 */
async function generateIntroSection(company: KRSCompany): Promise<string> {
    const prompt = INTRO_SECTION_PROMPT
        .replace('{company_data}', JSON.stringify({
            nazwa: company.nazwa,
            krs: company.krs,
            nip: company.nip,
            regon: company.regon,
            siedziba: company.siedzibaAdres,
            forma: company.formaOrganizacyjna,
            dataPowstania: company.dataPowstania,
        }, null, 2));

    return callGemini(prompt);
}

/**
 * Generuje sekcję o kapitale
 */
async function generateCapitalSection(
    company: KRSCompany,
    kshArticles: { Article: string; Content: string }[]
): Promise<string> {
    const prompt = CAPITAL_SECTION_PROMPT
        .replace('{kapital}', company.kapitalZakladowy?.toLocaleString('pl-PL') || 'brak danych')
        .replace('{forma}', company.formaOrganizacyjna || 'brak danych')
        .replace('{data_powstania}', company.dataPowstania || 'brak danych')
        .replace('{wspolnicy}', JSON.stringify(company.wspolnicy || []))
        .replace('{ksh_articles}', formatArticlesForAI(kshArticles));

    return callGemini(prompt);
}

/**
 * Generuje sekcję o zarządzie
 */
async function generateBoardSection(
    company: KRSCompany,
    kshArticles: { Article: string; Content: string }[]
): Promise<string> {
    const prompt = BOARD_SECTION_PROMPT
        .replace('{reprezentacja}', JSON.stringify(company.reprezentacja || []))
        .replace('{sposob_reprezentacji}', company.sposobReprezentacji || 'brak danych')
        .replace('{forma}', company.formaOrganizacyjna || 'brak danych')
        .replace('{ksh_articles}', formatArticlesForAI(kshArticles));

    return callGemini(prompt);
}

/**
 * Generuje sekcję o przedmiocie działalności
 */
async function generateBusinessSection(company: KRSCompany): Promise<string> {
    const prompt = BUSINESS_SECTION_PROMPT
        .replace('{pkd_lista}', JSON.stringify(company.pkd || []))
        .replace('{pkd_przewazajace}', company.pkdPrzewazajace || 'brak danych')
        .replace('{nazwa}', company.nazwa || 'brak danych')
        .replace('{data_powstania}', company.dataPowstania || 'brak danych')
        .replace('{siedziba}', company.siedzibaAdres || 'brak danych');

    return callGemini(prompt);
}

/**
 * Generuje sekcję finansową
 */
async function generateFinancialsSection(
    company: KRSCompany,
    financials: FinancialData[],
    ratios: FinancialRatios
): Promise<string> {
    const financialsTable = financials.map(f => ({
        rok: f.rok,
        przychody: formatPLN(f.przychodyNetto),
        zysk: formatPLN(f.zyskNetto),
        sumaBilansowa: formatPLN(f.sumaBilansowa),
        kapitalWlasny: formatPLN(f.kapitalWlasny),
    }));

    const prompt = FINANCIALS_SECTION_PROMPT
        .replace('{financials_table}', JSON.stringify(financialsTable, null, 2))
        .replace('{plynnosc}', ratios.plynnosc.toFixed(2))
        .replace('{rentownosc}', ratios.rentownosc.toFixed(1))
        .replace('{zadluzenie}', ratios.zadluzenie.toFixed(1))
        .replace('{dynamika}', ratios.dynamikaPrzychodow.toFixed(1));

    return callGemini(prompt);
}

/**
 * Generuje analizę ryzyka (zwraca structured JSON)
 */
async function generateRisksSection(
    company: KRSCompany,
    financials: FinancialData[],
    ratios: FinancialRatios,
    kshArticles: Awaited<ReturnType<typeof getKeyArticlesForMemorandum>>
): Promise<RiskFactor[]> {
    const prompt = RISK_ANALYSIS_PROMPT
        .replace('{company_data}', JSON.stringify({
            nazwa: company.nazwa,
            forma: company.formaOrganizacyjna,
            kapital: company.kapitalZakladowy,
            zarzad: company.reprezentacja,
            pkd: company.pkdPrzewazajace,
            dataPowstania: company.dataPowstania,
        }, null, 2))
        .replace('{financials}', JSON.stringify(financials, null, 2))
        .replace('{ratios}', JSON.stringify(ratios, null, 2))
        .replace('{ksh_context}', formatArticlesForAI([
            ...kshArticles.capital,
            ...kshArticles.board,
            ...kshArticles.liability,
        ].slice(0, 5)));

    const response = await callGemini(prompt, true);

    try {
        // Wyciągnij JSON z odpowiedzi
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((r: Record<string, string>) => ({
                kategoria: r.kategoria || 'operacyjne',
                tytul: r.tytul,
                opis: r.opis,
                istotnosc: r.istotnosc || 'srednia',
            }));
        }
    } catch (e) {
        console.error('Failed to parse risks JSON:', e);
    }

    // Fallback ryzyka
    return getDefaultRisks(company, ratios);
}

/**
 * Generuje podsumowanie
 */
async function generateSummarySection(
    company: KRSCompany,
    financials: FinancialData[],
    risks: RiskFactor[]
): Promise<string> {
    const latestFinancials = financials[financials.length - 1] || {};
    const yearsInBusiness = company.dataPowstania
        ? new Date().getFullYear() - new Date(company.dataPowstania).getFullYear()
        : 0;

    const topRisks = risks
        .filter(r => r.istotnosc === 'wysoka')
        .slice(0, 3)
        .map(r => `• ${r.tytul}`)
        .join('\n');

    const prompt = SUMMARY_SECTION_PROMPT
        .replace('{nazwa}', company.nazwa || 'Spółka')
        .replace('{forma}', company.formaOrganizacyjna || 'brak danych')
        .replace('{kapital}', formatPLN(company.kapitalZakladowy || 0))
        .replace('{pkd}', company.pkdPrzewazajace || 'brak danych')
        .replace('{lata_dzialalnosci}', yearsInBusiness.toString())
        .replace('{przychody}', formatPLN(latestFinancials.przychodyNetto || 0))
        .replace('{zysk}', formatPLN(latestFinancials.zyskNetto || 0))
        .replace('{suma_bilansowa}', formatPLN(latestFinancials.sumaBilansowa || 0))
        .replace('{ryzyka}', topRisks || 'Brak zidentyfikowanych ryzyk wysokiego poziomu');

    return callGemini(prompt);
}

/**
 * Wywołuje Gemini API
 */
async function callGemini(userPrompt: string, expectJson: boolean = false): Promise<string> {
    try {
        const model = genAI.getGenerativeModel(modelConfig);

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: LEGAL_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Rozumiem. Jestem gotowy do sporządzenia profesjonalnego memorandum informacyjnego zgodnie z polskim prawem.' }] },
                { role: 'user', parts: [{ text: userPrompt }] },
            ],
        });

        return result.response.text();
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error(`AI generation failed: ${error}`);
    }
}

/**
 * Interfejs wskaźników finansowych
 */
interface FinancialRatios {
    plynnosc: number;
    rentownosc: number;
    zadluzenie: number;
    dynamikaPrzychodow: number;
}

/**
 * Oblicza wskaźniki finansowe
 */
function calculateRatios(financials: FinancialData[]): FinancialRatios {
    if (financials.length === 0) {
        return { plynnosc: 0, rentownosc: 0, zadluzenie: 0, dynamikaPrzychodow: 0 };
    }

    const latest = financials[financials.length - 1];
    const previous = financials.length > 1 ? financials[financials.length - 2] : null;

    // Płynność (uproszczona - kapitał własny / zobowiązania)
    const zobowiazania = (latest.sumaBilansowa || 0) - (latest.kapitalWlasny || 0);
    const plynnosc = zobowiazania > 0 ? (latest.kapitalWlasny || 0) / zobowiazania : 1;

    // Rentowność netto
    const rentownosc = latest.przychodyNetto
        ? ((latest.zyskNetto || 0) / latest.przychodyNetto) * 100
        : 0;

    // Zadłużenie
    const zadluzenie = latest.sumaBilansowa
        ? (zobowiazania / latest.sumaBilansowa) * 100
        : 0;

    // Dynamika przychodów r/r
    const dynamikaPrzychodow = previous?.przychodyNetto
        ? ((latest.przychodyNetto - previous.przychodyNetto) / previous.przychodyNetto) * 100
        : 0;

    return { plynnosc, rentownosc, zadluzenie, dynamikaPrzychodow };
}

/**
 * Formatuje kwotę jako PLN
 */
function formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Domyślne ryzyka w przypadku błędu AI
 */
function getDefaultRisks(company: KRSCompany, ratios: FinancialRatios): RiskFactor[] {
    const risks: RiskFactor[] = [
        {
            kategoria: 'finansowe',
            tytul: 'Ryzyko płynności finansowej',
            opis: `Spółka może być narażona na ryzyko braku wystarczających środków pieniężnych na pokrycie bieżących zobowiązań. Wskaźnik płynności wynosi ${ratios.plynnosc.toFixed(2)}.`,
            istotnosc: ratios.plynnosc < 1 ? 'wysoka' : 'srednia',
        },
        {
            kategoria: 'operacyjne',
            tytul: 'Ryzyko zależności od kluczowych osób',
            opis: `Działalność spółki może być uzależniona od kompetencji i zaangażowania kluczowych członków zarządu. Nagła utrata tych osób mogłaby negatywnie wpłynąć na kontynuację działalności.`,
            istotnosc: (company.reprezentacja?.length || 0) <= 1 ? 'wysoka' : 'srednia',
        },
        {
            kategoria: 'rynkowe',
            tytul: 'Ryzyko konkurencji rynkowej',
            opis: 'Intensyfikacja działań konkurencji może wpłynąć negatywnie na pozycję rynkową i wyniki finansowe spółki.',
            istotnosc: 'srednia',
        },
    ];

    // Dodaj ryzyko kapitałowe jeśli kapitał jest niski
    if ((company.kapitalZakladowy || 0) <= 5000) {
        risks.push({
            kategoria: 'prawne',
            tytul: 'Ryzyko niedokapitalizowania',
            opis: `Kapitał zakładowy spółki wynosi ${formatPLN(company.kapitalZakladowy || 0)}, co stanowi ustawowe minimum dla spółki z ograniczoną odpowiedzialnością. Ogranicza to zdolność do absorbowania ewentualnych strat.`,
            istotnosc: 'wysoka',
        });
    }

    // Dodaj ryzyko rentowności jeśli ujemna
    if (ratios.rentownosc < 0) {
        risks.push({
            kategoria: 'finansowe',
            tytul: 'Ryzyko generowania strat',
            opis: `Spółka wykazuje ujemną rentowność (${ratios.rentownosc.toFixed(1)}%), co oznacza generowanie strat z działalności operacyjnej. Kontynuacja tego trendu może zagrozić stabilności finansowej.`,
            istotnosc: 'wysoka',
        });
    }

    return risks;
}

/**
 * Konwertuje wygenerowane sekcje na kontekst dokumentu
 */
export function sectionsToMemorandumContext(
    company: KRSCompany,
    financials: FinancialData[],
    sections: GeneratedSections
): MemorandumContext {
    return {
        // Dane bazowe
        nazwa_spolki: company.nazwa || 'Nieznana spółka',
        nip: company.nip || '',
        krs: company.krs || '',
        regon: company.regon || '',
        forma_prawna: company.formaOrganizacyjna || '',
        adres_pelny: company.siedzibaAdres || '',
        data_powstania: company.dataPowstania || '',
        kapital_zakladowy: company.kapitalZakladowy?.toLocaleString('pl-PL') || '0',
        waluta: 'PLN',

        // Reprezentacja
        reprezentacja: company.reprezentacja || [],
        sposob_reprezentacji: company.sposobReprezentacji || '',

        // PKD
        pkd_przewazajace: company.pkdPrzewazajace || '',

        // Finanse
        finanse: financials,

        // Wygenerowane przez AI
        ryzyka: sections.risks,
        podsumowanie_ai: sections.summary,

        // Dodatkowe sekcje AI
        sekcja_wstep: sections.intro,
        sekcja_kapital: sections.capital,
        sekcja_zarzad: sections.board,
        sekcja_dzialalnosc: sections.business,
        sekcja_finanse: sections.financials,

        // Metadata
        data_generacji: new Date().toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }),
    };
}
