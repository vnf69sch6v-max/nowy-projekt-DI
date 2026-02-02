'use client';

// =============================================
// StochFin — Risk Matrix
// Unified view of all risk indicators across modules
// =============================================

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyData } from '@/contexts/CompanyDataContext';
import { GlassCard, FeatureIcon } from '@/components/ui/StochFinComponents';

// =============================================
// Types
// =============================================

type RiskStatus = 'ok' | 'warning' | 'danger' | 'nodata';

interface RiskResult {
    status: RiskStatus;
    value: string;
    detail: string;
}

interface RiskItem {
    id: string;
    name: string;
    check: () => RiskResult;
    link: string;
}

interface RiskCategory {
    label: string;
    icon: string;
    risks: RiskItem[];
}

// =============================================
// Helper Functions
// =============================================

function safeDivide(a: number | null | undefined, b: number | null | undefined): number | null {
    if (a === null || a === undefined || b === null || b === undefined || b === 0) return null;
    return a / b;
}

function formatPercent(value: number | null): string {
    if (value === null || isNaN(value)) return '—';
    return `${(value * 100).toFixed(1)}%`;
}

const statusColors: Record<RiskStatus, string> = {
    ok: '#10b981',       // green
    warning: '#f59e0b',  // amber
    danger: '#f43f5e',   // red
    nodata: '#64748b',   // muted
};

// =============================================
// Main Component
// =============================================

