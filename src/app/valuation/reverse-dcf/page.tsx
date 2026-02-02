'use client';

// =============================================
// StochFin — Reverse DCF Analysis
// "Ile wzrostu rynek wycenia w cenę?"
// Binary search for implied growth rate
// =============================================

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyData } from '@/contexts/CompanyDataContext';
import { GlassCard, MetricCard, FeatureIcon } from '@/components/ui/StochFinComponents';

// =============================================
// Helper Functions
// =============================================

function formatNumber(value: number | null, currency = 'PLN'): string {
    if (value === null || isNaN(value)) return '—';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1_000_000_000) {
        return `${sign}${(absValue / 1_000_000_000).toFixed(2)} mld ${currency}`;
    } else if (absValue >= 1_000_000) {
        return `${sign}${(absValue / 1_000_000).toFixed(2)} mln ${currency}`;
    } else if (absValue >= 1_000) {
        return `${sign}${(absValue / 1_000).toFixed(0)} tys. ${currency}`;
    }
    return `${sign}${absValue.toFixed(0)} ${currency}`;
}

function formatPercent(value: number | null): string {
    if (value === null || isNaN(value)) return '—';
    return `${(value * 100).toFixed(1)}%`;
}

function safeDivide(a: number | null, b: number | null): number | null {
    if (a === null || b === null || b === 0) return null;
    return a / b;
}

// =============================================
// Verdict Configuration
// =============================================

type VerdictType = 'very_expensive' | 'expensive' | 'fairly_valued' | 'undervalued' | 'deeply_undervalued' | 'unknown';

const verdictConfig: Record<VerdictType, { text: string; detail: string; color: string; icon: string }> = {
    very_expensive: {
        text: 'BARDZO DROGA',
        detail: 'Rynek oczekuje wzrostu znacznie powyżej historycznych trendów',
        color: 'var(--accent-red, #f43f5e)',
        icon: '🔴'
    },
    expensive: {
        text: 'DROGA',
        detail: 'Rynek wycenia ponadprzeciętny wzrost',
        color: 'var(--accent-amber, #f59e0b)',
        icon: '⚠️'
    },
    fairly_valued: {
        text: 'FAIR VALUE',
        detail: 'Implikowany wzrost zbliżony do historycznych trendów',
        color: 'var(--accent-blue, #38bdf8)',
        icon: '⚖️'
    },
    undervalued: {
        text: 'NIEDOWARTOŚCIOWANA',
        detail: 'Rynek oczekuje mniej niż wynika z historii',
        color: 'var(--accent-green, #10b981)',
        icon: '💎'
    },
    deeply_undervalued: {
        text: 'GŁĘBOKO NIEDOWARTOŚCIOWANA',
        detail: 'Rynek wycenia znacznie poniżej historycznych możliwości',
        color: 'var(--accent-green, #10b981)',
        icon: '🏆'
    },
    unknown: {
        text: 'BRAK DANYCH',
        detail: 'Niewystarczające dane do analizy',
        color: 'var(--text-muted, #64748b)',
        icon: '❓'
    }
};

// =============================================
// Main Component
// =============================================

