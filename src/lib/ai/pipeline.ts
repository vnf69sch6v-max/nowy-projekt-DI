/**
 * Zaawansowany generator memorandum z pipeline'em sekcyjnym
 * Każda sekcja dokumentu jest generowana przez dedykowany prompt AI
 * 
 * UWAGA: Wywołania są sekwencyjne z opóźnieniami, aby uniknąć rate limiting
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
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 2048, // Zmniejszone dla szybszych odpowiedzi
    },
};

// Opóźnienie między wywołaniami (ms)
const API_DELAY_MS = 1500;

// Maksymalna liczba prób
const MAX_RETRIES = 3;

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
 * Helper: opóźnienie
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Główny pipeline generowania memorandum
 * SEKWENCYJNY aby uniknąć rate limiting
 */
export async function generateMemorandumSections(
    company: KRSCompany,
    financials: FinancialData[]
): Promise<GeneratedSections> {
    console.log('🚀 Starting AI memorandum generation pipeline (sequential mode)...');

    // 1. Pobierz kontekst prawny z KSH
    console.log('📚 Loading relevant KSH articles...');
    const kshArticles = await getKeyArticlesForMemorandum(company.formaOrganizacyjna || 'sp. z o.o.');

    // 2. Przygotuj dane wskaźnikowe
    const ratios = calculateRatios(financials);

    // 3. Generuj sekcje SEKWENCYJNIE z opóźnieniami
    console.log('✍️ Generating sections sequentially...');

    // Wstęp
    console.log('  → Generating intro...');
    const intro = await safeGenerateSection(() => generateIntroSection(company), getDefaultIntro(company));
    await delay(API_DELAY_MS);

    // Kapitał
    console.log('  → Generating capital section...');
    const capital = await safeGenerateSection(() => generateCapitalSection(company, kshArticles.capital), getDefaultCapital(company));
    await delay(API_DELAY_MS);

    // Zarząd
    console.log('  → Generating board section...');
    const board = await safeGenerateSection(() => generateBoardSection(company, kshArticles.board), getDefaultBoard(company));
    await delay(API_DELAY_MS);

    // Działalność
    console.log('  → Generating business section...');
    const business = await safeGenerateSection(() => generateBusinessSection(company), getDefaultBusiness(company));
    await delay(API_DELAY_MS);

    // Finanse
    console.log('📊 Generating financial analysis...');
    const financialsSection = await safeGenerateSection(() => generateFinancialsSection(company, financials, ratios), getDefaultFinancials(financials, ratios));
    await delay(API_DELAY_MS);

    // Ryzyka
    console.log('⚠️ Analyzing risks...');
    const risks = await generateRisksSection(company, financials, ratios, kshArticles);
    await delay(API_DELAY_MS);

    // Podsumowanie
    console.log('📝 Generating summary...');
    const summary = await safeGenerateSection(() => generateSummarySection(company, financials, risks), getDefaultSummary(company));

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
 * Wrapper z fallback - jeśli AI zawodzi, użyj domyślnej sekcji
 */
async function safeGenerateSection(
    generator: () => Promise<string>,
    fallback: string
): Promise<string> {
    try {
        return await generator();
    } catch (error) {
        console.warn('Section generation failed, using fallback:', error);
        return fallback;
    }
}

// ========== DOMYŚLNE SEKCJE (FALLBACK) ==========

function getDefaultIntro(company: KRSCompany): string {
    return `Niniejsze memorandum informacyjne dotyczy spółki ${company.nazwa || 'Emitenta'} z siedzibą w miejscowości wskazanej w danych rejestrowych. Spółka została wpisana do Krajowego Rejestru Sądowego pod numerem KRS ${company.krs || 'XXXXXXXXXX'}.\n\nMemorandum zostało sporządzone w celu przedstawienia kluczowych informacji o Emitencie potencjalnym inwestorom. Dokument zawiera informacje o działalności spółki, jej sytuacji finansowej oraz czynnikach ryzyka.\n\nInwestowanie w papiery wartościowe wiąże się z ryzykiem utraty części lub całości zainwestowanych środków. Przed podjęciem decyzji inwestycyjnej, inwestor powinien zapoznać się z pełną treścią niniejszego memorandum, w szczególności z rozdziałem dotyczącym czynników ryzyka.`;
}

function getDefaultCapital(company: KRSCompany): string {
    const kapital = company.kapitalZakladowy?.toLocaleString('pl-PL') || 'nieznany';
    return `Kapitał zakładowy spółki wynosi ${kapital} PLN. Struktura kapitałowa spółki odpowiada wymogom określonym w Kodeksie Spółek Handlowych dla danej formy prawnej.\n\nInformacje o wspólnikach i strukturze własnościowej zostały przedstawione na podstawie danych z Krajowego Rejestru Sądowego.`;
}

function getDefaultBoard(company: KRSCompany): string {
    const zarzad = company.reprezentacja?.map(o => `${o.imie} ${o.nazwisko} - ${o.funkcja}`).join(', ') || 'brak danych';
    return `Zarząd spółki tworzą: ${zarzad}.\n\nSposób reprezentacji: ${company.sposobReprezentacji || 'zgodnie z umową spółki'}. Zarząd prowadzi sprawy spółki i reprezentuje ją na zewnątrz zgodnie z przepisami Kodeksu Spółek Handlowych.`;
}

function getDefaultBusiness(company: KRSCompany): string {
    return `Przeważającą działalnością spółki jest: ${company.pkdPrzewazajace || 'działalność gospodarcza'}.\n\nSpółka prowadzi działalność na terenie Rzeczypospolitej Polskiej, oferując produkty i usługi w ramach zarejestrowanych kodów PKD.`;
}

function getDefaultFinancials(financials: FinancialData[], ratios: FinancialRatios): string {
    const latest = financials[financials.length - 1];
    if (!latest) return 'Brak dostępnych danych finansowych.';

    return `W ostatnim roku obrotowym spółka osiągnęła przychody netto ze sprzedaży w wysokości ${formatPLN(latest.przychodyNetto)} oraz wynik netto w wysokości ${formatPLN(latest.zyskNetto)}.\n\nSuma bilansowa na koniec okresu wyniosła ${formatPLN(latest.sumaBilansowa)}, a kapitał własny ${formatPLN(latest.kapitalWlasny)}.\n\nWskaźnik płynności wynosi ${ratios.plynnosc.toFixed(2)}, wskaźnik zadłużenia ${ratios.zadluzenie.toFixed(1)}%, a rentowność netto ${ratios.rentownosc.toFixed(1)}%.`;
}

function getDefaultSummary(company: KRSCompany): string {
    return `${company.nazwa || 'Spółka'} to podmiot działający na polskim rynku w formie ${company.formaOrganizacyjna || 'spółki handlowej'}. Przed podjęciem decyzji inwestycyjnej zaleca się szczegółową analizę przedstawionych czynników ryzyka oraz konsultację z doradcą finansowym i prawnym.`;
}

// ========== GENERATORY SEKCJI ==========

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

    return callGeminiWithRetry(prompt);
}

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

    return callGeminiWithRetry(prompt);
}

