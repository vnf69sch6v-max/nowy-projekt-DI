'use client';

// =============================================
// StochFin - Sensitivity Analysis
// WACC / Terminal Growth Heatmap
// =============================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Sensitivity Calculation
// =============================================

function calculateDCF(
    revenue: number,
    ebitdaMargin: number,
    wacc: number,
    terminalGrowth: number,
    netDebt: number,
    shares: number,
    forecastYears: number = 5,
    revenueGrowth: number = 0.05
): number {
    const depPercent = 0.15;
    const taxRate = 0.21;
    const capexRatio = 0.03;
    const nwcRatio = 0.05;

    let rev = revenue;
    let prevRev = revenue;
    let pvFCF = 0;

    for (let y = 1; y <= forecastYears; y++) {
        rev = rev * (1 + revenueGrowth);
        const ebitda = rev * ebitdaMargin;
        const dep = ebitda * depPercent;
        const ebit = ebitda - dep;
        const nopat = ebit * (1 - taxRate);
        const capex = rev * capexRatio;
        const deltaNWC = (rev - prevRev) * nwcRatio;
        const fcf = nopat + dep - capex - deltaNWC;
        pvFCF += fcf / Math.pow(1 + wacc, y);
        prevRev = rev;
    }

    const terminalFCF = rev * ebitdaMargin * (1 - depPercent) * (1 - taxRate) * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminal = terminalValue / Math.pow(1 + wacc, forecastYears);

    const ev = pvFCF + pvTerminal;
    const equity = Math.max(0, ev - netDebt);
    return equity / shares;
}

// =============================================
// Sensitivity Page
// =============================================