export default function ReverseDCFScreen() {
    const router = useRouter();
    const { state } = useCompanyData();

    // Get available years
    const availableYears = useMemo(() => {
        const yearsSet = new Set<string>();
        for (const year in state.incomeStatement) yearsSet.add(year);
        for (const year in state.balanceSheet) yearsSet.add(year);
        for (const year in state.cashFlow) yearsSet.add(year);
        return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [state]);

    const y0 = availableYears[0] || '';
    const currency = state.currency || 'PLN';

    // Market data
    const currentPrice = state.market?.currentPrice || null;
    const sharesOutstanding = state.market?.sharesOutstanding || null;
    const marketCap = currentPrice && sharesOutstanding
        ? currentPrice * sharesOutstanding
        : state.market?.marketCap || null;

    // Financial data
    const operatingCF = state.cashFlow?.[y0]?.operatingCF ?? null;
    const capex = state.cashFlow?.[y0]?.capex ?? null;
    const fcfBase = state.cashFlow?.[y0]?.freeCashFlow
        ?? (operatingCF !== null && capex !== null ? operatingCF - Math.abs(capex) : null);

    const totalDebt = state.balanceSheet?.[y0]?.totalDebt
        ?? state.balanceSheet?.[y0]?.longTermDebt ?? 0;
    const cash = state.balanceSheet?.[y0]?.cash ?? 0;
    const enterpriseValue = marketCap !== null ? marketCap + totalDebt - cash : null;

    // Parameters (state)
    const [forecastYears, setForecastYears] = useState(10);
    const [discountRate, setDiscountRate] = useState(
        state.roicWaccResults?.wacc ?? 10.0
    );
    const [terminalGrowth, setTerminalGrowth] = useState(3.0);
    const [terminalMultiple, setTerminalMultiple] = useState(15);
    const [terminalMethod, setTerminalMethod] = useState<'perpetuity' | 'exitMultiple'>('perpetuity');

    // DCF Value calculation
    const dcfValue = useCallback((growthRate: number): number | null => {
        if (!fcfBase || fcfBase <= 0) return null;

        let pvFCFs = 0;
        let fcf = fcfBase;
        const dr = discountRate / 100;
        const tg = terminalGrowth / 100;

        // Forecast period
        for (let t = 1; t <= forecastYears; t++) {
            fcf *= (1 + growthRate);
            pvFCFs += fcf / Math.pow(1 + dr, t);
        }

        // Terminal Value
        let terminalValue: number;
        if (terminalMethod === 'perpetuity') {
            const terminalFCF = fcf * (1 + tg);
            terminalValue = terminalFCF / (dr - tg);
        } else {
            terminalValue = fcf * terminalMultiple;
        }

        const pvTerminal = terminalValue / Math.pow(1 + dr, forecastYears);

        return pvFCFs + pvTerminal;
    }, [fcfBase, discountRate, terminalGrowth, forecastYears, terminalMethod, terminalMultiple]);

    // Binary search for implied growth
    const findImpliedGrowth = useCallback((dr: number, tg: number): number | null => {
        if (!fcfBase || fcfBase <= 0 || !enterpriseValue) return null;

        let lo = -0.30; // -30%
        let hi = 0.80;  // +80%

        const calcDCF = (growthRate: number): number | null => {
            let pvFCFs = 0;
            let fcf = fcfBase;
            const drDecimal = dr / 100;
            const tgDecimal = tg / 100;

            for (let t = 1; t <= forecastYears; t++) {
                fcf *= (1 + growthRate);
                pvFCFs += fcf / Math.pow(1 + drDecimal, t);
            }

            let terminalValue: number;
            if (terminalMethod === 'perpetuity') {
                const terminalFCF = fcf * (1 + tgDecimal);
                terminalValue = terminalFCF / (drDecimal - tgDecimal);
            } else {
                terminalValue = fcf * terminalMultiple;
            }

            const pvTerminal = terminalValue / Math.pow(1 + drDecimal, forecastYears);
            return pvFCFs + pvTerminal;
        };

        for (let i = 0; i < 100; i++) {
            const mid = (lo + hi) / 2;
            const val = calcDCF(mid);
            if (val === null) return null;

            if (Math.abs(val - enterpriseValue) < enterpriseValue * 0.0001) {
                return mid;
            }

            if (val < enterpriseValue) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        return (lo + hi) / 2;
    }, [fcfBase, enterpriseValue, forecastYears, terminalMethod, terminalMultiple]);

    const impliedGrowth = useMemo(() =>
        findImpliedGrowth(discountRate, terminalGrowth),
        [findImpliedGrowth, discountRate, terminalGrowth]
    );

    // Historical growth calculation
    const { avgHistGrowth, histGrowths } = useMemo(() => {
        const growths: number[] = [];
        for (let i = 0; i < availableYears.length - 1; i++) {
            const currYear = availableYears[i];
            const prevYear = availableYears[i + 1];
            const curr = state.incomeStatement?.[currYear]?.revenue ?? null;
            const prev = state.incomeStatement?.[prevYear]?.revenue ?? null;
            const g = safeDivide(curr !== null && prev !== null ? curr - prev : null, prev !== null ? Math.abs(prev) : null);
            if (g !== null) growths.push(g);
        }
        const avg = growths.length > 0
            ? growths.reduce((a, b) => a + b, 0) / growths.length
            : null;
        return { avgHistGrowth: avg, histGrowths: growths };
    }, [availableYears, state.incomeStatement]);

    // Verdict
    const verdict: VerdictType = useMemo(() => {
        if (impliedGrowth === null || avgHistGrowth === null) return 'unknown';
        const delta = impliedGrowth - avgHistGrowth;
        if (delta > 0.10) return 'very_expensive';
        if (delta > 0.03) return 'expensive';
        if (delta > -0.03) return 'fairly_valued';
        if (delta > -0.10) return 'undervalued';
        return 'deeply_undervalued';
    }, [impliedGrowth, avgHistGrowth]);

    // Sensitivity table
    const sensitivityTable = useMemo(() => {
        const waccValues = [7, 8, 9, 10, 11, 12];
        const tgValues = [1, 2, 3, 4];

        const table: { wacc: number; tg: number; implied: number | null }[][] = [];

        for (const wacc of waccValues) {
            const row: { wacc: number; tg: number; implied: number | null }[] = [];
            for (const tg of tgValues) {
                const implied = findImpliedGrowth(wacc, tg);
                row.push({ wacc, tg, implied });
            }
            table.push(row);
        }

        return { waccValues, tgValues, table };
    }, [findImpliedGrowth]);

    // Check if we have required data
    const hasMarketData = currentPrice !== null && sharesOutstanding !== null;
    const hasFCF = fcfBase !== null && fcfBase > 0;

    if (!hasMarketData || !hasFCF) {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <GlassCard>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
                        <h2 style={{ marginBottom: '12px' }}>Reverse DCF wymaga danych</h2>
                        <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
                            {!hasMarketData && 'Dodaj cenę akcji i liczbę akcji w Załaduj Dane. '}
                            {!hasFCF && 'Dodaj dane Cash Flow (Operating CF, CAPEX). '}
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

    const getCellColor = (implied: number | null): string => {
        if (implied === null || avgHistGrowth === null) return 'transparent';
        const delta = implied - avgHistGrowth;
        if (delta > 0.10) return 'rgba(244, 63, 94, 0.2)';
        if (delta > 0.03) return 'rgba(245, 158, 11, 0.2)';
        if (delta > -0.03) return 'rgba(56, 189, 248, 0.2)';
        return 'rgba(16, 185, 129, 0.2)';
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🔄 Reverse DCF — {state.companyName || 'Spółka'}
                </h1>
                <p style={{ color: 'var(--text-muted, #64748b)' }}>
                    Ile wzrostu rynek wycenia w cenę {formatNumber(currentPrice, currency)}/akcja?
                </p>
            </div>

            {/* Hero Section */}
            <GlassCard glowColor={verdictConfig[verdict].color} style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '32px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    {/* Implied Growth */}
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '8px' }}>
                            IMPLIKOWANY WZROST FCF
                        </div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: 'var(--accent-blue, #38bdf8)'
                        }}>
                            {formatPercent(impliedGrowth)}/rok
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                            przez {forecastYears} lat
                        </div>
                    </div>

                    {/* Verdict */}
                    <div>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                            {verdictConfig[verdict].icon}
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: verdictConfig[verdict].color
                        }}>
                            {verdictConfig[verdict].text}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                            {verdictConfig[verdict].detail}
                        </div>
                    </div>

                    {/* Historical Growth */}
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '8px' }}>
                            HISTORYCZNY WZROST
                        </div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '36px',
                            fontWeight: 'bold',
                            color: 'var(--text-secondary, #94a3b8)'
                        }}>
                            {formatPercent(avgHistGrowth)}/rok
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                            średnia {histGrowths.length} lat
                        </div>
                    </div>
                </div>

                {/* Comparison Bar */}
                <div style={{ marginTop: '24px', padding: '0 16px' }}>
                    <div style={{
                        position: 'relative',
                        height: '40px',
                        background: 'linear-gradient(to right, rgba(16,185,129,0.3) 0%, rgba(56,189,248,0.3) 40%, rgba(245,158,11,0.3) 60%, rgba(244,63,94,0.3) 100%)',
                        borderRadius: '8px',
                        overflow: 'visible'
                    }}>
                        {/* Historical marker */}
                        {avgHistGrowth !== null && (
                            <div style={{
                                position: 'absolute',
                                left: `${Math.max(0, Math.min(100, (avgHistGrowth + 0.1) / 0.6 * 100))}%`,
                                top: '0',
                                height: '100%',
                                width: '2px',
                                background: 'var(--text-secondary, #94a3b8)',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-24px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary, #94a3b8)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    ▼ Hist. {formatPercent(avgHistGrowth)}
                                </div>
                            </div>
                        )}

                        {/* Implied marker */}
                        {impliedGrowth !== null && (
                            <div style={{
                                position: 'absolute',
                                left: `${Math.max(0, Math.min(100, (impliedGrowth + 0.1) / 0.6 * 100))}%`,
                                top: '0',
                                height: '100%',
                                width: '3px',
                                background: 'white',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-24px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '11px',
                                    color: 'white',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 'bold'
                                }}>
                                    ▲ Implied {formatPercent(impliedGrowth)}
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: 'var(--text-muted, #64748b)',
                        marginTop: '28px'
                    }}>
                        <span>-10%</span>
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                    </div>
                </div>
            </GlassCard>

            {/* Parameters */}
            <GlassCard style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <FeatureIcon emoji="⚙️" />
                    <h3 style={{ margin: 0 }}>Parametry modelu</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    {/* Discount Rate */}
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '8px' }}>
                            Stopa dyskontowa (WACC): <strong>{discountRate.toFixed(1)}%</strong>
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="15"
                            step="0.5"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        {state.roicWaccResults?.wacc && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                                Auto z WACC: {state.roicWaccResults.wacc.toFixed(1)}%
                            </div>
                        )}
                    </div>

                    {/* Forecast Years */}
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '8px' }}>
                            Horyzont prognozy: <strong>{forecastYears} lat</strong>
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="15"
                            step="1"
                            value={forecastYears}
                            onChange={(e) => setForecastYears(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Terminal Method */}
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '8px' }}>
                            Metoda Terminal Value
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                                onClick={() => setTerminalMethod('perpetuity')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: `1px solid ${terminalMethod === 'perpetuity' ? 'var(--accent-blue, #38bdf8)' : 'rgba(255,255,255,0.1)'}`,
                                    background: terminalMethod === 'perpetuity' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Perpetuity Growth
                            </button>
                            <button
                                onClick={() => setTerminalMethod('exitMultiple')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: `1px solid ${terminalMethod === 'exitMultiple' ? 'var(--accent-blue, #38bdf8)' : 'rgba(255,255,255,0.1)'}`,
                                    background: terminalMethod === 'exitMultiple' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Exit Multiple
                            </button>
                        </div>
                        {terminalMethod === 'perpetuity' ? (
                            <>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                                    Wzrost wieczysty: <strong>{terminalGrowth.toFixed(1)}%</strong>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={terminalGrowth}
                                    onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </>
                        ) : (
                            <>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                                    P/FCF terminal: <strong>{terminalMultiple}x</strong>
                                </label>
                                <input
                                    type="range"
                                    min="8"
                                    max="25"
                                    step="1"
                                    value={terminalMultiple}
                                    onChange={(e) => setTerminalMultiple(parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </>
                        )}
                    </div>

                    {/* FCF Base */}
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '8px' }}>
                            FCF bazowy (FY{y0})
                        </label>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                        }}>
                            {formatNumber(fcfBase, currency)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                            (Operating CF {formatNumber(operatingCF, currency)} − CAPEX {formatNumber(capex ? Math.abs(capex) : null, currency)})
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Sensitivity Table */}
            <GlassCard style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <FeatureIcon emoji="📊" />
                    <h3 style={{ margin: 0 }}>Implikowany wzrost vs parametry</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    WACC ↓ / TG →
                                </th>
                                {sensitivityTable.tgValues.map(tg => (
                                    <th key={tg} style={{
                                        padding: '12px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {tg}%
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sensitivityTable.table.map((row, rowIdx) => (
                                <tr key={sensitivityTable.waccValues[rowIdx]}>
                                    <td style={{
                                        padding: '12px',
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                                    }}>
                                        {sensitivityTable.waccValues[rowIdx]}%
                                    </td>
                                    {row.map((cell, colIdx) => {
                                        const isCurrentCombo =
                                            Math.abs(cell.wacc - discountRate) < 0.1 &&
                                            Math.abs(cell.tg - terminalGrowth) < 0.1;
                                        return (
                                            <td
                                                key={colIdx}
                                                style={{
                                                    padding: '12px',
                                                    textAlign: 'center',
                                                    fontFamily: 'monospace',
                                                    background: getCellColor(cell.implied),
                                                    border: isCurrentCombo ? '2px solid white' : 'none',
                                                    fontWeight: isCurrentCombo ? 'bold' : 'normal',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                                }}
                                            >
                                                {formatPercent(cell.implied)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Interpretation */}
            <GlassCard style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <FeatureIcon emoji="💡" />
                    <h3 style={{ margin: 0 }}>Co to oznacza?</h3>
                </div>

                <div style={{
                    padding: '16px',
                    borderLeft: `3px solid ${verdictConfig[verdict].color}`,
                    background: 'var(--bg-elevated, #1a2332)',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '14px',
                    lineHeight: '1.7'
                }}>
                    {verdict === 'very_expensive' || verdict === 'expensive' ? (
                        <p>
                            Aby uzasadnić cenę <strong>{formatNumber(currentPrice, currency)}/akcja</strong>,
                            spółka musi rosnąć o <strong>{formatPercent(impliedGrowth)}</strong> rocznie przez {forecastYears} lat.
                            Historycznie rosła o <strong>{formatPercent(avgHistGrowth)}/rok</strong>.
                            <br /><br />
                            Oznacza to, że rynek oczekuje <strong>znacznego przyspieszenia</strong> wzrostu.
                            Pytanie: Co musiałoby się wydarzyć, żeby to osiągnąć?
                        </p>
                    ) : verdict === 'undervalued' || verdict === 'deeply_undervalued' ? (
                        <p>
                            Rynek oczekuje wzrostu zaledwie <strong>{formatPercent(impliedGrowth)}/rok</strong> —
                            <strong> PONIŻEJ</strong> historycznego tempa <strong>{formatPercent(avgHistGrowth)}/rok</strong>.
                            <br /><br />
                            Jeśli spółka utrzyma dotychczasowy wzrost, jest <strong>NIEDOWARTOŚCIOWANA</strong>.
                            Sprawdź: czy są powody pogorszenia? (nowe regulacje, utrata klientów, konkurencja?)
                        </p>
                    ) : (
                        <p>
                            Implikowany wzrost <strong>{formatPercent(impliedGrowth)}/rok</strong> jest zbliżony
                            do historycznego tempa <strong>{formatPercent(avgHistGrowth)}/rok</strong>.
                            <br /><br />
                            Cena odzwierciedla rozsądne oczekiwania rynku. Decyzja inwestycyjna powinna
                            opierać się na innych czynnikach (jakość zarządu, perspektywy sektora).
                        </p>
                    )}
                </div>
            </GlassCard>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => router.push('/valuation/dcf')}
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
                    💰 DCF (wycena wprost)
                </button>
                <button
                    onClick={() => router.push('/valuation/forecast')}
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
                    📈 Prognoza
                </button>
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
            </div>
        </div>
    );
}