async function generateBoardSection(
    company: KRSCompany,
    kshArticles: { Article: string; Content: string }[]
): Promise<string> {
    const prompt = BOARD_SECTION_PROMPT
        .replace('{reprezentacja}', JSON.stringify(company.reprezentacja || []))
        .replace('{sposob_reprezentacji}', company.sposobReprezentacji || 'brak danych')
        .replace('{forma}', company.formaOrganizacyjna || 'brak danych')
        .replace('{ksh_articles}', formatArticlesForAI(kshArticles));

    return callGeminiWithRetry(prompt);
}

async function generateBusinessSection(company: KRSCompany): Promise<string> {
    const prompt = BUSINESS_SECTION_PROMPT
        .replace('{pkd_lista}', JSON.stringify(company.pkd || []))
        .replace('{pkd_przewazajace}', company.pkdPrzewazajace || 'brak danych')
        .replace('{nazwa}', company.nazwa || 'brak danych')
        .replace('{data_powstania}', company.dataPowstania || 'brak danych')
        .replace('{siedziba}', company.siedzibaAdres || 'brak danych');

    return callGeminiWithRetry(prompt);
}

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

    return callGeminiWithRetry(prompt);
}

async function generateRisksSection(
    company: KRSCompany,
    financials: FinancialData[],
    ratios: FinancialRatios,
    kshArticles: Awaited<ReturnType<typeof getKeyArticlesForMemorandum>>
): Promise<RiskFactor[]> {
    try {
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
            ].slice(0, 3))); // Zmniejszone do 3 artykułów

        const response = await callGeminiWithRetry(prompt);

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
        console.error('Failed to generate/parse risks:', e);
    }

    // Fallback ryzyka
    return getDefaultRisks(company, ratios);
}

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

    return callGeminiWithRetry(prompt);
}