export default function SensitivityPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [loading, setLoading] = useState(true);

    // Sensitivity ranges
    const [waccRange, setWaccRange] = useState([7, 8, 9, 10, 11, 12, 13]);
    const [terminalGrowthRange, setTerminalGrowthRange] = useState([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]);
    const [baseWacc, setBaseWacc] = useState(9);
    const [baseTerminalGrowth, setBaseTerminalGrowth] = useState(2.5);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            setData(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    // Calculate matrix
    const matrix = useMemo(() => {
        if (!data) return [];

        const latestYear = data.statements?.income_statement?.periods?.[0] || '';
        const revenue = data.statements?.income_statement?.data?.revenue?.[latestYear] || 0;
        const ebitda = data.statements?.income_statement?.data?.ebitda?.[latestYear] || 0;
        const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0.3;
        const netDebt = (data.statements?.balance_sheet?.data?.long_term_debt?.[latestYear] || 0) -
            (data.statements?.balance_sheet?.data?.cash?.[latestYear] || 0);
        const shares = data.shares_outstanding || 1000000000;

        return terminalGrowthRange.map(tg =>
            waccRange.map(wacc =>
                calculateDCF(revenue, ebitdaMargin, wacc / 100, tg / 100, netDebt, shares)
            )
        );
    }, [data, waccRange, terminalGrowthRange]);

    // Find min/max for color scaling
    const allValues = matrix.flat();
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;

    // Color scale: red (low) -> yellow (mid) -> green (high)
    const getColor = (value: number) => {
        const normalized = (value - minValue) / valueRange;
        if (normalized < 0.5) {
            const r = 239;
            const g = Math.round(68 + (normalized * 2) * (180 - 68));
            const b = 68;
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const r = Math.round(239 - ((normalized - 0.5) * 2) * (239 - 16));
            const g = Math.round(180 + ((normalized - 0.5) * 2) * (185 - 180));
            const b = Math.round(68 + ((normalized - 0.5) * 2) * (129 - 68));
            return `rgb(${r}, ${g}, ${b})`;
        }
    };

    // Text color based on background brightness
    const getTextColor = (bgColor: string) => {
        const match = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (!match) return 'white';
        const [, r, g, b] = match.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#0A0E17' : 'white';
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
            <div className="min-h-screen bg-[#06090F] flex flex-col items-center justify-center gap-4 text-white">
                <p className="text-gray-400">Brak załadowanych danych</p>
                <button onClick={() => router.push('/valuation/load')} className="bg-cyan-600 px-6 py-2 rounded-lg text-sm">
                    Załaduj dane
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0A0E17]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button onClick={() => router.push('/valuation/dcf')} className="text-gray-500 hover:text-white text-sm mb-2">
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-bold font-mono">
                        Analiza Wrażliwości
                        <span className="text-gray-400 ml-3">({data.ticker})</span>
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-8 py-8">
                {/* Heatmap */}
                <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                    <h2 className="text-lg font-semibold mb-6">Macierz WACC / Terminal Growth</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="p-2 text-right text-xs text-gray-500">
                                        <div>Terminal ↓</div>
                                        <div>WACC →</div>
                                    </th>
                                    {waccRange.map(wacc => (
                                        <th
                                            key={wacc}
                                            className={`p-2 text-center text-xs font-mono ${wacc === baseWacc ? 'text-cyan-400 font-bold' : 'text-gray-400'
                                                }`}
                                        >
                                            {wacc.toFixed(0)}%
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {terminalGrowthRange.map((tg, rowIdx) => (
                                    <tr key={tg}>
                                        <td className={`p-2 text-right text-xs font-mono ${tg === baseTerminalGrowth ? 'text-cyan-400 font-bold' : 'text-gray-400'
                                            }`}>
                                            {tg.toFixed(1)}%
                                        </td>
                                        {waccRange.map((wacc, colIdx) => {
                                            const value = matrix[rowIdx]?.[colIdx] || 0;
                                            const bgColor = getColor(value);
                                            const isBase = wacc === baseWacc && tg === baseTerminalGrowth;

                                            return (
                                                <td
                                                    key={wacc}
                                                    className={`p-3 text-center font-mono text-sm transition-all ${isBase ? 'ring-2 ring-cyan-400' : ''
                                                        }`}
                                                    style={{
                                                        backgroundColor: bgColor,
                                                        color: getTextColor(bgColor)
                                                    }}
                                                >
                                                    ${value.toFixed(0)}
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
                        <span className="text-gray-500">Niska wartość</span>
                        <div className="flex h-4 w-32 rounded overflow-hidden">
                            <div className="flex-1 bg-rose-500" />
                            <div className="flex-1 bg-amber-400" />
                            <div className="flex-1 bg-emerald-500" />
                        </div>
                        <span className="text-gray-500">Wysoka wartość</span>
                    </div>

                    {/* Market Price Reference */}
                    {data.current_price && (
                        <div className="text-center mt-4 text-sm text-gray-400">
                            Aktualna cena rynkowa: <span className="font-mono text-rose-400">${data.current_price.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Range Controls */}
                <div className="bg-[#111827] rounded-xl border border-white/5 p-6 mt-6">
                    <h2 className="text-lg font-semibold mb-4">Parametry bazowe</h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Bazowy WACC
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={5}
                                    max={15}
                                    step={0.5}
                                    value={baseWacc}
                                    onChange={e => setBaseWacc(parseFloat(e.target.value))}
                                    className="flex-1 accent-cyan-500"
                                />
                                <span className="font-mono w-12 text-right">{baseWacc}%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Bazowy Terminal Growth
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0.5}
                                    max={5}
                                    step={0.5}
                                    value={baseTerminalGrowth}
                                    onChange={e => setBaseTerminalGrowth(parseFloat(e.target.value))}
                                    className="flex-1 accent-cyan-500"
                                />
                                <span className="font-mono w-12 text-right">{baseTerminalGrowth}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="mt-6 flex gap-4">
                    <button
                        onClick={() => router.push('/valuation/comps')}
                        className="flex-1 bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-3 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                    >
                        <span className="text-xl">📈</span>
                        <div>
                            <div className="font-medium">Wycena Porównawcza</div>
                            <div className="text-xs text-gray-500">Peer Group</div>
                        </div>
                    </button>
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                    >
                        <span className="text-xl">💰</span>
                        <div>
                            <div className="font-medium">Powrót do DCF</div>
                            <div className="text-xs text-emerald-200">Monte Carlo</div>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
}
