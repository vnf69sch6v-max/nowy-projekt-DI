'use client';

// =============================================
// StochFin — Sidebar Navigation
// Bloomberg-style unified navigation (PROMPT 13)
// =============================================

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
    label: string;
    icon: string;
    path: string;
    badge?: 'new' | 'beta';
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const navigationSections: NavSection[] = [
    {
        title: 'PODSUMOWANIE',
        items: [
            { label: 'Investment Summary', icon: '📋', path: '/valuation/summary', badge: 'new' },
            { label: 'Football Field', icon: '⚽', path: '/valuation/football-field', badge: 'new' },
            { label: 'Risk Matrix', icon: '🚩', path: '/valuation/risk', badge: 'new' },
        ],
    },
    {
        title: 'DANE',
        items: [
            { label: 'Załaduj dane', icon: '📡', path: '/valuation/load' },
            { label: 'Manual Input', icon: '✏️', path: '/valuation/manual' },
        ],
    },
    {
        title: 'WYCENA',
        items: [
            { label: 'DCF Monte Carlo', icon: '💰', path: '/valuation/dcf' },
            { label: 'Reverse DCF', icon: '🔄', path: '/valuation/reverse-dcf', badge: 'new' },
            { label: 'Benchmark', icon: '📊', path: '/valuation/benchmark' },
            { label: 'Sensitivity', icon: '🌡️', path: '/valuation/sensitivity' },
        ],
    },
    {
        title: 'ANALIZA FUNDAMENTALNA',
        items: [
            { label: 'Health Check', icon: '🏥', path: '/valuation/health' },
            { label: 'ROIC vs WACC', icon: '🏆', path: '/valuation/roic-wacc' },
            { label: 'Earnings Quality', icon: '🔬', path: '/valuation/earnings-quality' },
            { label: 'DuPont 5-Factor', icon: '📈', path: '/valuation/dupont' },
            { label: 'Rule of 40', icon: '⚡', path: '/valuation/rule-of-40' },
        ],
    },
    {
        title: 'PROJEKCJE',
        items: [
            { label: 'Forecasting', icon: '🔮', path: '/valuation/forecast' },
            { label: 'Capital Allocation', icon: '💼', path: '/valuation/capital-allocation' },
        ],
    },
    {
        title: 'RAPORTY',
        items: [
            { label: 'Dywidendy', icon: '💵', path: '/valuation/dividends' },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            style={{
                width: collapsed ? '60px' : '240px',
                minHeight: '100vh',
                background: 'var(--bg-sidebar, #0a0a0a)',
                borderRight: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 50,
                overflowY: 'auto',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: collapsed ? '16px 8px' : '20px 16px',
                    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                }}
            >
                {!collapsed && (
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.025em' }}>
                            StochFin
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Financial Modeling
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted, #888)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px',
                    }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: collapsed ? '8px' : '16px' }}>
                {navigationSections.map((section, sectionIdx) => (
                    <div key={sectionIdx} style={{ marginBottom: '24px' }}>
                        {/* Section Title */}
                        {!collapsed && (
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: 'var(--text-muted, #666)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginBottom: '8px',
                                    paddingLeft: '8px',
                                }}
                            >
                                {section.title}
                            </div>
                        )}

                        {/* Section Items */}
                        {section.items.map((item, itemIdx) => {
                            const isActive = pathname === item.path;
                            return (
                                <button
                                    key={itemIdx}
                                    onClick={() => router.push(item.path)}
                                    title={collapsed ? item.label : undefined}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: collapsed ? '0' : '10px',
                                        padding: collapsed ? '10px' : '10px 12px',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        background: isActive ? 'var(--accent-blue, #3B82F6)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: isActive ? '#fff' : 'var(--text-secondary, #ccc)',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        marginBottom: '4px',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                    {!collapsed && (
                                        <>
                                            <span style={{ flex: 1 }}>{item.label}</span>
                                            {item.badge && (
                                                <span
                                                    style={{
                                                        fontSize: '9px',
                                                        padding: '2px 5px',
                                                        borderRadius: '4px',
                                                        background: item.badge === 'new' ? 'var(--accent-green, #10B981)' : 'var(--accent-amber, #F59E0B)',
                                                        color: '#fff',
                                                        textTransform: 'uppercase',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div
                    style={{
                        padding: '16px',
                        borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                        fontSize: '11px',
                        color: 'var(--text-muted, #666)',
                    }}
                >
                    <div>StochFin v4.0</div>
                    <div style={{ marginTop: '4px', opacity: 0.7 }}>Advanced Modules Enabled</div>
                </div>
            )}
        </div>
    );
}