/**
 * Wywołuje Gemini API z retry i exponential backoff
 */
async function callGeminiWithRetry(userPrompt: string, attempt: number = 1): Promise<string> {
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Sprawdź czy to rate limit (429)
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            if (attempt < MAX_RETRIES) {
                const waitTime = API_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
                console.warn(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${MAX_RETRIES}...`);
                await delay(waitTime);
                return callGeminiWithRetry(userPrompt, attempt + 1);
            }
        }

        console.error(`Gemini API error (attempt ${attempt}):`, errorMessage);
        throw new Error(`AI generation failed after ${attempt} attempts: ${errorMessage}`);
    }
}

// ========== HELPERS ==========

interface FinancialRatios {
    plynnosc: number;
    rentownosc: number;
    zadluzenie: number;
    dynamikaPrzychodow: number;
}

function calculateRatios(financials: FinancialData[]): FinancialRatios {
    if (financials.length === 0) {
        return { plynnosc: 0, rentownosc: 0, zadluzenie: 0, dynamikaPrzychodow: 0 };
    }

    const latest = financials[financials.length - 1];
    const previous = financials.length > 1 ? financials[financials.length - 2] : null;

    const zobowiazania = (latest.sumaBilansowa || 0) - (latest.kapitalWlasny || 0);
    const plynnosc = zobowiazania > 0 ? (latest.kapitalWlasny || 0) / zobowiazania : 1;
    const rentownosc = latest.przychodyNetto
        ? ((latest.zyskNetto || 0) / latest.przychodyNetto) * 100
        : 0;
    const zadluzenie = latest.sumaBilansowa
        ? (zobowiazania / latest.sumaBilansowa) * 100
        : 0;
    const dynamikaPrzychodow = previous?.przychodyNetto
        ? ((latest.przychodyNetto - previous.przychodyNetto) / previous.przychodyNetto) * 100
        : 0;

    return { plynnosc, rentownosc, zadluzenie, dynamikaPrzychodow };
}

function formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

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
            opis: `Działalność spółki może być uzależniona od kompetencji i zaangażowania kluczowych członków zarządu.`,
            istotnosc: (company.reprezentacja?.length || 0) <= 1 ? 'wysoka' : 'srednia',
        },
        {
            kategoria: 'rynkowe',
            tytul: 'Ryzyko konkurencji rynkowej',
            opis: 'Intensyfikacja działań konkurencji może wpłynąć negatywnie na pozycję rynkową i wyniki finansowe spółki.',
            istotnosc: 'srednia',
        },
    ];

    if ((company.kapitalZakladowy || 0) <= 5000) {
        risks.push({
            kategoria: 'prawne',
            tytul: 'Ryzyko niedokapitalizowania',
            opis: `Kapitał zakładowy spółki wynosi ${formatPLN(company.kapitalZakladowy || 0)}, co stanowi ustawowe minimum.`,
            istotnosc: 'wysoka',
        });
    }

    if (ratios.rentownosc < 0) {
        risks.push({
            kategoria: 'finansowe',
            tytul: 'Ryzyko generowania strat',
            opis: `Spółka wykazuje ujemną rentowność (${ratios.rentownosc.toFixed(1)}%).`,
            istotnosc: 'wysoka',
        });
    }

    return risks;
}

export function sectionsToMemorandumContext(
    company: KRSCompany,
    financials: FinancialData[],
    sections: GeneratedSections
): MemorandumContext {
    return {
        nazwa_spolki: company.nazwa || 'Nieznana spółka',
        nip: company.nip || '',
        krs: company.krs || '',
        regon: company.regon || '',
        forma_prawna: company.formaOrganizacyjna || '',
        adres_pelny: company.siedzibaAdres || '',
        data_powstania: company.dataPowstania || '',
        kapital_zakladowy: company.kapitalZakladowy?.toLocaleString('pl-PL') || '0',
        waluta: 'PLN',
        reprezentacja: company.reprezentacja || [],
        sposob_reprezentacji: company.sposobReprezentacji || '',
        pkd_przewazajace: company.pkdPrzewazajace || '',
        finanse: financials,
        ryzyka: sections.risks,
        podsumowanie_ai: sections.summary,
        sekcja_wstep: sections.intro,
        sekcja_kapital: sections.capital,
        sekcja_zarzad: sections.board,
        sekcja_dzialalnosc: sections.business,
        sekcja_finanse: sections.financials,
        data_generacji: new Date().toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }),
    };
}
