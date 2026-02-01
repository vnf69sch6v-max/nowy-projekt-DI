'use client';

// =============================================
// StochFin — Health Check Dashboard
// Comprehensive financial health diagnostics
// =============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Types
// =============================================

interface HealthResult {
    overall_score: number;
    components: {
        altman_z: AltmanResult;
        piotroski_f: PiotrostkiResult;
        beneish_m: BeneishResult;
        dupont: DuPontResult;
        ratios: RatiosResult;
        cashflow_quality: CashflowResult;
    };
    warnings: string[];
    computed_at: string;
}

interface AltmanResult {
    score: number;
    zone: 'safe' | 'grey' | 'distress';
    label: string;
    component_score: number;
    max_score: number;
    breakdown: Record<string, { value: number; weighted: number }>;
}

interface PiotrostkiResult {
    score: number;
    label: string;
    criteria: { id: number; name: string; pass: boolean; detail: string }[];
}

interface BeneishResult {
    score: number | null;
    label: string;
    is_manipulator: boolean | null;
}

interface DuPontResult {
    roe: number;
    decomposition: {
        tax_burden: number;
        interest_burden: number;
        ebit_margin: number;
        asset_turnover: number;
        equity_multiplier: number;
    };
}

interface RatiosResult {
    liquidity: Record<string, { value: number; benchmark: number; status: string }>;
    solvency: Record<string, { value: number; benchmark: number; status: string }>;
    profitability: Record<string, { value: number; benchmark: number; status: string }>;
    efficiency: Record<string, { value: number; benchmark: number; status: string }>;
}

interface CashflowResult {
    accrual_ratio: number;
    ocf_to_ni_ratio: number;
    fcf_positive: boolean;
}

// =============================================
// Gauge Component
// =============================================

function HealthGauge({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 86) return { main: '#10B981', glow: 'rgba(16,185,129,0.4)' };
        if (score >= 71) return { main: '#10B981', glow: 'rgba(16,185,129,0.3)' };
        if (score >= 51) return { main: '#38BDF8', glow: 'rgba(56,189,248,0.3)' };
        if (score >= 31) return { main: '#F59E0B', glow: 'rgba(245,158,11,0.3)' };
        return { main: '#EF4444', glow: 'rgba(239,68,68,0.4)' };
    };

    const getLabel = () => {
        if (score >= 86) return 'DOSKONAŁY';
        if (score >= 71) return 'DOBRY';
        if (score >= 51) return 'STABILNY';
        if (score >= 31) return 'SŁABY';
        return 'KRYTYCZNY';
    };

    const color = getColor();
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-52 h-52 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="104"
                    cy="104"
                    r="90"
                    fill="none"
                    stroke="#1F2937"
                    strokeWidth="12"
                />
                {/* Progress circle */}
                <circle
                    cx="104"
                    cy="104"
                    r="90"
                    fill="none"
                    stroke={color.main}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        filter: `drop-shadow(0 0 12px ${color.glow})`,
                        transition: 'stroke-dashoffset 1s ease-out'
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold font-mono" style={{ color: color.main }}>
                    {score}
                </span>
                <span className="text-gray-500 text-lg">/100</span>
                <span
                    className="text-xs uppercase tracking-wider mt-1 font-semibold"
                    style={{ color: color.main }}
                >
                    {getLabel()}
                </span>
            </div>
        </div>
    );
}

// =============================================
// Altman Z-Score Bar
// =============================================

