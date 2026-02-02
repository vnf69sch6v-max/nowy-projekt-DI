'use client';

// =============================================
// StochFin — Football Field Valuation Chart
// Visual comparison of all valuation methods
// Investment Banking pitch book standard
// =============================================

import { useMemo } from 'react';
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

    if (absValue >= 1_000) {
        return `${sign}${absValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} ${currency}`;
    }
    return `${sign}${absValue.toFixed(2)} ${currency}`;
}

function formatPercent(value: number | null): string {
    if (value === null || isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
}

function safeDivide(a: number | null, b: number | null): number | null {
    if (a === null || b === null || b === 0) return null;
    return a / b;
}

// =============================================
// Types
// =============================================

interface ValuationMethod {
    name: string;
    low: number;
    mid: number;
    high: number;
    color: string;
    detail: string;
}

// =============================================
// Main Component
// =============================================

export default function FootballFieldScreen() {
    const router = useRouter();
    const { state } = useCompanyData();

    const currency = state.currency || 'PLN';
    const currentPrice = state.market?.currentPrice ?? null;
    const sharesOutstanding = state.market?.sharesOutstanding ?? null;

    // Collect valuation methods from all modules
    const methods = useMemo<ValuationMethod[]>(() => {
        const result: ValuationMethod[] = [];

        // 1. DCF Monte Carlo (using correct percentiles structure: p5, p25, p50, p75, p95)
        if (state.dcfResults) {
            const dcf = state.dcfResults;
            const p5 = dcf.percentiles?.p5?.perShare;
            const p50 = dcf.percentiles?.p50?.perShare;
            const p95 = dcf.percentiles?.p95?.perShare;
            if (p5 !== null && p5 !== undefined &&
                p50 !== null && p50 !== undefined &&
                p95 !== null && p95 !== undefined) {
                result.push({
                    name: 'DCF Monte Carlo',
                    low: p5,
                    mid: p50,
                    high: p95,
                    color: '#38bdf8', // accent-blue
                    detail: `Symulacje: ${dcf.scenariosRun || 10000}`,
                });
            }
        }

        // 2. Comparable Analysis - EV/EBITDA
        // Using medians from ComparableResults (we can derive implied value from multiples)
        if (state.comparableResults?.medians?.evEbitda && sharesOutstanding) {
            const ebitda = state.incomeStatement?.[Object.keys(state.incomeStatement || {}).sort().reverse()[0]]?.ebitda;
            const totalDebt = state.balanceSheet?.[Object.keys(state.balanceSheet || {}).sort().reverse()[0]]?.totalDebt ?? 0;
            const cash = state.balanceSheet?.[Object.keys(state.balanceSheet || {}).sort().reverse()[0]]?.cash ?? 0;

            if (ebitda && state.comparableResults.medians.evEbitda) {
                const medianMultiple = state.comparableResults.medians.evEbitda;
                const ev = ebitda * medianMultiple;
                const equityValue = ev - totalDebt + cash;
                const perShare = equityValue / sharesOutstanding;

                result.push({
                    name: 'EV/EBITDA Comps',
                    low: perShare * 0.85,
                    mid: perShare,
                    high: perShare * 1.15,
                    color: '#8b5cf6', // accent-violet
                    detail: `Median Multiple: ${medianMultiple.toFixed(1)}x`,
                });
            }
        }

        // 3. Comparable Analysis - P/E
        if (state.comparableResults?.medians?.pe) {
            const netIncome = state.incomeStatement?.[Object.keys(state.incomeStatement || {}).sort().reverse()[0]]?.netIncome;

            if (netIncome && sharesOutstanding) {
                const eps = netIncome / sharesOutstanding;
                const medianPE = state.comparableResults.medians.pe;
                const perShare = eps * medianPE;

                result.push({
                    name: 'P/E Comps',
                    low: perShare * 0.85,
                    mid: perShare,
                    high: perShare * 1.15,
                    color: '#2dd4bf', // accent-teal
                    detail: `Median P/E: ${medianPE.toFixed(1)}x`,
                });
            }
        }

        // 4. Forecast Scenarios (only if explicitly stored in state)
        // forecastResults in context doesn't have direct valuePerShare - skip for now

        // 5. 52-week range (market data doesn't have week52 - use currentPrice with variance)
        if (currentPrice) {
            result.push({
                name: '52-tyg. szacunek',
                low: currentPrice * 0.75,
                mid: currentPrice,
                high: currentPrice * 1.25,
                color: '#64748b', // text-muted
                detail: 'Cena aktualna ±25%',
            });
        }

        return result;
    }, [state, currency]);

    // Calculate global range
    const { globalMin, globalMax, range } = useMemo(() => {
        if (methods.length === 0) return { globalMin: 0, globalMax: 100, range: 100 };

        const allValues = methods.flatMap(m => [m.low, m.high]).filter(Boolean);
        if (currentPrice !== null) allValues.push(currentPrice);

        const min = Math.min(...allValues) * 0.9;
        const max = Math.max(...allValues) * 1.1;

        return { globalMin: min, globalMax: max, range: max - min };
    }, [methods, currentPrice]);

    const toPercent = (val: number): number => {
        return ((val - globalMin) / range) * 100;
    };

    // Statistics
    const stats = useMemo(() => {
        if (methods.length === 0) return null;

        const allMids = methods.map(m => m.mid).sort((a, b) => a - b);
        const overallMedian = allMids[Math.floor(allMids.length / 2)];

        // Consensus range (overlap)
        const consensusLow = Math.max(...methods.map(m => m.low));
        const consensusHigh = Math.min(...methods.map(m => m.high));
        const hasConsensus = consensusLow < consensusHigh;

        // Margin of Safety
        const marginOfSafety = currentPrice !== null
            ? safeDivide(overallMedian - currentPrice, overallMedian)
            : null;

        // Upside
        const upside = currentPrice !== null
            ? safeDivide(overallMedian - currentPrice, currentPrice)
            : null;

        return {
            overallMedian,
            consensusLow,
            consensusHigh,
            hasConsensus,
            marginOfSafety,
            upside,
        };
    }, [methods, currentPrice]);

    // Check if we have enough data
    if (methods.length < 2) {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <GlassCard>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
                        <h2 style={{ marginBottom: '12px' }}>Football Field wymaga min. 2 metod wyceny</h2>
                        <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
                            Uruchom najpierw DCF i Comparable Analysis, aby zobaczyć porównanie wycen.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => router.push('/valuation/dcf')}
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
                                💰 DCF Monte Carlo
                            </button>
                            <button
                                onClick={() => router.push('/valuation/comps')}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                📈 Comparable
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    if (currentPrice === null) {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <GlassCard>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
                        <h2 style={{ marginBottom: '12px' }}>Brak aktualnej ceny akcji</h2>
                        <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
                            Dodaj cenę akcji w sekcji Załaduj Dane.
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
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                    ⚽ Football Field — {state.companyName || 'Spółka'}
                </h1>
                <p style={{ color: 'var(--text-muted, #64748b)' }}>
                    Porównanie metod wyceny
                </p>
            </div>

            {/* Football Field Chart */}
            <GlassCard style={{ marginBottom: '24px', overflowX: 'auto' }}>
                <div style={{ minWidth: '600px', padding: '16px', position: 'relative' }}>
                    {/* Chart area */}
                    <div style={{ position: 'relative', paddingTop: '32px', paddingBottom: '40px' }}>
                        {/* Current Price Line */}
                        <div style={{
                            position: 'absolute',
                            left: `${toPercent(currentPrice)}%`,
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: 'white',
                            zIndex: 10,
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-28px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'white',
                                color: '#0a0e17',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>
                                {formatNumber(currentPrice, currency)} (aktualnie)
                            </div>
                        </div>

                        {/* Methods */}
                        {methods.map((method, idx) => (
                            <div
                                key={method.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                    minHeight: '48px',
                                }}
                            >
                                {/* Label */}
                                <div style={{
                                    width: '140px',
                                    flexShrink: 0,
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    textAlign: 'right',
                                    paddingRight: '16px',
                                    color: method.color,
                                }}>
                                    {method.name}
                                </div>

                                {/* Bar area */}
                                <div style={{ flex: 1, position: 'relative', height: '36px' }}>
                                    {/* Floating bar */}
                                    <div style={{
                                        position: 'absolute',
                                        left: `${toPercent(method.low)}%`,
                                        width: `${toPercent(method.high) - toPercent(method.low)}%`,
                                        height: '36px',
                                        background: `${method.color}33`,
                                        border: `2px solid ${method.color}`,
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0 8px',
                                    }}>
                                        {/* Low label */}
                                        <span style={{ fontSize: '11px', color: method.color }}>
                                            {formatNumber(method.low, '')}
                                        </span>

                                        {/* Mid marker */}
                                        <div style={{
                                            position: 'absolute',
                                            left: `${((method.mid - method.low) / (method.high - method.low)) * 100}%`,
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: method.color,
                                            transform: 'translateX(-50%)',
                                        }} />

                                        {/* High label */}
                                        <span style={{ fontSize: '11px', color: method.color }}>
                                            {formatNumber(method.high, '')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* X-axis */}
                        <div style={{
                            marginLeft: '140px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: 'var(--text-muted, #64748b)',
                        }}>
                            <span>{formatNumber(globalMin, currency)}</span>
                            <span>{formatNumber((globalMin + globalMax) / 2, currency)}</span>
                            <span>{formatNumber(globalMax, currency)}</span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Statistics */}
            {stats && (
                <GlassCard style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <FeatureIcon emoji="📊" />
                        <h3 style={{ margin: 0 }}>Statystyki</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {/* Median */}
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-elevated, #1a2332)',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                                Mediana metod
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold' }}>
                                {formatNumber(stats.overallMedian, currency)}
                            </div>
                        </div>

                        {/* Consensus Range */}
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-elevated, #1a2332)',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                                Konsensus
                            </div>
                            {stats.hasConsensus ? (
                                <>
                                    <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                                        {formatNumber(stats.consensusLow, '')} – {formatNumber(stats.consensusHigh, '')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                                        Wspólny zakres
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '14px', color: 'var(--accent-amber, #f59e0b)' }}>
                                    ⚠️ Brak wspólnego zakresu
                                </div>
                            )}
                        </div>

                        {/* Margin of Safety */}
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-elevated, #1a2332)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${stats.marginOfSafety !== null
                                ? stats.marginOfSafety > 0.25 ? '#10b981'
                                    : stats.marginOfSafety > 0.10 ? '#38bdf8'
                                        : stats.marginOfSafety > 0 ? '#f59e0b'
                                            : '#f43f5e'
                                : '#64748b'
                                }`,
                        }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                                Margin of Safety
                            </div>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: stats.marginOfSafety !== null
                                    ? stats.marginOfSafety > 0.25 ? '#10b981'
                                        : stats.marginOfSafety > 0.10 ? '#38bdf8'
                                            : stats.marginOfSafety > 0 ? '#f59e0b'
                                                : '#f43f5e'
                                    : 'inherit'
                            }}>
                                {formatPercent(stats.marginOfSafety)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                                = (FV − Cena) / FV
                            </div>
                        </div>

                        {/* Upside */}
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-elevated, #1a2332)',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                                Upside / Downside
                            </div>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: stats.upside !== null
                                    ? stats.upside > 0.20 ? '#10b981'
                                        : stats.upside > 0 ? '#38bdf8'
                                            : '#f43f5e'
                                    : 'inherit'
                            }}>
                                {formatPercent(stats.upside)}
                            </div>
                        </div>
                    </div>

                    {/* Ben Graham Quote */}
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: 'rgba(56, 189, 248, 0.05)',
                        borderLeft: '3px solid var(--accent-blue, #38bdf8)',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        color: 'var(--text-secondary, #94a3b8)',
                    }}>
                        "Margines bezpieczeństwa to różnica między ceną a wartością wewnętrzną.
                        Im większy, tym mniejsze ryzyko."
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                            — Benjamin Graham
                        </span>
                    </div>
                </GlassCard>
            )}

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
                    💰 DCF
                </button>
                <button
                    onClick={() => router.push('/valuation/reverse-dcf')}
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
                    🔄 Reverse DCF
                </button>
                <button
                    onClick={() => router.push('/valuation/summary')}
                    style={{
                        padding: '12px 20px',
                        background: 'var(--accent-blue, #38bdf8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    📋 Investment Summary →
                </button>
            </div>
        </div>
    );
}
