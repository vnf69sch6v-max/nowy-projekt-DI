'use client';

// =============================================
// StochFin - Premium DCF Valuation Dashboard
// Modern fintech UI with glassmorphism
// =============================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge, ValueWithSource } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Types
// =============================================

interface SimulationResult {
    n_scenarios: number;
    enterprise_value: ValueStats;
    equity_value: ValueStats;
    per_share: ValueStats;
    terminal_value_pct: number;
    histogram: { bin_start: number; bin_end: number; count: number }[];
}

interface ValueStats {
    mean: number;
    median: number;
    std: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
}

// =============================================
// Premium Glass Card Component
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
            {/* Premium inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// =============================================
// Animated Value Display
// =============================================

function AnimatedValue({
    value,
    prefix = '',
    suffix = '',
    decimals = 2,
    size = 'lg',
    color = 'emerald'
}: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: 'emerald' | 'cyan' | 'white' | 'amber';
}) {
    const sizeMap = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-5xl'
    };

    const colorMap = {
        emerald: 'text-emerald-400',
        cyan: 'text-cyan-400',
        white: 'text-white',
        amber: 'text-amber-400'
    };

    return (
        <span className={`font-mono font-bold ${sizeMap[size]} ${colorMap[color]} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            {prefix}{value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
        </span>
    );
}

// =============================================
// Premium Histogram Chart
// =============================================

function PremiumHistogram({
    data,
    marketPrice,
    median
}: {
    data: { bin_start: number; bin_end: number; count: number }[];
    marketPrice?: number;
    median: number;
}) {
    const maxCount = Math.max(...data.map(d => d.count));
    const minValue = data[0]?.bin_start || 0;
    const maxValue = data[data.length - 1]?.bin_end || 100;

    return (
        <div className="relative p-6">
            {/* Background grid */}
            <div className="absolute inset-6 grid grid-rows-4 opacity-10">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="border-t border-white/20" />
                ))}
            </div>

            <div className="relative h-52">
                <div className="flex items-end h-44 gap-[2px]">
                    {data.map((bin, idx) => {
                        const height = (bin.count / maxCount) * 100;
                        const isAboveMarket = marketPrice && bin.bin_start >= marketPrice;

                        return (
                            <div
                                key={idx}
                                className="flex-1 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer group relative"
                                style={{
                                    height: `${height}%`,
                                    background: isAboveMarket
                                        ? 'linear-gradient(180deg, #10B981 0%, #059669 50%, #047857 100%)'
                                        : 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
                                    boxShadow: isAboveMarket
                                        ? '0 0 20px rgba(16, 185, 129, 0.3)'
                                        : '0 0 20px rgba(139, 92, 246, 0.2)',
                                    animationDelay: `${idx * 20}ms`
                                }}
                            >
                                {/* Tooltip */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border border-white/10 z-20">
                                    <div className="font-mono">${bin.bin_start.toFixed(0)} - ${bin.bin_end.toFixed(0)}</div>
                                    <div className="text-gray-400">{bin.count.toLocaleString()} scenarios</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* X-axis */}
                <div className="flex justify-between mt-4 text-xs text-gray-400 font-mono">
                    <span>${minValue.toFixed(0)}</span>
                    <span className="text-gray-500">Value per Share</span>
                    <span>${maxValue.toFixed(0)}</span>
                </div>

                {/* Market price line */}
                {marketPrice && marketPrice >= minValue && marketPrice <= maxValue && (
                    <div
                        className="absolute top-0 h-44 w-0.5 bg-gradient-to-b from-rose-500 via-rose-500 to-transparent"
                        style={{
                            left: `${((marketPrice - minValue) / (maxValue - minValue)) * 100}%`
                        }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50" />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rose-500/20 backdrop-blur-sm border border-rose-500/30 px-3 py-1 rounded-full text-xs text-rose-300 font-mono whitespace-nowrap">
                            Market ${marketPrice.toFixed(0)}
                        </div>
                    </div>
                )}

                {/* Median line */}
                {median >= minValue && median <= maxValue && (
                    <div
                        className="absolute top-0 h-44 w-0.5 border-l-2 border-dashed border-emerald-400/60"
                        style={{
                            left: `${((median - minValue) / (maxValue - minValue)) * 100}%`
                        }}
                    >
                        <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 text-xs text-emerald-400 font-mono whitespace-nowrap">
                            Median ${median.toFixed(0)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================
// Percentile Pill
// =============================================

function PercentilePill({
    label,
    value,
    highlight = false
}: {
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div className={`
            px-4 py-3 rounded-xl text-center transition-all duration-300
            ${highlight
                ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 border border-white/5 hover:bg-white/10'}
        `}>
            <div className={`text-xs font-medium mb-1 ${highlight ? 'text-emerald-300' : 'text-gray-500'}`}>
                {label}
            </div>
            <div className={`font-mono font-semibold ${highlight ? 'text-emerald-400 text-lg' : 'text-white'}`}>
                ${value.toFixed(0)}
            </div>
        </div>
    );
}

// =============================================
// Assumption Input Card
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
        emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 focus-within:border-emerald-500/40',
        cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 focus-within:border-cyan-500/40',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 focus-within:border-purple-500/40',
        amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 focus-within:border-amber-500/40'
    };

    return (
        <div className={`
            relative rounded-xl p-4 
            bg-gradient-to-br ${colorMap[color]}
            border transition-all duration-300
        `}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Mean (μ)</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={mean}
                            onChange={e => onMeanChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-right focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <span className="text-gray-500 text-sm w-6">{unit}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Std Dev (σ)</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={std}
                            onChange={e => onStdChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-right focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <span className="text-gray-500 text-sm w-6">{unit}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Navigation Card
// =============================================

function NavCard({
    href,
    icon,
    title,
    subtitle,
    color = 'white'
}: {
    href: string;
    icon: string;
    title: string;
    subtitle: string;
    color?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'white';
}) {
    const router = useRouter();
    const colorMap = {
        emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
        cyan: 'hover:border-cyan-500/30 hover:shadow-cyan-500/10',
        purple: 'hover:border-purple-500/30 hover:shadow-purple-500/10',
        amber: 'hover:border-amber-500/30 hover:shadow-amber-500/10',
        white: 'hover:border-white/20 hover:shadow-white/5'
    };

    return (
        <button
            onClick={() => router.push(href)}
            className={`
                w-full p-4 rounded-xl text-left
                bg-gradient-to-br from-white/[0.05] to-transparent
                border border-white/[0.08]
                transition-all duration-300
                hover:translate-y-[-2px] hover:shadow-xl
                ${colorMap[color]}
                group
            `}
        >
            <div className="flex items-center gap-4">
                <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                <div>
                    <div className="font-medium text-white group-hover:text-emerald-300 transition-colors">{title}</div>
                    <div className="text-xs text-gray-500">{subtitle}</div>
                </div>
                <div className="ml-auto text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all">→</div>
            </div>
        </button>
    );
}

// =============================================
// Main DCF Dashboard
// =============================================

export default function DCFDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [loading, setLoading] = useState(true);
    const [assumptions, setAssumptions] = useState({
        revenue_growth: { type: 'normal', mean: 5, std: 3 },
        ebitda_margin: { type: 'normal', mean: 30, std: 5 },
        capex_to_revenue: { type: 'normal', mean: 3, std: 1 },
        nwc_to_revenue_delta: { type: 'normal', mean: 5, std: 2 },
        wacc: { type: 'normal', mean: 9, std: 1 },
        terminal_growth: { type: 'normal', mean: 2.5, std: 0.5 }
    });
    const [simulating, setSimulating] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            setData(parsed);

            // Auto-calibrate EBITDA margin from data if available
            if (parsed.statements?.income_statement?.data) {
                const income = parsed.statements.income_statement.data;
                const periods = parsed.statements.income_statement.periods;

                const margins: number[] = [];
                for (const period of periods) {
                    const rev = income.revenue?.[period];
                    const ebitda = income.ebitda?.[period];
                    if (rev && ebitda) {
                        margins.push((ebitda / rev) * 100);
                    }
                }
                if (margins.length > 0) {
                    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
                    const stdMargin = Math.sqrt(margins.reduce((sum, m) => sum + Math.pow(m - avgMargin, 2), 0) / margins.length);
                    setAssumptions(prev => ({
                        ...prev,
                        ebitda_margin: { ...prev.ebitda_margin, mean: Math.round(avgMargin * 10) / 10, std: Math.max(2, Math.round(stdMargin * 10) / 10) }
                    }));
                }
            }
        }
        setLoading(false);
    }, []);

    const runSimulation = async () => {
        if (!data) return;
        setSimulating(true);
        setResult(null);

        try {
            const periods = data.statements.income_statement.periods;
            const latestPeriod = periods[0];
            const revenue = data.statements.income_statement.data.revenue?.[latestPeriod] || 0;
            const fcf = data.statements.cash_flow_statement?.data?.free_cash_flow?.[latestPeriod] || revenue * 0.1;

            const balance = data.statements.balance_sheet?.data;
            const debt = balance?.long_term_debt?.[latestPeriod] || 0;
            const cash = balance?.cash?.[latestPeriod] || 0;
            const netDebt = debt - cash;

            const shares = data.shares_outstanding || 1000000000;

            const res = await fetch('/api/valuation/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base_year_revenue: revenue,
                    base_year_fcf: fcf,
                    net_debt: netDebt,
                    shares_outstanding: shares,
                    forecast_years: 5,
                    n_scenarios: 10000,
                    assumptions
                })
            });

            const json = await res.json();
            if (json.result) {
                setResult(json.result);
            }
        } catch (error) {
            console.error('Simulation error:', error);
        } finally {
            setSimulating(false);
        }
    };

    const upsideProbability = useMemo(() => {
        if (!result || !data?.current_price) return null;
        return (result.histogram.filter(b => b.bin_start >= data.current_price!).reduce((sum, b) => sum + b.count, 0) / result.n_scenarios) * 100;
    }, [result, data?.current_price]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#030712] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-gray-400">Loading data...</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!data) {
        return (
            <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                    <span className="text-4xl">📊</span>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">No Data Loaded</h2>
                    <p className="text-gray-500">Load company financials to start valuation</p>
                </div>
                <button
                    onClick={() => router.push('/valuation/load')}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-full font-medium text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
                >
                    Load Company Data
                </button>
            </div>
        );
    }

    const sourceType = data.source === 'fmp' || data.source === 'alpha_vantage' ? 'api' :
        data.source === 'manual' ? 'manual' : 'pdf';
    const periods = data.statements.income_statement.periods;
    const income = data.statements.income_statement.data;

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated background gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-purple-500/3 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <button
                                onClick={() => router.push('/valuation/load')}
                                className="text-gray-500 hover:text-emerald-400 text-sm mb-2 flex items-center gap-2 transition-colors"
                            >
                                <span>←</span> Change Company
                            </button>
                            <h1 className="text-3xl font-bold">
                                <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                    {data.company_name}
                                </span>
                                {data.ticker && (
                                    <span className="text-lg text-gray-500 ml-3 font-normal">({data.ticker})</span>
                                )}
                            </h1>
                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                <span>{data.exchange}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                <span>{data.sector}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                <span>{data.currency}</span>
                                <SourceBadge type={sourceType as any} source={data.source.toUpperCase()} />
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="flex gap-4">
                            {data.current_price && (
                                <GlassCard className="px-5 py-4" hover={false}>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Price</div>
                                    <div className="text-2xl font-mono font-bold text-white">
                                        ${data.current_price.toFixed(2)}
                                    </div>
                                </GlassCard>
                            )}
                            {data.market_cap && (
                                <GlassCard className="px-5 py-4" hover={false}>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mkt Cap</div>
                                    <div className="text-2xl font-mono font-bold text-white">
                                        ${(data.market_cap / 1e12).toFixed(2)}T
                                    </div>
                                </GlassCard>
                            )}
                            {data.metrics?.pe_ratio && (
                                <GlassCard className="px-5 py-4" hover={false}>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">P/E</div>
                                    <div className="text-2xl font-mono font-bold text-white">
                                        {data.metrics.pe_ratio.toFixed(1)}x
                                    </div>
                                </GlassCard>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 py-8">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column - Historical Data & Assumptions */}
                    <div className="col-span-7 space-y-6">
                        {/* Historical Data */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm">📊</span>
                                    Historical Financials
                                </h2>
                                <button className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-white/20">
                                    Auto-calibrate →
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-xs uppercase">
                                            <th className="text-left py-3 pr-4 font-medium"></th>
                                            {periods.map(period => (
                                                <th key={period} className="text-right py-3 px-2 font-medium">
                                                    <span className="px-2 py-1 rounded-md bg-white/5">FY{period}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {[
                                            { key: 'revenue', label: 'Revenue', icon: '💰' },
                                            { key: 'ebitda', label: 'EBITDA', icon: '📈' },
                                            { key: 'net_income', label: 'Net Income', icon: '💵' },
                                        ].map(row => (
                                            <tr key={row.key} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 pr-4 text-gray-400 flex items-center gap-2">
                                                    <span>{row.icon}</span>
                                                    {row.label}
                                                </td>
                                                {periods.map(period => (
                                                    <td key={period} className="text-right py-4 px-2">
                                                        <ValueWithSource
                                                            value={(income as any)[row.key]?.[period]}
                                                            format="currency"
                                                            currency={data.currency}
                                                        />
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
                            <div className="flex items-center gap-2 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">🎲</span>
                                <h2 className="text-lg font-semibold">Monte Carlo Assumptions</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <AssumptionInput
                                    label="Revenue Growth"
                                    icon="📈"
                                    mean={assumptions.revenue_growth.mean}
                                    std={assumptions.revenue_growth.std}
                                    onMeanChange={val => setAssumptions(prev => ({ ...prev, revenue_growth: { ...prev.revenue_growth, mean: val } }))}
                                    onStdChange={val => setAssumptions(prev => ({ ...prev, revenue_growth: { ...prev.revenue_growth, std: val } }))}
                                    color="emerald"
                                />
                                <AssumptionInput
                                    label="EBITDA Margin"
                                    icon="💹"
                                    mean={assumptions.ebitda_margin.mean}
                                    std={assumptions.ebitda_margin.std}
                                    onMeanChange={val => setAssumptions(prev => ({ ...prev, ebitda_margin: { ...prev.ebitda_margin, mean: val } }))}
                                    onStdChange={val => setAssumptions(prev => ({ ...prev, ebitda_margin: { ...prev.ebitda_margin, std: val } }))}
                                    color="cyan"
                                />
                                <AssumptionInput
                                    label="WACC"
                                    icon="⚖️"
                                    mean={assumptions.wacc.mean}
                                    std={assumptions.wacc.std}
                                    onMeanChange={val => setAssumptions(prev => ({ ...prev, wacc: { ...prev.wacc, mean: val } }))}
                                    onStdChange={val => setAssumptions(prev => ({ ...prev, wacc: { ...prev.wacc, std: val } }))}
                                    color="purple"
                                />
                                <AssumptionInput
                                    label="Terminal Growth"
                                    icon="🔮"
                                    mean={assumptions.terminal_growth.mean}
                                    std={assumptions.terminal_growth.std}
                                    onMeanChange={val => setAssumptions(prev => ({ ...prev, terminal_growth: { ...prev.terminal_growth, mean: val } }))}
                                    onStdChange={val => setAssumptions(prev => ({ ...prev, terminal_growth: { ...prev.terminal_growth, std: val } }))}
                                    color="amber"
                                />
                            </div>

                            {/* Run Simulation Button */}
                            <button
                                onClick={runSimulation}
                                disabled={simulating}
                                className="w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
                                    boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <span className="relative flex items-center justify-center gap-3">
                                    {simulating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Running 10,000 Scenarios...
                                        </>
                                    ) : (
                                        <>
                                            ▶ Run Monte Carlo DCF
                                            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">10,000 scenarios</span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </GlassCard>
                    </div>

                    {/* Right Column - Results */}
                    <div className="col-span-5 space-y-6">
                        <GlassCard className="p-6" glowColor="emerald">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm">💎</span>
                                Valuation Results
                            </h2>

                            {!result ? (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                        <span className="text-4xl opacity-50">📊</span>
                                    </div>
                                    <p className="text-gray-400">Run Monte Carlo simulation</p>
                                    <p className="text-sm text-gray-600 mt-1">to see value distribution</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Hero Value */}
                                    <div className="text-center py-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                            Estimated Value per Share
                                        </div>
                                        <AnimatedValue
                                            value={result.per_share.median}
                                            prefix="$"
                                            size="xl"
                                            color="emerald"
                                        />
                                        <div className="text-sm text-gray-500 mt-2">
                                            median from {result.n_scenarios.toLocaleString()} scenarios
                                        </div>

                                        {data.current_price && (
                                            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${result.per_share.median > data.current_price
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                <span className="font-mono font-bold">
                                                    {result.per_share.median > data.current_price ? '↑' : '↓'}
                                                    {Math.abs(((result.per_share.median - data.current_price) / data.current_price) * 100).toFixed(1)}%
                                                </span>
                                                <span className="text-xs opacity-70">vs market ${data.current_price.toFixed(0)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Percentiles */}
                                    <div className="grid grid-cols-5 gap-2">
                                        <PercentilePill label="P5" value={result.per_share.p5} />
                                        <PercentilePill label="P25" value={result.per_share.p25} />
                                        <PercentilePill label="P50" value={result.per_share.p50} highlight />
                                        <PercentilePill label="P75" value={result.per_share.p75} />
                                        <PercentilePill label="P95" value={result.per_share.p95} />
                                    </div>

                                    {/* Histogram */}
                                    <PremiumHistogram
                                        data={result.histogram}
                                        marketPrice={data.current_price || undefined}
                                        median={result.per_share.median}
                                    />

                                    {/* Upside Probability */}
                                    {upsideProbability !== null && (
                                        <div className={`p-5 rounded-xl text-center ${upsideProbability >= 50
                                                ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30'
                                                : 'bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30'
                                            }`}>
                                            <div className={`text-3xl font-bold font-mono ${upsideProbability >= 50 ? 'text-emerald-400' : 'text-rose-400'
                                                }`}>
                                                {upsideProbability.toFixed(0)}%
                                            </div>
                                            <div className="text-sm text-gray-400 mt-1">
                                                scenarios above market price
                                            </div>
                                        </div>
                                    )}

                                    {/* Terminal Value Warning */}
                                    {result.terminal_value_pct > 0.75 && (
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-start gap-3">
                                            <span className="text-xl">⚠️</span>
                                            <div>
                                                <div className="font-medium">High Terminal Value Sensitivity</div>
                                                <div className="text-amber-500/70 text-xs mt-1">
                                                    Terminal Value = {(result.terminal_value_pct * 100).toFixed(0)}% of valuation
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </GlassCard>

                        {/* Navigation Cards */}
                        <div className="space-y-3">
                            <NavCard
                                href="/valuation/comps"
                                icon="📈"
                                title="Comparable Analysis"
                                subtitle="Compare with peer group"
                                color="cyan"
                            />
                            <NavCard
                                href="/valuation/sensitivity"
                                icon="🔥"
                                title="Sensitivity Analysis"
                                subtitle="WACC / Terminal heatmap"
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
