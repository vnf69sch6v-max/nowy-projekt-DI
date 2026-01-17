/**
 * Kalkulator wskaźników finansowych
 */

import { FinancialData } from '@/types';

/**
 * Obliczone wskaźniki finansowe
 */
export interface FinancialRatios {
    rok: number;

    // Rentowność
    roe?: number;           // Return on Equity (Zysk/Kapitał własny)
    roa?: number;           // Return on Assets (Zysk/Aktywa)
    ros?: number;           // Return on Sales (Zysk/Przychody)

    // Płynność
    currentRatio?: number;  // Płynność bieżąca (Aktywa obrotowe/Zobowiązania krótkoterminowe)

    // Zadłużenie
    debtRatio?: number;     // Wskaźnik zadłużenia (Zobowiązania/Aktywa)
    debtToEquity?: number;  // Dług do kapitału (Zobowiązania/Kapitał własny)

    // Dynamika YoY
    revenueGrowth?: number;  // Wzrost przychodów %
    profitGrowth?: number;   // Wzrost zysku %
    assetsGrowth?: number;   // Wzrost aktywów %

    // Trend
    trend: 'positive' | 'negative' | 'neutral';
    trendDescription: string;
}

/**
 * Oblicza wskaźniki finansowe dla pojedynczego roku
 */
export function calculateRatios(
    current: FinancialData,
    previous?: FinancialData
): FinancialRatios {
    const ratios: FinancialRatios = {
        rok: current.rok,
        trend: 'neutral',
        trendDescription: '',
    };

    // ROE (Return on Equity)
    if (current.kapitalWlasny && current.kapitalWlasny > 0) {
        ratios.roe = ((current.zyskNetto || 0) / current.kapitalWlasny) * 100;
    }

    // ROA (Return on Assets)
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.roa = ((current.zyskNetto || 0) / current.sumaBilansowa) * 100;
    }

    // ROS (Return on Sales)
    if (current.przychodyNetto && current.przychodyNetto > 0) {
        ratios.ros = ((current.zyskNetto || 0) / current.przychodyNetto) * 100;
    }

    // Płynność bieżąca
    if (current.aktywaObrotowe && current.zobowiazania && current.zobowiazania > 0) {
        ratios.currentRatio = current.aktywaObrotowe / current.zobowiazania;
    }

    // Wskaźnik zadłużenia
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.debtRatio = ((current.zobowiazania || 0) / current.sumaBilansowa) * 100;
    }

    // Dług do kapitału
    if (current.kapitalWlasny && current.kapitalWlasny > 0) {
        ratios.debtToEquity = (current.zobowiazania || 0) / current.kapitalWlasny;
    }

    // Dynamika YoY
    if (previous) {
        if (previous.przychodyNetto && previous.przychodyNetto > 0) {
            ratios.revenueGrowth = (((current.przychodyNetto || 0) - previous.przychodyNetto) / previous.przychodyNetto) * 100;
        }

        if (previous.zyskNetto && previous.zyskNetto > 0) {
            ratios.profitGrowth = (((current.zyskNetto || 0) - previous.zyskNetto) / previous.zyskNetto) * 100;
        }

        if (previous.sumaBilansowa && previous.sumaBilansowa > 0) {
            ratios.assetsGrowth = (((current.sumaBilansowa || 0) - previous.sumaBilansowa) / previous.sumaBilansowa) * 100;
        }
    }

    // Określ trend
    const positiveSignals = [
        ratios.roe && ratios.roe > 10,
        ratios.ros && ratios.ros > 5,
        ratios.revenueGrowth && ratios.revenueGrowth > 5,
        ratios.profitGrowth && ratios.profitGrowth > 0,
        ratios.debtRatio && ratios.debtRatio < 50,
    ].filter(Boolean).length;

    const negativeSignals = [
        ratios.roe && ratios.roe < 0,
        ratios.ros && ratios.ros < 0,
        ratios.revenueGrowth && ratios.revenueGrowth < -10,
        ratios.profitGrowth && ratios.profitGrowth < -20,
        ratios.debtRatio && ratios.debtRatio > 80,
    ].filter(Boolean).length;

    if (positiveSignals >= 3) {
        ratios.trend = 'positive';
        ratios.trendDescription = 'Spółka wykazuje pozytywne trendy finansowe';
    } else if (negativeSignals >= 2) {
        ratios.trend = 'negative';
        ratios.trendDescription = 'Spółka wykazuje niepokojące sygnały finansowe';
    } else {
        ratios.trend = 'neutral';
        ratios.trendDescription = 'Sytuacja finansowa spółki jest stabilna';
    }

    return ratios;
}

