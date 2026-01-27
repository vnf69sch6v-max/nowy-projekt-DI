// =========================================
// AGENT 3: FINANCIAL ANALYZER
// =========================================
// Analyzes financial statements and calculates ratios

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import { AgentResult, AnalyzedFinancials, FinancialStatement, FinancialRatios } from '@/lib/db/types';

const FINANCIAL_ANALYSIS_PROMPT = `
ROLA: Jesteś analitykiem finansowym z certyfikatem CFA.

ZADANIE: Przeanalizuj sprawozdanie finansowe i zwróć kompletne dane.

WYMAGANE DANE (dla każdego roku):

1. RACHUNEK ZYSKÓW I STRAT:
   - przychodyNetto (przychody ze sprzedaży)
   - przychodyPozostale
   - kosztyDzialalnosci
   - zyskBrutto
   - podatekDochodowy
   - zyskNetto

2. BILANS - AKTYWA:
   - aktywaTrwale
   - aktywaObrotowe
   - sumaAktywow (suma bilansowa)

3. BILANS - PASYWA:
   - kapitalWlasny
   - zobowiazaniaDlugoterminowe
   - zobowiazaniaKrotkoterminowe
   - sumaPasywow

4. PRZEPŁYWY PIENIĘŻNE (jeśli dostępne):
   - przeplywyOperacyjne
   - przeplywyInwestycyjne
   - przeplywyFinansowe

5. AUDYT (jeśli podane):
   - audytor (nazwa firmy)
   - opiniaAudytora (POZYTYWNA, Z_ZASTRZEZENIEM, NEGATYWNA)

6. WSKAŹNIKI (OBLICZ!):
   - rentownoscNetto = (zyskNetto / przychodyNetto) * 100
   - rentownoscBrutto = (zyskBrutto / przychodyNetto) * 100
   - roe = (zyskNetto / kapitalWlasny) * 100
   - roa = (zyskNetto / sumaAktywow) * 100
   - wskaznikPlynnosciBiezacej = aktywaObrotowe / zobowiazaniaKrotkoterminowe
   - wskaznikZadluzenia = ((zobowiazaniaDlugoterminowe + zobowiazaniaKrotkoterminowe) / sumaAktywow) * 100

7. DYNAMIKA YoY (jeśli >1 rok):
   - dynamikaPrzychodow = ((przychodyNetto[rok] - przychodyNetto[rok-1]) / przychodyNetto[rok-1]) * 100
   - dynamikaZysku = ((zyskNetto[rok] - zyskNetto[rok-1]) / |zyskNetto[rok-1]|) * 100

FORMAT ODPOWIEDZI (JSON):
{
    "statements": [
        {
            "rok": 2024,
            "typSprawozdania": "JEDNOSTKOWE",
            "przychodyNetto": 12000000.00,
            "zyskNetto": 1500000.00,
            "sumaAktywow": 25000000.00,
            "kapitalWlasny": 18000000.00,
            "zobowiazaniaKrotkoterminowe": 5000000.00,
            "zobowiazaniaDlugoterminowe": 2000000.00
        }
    ],
    "ratios": [
        {
            "rok": 2024,
            "rentownoscNetto": 12.5,
            "roe": 8.3,
            "roa": 6.0,
            "wskaznikZadluzenia": 28.0,
            "wskaznikPlynnosciBiezacej": 1.8,
            "dynamikaPrzychodow": 15.2,
            "dynamikaZysku": 22.5
        }
    ],
    "commentary": "Spółka wykazuje stabilny wzrost przychodów o 15.2% r/r przy poprawie rentowności netto do 12.5%. Wskaźnik zadłużenia na bezpiecznym poziomie 28%."
}

WAŻNE:
- Wszystkie wartości jako liczby (nie stringi)
- Procenty jako liczby (np. 12.5, nie "12.5%")
- Wartości w PLN (nie tysiącach)
- Zaokrąglaj do 2 miejsc po przecinku

SPRAWOZDANIE FINANSOWE DO ANALIZY:
`;