function AltmanZBar({ result }: { result: AltmanResult }) {
    const getZonePosition = (z: number) => {
        if (z <= 0) return 0;
        if (z >= 5) return 100;
        return (z / 5) * 100;
    };

    return (
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔬</span>
                <h3 className="text-lg font-semibold">ALTMAN Z-SCORE</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Prawdopodobieństwo bankructwa w ciągu 2 lat</p>

            {/* Zone Bar */}
            <div className="relative h-10 rounded-lg overflow-hidden mb-2">
                <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-rose-500/30" />
                    <div className="flex-1 bg-amber-500/30" />
                    <div className="flex-1 bg-emerald-500/30" />
                </div>
                {/* Marker */}
                <div
                    className="absolute top-0 h-full w-1 bg-white rounded shadow-lg"
                    style={{ left: `${getZonePosition(result.score)}%`, transform: 'translateX(-50%)' }}
                />
            </div>

            {/* Labels */}
            <div className="flex text-xs mb-4">
                <div className="flex-1 text-center text-rose-400">ZAGROŻENIE<br />&lt; 1.8</div>
                <div className="flex-1 text-center text-amber-400">SZARA STREFA<br />1.8 - 3.0</div>
                <div className="flex-1 text-center text-emerald-400">BEZPIECZNA<br />&gt; 3.0</div>
            </div>

            {/* Score */}
            <div className={`text-center py-3 rounded-lg ${result.zone === 'safe' ? 'bg-emerald-500/20 text-emerald-400' :
                    result.zone === 'grey' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                }`}>
                <span className="text-2xl font-mono font-bold">Z = {result.score}</span>
                <span className="ml-2 text-sm">"{result.label}"</span>
            </div>

            {/* Breakdown Table */}
            <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-500 text-xs uppercase">
                            <th className="text-left py-2">Komponent</th>
                            <th className="text-right py-2">Wartość</th>
                            <th className="text-right py-2">Wkład</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono">
                        <tr className="border-t border-white/5">
                            <td className="py-2 text-gray-400">A: Kap. obrotowy/Aktywa</td>
                            <td className="text-right text-gray-300">{result.breakdown?.A?.value?.toFixed(3)}</td>
                            <td className="text-right text-cyan-400">{result.breakdown?.A?.weighted?.toFixed(3)}</td>
                        </tr>
                        <tr className="border-t border-white/5">
                            <td className="py-2 text-gray-400">B: Zysk zatrz./Aktywa</td>
                            <td className="text-right text-gray-300">{result.breakdown?.B?.value?.toFixed(3)}</td>
                            <td className="text-right text-cyan-400">{result.breakdown?.B?.weighted?.toFixed(3)}</td>
                        </tr>
                        <tr className="border-t border-white/5">
                            <td className="py-2 text-gray-400">C: EBIT/Aktywa</td>
                            <td className="text-right text-gray-300">{result.breakdown?.C?.value?.toFixed(3)}</td>
                            <td className="text-right text-cyan-400">{result.breakdown?.C?.weighted?.toFixed(3)}</td>
                        </tr>
                        <tr className="border-t border-white/5">
                            <td className="py-2 text-gray-400">D: Mkt Cap/Zobow.</td>
                            <td className="text-right text-gray-300">{result.breakdown?.D?.value?.toFixed(3)}</td>
                            <td className="text-right text-cyan-400">{result.breakdown?.D?.weighted?.toFixed(3)}</td>
                        </tr>
                        <tr className="border-t border-white/5">
                            <td className="py-2 text-gray-400">E: Przychody/Aktywa</td>
                            <td className="text-right text-gray-300">{result.breakdown?.E?.value?.toFixed(3)}</td>
                            <td className="text-right text-cyan-400">{result.breakdown?.E?.weighted?.toFixed(3)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// =============================================
// Piotroski F-Score
// =============================================

function PiotroskiFScore({ result }: { result: PiotrostkiResult }) {
    return (
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📊</span>
                <h3 className="text-lg font-semibold">PIOTROSKI F-SCORE</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Siła finansowa spółki (0-9)</p>

            {/* Score Display */}
            <div className={`text-center py-4 rounded-lg mb-4 ${result.score >= 7 ? 'bg-emerald-500/20' :
                    result.score >= 4 ? 'bg-amber-500/20' :
                        'bg-rose-500/20'
                }`}>
                <span className={`text-4xl font-mono font-bold ${result.score >= 7 ? 'text-emerald-400' :
                        result.score >= 4 ? 'text-amber-400' :
                            'text-rose-400'
                    }`}>
                    {result.score}/9
                </span>
                <div className={`text-sm mt-1 ${result.score >= 7 ? 'text-emerald-400' :
                        result.score >= 4 ? 'text-amber-400' :
                            'text-rose-400'
                    }`}>
                    {result.label}
                </div>
            </div>

            {/* Criteria Checklist */}
            <div className="space-y-2">
                {result.criteria?.map(c => (
                    <div
                        key={c.id}
                        className={`flex items-center justify-between p-2 rounded border-l-3 ${c.pass
                                ? 'bg-emerald-500/10 border-emerald-500'
                                : 'bg-rose-500/10 border-rose-500'
                            }`}
                        style={{ borderLeftWidth: '3px' }}
                    >
                        <div className="flex items-center gap-2">
                            <span>{c.pass ? '✓' : '✗'}</span>
                            <span className="text-sm">{c.name}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-400">{c.detail}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================
// Ratio Card
// =============================================

function RatioCard({
    label,
    value,
    unit = '',
    status,
    formula
}: {
    label: string;
    value: number;
    unit?: string;
    status: string;
    formula?: string;
}) {
    const statusColors = {
        excellent: 'bg-emerald-500',
        ok: 'bg-cyan-500',
        warning: 'bg-amber-500',
        critical: 'bg-rose-500'
    };

    const statusLabels = {
        excellent: '✓ Doskonały',
        ok: '✓ OK',
        warning: '⚠️ Uwaga',
        critical: '🚨 Krytyczny'
    };

    return (
        <div className="bg-[#0A0E17] rounded-lg p-4 border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
            <div className="flex items-end gap-2">
                <span className="text-xl font-mono font-bold">{value?.toFixed?.(2) || value}{unit}</span>
                <div className={`w-2 h-2 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`} />
            </div>
            <div className={`text-xs mt-1 ${status === 'excellent' || status === 'ok' ? 'text-emerald-400' :
                    status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                {statusLabels[status as keyof typeof statusLabels] || status}
            </div>
            {formula && <div className="text-xs text-gray-600 mt-1">{formula}</div>}
        </div>
    );
}

// =============================================
// DuPont Tree
// =============================================

function DuPontTree({ result }: { result: DuPontResult }) {
    const d = result.decomposition;

    return (
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔍</span>
                <h3 className="text-lg font-semibold">ANALIZA DUPONT (Dekompozycja ROE)</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Skąd pochodzi zwrot na kapitale?</p>

            {/* ROE Hero */}
            <div className="text-center mb-6">
                <div className="text-xs text-gray-500 uppercase">ROE</div>
                <div className="text-4xl font-mono font-bold text-emerald-400">
                    {(result.roe * 100).toFixed(1)}%
                </div>
            </div>

            {/* 5-Way Decomposition Grid */}
            <div className="grid grid-cols-5 gap-2 text-center">
                <div className="bg-[#0A0E17] rounded-lg p-3">
                    <div className="text-xs text-gray-500">Tax Burden</div>
                    <div className="text-lg font-mono">{d.tax_burden?.toFixed(2)}</div>
                </div>
                <div className="text-xl flex items-center justify-center text-gray-600">×</div>
                <div className="bg-[#0A0E17] rounded-lg p-3">
                    <div className="text-xs text-gray-500">Interest Burden</div>
                    <div className="text-lg font-mono">{d.interest_burden?.toFixed(2)}</div>
                </div>
                <div className="text-xl flex items-center justify-center text-gray-600">×</div>
                <div className="bg-[#0A0E17] rounded-lg p-3">
                    <div className="text-xs text-gray-500">EBIT Margin</div>
                    <div className="text-lg font-mono">{(d.ebit_margin * 100).toFixed(1)}%</div>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center mt-2">
                <div className="col-span-2" />
                <div className="text-xl flex items-center justify-center text-gray-600">×</div>
                <div className="bg-[#0A0E17] rounded-lg p-3">
                    <div className="text-xs text-gray-500">Asset Turnover</div>
                    <div className="text-lg font-mono">{d.asset_turnover?.toFixed(2)}x</div>
                </div>
                <div className="text-xl flex items-center justify-center text-gray-600">×</div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center mt-2">
                <div className="col-span-3" />
                <div className="col-span-2 bg-violet-500/20 border border-violet-500/30 rounded-lg p-3">
                    <div className="text-xs text-violet-400">Equity Multiplier</div>
                    <div className="text-lg font-mono text-violet-400">{d.equity_multiplier?.toFixed(2)}x</div>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Main Health Dashboard Page
// =============================================

export default function HealthDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [health, setHealth] = useState<HealthResult | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            setData(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (data && !health) {
            calculateHealth();
        }
    }, [data]);

    const calculateHealth = async () => {
        if (!data) return;
        setCalculating(true);

        try {
            const res = await fetch('/api/valuation/health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ financials: data })
            });

            const json = await res.json();
            if (json.result) {
                setHealth(json.result);
            }
        } catch (error) {
            console.error('Health calculation error:', error);
        } finally {
            setCalculating(false);
        }
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
                <div className="text-5xl mb-4">📊</div>
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

    const sourceType = data.source === 'fmp' || data.source === 'alpha_vantage' ? 'api' : 'pdf';

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0A0E17]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button onClick={() => router.push('/valuation/dcf')} className="text-gray-500 hover:text-white text-sm mb-2">
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-bold font-mono">
                        Health Check
                        <span className="text-gray-400 ml-3">— {data.company_name} ({data.ticker})</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span>Kompleksowa diagnostyka kondycji finansowej</span>
                        <SourceBadge type={sourceType as any} source={data.source.toUpperCase()} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                {calculating ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin text-4xl mb-4">⟳</div>
                        <p className="text-gray-400">Obliczam wskaźniki kondycji...</p>
                    </div>
                ) : health ? (
                    <>
                        {/* Hero Section: Overall Score */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-8 mb-8">
                            <HealthGauge score={health.overall_score} />
                            <p className="text-center text-gray-500 text-sm mt-4 max-w-md mx-auto">
                                Ocena zagregowana z: Altman Z-Score, Piotroski F-Score, wskaźniki finansowe, analiza cash flow
                            </p>

                            {/* Warnings */}
                            {health.warnings.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    {health.warnings.map((w, i) => (
                                        <div key={i} className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-400 text-sm">
                                            ⚠️ {w}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Altman & Piotroski Row */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <AltmanZBar result={health.components.altman_z} />
                            <PiotroskiFScore result={health.components.piotroski_f} />
                        </div>

                        {/* DuPont */}
                        <div className="mb-6">
                            <DuPontTree result={health.components.dupont} />
                        </div>

                        {/* Financial Ratios - 4 Columns */}
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-6">📈 Wskaźniki Finansowe</h3>

                            <div className="grid grid-cols-4 gap-6">
                                {/* Liquidity */}
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                        💧 Płynność
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(health.components.ratios.liquidity).map(([key, r]) => (
                                            <RatioCard
                                                key={key}
                                                label={key.replace(/_/g, ' ')}
                                                value={r.value}
                                                unit="x"
                                                status={r.status}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Solvency */}
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                        🏦 Wypłacalność
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(health.components.ratios.solvency).map(([key, r]) => (
                                            <RatioCard
                                                key={key}
                                                label={key.replace(/_/g, ' ')}
                                                value={r.value}
                                                unit="x"
                                                status={r.status}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Profitability */}
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                        💰 Rentowność
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(health.components.ratios.profitability).map(([key, r]) => (
                                            <RatioCard
                                                key={key}
                                                label={key.replace(/_/g, ' ')}
                                                value={r.value}
                                                unit="%"
                                                status={r.status}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Efficiency */}
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                        ⚡ Efektywność
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(health.components.ratios.efficiency).map(([key, r]) => (
                                            <RatioCard
                                                key={key}
                                                label={key.replace(/_/g, ' ')}
                                                value={r.value}
                                                unit={key.includes('dso') ? ' dni' : 'x'}
                                                status={r.status}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Beneish M-Score */}
                        {health.components.beneish_m.score !== null && (
                            <div className={`mt-6 p-4 rounded-lg border ${health.components.beneish_m.is_manipulator
                                    ? 'bg-rose-500/10 border-rose-500/30'
                                    : 'bg-emerald-500/10 border-emerald-500/30'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">
                                        {health.components.beneish_m.is_manipulator ? '🕵️' : '✓'}
                                    </span>
                                    <div>
                                        <div className="font-semibold">
                                            Beneish M-Score: {health.components.beneish_m.score}
                                        </div>
                                        <div className={`text-sm ${health.components.beneish_m.is_manipulator
                                                ? 'text-rose-400'
                                                : 'text-emerald-400'
                                            }`}>
                                            {health.components.beneish_m.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cash Flow Quality */}
                        <div className="mt-6 bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-4">💎 Jakość Cash Flow</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-[#0A0E17] rounded-lg p-4 text-center">
                                    <div className="text-xs text-gray-500 uppercase">Accrual Ratio</div>
                                    <div className={`text-2xl font-mono ${health.components.cashflow_quality.accrual_ratio < 0
                                            ? 'text-emerald-400'
                                            : 'text-amber-400'
                                        }`}>
                                        {(health.components.cashflow_quality.accrual_ratio * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {health.components.cashflow_quality.accrual_ratio < 0
                                            ? '✓ Zyski poparte gotówką'
                                            : '⚠️ Zyski > Cash Flow'}
                                    </div>
                                </div>
                                <div className="bg-[#0A0E17] rounded-lg p-4 text-center">
                                    <div className="text-xs text-gray-500 uppercase">OCF / Net Income</div>
                                    <div className={`text-2xl font-mono ${health.components.cashflow_quality.ocf_to_ni_ratio > 1
                                            ? 'text-emerald-400'
                                            : 'text-amber-400'
                                        }`}>
                                        {health.components.cashflow_quality.ocf_to_ni_ratio}x
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {health.components.cashflow_quality.ocf_to_ni_ratio > 1
                                            ? '✓ Wysoka jakość'
                                            : '⚠️ Niska jakość'}
                                    </div>
                                </div>
                                <div className="bg-[#0A0E17] rounded-lg p-4 text-center">
                                    <div className="text-xs text-gray-500 uppercase">Free Cash Flow</div>
                                    <div className={`text-2xl font-mono ${health.components.cashflow_quality.fcf_positive
                                            ? 'text-emerald-400'
                                            : 'text-rose-400'
                                        }`}>
                                        {health.components.cashflow_quality.fcf_positive ? '✓ Dodatni' : '✗ Ujemny'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="mt-8 grid grid-cols-3 gap-4">
                            <button
                                onClick={() => router.push('/valuation/dividends')}
                                className="bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">💎</span>
                                <div>
                                    <div className="font-medium">Dywidendy & Buyback</div>
                                    <div className="text-xs text-gray-500">Zwrot dla akcjonariuszy</div>
                                </div>
                            </button>
                            <button
                                onClick={() => router.push('/valuation/capital')}
                                className="bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">🏗️</span>
                                <div>
                                    <div className="font-medium">Struktura Kapitału</div>
                                    <div className="text-xs text-gray-500">Dług i finansowanie</div>
                                </div>
                            </button>
                            <button
                                onClick={() => router.push('/valuation/dcf')}
                                className="bg-emerald-600 hover:bg-emerald-500 py-4 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-2xl">💰</span>
                                <div>
                                    <div className="font-medium">Wycena DCF</div>
                                    <div className="text-xs text-emerald-200">Monte Carlo</div>
                                </div>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        Nie udało się obliczyć wskaźników kondycji.
                    </div>
                )}
            </main>
        </div>
    );
}