/**
 * Oblicza wskaźniki dla wszystkich lat
 */
export function calculateAllRatios(financials: FinancialData[]): FinancialRatios[] {
    const sorted = [...financials].sort((a, b) => a.rok - b.rok);
    return sorted.map((current, index) => {
        const previous = index > 0 ? sorted[index - 1] : undefined;
        return calculateRatios(current, previous);
    });
}

/**
 * Formatuje wskaźnik procentowy
 */
export function formatPercent(value: number | undefined): string {
    if (value === undefined || isNaN(value)) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

/**
 * Formatuje wskaźnik liczbowy
 */
export function formatRatio(value: number | undefined): string {
    if (value === undefined || isNaN(value)) return '-';
    return value.toFixed(2);
}

/**
 * Generuje komentarz AI do wskaźników
 */
export function generateFinancialComment(ratios: FinancialRatios): string {
    const comments: string[] = [];

    // ROE
    if (ratios.roe !== undefined) {
        if (ratios.roe > 15) {
            comments.push(`Wysoka rentowność kapitału własnego (ROE: ${ratios.roe.toFixed(1)}%) świadczy o efektywnym wykorzystaniu kapitału.`);
        } else if (ratios.roe > 5) {
            comments.push(`Rentowność kapitału własnego na satysfakcjonującym poziomie (ROE: ${ratios.roe.toFixed(1)}%).`);
        } else if (ratios.roe >= 0) {
            comments.push(`Niska rentowność kapitału własnego (ROE: ${ratios.roe.toFixed(1)}%) wymaga poprawy.`);
        } else {
            comments.push(`Ujemna rentowność kapitału własnego (ROE: ${ratios.roe.toFixed(1)}%) sygnalizuje problemy.`);
        }
    }

    // Dynamika przychodów
    if (ratios.revenueGrowth !== undefined) {
        if (ratios.revenueGrowth > 20) {
            comments.push(`Dynamiczny wzrost przychodów (${formatPercent(ratios.revenueGrowth)} r/r) wskazuje na ekspansję.`);
        } else if (ratios.revenueGrowth > 0) {
            comments.push(`Stabilny wzrost przychodów (${formatPercent(ratios.revenueGrowth)} r/r).`);
        } else {
            comments.push(`Spadek przychodów (${formatPercent(ratios.revenueGrowth)} r/r) wymaga analizy przyczyn.`);
        }
    }

    // Zadłużenie
    if (ratios.debtRatio !== undefined) {
        if (ratios.debtRatio < 30) {
            comments.push(`Niski poziom zadłużenia (${ratios.debtRatio.toFixed(1)}%) zapewnia bezpieczeństwo finansowe.`);
        } else if (ratios.debtRatio < 60) {
            comments.push(`Umiarkowany poziom zadłużenia (${ratios.debtRatio.toFixed(1)}%).`);
        } else {
            comments.push(`Wysoki poziom zadłużenia (${ratios.debtRatio.toFixed(1)}%) stanowi czynnik ryzyka.`);
        }
    }

    return comments.join(' ');
}

/**
 * Generuje tabelę wskaźników jako tekst
 */
export function generateRatiosTable(allRatios: FinancialRatios[]): string {
    if (allRatios.length === 0) return '';

    const lines: string[] = [
        '',
        'ANALIZA WSKAŹNIKOWA',
        '',
    ];

    for (const r of allRatios) {
        lines.push(`Rok ${r.rok}:`);
        if (r.roe !== undefined) lines.push(`  ROE (rentowność kapitału): ${r.roe.toFixed(1)}%`);
        if (r.roa !== undefined) lines.push(`  ROA (rentowność aktywów): ${r.roa.toFixed(1)}%`);
        if (r.ros !== undefined) lines.push(`  ROS (rentowność sprzedaży): ${r.ros.toFixed(1)}%`);
        if (r.debtRatio !== undefined) lines.push(`  Wskaźnik zadłużenia: ${r.debtRatio.toFixed(1)}%`);
        if (r.revenueGrowth !== undefined) lines.push(`  Dynamika przychodów r/r: ${formatPercent(r.revenueGrowth)}`);
        if (r.profitGrowth !== undefined) lines.push(`  Dynamika zysku r/r: ${formatPercent(r.profitGrowth)}`);
        lines.push(`  Ocena trendu: ${r.trendDescription}`);
        lines.push('');
    }

    return lines.join('\n');
}
