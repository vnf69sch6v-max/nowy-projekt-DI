/**
 * Zaawansowany kalkulator wskaźników finansowych
 * - Rozbudowane wskaźniki
 * - Benchmarki branżowe
 * - System scoringowy
 * - Szczegółowe komentarze
 */

import { FinancialData } from '@/types';

/**
 * Rozbudowane wskaźniki finansowe
 */
export interface FinancialRatios {
    rok: number;

    // Rentowność
    roe?: number;           // Return on Equity
    roa?: number;           // Return on Assets
    ros?: number;           // Return on Sales (marża netto)
    grossMargin?: number;   // Marża brutto
    ebitdaMargin?: number;  // Marża EBITDA

    // Płynność
    currentRatio?: number;      // Płynność bieżąca
    quickRatio?: number;        // Płynność szybka
    cashRatio?: number;         // Płynność gotówkowa

    // Zadłużenie
    debtRatio?: number;         // Wskaźnik zadłużenia
    debtToEquity?: number;      // Dług do kapitału
    equityRatio?: number;       // Wskaźnik kapitału własnego

    // Efektywność
    assetTurnover?: number;     // Rotacja aktywów
    receivablesDays?: number;   // Dni rotacji należności
    payablesDays?: number;      // Dni rotacji zobowiązań

    // Dynamika YoY
    revenueGrowth?: number;
    profitGrowth?: number;
    assetsGrowth?: number;
    equityGrowth?: number;

    // CAGR (wieloletni)
    revenueCagr?: number;
    profitCagr?: number;

    // Scoring
    score: number;              // 0-100 punktów
    scoreBreakdown: ScoreBreakdown;
    rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D';

    // Trend
    trend: 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative';
    trendDescription: string;
}

export interface ScoreBreakdown {
    profitability: number;    // 0-25 pkt
    liquidity: number;        // 0-25 pkt
    solvency: number;         // 0-25 pkt
    growth: number;           // 0-25 pkt
}

/**
 * Benchmarki branżowe
 */
export const INDUSTRY_BENCHMARKS: Record<string, { roe: number; ros: number; debtRatio: number }> = {
    it: { roe: 18, ros: 12, debtRatio: 25 },
    gaming: { roe: 20, ros: 15, debtRatio: 20 },
    manufacturing: { roe: 12, ros: 6, debtRatio: 45 },
    retail: { roe: 10, ros: 3, debtRatio: 55 },
    services: { roe: 15, ros: 8, debtRatio: 35 },
    fintech: { roe: 14, ros: 10, debtRatio: 40 },
    default: { roe: 12, ros: 8, debtRatio: 40 },
};

/**
 * Oblicza pełne wskaźniki finansowe
 */