export async function analyzeFinancials(
    extractedText: string
): Promise<AgentResult<AnalyzedFinancials>> {
    const startTime = Date.now();

    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
            }
        });

        const result = await model.generateContent([
            { text: FINANCIAL_ANALYSIS_PROMPT + extractedText }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse financial analysis as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const latencyMs = Date.now() - startTime;

        // Transform statements
        const statements: Partial<FinancialStatement>[] = (parsed.statements || []).map((s: Record<string, unknown>) => ({
            rok: s.rok as number,
            typSprawozdania: (s.typSprawozdania as string) || 'JEDNOSTKOWE',
            przychodyNetto: s.przychodyNetto as number,
            przychodyPozostale: s.przychodyPozostale as number,
            kosztyDzialalnosci: s.kosztyDzialalnosci as number,
            zyskBrutto: s.zyskBrutto as number,
            podatekDochodowy: s.podatekDochodowy as number,
            zyskNetto: s.zyskNetto as number,
            aktywaTrwale: s.aktywaTrwale as number,
            aktywaObrotowe: s.aktywaObrotowe as number,
            sumaAktywow: s.sumaAktywow as number,
            kapitalWlasny: s.kapitalWlasny as number,
            zobowiazaniaDlugoterminowe: s.zobowiazaniaDlugoterminowe as number,
            zobowiazaniaKrotkoterminowe: s.zobowiazaniaKrotkoterminowe as number,
            sumaPasywow: s.sumaPasywow as number,
            przeplywyOperacyjne: s.przeplywyOperacyjne as number,
            przeplywyInwestycyjne: s.przeplywyInwestycyjne as number,
            przeplywyFinansowe: s.przeplywyFinansowe as number,
            audytor: s.audytor as string,
            opiniaAudytora: s.opiniaAudytora as string,
        }));

        // Transform ratios
        const ratios: Partial<FinancialRatios>[] = (parsed.ratios || []).map((r: Record<string, unknown>) => ({
            rentownoscNetto: r.rentownoscNetto as number,
            rentownoscBrutto: r.rentownoscBrutto as number,
            roe: r.roe as number,
            roa: r.roa as number,
            wskaznikPlynnosciBiezacej: r.wskaznikPlynnosciBiezacej as number,
            wskaznikPlynnosciSzybkiej: r.wskaznikPlynnosciSzybkiej as number,
            wskaznikZadluzenia: r.wskaznikZadluzenia as number,
            wskaznikZadluzeniaKapitalu: r.wskaznikZadluzeniaKapitalu as number,
            dynamikaPrzychodow: r.dynamikaPrzychodow as number,
            dynamikaZysku: r.dynamikaZysku as number,
            dynamikaAktywow: r.dynamikaAktywow as number,
        }));

        return {
            success: true,
            data: {
                statements,
                ratios,
                commentary: parsed.commentary || ''
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown financial analysis error',
            latencyMs
        };
    }
}

// Calculate ratios from statement data (fallback if AI doesn't calculate)
export function calculateRatios(statement: Partial<FinancialStatement>): Partial<FinancialRatios> {
    const ratios: Partial<FinancialRatios> = {};

    // Profitability
    if (statement.zyskNetto && statement.przychodyNetto) {
        ratios.rentownoscNetto = Number(((statement.zyskNetto / statement.przychodyNetto) * 100).toFixed(2));
    }
    if (statement.zyskBrutto && statement.przychodyNetto) {
        ratios.rentownoscBrutto = Number(((statement.zyskBrutto / statement.przychodyNetto) * 100).toFixed(2));
    }
    if (statement.zyskNetto && statement.kapitalWlasny) {
        ratios.roe = Number(((statement.zyskNetto / statement.kapitalWlasny) * 100).toFixed(2));
    }
    if (statement.zyskNetto && statement.sumaAktywow) {
        ratios.roa = Number(((statement.zyskNetto / statement.sumaAktywow) * 100).toFixed(2));
    }

    // Liquidity
    if (statement.aktywaObrotowe && statement.zobowiazaniaKrotkoterminowe) {
        ratios.wskaznikPlynnosciBiezacej = Number((statement.aktywaObrotowe / statement.zobowiazaniaKrotkoterminowe).toFixed(2));
    }

    // Debt
    const totalDebt = (statement.zobowiazaniaDlugoterminowe || 0) + (statement.zobowiazaniaKrotkoterminowe || 0);
    if (totalDebt && statement.sumaAktywow) {
        ratios.wskaznikZadluzenia = Number(((totalDebt / statement.sumaAktywow) * 100).toFixed(2));
    }

    return ratios;
}

// Calculate YoY dynamics
export function calculateYoYDynamics(
    current: Partial<FinancialStatement>,
    previous: Partial<FinancialStatement>
): { dynamikaPrzychodow?: number; dynamikaZysku?: number; dynamikaAktywow?: number } {
    const dynamics: { dynamikaPrzychodow?: number; dynamikaZysku?: number; dynamikaAktywow?: number } = {};

    if (current.przychodyNetto && previous.przychodyNetto && previous.przychodyNetto !== 0) {
        dynamics.dynamikaPrzychodow = Number((((current.przychodyNetto - previous.przychodyNetto) / previous.przychodyNetto) * 100).toFixed(2));
    }

    if (current.zyskNetto !== undefined && previous.zyskNetto !== undefined && previous.zyskNetto !== 0) {
        dynamics.dynamikaZysku = Number((((current.zyskNetto - previous.zyskNetto) / Math.abs(previous.zyskNetto)) * 100).toFixed(2));
    }

    if (current.sumaAktywow && previous.sumaAktywow && previous.sumaAktywow !== 0) {
        dynamics.dynamikaAktywow = Number((((current.sumaAktywow - previous.sumaAktywow) / previous.sumaAktywow) * 100).toFixed(2));
    }

    return dynamics;
}

// Format currency in Polish
export function formatPLN(value: number): string {
    return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

// Format percentage
export function formatPercent(value: number): string {
    return value.toFixed(1) + '%';
}
