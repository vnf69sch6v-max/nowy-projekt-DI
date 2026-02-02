'use client';

// =============================================
// StochFin — Capital Allocation Analysis
// What Management Does with Cash (PROMPT 11)
// =============================================

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    safeDivide,
    formatNumber,
    formatPercent,
    calcNOPAT,
    calcROIC,
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Component
// =============================================

export default function CapitalAllocationScreen() {
    const { state } = useCompanyData();
    const router = useRouter();

    const y0 = getLatestYear(state);
    const currency = state.currency;

    const metrics = useMemo(() => {
        if (!y0) return null;

        const opCF = getField(state, 'cashFlow', y0, 'operatingCF');
        const netIncome = getField(state, 'incomeStatement', y0, 'netIncome');
        const capex = getField(state, 'cashFlow', y0, 'capex');
        const acquisitions = getField(state, 'cashFlow', y0, 'acquisitions');
        const dividends = getField(state, 'cashFlow', y0, 'dividendsPaid');
        const buybacks = getField(state, 'cashFlow', y0, 'sharesRepurchased');
        const debtRepaid = getField(state, 'cashFlow', y0, 'debtRepayment');
        const fcf = getField(state, 'cashFlow', y0, 'freeCashFlow');

        // Allocation percentages (% of operating CF)
        const capexAbs = capex !== null ? Math.abs(capex) : null;
        const acquAbs = acquisitions !== null ? Math.abs(acquisitions) : null;
        const divAbs = dividends !== null ? Math.abs(dividends) : null;
        const buyAbs = buybacks !== null ? Math.abs(buybacks) : null;
        const debtAbs = debtRepaid !== null ? Math.abs(debtRepaid) : null;

        const totalUses = (capexAbs || 0) + (acquAbs || 0) + (divAbs || 0) + (buyAbs || 0) + (debtAbs || 0);
        const remaining = opCF !== null ? opCF - totalUses : null;

        const allocPct = (val: number | null) => (opCF && opCF > 0 && val !== null) ? Math.abs(val) / opCF : null;

        // Payout Ratio
        const payoutRatio = safeDivide(divAbs, netIncome);

        // Dividend Yield
        const sharesOut = state.market.sharesOutstanding;
        const price = state.market.currentPrice;
        const divPerShare = (divAbs !== null && sharesOut) ? divAbs / sharesOut : null;
        const divYield = safeDivide(divPerShare, price);

        // FCF Yield
        const marketCap = state.market.marketCap;
        const fcfYield = safeDivide(fcf, marketCap);

        // Reinvestment Rate
        const nopat = calcNOPAT(state, y0);
        const reinvestRate = safeDivide((capexAbs || 0) + (acquAbs || 0), nopat);

        // Shareholder Yield
        const shareholderYield = safeDivide((divAbs || 0) + (buyAbs || 0), marketCap);

        // ROIC
        const roic = calcROIC(state, y0);

        return {
            opCF,
            capex: capexAbs,
            acquisitions: acquAbs,
            dividends: divAbs,
            buybacks: buyAbs,
            debtRepaid: debtAbs,
            totalUses,
            remaining,
            allocPct,
            payoutRatio,
            divYield,
            fcfYield,
            reinvestRate,
            shareholderYield,
            roic,
            netIncome,
        };
    }, [state, y0]);

    // Guard
    if (!state.dataLoaded || !y0 || !metrics) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby przeprowadzić analizę alokacji kapitału"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    const allocations = [
        { name: 'Reinwestycje (CAPEX)', value: metrics.capex, pct: metrics.allocPct(metrics.capex), icon: '🏗️', color: 'var(--accent-blue)', desc: 'Wydatki na rozwój' },
        { name: 'Przejęcia (M&A)', value: metrics.acquisitions, pct: metrics.allocPct(metrics.acquisitions), icon: '🤝', color: 'var(--accent-violet)', desc: 'Kupno innych firm' },
        { name: 'Dywidendy', value: metrics.dividends, pct: metrics.allocPct(metrics.dividends), icon: '💰', color: 'var(--accent-green)', desc: 'Gotówka dla akcjonariuszy' },
        { name: 'Skup akcji', value: metrics.buybacks, pct: metrics.allocPct(metrics.buybacks), icon: '🔄', color: 'var(--accent-amber)', desc: 'Odkup własnych akcji' },
        { name: 'Spłata długu', value: metrics.debtRepaid, pct: metrics.allocPct(metrics.debtRepaid), icon: '📉', color: 'var(--text-secondary)', desc: 'Redukcja zadłużenia' },
    ].filter(a => a.value !== null && a.value > 0);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '14px', marginBottom: '8px' }}
                >
                    ← Powrót
                </button>
                <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
                    Alokacja kapitału — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Co zarząd robi z pieniędzmi firmy?
                </p>
            </div>

            {/* Hero: Operating CF */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '16px',
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Cash Flow operacyjny:</span>
                    <div style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: 700, color: 'var(--accent-green)' }}>
                        {formatNumber(metrics.opCF, currency)}
                    </div>
                </div>

                {/* Waterfall Bar */}
                <div style={{ height: '48px', display: 'flex', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                    {allocations.map((alloc, i) => (
                        <div
                            key={i}
                            style={{
                                width: `${(alloc.pct || 0) * 100}%`,
                                background: alloc.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'width 0.3s',
                                minWidth: alloc.pct && alloc.pct > 0.05 ? '40px' : '0',
                            }}
                            title={`${alloc.name}: ${formatNumber(alloc.value, currency)} (${formatPercent(alloc.pct)})`}
                        >
                            {alloc.pct && alloc.pct > 0.1 && (
                                <span style={{ fontSize: '11px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    {alloc.icon}
                                </span>
                            )}
                        </div>
                    ))}
                    {metrics.remaining !== null && metrics.remaining > 0 && metrics.opCF && (
                        <div style={{
                            width: `${(metrics.remaining / metrics.opCF) * 100}%`,
                            background: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💵</span>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
                    {allocations.map((alloc, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: alloc.color }} />
                            {alloc.icon} {alloc.name}: {formatNumber(alloc.value, currency)} ({formatPercent(alloc.pct)})
                        </div>
                    ))}
                    {metrics.remaining !== null && metrics.remaining > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                            💵 Niewydane: {formatNumber(metrics.remaining, currency)}
                        </div>
                    )}
                </div>
            </div>

            {/* Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
            }}>
                {/* Dividend Payout Ratio */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Dividend Payout Ratio</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 600 }}>
                        {formatPercent(metrics.payoutRatio)}
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(100, (metrics.payoutRatio || 0) * 100)}%`,
                            background: metrics.payoutRatio !== null && metrics.payoutRatio < 0.3 ? 'var(--accent-green)'
                                : metrics.payoutRatio !== null && metrics.payoutRatio < 0.6 ? 'var(--accent-blue)'
                                    : 'var(--accent-amber)',
                        }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        &lt;30% konserwatywny, 30-60% zdrowy, &gt;60% agresywny
                    </div>
                </div>

                {/* Dividend Yield */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Dividend Yield</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 600 }}>
                        {formatPercent(metrics.divYield)}
                    </div>
                    {metrics.divYield === null && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Brak danych o cenie lub dywidendzie
                        </div>
                    )}
                </div>

                {/* FCF Yield */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>FCF Yield</div>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '24px',
                        fontWeight: 600,
                        color: metrics.fcfYield !== null && metrics.fcfYield > 0.05 ? 'var(--accent-green)'
                            : metrics.fcfYield !== null && metrics.fcfYield > 0.03 ? 'var(--accent-blue)'
                                : 'var(--accent-amber)',
                    }}>
                        {formatPercent(metrics.fcfYield)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        &gt;5% atrakcyjny, 3-5% OK, &lt;3% drogo
                    </div>
                </div>

                {/* Reinvestment Rate */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Reinvestment Rate</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 600 }}>
                        {formatPercent(metrics.reinvestRate)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Ile zysku reinwestowane vs oddane
                    </div>
                </div>

                {/* Shareholder Yield */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Shareholder Yield</div>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '24px',
                        fontWeight: 600,
                        color: metrics.shareholderYield !== null && metrics.shareholderYield > 0.05 ? 'var(--accent-green)'
                            : metrics.shareholderYield !== null && metrics.shareholderYield > 0.02 ? 'var(--accent-blue)'
                                : 'var(--text-secondary)',
                    }}>
                        {formatPercent(metrics.shareholderYield)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        &gt;5% bardzo hojny, 2-5% dobry
                    </div>
                </div>

                {/* ROIC Context */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>ROIC kontekst</div>
                    {metrics.roic !== null && metrics.reinvestRate !== null && (
                        <div style={{ fontSize: '13px' }}>
                            {metrics.roic > 0.10 && metrics.reinvestRate > 0.5 && (
                                <span style={{ color: 'var(--accent-green)' }}>✅ Reinwestuje przy ROIC &gt; WACC — tworzy wartość</span>
                            )}
                            {metrics.roic < 0.08 && metrics.reinvestRate > 0.5 && (
                                <span style={{ color: 'var(--accent-red)' }}>🔴 Reinwestuje przy niskim ROIC — możliwe niszczenie wartości</span>
                            )}
                            {metrics.roic > 0.10 && metrics.reinvestRate < 0.3 && (
                                <span style={{ color: 'var(--accent-amber)' }}>⚠️ Mało reinwestuje mimo wysokiego ROIC — brak wzrostu?</span>
                            )}
                            {!(
                                (metrics.roic > 0.10 && metrics.reinvestRate > 0.5) ||
                                (metrics.roic < 0.08 && metrics.reinvestRate > 0.5) ||
                                (metrics.roic > 0.10 && metrics.reinvestRate < 0.3)
                            ) && (
                                    <span style={{ color: 'var(--text-secondary)' }}>📊 ROIC: {formatPercent(metrics.roic)}</span>
                                )}
                        </div>
                    )}
                    {(metrics.roic === null || metrics.reinvestRate === null) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Brak danych do analizy</span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '🏆 ROIC vs WACC', path: '/valuation/roic-wacc' },
                    { label: '📈 Prognoza', path: '/valuation/forecast' },
                    { label: '💰 DCF', path: '/valuation/dcf' },
                ].map(item => (
                    <button
                        key={item.path}
                        onClick={() => router.push(item.path)}
                        style={{
                            padding: '12px 16px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
