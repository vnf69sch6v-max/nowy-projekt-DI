'use client';

// =============================================
// StochFin — ROIC vs WACC Analysis
// Value Creation Analysis Module (PROMPT 7)
// =============================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    safeDivide,
    formatPercent,
    formatNumber,
    calcNOPAT,
    calcInvestedCapital,
    calcROIC,
    CompanyDataState,
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// WACC Calculation Helpers
// =============================================

function calcWACC(
    state: CompanyDataState,
    year: string,
    riskFreeRate: number,
    beta: number,
    erp: number
): {
    wacc: number;
    costOfEquity: number;
    costOfDebt: number;
    weightEquity: number;
    weightDebt: number;
    interestExpense: number | null;
    totalDebt: number;
    equity: number | null;
} {
    const equity = getField(state, 'balanceSheet', year, 'totalEquity');
    const totalDebt = getField(state, 'balanceSheet', year, 'totalDebt')
        || getField(state, 'balanceSheet', year, 'longTermDebt') || 0;
    const totalCapital = (equity || 0) + totalDebt;

    // Cost of Equity (CAPM)
    const costOfEquity = riskFreeRate + beta * erp;

    // Cost of Debt
    const interestExp = getField(state, 'incomeStatement', year, 'interestExpense');
    const costOfDebtPreTax = safeDivide(interestExp, totalDebt);
    const taxRate = getField(state, 'incomeStatement', year, 'effectiveTaxRate') || 0.19;
    const costOfDebt = costOfDebtPreTax !== null
        ? costOfDebtPreTax * (1 - taxRate) * 100
        : 5.0;

    // Weights
    const weightEquity = totalCapital > 0 ? ((equity || 0) / totalCapital) : 0.7;
    const weightDebt = totalCapital > 0 ? (totalDebt / totalCapital) : 0.3;

    // WACC
    const wacc = (weightEquity * costOfEquity) + (weightDebt * costOfDebt);

    return {
        wacc,
        costOfEquity,
        costOfDebt,
        weightEquity,
        weightDebt,
        interestExpense: interestExp,
        totalDebt,
        equity,
    };
}

// =============================================
// Verdict Labels
// =============================================

const verdictLabels: Record<string, { text: string; color: string; icon: string }> = {
    strong_creator: { text: 'SILNY TWÓRCA WARTOŚCI', color: 'var(--accent-green)', icon: '🏆' },
    creator: { text: 'TWÓRCA WARTOŚCI', color: 'var(--accent-green)', icon: '✅' },
    marginal_creator: { text: 'MARGINALNY TWÓRCA', color: 'var(--accent-amber)', icon: '➡️' },
    marginal_destroyer: { text: 'MARGINALNY NISZCZYCIEL', color: 'var(--accent-amber)', icon: '⚠️' },
    destroyer: { text: 'NISZCZYCIEL WARTOŚCI', color: 'var(--accent-red)', icon: '🔴' },
    unknown: { text: 'BRAK DANYCH', color: 'var(--text-muted)', icon: '❓' },
};

function getVerdict(spread: number | null): string {
    if (spread === null) return 'unknown';
    if (spread > 5) return 'strong_creator';
    if (spread > 2) return 'creator';
    if (spread > 0) return 'marginal_creator';
    if (spread > -2) return 'marginal_destroyer';
    return 'destroyer';
}

// =============================================
// Component
// =============================================

