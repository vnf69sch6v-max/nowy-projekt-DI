'use client';

// =============================================
// StochFin — Forecasting Engine
// 3-Scenario Projections (PROMPT 10)
// =============================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    formatNumber,
    formatPercent,
    arrMedian,
    arrPercentile,
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Types
// =============================================

interface Scenario {
    label: string;
    color: string;
    revGrowth: number;
    ebitdaMargin: number;
    netMargin: number;
    capexRatio: number;
}

interface Projection {
    year: string;
    revenue: number;
    ebitda: number;
    netIncome: number;
    capex: number;
    fcf: number;
}

// =============================================
// Component
// =============================================

export default function ForecastScreen() {
    const { state } = useCompanyData();
    const router = useRouter();

    const years = state.availableYears;
    const y0 = getLatestYear(state);
    const currency = state.currency;
    const projectionYears = 5;

    // Auto-calibrate from historical data
    const autoScenarios = useMemo(() => {
        if (!y0) return null;

        // Historical revenue growth
        const histGrowths: number[] = [];
        for (let i = 0; i < years.length - 1; i++) {
            const curr = getField(state, 'incomeStatement', years[i], 'revenue');
            const prev = getField(state, 'incomeStatement', years[i + 1], 'revenue');
            if (curr !== null && prev !== null && prev !== 0) {
                histGrowths.push((curr - prev) / Math.abs(prev));
            }
        }

        // Historical EBITDA margin
        const histEbitdaMargins: number[] = [];
        years.forEach(y => {
            const ebitda = getField(state, 'incomeStatement', y, 'ebitda');
            const rev = getField(state, 'incomeStatement', y, 'revenue');
            if (ebitda !== null && rev !== null && rev > 0) histEbitdaMargins.push(ebitda / rev);
        });

        // Historical Net margin
        const histNetMargins: number[] = [];
        years.forEach(y => {
            const ni = getField(state, 'incomeStatement', y, 'netIncome');
            const rev = getField(state, 'incomeStatement', y, 'revenue');
            if (ni !== null && rev !== null && rev > 0) histNetMargins.push(ni / rev);
        });

        // Historical CAPEX ratio
        const histCapexRatios: number[] = [];
        years.forEach(y => {
            const capex = getField(state, 'cashFlow', y, 'capex');
            const rev = getField(state, 'incomeStatement', y, 'revenue');
            if (capex !== null && rev !== null && rev > 0) histCapexRatios.push(Math.abs(capex) / rev);
        });

        return {
            bear: {
                label: '🐻 Pesymistyczny',
                color: 'var(--accent-red)',
                revGrowth: arrPercentile(histGrowths, 25) || 0.02,
                ebitdaMargin: arrPercentile(histEbitdaMargins, 25) || 0.15,
                netMargin: arrPercentile(histNetMargins, 25) || 0.05,
                capexRatio: arrPercentile(histCapexRatios, 75) || 0.05,
            },
            base: {
                label: '📊 Bazowy',
                color: 'var(--accent-blue)',
                revGrowth: arrMedian(histGrowths) || 0.05,
                ebitdaMargin: arrMedian(histEbitdaMargins) || 0.20,
                netMargin: arrMedian(histNetMargins) || 0.08,
                capexRatio: arrMedian(histCapexRatios) || 0.04,
            },
            bull: {
                label: '🐂 Optymistyczny',
                color: 'var(--accent-green)',
                revGrowth: arrPercentile(histGrowths, 75) || 0.10,
                ebitdaMargin: arrPercentile(histEbitdaMargins, 75) || 0.25,
                netMargin: arrPercentile(histNetMargins, 75) || 0.12,
                capexRatio: arrPercentile(histCapexRatios, 25) || 0.03,
            },
        };
    }, [state, years, y0]);

    const [scenarios, setScenarios] = useState<Record<string, Scenario>>(() => autoScenarios || {
        bear: { label: '🐻 Pesymistyczny', color: 'var(--accent-red)', revGrowth: 0.02, ebitdaMargin: 0.15, netMargin: 0.05, capexRatio: 0.05 },
        base: { label: '📊 Bazowy', color: 'var(--accent-blue)', revGrowth: 0.05, ebitdaMargin: 0.20, netMargin: 0.08, capexRatio: 0.04 },
        bull: { label: '🐂 Optymistyczny', color: 'var(--accent-green)', revGrowth: 0.10, ebitdaMargin: 0.25, netMargin: 0.12, capexRatio: 0.03 },
    });
    const [activeTab, setActiveTab] = useState<'bear' | 'base' | 'bull'>('base');

    // Project scenarios
    const projections = useMemo(() => {
        const result: Record<string, Projection[]> = {};
        const baseRevenue = y0 ? getField(state, 'incomeStatement', y0, 'revenue') : null;
        if (!baseRevenue) return {};

        (['bear', 'base', 'bull'] as const).forEach(key => {
            const scenario = scenarios[key];
            if (!scenario) return;
            const projs: Projection[] = [];
            let revenue = baseRevenue;

            for (let t = 1; t <= projectionYears; t++) {
                const year = String(parseInt(y0!) + t);
                revenue *= (1 + scenario.revGrowth);
                const ebitda = revenue * scenario.ebitdaMargin;
                const netIncome = revenue * scenario.netMargin;
                const capex = revenue * scenario.capexRatio;
                const fcf = ebitda - capex;
                projs.push({ year, revenue, ebitda, netIncome, capex, fcf });
            }
            result[key] = projs;
        });

        return result;
    }, [scenarios, state, y0, projectionYears]);

    // Guard
    if (!state.dataLoaded || !y0 || !autoScenarios) {
        return (
            <EmptyState
                message="Brak załadowanych danych"
                description="Załaduj dane spółki aby wygenerować prognozy"
                ctaText="📡 Załaduj dane"
                onCta={() => router.push('/valuation/load')}
            />
        );
    }

    const baseRevenue = getField(state, 'incomeStatement', y0, 'revenue');

    const updateScenario = (key: string, field: keyof Scenario, value: number) => {
        setScenarios(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value },
        }));
    };

    const resetScenario = (key: string) => {
        const defaultScenarios = autoScenarios as Record<string, Scenario>;
        if (defaultScenarios[key]) {
            setScenarios(prev => ({ ...prev, [key]: defaultScenarios[key] }));
        }
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
                    Prognoza finansowa — {state.companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Projekcje 3 scenariuszy na {projectionYears} lat
                </p>
            </div>

            {/* Assumption Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
            }}>
                {(['bear', 'base', 'bull'] as const).map(key => {
                    const scenario = scenarios[key];
                    if (!scenario) return null;
                    return (
                        <div key={key} style={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            padding: '20px',
                            borderTop: `4px solid ${scenario.color}`,
                        }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {scenario.label}
                                <button
                                    onClick={() => resetScenario(key)}
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    🔮 Reset
                                </button>
                            </h4>
                            {[
                                { field: 'revGrowth', label: 'Wzrost przychodów r/r' },
                                { field: 'ebitdaMargin', label: 'Marża EBITDA' },
                                { field: 'netMargin', label: 'Marża netto' },
                                { field: 'capexRatio', label: 'CAPEX / Revenue' },
                            ].map(({ field, label }) => (
                                <div key={field} style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        {label}: {((scenario[field as keyof Scenario] as number) * 100).toFixed(1)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="-0.2"
                                        max="0.5"
                                        step="0.01"
                                        value={scenario[field as keyof Scenario] as number}
                                        onChange={e => updateScenario(key, field as keyof Scenario, parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ))}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Kalibracja z danych historycznych ({years.length} lat)
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Projection Table */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                overflowX: 'auto',
            }}>
                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {(['bear', 'base', 'bull'] as const).map(key => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '8px 16px',
                                background: activeTab === key ? scenarios[key]?.color || 'var(--accent-blue)' : 'var(--bg-elevated)',
                                border: 'none',
                                borderRadius: '6px',
                                color: activeTab === key ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            {scenarios[key]?.label}
                        </button>
                    ))}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Metryka</th>
                            <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>FY{y0} (hist.)</th>
                            {projections[activeTab]?.map(p => (
                                <th key={p.year} style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: scenarios[activeTab]?.color }}>
                                    FY{p.year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { key: 'revenue', label: 'Revenue', hist: baseRevenue },
                            { key: 'ebitda', label: 'EBITDA', hist: getField(state, 'incomeStatement', y0, 'ebitda') },
                            { key: 'netIncome', label: 'Net Income', hist: getField(state, 'incomeStatement', y0, 'netIncome') },
                            { key: 'capex', label: 'CAPEX', hist: getField(state, 'cashFlow', y0, 'capex') },
                            { key: 'fcf', label: 'FCF', hist: getField(state, 'cashFlow', y0, 'freeCashFlow') },
                        ].map(row => (
                            <tr key={row.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '8px' }}>{row.label}</td>
                                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600, fontFamily: 'monospace' }}>
                                    {formatNumber(row.hist, currency)}
                                </td>
                                {projections[activeTab]?.map(p => (
                                    <td key={p.year} style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', color: scenarios[activeTab]?.color }}>
                                        {formatNumber(p[row.key as keyof Projection] as number, currency)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Fan Chart Visualization */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Revenue Fan Chart</h3>
                <div style={{ position: 'relative', height: '200px' }}>
                    {/* Simple visualization */}
                    <svg width="100%" height="200" viewBox="0 0 600 200">
                        {/* Background*/}
                        <rect x="0" y="0" width="600" height="200" fill="transparent" />

                        {/* Lines */}
                        {(['bear', 'base', 'bull'] as const).map(key => {
                            const projs = projections[key];
                            if (!projs || !baseRevenue) return null;
                            const maxRev = Math.max(baseRevenue, ...projs.map(p => p.revenue)) * 1.1;
                            const points = [
                                { x: 50, y: 180 - (baseRevenue / maxRev) * 160 },
                                ...projs.map((p, i) => ({
                                    x: 50 + ((i + 1) / projectionYears) * 500,
                                    y: 180 - (p.revenue / maxRev) * 160,
                                }))
                            ];
                            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                            return (
                                <path
                                    key={key}
                                    d={pathD}
                                    fill="none"
                                    stroke={scenarios[key]?.color}
                                    strokeWidth={key === 'base' ? 3 : 2}
                                    strokeDasharray={key === 'base' ? undefined : '5,5'}
                                    opacity={key === 'base' ? 1 : 0.7}
                                />
                            );
                        })}

                        {/* Y Axis labels */}
                        <text x="10" y="25" fontSize="10" fill="var(--text-muted)">Revenue</text>
                        <text x="50" y="195" fontSize="10" fill="var(--text-muted)">{y0}</text>
                        {projections.base?.map((p, i) => (
                            <text key={i} x={50 + ((i + 1) / projectionYears) * 500} y="195" fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                                {p.year}
                            </text>
                        ))}
                    </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                    {(['bear', 'base', 'bull'] as const).map(key => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <div style={{ width: '16px', height: '2px', background: scenarios[key]?.color }} />
                            {scenarios[key]?.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📋 Podsumowanie prognoz (rok {parseInt(y0!) + projectionYears})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {(['bear', 'base', 'bull'] as const).map(key => {
                        const lastProj = projections[key]?.[projectionYears - 1];
                        if (!lastProj) return null;
                        return (
                            <div key={key} style={{
                                background: 'var(--bg-elevated)',
                                borderRadius: '8px',
                                padding: '16px',
                                borderLeft: `4px solid ${scenarios[key]?.color}`,
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{scenarios[key]?.label}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                                    Rev: {formatNumber(lastProj.revenue, currency)}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    FCF: {formatNumber(lastProj.fcf, currency)}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    CAGR: {formatPercent(scenarios[key]?.revGrowth)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {[
                    { label: '💰 DCF', path: '/valuation/dcf' },
                    { label: '🏆 ROIC vs WACC', path: '/valuation/roic-wacc' },
                    { label: '📊 Health Check', path: '/valuation/health' },
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
