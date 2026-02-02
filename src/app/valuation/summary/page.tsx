'use client';

// =============================================
// StochFin — Investment Summary (One-Pager)
// Final synthesis screen with BUY/HOLD/SELL verdict
// Collects data from ALL modules
// =============================================

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyData } from '@/contexts/CompanyDataContext';
import { GlassCard, FeatureIcon } from '@/components/ui/StochFinComponents';

// =============================================
// Helper Functions
// =============================================

function formatNumber(value: number | null, currency = 'PLN', compact = false): string {
    if (value === null || isNaN(value)) return '—';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (compact) {
        if (absValue >= 1_000_000_000) return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
        if (absValue >= 1_000_000) return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
        if (absValue >= 1_000) return `${sign}${(absValue / 1_000).toFixed(0)}K`;
    }

    return `${sign}${absValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} ${currency}`;
}

function formatPercent(value: number | null, showSign = false): string {
    if (value === null || isNaN(value)) return '—';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
}

function safeDivide(a: number | null, b: number | null): number | null {
    if (a === null || b === null || b === 0) return null;
    return a / b;
}

// =============================================
// Types & Configuration
// =============================================

type VerdictType = 'BUY' | 'HOLD' | 'UNDERPERFORM' | 'SELL' | 'unknown';

const verdictConfig: Record<VerdictType, { color: string; bg: string; icon: string }> = {
    BUY: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
    HOLD: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', icon: '🔵' },
    UNDERPERFORM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
    SELL: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', icon: '🔴' },
    unknown: { color: '#64748b', bg: 'transparent', icon: '❓' },
};

const sectorLabels: Record<string, string> = {
    manufacturing: 'Produkcja',
    services: 'Usługi',
    technology: 'Technologia',
    finance: 'Finanse',
    retail: 'Handel',
    healthcare: 'Opieka zdrowotna',
    energy: 'Energetyka',
    real_estate: 'Nieruchomości',
};

interface RedFlag {
    severity: 'high' | 'medium' | 'low';
    text: string;
}

// =============================================
// Main Component
// =============================================

