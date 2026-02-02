'use client';

// =============================================
// StochFin — Health Check Dashboard
// Based on MASTER_PROMPTS v3 specification
// Altman Z-Score, Piotroski F-Score, Financial Ratios
// =============================================

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    getPreviousYear,
    safeDivide,
    formatPercent,
    formatMultiple
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

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
// Health Gauge Component
// =============================================

function HealthGauge({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 86) return { main: '#10B981', glow: 'rgba(16,185,129,0.4)', label: 'DOSKONAŁY' };
        if (score >= 71) return { main: '#10B981', glow: 'rgba(16,185,129,0.3)', label: 'DOBRY' };
        if (score >= 51) return { main: '#38BDF8', glow: 'rgba(56,189,248,0.3)', label: 'STABILNY' };
        if (score >= 31) return { main: '#F59E0B', glow: 'rgba(245,158,11,0.3)', label: 'SŁABY' };
        return { main: '#EF4444', glow: 'rgba(239,68,68,0.4)', label: 'KRYTYCZNY' };
    };

    const color = getColor();
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-52 h-52 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="104"
                    cy="104"
                    r="90"
                    fill="none"
                    stroke="#1F2937"
                    strokeWidth="12"
                />
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
                    {color.label}
                </span>
            </div>
        </div>
    );
}

// =============================================
// Altman Z-Score Zone Bar
// =============================================

function AltmanZoneBar({ z }: { z: number }) {
    const zClamped = Math.min(Math.max(z, 0), 5);
    const pct = (zClamped / 5) * 100;

    return (
        <div className="relative h-8 rounded-lg overflow-hidden flex">
            <div className="flex-1 bg-rose-500/30" />
            <div className="flex-1 bg-amber-500/30" />
            <div className="flex-1 bg-emerald-500/30" />
            {/* Zone labels */}
            <div className="absolute inset-0 flex text-xs font-medium text-white/70">
                <div className="flex-1 flex items-center justify-center">ZAGROŻENIE</div>
                <div className="flex-1 flex items-center justify-center">SZARA</div>
                <div className="flex-1 flex items-center justify-center">BEZPIECZNA</div>
            </div>
            {/* Marker */}
            <div
                className="absolute top-0 h-full"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
                <div className="w-4 h-4 bg-white rounded-full shadow-lg -mt-1 ml-[-6px]" />
                <div className="w-1 h-6 bg-white mx-auto" />
            </div>
        </div>
    );
}

// =============================================
// Ratio Card Component
// =============================================

function RatioCard({
    name,
    value,
    formatted,
    status,
    benchmark
}: {
    name: string;
    value: number | null;
    formatted: string;
    status: 'good' | 'ok' | 'bad' | null;
    benchmark: string;
}) {
    return (
        <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{name}</div>
            <div className={`text-2xl font-mono font-bold ${value !== null ? 'text-white' : 'text-gray-500'}`}>
                {formatted}
            </div>
            <div className="text-xs mt-1 flex items-center gap-2">
                {value !== null ? (
                    <span className={
                        status === 'good' ? 'text-emerald-400' :
                            status === 'bad' ? 'text-rose-400' : 'text-amber-400'
                    }>
                        {status === 'good' ? '✓ Dobry' : status === 'bad' ? '⚠ Słaby' : '→ OK'}
                    </span>
                ) : (
                    <span className="text-gray-500">Brak danych</span>
                )}
                <span className="text-gray-500">({benchmark})</span>
            </div>
        </div>
    );
}

// =============================================
// Main Component
// =============================================

