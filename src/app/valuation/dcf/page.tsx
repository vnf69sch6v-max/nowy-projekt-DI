'use client';

// =============================================
// StochFin - DCF Valuation Dashboard
// Real data only - with source badges
// =============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge, ValueWithSource, EmptyDataState } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// DCF Dashboard Page
// =============================================

export default function DCFDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [loading, setLoading] = useState(true);
    const [assumptions, setAssumptions] = useState({
        revenue_growth: { mean: 5, std: 3 },
        ebitda_margin: { mean: 30, std: 5 },
        wacc: { mean: 9, std: 1 },
        terminal_growth: { mean: 2.5, std: 0.5 }
    });
    const [simulating, setSimulating] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            setData(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    const handleAutoCalibrate = () => {
        if (!data?.statements.income_statement.data.revenue) return;

        const revenue = data.statements.income_statement.data.revenue;
        const periods = data.statements.income_statement.periods;

        // Calculate growth rates
        const growths: number[] = [];
        for (let i = 1; i < periods.length; i++) {
            const prev = revenue[periods[i]];
            const curr = revenue[periods[i - 1]];
            if (prev && curr) {
                growths.push((curr - prev) / prev);
            }
        }

        if (growths.length > 0) {
            const mean = growths.reduce((a, b) => a + b, 0) / growths.length * 100;
            const variance = growths.reduce((sum, g) => sum + Math.pow(g * 100 - mean, 2), 0) / growths.length;
            const std = Math.sqrt(variance);

            setAssumptions(prev => ({
                ...prev,
                revenue_growth: { mean: parseFloat(mean.toFixed(1)), std: parseFloat(std.toFixed(1)) }
            }));
        }
    };

    const runSimulation = async () => {
        setSimulating(true);
        // TODO: Integrate with Monte Carlo simulation API
        await new Promise(r => setTimeout(r, 2000));
        setSimulating(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Ładowanie...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#06090F] flex flex-col items-center justify-center gap-4">
                <p className="text-gray-400">Brak załadowanych danych</p>
                <button
                    onClick={() => router.push('/valuation/load')}
                    className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg text-sm"
                >
                    Załaduj dane
                </button>
            </div>
        );
    }

    const sourceType = data.source === 'fmp' || data.source === 'alpha_vantage' ? 'api' :
        data.source === 'manual' ? 'manual' : 'pdf';
    const periods = data.statements.income_statement.periods;
    const income = data.statements.income_statement.data;
    const cashFlow = data.statements.cash_flow_statement?.data || {};

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0A0E17]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <button
                                onClick={() => router.push('/valuation/load')}
                                className="text-gray-500 hover:text-white text-sm mb-2"
                            >
                                ← Zmień spółkę
                            </button>
                            <h1 className="text-2xl font-bold font-mono">
                                {data.company_name}
                                {data.ticker && (
                                    <span className="text-gray-400 ml-3">({data.ticker})</span>
                                )}
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <span>{data.exchange}</span>
                                <span>•</span>
                                <span>{data.sector}</span>
                                <span>•</span>
                                <span>{data.currency}</span>
                                <SourceBadge
                                    type={sourceType as any}
                                    source={`${data.source.toUpperCase()}, ${new Date(data.fetched_at).toLocaleDateString('pl-PL')}`}
                                />
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="flex gap-6">
                            {data.current_price && (
                                <div className="bg-[#111827] rounded-lg px-4 py-3 border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cena</div>
                                    <div className="text-xl font-mono">${data.current_price.toFixed(2)}</div>
                                    <SourceBadge type="api" compact />
                                </div>
                            )}
                            {data.market_cap && (
                                <div className="bg-[#111827] rounded-lg px-4 py-3 border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mkt Cap</div>
                                    <div className="text-xl font-mono">
                                        ${(data.market_cap / 1e12).toFixed(2)}T
                                    </div>
                                    <SourceBadge type="api" compact />
                                </div>
                            )}
                            {data.metrics?.pe_ratio && (
                                <div className="bg-[#111827] rounded-lg px-4 py-3 border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">P/E</div>
                                    <div className="text-xl font-mono">
                                        {data.metrics.pe_ratio.toFixed(1)}x
                                    </div>
                                    <SourceBadge type="api" compact />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                <div className="grid grid-cols-12 gap-8">
                    {/* Left Column - Historical Data */}
                    <div className="col-span-7">
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-4">Dane Historyczne</h2>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                                            <th className="text-left py-3 pr-4"></th>
                                            {periods.map(period => (
                                                <th key={period} className="text-right py-3 px-2">
                                                    <div>FY{period}</div>
                                                    <SourceBadge type={sourceType as any} compact />
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {/* Revenue */}
                                        <tr className="border-b border-white/5">
                                            <td className="py-3 pr-4 text-gray-400">Revenue</td>
                                            {periods.map(period => (
                                                <td key={period} className="text-right py-3 px-2">
                                                    <ValueWithSource
                                                        value={income.revenue?.[period]}
                                                        format="currency"
                                                        currency={data.currency}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* EBITDA */}
                                        <tr className="border-b border-white/5">
                                            <td className="py-3 pr-4 text-gray-400">EBITDA</td>
                                            {periods.map(period => (
                                                <td key={period} className="text-right py-3 px-2">
                                                    <ValueWithSource
                                                        value={income.ebitda?.[period]}
                                                        format="currency"
                                                        currency={data.currency}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Net Income */}
                                        <tr className="border-b border-white/5">
                                            <td className="py-3 pr-4 text-gray-400">Net Income</td>
                                            {periods.map(period => (
                                                <td key={period} className="text-right py-3 px-2">
                                                    <ValueWithSource
                                                        value={income.net_income?.[period]}
                                                        format="currency"
                                                        currency={data.currency}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* FCF */}
                                        <tr className="border-b border-white/5">
                                            <td className="py-3 pr-4 text-gray-400">Free Cash Flow</td>
                                            {periods.map(period => (
                                                <td key={period} className="text-right py-3 px-2">
                                                    <ValueWithSource
                                                        value={cashFlow.free_cash_flow?.[period]}
                                                        format="currency"
                                                        currency={data.currency}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Assumptions */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Założenia Monte Carlo</h2>
                                <button
                                    onClick={handleAutoCalibrate}
                                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                >
                                    🔮 Auto-kalibruj z historii
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Revenue Growth */}
                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider">
                                        Wzrost Przychodów (r/r)
                                    </label>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <span className="text-xs text-gray-500">μ</span>
                                            <input
                                                type="number"
                                                value={assumptions.revenue_growth.mean}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    revenue_growth: { ...prev.revenue_growth, mean: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">σ</span>
                                            <input
                                                type="number"
                                                value={assumptions.revenue_growth.std}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    revenue_growth: { ...prev.revenue_growth, std: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* EBITDA Margin */}
                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider">
                                        Marża EBITDA
                                    </label>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <span className="text-xs text-gray-500">μ</span>
                                            <input
                                                type="number"
                                                value={assumptions.ebitda_margin.mean}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    ebitda_margin: { ...prev.ebitda_margin, mean: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">σ</span>
                                            <input
                                                type="number"
                                                value={assumptions.ebitda_margin.std}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    ebitda_margin: { ...prev.ebitda_margin, std: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* WACC */}
                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider">
                                        WACC
                                    </label>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <span className="text-xs text-gray-500">μ</span>
                                            <input
                                                type="number"
                                                value={assumptions.wacc.mean}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    wacc: { ...prev.wacc, mean: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">σ</span>
                                            <input
                                                type="number"
                                                value={assumptions.wacc.std}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    wacc: { ...prev.wacc, std: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Terminal Growth */}
                                <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider">
                                        Terminal Growth
                                    </label>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <span className="text-xs text-gray-500">μ</span>
                                            <input
                                                type="number"
                                                value={assumptions.terminal_growth.mean}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    terminal_growth: { ...prev.terminal_growth, mean: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">σ</span>
                                            <input
                                                type="number"
                                                value={assumptions.terminal_growth.std}
                                                onChange={e => setAssumptions(prev => ({
                                                    ...prev,
                                                    terminal_growth: { ...prev.terminal_growth, std: parseFloat(e.target.value) }
                                                }))}
                                                className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-right ml-1"
                                            />
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={simulating}
                                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {simulating ? (
                                    <>
                                        <span className="animate-spin">⟳</span>
                                        Symulacja w toku...
                                    </>
                                ) : (
                                    <>▶ Uruchom Symulację DCF (10,000 scenariuszy)</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Results */}
                    <div className="col-span-5">
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-4">Wyniki Wyceny</h2>

                            <div className="text-center py-12 text-gray-500">
                                <div className="text-4xl mb-4">📊</div>
                                <p>Uruchom symulację Monte Carlo</p>
                                <p className="text-sm mt-1">aby zobaczyć rozkład wartości</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={() => router.push('/valuation/comps')}
                                className="w-full bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-3 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-xl">📈</span>
                                <div>
                                    <div className="font-medium">Wycena Porównawcza</div>
                                    <div className="text-xs text-gray-500">Porównaj z peer group</div>
                                </div>
                            </button>
                            <button
                                onClick={() => router.push('/valuation/sensitivity')}
                                className="w-full bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-3 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-xl">🔥</span>
                                <div>
                                    <div className="font-medium">Analiza Wrażliwości</div>
                                    <div className="text-xs text-gray-500">Heatmap WACC / Terminal</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