export function calculateRatios(
    current: FinancialData,
    previous?: FinancialData,
    industry: string = 'default'
): FinancialRatios {
    const ratios: FinancialRatios = {
        rok: current.rok,
        score: 0,
        scoreBreakdown: { profitability: 0, liquidity: 0, solvency: 0, growth: 0 },
        rating: 'C',
        trend: 'neutral',
        trendDescription: '',
    };

    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;

    // ===== RENTOWNOŚĆ =====

    // ROE
    if (current.kapitalWlasny && current.kapitalWlasny > 0) {
        ratios.roe = ((current.zyskNetto || 0) / current.kapitalWlasny) * 100;
    }

    // ROA
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.roa = ((current.zyskNetto || 0) / current.sumaBilansowa) * 100;
    }

    // ROS (marża netto)
    if (current.przychodyNetto && current.przychodyNetto > 0) {
        ratios.ros = ((current.zyskNetto || 0) / current.przychodyNetto) * 100;
    }

    // Marża brutto
    if (current.przychodyNetto && current.przychodyNetto > 0 && current.kosztWlasny) {
        ratios.grossMargin = ((current.przychodyNetto - current.kosztWlasny) / current.przychodyNetto) * 100;
    }

    // ===== PŁYNNOŚĆ =====

    // Płynność bieżąca (Current Ratio)
    if (current.aktywaObrotowe && current.zobowiazania && current.zobowiazania > 0) {
        ratios.currentRatio = current.aktywaObrotowe / current.zobowiazania;
    }

    // ===== ZADŁUŻENIE =====

    // Wskaźnik zadłużenia
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.debtRatio = ((current.zobowiazania || 0) / current.sumaBilansowa) * 100;
    }

    // Dług do kapitału
    if (current.kapitalWlasny && current.kapitalWlasny > 0) {
        ratios.debtToEquity = (current.zobowiazania || 0) / current.kapitalWlasny;
    }

    // Wskaźnik kapitału własnego
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.equityRatio = ((current.kapitalWlasny || 0) / current.sumaBilansowa) * 100;
    }

    // ===== EFEKTYWNOŚĆ =====

    // Rotacja aktywów
    if (current.sumaBilansowa && current.sumaBilansowa > 0) {
        ratios.assetTurnover = (current.przychodyNetto || 0) / current.sumaBilansowa;
    }

    // ===== DYNAMIKA YoY =====

    if (previous) {
        if (previous.przychodyNetto && previous.przychodyNetto > 0) {
            ratios.revenueGrowth = (((current.przychodyNetto || 0) - previous.przychodyNetto) / previous.przychodyNetto) * 100;
        }

        if (previous.zyskNetto && previous.zyskNetto !== 0) {
            ratios.profitGrowth = (((current.zyskNetto || 0) - previous.zyskNetto) / Math.abs(previous.zyskNetto)) * 100;
        }

        if (previous.sumaBilansowa && previous.sumaBilansowa > 0) {
            ratios.assetsGrowth = (((current.sumaBilansowa || 0) - previous.sumaBilansowa) / previous.sumaBilansowa) * 100;
        }

        if (previous.kapitalWlasny && previous.kapitalWlasny > 0) {
            ratios.equityGrowth = (((current.kapitalWlasny || 0) - previous.kapitalWlasny) / previous.kapitalWlasny) * 100;
        }
    }

    // ===== SCORING =====

    // Profitability (0-25 pkt)
    let profitScore = 0;
    if (ratios.roe !== undefined) {
        if (ratios.roe >= benchmark.roe * 1.5) profitScore += 10;
        else if (ratios.roe >= benchmark.roe) profitScore += 7;
        else if (ratios.roe >= benchmark.roe * 0.5) profitScore += 4;
        else if (ratios.roe >= 0) profitScore += 2;
    }
    if (ratios.ros !== undefined) {
        if (ratios.ros >= benchmark.ros * 1.5) profitScore += 8;
        else if (ratios.ros >= benchmark.ros) profitScore += 6;
        else if (ratios.ros >= benchmark.ros * 0.5) profitScore += 3;
        else if (ratios.ros >= 0) profitScore += 1;
    }
    if (ratios.roa !== undefined && ratios.roa > 5) profitScore += 4;
    else if (ratios.roa !== undefined && ratios.roa > 0) profitScore += 2;
    if (ratios.grossMargin !== undefined && ratios.grossMargin > 40) profitScore += 3;
    ratios.scoreBreakdown.profitability = Math.min(25, profitScore);

    // Liquidity (0-25 pkt)
    let liquidityScore = 0;
    if (ratios.currentRatio !== undefined) {
        if (ratios.currentRatio >= 2.0) liquidityScore += 15;
        else if (ratios.currentRatio >= 1.5) liquidityScore += 12;
        else if (ratios.currentRatio >= 1.2) liquidityScore += 8;
        else if (ratios.currentRatio >= 1.0) liquidityScore += 4;
    }
    liquidityScore += 10; // bonus za istnienie danych
    ratios.scoreBreakdown.liquidity = Math.min(25, liquidityScore);

    // Solvency (0-25 pkt)
    let solvencyScore = 0;
    if (ratios.debtRatio !== undefined) {
        if (ratios.debtRatio <= benchmark.debtRatio * 0.5) solvencyScore += 15;
        else if (ratios.debtRatio <= benchmark.debtRatio) solvencyScore += 12;
        else if (ratios.debtRatio <= benchmark.debtRatio * 1.5) solvencyScore += 6;
        else if (ratios.debtRatio <= 80) solvencyScore += 3;
    }
    if (ratios.equityRatio !== undefined && ratios.equityRatio > 50) solvencyScore += 7;
    else if (ratios.equityRatio !== undefined && ratios.equityRatio > 30) solvencyScore += 4;
    if (ratios.debtToEquity !== undefined && ratios.debtToEquity < 0.5) solvencyScore += 3;
    ratios.scoreBreakdown.solvency = Math.min(25, solvencyScore);

    // Growth (0-25 pkt)
    let growthScore = 0;
    if (ratios.revenueGrowth !== undefined) {
        if (ratios.revenueGrowth >= 30) growthScore += 10;
        else if (ratios.revenueGrowth >= 15) growthScore += 8;
        else if (ratios.revenueGrowth >= 5) growthScore += 5;
        else if (ratios.revenueGrowth >= 0) growthScore += 2;
    }
    if (ratios.profitGrowth !== undefined) {
        if (ratios.profitGrowth >= 30) growthScore += 10;
        else if (ratios.profitGrowth >= 15) growthScore += 7;
        else if (ratios.profitGrowth >= 0) growthScore += 3;
    }
    if (ratios.assetsGrowth !== undefined && ratios.assetsGrowth > 10) growthScore += 3;
    if (ratios.equityGrowth !== undefined && ratios.equityGrowth > 10) growthScore += 2;
    ratios.scoreBreakdown.growth = Math.min(25, growthScore);

    // Total score
    ratios.score = ratios.scoreBreakdown.profitability +
        ratios.scoreBreakdown.liquidity +
        ratios.scoreBreakdown.solvency +
        ratios.scoreBreakdown.growth;

    // Rating
    if (ratios.score >= 90) ratios.rating = 'AAA';
    else if (ratios.score >= 80) ratios.rating = 'AA';
    else if (ratios.score >= 70) ratios.rating = 'A';
    else if (ratios.score >= 60) ratios.rating = 'BBB';
    else if (ratios.score >= 50) ratios.rating = 'BB';
    else if (ratios.score >= 40) ratios.rating = 'B';
    else if (ratios.score >= 30) ratios.rating = 'CCC';
    else if (ratios.score >= 20) ratios.rating = 'CC';
    else if (ratios.score >= 10) ratios.rating = 'C';
    else ratios.rating = 'D';

    // ===== TREND =====

    const positiveSignals = [
        ratios.roe && ratios.roe > benchmark.roe,
        ratios.ros && ratios.ros > benchmark.ros,
        ratios.revenueGrowth && ratios.revenueGrowth > 10,
        ratios.profitGrowth && ratios.profitGrowth > 10,
        ratios.debtRatio && ratios.debtRatio < benchmark.debtRatio,
        ratios.currentRatio && ratios.currentRatio > 1.5,
    ].filter(Boolean).length;

    const negativeSignals = [
        ratios.roe && ratios.roe < 0,
        ratios.ros && ratios.ros < 0,
        ratios.revenueGrowth && ratios.revenueGrowth < -10,
        ratios.profitGrowth && ratios.profitGrowth < -20,
        ratios.debtRatio && ratios.debtRatio > 70,
        ratios.currentRatio && ratios.currentRatio < 1.0,
    ].filter(Boolean).length;

    if (positiveSignals >= 5) {
        ratios.trend = 'strong_positive';
        ratios.trendDescription = 'Doskonala kondycja finansowa - wszystkie wskazniki powyzej normy';
    } else if (positiveSignals >= 3) {
        ratios.trend = 'positive';
        ratios.trendDescription = 'Dobra kondycja finansowa z pozytywnymi trendami';
    } else if (negativeSignals >= 4) {
        ratios.trend = 'strong_negative';
        ratios.trendDescription = 'Powazne problemy finansowe wymagajace natychmiastowej interwencji';
    } else if (negativeSignals >= 2) {
        ratios.trend = 'negative';
        ratios.trendDescription = 'Niepokojace sygnaly finansowe - konieczna analiza ryzyka';
    } else {
        ratios.trend = 'neutral';
        ratios.trendDescription = 'Stabilna sytuacja finansowa bez wyraznych trendow';
    }

    return ratios;
}