export default function ROICWACCScreen() {
    const { state } = useCompanyData();
    const router = useRouter();

    // WACC parameters (editable)
    const [riskFreeRate, setRiskFreeRate] = useState(4.5);
    const [beta, setBeta] = useState(1.0);
    const [erp, setErp] = useState(5.5);

    const years = state.availableYears;
    const y0 = getLatestYear(state);
    const currency = state.currency;

    // ROIC calculations per year
    const roicByYear = useMemo(() => {
        const result: Record<string, { nopat: number | null; ic: number | null; roic: number | null }> = {};
        years.forEach(y => {
            const nopat = calcNOPAT(state, y);
            const ic = calcInvestedCapital(state, y);
            const roic = calcROIC(state, y);
            result[y] = { nopat, ic, roic };
        });
        return result;
    }, [state, years]);

    // WACC calculation
    const waccData = useMemo(() => {
        if (!y0) return null;
        return calcWACC(state, y0, riskFreeRate, beta, erp);
    }, [state, y0, riskFreeRate, beta, erp]);

    // Spread and EVA
    const latestROIC = y0 ? roicByYear[y0]?.roic : null;
    const spread = (latestROIC !== null && waccData)
        ? (latestROIC * 100) - waccData.wacc : null;
    const ic0 = y0 ? calcInvestedCapital(state, y0) : null;
    const eva = (spread !== null && ic0 !== null)
        ? (spread / 100) * ic0 : null;
    const verdict = getVerdict(spread);
    const verdictInfo = verdictLabels[verdict];

    // ROIC Breakdown
    const nopatMargin = y0 ? safeDivide(calcNOPAT(state, y0), getField(state, 'incomeStatement', y0, 'revenue')) : null;
    const icTurnover = y0 ? safeDivide(getField(state, 'incomeStatement', y0, 'revenue'), ic0) : null;

    // Guard: no data
    if (!state.dataLoaded || !y0) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby przeprowadzić analizę ROIC vs WACC"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '8px',
                    }}
                >
                    ← Powrót
                </button>
                <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
                    ROIC vs WACC — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Analiza tworzenia wartości
                </p>
            </div>

            {/* Hero Section */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                marginBottom: '16px',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                    {/* ROIC */}
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>ROIC</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '36px',
                            fontWeight: 700,
                            color: latestROIC !== null && latestROIC > 0.15 ? 'var(--accent-green)' : latestROIC !== null && latestROIC > 0.08 ? 'var(--accent-blue)' : 'var(--accent-amber)',
                        }}>
                            {formatPercent(latestROIC)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Zwrot z zainwest. kapitału</div>
                    </div>

                    {/* SPREAD */}
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>SPREAD</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '48px',
                            fontWeight: 700,
                            color: verdictInfo.color,
                        }}>
                            {spread !== null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)} pp` : '—'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: verdictInfo.color, textTransform: 'uppercase' }}>
                            {verdictInfo.icon} {verdictInfo.text}
                        </div>
                    </div>

                    {/* WACC */}
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>WACC</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '36px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                        }}>
                            {waccData ? `${waccData.wacc.toFixed(1)}%` : '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Koszt kapitału</div>
                    </div>
                </div>

                {/* EVA */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '24px', paddingTop: '16px' }}>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '20px',
                        color: eva !== null && eva > 0 ? 'var(--accent-green)' : eva !== null && eva < 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                    }}>
                        Zysk ekonomiczny (EVA): {formatNumber(eva, currency)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        = (ROIC − WACC) × Zainwestowany kapitał ({formatNumber(ic0, currency)})
                    </div>
                </div>
            </div>

            {/* ROIC vs WACC Bar Chart */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 ROIC vs WACC w czasie</h3>
                {years.map(year => {
                    const yearRoic = roicByYear[year]?.roic;
                    const roicPct = yearRoic !== null ? yearRoic * 100 : 0;
                    const waccPct = waccData?.wacc || 9;
                    const maxVal = Math.max(roicPct, waccPct) * 1.2;
                    const yearSpread = yearRoic !== null ? roicPct - waccPct : null;
                    const isPositive = yearSpread !== null && yearSpread > 0;

                    return (
                        <div key={year} style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{year}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-muted)' }}>ROIC</div>
                                <div style={{
                                    height: '20px',
                                    width: `${(roicPct / maxVal) * 100}%`,
                                    background: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                                    borderRadius: '4px',
                                    minWidth: '4px',
                                }} />
                                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>{roicPct.toFixed(1)}%</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-muted)' }}>WACC</div>
                                <div style={{
                                    height: '20px',
                                    width: `${(waccPct / maxVal) * 100}%`,
                                    background: 'rgba(255,255,255,0.15)',
                                    borderRadius: '4px',
                                    minWidth: '4px',
                                }} />
                                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>{waccPct.toFixed(1)}%</div>
                            </div>
                            <div style={{ fontSize: '12px', color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '4px' }}>
                                Spread: {yearSpread !== null ? `${yearSpread > 0 ? '+' : ''}${yearSpread.toFixed(1)} pp` : '—'} {isPositive ? '✅' : '⚠️'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* WACC Calculator */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>⚙️ Parametry WACC (edytuj)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    {/* Cost of Equity */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Cost of Equity (CAPM)</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk-Free Rate: {riskFreeRate}%</label>
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="0.5"
                                value={riskFreeRate}
                                onChange={e => setRiskFreeRate(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Beta: β = {beta}</label>
                            <input
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.1"
                                value={beta}
                                onChange={e => setBeta(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Equity Risk Premium: {erp}%</label>
                            <input
                                type="range"
                                min="3"
                                max="8"
                                step="0.5"
                                value={erp}
                                onChange={e => setErp(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--accent-blue)' }}>
                            Ke = {riskFreeRate}% + {beta} × {erp}% = {waccData?.costOfEquity.toFixed(1)}%
                        </div>
                    </div>

                    {/* Cost of Debt */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Cost of Debt</h4>
                        {waccData && waccData.interestExpense !== null ? (
                            <>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Auto-kalkulacja z danych:</div>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Koszty odsetkowe: {formatNumber(waccData.interestExpense, currency)}</div>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Dług ogółem: {formatNumber(waccData.totalDebt, currency)}</div>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Kd post-tax: {waccData.costOfDebt.toFixed(1)}%</div>
                            </>
                        ) : (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Brak danych — używam default 5%</div>
                        )}
                    </div>
                </div>

                {/* Capital Weights */}
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Wagi kapitału:</div>
                    <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{
                            width: `${(waccData?.weightEquity || 0.7) * 100}%`,
                            background: 'var(--accent-green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#fff',
                        }}>
                            Equity {((waccData?.weightEquity || 0.7) * 100).toFixed(0)}%
                        </div>
                        <div style={{
                            width: `${(waccData?.weightDebt || 0.3) * 100}%`,
                            background: 'var(--accent-amber)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#000',
                        }}>
                            Debt {((waccData?.weightDebt || 0.3) * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--accent-green)' }}>
                        WACC = {((waccData?.weightEquity || 0.7) * 100).toFixed(0)}% × {waccData?.costOfEquity.toFixed(1)}% + {((waccData?.weightDebt || 0.3) * 100).toFixed(0)}% × {waccData?.costOfDebt.toFixed(1)}% = {waccData?.wacc.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* ROIC Breakdown */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🔬 Dekompozycja ROIC</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    ROIC = NOPAT Margin × Invested Capital Turnover
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>NOPAT Margin</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 700, color: nopatMargin !== null && nopatMargin > 0.15 ? 'var(--accent-green)' : nopatMargin !== null && nopatMargin > 0.08 ? 'var(--accent-blue)' : 'var(--accent-amber)' }}>
                            {formatPercent(nopatMargin)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            &gt;15% doskonały, 8-15% dobry, &lt;8% słaby
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Obrotowość kapitału</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 700, color: icTurnover !== null && icTurnover > 1.5 ? 'var(--accent-green)' : icTurnover !== null && icTurnover > 0.8 ? 'var(--accent-blue)' : 'var(--accent-amber)' }}>
                            {icTurnover !== null ? `${icTurnover.toFixed(2)}x` : '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            &gt;1.5x doskonały, 0.8-1.5x dobry, &lt;0.8x słaby
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '16px' }}>
                    Badania Morgan Stanley pokazują, że spółki z trwale wysokim ROIC osiągają lepsze wyniki głównie dzięki wyższej MARŻY, nie obrotowości.
                </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '📊 Health Check', path: '/valuation/health' },
                    { label: '💰 DCF', path: '/valuation/dcf' },
                    { label: '🔬 Jakość Zysków', path: '/valuation/earnings-quality' },
                    { label: '📈 DuPont', path: '/valuation/dupont' },
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
