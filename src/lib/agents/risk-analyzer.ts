// =========================================
// AGENT 4: RISK ANALYZER
// =========================================
// Generates risks tailored to company profile and industry (PKD)

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import { AgentResult, GeneratedRisks, IdentifiedRisk, Company, FinancialStatement, FinancialRatios } from '@/lib/db/types';

// Industry risk templates by PKD prefix
const INDUSTRY_RISKS: Record<string, { name: string; risks: string[] }> = {
    '62': { // IT / Software
        name: 'Działalność związana z oprogramowaniem',
        risks: [
            'Ryzyko szybkich zmian technologicznych i konieczności ciągłych inwestycji w rozwój',
            'Ryzyko utraty kluczowych programistów i specjalistów IT',
            'Ryzyko cyberbezpieczeństwa i ataków hakerskich',
            'Ryzyko konkurencji ze strony globalnych firm technologicznych',
        ]
    },
    '58': { // Gaming / Publishing
        name: 'Działalność wydawnicza / gry komputerowe',
        risks: [
            'Ryzyko niepowodzenia komercyjnego nowych tytułów',
            'Ryzyko wydłużenia harmonogramu produkcji',
            'Ryzyko zmian preferencji konsumentów i trendów rynkowych',
            'Ryzyko ochrony własności intelektualnej i piractwa',
        ]
    },
    '46': { // Wholesale
        name: 'Handel hurtowy',
        risks: [
            'Ryzyko zakłóceń w łańcuchu dostaw',
            'Ryzyko uzależnienia od kluczowych dostawców',
            'Ryzyko wahań cen surowców i towarów',
            'Ryzyko konkurencji cenowej i presji na marże',
        ]
    },
    '47': { // Retail
        name: 'Handel detaliczny',
        risks: [
            'Ryzyko zmian zachowań konsumenckich',
            'Ryzyko konkurencji ze strony e-commerce',
            'Ryzyko sezonowości sprzedaży',
            'Ryzyko lokalizacji punktów sprzedaży',
        ]
    },
    '41': { // Construction
        name: 'Budownictwo',
        risks: [
            'Ryzyko opóźnień w realizacji projektów',
            'Ryzyko wzrostu kosztów materiałów budowlanych',
            'Ryzyko wypadków przy pracy i BHP',
            'Ryzyko uzależnienia od warunków pogodowych',
        ]
    },
};

// Universal risks (required for all companies)
const UNIVERSAL_RISKS = {
    operational: [
        'Ryzyko konkurencji rynkowej',
        'Ryzyko utraty kluczowych pracowników i kadry zarządzającej',
        'Ryzyko uzależnienia od kluczowych klientów',
        'Ryzyko operacyjne działalności',
    ],
    financial: [
        'Ryzyko płynności finansowej',
        'Ryzyko walutowe',
        'Ryzyko kredytowe',
        'Ryzyko stopy procentowej',
        'Ryzyko inflacyjne',
    ],
    investment: [
        'Ryzyko braku płynności akcji',
        'Ryzyko rozwodnienia kapitału',
        'Ryzyko braku wypłaty dywidendy',
        'Ryzyko wyceny akcji',
        'Ryzyko makroekonomiczne',
    ],
    legal: [
        'Ryzyko zmian przepisów prawnych',
        'Ryzyko sporów sądowych',
        'Ryzyko związane z obowiązkami informacyjnymi (MAR)',
    ]
};

const RISK_ANALYSIS_PROMPT = `
ROLA: Jesteś ekspertem od zarządzania ryzykiem i compliance.

ZADANIE: Wygeneruj MINIMUM 12 szczegółowych ryzyk dla spółki.

KONTEKST SPÓŁKI:
{COMPANY_CONTEXT}

DANE FINANSOWE:
{FINANCIAL_CONTEXT}

WYMAGANE KATEGORIE (wszystkie obowiązkowe):

1. OPERACYJNE (minimum 4 ryzyka):
   - Ryzyko konkurencji (analiza branży)
   - Ryzyko utraty kluczowych pracowników
   - Ryzyko technologiczne lub operacyjne
   - Ryzyko uzależnienia od klientów/dostawców

2. FINANSOWE (minimum 4 ryzyka):
   - Ryzyko płynności finansowej (użyj wskaźników!)
   - Ryzyko walutowe lub inflacyjne
   - Ryzyko kredytowe
   - Ryzyko stopy procentowej

3. INWESTYCYJNE (minimum 4 ryzyka):
   - Ryzyko braku płynności akcji
   - Ryzyko rozwodnienia kapitału
   - Ryzyko braku wypłaty dywidendy
   - Ryzyko wyceny akcji

4. PRAWNE I REGULACYJNE (2-3 ryzyka):
   - Ryzyko zmian przepisów
   - Ryzyko MAR (obowiązki informacyjne)

FORMAT KAŻDEGO RYZYKA (JSON):
{
    "kategoria": "OPERACYJNE",
    "nazwa": "Ryzyko konkurencji",
    "opis": "Spółka działa na konkurencyjnym rynku IT, gdzie obecnych jest wielu graczy...",
    "wplywNaEmitenta": "Nasilona konkurencja może prowadzić do utraty klientów i presji na ceny...",
    "mitygacja": "Emitent podejmuje działania mające na celu ograniczenie tego ryzyka poprzez...",
    "prawdopodobienstwo": "SREDNIE",
    "dotkliwosc": "SREDNIA"
}

WAŻNE:
- Użyj KONKRETNYCH danych finansowych (wskaźniki, kwoty)
- Dostosuj ryzyka do branży (PKD)
- Każde ryzyko 3-5 zdań
- Mitygacja powinna być konkretna

ODPOWIEDŹ (JSON):
{
    "risks": [...],
    "totalCount": 12
}
`;

