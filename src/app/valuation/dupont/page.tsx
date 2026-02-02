'use client';

// =============================================
// StochFin — DuPont 5-Factor Analysis
// ROE Decomposition Module (PROMPT 9)
// =============================================

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    safeDivide,
    formatPercent,
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Component
// =============================================

export default function DuPontScreen() {
    const { state } = useCompanyData();
    const router = useRouter();

    const years = state.availableYears;
    const y0 = getLatestYear(state);

    // DuPont calculation per year
    const dupontByYear = useMemo(() => {
        const result: Record<string, {
            taxBurden: number | null;
            interestBurden: number | null;
            ebitMargin: number | null;
            assetTurnover: number | null;
            leverage: number | null;
            roeDirect: number | null;
            roeDupont: number | null;
        }> = {};

        years.forEach(year => {
            const netIncome = getField(state, 'incomeStatement', year, 'netIncome');
            const ebt = getField(state, 'incomeStatement', year, 'ebt');
            const ebit = getField(state, 'incomeStatement', year, 'ebit');
            const revenue = getField(state, 'incomeStatement', year, 'revenue');
            const totalAssets = getField(state, 'balanceSheet', year, 'totalAssets');
            const totalEquity = getField(state, 'balanceSheet', year, 'totalEquity');

            // 5 DuPont factors
            const taxBurden = safeDivide(netIncome, ebt);
            const interestBurden = safeDivide(ebt, ebit);
            const ebitMargin = safeDivide(ebit, revenue);
            const assetTurnover = safeDivide(revenue, totalAssets);
            const leverage = safeDivide(totalAssets, totalEquity);

            // ROE direct and decomposed
            const roeDirect = safeDivide(netIncome, totalEquity);
            const roeDupont = (taxBurden !== null && interestBurden !== null && ebitMargin !== null && assetTurnover !== null && leverage !== null)
                ? taxBurden * interestBurden * ebitMargin * assetTurnover * leverage
                : null;

            result[year] = { taxBurden, interestBurden, ebitMargin, assetTurnover, leverage, roeDirect, roeDupont };
        });

        return result;
    }, [state, years]);

    // Latest year data
    const latest = y0 ? dupontByYear[y0] : null;

    // Find biggest Y/Y change driver
    const y1 = years.length >= 2 ? years[1] : null;
    const biggestDriver = useMemo(() => {
        if (!y0 || !y1) return null;
        const curr = dupontByYear[y0];
        const prev = dupontByYear[y1];
        if (!curr || !prev) return null;

        const changes = [
            { name: 'Tax Burden', curr: curr.taxBurden, prev: prev.taxBurden },
            { name: 'Interest Burden', curr: curr.interestBurden, prev: prev.interestBurden },
            { name: 'EBIT Margin', curr: curr.ebitMargin, prev: prev.ebitMargin },
            { name: 'Asset Turnover', curr: curr.assetTurnover, prev: prev.assetTurnover },
            { name: 'Leverage', curr: curr.leverage, prev: prev.leverage },
        ].map(c => ({
            ...c,
            change: (c.curr !== null && c.prev !== null) ? Math.abs(c.curr - c.prev) : 0,
            direction: (c.curr !== null && c.prev !== null) ? (c.curr > c.prev ? 'up' : 'down') : 'flat',
        })).sort((a, b) => b.change - a.change);

        return changes[0];
    }, [dupontByYear, y0, y1]);

    // Guard
    if (!state.dataLoaded || !y0 || !latest) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby przeprowadzić analizę DuPont"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    const roePct = latest.roeDirect !== null ? latest.roeDirect * 100 : null;
    const roeColor = roePct !== null && roePct > 20 ? 'var(--accent-green)'
        : roePct !== null && roePct > 10 ? 'var(--accent-blue)'
            : roePct !== null && roePct > 0 ? 'var(--accent-amber)'
                : 'var(--accent-red)';

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
                    DuPont 5-Factor — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Dekompozycja ROE — skąd pochodzi zwrot z kapitału?
                </p>
            </div>

            {/* Hero ROE */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                marginBottom: '16px',
            }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>ROE</div>
                <div style={{ fontFamily: 'monospace', fontSize: '48px', fontWeight: 700, color: roeColor }}>
                    {formatPercent(latest.roeDirect)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Weryfikacja DuPont: {formatPercent(latest.roeDupont)}
                </div>
            </div>

            {/* 5-Factor Waterfall */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 5 czynników DuPont</h3>
                <p style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    ROE = Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Leverage
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
                    {[
                        { label: 'Tax Burden', value: latest.taxBurden, desc: 'NI / EBT', unit: '' },
                        { label: 'Interest Burden', value: latest.interestBurden, desc: 'EBT / EBIT', unit: '' },
                        { label: 'EBIT Margin', value: latest.ebitMargin, desc: 'EBIT / Rev', unit: '%' },
                        { label: 'Asset T/O', value: latest.assetTurnover, desc: 'Rev / Assets', unit: 'x' },
                        { label: 'Leverage', value: latest.leverage, desc: 'Assets / Equity', unit: 'x' },
                    ].map((factor, i) => (
                        <>
                            <div key={factor.label} style={{
                                background: 'var(--bg-elevated)',
                                borderRadius: '8px',
                                padding: '16px',
                                textAlign: 'center',
                                minWidth: '100px',
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{factor.label}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 600 }}>
                                    {factor.value !== null
                                        ? factor.unit === '%' ? `${(factor.value * 100).toFixed(1)}%` : factor.value.toFixed(2) + factor.unit
                                        : '—'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{factor.desc}</div>
                            </div>
                            {i < 4 && <span key={`mult-${i}`} style={{ fontSize: '20px', color: 'var(--text-muted)' }}>×</span>}
                        </>
                    ))}
                </div>
            </div>

            {/* Year comparison table */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                overflowX: 'auto',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 DuPont w czasie</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Czynnik</th>
                            {years.map(y => (
                                <th key={y} style={{ textAlign: 'right', padding: '8px' }}>FY{y}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { key: 'taxBurden', label: 'Tax Burden', format: 'pct' },
                            { key: 'interestBurden', label: 'Interest Burden', format: 'pct' },
                            { key: 'ebitMargin', label: 'EBIT Margin', format: 'pct' },
                            { key: 'assetTurnover', label: 'Asset Turnover', format: 'mult' },
                            { key: 'leverage', label: 'Equity Multiplier', format: 'mult' },
                            { key: 'roeDirect', label: 'ROE', format: 'pct' },
                        ].map(row => (
                            <tr key={row.key} style={{ borderBottom: row.key === 'roeDirect' ? 'none' : '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '8px', fontWeight: row.key === 'roeDirect' ? 700 : 400 }}>{row.label}</td>
                                {years.map(y => {
                                    const v = dupontByYear[y]?.[row.key as keyof typeof latest];
                                    return (
                                        <td key={y} style={{
                                            textAlign: 'right',
                                            padding: '8px',
                                            fontFamily: 'monospace',
                                            fontWeight: row.key === 'roeDirect' ? 700 : 400,
                                        }}>
                                            {v !== null
                                                ? row.format === 'pct' ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(2)}x`
                                                : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* AI Interpretation */}
            {biggestDriver && (
                <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: '12px',
                    padding: '20px',
                    borderLeft: '4px solid var(--accent-blue)',
                    marginBottom: '16px',
                }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>💡 Co napędza ROE?</h3>
                    <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                        Głównym motorem zmiany ROE jest <strong>{biggestDriver.name}</strong> ({biggestDriver.direction === 'up' ? '↑ wzrost' : '↓ spadek'}).
                        {biggestDriver.name === 'EBIT Margin' && biggestDriver.direction === 'up' && ' Spółka poprawia efektywność kosztową.'}
                        {biggestDriver.name === 'Leverage' && biggestDriver.direction === 'up' && ' ⚠️ ROE rośnie przez DŁUG, nie przez lepszą operacyjność.'}
                        {biggestDriver.name === 'Interest Burden' && biggestDriver.direction === 'down' && ' ⚠️ Rosnące koszty odsetkowe zjadają zysk operacyjny.'}
                        {biggestDriver.name === 'Asset Turnover' && biggestDriver.direction === 'up' && ' Spółka lepiej wykorzystuje aktywa.'}
                        {biggestDriver.name === 'Tax Burden' && biggestDriver.direction === 'up' && ' Niższa efektywna stawka podatkowa.'}
                    </p>
                </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '🏆 ROIC vs WACC', path: '/valuation/roic-wacc' },
                    { label: '🔬 Jakość Zysków', path: '/valuation/earnings-quality' },
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