/**
 * Oblicza wskaźniki dla wszystkich lat
 */
export function calculateAllRatios(financials: FinancialData[], industry: string = 'default'): FinancialRatios[] {
    const sorted = [...financials].sort((a, b) => a.rok - b.rok);
    return sorted.map((current, index) => {
        const previous = index > 0 ? sorted[index - 1] : undefined;
        return calculateRatios(current, previous, industry);
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
 * Generuje rozbudowany komentarz AI
 */
export function generateFinancialComment(ratios: FinancialRatios): string {
    const comments: string[] = [];

    // Rating overview
    comments.push(`OCENA: ${ratios.rating} (${ratios.score}/100 pkt).`);

    // Profitability
    if (ratios.roe !== undefined) {
        if (ratios.roe > 20) {
            comments.push(`Rentownosc kapitalowa wybitna (ROE ${ratios.roe.toFixed(1)}%).`);
        } else if (ratios.roe > 10) {
            comments.push(`Rentownosc kapitalowa dobra (ROE ${ratios.roe.toFixed(1)}%).`);
        } else if (ratios.roe >= 0) {
            comments.push(`Rentownosc kapitalowa niska (ROE ${ratios.roe.toFixed(1)}%).`);
        } else {
            comments.push(`Strata na kapitale (ROE ${ratios.roe.toFixed(1)}%) - RYZYKO!`);
        }
    }

    // Growth
    if (ratios.revenueGrowth !== undefined && ratios.profitGrowth !== undefined) {
        if (ratios.revenueGrowth > 20 && ratios.profitGrowth > 20) {
            comments.push(`Dynamiczny wzrost przych. i zysku (${formatPercent(ratios.revenueGrowth)} / ${formatPercent(ratios.profitGrowth)}).`);
        } else if (ratios.revenueGrowth > 0 && ratios.profitGrowth > 0) {
            comments.push(`Stabilny wzrost biznesu.`);
        } else if (ratios.revenueGrowth < 0 || ratios.profitGrowth < 0) {
            comments.push(`Spadek wynikow - konieczna analiza przyczyn.`);
        }
    }

    // Solvency
    if (ratios.debtRatio !== undefined) {
        if (ratios.debtRatio < 30) {
            comments.push(`Niskie zadluzenie (${ratios.debtRatio.toFixed(0)}%) - silna pozycja.`);
        } else if (ratios.debtRatio > 70) {
            comments.push(`Wysokie zadluzenie (${ratios.debtRatio.toFixed(0)}%) - ryzyko finansowe!`);
        }
    }

    return comments.join(' ');
}

/**
 * Generuje mini-wykres tekstowy (sparkline)
 */
export function generateSparkline(values: number[]): string {
    if (values.length === 0) return '';

    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values.map(v => {
        const index = Math.floor(((v - min) / range) * (chars.length - 1));
        return chars[Math.max(0, Math.min(chars.length - 1, index))];
    }).join('');
}

/**
 * Generuje podsumowanie wieloletnie
 */
export function generateMultiYearSummary(allRatios: FinancialRatios[]): string {
    if (allRatios.length < 2) return 'Niewystarczające dane do analizy wieloletniej.';

    const first = allRatios[0];
    const last = allRatios[allRatios.length - 1];
    const lines: string[] = [];

    lines.push(`ANALIZA ${first.rok}-${last.rok}:`);

    // Score trend
    const scores = allRatios.map(r => r.score);
    const scoreSparkline = generateSparkline(scores);
    lines.push(`Scoring: ${scoreSparkline} (${first.score} -> ${last.score} pkt)`);

    // Rating change
    if (first.rating !== last.rating) {
        const direction = last.score > first.score ? '↑' : '↓';
        lines.push(`Rating: ${first.rating} ${direction} ${last.rating}`);
    }

    // Revenue CAGR
    const revenues = allRatios.map(r => r.revenueGrowth).filter(v => v !== undefined) as number[];
    if (revenues.length > 0) {
        const avgGrowth = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        lines.push(`Srednioroczny wzrost przych.: ${formatPercent(avgGrowth)}`);
    }

    return lines.join('\n');
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
        lines.push(`Rok ${r.rok}: [${r.rating}] ${r.score}/100 pkt`);
        if (r.roe !== undefined) lines.push(`  ROE: ${r.roe.toFixed(1)}%`);
        if (r.roa !== undefined) lines.push(`  ROA: ${r.roa.toFixed(1)}%`);
        if (r.ros !== undefined) lines.push(`  ROS: ${r.ros.toFixed(1)}%`);
        if (r.debtRatio !== undefined) lines.push(`  Zadłużenie: ${r.debtRatio.toFixed(1)}%`);
        if (r.revenueGrowth !== undefined) lines.push(`  Przychody YoY: ${formatPercent(r.revenueGrowth)}`);
        if (r.profitGrowth !== undefined) lines.push(`  Zysk YoY: ${formatPercent(r.profitGrowth)}`);
        lines.push(`  ${r.trendDescription}`);
        lines.push('');
    }

    return lines.join('\n');
}
