'use client';

// =============================================
// StochFin — Struktura Kapitału
// =============================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Donut Chart Component
// =============================================

function CapitalDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let cumulativePercent = 0;

    // SVG donut chart
    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative w-64 h-64 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
                {data.map((segment, idx) => {
                    const percent = (segment.value / total) * 100;
                    const offset = circumference - (cumulativePercent / 100) * circumference;
                    const dashArray = (percent / 100) * circumference;
                    cumulativePercent += percent;

                    return (
                        <circle
                            key={idx}
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="32"
                            strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                            strokeDashoffset={-offset + circumference}
                        />
                    );
                })}
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500 uppercase">Total Capital</div>
                <div className="text-2xl font-mono font-bold">${(total / 1e9).toFixed(0)}B</div>
            </div>
        </div>
    );
}

// =============================================
// Coverage Gauge
// =============================================

function CoverageGauge({
    label,
    value,
    thresholds
}: {
    label: string;
    value: number;
    thresholds: { red: number; amber: number }
}) {
    const getStatus = () => {
        if (value >= thresholds.amber) return { color: '#10B981', label: '✓ Bezpieczny' };
        if (value >= thresholds.red) return { color: '#F59E0B', label: '⚠️ Umiarkowany' };
        return { color: '#EF4444', label: '🚨 Krytyczny' };
    };

    const status = getStatus();

    return (
        <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-mono font-bold" style={{ color: status.color }}>
                    {value.toFixed(1)}x
                </span>
            </div>
            <div className="text-xs mt-1" style={{ color: status.color }}>
                {status.label}
            </div>
        </div>
    );
}

// =============================================
// Main Page
// =============================================