export default function HealthCheckPage() {
    const router = useRouter();
    const { state } = useCompanyData();

    const y0 = getLatestYear(state);
    const y1 = getPreviousYear(state);
    const currency = state.currency || 'PLN';
    const companyName = state.companyName || 'Brak danych';

    // Guard: if no data loaded
    if (!state.dataLoaded || !y0) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Brak załadowanych danych"
                    description="Załaduj dane spółki aby zobaczyć analizę kondycji finansowej"
                    ctaText="📡 Załaduj dane"
                    onCta={() => router.push('/valuation/load')}
                    icon="🏥"
                />
            </div>
        );
    }

    // =============================================
    // ALTMAN Z-SCORE
    // =============================================

    const altmanData = useMemo(() => {
        const workingCap = (getField(state, 'balanceSheet', y0, 'currentAssets') || 0)
            - (getField(state, 'balanceSheet', y0, 'currentLiabilities') || 0);
        const totalAssets = getField(state, 'balanceSheet', y0, 'totalAssets');
        const retainedEarnings = getField(state, 'balanceSheet', y0, 'retainedEarnings');
        const ebit = getField(state, 'incomeStatement', y0, 'ebit')
            || ((getField(state, 'incomeStatement', y0, 'ebitda') || 0)
                - (getField(state, 'incomeStatement', y0, 'depreciation') || 0));
        const marketCap = state.market.marketCap
            || ((state.market.currentPrice || 0) * (state.market.sharesOutstanding || 0));
        const totalLiabilities = getField(state, 'balanceSheet', y0, 'totalLiabilities');
        const revenue = getField(state, 'incomeStatement', y0, 'revenue');

        const missing: string[] = [];
        if (!totalAssets) missing.push('Total Assets');
        if (totalLiabilities === null || totalLiabilities === 0) missing.push('Total Liabilities');
        if (!revenue) missing.push('Revenue');

        if (missing.length > 0 || !totalAssets || totalLiabilities === null || totalAssets === 0) {
            return { z: null, missing, components: null };
        }

        const A = safeDivide(workingCap, totalAssets) || 0;
        const B = safeDivide(retainedEarnings, totalAssets) || 0;
        const C = safeDivide(ebit, totalAssets) || 0;
        const D = safeDivide(marketCap, totalLiabilities) || 0;
        const E = safeDivide(revenue, totalAssets) || 0;

        const z = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E;

        return {
            z,
            missing: [],
            components: { A, B, C, D, E }
        };
    }, [state, y0]);

    const getZLabel = (z: number) => {
        if (z >= 2.99) return 'Strefa bezpieczna';
        if (z >= 1.81) return 'Strefa szara';
        return 'Strefa zagrożenia';
    };

    // =============================================
    // PIOTROSKI F-SCORE
    // =============================================

    const piotroskiData = useMemo(() => {
        if (!y1) {
            return { score: 0, max: 0, criteria: [] };
        }

        const criteria: {
            name: string;
            pass: boolean | null;
            detail: string | null;
            missing: string | null;
        }[] = [];

        // 1. ROA > 0
        const netIncome0 = getField(state, 'incomeStatement', y0, 'netIncome');
        const totalAssets0 = getField(state, 'balanceSheet', y0, 'totalAssets');
        const roa = safeDivide(netIncome0, totalAssets0);
        if (roa !== null) {
            criteria.push({ name: 'ROA dodatni', pass: roa > 0, detail: formatPercent(roa), missing: null });
        } else {
            criteria.push({ name: 'ROA dodatni', pass: null, detail: null, missing: 'Net Income / Total Assets' });
        }

        // 2. Operating CF > 0
        const ocf0 = getField(state, 'cashFlow', y0, 'operatingCF');
        if (ocf0 !== null) {
            criteria.push({ name: 'Operating CF dodatni', pass: ocf0 > 0, detail: ocf0.toLocaleString() + ' ' + currency, missing: null });
        } else {
            criteria.push({ name: 'Operating CF dodatni', pass: null, detail: null, missing: 'Operating Cash Flow' });
        }

        // 3. ROA increase
        const netIncome1 = getField(state, 'incomeStatement', y1, 'netIncome');
        const totalAssets1 = getField(state, 'balanceSheet', y1, 'totalAssets');
        const roa0 = safeDivide(netIncome0, totalAssets0);
        const roa1 = safeDivide(netIncome1, totalAssets1);
        if (roa0 !== null && roa1 !== null) {
            criteria.push({ name: 'ROA wzrasta', pass: roa0 > roa1, detail: `${formatPercent(roa1)} → ${formatPercent(roa0)}`, missing: null });
        } else {
            criteria.push({ name: 'ROA wzrasta', pass: null, detail: null, missing: 'ROA (y-1)' });
        }

        // 4. Accruals: OCF > Net Income
        if (ocf0 !== null && netIncome0 !== null) {
            criteria.push({ name: 'OCF > Net Income', pass: ocf0 > netIncome0, detail: `OCF ${ocf0.toLocaleString()} vs NI ${netIncome0.toLocaleString()}`, missing: null });
        } else {
            criteria.push({ name: 'OCF > Net Income', pass: null, detail: null, missing: 'OCF / Net Income' });
        }

        // 5. Long-term debt decrease
        const ltDebt0 = getField(state, 'balanceSheet', y0, 'longTermDebt') || getField(state, 'balanceSheet', y0, 'totalDebt');
        const ltDebt1 = getField(state, 'balanceSheet', y1, 'longTermDebt') || getField(state, 'balanceSheet', y1, 'totalDebt');
        if (ltDebt0 !== null && ltDebt1 !== null) {
            criteria.push({ name: 'Dług długoterm. spada', pass: ltDebt0 <= ltDebt1, detail: `${ltDebt1.toLocaleString()} → ${ltDebt0.toLocaleString()}`, missing: null });
        } else {
            criteria.push({ name: 'Dług długoterm. spada', pass: null, detail: null, missing: 'Long Term Debt' });
        }

        // 6. Current Ratio increase
        const currAssets0 = getField(state, 'balanceSheet', y0, 'currentAssets');
        const currLiab0 = getField(state, 'balanceSheet', y0, 'currentLiabilities');
        const currAssets1 = getField(state, 'balanceSheet', y1, 'currentAssets');
        const currLiab1 = getField(state, 'balanceSheet', y1, 'currentLiabilities');
        const cr0 = safeDivide(currAssets0, currLiab0);
        const cr1 = safeDivide(currAssets1, currLiab1);
        if (cr0 !== null && cr1 !== null) {
            criteria.push({ name: 'Current Ratio wzrasta', pass: cr0 > cr1, detail: `${formatMultiple(cr1)} → ${formatMultiple(cr0)}`, missing: null });
        } else {
            criteria.push({ name: 'Current Ratio wzrasta', pass: null, detail: null, missing: 'Current Assets / Liabilities' });
        }

        // 7. No new shares issued
        const shares0 = state.market.sharesOutstanding || getField(state, 'balanceSheet', y0, 'sharesOutstanding');
        const shares1 = getField(state, 'balanceSheet', y1, 'sharesOutstanding');
        if (shares0 !== null && shares1 !== null) {
            criteria.push({ name: 'Brak rozwodnienia', pass: shares0 <= shares1, detail: `${shares1.toLocaleString()} → ${shares0.toLocaleString()}`, missing: null });
        } else {
            criteria.push({ name: 'Brak rozwodnienia', pass: null, detail: null, missing: 'Shares Outstanding' });
        }

        // 8. Gross Margin increase
        const grossProfit0 = getField(state, 'incomeStatement', y0, 'grossProfit')
            || ((getField(state, 'incomeStatement', y0, 'revenue') || 0)
                - (getField(state, 'incomeStatement', y0, 'costOfRevenue') || 0));
        const rev0 = getField(state, 'incomeStatement', y0, 'revenue');
        const grossProfit1 = getField(state, 'incomeStatement', y1, 'grossProfit')
            || ((getField(state, 'incomeStatement', y1, 'revenue') || 0)
                - (getField(state, 'incomeStatement', y1, 'costOfRevenue') || 0));
        const rev1 = getField(state, 'incomeStatement', y1, 'revenue');
        const gm0 = safeDivide(grossProfit0, rev0);
        const gm1 = safeDivide(grossProfit1, rev1);
        if (gm0 !== null && gm1 !== null) {
            criteria.push({ name: 'Marża brutto wzrasta', pass: gm0 > gm1, detail: `${formatPercent(gm1)} → ${formatPercent(gm0)}`, missing: null });
        } else {
            criteria.push({ name: 'Marża brutto wzrasta', pass: null, detail: null, missing: 'Gross Profit / Revenue' });
        }

        // 9. Asset Turnover increase
        const at0 = safeDivide(rev0, totalAssets0);
        const at1 = safeDivide(rev1, totalAssets1);
        if (at0 !== null && at1 !== null) {
            criteria.push({ name: 'Asset Turnover wzrasta', pass: at0 > at1, detail: `${formatMultiple(at1)} → ${formatMultiple(at0)}`, missing: null });
        } else {
            criteria.push({ name: 'Asset Turnover wzrasta', pass: null, detail: null, missing: 'Revenue / Total Assets' });
        }

        const score = criteria.filter(c => c.pass === true).length;
        const max = criteria.filter(c => c.pass !== null).length;

        return { score, max, criteria };
    }, [state, y0, y1, currency]);

    const getScoreLabel = (score: number) => {
        if (score >= 7) return 'Silna';
        if (score >= 4) return 'Średnia';
        return 'Słaba';
    };

    // =============================================
    // FINANCIAL RATIOS
    // =============================================

    const ratios = useMemo(() => {
        const rev = getField(state, 'incomeStatement', y0, 'revenue');
        const ebitda = getField(state, 'incomeStatement', y0, 'ebitda');
        const netIncome = getField(state, 'incomeStatement', y0, 'netIncome');
        const totalAssets = getField(state, 'balanceSheet', y0, 'totalAssets');
        const currentAssets = getField(state, 'balanceSheet', y0, 'currentAssets');
        const currentLiabilities = getField(state, 'balanceSheet', y0, 'currentLiabilities');
        const cash = getField(state, 'balanceSheet', y0, 'cash');
        const inventory = getField(state, 'balanceSheet', y0, 'inventory');
        const totalLiabilities = getField(state, 'balanceSheet', y0, 'totalLiabilities');
        const totalEquity = getField(state, 'balanceSheet', y0, 'totalEquity');
        const totalDebt = getField(state, 'balanceSheet', y0, 'longTermDebt') || getField(state, 'balanceSheet', y0, 'totalDebt');
        const receivables = getField(state, 'balanceSheet', y0, 'receivables');
        const costOfRevenue = getField(state, 'incomeStatement', y0, 'costOfRevenue');

        type RatioItem = {
            name: string;
            value: number | null;
            formatted: string;
            status: 'good' | 'ok' | 'bad' | null;
            benchmark: string;
        };

        // LIQUIDITY
        const currentRatio = safeDivide(currentAssets, currentLiabilities);
        const quickRatio = safeDivide((currentAssets || 0) - (inventory || 0), currentLiabilities);
        const cashRatio = safeDivide(cash, currentLiabilities);

        const liquidity: RatioItem[] = [
            {
                name: 'Current Ratio',
                value: currentRatio,
                formatted: currentRatio !== null ? formatMultiple(currentRatio) : '—',
                status: currentRatio !== null ? (currentRatio >= 1.5 ? 'good' : currentRatio >= 1.0 ? 'ok' : 'bad') : null,
                benchmark: '> 1.5x'
            },
            {
                name: 'Quick Ratio',
                value: quickRatio,
                formatted: quickRatio !== null ? formatMultiple(quickRatio) : '—',
                status: quickRatio !== null ? (quickRatio >= 1.0 ? 'good' : quickRatio >= 0.7 ? 'ok' : 'bad') : null,
                benchmark: '> 1.0x'
            },
            {
                name: 'Cash Ratio',
                value: cashRatio,
                formatted: cashRatio !== null ? formatMultiple(cashRatio) : '—',
                status: cashRatio !== null ? (cashRatio >= 0.5 ? 'good' : cashRatio >= 0.2 ? 'ok' : 'bad') : null,
                benchmark: '> 0.5x'
            }
        ];

        // SOLVENCY
        const debtEquity = safeDivide(totalDebt, totalEquity);
        const debtAssets = safeDivide(totalLiabilities, totalAssets);
        const equityRatio = safeDivide(totalEquity, totalAssets);

        const solvency: RatioItem[] = [
            {
                name: 'Debt / Equity',
                value: debtEquity,
                formatted: debtEquity !== null ? formatMultiple(debtEquity) : '—',
                status: debtEquity !== null ? (debtEquity <= 0.5 ? 'good' : debtEquity <= 1.0 ? 'ok' : 'bad') : null,
                benchmark: '< 0.5x'
            },
            {
                name: 'Debt / Assets',
                value: debtAssets,
                formatted: debtAssets !== null ? formatPercent(debtAssets) : '—',
                status: debtAssets !== null ? (debtAssets <= 0.4 ? 'good' : debtAssets <= 0.6 ? 'ok' : 'bad') : null,
                benchmark: '< 40%'
            },
            {
                name: 'Equity Ratio',
                value: equityRatio,
                formatted: equityRatio !== null ? formatPercent(equityRatio) : '—',
                status: equityRatio !== null ? (equityRatio >= 0.5 ? 'good' : equityRatio >= 0.3 ? 'ok' : 'bad') : null,
                benchmark: '> 50%'
            }
        ];

        // PROFITABILITY
        const grossMargin = safeDivide((rev || 0) - (costOfRevenue || 0), rev);
        const ebitdaMargin = safeDivide(ebitda, rev);
        const netMargin = safeDivide(netIncome, rev);
        const roa = safeDivide(netIncome, totalAssets);
        const roe = safeDivide(netIncome, totalEquity);

        const profitability: RatioItem[] = [
            {
                name: 'Gross Margin',
                value: grossMargin,
                formatted: grossMargin !== null ? formatPercent(grossMargin) : '—',
                status: grossMargin !== null ? (grossMargin >= 0.4 ? 'good' : grossMargin >= 0.2 ? 'ok' : 'bad') : null,
                benchmark: '> 40%'
            },
            {
                name: 'EBITDA Margin',
                value: ebitdaMargin,
                formatted: ebitdaMargin !== null ? formatPercent(ebitdaMargin) : '—',
                status: ebitdaMargin !== null ? (ebitdaMargin >= 0.2 ? 'good' : ebitdaMargin >= 0.1 ? 'ok' : 'bad') : null,
                benchmark: '> 20%'
            },
            {
                name: 'Net Margin',
                value: netMargin,
                formatted: netMargin !== null ? formatPercent(netMargin) : '—',
                status: netMargin !== null ? (netMargin >= 0.1 ? 'good' : netMargin >= 0.05 ? 'ok' : 'bad') : null,
                benchmark: '> 10%'
            },
            {
                name: 'ROA',
                value: roa,
                formatted: roa !== null ? formatPercent(roa) : '—',
                status: roa !== null ? (roa >= 0.1 ? 'good' : roa >= 0.05 ? 'ok' : 'bad') : null,
                benchmark: '> 10%'
            },
            {
                name: 'ROE',
                value: roe,
                formatted: roe !== null ? formatPercent(roe) : '—',
                status: roe !== null ? (roe >= 0.15 ? 'good' : roe >= 0.08 ? 'ok' : 'bad') : null,
                benchmark: '> 15%'
            }
        ];

        // EFFICIENCY
        const assetTurnover = safeDivide(rev, totalAssets);
        const receivablesTurnover = safeDivide(rev, receivables);
        const inventoryTurnover = safeDivide(costOfRevenue, inventory);

        const efficiency: RatioItem[] = [
            {
                name: 'Asset Turnover',
                value: assetTurnover,
                formatted: assetTurnover !== null ? formatMultiple(assetTurnover) : '—',
                status: assetTurnover !== null ? (assetTurnover >= 1.0 ? 'good' : assetTurnover >= 0.5 ? 'ok' : 'bad') : null,
                benchmark: '> 1.0x'
            },
            {
                name: 'Receivables Turnover',
                value: receivablesTurnover,
                formatted: receivablesTurnover !== null ? formatMultiple(receivablesTurnover) : '—',
                status: receivablesTurnover !== null ? (receivablesTurnover >= 8 ? 'good' : receivablesTurnover >= 4 ? 'ok' : 'bad') : null,
                benchmark: '> 8x'
            },
            {
                name: 'Inventory Turnover',
                value: inventoryTurnover,
                formatted: inventoryTurnover !== null ? formatMultiple(inventoryTurnover) : '—',
                status: inventoryTurnover !== null ? (inventoryTurnover >= 6 ? 'good' : inventoryTurnover >= 3 ? 'ok' : 'bad') : null,
                benchmark: '> 6x'
            }
        ];

        return { liquidity, solvency, profitability, efficiency };
    }, [state, y0]);

    // =============================================
    // OVERALL SCORE (0-100)
    // =============================================

    const overallScore = useMemo(() => {
        let points = 0;
        let maxPoints = 0;

        // Altman Z (20 points)
        if (altmanData.z !== null) {
            maxPoints += 20;
            if (altmanData.z >= 2.99) points += 20;
            else if (altmanData.z >= 1.81) points += 10;
        }

        // Piotroski (30 points)
        if (piotroskiData.max > 0) {
            maxPoints += 30;
            points += Math.round((piotroskiData.score / piotroskiData.max) * 30);
        }

        // Ratios (50 points, split evenly)
        const allRatios = [...ratios.liquidity, ...ratios.solvency, ...ratios.profitability, ...ratios.efficiency];
        const ratioWithStatus = allRatios.filter(r => r.status !== null);
        if (ratioWithStatus.length > 0) {
            maxPoints += 50;
            const goodCount = ratioWithStatus.filter(r => r.status === 'good').length;
            const okCount = ratioWithStatus.filter(r => r.status === 'ok').length;
            points += Math.round(((goodCount * 1.0 + okCount * 0.5) / ratioWithStatus.length) * 50);
        }

        return maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
    }, [altmanData, piotroskiData, ratios]);

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="text-gray-500 hover:text-white text-sm mb-2 transition-colors"
                    >
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-mono font-bold">
                        Health Check — {companyName}
                    </h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Analiza kondycji finansowej na podstawie danych z {y0}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 py-8">
                {/* Top Row: Gauge + Altman + Piotroski */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                    {/* Overall Score */}
                    <GlassCard className="p-6 text-center" glowColor="emerald">
                        <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                            Ogólny wynik kondycji
                        </div>
                        <HealthGauge score={overallScore} />
                    </GlassCard>

                    {/* Altman Z-Score */}
                    <GlassCard className="p-6" glowColor="cyan">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🔬</span>
                            <div>
                                <div className="font-semibold">ALTMAN Z-SCORE</div>
                                <div className="text-xs text-gray-500">Prawdopodobieństwo bankructwa</div>
                            </div>
                        </div>

                        {altmanData.z !== null ? (
                            <>
                                <AltmanZoneBar z={altmanData.z} />
                                <div className="mt-4 text-center">
                                    <div className="text-3xl font-mono font-bold">
                                        Z = {altmanData.z.toFixed(2)}
                                    </div>
                                    <div className={`text-sm mt-1 ${altmanData.z >= 2.99 ? 'text-emerald-400' :
                                            altmanData.z >= 1.81 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                        {getZLabel(altmanData.z)}
                                    </div>
                                </div>

                                {altmanData.components && (
                                    <div className="mt-4 space-y-1 text-xs font-mono">
                                        <div className="flex justify-between text-gray-400">
                                            <span>A (WC/TA)</span>
                                            <span>{altmanData.components.A.toFixed(3)} × 1.2 = {(1.2 * altmanData.components.A).toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>B (RE/TA)</span>
                                            <span>{altmanData.components.B.toFixed(3)} × 1.4 = {(1.4 * altmanData.components.B).toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>C (EBIT/TA)</span>
                                            <span>{altmanData.components.C.toFixed(3)} × 3.3 = {(3.3 * altmanData.components.C).toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>D (MC/TL)</span>
                                            <span>{altmanData.components.D.toFixed(3)} × 0.6 = {(0.6 * altmanData.components.D).toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>E (Rev/TA)</span>
                                            <span>{altmanData.components.E.toFixed(3)} × 1.0 = {(1.0 * altmanData.components.E).toFixed(3)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg p-4">
                                <div className="font-medium text-amber-400 mb-2">⚠️ Nie można obliczyć Altman Z-Score</div>
                                <div className="text-sm text-gray-400">Brakujące dane:</div>
                                <ul className="text-sm text-gray-500 mt-1">
                                    {altmanData.missing.map((m, i) => (
                                        <li key={i}>• {m}</li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => router.push('/valuation/load')}
                                    className="mt-3 text-sm text-amber-400 hover:text-amber-300"
                                >
                                    Uzupełnij dane →
                                </button>
                            </div>
                        )}
                    </GlassCard>

                    {/* Piotroski F-Score */}
                    <GlassCard className="p-6" glowColor="purple">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📊</span>
                            <div>
                                <div className="font-semibold">PIOTROSKI F-SCORE</div>
                                <div className="text-xs text-gray-500">Siła finansowa (0-9)</div>
                            </div>
                        </div>

                        <div className="text-center mb-4">
                            <span className={`text-4xl font-mono font-bold ${piotroskiData.score >= 7 ? 'text-emerald-400' :
                                    piotroskiData.score >= 4 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                {piotroskiData.score}/{piotroskiData.max > 0 ? 9 : '?'}
                            </span>
                            <div className={`text-sm mt-1 ${piotroskiData.score >= 7 ? 'text-emerald-400' :
                                    piotroskiData.score >= 4 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                {getScoreLabel(piotroskiData.score)}
                            </div>
                        </div>

                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {piotroskiData.criteria.map((c, i) => (
                                <div
                                    key={i}
                                    className={`
                                        flex items-center justify-between p-2 rounded-lg text-xs
                                        border-l-2 ${c.pass === true ? 'border-emerald-500 bg-emerald-500/10' :
                                            c.pass === false ? 'border-rose-500 bg-rose-500/10' :
                                                'border-gray-500 bg-gray-500/10'
                                        }
                                    `}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{c.pass === true ? '✓' : c.pass === false ? '✗' : '?'}</span>
                                        <span>{c.name}</span>
                                    </span>
                                    <span className="text-gray-500 text-right">
                                        {c.detail || (c.missing ? `Brak: ${c.missing}` : '—')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Financial Ratios Grid */}
                <GlassCard className="p-6" glowColor="amber">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl">📈</span>
                        <div className="font-semibold text-lg">WSKAŹNIKI FINANSOWE</div>
                    </div>

                    <div className="grid grid-cols-4 gap-6">
                        {/* Liquidity */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 uppercase mb-3">💧 Płynność</h4>
                            <div className="space-y-3">
                                {ratios.liquidity.map((r, i) => (
                                    <RatioCard key={i} {...r} />
                                ))}
                            </div>
                        </div>

                        {/* Solvency */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 uppercase mb-3">🏛️ Wypłacalność</h4>
                            <div className="space-y-3">
                                {ratios.solvency.map((r, i) => (
                                    <RatioCard key={i} {...r} />
                                ))}
                            </div>
                        </div>

                        {/* Profitability */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 uppercase mb-3">💰 Rentowność</h4>
                            <div className="space-y-3">
                                {ratios.profitability.map((r, i) => (
                                    <RatioCard key={i} {...r} />
                                ))}
                            </div>
                        </div>

                        {/* Efficiency */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 uppercase mb-3">⚡ Efektywność</h4>
                            <div className="space-y-3">
                                {ratios.efficiency.map((r, i) => (
                                    <RatioCard key={i} {...r} />
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Navigation */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                    >
                        <div className="text-2xl mb-1">💰</div>
                        <div className="font-medium">Wycena DCF</div>
                    </button>
                    <button
                        onClick={() => router.push('/valuation/benchmark')}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                    >
                        <div className="text-2xl mb-1">📈</div>
                        <div className="font-medium">Porównawcza</div>
                    </button>
                    <button
                        onClick={() => router.push('/valuation/sensitivity')}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                    >
                        <div className="text-2xl mb-1">🔥</div>
                        <div className="font-medium">Wrażliwość</div>
                    </button>
                </div>
            </main>
        </div>
    );
}
