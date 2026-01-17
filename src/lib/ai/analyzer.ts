import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompanyData, FinancialData, RiskFactor } from '@/types';
import { calculateRatios, formatFinancialAmount } from '@/lib/financials/mock';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const geminiFlash = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.3, // Niższa dla precyzji prawnej
        maxOutputTokens: 4096,
    },
});

const RISK_ANALYSIS_PROMPT = `
Jesteś doświadczonym analitykiem finansowym i radcą prawnym specjalizującym się 
w polskim prawie spółek handlowych. Twoim zadaniem jest przeanalizować dane 
finansowe i rejestrowe spółki, a następnie zidentyfikować kluczowe czynniki ryzyka.

DANE SPÓŁKI:
- Nazwa: {nazwa}
- Forma prawna: {forma_prawna}
- Kapitał zakładowy: {kapital} PLN
- Data powstania: {data_powstania}
- Liczba członków zarządu: {liczba_zarzadu}
- Przedmiot działalności (PKD): {pkd}

DANE FINANSOWE (ostatni rok obrotowy):
- Przychody netto: {przychody}
- Zysk netto: {zysk}
- Suma bilansowa: {suma_bilansowa}
- Kapitał własny: {kapital_wlasny}
- Zobowiązania: {zobowiazania}

WSKAŹNIKI:
- Wskaźnik płynności: {plynnosc}
- Rentowność netto: {rentownosc}%
- Zadłużenie ogólne: {zadluzenie}%
- Dynamika przychodów r/r: {dynamika}%

WYMAGANIA:
1. Zidentyfikuj 4-5 głównych czynników ryzyka
2. Każdy czynnik opisz w 2-3 zdaniach
3. Używaj języka prawniczego, ale zrozumiałego dla inwestora
4. Odnieś się do konkretnych danych liczbowych
5. Wskaż potencjalne konsekwencje dla inwestorów/wierzycieli

Zwróć odpowiedź WYŁĄCZNIE jako prawidłowy JSON (bez markdown, bez code blocks):
[
  {
    "kategoria": "finansowe",
    "tytul": "Tytuł ryzyka",
    "opis": "Pełny opis...",
    "istotnosc": "wysoka"
  }
]

Kategorie: finansowe, operacyjne, prawne, rynkowe
Istotność: wysoka, srednia, niska
`;

const SUMMARY_PROMPT = `
Na podstawie poniższych danych spółki, napisz krótkie (3-4 zdania) podsumowanie 
dla potencjalnego inwestora lub wierzyciela. Styl: profesjonalny, merytoryczny.

Spółka: {nazwa}
Forma: {forma_prawna}
Kapitał: {kapital}
Przychody: {przychody}
Zysk: {zysk}
Główna działalność: {pkd}
Lat na rynku: {lata_dzialalnosci}

Odpowiedz bezpośrednio tekstem (bez cudzysłowów, bez JSON).
`;

/**
 * Analizuje ryzyko spółki przy użyciu Gemini AI
 */
export async function analyzeRisks(
    company: KRSCompanyData,
    financials: FinancialData[]
): Promise<RiskFactor[]> {
    const ratios = calculateRatios(financials);
    const currentFinancials = financials[0];

    const prompt = RISK_ANALYSIS_PROMPT
        .replace('{nazwa}', company.nazwa)
        .replace('{forma_prawna}', company.formaOrganizacyjna)
        .replace('{kapital}', company.kapitalZakladowy.toString())
        .replace('{data_powstania}', company.dataPowstania)
        .replace('{liczba_zarzadu}', company.reprezentacja.osoby.length.toString())
        .replace('{pkd}', company.przedmiotDzialalnosci[0]?.opis || 'Brak danych')
        .replace('{przychody}', formatFinancialAmount(currentFinancials.przychodyNetto))
        .replace('{zysk}', formatFinancialAmount(currentFinancials.zyskNetto))
        .replace('{suma_bilansowa}', formatFinancialAmount(currentFinancials.sumaBilansowa))
        .replace('{kapital_wlasny}', formatFinancialAmount(currentFinancials.kapitalWlasny))
        .replace('{zobowiazania}', formatFinancialAmount(currentFinancials.zobowiazania))
        .replace('{plynnosc}', ratios.wskaznikPlynnosci.toFixed(2))
        .replace('{rentownosc}', ratios.rentownoscNetto.toFixed(1))
        .replace('{zadluzenie}', ratios.zadluzenieOgolne.toFixed(1))
        .replace('{dynamika}', ratios.dynamikaPrzychodow.toFixed(1));

    try {
        const result = await geminiFlash.generateContent(prompt);
        const text = result.response.text();

        // Parsowanie JSON z odpowiedzi
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('AI response parsing failed:', text);
            return getDefaultRisks();
        }

        const parsed = JSON.parse(jsonMatch[0]) as RiskFactor[];
        return parsed.map(risk => ({
            ...risk,
            istotnosc: risk.istotnosc || 'srednia',
        }));
    } catch (error) {
        console.error('Gemini API error:', error);
        return getDefaultRisks();
    }
}

/**
 * Generuje podsumowanie AI dla spółki
 */
export async function generateSummary(
    company: KRSCompanyData,
    financials: FinancialData[]
): Promise<string> {
    const currentYear = new Date().getFullYear();
    const foundedYear = parseInt(company.dataPowstania.split('-')[0] || '2020');
    const yearsActive = currentYear - foundedYear;
    const currentFinancials = financials[0];

    const prompt = SUMMARY_PROMPT
        .replace('{nazwa}', company.nazwa)
        .replace('{forma_prawna}', company.formaOrganizacyjna)
        .replace('{kapital}', formatFinancialAmount(company.kapitalZakladowy))
        .replace('{przychody}', formatFinancialAmount(currentFinancials.przychodyNetto))
        .replace('{zysk}', formatFinancialAmount(currentFinancials.zyskNetto))
        .replace('{pkd}', company.przedmiotDzialalnosci[0]?.opis || 'Działalność gospodarcza')
        .replace('{lata_dzialalnosci}', yearsActive.toString());

    try {
        const result = await geminiFlash.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini summary error:', error);
        return `${company.nazwa} to spółka ${company.formaOrganizacyjna.toLowerCase()} działająca na polskim rynku. Spółka prowadzi działalność w zakresie ${company.przedmiotDzialalnosci[0]?.opis || 'usług gospodarczych'}.`;
    }
}

/**
 * Domyślne ryzyka w przypadku błędu API
 */
function getDefaultRisks(): RiskFactor[] {
    return [
        {
            kategoria: 'finansowe',
            tytul: 'Ryzyko płynności finansowej',
            opis: 'Spółka może być narażona na ryzyko braku wystarczających środków pieniężnych na pokrycie bieżących zobowiązań.',
            istotnosc: 'srednia',
        },
        {
            kategoria: 'operacyjne',
            tytul: 'Ryzyko operacyjne',
            opis: 'Działalność spółki może być narażona na zakłócenia wynikające z czynników wewnętrznych lub zewnętrznych.',
            istotnosc: 'srednia',
        },
        {
            kategoria: 'rynkowe',
            tytul: 'Ryzyko konkurencji rynkowej',
            opis: 'Intensyfikacja działań konkurencji może wpłynąć negatywnie na pozycję rynkową i wyniki finansowe spółki.',
            istotnosc: 'srednia',
        },
    ];
}