export default function CapitalStructurePage() {
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

    // Calculate capital structure metrics
    const metrics = useMemo(() => {
        if (!data) return null;

        const periods = data.statements?.income_statement?.periods || [];
        const income = data.statements?.income_statement?.data || {};
        const balance = data.statements?.balance_sheet?.data || {};
        const cashflow = data.statements?.cash_flow_statement?.data || {};

        const latestPeriod = periods[0];

        const totalEquity = balance.total_equity?.[latestPeriod] || 0;
        const longTermDebt = balance.long_term_debt?.[latestPeriod] || 0;
        const shortTermDebt = balance.short_term_debt?.[latestPeriod] || 0;
        const totalDebt = longTermDebt + shortTermDebt;
        const totalLiabilities = balance.total_liabilities?.[latestPeriod] || totalDebt;
        const otherLiabilities = totalLiabilities - totalDebt;
        const totalCapital = totalEquity + totalLiabilities;

        const ebit = income.ebit?.[latestPeriod] || income.operating_income?.[latestPeriod] || 0;
        const interestExpense = income.interest_expense?.[latestPeriod] || 1;
        const ebitda = income.ebitda?.[latestPeriod] || ebit * 1.15;
        const operatingCF = cashflow.operating_cash_flow?.[latestPeriod] || 0;
        const cash = balance.cash?.[latestPeriod] || 0;

        const netDebt = totalDebt - cash;
        const interestCoverage = Math.abs(interestExpense) > 0 ? ebit / Math.abs(interestExpense) : 999;
        const netDebtToEBITDA = ebitda > 0 ? netDebt / ebitda : 0;

        // Implied cost of debt
        const avgDebt = totalDebt; // Simplified
        const impliedCostOfDebt = avgDebt > 0 ? (Math.abs(interestExpense) / avgDebt) * 100 : 0;

        // Capital structure breakdown
        const breakdown = [
            { label: 'Equity', value: totalEquity, color: '#10B981', percent: (totalEquity / totalCapital) * 100 },
            { label: 'Long-term Debt', value: longTermDebt, color: '#F59E0B', percent: (longTermDebt / totalCapital) * 100 },
            { label: 'Short-term Debt', value: shortTermDebt, color: '#EF4444', percent: (shortTermDebt / totalCapital) * 100 },
            { label: 'Other Liabilities', value: otherLiabilities, color: '#6B7280', percent: (otherLiabilities / totalCapital) * 100 }
        ].filter(b => b.value > 0);

        return {
            totalEquity,
            longTermDebt,
            shortTermDebt,
            totalDebt,
            totalCapital,
            netDebt,
            interestCoverage,
            netDebtToEBITDA,
            impliedCostOfDebt,
            breakdown,
            debtToEquity: totalEquity > 0 ? totalDebt / totalEquity : 0,
            debtToAssets: balance.total_assets?.[latestPeriod] ? totalDebt / balance.total_assets[latestPeriod] : 0
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
                <div className="text-5xl mb-4">🏗️</div>
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
                        Struktura Kapitału
                        <span className="text-gray-400 ml-3">— {data.ticker}</span>
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                {metrics && (
                    <>
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            {/* Donut Chart */}
                            <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                                <h3 className="text-lg font-semibold mb-6 text-center">Struktura Finansowania</h3>

                                <CapitalDonut data={metrics.breakdown} />

                                {/* Legend */}
                                <div className="mt-6 space-y-2">
                                    {metrics.breakdown.map((b, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: b.color }} />
                                                <span>{b.label}</span>
                                            </div>
                                            <div className="font-mono">
                                                ${(b.value / 1e9).toFixed(1)}B ({b.percent.toFixed(0)}%)
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex justify-center">
                                    <SourceBadge type={sourceType as any} source={data.source.toUpperCase()} />
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                                <h3 className="text-lg font-semibold mb-6">Wskaźniki Zadłużenia</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase">Debt to Equity</div>
                                        <div className={`text-2xl font-mono font-bold ${metrics.debtToEquity < 1 ? 'text-emerald-400' :
                                                metrics.debtToEquity < 2 ? 'text-amber-400' : 'text-rose-400'
                                            }`}>
                                            {metrics.debtToEquity.toFixed(2)}x
                                        </div>
                                    </div>

                                    <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase">Debt to Assets</div>
                                        <div className="text-2xl font-mono font-bold">
                                            {(metrics.debtToAssets * 100).toFixed(0)}%
                                        </div>
                                    </div>

                                    <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase">Net Debt</div>
                                        <div className={`text-2xl font-mono font-bold ${metrics.netDebt < 0 ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                            ${(metrics.netDebt / 1e9).toFixed(1)}B
                                        </div>
                                        {metrics.netDebt < 0 && (
                                            <div className="text-xs text-emerald-400">✓ Net cash position</div>
                                        )}
                                    </div>

                                    <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase">Implied Cost of Debt</div>
                                        <div className="text-2xl font-mono font-bold">
                                            {metrics.impliedCostOfDebt.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coverage Ratios */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">🛡️ Coverage Ratios</h3>

                            <div className="grid grid-cols-3 gap-6">
                                <CoverageGauge
                                    label="Interest Coverage"
                                    value={metrics.interestCoverage}
                                    thresholds={{ red: 3, amber: 8 }}
                                />

                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Net Debt / EBITDA</div>
                                    <div className={`text-2xl font-mono font-bold ${metrics.netDebtToEBITDA < 2 ? 'text-emerald-400' :
                                            metrics.netDebtToEBITDA < 4 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                        {metrics.netDebtToEBITDA.toFixed(2)}x
                                    </div>
                                    <div className={`text-xs mt-1 ${metrics.netDebtToEBITDA < 2 ? 'text-emerald-400' :
                                            metrics.netDebtToEBITDA < 4 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                        {metrics.netDebtToEBITDA < 2 ? '✓ Niskie' :
                                            metrics.netDebtToEBITDA < 4 ? '⚠️ Umiarkowane' : '🚨 Wysokie'}
                                    </div>
                                </div>

                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Debt</div>
                                    <div className="text-2xl font-mono font-bold">
                                        ${(metrics.totalDebt / 1e9).toFixed(1)}B
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        LT: ${(metrics.longTermDebt / 1e9).toFixed(1)}B /
                                        ST: ${(metrics.shortTermDebt / 1e9).toFixed(1)}B
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Debt Maturity Notice */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8">
                            <div className="flex items-center gap-2 text-amber-400">
                                <span>ℹ️</span>
                                <span className="text-sm">
                                    Szczegółowy harmonogram zapadalności długu (debt maturity schedule)
                                    wymaga danych z raportu rocznego. Wgraj PDF ze sprawozdaniem finansowym.
                                </span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => router.push('/valuation/dividends')}
                                className="flex-1 bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">💎</span>
                                <div>
                                    <div className="font-medium">Dywidendy & Buyback</div>
                                    <div className="text-xs text-gray-500">Zwrot dla akcjonariuszy</div>
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
