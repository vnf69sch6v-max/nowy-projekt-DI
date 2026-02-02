'use client';

// =============================================
// StochFin — Sensitivity Analysis
// Based on MASTER_PROMPTS v3 specification
// WACC × Terminal Growth heatmap
// =============================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    getPreviousYear,
    safeDivide,
    formatNumber
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Glass Card Component
// =============================================

function GlassCard({
    children,
    className = ''
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-white/[0.08] to-white/[0.02]
            backdrop-blur-xl border border-white/[0.08]
            shadow-xl shadow-black/20
            ${className}
        `}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// =============================================
// Main Component
// =============================================

export default function SensitivityPage() {
    const router = useRouter();
    const { state } = useCompanyData();

    const y0 = getLatestYear(state);
    const y1 = getPreviousYear(state);
    const currency = state.currency || 'PLN';
    const companyName = state.companyName || 'Brak danych';

    // Base parameters with sliders
    const [baseWACC, setBaseWACC] = useState(9.0);
    const [baseTermGrowth, setBaseTermGrowth] = useState(2.5);

    // Guard: if no data loaded
    if (!state.dataLoaded || !y0) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Brak załadowanych danych"
                    description="Załaduj dane spółki aby przeprowadzić analizę wrażliwości"
                    ctaText="📡 Załaduj dane"
                    onCta={() => router.push('/valuation/load')}
                    icon="🔥"
                />
            </div>
        );
    }

    // Guard: require DCF results
    if (!state.dcfResults) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Najpierw uruchom symulację DCF"
                    description="Analiza wrażliwości wymaga wcześniejszego przeprowadzenia wyceny Monte Carlo DCF"
                    ctaText="💰 Przejdź do DCF"
                    onCta={() => router.push('/valuation/dcf')}
                    icon="📊"
                />
            </div>
        );
    }

    // Get required data
    const lastRevenue = getField(state, 'incomeStatement', y0, 'revenue');
    if (!lastRevenue) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Brak danych o przychodach"
                    description="Uzupełnij dane o przychodach aby przeprowadzić analizę wrażliwości"
                    ctaText="📡 Uzupełnij dane"
                    onCta={() => router.push('/valuation/load')}
                    icon="📊"
                />
            </div>
        );
    }

    // Calculate margins and ratios from historical data
    const ebitdaMargin = safeDivide(
        getField(state, 'incomeStatement', y0, 'ebitda'),
        lastRevenue
    ) || 0.20;

    const daRatio = safeDivide(
        getField(state, 'incomeStatement', y0, 'depreciation'),
        lastRevenue
    ) || 0.03;

    const totalDebt = getField(state, 'balanceSheet', y0, 'totalDebt')
        || getField(state, 'balanceSheet', y0, 'longTermDebt') || 0;
    const cash = getField(state, 'balanceSheet', y0, 'cash') || 0;
    const netDebt = totalDebt - cash;

    const shares = state.market.sharesOutstanding
        || getField(state, 'balanceSheet', y0, 'sharesOutstanding');

    // Historical growth rate
    const prevRevenue = y1 ? getField(state, 'incomeStatement', y1, 'revenue') : null;
    const growthRate = safeDivide(
        lastRevenue - (prevRevenue || lastRevenue),
        prevRevenue || lastRevenue
    ) || 0.05;

    // Generate ranges for heatmap
    const waccRange: number[] = [];
    for (let w = Math.max(baseWACC - 3, 4); w <= baseWACC + 3; w += 1) {
        waccRange.push(w);
    }
    const tgRange = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

    // Compute DCF value for a given WACC and terminal growth
    const computeDCFValue = (wacc: number, tg: number): number | null => {
        const w = wacc / 100;
        const g = tg / 100;

        if (w <= g) return null;
        if (w <= 0) return null;

        const projYears = 5;
        let revenue = lastRevenue;
        let pvFCF = 0;
        let lastFCF = 0;

        for (let t = 1; t <= projYears; t++) {
            revenue = revenue * (1 + growthRate);
            const ebitda = revenue * ebitdaMargin;
            const da = revenue * daRatio;
            const fcf = ebitda - da;
            pvFCF += fcf / Math.pow(1 + w, t);
            lastFCF = fcf;
        }

        const tv = (lastFCF * (1 + g)) / (w - g);
        const pvTV = tv / Math.pow(1 + w, projYears);
        const ev = pvFCF + pvTV;
        const equity = ev - netDebt;

        if (shares) return equity / shares;
        return equity;
    };

    // Build matrix
    const matrix = useMemo(() => {
        return tgRange.map(tg =>
            waccRange.map(wacc => computeDCFValue(wacc, tg))
        );
    }, [baseWACC, baseTermGrowth, lastRevenue, growthRate, ebitdaMargin, daRatio, netDebt, shares]);

    // Get all valid values for color scaling
    const allValues = matrix.flat().filter((v): v is number => v !== null);
    const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;

    // Color based on market price comparison
    const currentPrice = state.market.currentPrice;

    const getCellColor = (value: number | null): string => {
        if (value === null) return 'bg-gray-800';

        if (!currentPrice) {
            // No market price: use gradient from min to max
            const pct = (value - minVal) / (maxVal - minVal);
            if (pct >= 0.8) return 'bg-emerald-900';
            if (pct >= 0.6) return 'bg-emerald-800/70';
            if (pct >= 0.4) return 'bg-gray-700';
            if (pct >= 0.2) return 'bg-rose-800/70';
            return 'bg-rose-900';
        }

        const diff = (value - currentPrice) / currentPrice;
        if (diff > 0.20) return 'bg-emerald-800';
        if (diff > 0.05) return 'bg-emerald-700/70';
        if (diff > -0.05) return 'bg-amber-800/50';
        if (diff > -0.20) return 'bg-rose-700/70';
        return 'bg-rose-800';
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-8 py-6">
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="text-gray-500 hover:text-white text-sm mb-2 transition-colors"
                    >
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-mono font-bold">
                        Analiza Wrażliwości — {companyName}
                    </h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Macierz WACC × Terminal Growth
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-8 py-8">
                {/* Parameters */}
                <GlassCard className="p-6 mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm">⚙️</span>
                        Parametry bazowe
                    </h2>

                    <div className="grid grid-cols-2 gap-8">
                        {/* WACC Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-gray-400">Bazowy WACC</label>
                                <span className="text-lg font-mono font-bold text-amber-400">{baseWACC.toFixed(1)}%</span>
                            </div>
                            <input
                                type="range"
                                min="4"
                                max="20"
                                step="0.5"
                                value={baseWACC}
                                onChange={(e) => setBaseWACC(parseFloat(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>4%</span>
                                <span>12%</span>
                                <span>20%</span>
                            </div>
                        </div>

                        {/* Terminal Growth Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-gray-400">Bazowy Terminal Growth</label>
                                <span className="text-lg font-mono font-bold text-amber-400">{baseTermGrowth.toFixed(1)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="5.0"
                                step="0.5"
                                value={baseTermGrowth}
                                onChange={(e) => setBaseTermGrowth(parseFloat(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0.5%</span>
                                <span>2.5%</span>
                                <span>5%</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Heatmap */}
                <GlassCard className="p-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-sm">🔥</span>
                        Macierz WACC / Terminal Growth
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="p-3 text-left text-gray-500 font-normal">Terminal ↓ / WACC →</th>
                                    {waccRange.map(w => (
                                        <th
                                            key={w}
                                            className={`p-3 text-center font-mono ${w === baseWACC ? 'text-amber-400 font-bold' : 'text-gray-400'}`}
                                        >
                                            {w}%
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tgRange.map((tg, i) => (
                                    <tr key={tg}>
                                        <td className={`p-3 font-mono ${tg === baseTermGrowth ? 'text-amber-400 font-bold' : 'text-gray-400'}`}>
                                            {tg.toFixed(1)}%
                                        </td>
                                        {waccRange.map((w, j) => {
                                            const val = matrix[i][j];
                                            const isBase = w === baseWACC && tg === baseTermGrowth;

                                            return (
                                                <td
                                                    key={w}
                                                    className={`
                                                        p-3 text-center font-mono text-sm transition-colors
                                                        ${getCellColor(val)}
                                                        ${isBase ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-900' : ''}
                                                    `}
                                                >
                                                    {val !== null ? formatNumber(val, '') : '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-rose-800" />
                            <span className="text-gray-400">Niska wartość</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-amber-800/50" />
                            <span className="text-gray-400">Neutralna</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-emerald-800" />
                            <span className="text-gray-400">Wysoka wartość</span>
                        </div>
                        {currentPrice && (
                            <div className="ml-4 text-gray-500">
                                vs cena rynkowa: {formatNumber(currentPrice, currency)}
                            </div>
                        )}
                    </div>

                    {/* Base value highlight */}
                    <div className="mt-4 text-center">
                        <span className="text-gray-500">Wartość bazowa (WACC {baseWACC}%, TG {baseTermGrowth}%): </span>
                        <span className="font-mono font-bold text-amber-400">
                            {computeDCFValue(baseWACC, baseTermGrowth) !== null
                                ? formatNumber(computeDCFValue(baseWACC, baseTermGrowth)!, currency)
                                : '—'
                            }
                        </span>
                        {shares ? ' / akcję' : ''}
                    </div>
                </GlassCard>

                {/* Navigation */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push('/valuation/benchmark')}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                    >
                        <div className="text-2xl mb-1">📈</div>
                        <div className="font-medium">Wycena Porównawcza</div>
                    </button>
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                    >
                        <div className="text-2xl mb-1">💰</div>
                        <div className="font-medium">Powrót do DCF</div>
                    </button>
                </div>
            </main>
        </div>
    );
}