export default function RiskMatrixScreen() {
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

    // ===== RISK CATEGORIES =====
    const riskCategories = useMemo<Record<string, RiskCategory>>(() => ({
        solvency: {
            label: 'Wypłacalność',
            icon: '🏦',
            risks: [
                {
                    id: 'altman_z',
                    name: 'Altman Z-Score',
                    check: () => {
                        const z = state.healthResults?.altmanZ;
                        if (z === null || z === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (z > 2.99) return { status: 'ok', value: z.toFixed(2), detail: 'Bezpieczna strefa' };
                        if (z > 1.81) return { status: 'warning', value: z.toFixed(2), detail: 'Szara strefa' };
                        return { status: 'danger', value: z.toFixed(2), detail: 'Strefa zagrożenia' };
                    },
                    link: '/valuation/health',
                },
                {
                    id: 'debt_equity',
                    name: 'Dług / Equity',
                    check: () => {
                        const debt = state.balanceSheet?.[y0]?.totalDebt ?? state.balanceSheet?.[y0]?.longTermDebt;
                        const equity = state.balanceSheet?.[y0]?.totalEquity;
                        const ratio = safeDivide(debt, equity);
                        if (ratio === null) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (ratio < 0.5) return { status: 'ok', value: `${ratio.toFixed(2)}x`, detail: 'Niski dług' };
                        if (ratio < 1.5) return { status: 'warning', value: `${ratio.toFixed(2)}x`, detail: 'Umiarkowany dług' };
                        return { status: 'danger', value: `${ratio.toFixed(2)}x`, detail: 'Wysokie zadłużenie' };
                    },
                    link: '/valuation/health',
                },
                {
                    id: 'interest_coverage',
                    name: 'Pokrycie odsetek',
                    check: () => {
                        const ebit = state.incomeStatement?.[y0]?.ebit;
                        const interest = state.incomeStatement?.[y0]?.interestExpense;
                        const ratio = safeDivide(ebit, interest);
                        if (ratio === null) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (ratio > 5) return { status: 'ok', value: `${ratio.toFixed(1)}x`, detail: 'Komfortowe pokrycie' };
                        if (ratio > 2) return { status: 'warning', value: `${ratio.toFixed(1)}x`, detail: 'Ciasne pokrycie' };
                        return { status: 'danger', value: `${ratio.toFixed(1)}x`, detail: 'Ryzyko niewypłacalności' };
                    },
                    link: '/valuation/health',
                },
                {
                    id: 'current_ratio',
                    name: 'Current Ratio',
                    check: () => {
                        const cr = safeDivide(
                            state.balanceSheet?.[y0]?.currentAssets,
                            state.balanceSheet?.[y0]?.currentLiabilities
                        );
                        if (cr === null) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (cr > 1.5) return { status: 'ok', value: `${cr.toFixed(2)}x`, detail: 'Dobra płynność' };
                        if (cr > 1.0) return { status: 'warning', value: `${cr.toFixed(2)}x`, detail: 'Ciasna płynność' };
                        return { status: 'danger', value: `${cr.toFixed(2)}x`, detail: 'Ryzyko płynności' };
                    },
                    link: '/valuation/health',
                },
            ],
        },

        profitability: {
            label: 'Rentowność',
            icon: '📈',
            risks: [
                {
                    id: 'roic_wacc',
                    name: 'ROIC vs WACC Spread',
                    check: () => {
                        const spread = state.roicWaccResults?.spread;
                        if (spread === null || spread === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (spread > 5) return { status: 'ok', value: `+${spread.toFixed(1)}pp`, detail: 'Silne tworzenie wartości' };
                        if (spread > 0) return { status: 'warning', value: `+${spread.toFixed(1)}pp`, detail: 'Marginalne tworzenie' };
                        return { status: 'danger', value: `${spread.toFixed(1)}pp`, detail: 'NISZCZENIE wartości' };
                    },
                    link: '/valuation/roic-wacc',
                },
                {
                    id: 'margin_trend',
                    name: 'Trend marży EBITDA',
                    check: () => {
                        const m0 = safeDivide(state.incomeStatement?.[y0]?.ebitda, state.incomeStatement?.[y0]?.revenue);
                        const m1 = safeDivide(state.incomeStatement?.[y1]?.ebitda, state.incomeStatement?.[y1]?.revenue);
                        if (m0 === null || m1 === null) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        const change = m0 - m1;
                        if (change > 0.02) return { status: 'ok', value: `${(change * 100).toFixed(1)}pp ↑`, detail: 'Marża rośnie' };
                        if (change > -0.02) return { status: 'ok', value: `${(change * 100).toFixed(1)}pp →`, detail: 'Marża stabilna' };
                        return { status: 'warning', value: `${(change * 100).toFixed(1)}pp ↓`, detail: 'Marża spada' };
                    },
                    link: '/valuation/dupont',
                },
                {
                    id: 'piotroski',
                    name: 'Piotroski F-Score',
                    check: () => {
                        const f = state.healthResults?.piotroskiScore;
                        if (f === null || f === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (f >= 7) return { status: 'ok', value: `${f}/9`, detail: 'Silna kondycja' };
                        if (f >= 4) return { status: 'warning', value: `${f}/9`, detail: 'Przeciętna kondycja' };
                        return { status: 'danger', value: `${f}/9`, detail: 'Słaba kondycja' };
                    },
                    link: '/valuation/health',
                },
            ],
        },

        earningsQuality: {
            label: 'Jakość zysków',
            icon: '🔬',
            risks: [
                {
                    id: 'accrual_ratio',
                    name: 'Accrual Ratio (Sloan)',
                    check: () => {
                        const ar = state.earningsQualityResults?.accrualRatio;
                        if (ar === null || ar === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (ar < 0) return { status: 'ok', value: `${(ar * 100).toFixed(1)}%`, detail: 'Zyski oparte na gotówce' };
                        if (ar < 0.05) return { status: 'warning', value: `${(ar * 100).toFixed(1)}%`, detail: 'Lekko papierowe' };
                        return { status: 'danger', value: `${(ar * 100).toFixed(1)}%`, detail: "Mocno 'papierowe'" };
                    },
                    link: '/valuation/earnings-quality',
                },
                {
                    id: 'beneish',
                    name: 'Beneish M-Score',
                    check: () => {
                        // Beneish not in current HealthResults type - return nodata
                        return { status: 'nodata', value: '—', detail: 'Niedostępne w tej wersji' };
                    },
                    link: '/valuation/health',
                },
                {
                    id: 'cf_coverage',
                    name: 'OCF / Net Income',
                    check: () => {
                        const cov = state.earningsQualityResults?.cfCoverage;
                        if (cov === null || cov === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (cov >= 1.0) return { status: 'ok', value: `${cov.toFixed(2)}x`, detail: 'Zysk pokryty gotówką' };
                        if (cov >= 0.8) return { status: 'warning', value: `${cov.toFixed(2)}x`, detail: 'Częściowe pokrycie' };
                        return { status: 'danger', value: `${cov.toFixed(2)}x`, detail: 'Słabe pokrycie' };
                    },
                    link: '/valuation/earnings-quality',
                },
            ],
        },

        valuation: {
            label: 'Wycena',
            icon: '💰',
            risks: [
                {
                    id: 'margin_of_safety',
                    name: 'Margin of Safety',
                    check: () => {
                        // footballFieldResults not in context yet - return nodata
                        return { status: 'nodata', value: '—', detail: 'Uruchom Football Field' };
                    },
                    link: '/valuation/football-field',
                },
                {
                    id: 'implied_vs_hist',
                    name: 'Implied Growth vs Historia',
                    check: () => {
                        // reverseDCFResults not in context yet - return nodata
                        return { status: 'nodata', value: '—', detail: 'Uruchom Reverse DCF' };
                    },
                    link: '/valuation/reverse-dcf',
                },
            ],
        },

        governance: {
            label: 'Zarządzanie',
            icon: '👔',
            risks: [
                {
                    id: 'sbc_ratio',
                    name: 'SBC / Net Income',
                    check: () => {
                        // Calculate SBC ratio from cash flow data
                        const sbc = state.cashFlow?.[y0]?.stockCompensation;
                        const netIncome = state.incomeStatement?.[y0]?.netIncome;
                        const ratio = safeDivide(sbc, netIncome);
                        if (ratio === null) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        const absRatio = Math.abs(ratio);
                        if (absRatio < 0.10) return { status: 'ok', value: formatPercent(absRatio), detail: 'Niska SBC' };
                        if (absRatio < 0.20) return { status: 'warning', value: formatPercent(absRatio), detail: 'Umiarkowana SBC' };
                        return { status: 'danger', value: formatPercent(absRatio), detail: 'Wysoka SBC — rozwodnienie' };
                    },
                    link: '/valuation/earnings-quality',
                },
                {
                    id: 'leverage_dupont',
                    name: 'Dźwignia DuPont',
                    check: () => {
                        const lev = state.dupontResults?.byYear?.[y0]?.leverage;
                        if (lev === null || lev === undefined) return { status: 'nodata', value: '—', detail: 'Brak danych' };
                        if (lev < 2.5) return { status: 'ok', value: `${lev.toFixed(2)}x`, detail: 'Umiarkowana dźwignia' };
                        if (lev < 4.0) return { status: 'warning', value: `${lev.toFixed(2)}x`, detail: 'Wysoka dźwignia' };
                        return { status: 'danger', value: `${lev.toFixed(2)}x`, detail: 'Bardzo wysoka dźwignia' };
                    },
                    link: '/valuation/dupont',
                },
            ],
        },
    }), [state, y0, y1]);

    // Count stats
    const stats = useMemo(() => {
        let ok = 0, warn = 0, danger = 0, nodata = 0;

        for (const cat of Object.values(riskCategories)) {
            for (const risk of cat.risks) {
                const result = risk.check();
                if (result.status === 'ok') ok++;
                else if (result.status === 'warning') warn++;
                else if (result.status === 'danger') danger++;
                else nodata++;
            }
        }

        return { ok, warn, danger, nodata };
    }, [riskCategories]);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🚩 Risk Matrix — {state.companyName || 'Spółka'}
                </h1>
                <p style={{ color: 'var(--text-muted, #64748b)' }}>
                    Kompleksowa analiza ryzyka
                </p>
            </div>

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <StatCard icon="🟢" label="OK" value={stats.ok} color={statusColors.ok} />
                <StatCard icon="⚠️" label="Uwaga" value={stats.warn} color={statusColors.warning} />
                <StatCard icon="🔴" label="Ryzyko" value={stats.danger} color={statusColors.danger} />
                <StatCard icon="❓" label="Brak danych" value={stats.nodata} color={statusColors.nodata} />
            </div>

            {/* Risk Categories */}
            {Object.entries(riskCategories).map(([key, category]) => (
                <GlassCard
                    key={key}
                    style={{
                        marginBottom: '16px',
                        borderLeft: `3px solid ${getCategoryColor(category, riskCategories)}`,
                        borderRadius: '0 8px 8px 0',
                    }}
                >
                    <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {category.icon} {category.label}
                    </h3>

                    {category.risks.map((risk, idx) => {
                        const result = risk.check();
                        return (
                            <div
                                key={risk.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: idx < category.risks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                }}
                            >
                                {/* Status indicator */}
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: statusColors[result.status],
                                    marginRight: '12px',
                                    boxShadow: result.status === 'danger' ? `0 0 8px ${statusColors.danger}` : 'none',
                                }} />

                                {/* Name */}
                                <div style={{ flex: 1, fontSize: '14px' }}>
                                    {risk.name}
                                </div>

                                {/* Value */}
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: statusColors[result.status],
                                    minWidth: '80px',
                                    textAlign: 'right',
                                }}>
                                    {result.value}
                                </div>

                                {/* Detail */}
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-muted, #64748b)',
                                    minWidth: '180px',
                                    textAlign: 'right',
                                    marginLeft: '12px',
                                }}>
                                    {result.detail}
                                </div>

                                {/* Link */}
                                <button
                                    onClick={() => router.push(risk.link)}
                                    style={{
                                        marginLeft: '12px',
                                        padding: '4px 8px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        color: 'var(--text-muted, #64748b)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    →
                                </button>
                            </div>
                        );
                    })}
                </GlassCard>
            ))}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
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
                    📋 Investment Summary
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

// =============================================
// Helper Components
// =============================================

function StatCard({ icon, label, value, color }: {
    icon: string;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div style={{
            padding: '16px',
            background: 'var(--bg-card, #111827)',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${color}33`,
        }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
            <div style={{
                fontFamily: 'monospace',
                fontSize: '28px',
                fontWeight: 'bold',
                color,
            }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                {label}
            </div>
        </div>
    );
}

function getCategoryColor(category: RiskCategory, allCategories: Record<string, RiskCategory>): string {
    let worst: RiskStatus = 'ok';

    for (const risk of category.risks) {
        const result = risk.check();
        if (result.status === 'danger') return statusColors.danger;
        if (result.status === 'warning') worst = 'warning';
    }

    return statusColors[worst];
}
