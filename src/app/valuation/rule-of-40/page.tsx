'use client';

// =============================================
// StochFin — Rule of 40 Analysis
// SaaS / Growth Metric (PROMPT 12)
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
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Component
// =============================================

export default function RuleOf40Screen() {
    const { state } = useCompanyData();
    const router = useRouter();

    const years = state.availableYears;
    const y0 = getLatestYear(state);
    const y1 = getPreviousYear(state);

    const metrics = useMemo(() => {
        if (!y0 || !y1) return null;

        const rev0 = getField(state, 'incomeStatement', y0, 'revenue');
        const rev1 = getField(state, 'incomeStatement', y1, 'revenue');
        const revGrowth = safeDivide(rev0 !== null && rev1 !== null ? rev0 - rev1 : null, Math.abs(rev1 || 1));

        const ebitda0 = getField(state, 'incomeStatement', y0, 'ebitda');
        const ebitdaMargin = safeDivide(ebitda0, rev0);

        // Alternative: Operating margin
        const ebit0 = getField(state, 'incomeStatement', y0, 'ebit');
        const opMargin = safeDivide(ebit0, rev0);

        // Alternative: FCF margin
        const fcf0 = getField(state, 'cashFlow', y0, 'freeCashFlow');
        const fcfMargin = safeDivide(fcf0, rev0);

        // Use best available profit metric
        const profitMargin = ebitdaMargin !== null ? ebitdaMargin
            : opMargin !== null ? opMargin
                : fcfMargin;

        const rule40Score = (revGrowth !== null && profitMargin !== null)
            ? (revGrowth + profitMargin) * 100
            : null;

        // Historical
        const yearlyScores: { year: string; growth: number | null; margin: number | null; score: number | null }[] = [];
        for (let i = 0; i < years.length - 1; i++) {
            const y = years[i];
            const yPrev = years[i + 1];
            const currRev = getField(state, 'incomeStatement', y, 'revenue');
            const prevRev = getField(state, 'incomeStatement', yPrev, 'revenue');
            const currEbitda = getField(state, 'incomeStatement', y, 'ebitda');
            const yGrowth = safeDivide(currRev !== null && prevRev !== null ? currRev - prevRev : null, Math.abs(prevRev || 1));
            const yMargin = safeDivide(currEbitda, currRev);
            const yScore = (yGrowth !== null && yMargin !== null) ? (yGrowth + yMargin) * 100 : null;
            yearlyScores.push({ year: y, growth: yGrowth, margin: yMargin, score: yScore });
        }

        return {
            revGrowth,
            profitMargin,
            rule40Score,
            profitType: ebitdaMargin !== null ? 'EBITDA' : opMargin !== null ? 'Operating' : 'FCF',
            yearlyScores,
        };
    }, [state, years, y0, y1]);

    // Guard
    if (!state.dataLoaded || !y0 || !metrics) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby przeprowadzić analizę Rule of 40"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    const score = metrics.rule40Score;
    const scoreColor = score !== null && score >= 40 ? 'var(--accent-green)'
        : score !== null && score >= 30 ? 'var(--accent-blue)'
            : score !== null && score >= 20 ? 'var(--accent-amber)'
                : 'var(--accent-red)';
    const scoreLabel = score !== null && score >= 40 ? '✅ ZDANY'
        : score !== null && score >= 30 ? '⚠️ BLISKO'
            : '❌ NIE ZDANY';

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
                    Rule of 40 — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Wzrost + Rentowność = {'>'}40% dla zdrowej spółki SaaS/Growth
                </p>
            </div>

            {/* Hero */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                marginBottom: '16px',
                borderTop: `4px solid ${scoreColor}`,
            }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>RULE OF 40 SCORE</div>
                <div style={{ fontFamily: 'monospace', fontSize: '56px', fontWeight: 700, color: scoreColor }}>
                    {score !== null ? `${score.toFixed(0)}%` : '—'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: scoreColor, textTransform: 'uppercase', marginTop: '8px' }}>
                    {scoreLabel}
                </div>
            </div>

            {/* Breakdown */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 Dekompozycja</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Revenue Growth + {metrics.profitType} Margin = Rule of 40
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px' }}>
                    {/* Growth */}
                    <div style={{
                        textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        borderRadius: '12px',
                        padding: '20px',
                        minWidth: '140px',
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Wzrost przychodów</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '28px',
                            fontWeight: 700,
                            color: metrics.revGrowth !== null && metrics.revGrowth > 0.20 ? 'var(--accent-green)' : 'var(--accent-blue)',
                        }}>
                            {formatPercent(metrics.revGrowth)}
                        </div>
                    </div>

                    <div style={{ fontSize: '32px', color: 'var(--text-muted)', paddingBottom: '20px' }}>+</div>

                    {/* Margin */}
                    <div style={{
                        textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        borderRadius: '12px',
                        padding: '20px',
                        minWidth: '140px',
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{metrics.profitType} Margin</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '28px',
                            fontWeight: 700,
                            color: metrics.profitMargin !== null && metrics.profitMargin > 0.15 ? 'var(--accent-green)' : 'var(--accent-blue)',
                        }}>
                            {formatPercent(metrics.profitMargin)}
                        </div>
                    </div>

                    <div style={{ fontSize: '32px', color: 'var(--text-muted)', paddingBottom: '20px' }}>=</div>

                    {/* Total */}
                    <div style={{
                        textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        borderRadius: '12px',
                        padding: '20px',
                        minWidth: '140px',
                        borderBottom: `4px solid ${scoreColor}`,
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Rule of 40</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: 700, color: scoreColor }}>
                            {score !== null ? `${score.toFixed(0)}%` : '—'}
                        </div>
                    </div>
                </div>

                {/* Target line */}
                <div style={{ position: 'relative', height: '40px', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Progress Bar */}
                    <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, ((score || 0) / 60) * 100))}%`,
                        background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}66)`,
                        transition: 'width 0.5s ease',
                    }} />
                    {/* 40% Target Line */}
                    <div style={{
                        position: 'absolute',
                        left: `${(40 / 60) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: 'var(--accent-green)',
                    }} />
                    <div style={{
                        position: 'absolute',
                        left: `${(40 / 60) * 100}%`,
                        top: '50%',
                        transform: 'translateY(-50%) translateX(4px)',
                        fontSize: '10px',
                        color: 'var(--accent-green)',
                        fontWeight: 600,
                    }}>
                        40% TARGET
                    </div>
                </div>
            </div>

            {/* Historical */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Rule of 40 w czasie</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Rok</th>
                            <th style={{ textAlign: 'right', padding: '8px' }}>Wzrost</th>
                            <th style={{ textAlign: 'right', padding: '8px' }}>Marża</th>
                            <th style={{ textAlign: 'right', padding: '8px' }}>Score</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.yearlyScores.map(ys => (
                            <tr key={ys.year} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '8px', fontWeight: 600 }}>FY{ys.year}</td>
                                <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace' }}>
                                    {formatPercent(ys.growth)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace' }}>
                                    {formatPercent(ys.margin)}
                                </td>
                                <td style={{
                                    textAlign: 'right',
                                    padding: '8px',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    color: ys.score !== null && ys.score >= 40 ? 'var(--accent-green)'
                                        : ys.score !== null && ys.score >= 30 ? 'var(--accent-blue)' : 'var(--accent-amber)',
                                }}>
                                    {ys.score !== null ? `${ys.score.toFixed(0)}%` : '—'}
                                </td>
                                <td style={{ textAlign: 'center', padding: '8px' }}>
                                    {ys.score !== null && ys.score >= 40 ? '✅' : ys.score !== null && ys.score >= 30 ? '⚠️' : '❌'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Interpretation */}
            <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                padding: '20px',
                borderLeft: `4px solid ${scoreColor}`,
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>💡 Interpretacja</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                    {score !== null && score >= 40 && (
                        <>✅ Spółka spełnia Rule of 40. Łączy wzrost z rentownością — znak zdrowego modelu biznesowego.</>
                    )}
                    {score !== null && score >= 30 && score < 40 && (
                        <>⚠️ Blisko progu. Przy niewielkiej poprawie wzrostu lub marży spółka może wejść do klubu 40%.</>
                    )}
                    {score !== null && score < 30 && (
                        <>❌ Poniżej Rule of 40. Spółka albo rośnie za wolno, albo jest nierentowna. Rozważ, czy to faza inwestycji czy problem strukturalny.</>
                    )}
                    {score === null && <>Brak wystarczających danych do obliczenia Rule of 40.</>}
                </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '📊 Health Check', path: '/valuation/health' },
                    { label: '🏆 ROIC vs WACC', path: '/valuation/roic-wacc' },
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
