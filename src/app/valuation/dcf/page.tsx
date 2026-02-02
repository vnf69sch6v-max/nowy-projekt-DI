'use client';

// =============================================
// StochFin — DCF Valuation Dashboard
// Based on MASTER_PROMPTS v3 specification
// Reads data from CompanyDataContext
// =============================================

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    getPreviousYear,
    safeDivide,
    formatNumber,
    formatPercent,
    formatMultiple
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Types
// =============================================

interface HistogramBin {
    lo: number;
    hi: number;
    mid: number;
    count: number;
}

interface MCResult {
    ev: number;
    equityValue: number;
    perShare: number | null;
}

// =============================================
// Glass Card Component
// =============================================

function GlassCard({
    children,
    className = '',
    glowColor = 'emerald',
    hover = true
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
    hover?: boolean;
}) {
    const glowMap = {
        emerald: 'hover:shadow-emerald-500/20',
        cyan: 'hover:shadow-cyan-500/20',
        purple: 'hover:shadow-purple-500/20',
        amber: 'hover:shadow-amber-500/20'
    };

    return (
        <div className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-white/[0.08] to-white/[0.02]
            backdrop-blur-xl
            border border-white/[0.08]
            shadow-xl shadow-black/20
            ${hover ? `transition-all duration-300 hover:border-white/20 hover:shadow-2xl ${glowMap[glowColor]}` : ''}
            ${className}
        `}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// =============================================
// Nav Card Component
// =============================================

function NavCard({
    href,
    icon,
    title,
    subtitle,
    color = 'cyan'
}: {
    href: string;
    icon: string;
    title: string;
    subtitle: string;
    color?: 'emerald' | 'cyan' | 'purple' | 'amber';
}) {
    const router = useRouter();

    const colorMap = {
        emerald: 'from-emerald-500 to-teal-600 hover:border-emerald-500/30',
        cyan: 'from-cyan-500 to-blue-600 hover:border-cyan-500/30',
        purple: 'from-purple-500 to-pink-600 hover:border-purple-500/30',
        amber: 'from-amber-500 to-orange-600 hover:border-amber-500/30'
    };

    return (
        <button
            onClick={() => router.push(href)}
            className={`
                w-full flex items-center gap-4 p-4 rounded-xl
                bg-white/5 border border-white/10
                transition-all duration-300
                ${colorMap[color].split(' ')[2]}
                hover:bg-white/10
            `}
        >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-xl`}>
                {icon}
            </div>
            <div className="text-left">
                <div className="font-medium text-white">{title}</div>
                <div className="text-sm text-gray-500">{subtitle}</div>
            </div>
        </button>
    );
}

// =============================================
// Assumption Input
// =============================================

