import { FinancialData } from '@/types';

/**
 * Generuje symulowane dane finansowe dla demo
 * W produkcji: użyj API MGBI, Transparent Data lub innego dostawcy
 */
export function generateMockFinancials(companyName: string): FinancialData[] {
    // Seed based on company name for consistent results
    const seed = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseRevenue = 1000000 + (seed % 50000000);

    const years = [2023, 2022, 2021];

    return years.map((rok, index) => {
        const growthFactor = 1 - (index * 0.1) + (Math.sin(seed + index) * 0.15);
        const przychodyNetto = Math.round(baseRevenue * growthFactor);
        const marza = 0.08 + (Math.cos(seed) * 0.05);
        const zyskNetto = Math.round(przychodyNetto * marza);

        return {
            rok,
            przychodyNetto,
            zyskBrutto: Math.round(zyskNetto * 1.19),
            zyskNetto,
            sumaBilansowa: Math.round(przychodyNetto * 0.7),
            kapitalWlasny: Math.round(przychodyNetto * 0.25),
            zobowiazania: Math.round(przychodyNetto * 0.45),
            aktywaObrotowe: Math.round(przychodyNetto * 0.35),
            aktywaTrwale: Math.round(przychodyNetto * 0.35),
            zatrudnienie: 10 + (seed % 200),
        };
    });
}

/**
 * Oblicza podstawowe wskaźniki finansowe
 */
export interface FinancialRatios {
    wskaznikPlynnosci: number;
    rentownoscNetto: number;
    zadluzenieOgolne: number;
    rotacjaAktywow: number;
    dynamikaPrzychodow: number;
}

export function calculateRatios(financials: FinancialData[]): FinancialRatios {
    const current = financials[0];
    const previous = financials[1];

    return {
        wskaznikPlynnosci: current.aktywaObrotowe / Math.max(current.zobowiazania, 1),
        rentownoscNetto: (current.zyskNetto / Math.max(current.przychodyNetto, 1)) * 100,
        zadluzenieOgolne: (current.zobowiazania / Math.max(current.sumaBilansowa, 1)) * 100,
        rotacjaAktywow: current.przychodyNetto / Math.max(current.sumaBilansowa, 1),
        dynamikaPrzychodow: previous
            ? ((current.przychodyNetto - previous.przychodyNetto) / Math.max(previous.przychodyNetto, 1)) * 100
            : 0,
    };
}

/**
 * Formatuje kwotę do czytelnej postaci
 */
export function formatFinancialAmount(amount: number): string {
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(2)} mln PLN`;
    }
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(0)} tys. PLN`;
    }
    return `${amount.toFixed(2)} PLN`;
}