export async function analyzeRisks(
    company: Partial<Company>,
    statements: Partial<FinancialStatement>[],
    ratios: Partial<FinancialRatios>[]
): Promise<AgentResult<GeneratedRisks>> {
    const startTime = Date.now();

    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192,
            }
        });

        // Build context
        const pkdPrefix = company.pkdPrzewazajace?.substring(0, 2) || '';
        const industryInfo = INDUSTRY_RISKS[pkdPrefix] || { name: 'Inna działalność', risks: [] };

        const companyContext = `
Nazwa: ${company.nazwa}
Forma prawna: ${company.formaPrawna}
PKD przeważające: ${company.pkdPrzewazajace} (${industryInfo.name})
Kapitał zakładowy: ${company.kapitalZakladowy?.toLocaleString('pl-PL')} PLN
Zarząd: ${company.sposobReprezentacji || 'brak danych'}

RYZYKA SPECYFICZNE DLA BRANŻY ${industryInfo.name}:
${industryInfo.risks.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

        const latestStatement = statements[0];
        const latestRatios = ratios[0];

        const financialContext = latestStatement ? `
Rok: ${latestStatement.rok}
Przychody netto: ${latestStatement.przychodyNetto?.toLocaleString('pl-PL')} PLN
Zysk netto: ${latestStatement.zyskNetto?.toLocaleString('pl-PL')} PLN
Suma aktywów: ${latestStatement.sumaAktywow?.toLocaleString('pl-PL')} PLN
Kapitał własny: ${latestStatement.kapitalWlasny?.toLocaleString('pl-PL')} PLN
Zobowiązania: ${((latestStatement.zobowiazaniaDlugoterminowe || 0) + (latestStatement.zobowiazaniaKrotkoterminowe || 0)).toLocaleString('pl-PL')} PLN

WSKAŹNIKI:
- Rentowność netto: ${latestRatios?.rentownoscNetto || 'brak'}%
- ROE: ${latestRatios?.roe || 'brak'}%
- Wskaźnik zadłużenia: ${latestRatios?.wskaznikZadluzenia || 'brak'}%
- Płynność bieżąca: ${latestRatios?.wskaznikPlynnosciBiezacej || 'brak'}
` : 'Brak danych finansowych';

        const prompt = RISK_ANALYSIS_PROMPT
            .replace('{COMPANY_CONTEXT}', companyContext)
            .replace('{FINANCIAL_CONTEXT}', financialContext);

        const result = await model.generateContent([{ text: prompt }]);
        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse risk analysis as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const latencyMs = Date.now() - startTime;

        // Transform risks
        const risks: Partial<IdentifiedRisk>[] = (parsed.risks || []).map((r: Record<string, unknown>) => ({
            kategoria: r.kategoria as IdentifiedRisk['kategoria'],
            nazwa: r.nazwa as string,
            opis: r.opis as string,
            wplywNaEmitenta: r.wplywNaEmitenta as string,
            mitygacja: r.mitygacja as string,
            prawdopodobienstwo: r.prawdopodobienstwo as IdentifiedRisk['prawdopodobienstwo'],
            dotkliwosc: r.dotkliwosc as IdentifiedRisk['dotkliwosc'],
            zrodlo: 'AI_ANALYSIS',
        }));

        // Validate minimum 12 risks
        if (risks.length < 12) {
            console.warn(`Generated only ${risks.length} risks, expected 12+`);
        }

        return {
            success: true,
            data: {
                risks,
                totalCount: risks.length
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown risk analysis error',
            latencyMs
        };
    }
}

// Get industry name from PKD
export function getIndustryName(pkd: string): string {
    const prefix = pkd?.substring(0, 2) || '';
    return INDUSTRY_RISKS[prefix]?.name || 'Inna działalność';
}

// Get industry-specific risks
export function getIndustryRisks(pkd: string): string[] {
    const prefix = pkd?.substring(0, 2) || '';
    return INDUSTRY_RISKS[prefix]?.risks || [];
}

// Calculate risk score (1-9)
export function calculateRiskScore(
    probability: 'NISKIE' | 'SREDNIE' | 'WYSOKIE',
    severity: 'NISKA' | 'SREDNIA' | 'WYSOKA'
): number {
    const probMap = { 'NISKIE': 1, 'SREDNIE': 2, 'WYSOKIE': 3 };
    const sevMap = { 'NISKA': 1, 'SREDNIA': 2, 'WYSOKA': 3 };
    return probMap[probability] * sevMap[severity];
}
