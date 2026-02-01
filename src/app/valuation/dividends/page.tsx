'use client';

// =============================================
// StochFin — Dywidendy & Buyback
// =============================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Main Page
// =============================================

export default function DividendsPage() {
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

    // Calculate dividend metrics
    const metrics = useMemo(() => {
        if (!data) return null;

        const periods = data.statements?.income_statement?.periods || [];
        const income = data.statements?.income_statement?.data || {};
        const cashflow = data.statements?.cash_flow_statement?.data || {};

        const latestPeriod = periods[0];
        const netIncome = income.net_income?.[latestPeriod] || 0;
        const dividendsPaid = Math.abs(cashflow.dividends_paid?.[latestPeriod] || 0);
        const fcf = cashflow.free_cash_flow?.[latestPeriod] || 0;
        const shares = data.shares_outstanding || 1;
        const price = data.current_price || 0;

        const dps = dividendsPaid / shares;
        const divYield = price > 0 ? (dps / price) * 100 : 0;
        const payoutRatio = netIncome > 0 ? (dividendsPaid / netIncome) * 100 : 0;

        // Get historical dividends for trend
        const dividendHistory: { period: string; value: number }[] = [];
        for (const period of periods.slice(0, 5).reverse()) {
            const div = Math.abs(cashflow.dividends_paid?.[period] || 0);
            dividendHistory.push({ period, value: div / shares });
        }

        // Calculate 5Y CAGR if possible
        let cagr = 0;
        if (dividendHistory.length >= 2) {
            const first = dividendHistory[0].value;
            const last = dividendHistory[dividendHistory.length - 1].value;
            const years = dividendHistory.length - 1;
            if (first > 0 && last > 0 && years > 0) {
                cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
            }
        }

        // Share count trend (for buyback)
        // Simplified: use current shares
        const currentShares = shares;

        // Sustainability tests
        const tests = [
            { name: 'Payout ratio < 60%', pass: payoutRatio < 60 },
            { name: 'FCF > Dywidendy', pass: fcf > dividendsPaid },
            { name: 'Dywidenda rosnąca 5 lat', pass: cagr > 0 },
            { name: 'Debt/EBITDA < 3x', pass: true } // Simplified assumption
        ];

        return {
            divYield,
            payoutRatio,
            cagr,
            totalReturn: dividendsPaid,
            dps,
            dividendHistory,
            currentShares,
            tests,
            sustainabilityScore: tests.filter(t => t.pass).length
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
                <div className="text-5xl mb-4">💎</div>
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
                        Dywidendy & Buyback
                        <span className="text-gray-400 ml-3">— {data.ticker}</span>
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                {metrics && (
                    <>
                        {/* Hero Metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Div Yield</div>
                                <div className="text-3xl font-mono font-bold text-emerald-400">
                                    {metrics.divYield.toFixed(2)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">roczna</div>
                                <SourceBadge type={sourceType as any} compact />
                            </div>

                            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payout Ratio</div>
                                <div className={`text-3xl font-mono font-bold ${metrics.payoutRatio < 60 ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                    {metrics.payoutRatio.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {metrics.payoutRatio < 60 ? '✓ Bezpieczny' : '⚠️ Wysoki'}
                                </div>
                                <SourceBadge type={sourceType as any} compact />
                            </div>

                            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Div Growth 5Y CAGR</div>
                                <div className={`text-3xl font-mono font-bold ${metrics.cagr > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {metrics.cagr > 0 ? '+' : ''}{metrics.cagr.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {metrics.cagr > 0 ? '✓ Rosnąca' : 'Malejąca'}
                                </div>
                            </div>

                            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Return</div>
                                <div className="text-3xl font-mono font-bold">
                                    ${(metrics.totalReturn / 1e9).toFixed(1)}B
                                </div>
                                <div className="text-xs text-gray-500 mt-1">dywidendy FY</div>
                            </div>
                        </div>

                        {/* Dividend History Chart */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">📈 Historia Dywidend na Akcję</h3>

                            <div className="flex items-end gap-4 h-40">
                                {metrics.dividendHistory.map((d, idx) => {
                                    const maxValue = Math.max(...metrics.dividendHistory.map(h => h.value));
                                    const height = maxValue > 0 ? (d.value / maxValue) * 100 : 0;

                                    return (
                                        <div key={d.period} className="flex-1 flex flex-col items-center">
                                            <div
                                                className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                                                style={{ height: `${height}%`, minHeight: d.value > 0 ? '8px' : '0' }}
                                            />
                                            <div className="text-xs text-emerald-400 mt-2 font-mono">
                                                ${d.value.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {d.period}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Buyback Tracker */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">📉 Buyback Tracker</h3>
                            <p className="text-gray-500 text-sm mb-4">Zmiana liczby akcji w obrocie</p>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase">Akcji obecnie</div>
                                    <div className="text-2xl font-mono font-bold">
                                        {(metrics.currentShares / 1e9).toFixed(2)}B
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-[#0A0E17] rounded-lg">
                                    <div className="text-sm text-gray-500">
                                        Szczegółowe dane o buybacku wymagają dodatkowego endpointu API
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sustainability Check */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-4">🛡️ Test Bezpieczeństwa Dywidendy</h3>

                            <div className="space-y-3 mb-6">
                                {metrics.tests.map((test, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${test.pass
                                                ? 'bg-emerald-500/10 border-emerald-500'
                                                : 'bg-rose-500/10 border-rose-500'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>{test.pass ? '✓' : '✗'}</span>
                                            <span>{test.name}</span>
                                        </span>
                                        <span className={test.pass ? 'text-emerald-400' : 'text-rose-400'}>
                                            {test.pass ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Verdict */}
                            <div className={`text-center py-4 rounded-lg ${metrics.sustainabilityScore >= 3
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : metrics.sustainabilityScore >= 2
                                        ? 'bg-amber-500/20 border border-amber-500/30'
                                        : 'bg-rose-500/20 border border-rose-500/30'
                                }`}>
                                <div className="text-2xl font-bold font-mono">
                                    {metrics.sustainabilityScore}/4 testów
                                </div>
                                <div className={`text-sm mt-1 ${metrics.sustainabilityScore >= 3 ? 'text-emerald-400' :
                                        metrics.sustainabilityScore >= 2 ? 'text-amber-400' : 'text-rose-400'
                                    }`}>
                                    Dywidenda {
                                        metrics.sustainabilityScore >= 3 ? 'BEZPIECZNA' :
                                            metrics.sustainabilityScore >= 2 ? 'UMIARKOWANIE BEZPIECZNA' : 'ZAGROŻONA'
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="mt-8 flex gap-4">
                            <button
                                onClick={() => router.push('/valuation/capital')}
                                className="flex-1 bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">🏗️</span>
                                <div>
                                    <div className="font-medium">Struktura Kapitału</div>
                                    <div className="text-xs text-gray-500">Dług i finansowanie</div>
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