function AssumptionInput({
    label,
    icon,
    mean,
    std,
    unit = '%',
    onMeanChange,
    onStdChange,
    color = 'emerald'
}: {
    label: string;
    icon: string;
    mean: number;
    std: number;
    unit?: string;
    onMeanChange: (val: number) => void;
    onStdChange: (val: number) => void;
    color?: 'emerald' | 'cyan' | 'purple' | 'amber';
}) {
    const colorMap = {
        emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
        cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
        amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20'
    };

    // 90% confidence interval
    const lo = mean - 1.645 * std;
    const hi = mean + 1.645 * std;

    return (
        <div className={`rounded-xl p-4 bg-gradient-to-br ${colorMap[color]} border transition-all`}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Mean (μ)</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            step="0.1"
                            value={mean}
                            onChange={e => onMeanChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-right focus:outline-none focus:border-white/30"
                        />
                        <span className="text-gray-500 text-sm w-6">{unit}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Std Dev (σ)</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            step="0.1"
                            value={std}
                            onChange={e => onStdChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-right focus:outline-none focus:border-white/30"
                        />
                        <span className="text-gray-500 text-sm w-6">{unit}</span>
                    </div>
                </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
                Zakres 90%: {lo.toFixed(1)}{unit} do {hi.toFixed(1)}{unit}
            </div>
        </div>
    );
}

// =============================================
// Premium Histogram
// =============================================

function PremiumHistogram({
    data,
    marketPrice,
    median,
    currency
}: {
    data: HistogramBin[];
    marketPrice?: number | null;
    median: number;
    currency: string;
}) {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map(d => d.count));
    const minValue = data[0]?.lo || 0;
    const maxValue = data[data.length - 1]?.hi || 100;

    return (
        <div className="relative p-4">
            <div className="relative h-48">
                <div className="flex items-end h-40 gap-[2px]">
                    {data.map((bin, idx) => {
                        const height = (bin.count / maxCount) * 100;
                        const isAboveMarket = marketPrice && bin.lo >= marketPrice;

                        return (
                            <div
                                key={idx}
                                className="flex-1 rounded-t-sm transition-all cursor-pointer group relative"
                                style={{
                                    height: `${height}%`,
                                    background: isAboveMarket
                                        ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                                        : 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)',
                                    animationDelay: `${idx * 15}ms`
                                }}
                            >
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/95 backdrop-blur-sm px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 z-20">
                                    <div className="font-mono">{formatNumber(bin.lo, currency)} - {formatNumber(bin.hi, currency)}</div>
                                    <div className="text-gray-400">{bin.count.toLocaleString()} scenariuszy</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* X-axis */}
                <div className="flex justify-between mt-3 text-xs text-gray-400 font-mono">
                    <span>{formatNumber(minValue, currency)}</span>
                    <span className="text-gray-500">Wartość / akcję</span>
                    <span>{formatNumber(maxValue, currency)}</span>
                </div>

                {/* Market price line */}
                {marketPrice && marketPrice >= minValue && marketPrice <= maxValue && (
                    <div
                        className="absolute top-0 h-40 w-0.5 bg-rose-500"
                        style={{ left: `${((marketPrice - minValue) / (maxValue - minValue)) * 100}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-xs text-rose-300 font-mono whitespace-nowrap">
                            Cena {formatNumber(marketPrice, currency)}
                        </div>
                    </div>
                )}

                {/* Median line */}
                {median >= minValue && median <= maxValue && (
                    <div
                        className="absolute top-0 h-40 border-l-2 border-dashed border-emerald-400/60"
                        style={{ left: `${((median - minValue) / (maxValue - minValue)) * 100}%` }}
                    >
                        <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 text-xs text-emerald-400 font-mono whitespace-nowrap">
                            Mediana {formatNumber(median, currency)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================
// Main Component
// =============================================

export default function DCFDashboardPage() {
    const router = useRouter();
    const { state, dispatch } = useCompanyData();

    const latestYear = getLatestYear(state);
    const previousYear = getPreviousYear(state);
    const currency = state.currency || 'PLN';
    const companyName = state.companyName || 'Brak danych';
    const ticker = state.ticker || '';

    // Monte Carlo assumptions
    const [revenueGrowthMean, setRevenueGrowthMean] = useState(5.0);
    const [revenueGrowthStd, setRevenueGrowthStd] = useState(3.0);
    const [ebitdaMarginMean, setEbitdaMarginMean] = useState(20.0);
    const [ebitdaMarginStd, setEbitdaMarginStd] = useState(3.0);
    const [waccMean, setWaccMean] = useState(9.0);
    const [waccStd, setWaccStd] = useState(1.0);
    const [termGrowthMean, setTermGrowthMean] = useState(2.5);
    const [termGrowthStd, setTermGrowthStd] = useState(0.5);

    const [isSimulating, setIsSimulating] = useState(false);

    // Guard: if no data loaded
    if (!state.dataLoaded || !latestYear) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Brak załadowanych danych"
                    description="Załaduj dane spółki aby rozpocząć wycenę DCF"
                    ctaText="📡 Załaduj dane"
                    onCta={() => router.push('/valuation/load')}
                    icon="📊"
                />
            </div>
        );
    }

    // Build historical data table
    const years = state.availableYears;
    const historicalRows = useMemo(() => [
        {
            label: 'Przychody',
            values: years.map(y => getField(state, 'incomeStatement', y, 'revenue')),
            format: (v: number | null) => formatNumber(v, currency)
        },
        {
            label: 'Wzrost r/r',
            values: years.map((y, i) => {
                if (i >= years.length - 1) return null;
                const current = getField(state, 'incomeStatement', y, 'revenue');
                const prev = getField(state, 'incomeStatement', years[i + 1], 'revenue');
                return safeDivide(current !== null && prev !== null ? current - prev : null, prev);
            }),
            format: (v: number | null) => formatPercent(v),
            isPercent: true
        },
        {
            label: 'EBITDA',
            values: years.map(y => getField(state, 'incomeStatement', y, 'ebitda')),
            format: (v: number | null) => formatNumber(v, currency)
        },
        {
            label: 'Marża EBITDA',
            values: years.map(y => {
                const ebitda = getField(state, 'incomeStatement', y, 'ebitda');
                const rev = getField(state, 'incomeStatement', y, 'revenue');
                return safeDivide(ebitda, rev);
            }),
            format: (v: number | null) => formatPercent(v),
            isPercent: true
        },
        {
            label: 'Zysk netto',
            values: years.map(y => getField(state, 'incomeStatement', y, 'netIncome')),
            format: (v: number | null) => formatNumber(v, currency)
        },
        {
            label: 'CAPEX',
            values: years.map(y => {
                const c = getField(state, 'cashFlow', y, 'capex');
                return c !== null ? Math.abs(c) : null;
            }),
            format: (v: number | null) => formatNumber(v, currency)
        },
        {
            label: 'FCF',
            values: years.map(y => getField(state, 'cashFlow', y, 'freeCashFlow')),
            format: (v: number | null) => formatNumber(v, currency)
        }
    ], [state, years, currency]);

    // Auto-calibrate function
    const autoCalibrate = useCallback(() => {
        // Revenue Growth
        const growths: number[] = [];
        for (let i = 0; i < years.length - 1; i++) {
            const curr = getField(state, 'incomeStatement', years[i], 'revenue');
            const prev = getField(state, 'incomeStatement', years[i + 1], 'revenue');
            const g = safeDivide(curr !== null && prev !== null ? curr - prev : null, prev);
            if (g !== null) growths.push(g);
        }

        if (growths.length > 0) {
            const meanGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
            const stdGrowth = growths.length > 1
                ? Math.sqrt(growths.reduce((a, b) => a + Math.pow(b - meanGrowth, 2), 0) / (growths.length - 1))
                : Math.abs(meanGrowth) * 0.3;

            setRevenueGrowthMean(parseFloat((meanGrowth * 100).toFixed(1)));
            setRevenueGrowthStd(parseFloat(Math.max(stdGrowth * 100, 0.5).toFixed(1)));
        }

        // EBITDA Margin
        const margins: number[] = [];
        for (const y of years) {
            const ebitda = getField(state, 'incomeStatement', y, 'ebitda');
            const rev = getField(state, 'incomeStatement', y, 'revenue');
            const m = safeDivide(ebitda, rev);
            if (m !== null) margins.push(m);
        }

        if (margins.length > 0) {
            const meanMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
            const stdMargin = margins.length > 1
                ? Math.sqrt(margins.reduce((a, b) => a + Math.pow(b - meanMargin, 2), 0) / (margins.length - 1))
                : Math.abs(meanMargin) * 0.1;

            setEbitdaMarginMean(parseFloat((meanMargin * 100).toFixed(1)));
            setEbitdaMarginStd(parseFloat(Math.max(stdMargin * 100, 0.5).toFixed(1)));
        }
    }, [state, years]);

    // Box-Muller transform for normal distribution
    const randn = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    // Build histogram from results
    const buildHistogram = (values: number[], bins: number): HistogramBin[] => {
        const sorted = [...values].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const binWidth = (max - min) / bins;
        const histogram: HistogramBin[] = [];

        for (let i = 0; i < bins; i++) {
            const lo = min + i * binWidth;
            const hi = lo + binWidth;
            const count = sorted.filter(v => v >= lo && v < hi).length;
            histogram.push({ lo, hi, mid: (lo + hi) / 2, count });
        }

        return histogram;
    };

    // Run Monte Carlo simulation
    const runMonteCarlo = useCallback(() => {
        setIsSimulating(true);

        setTimeout(() => {
            const N = 10000;
            const projYears = 5;

            const revGrowthM = revenueGrowthMean / 100;
            const revGrowthS = revenueGrowthStd / 100;
            const marginM = ebitdaMarginMean / 100;
            const marginS = ebitdaMarginStd / 100;
            const waccM = waccMean / 100;
            const waccS = waccStd / 100;
            const gM = termGrowthMean / 100;
            const gS = termGrowthStd / 100;

            const lastRevenue = getField(state, 'incomeStatement', latestYear!, 'revenue');
            if (!lastRevenue) {
                alert('Brak danych o przychodach!');
                setIsSimulating(false);
                return;
            }

            const lastDA = getField(state, 'incomeStatement', latestYear!, 'depreciation');
            const daRatio = safeDivide(lastDA, lastRevenue) || 0.03;

            const totalDebt = getField(state, 'balanceSheet', latestYear!, 'totalDebt')
                || getField(state, 'balanceSheet', latestYear!, 'longTermDebt')
                || 0;
            const cashVal = getField(state, 'balanceSheet', latestYear!, 'cash') || 0;
            const netDebt = (totalDebt || 0) - (cashVal || 0);

            const shares = state.market.sharesOutstanding
                || getField(state, 'balanceSheet', latestYear!, 'sharesOutstanding')
                || null;

            const results: MCResult[] = [];

            for (let i = 0; i < N; i++) {
                const g = revGrowthM + revGrowthS * randn();
                const m = marginM + marginS * randn();
                const w = waccM + waccS * randn();
                const tg = gM + gS * randn();

                if (w <= tg || w <= 0) continue;
                const clampedMargin = Math.max(0.01, Math.min(0.95, m));

                let revenue = lastRevenue;
                let pvFCF = 0;
                let lastFCF = 0;

                for (let t = 1; t <= projYears; t++) {
                    revenue = revenue * (1 + g);
                    const ebitda = revenue * clampedMargin;
                    const da = revenue * daRatio;
                    const fcf = ebitda - da;
                    const discountFactor = 1 / Math.pow(1 + w, t);
                    pvFCF += fcf * discountFactor;
                    lastFCF = fcf;
                }

                const terminalValue = (lastFCF * (1 + tg)) / (w - tg);
                const pvTerminal = terminalValue / Math.pow(1 + w, projYears);
                const ev = pvFCF + pvTerminal;
                const equityValue = ev - netDebt;
                const perShare = shares ? equityValue / shares : null;

                results.push({ ev, equityValue, perShare });
            }

            results.sort((a, b) => a.equityValue - b.equityValue);

            const pct = (p: number) => results[Math.floor(results.length * p / 100)];

            const dcfResults = {
                scenariosRun: results.length,
                percentiles: {
                    p5: pct(5),
                    p25: pct(25),
                    p50: pct(50),
                    p75: pct(75),
                    p95: pct(95)
                },
                mean: {
                    ev: results.reduce((a, b) => a + b.ev, 0) / results.length,
                    equityValue: results.reduce((a, b) => a + b.equityValue, 0) / results.length,
                    perShare: shares
                        ? results.reduce((a, b) => a + (b.perShare || 0), 0) / results.length
                        : null
                },
                histogram: buildHistogram(
                    results.map(r => r.perShare || r.equityValue),
                    40
                ),
                currentPrice: state.market.currentPrice,
                netDebt: netDebt,
                sharesUsed: shares
            };

            dispatch({ type: 'SET_DCF_RESULTS', payload: dcfResults });
            setIsSimulating(false);
        }, 100);
    }, [state, latestYear, revenueGrowthMean, revenueGrowthStd, ebitdaMarginMean, ebitdaMarginStd, waccMean, waccStd, termGrowthMean, termGrowthStd, dispatch]);

    const dcfResults = state.dcfResults;

    // Calculate upside vs market
    const median = dcfResults?.percentiles.p50.perShare || dcfResults?.percentiles.p50.equityValue || 0;
    const marketPrice = dcfResults?.currentPrice;
    const upside = marketPrice ? (median - marketPrice) / marketPrice : null;

    // Verdict
    const getVerdict = () => {
        if (!marketPrice || upside === null) return { label: 'BRAK DANYCH O CENIE', color: 'amber' };
        if (upside > 0.20) return { label: 'NIEDOWARTOŚCIOWANA', color: 'emerald' };
        if (upside > -0.10) return { label: 'WYCENIONA RYNKOWO', color: 'amber' };
        return { label: 'PRZEWARTOŚCIOWANA', color: 'rose' };
    };

    const verdict = getVerdict();

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-purple-500/3 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button
                        onClick={() => router.push('/valuation/load')}
                        className="text-gray-500 hover:text-white text-sm mb-2 transition-colors"
                    >
                        ← Zmień spółkę
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-mono font-bold">
                                Wycena DCF — {companyName}
                            </h1>
                            <div className="text-sm text-gray-500 mt-1">
                                {ticker && `${ticker} • `}{currency} • {state.sourceLabel}
                            </div>
                        </div>
                        {state.market.currentPrice && (
                            <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase">Cena rynkowa</div>
                                <div className="text-2xl font-mono font-bold text-white">
                                    {formatNumber(state.market.currentPrice, currency)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 py-8">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column */}
                    <div className="col-span-7 space-y-6">
                        {/* Historical Financials */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm">📊</span>
                                    Dane historyczne
                                </h2>
                                <button
                                    onClick={autoCalibrate}
                                    className="px-4 py-2 text-sm rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    🔮 Auto-kalibruj
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-2 text-gray-500 font-normal">Metryka</th>
                                            {years.map(y => (
                                                <th key={y} className="text-right py-2 text-gray-400 font-mono">FY{y}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicalRows.map((row, idx) => (
                                            <tr key={row.label} className={idx % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                                                <td className="py-2 text-gray-400">{row.label}</td>
                                                {row.values.map((val, i) => (
                                                    <td key={i} className={`text-right py-2 font-mono ${row.isPercent
                                                            ? (val !== null && val > 0 ? 'text-emerald-400' : val !== null && val < 0 ? 'text-rose-400' : 'text-white')
                                                            : 'text-white'
                                                        }`}>
                                                        {row.format(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>

                        {/* Monte Carlo Assumptions */}
                        <GlassCard className="p-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">🎲</span>
                                Założenia Monte Carlo
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <AssumptionInput
                                    label="Revenue Growth"
                                    icon="📈"
                                    mean={revenueGrowthMean}
                                    std={revenueGrowthStd}
                                    onMeanChange={setRevenueGrowthMean}
                                    onStdChange={setRevenueGrowthStd}
                                    color="emerald"
                                />
                                <AssumptionInput
                                    label="EBITDA Margin"
                                    icon="💰"
                                    mean={ebitdaMarginMean}
                                    std={ebitdaMarginStd}
                                    onMeanChange={setEbitdaMarginMean}
                                    onStdChange={setEbitdaMarginStd}
                                    color="cyan"
                                />
                                <AssumptionInput
                                    label="WACC"
                                    icon="⚖️"
                                    mean={waccMean}
                                    std={waccStd}
                                    onMeanChange={setWaccMean}
                                    onStdChange={setWaccStd}
                                    color="purple"
                                />
                                <AssumptionInput
                                    label="Terminal Growth"
                                    icon="🌱"
                                    mean={termGrowthMean}
                                    std={termGrowthStd}
                                    onMeanChange={setTermGrowthMean}
                                    onStdChange={setTermGrowthStd}
                                    color="amber"
                                />
                            </div>
                        </GlassCard>

                        {/* Run Button */}
                        <button
                            onClick={runMonteCarlo}
                            disabled={isSimulating}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-lg hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                        >
                            {isSimulating ? '⏳ Symulacja w toku...' : '▶ Uruchom Monte Carlo DCF • 10,000 scenariuszy'}
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="col-span-5 space-y-6">
                        {/* Results */}
                        <GlassCard className="p-6" glowColor="emerald">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm">💎</span>
                                Wyniki wyceny
                            </h2>

                            {!dcfResults ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl opacity-30 mb-3">📊</div>
                                    <div className="text-gray-400">Uruchom symulację Monte Carlo</div>
                                    <div className="text-gray-500 text-sm">aby zobaczyć rozkład wyceny</div>
                                </div>
                            ) : (
                                <>
                                    {/* Hero Value */}
                                    <div className="text-center mb-6">
                                        <div className="text-4xl font-mono font-bold text-emerald-400">
                                            {dcfResults.percentiles.p50.perShare !== null
                                                ? formatNumber(dcfResults.percentiles.p50.perShare, currency)
                                                : formatNumber(dcfResults.percentiles.p50.equityValue, currency)
                                            }
                                        </div>
                                        <div className="text-gray-400 text-sm mt-1">
                                            {dcfResults.percentiles.p50.perShare !== null ? '/ akcję (mediana)' : 'wartość kapitału (mediana)'}
                                        </div>
                                        {upside !== null && (
                                            <div className={`mt-2 text-sm font-medium ${upside > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                vs cena rynkowa: {upside > 0 ? '↑' : '↓'} {formatPercent(Math.abs(upside))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Histogram */}
                                    <PremiumHistogram
                                        data={dcfResults.histogram}
                                        marketPrice={dcfResults.currentPrice}
                                        median={dcfResults.percentiles.p50.perShare || dcfResults.percentiles.p50.equityValue}
                                        currency={currency}
                                    />

                                    {/* Percentiles */}
                                    <div className="grid grid-cols-5 gap-2 mt-4">
                                        {[
                                            { label: 'P5', val: dcfResults.percentiles.p5 },
                                            { label: 'P25', val: dcfResults.percentiles.p25 },
                                            { label: 'P50', val: dcfResults.percentiles.p50, highlight: true },
                                            { label: 'P75', val: dcfResults.percentiles.p75 },
                                            { label: 'P95', val: dcfResults.percentiles.p95 }
                                        ].map(p => (
                                            <div
                                                key={p.label}
                                                className={`text-center py-2 rounded-lg ${p.highlight ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'}`}
                                            >
                                                <div className="text-xs text-gray-500">{p.label}</div>
                                                <div className={`font-mono text-sm ${p.highlight ? 'text-emerald-400' : 'text-white'}`}>
                                                    {formatNumber(p.val.perShare || p.val.equityValue, '')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Verdict */}
                                    <div className={`mt-4 p-4 rounded-xl text-center font-bold ${verdict.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                            verdict.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-rose-500/20 text-rose-400'
                                        }`}>
                                        {verdict.label}
                                    </div>
                                </>
                            )}
                        </GlassCard>

                        {/* Navigation Cards */}
                        <div className="space-y-3">
                            <NavCard
                                href="/valuation/benchmark"
                                icon="📈"
                                title="Analiza Porównawcza"
                                subtitle="Porównaj z grupą peerów"
                                color="cyan"
                            />
                            <NavCard
                                href="/valuation/sensitivity"
                                icon="🔥"
                                title="Analiza Wrażliwości"
                                subtitle="Heatmapa WACC / Terminal"
                                color="amber"
                            />
                            <NavCard
                                href="/valuation/health"
                                icon="🏥"
                                title="Health Check"
                                subtitle="Altman Z, Piotroski F scores"
                                color="emerald"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
