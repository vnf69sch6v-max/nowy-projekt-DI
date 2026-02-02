'use client';

// =============================================
// StochFin — Earnings Quality Analysis
// Sloan Accrual Ratio & Red Flags (PROMPT 8)
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
    formatNumber,
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Component
// =============================================

export default function EarningsQualityScreen() {
    const { state } = useCompanyData();
    const router = useRouter();

    const years = state.availableYears;
    const y0 = getLatestYear(state);
    const y1 = getPreviousYear(state);
    const currency = state.currency;

    // Calculate all metrics
    const metrics = useMemo(() => {
        if (!y0) return null;

        const netIncome = getField(state, 'incomeStatement', y0, 'netIncome');
        const opCF = getField(state, 'cashFlow', y0, 'operatingCF');
        const totalAssets = getField(state, 'balanceSheet', y0, 'totalAssets');
        const totalAssets_prev = y1 ? getField(state, 'balanceSheet', y1, 'totalAssets') : null;
        const avgAssets = (totalAssets && totalAssets_prev)
            ? (totalAssets + totalAssets_prev) / 2 : totalAssets;

        // 1. Accrual Ratio (Sloan)
        const accrualRatio = safeDivide(
            (netIncome !== null && opCF !== null) ? netIncome - opCF : null,
            avgAssets
        );
        const arZone = accrualRatio === null ? 'unknown'
            : accrualRatio < -0.05 ? 'excellent'
                : accrualRatio < 0 ? 'good'
                    : accrualRatio < 0.05 ? 'warning'
                        : 'danger';

        // 2. CF Coverage
        const cfCoverage = safeDivide(opCF, netIncome);
        const cfCoverageZone = cfCoverage === null ? 'unknown'
            : cfCoverage >= 1.2 ? 'excellent'
                : cfCoverage >= 1.0 ? 'good'
                    : cfCoverage >= 0.8 ? 'warning'
                        : 'danger';

        // 3. Receivables vs Revenue Growth
        const rev0 = getField(state, 'incomeStatement', y0, 'revenue');
        const rev1 = y1 ? getField(state, 'incomeStatement', y1, 'revenue') : null;
        const rec0 = getField(state, 'balanceSheet', y0, 'receivables');
        const rec1 = y1 ? getField(state, 'balanceSheet', y1, 'receivables') : null;
        const revGrowth = safeDivide(rev0 !== null && rev1 !== null ? rev0 - rev1 : null, Math.abs(rev1 || 1));
        const recGrowth = safeDivide(rec0 !== null && rec1 !== null ? rec0 - rec1 : null, Math.abs(rec1 || 1));
        const recFlag = (revGrowth !== null && recGrowth !== null)
            ? recGrowth > revGrowth + 0.05 : null;

        // 4. Inventory vs COGS Growth
        const inv0 = getField(state, 'balanceSheet', y0, 'inventory');
        const inv1 = y1 ? getField(state, 'balanceSheet', y1, 'inventory') : null;
        const cogs0 = getField(state, 'incomeStatement', y0, 'costOfRevenue');
        const cogs1 = y1 ? getField(state, 'incomeStatement', y1, 'costOfRevenue') : null;
        const invGrowth = safeDivide(inv0 !== null && inv1 !== null ? inv0 - inv1 : null, Math.abs(inv1 || 1));
        const cogsGrowth = safeDivide(cogs0 !== null && cogs1 !== null ? cogs0 - cogs1 : null, Math.abs(cogs1 || 1));
        const invFlag = (invGrowth !== null && cogsGrowth !== null)
            ? invGrowth > cogsGrowth + 0.05 : null;

        // 5. ROA Volatility
        const roaByYear: Record<string, number | null> = {};
        years.forEach(y => {
            const ni = getField(state, 'incomeStatement', y, 'netIncome');
            const ta = getField(state, 'balanceSheet', y, 'totalAssets');
            roaByYear[y] = safeDivide(ni, ta);
        });
        const roaValues = years.map(y => roaByYear[y]).filter(v => v !== null) as number[];
        const roaVolatility = roaValues.length >= 2
            ? (() => {
                const mean = roaValues.reduce((a, b) => a + b, 0) / roaValues.length;
                return Math.sqrt(roaValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (roaValues.length - 1));
            })()
            : null;

        // 6. Cash Conversion Cycle
        const dso = safeDivide(rec0, rev0) !== null ? (safeDivide(rec0, rev0) as number) * 365 : null;
        const dio = safeDivide(inv0, cogs0) !== null ? (safeDivide(inv0, cogs0) as number) * 365 : null;
        const payables0 = getField(state, 'balanceSheet', y0, 'currentLiabilities');
        const dpo = safeDivide(payables0 ? payables0 * 0.3 : null, cogs0) !== null
            ? (safeDivide(payables0! * 0.3, cogs0) as number) * 365 : null;
        const ccc = (dso !== null && dio !== null && dpo !== null) ? dso + dio - dpo : null;

        // 7. SBC
        const sbc = getField(state, 'cashFlow', y0, 'stockCompensation');
        const sbcRatio = safeDivide(sbc, netIncome);
        const sbcFlag = sbcRatio !== null && Math.abs(sbcRatio) > 0.20;

        // 8. EQ Score
        let eqScore = 50;
        let eqMax = 50;

        eqMax += 20;
        if (accrualRatio !== null) {
            if (accrualRatio < -0.05) eqScore += 20;
            else if (accrualRatio < 0) eqScore += 15;
            else if (accrualRatio < 0.05) eqScore += 5;
            else eqScore -= 10;
        }

        eqMax += 15;
        if (cfCoverage !== null) {
            if (cfCoverage >= 1.2) eqScore += 15;
            else if (cfCoverage >= 1.0) eqScore += 10;
            else if (cfCoverage >= 0.8) eqScore += 3;
            else eqScore -= 10;
        }

        eqMax += 10;
        if (recFlag === true) eqScore -= 5;
        else if (recFlag === false) eqScore += 10;

        eqMax += 5;
        if (invFlag === true) eqScore -= 3;
        else if (invFlag === false) eqScore += 5;

        const finalEQ = Math.max(0, Math.min(100, Math.round(eqScore / eqMax * 100)));

        return {
            netIncome, opCF, avgAssets,
            accrualRatio, arZone,
            cfCoverage, cfCoverageZone,
            revGrowth, recGrowth, recFlag,
            invGrowth, cogsGrowth, invFlag,
            roaVolatility,
            dso, dio, dpo, ccc,
            sbc, sbcRatio, sbcFlag,
            finalEQ,
        };
    }, [state, years, y0, y1]);

    // Guard
    if (!state.dataLoaded || !y0 || !metrics) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby przeprowadzić analizę jakości zysków"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    const eqColor = metrics.finalEQ >= 75 ? 'var(--accent-green)'
        : metrics.finalEQ >= 50 ? 'var(--accent-blue)'
            : metrics.finalEQ >= 30 ? 'var(--accent-amber)'
                : 'var(--accent-red)';
    const eqLabel = metrics.finalEQ >= 75 ? 'WYSOKA JAKOŚĆ'
        : metrics.finalEQ >= 50 ? 'AKCEPTOWALNA'
            : metrics.finalEQ >= 30 ? 'NISKA'
                : 'KRYTYCZNIE NISKA';

    const zoneColors: Record<string, string> = {
        excellent: 'var(--accent-green)',
        good: 'var(--accent-blue)',
        warning: 'var(--accent-amber)',
        danger: 'var(--accent-red)',
        unknown: 'var(--text-muted)',
    };

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
                    Jakość Zysków — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Earnings Quality: czy zysk jest prawdziwy?
                </p>
            </div>

            {/* Hero: EQ Gauge */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                marginBottom: '16px',
            }}>
                <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: `8px solid ${eqColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: 700, color: eqColor }}>
                        {metrics.finalEQ}
                    </span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: eqColor, textTransform: 'uppercase' }}>
                    {eqLabel}
                </div>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '12px' }}>
                    &quot;Spółki z niskimi akrualami historycznie biły rynek o ~10% rocznie&quot; (Sloan, 1996)
                </p>
            </div>

            {/* Accrual Ratio */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 ACCRUAL RATIO (Sloan)</h3>

                {/* Zone Bar */}
                <div style={{ display: 'flex', marginBottom: '16px', borderRadius: '4px', overflow: 'hidden' }}>
                    {['DOSKONALE', 'DOBRZE', 'UWAGA', 'NIEBEZPIECZNIE'].map((label, i) => (
                        <div key={label} style={{
                            flex: 1,
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '10px',
                            background: ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-red)'][i],
                            color: i < 3 ? '#fff' : '#fff',
                            opacity: metrics.arZone === ['excellent', 'good', 'warning', 'danger'][i] ? 1 : 0.3,
                        }}>
                            {label}
                        </div>
                    ))}
                </div>

                <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 700, color: zoneColors[metrics.arZone], marginBottom: '8px' }}>
                    AR = {metrics.accrualRatio !== null ? `${(metrics.accrualRatio * 100).toFixed(1)}%` : '—'}
                </div>

                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    ({formatNumber(metrics.netIncome, currency)} − {formatNumber(metrics.opCF, currency)}) / {formatNumber(metrics.avgAssets, currency)}
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', borderLeft: `3px solid ${zoneColors[metrics.arZone]}` }}>
                    {metrics.arZone === 'excellent' && '✅ Zyski mocno oparte na gotówce — wysoka wiarygodność'}
                    {metrics.arZone === 'good' && '✅ Zyski pokryte gotówką — dobra jakość'}
                    {metrics.arZone === 'warning' && '⚠️ Zyski częściowo "papierowe" — monitoruj'}
                    {metrics.arZone === 'danger' && '🔴 Duża rozbieżność między zyskiem a gotówką — UWAGA'}
                    {metrics.arZone === 'unknown' && '❓ Brak danych do obliczeń'}
                </div>
            </div>

            {/* CF Coverage */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>💰 Pokrycie zysku gotówką</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 700, color: zoneColors[metrics.cfCoverageZone], marginBottom: '8px' }}>
                    OCF / Net Income = {metrics.cfCoverage !== null ? `${metrics.cfCoverage.toFixed(2)}x` : '—'}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    &gt;1.2x = doskonale (gotówka &gt; zysk), &lt;0.8x = słabo (papierowy zysk)
                </p>
            </div>

            {/* Red Flags */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🚩 Sygnały ostrzegawcze</h3>

                {/* Receivables */}
                <div style={{
                    padding: '12px',
                    margin: '6px 0',
                    background: metrics.recFlag ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                    borderLeft: `3px solid ${metrics.recFlag ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                    borderRadius: '4px',
                }}>
                    {metrics.recFlag === true && (
                        <>
                            <div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>🔴 Należności rosną szybciej niż przychody</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                ({formatPercent(metrics.recGrowth)} vs {formatPercent(metrics.revGrowth)}) — Możliwa agresywna polityka kredytowa
                            </div>
                        </>
                    )}
                    {metrics.recFlag === false && <div style={{ color: 'var(--accent-green)' }}>✅ Należności pod kontrolą</div>}
                    {metrics.recFlag === null && <div style={{ color: 'var(--text-muted)' }}>❓ Brak danych o należnościach</div>}
                </div>

                {/* Inventory */}
                <div style={{
                    padding: '12px',
                    margin: '6px 0',
                    background: metrics.invFlag ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                    borderLeft: `3px solid ${metrics.invFlag ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                    borderRadius: '4px',
                }}>
                    {metrics.invFlag === true && (
                        <>
                            <div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>🔴 Zapasy rosną szybciej niż koszty sprzedaży</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                ({formatPercent(metrics.invGrowth)} vs {formatPercent(metrics.cogsGrowth)}) — Możliwa nadprodukcja
                            </div>
                        </>
                    )}
                    {metrics.invFlag === false && <div style={{ color: 'var(--accent-green)' }}>✅ Zapasy pod kontrolą</div>}
                    {metrics.invFlag === null && <div style={{ color: 'var(--text-muted)' }}>❓ Brak danych o zapasach</div>}
                </div>

                {/* SBC */}
                {metrics.sbcRatio !== null && (
                    <div style={{
                        padding: '12px',
                        margin: '6px 0',
                        background: metrics.sbcFlag ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                        borderLeft: `3px solid ${metrics.sbcFlag ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                        borderRadius: '4px',
                    }}>
                        {metrics.sbcFlag
                            ? <div style={{ color: 'var(--accent-red)' }}>🔴 Stock-Based Compensation = {formatPercent(metrics.sbcRatio)} zysku netto — Ukryty koszt</div>
                            : <div style={{ color: 'var(--accent-green)' }}>✅ SBC pod kontrolą ({formatPercent(metrics.sbcRatio)} zysku)</div>
                        }
                    </div>
                )}

                {/* ROA Volatility */}
                {metrics.roaVolatility !== null && metrics.roaVolatility > 0.05 && (
                    <div style={{
                        padding: '12px',
                        margin: '6px 0',
                        background: 'rgba(251,191,36,0.08)',
                        borderLeft: '3px solid var(--accent-amber)',
                        borderRadius: '4px',
                    }}>
                        <div style={{ color: 'var(--accent-amber)' }}>⚠️ Wysoka zmienność ROA ({(metrics.roaVolatility * 100).toFixed(1)} pp) — Niestabilne zyski</div>
                    </div>
                )}
            </div>

            {/* Cash Conversion Cycle */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>⏱️ Cykl konwersji gotówki (CCC)</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DSO</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 600 }}>{metrics.dso?.toFixed(0) ?? '—'} dni</div>
                    </div>
                    <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>+</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DIO</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 600 }}>{metrics.dio?.toFixed(0) ?? '—'} dni</div>
                    </div>
                    <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>−</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DPO</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 600 }}>{metrics.dpo?.toFixed(0) ?? '—'} dni</div>
                    </div>
                    <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>=</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CCC</div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '20px',
                            fontWeight: 600,
                            color: metrics.ccc !== null && metrics.ccc < 30 ? 'var(--accent-green)' : metrics.ccc !== null && metrics.ccc < 90 ? 'var(--accent-blue)' : 'var(--accent-amber)',
                        }}>
                            {metrics.ccc?.toFixed(0) ?? '—'} dni
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    &lt;30 dni = doskonale, 30-90 = dobrze, &gt;90 = wolno
                </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '📈 DuPont', path: '/valuation/dupont' },
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
