'use client';

// =============================================
// StochFin — Peer Benchmark (Spider Chart + Ranking)
// =============================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Spider Chart Component (SVG Radar)
// =============================================

interface SpiderMetric {
    label: string;
    value: number;
    benchmark: number;
    unit: string;
}

function SpiderChart({
    metrics,
    companyName
}: {
    metrics: SpiderMetric[];
    companyName: string;
}) {
    const n = metrics.length;
    const centerX = 200;
    const centerY = 200;
    const maxRadius = 150;

    // Convert polar to cartesian
    const polarToCartesian = (angle: number, radius: number) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return {
            x: centerX + radius * Math.cos(rad),
            y: centerY + radius * Math.sin(rad)
        };
    };

    // Get points for polygon
    const getPolygonPoints = (values: number[], maxValues: number[]) => {
        return values.map((val, i) => {
            const angle = (360 / n) * i;
            const ratio = Math.min(val / (maxValues[i] || 1), 1.5); // Cap at 150%
            const r = (ratio / 1.5) * maxRadius;
            const point = polarToCartesian(angle, r);
            return `${point.x},${point.y}`;
        }).join(' ');
    };

    const companyValues = metrics.map(m => m.value);
    const benchmarkValues = metrics.map(m => m.benchmark);
    const maxValues = metrics.map(m => Math.max(m.value, m.benchmark) * 1.2);

    return (
        <div className="relative">
            <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
                {/* Background circles */}
                {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <circle
                        key={i}
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * ratio}
                        fill="none"
                        stroke="#1F2937"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis lines */}
                {metrics.map((_, i) => {
                    const angle = (360 / n) * i;
                    const end = polarToCartesian(angle, maxRadius);
                    return (
                        <line
                            key={i}
                            x1={centerX}
                            y1={centerY}
                            x2={end.x}
                            y2={end.y}
                            stroke="#374151"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Benchmark polygon (gray) */}
                <polygon
                    points={getPolygonPoints(benchmarkValues, maxValues)}
                    fill="rgba(156,163,175,0.2)"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />

                {/* Company polygon (green) */}
                <polygon
                    points={getPolygonPoints(companyValues, maxValues)}
                    fill="rgba(16,185,129,0.3)"
                    stroke="#10B981"
                    strokeWidth="3"
                />

                {/* Data points */}
                {companyValues.map((val, i) => {
                    const angle = (360 / n) * i;
                    const ratio = Math.min(val / (maxValues[i] || 1), 1.5);
                    const r = (ratio / 1.5) * maxRadius;
                    const point = polarToCartesian(angle, r);
                    return (
                        <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="6"
                            fill="#10B981"
                            stroke="#06090F"
                            strokeWidth="2"
                        />
                    );
                })}

                {/* Labels */}
                {metrics.map((m, i) => {
                    const angle = (360 / n) * i;
                    const point = polarToCartesian(angle, maxRadius + 30);
                    return (
                        <text
                            key={i}
                            x={point.x}
                            y={point.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-gray-300 text-xs font-medium"
                        >
                            {m.label}
                        </text>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-emerald-500 rounded" />
                    <span className="text-gray-300">{companyName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-gray-500 rounded border-dashed" style={{ borderTop: '2px dashed' }} />
                    <span className="text-gray-500">Benchmark sektora</span>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Ranking Table Component
// =============================================

interface RankingItem {
    metric: string;
    company: number;
    sectorMedian: number;
    percentile: number;
    unit: string;
}

function RankingTable({ items }: { items: RankingItem[] }) {
    const getPercentileColor = (p: number) => {
        if (p >= 75) return 'text-emerald-400';
        if (p >= 50) return 'text-cyan-400';
        if (p >= 25) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getPercentileBar = (p: number) => {
        if (p >= 75) return 'bg-emerald-500';
        if (p >= 50) return 'bg-cyan-500';
        if (p >= 25) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                        <th className="text-left py-3 px-2">Wskaźnik</th>
                        <th className="text-right py-3 px-2">Spółka</th>
                        <th className="text-right py-3 px-2">Mediana sektora</th>
                        <th className="text-right py-3 px-2">Percentyl</th>
                        <th className="py-3 px-2 w-24"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-medium">{item.metric}</td>
                            <td className="py-3 px-2 text-right font-mono">
                                {item.company.toFixed(1)}{item.unit}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-gray-500">
                                {item.sectorMedian.toFixed(1)}{item.unit}
                            </td>
                            <td className={`py-3 px-2 text-right font-mono font-bold ${getPercentileColor(item.percentile)}`}>
                                P{item.percentile}
                            </td>
                            <td className="py-3 px-2">
                                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                                    <div
                                        className={`h-full ${getPercentileBar(item.percentile)} transition-all`}
                                        style={{ width: `${item.percentile}%` }}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// =============================================
// Main Page
// =============================================

export default function PeerBenchmarkPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            setData(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    // Calculate peer benchmark metrics
    const benchmarkData = useMemo(() => {
        if (!data) return null;

        const periods = data.statements?.income_statement?.periods || [];
        const income = data.statements?.income_statement?.data || {};
        const balance = data.statements?.balance_sheet?.data || {};
        const cashflow = data.statements?.cash_flow_statement?.data || {};

        const latestPeriod = periods[0];

        // Get company values
        const revenue = income.revenue?.[latestPeriod] || 0;
        const grossProfit = income.gross_profit?.[latestPeriod] || 0;
        const ebitda = income.ebitda?.[latestPeriod] || (income.operating_income?.[latestPeriod] || 0) * 1.15;
        const netIncome = income.net_income?.[latestPeriod] || 0;
        const totalAssets = balance.total_assets?.[latestPeriod] || 1;
        const totalEquity = balance.total_equity?.[latestPeriod] || 1;
        const totalDebt = (balance.long_term_debt?.[latestPeriod] || 0) + (balance.short_term_debt?.[latestPeriod] || 0);
        const ocf = cashflow.operating_cash_flow?.[latestPeriod] || 0;

        // Calculate ratios
        const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
        const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
        const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
        const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
        const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0;

        // Sector benchmarks (example: Tech sector medians)
        const sectorBenchmarks = {
            grossMargin: 45,
            ebitdaMargin: 25,
            netMargin: 15,
            roe: 20,
            roa: 10,
            debtToEquity: 0.8
        };

        // Spider chart data
        const spiderMetrics: SpiderMetric[] = [
            { label: 'Marża brutto', value: grossMargin, benchmark: sectorBenchmarks.grossMargin, unit: '%' },
            { label: 'Marża EBITDA', value: ebitdaMargin, benchmark: sectorBenchmarks.ebitdaMargin, unit: '%' },
            { label: 'Marża netto', value: netMargin, benchmark: sectorBenchmarks.netMargin, unit: '%' },
            { label: 'ROE', value: roe, benchmark: sectorBenchmarks.roe, unit: '%' },
            { label: 'ROA', value: roa, benchmark: sectorBenchmarks.roa, unit: '%' },
            { label: 'Dług/Kapitał', value: debtToEquity * 10, benchmark: sectorBenchmarks.debtToEquity * 10, unit: '' }, // Scaled for visibility
        ];

        // Calculate percentiles (simplified - based on benchmark comparison)
        const calculatePercentile = (value: number, benchmark: number, higherBetter: boolean = true) => {
            const ratio = value / benchmark;
            if (higherBetter) {
                if (ratio >= 1.5) return 90;
                if (ratio >= 1.2) return 75;
                if (ratio >= 1.0) return 60;
                if (ratio >= 0.8) return 40;
                if (ratio >= 0.5) return 25;
                return 10;
            } else {
                if (ratio <= 0.5) return 90;
                if (ratio <= 0.8) return 75;
                if (ratio <= 1.0) return 60;
                if (ratio <= 1.2) return 40;
                if (ratio <= 1.5) return 25;
                return 10;
            }
        };

        // Ranking table data
        const rankingItems: RankingItem[] = [
            { metric: 'Marża brutto', company: grossMargin, sectorMedian: sectorBenchmarks.grossMargin, percentile: calculatePercentile(grossMargin, sectorBenchmarks.grossMargin), unit: '%' },
            { metric: 'Marża EBITDA', company: ebitdaMargin, sectorMedian: sectorBenchmarks.ebitdaMargin, percentile: calculatePercentile(ebitdaMargin, sectorBenchmarks.ebitdaMargin), unit: '%' },
            { metric: 'Marża netto', company: netMargin, sectorMedian: sectorBenchmarks.netMargin, percentile: calculatePercentile(netMargin, sectorBenchmarks.netMargin), unit: '%' },
            { metric: 'ROE', company: roe, sectorMedian: sectorBenchmarks.roe, percentile: calculatePercentile(roe, sectorBenchmarks.roe), unit: '%' },
            { metric: 'ROA', company: roa, sectorMedian: sectorBenchmarks.roa, percentile: calculatePercentile(roa, sectorBenchmarks.roa), unit: '%' },
            { metric: 'Dług/Kapitał', company: debtToEquity, sectorMedian: sectorBenchmarks.debtToEquity, percentile: calculatePercentile(debtToEquity, sectorBenchmarks.debtToEquity, false), unit: 'x' },
        ];

        // Overall score
        const avgPercentile = Math.round(rankingItems.reduce((sum, r) => sum + r.percentile, 0) / rankingItems.length);

        return {
            spiderMetrics,
            rankingItems,
            avgPercentile
        };
    }, [data]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Ładowanie...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#06090F] flex flex-col items-center justify-center gap-4 text-white">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-gray-400">Brak załadowanych danych</p>
                <button onClick={() => router.push('/valuation/load')} className="bg-cyan-600 px-6 py-2 rounded-lg text-sm">
                    Załaduj dane
                </button>
            </div>
        );
    }

    const sourceType = data.source === 'fmp' || data.source === 'alpha_vantage' ? 'api' : 'pdf';

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0A0E17]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button onClick={() => router.push('/valuation/health')} className="text-gray-500 hover:text-white text-sm mb-2">
                        ← Powrót do Health Check
                    </button>
                    <h1 className="text-2xl font-bold font-mono">
                        Peer Benchmark
                        <span className="text-gray-400 ml-3">— {data.ticker}</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span>Porównanie z sektorem</span>
                        <SourceBadge type={sourceType as any} source={data.source.toUpperCase()} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                {benchmarkData && (
                    <>
                        {/* Overall Score */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mb-8 text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pozycja względem sektora</div>
                            <div className={`text-5xl font-mono font-bold ${benchmarkData.avgPercentile >= 75 ? 'text-emerald-400' :
                                    benchmarkData.avgPercentile >= 50 ? 'text-cyan-400' :
                                        benchmarkData.avgPercentile >= 25 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                P{benchmarkData.avgPercentile}
                            </div>
                            <div className="text-gray-500 text-sm mt-1">
                                Średni percentyl w 6 kluczowych wskaźnikach
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            {/* Spider Chart */}
                            <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                                <h3 className="text-lg font-semibold mb-4 text-center">🕸️ Spider Chart</h3>
                                <SpiderChart
                                    metrics={benchmarkData.spiderMetrics}
                                    companyName={data.ticker}
                                />
                            </div>

                            {/* Interpretation */}
                            <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                                <h3 className="text-lg font-semibold mb-4">📊 Interpretacja</h3>

                                <div className="space-y-4">
                                    {benchmarkData.spiderMetrics.map((m, i) => {
                                        const ratio = m.value / m.benchmark;
                                        const isGood = ratio >= 1;

                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 bg-[#0A0E17] rounded-lg">
                                                <span className="text-gray-400">{m.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{m.value.toFixed(1)}{m.unit}</span>
                                                    <span className={isGood ? 'text-emerald-400' : 'text-amber-400'}>
                                                        {isGood ? '▲' : '▼'}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        vs {m.benchmark.toFixed(1)}{m.unit}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Ranking Table */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-4">🏆 Ranking Wielowymiarowy</h3>
                            <RankingTable items={benchmarkData.rankingItems} />

                            {/* Legend */}
                            <div className="mt-4 flex gap-4 text-xs text-gray-500">
                                <span><span className="text-emerald-400">P75+</span> = Top quartile</span>
                                <span><span className="text-cyan-400">P50-74</span> = Powyżej mediany</span>
                                <span><span className="text-amber-400">P25-49</span> = Poniżej mediany</span>
                                <span><span className="text-rose-400">&lt;P25</span> = Bottom quartile</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="mt-8 flex gap-4">
                            <button
                                onClick={() => router.push('/valuation/comps')}
                                className="flex-1 bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">📈</span>
                                <div>
                                    <div className="font-medium">Porównawcza</div>
                                    <div className="text-xs text-gray-500">Mnożniki peer group</div>
                                </div>
                            </button>
                            <button
                                onClick={() => router.push('/valuation/health')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">📊</span>
                                <div>
                                    <div className="font-medium">Health Check</div>
                                    <div className="text-xs text-emerald-200">Pełna diagnostyka</div>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