export default function InvestmentSummaryScreen() {
    const router = useRouter();
    const { state } = useCompanyData();

    // Get years
    const availableYears = useMemo(() => {
        const yearsSet = new Set<string>();
        for (const year in state.incomeStatement) yearsSet.add(year);
        for (const year in state.balanceSheet) yearsSet.add(year);
        for (const year in state.cashFlow) yearsSet.add(year);
        return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [state]);

    const y0 = availableYears[0] || '';
    const y1 = availableYears[1] || '';
    const y2 = availableYears[2] || '';
    const currency = state.currency || 'PLN';

    // Market data
    const price = state.market?.currentPrice ?? null;
    const shares = state.market?.sharesOutstanding ?? null;
    const marketCap = price && shares ? price * shares : null;

    // Financial data
    const revenue = state.incomeStatement?.[y0]?.revenue ?? null;
    const ebitda = state.incomeStatement?.[y0]?.ebitda ?? null;
    const netIncome = state.incomeStatement?.[y0]?.netIncome ?? null;
    const fcf = state.cashFlow?.[y0]?.freeCashFlow ?? null;
    const totalDebt = state.balanceSheet?.[y0]?.totalDebt ?? state.balanceSheet?.[y0]?.longTermDebt ?? 0;
    const cash = state.balanceSheet?.[y0]?.cash ?? 0;
    const totalEquity = state.balanceSheet?.[y0]?.totalEquity ?? null;

    // Derived metrics
    const eps = safeDivide(netIncome, shares);
    const pe = safeDivide(price, eps);
    const ev = marketCap !== null ? marketCap + totalDebt - cash : null;
    const evEbitda = safeDivide(ev, ebitda);
    const fcfYield = safeDivide(fcf, marketCap);
    const divYield = safeDivide(state.cashFlow?.[y0]?.dividendsPaid ?? null, marketCap);

    // From modules (using correct property names from CompanyDataContext)
    const healthScore = state.healthResults?.overall_score ?? null;
    const roicSpread = state.roicWaccResults?.spread ?? null;
    const earningsQuality = state.earningsQualityResults?.eqScore ?? null;
    // These will be null until user runs those modules - fallback gracefully
    const impliedGrowth: number | null = null; // reverseDCFResults not in context yet
    const marginOfSafety: number | null = null; // footballFieldResults not in context yet  
    const dcfFairValue = state.dcfResults?.percentiles?.p50?.perShare ?? null;
    const roe = state.dupontResults?.byYear?.[y0]?.roeDirect ?? null;
    const shareholderYield = state.capitalAllocationResults?.shareholderYield ?? null;

    // YoY changes
    const revGrowth = useMemo(() => {
        const curr = state.incomeStatement?.[y0]?.revenue ?? null;
        const prev = state.incomeStatement?.[y1]?.revenue ?? null;
        return safeDivide(curr !== null && prev !== null ? curr - prev : null, prev !== null ? Math.abs(prev) : null);
    }, [state.incomeStatement, y0, y1]);

    // ===== SCORING SYSTEM =====
    const scoring = useMemo(() => {
        let totalPoints = 0;
        let maxPoints = 0;
        const breakdown: { name: string; points: number; max: number; weight: string }[] = [];

        // Valuation (40%)
        let valPoints = 0;
        maxPoints += 40;
        if (marginOfSafety !== null) {
            if (marginOfSafety > 0.25) valPoints = 40;
            else if (marginOfSafety > 0.10) valPoints = 30;
            else if (marginOfSafety > 0) valPoints = 15;
            else if (marginOfSafety > -0.10) valPoints = 5;
        }
        totalPoints += valPoints;
        breakdown.push({ name: 'Valuation', points: valPoints, max: 40, weight: '40%' });

        // Quality (30%)
        let qualPoints = 0;
        maxPoints += 30;
        if (healthScore !== null) qualPoints += (healthScore / 100) * 15;
        if (earningsQuality !== null) qualPoints += (earningsQuality / 100) * 15;
        totalPoints += qualPoints;
        breakdown.push({ name: 'Quality', points: Math.round(qualPoints), max: 30, weight: '30%' });

        // Value Creation (20%)
        let valuePoints = 0;
        maxPoints += 20;
        if (roicSpread !== null) {
            if (roicSpread > 5) valuePoints = 20;
            else if (roicSpread > 2) valuePoints = 15;
            else if (roicSpread > 0) valuePoints = 8;
        }
        totalPoints += valuePoints;
        breakdown.push({ name: 'Value Creation', points: valuePoints, max: 20, weight: '20%' });

        // Growth (10%)
        let growthPoints = 0;
        maxPoints += 10;
        if (revGrowth !== null) {
            if (revGrowth > 0.15) growthPoints = 10;
            else if (revGrowth > 0.08) growthPoints = 7;
            else if (revGrowth > 0.03) growthPoints = 4;
            else if (revGrowth > 0) growthPoints = 2;
        }
        totalPoints += growthPoints;
        breakdown.push({ name: 'Growth', points: growthPoints, max: 10, weight: '10%' });

        const overallScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : null;

        return { totalPoints: Math.round(totalPoints), maxPoints, overallScore, breakdown };
    }, [marginOfSafety, healthScore, earningsQuality, roicSpread, revGrowth]);

    // Final Verdict
    const finalVerdict: VerdictType = useMemo(() => {
        if (scoring.overallScore === null) return 'unknown';
        if (scoring.overallScore >= 75) return 'BUY';
        if (scoring.overallScore >= 55) return 'HOLD';
        if (scoring.overallScore >= 35) return 'UNDERPERFORM';
        return 'SELL';
    }, [scoring.overallScore]);

    // ===== RED FLAGS =====
    const redFlags = useMemo<RedFlag[]>(() => {
        const flags: RedFlag[] = [];

        // Health Check (using correct property names)
        if (state.healthResults?.altmanZ !== undefined && state.healthResults.altmanZ !== null && state.healthResults.altmanZ < 1.8)
            flags.push({ severity: 'high', text: 'Altman Z-Score < 1.8 — ryzyko bankructwa' });
        if (state.healthResults?.piotroskiScore !== undefined && state.healthResults.piotroskiScore <= 3)
            flags.push({ severity: 'medium', text: 'Piotroski F-Score ≤ 3 — słaba kondycja' });

        // Earnings Quality
        if (state.earningsQualityResults?.accrualRatio !== undefined && state.earningsQualityResults.accrualRatio !== null && state.earningsQualityResults.accrualRatio > 0.05)
            flags.push({ severity: 'high', text: "Wysoki Accrual Ratio — zyski 'papierowe'" });
        if (state.earningsQualityResults?.cfCoverage !== undefined && state.earningsQualityResults.cfCoverage !== null && state.earningsQualityResults.cfCoverage < 0.8)
            flags.push({ severity: 'medium', text: 'CF Coverage < 0.8x — słabe pokrycie gotówką' });

        // ROIC/WACC
        if (roicSpread !== null && roicSpread < 0)
            flags.push({ severity: 'high', text: `ROIC < WACC (spread ${roicSpread.toFixed(1)}pp) — niszczenie wartości` });

        // DuPont (using byYear accessor)
        const dupontLeverage = state.dupontResults?.byYear?.[y0]?.leverage;
        if (dupontLeverage !== undefined && dupontLeverage !== null && dupontLeverage > 4.0)
            flags.push({ severity: 'medium', text: 'Wysoka dźwignia finansowa (Equity Multiplier > 4x)' });

        // Capital Allocation
        if (state.capitalAllocationResults?.payoutRatio !== undefined && state.capitalAllocationResults.payoutRatio !== null && state.capitalAllocationResults.payoutRatio > 0.8)
            flags.push({ severity: 'low', text: 'Wysoki payout ratio > 80% — mało reinwestuje' });

        // Sort by severity
        const order = { high: 0, medium: 1, low: 2 };
        flags.sort((a, b) => order[a.severity] - order[b.severity]);

        return flags;
    }, [state, roicSpread, y0]);

    // Check if we have minimal data
    if (!y0 || revenue === null) {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <GlassCard>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <h2 style={{ marginBottom: '12px' }}>Brak danych do syntezy</h2>
                        <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
                            Załaduj dane finansowe spółki, aby wygenerować Investment Summary.
                        </p>
                        <button
                            onClick={() => router.push('/valuation/load')}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--accent-blue, #38bdf8)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Załaduj dane →
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            {/* TOP BAR */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 0',
                borderBottom: '2px solid rgba(255,255,255,0.1)',
                marginBottom: '24px',
            }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                        {state.companyName || 'Spółka'}
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748b)', margin: '4px 0 0' }}>
                        {state.sectorType ? sectorLabels[state.sectorType] || state.sectorType : ''} | FY{y0} | {currency}
                    </p>
                </div>

                <div style={{
                    textAlign: 'center',
                    background: verdictConfig[finalVerdict].bg,
                    padding: '12px 32px',
                    borderRadius: '12px',
                    border: `2px solid ${verdictConfig[finalVerdict].color}`,
                }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)' }}>
                        RATING
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: verdictConfig[finalVerdict].color }}>
                        {verdictConfig[finalVerdict].icon} {finalVerdict}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                        Score: {scoring.overallScore ?? '—'}/100
                    </div>
                </div>
            </div>

            {/* KEY METRICS */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '1px', marginBottom: '16px' }}>
                    KLUCZOWE METRYKI
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <MetricBox label="Cena" value={formatNumber(price, currency)} />
                    <MetricBox
                        label="Fair Value"
                        value={formatNumber(dcfFairValue, currency)}
                        color={dcfFairValue && price ? (dcfFairValue > price ? '#10b981' : '#f43f5e') : undefined}
                    />
                    <MetricBox
                        label="Margin of Safety"
                        value={formatPercent(marginOfSafety)}
                        color={marginOfSafety !== null ? (marginOfSafety > 0.10 ? '#10b981' : marginOfSafety > 0 ? '#f59e0b' : '#f43f5e') : undefined}
                    />
                    <MetricBox
                        label="Upside"
                        value={formatPercent(dcfFairValue && price ? (dcfFairValue - price) / price : null, true)}
                        color={dcfFairValue && price ? ((dcfFairValue - price) / price > 0 ? '#10b981' : '#f43f5e') : undefined}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '12px' }}>
                    <MetricBox label="P/E" value={pe ? `${pe.toFixed(1)}x` : '—'} />
                    <MetricBox label="EV/EBITDA" value={evEbitda ? `${evEbitda.toFixed(1)}x` : '—'} />
                    <MetricBox label="FCF Yield" value={formatPercent(fcfYield)} />
                    <MetricBox label="Div Yield" value={formatPercent(divYield !== null ? Math.abs(divYield) : null)} />
                </div>
            </div>

            {/* SCORING */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '1px', marginBottom: '16px' }}>
                    SCORING
                </h3>

                {scoring.breakdown.map(item => (
                    <div key={item.name} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px' }}>{item.name} ({item.weight})</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{item.points}/{item.max}</span>
                        </div>
                        <div style={{
                            height: '20px',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(item.points / item.max) * 100}%`,
                                background: item.points / item.max > 0.7 ? '#10b981'
                                    : item.points / item.max > 0.5 ? '#38bdf8'
                                        : item.points / item.max > 0.3 ? '#f59e0b'
                                            : '#f43f5e',
                                borderRadius: '4px',
                            }} />
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>TOTAL</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                            {scoring.totalPoints}/{scoring.maxPoints}
                        </span>
                    </div>
                    <div style={{
                        height: '24px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(scoring.overallScore ?? 0)}%`,
                            background: `linear-gradient(90deg, ${verdictConfig[finalVerdict].color}, ${verdictConfig[finalVerdict].color}aa)`,
                            borderRadius: '4px',
                        }} />
                    </div>
                </div>
            </div>

            {/* DIAGNOSTICS */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '1px', marginBottom: '16px' }}>
                    DIAGNOSTYKA
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <DiagnosticCard
                        icon="🏥"
                        label="Health Score"
                        value={healthScore !== null ? `${healthScore}/100` : '—'}
                        color={healthScore !== null ? (healthScore > 70 ? '#10b981' : healthScore > 40 ? '#f59e0b' : '#f43f5e') : undefined}
                        onClick={() => router.push('/valuation/health')}
                    />
                    <DiagnosticCard
                        icon="🏆"
                        label="ROIC-WACC"
                        value={roicSpread !== null ? `${roicSpread > 0 ? '+' : ''}${roicSpread.toFixed(1)}pp` : '—'}
                        color={roicSpread !== null ? (roicSpread > 5 ? '#10b981' : roicSpread > 0 ? '#38bdf8' : '#f43f5e') : undefined}
                        onClick={() => router.push('/valuation/roic-wacc')}
                    />
                    <DiagnosticCard
                        icon="🔬"
                        label="Earnings Quality"
                        value={earningsQuality !== null ? `${earningsQuality}/100` : '—'}
                        color={earningsQuality !== null ? (earningsQuality > 70 ? '#10b981' : earningsQuality > 40 ? '#f59e0b' : '#f43f5e') : undefined}
                        onClick={() => router.push('/valuation/earnings-quality')}
                    />
                    <DiagnosticCard
                        icon="📐"
                        label="DuPont ROE"
                        value={formatPercent(roe)}
                        onClick={() => router.push('/valuation/dupont')}
                    />
                    <DiagnosticCard
                        icon="🔄"
                        label="Implied Growth"
                        value={formatPercent(impliedGrowth)}
                        onClick={() => router.push('/valuation/reverse-dcf')}
                    />
                    <DiagnosticCard
                        icon="💼"
                        label="Shareholder Yield"
                        value={formatPercent(shareholderYield)}
                        onClick={() => router.push('/valuation/capital-allocation')}
                    />
                </div>
            </div>

            {/* RED FLAGS */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '1px', marginBottom: '16px' }}>
                    🚩 RYZYKA
                </h3>

                {redFlags.length === 0 ? (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(16, 185, 129, 0.06)',
                        borderRadius: '8px',
                        color: '#10b981'
                    }}>
                        ✅ Nie wykryto istotnych ryzyk w załadowanych danych.
                    </div>
                ) : (
                    redFlags.slice(0, 6).map((flag, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '10px 16px',
                                margin: '4px 0',
                                background: flag.severity === 'high' ? 'rgba(244,63,94,0.06)'
                                    : flag.severity === 'medium' ? 'rgba(245,158,11,0.06)'
                                        : 'transparent',
                                borderLeft: `3px solid ${flag.severity === 'high' ? '#f43f5e'
                                    : flag.severity === 'medium' ? '#f59e0b'
                                        : '#64748b'
                                    }`,
                                borderRadius: '0 8px 8px 0',
                                fontSize: '14px',
                            }}
                        >
                            {flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '⚠️' : 'ℹ️'} {flag.text}
                        </div>
                    ))
                )}
            </div>

            {/* NAVIGATION */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => router.push('/valuation/football-field')}
                    style={{
                        padding: '12px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    ⚽ Football Field
                </button>
                <button
                    onClick={() => router.push('/valuation/risk')}
                    style={{
                        padding: '12px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    🚩 Risk Matrix
                </button>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '12px 20px',
                        background: 'var(--accent-blue, #38bdf8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginLeft: 'auto'
                    }}
                >
                    🖨️ Drukuj / PDF
                </button>
            </div>
        </div>
    );
}

// =============================================
// Sub-components
// =============================================

function MetricBox({ label, value, color, subValue }: {
    label: string;
    value: string;
    color?: string;
    subValue?: string;
}) {
    return (
        <div style={{
            padding: '12px 16px',
            background: 'var(--bg-elevated, #1a2332)',
            borderRadius: '8px',
        }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                {label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: color || 'inherit' }}>
                {value}
            </div>
            {subValue && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    {subValue}
                </div>
            )}
        </div>
    );
}

function DiagnosticCard({ icon, label, value, color, onClick }: {
    icon: string;
    label: string;
    value: string;
    color?: string;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '12px',
                background: 'var(--bg-elevated, #1a2332)',
                borderRadius: '8px',
                borderTop: `3px solid ${color || 'rgba(255,255,255,0.1)'}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
            }}
        >
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                {icon} {label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold', color: color || 'inherit' }}>
                {value}
            </div>
        </div>
    );
}
