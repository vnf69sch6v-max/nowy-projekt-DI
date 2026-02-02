'use client';

// =============================================
// StochFin — Sidebar Navigation Component
// =============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
    icon: string;
    label: string;
    href: string;
    badge?: string;
}

const navItems: NavItem[] = [
    { icon: '📡', label: 'Załaduj Dane', href: '/valuation/load' },
    { icon: '📊', label: 'Health Check', href: '/valuation/health' },
    { icon: '💰', label: 'Wycena DCF', href: '/valuation/dcf' },
    { icon: '📈', label: 'Porównawcza', href: '/valuation/comps' },
    { icon: '🎯', label: 'Peer Benchmark', href: '/valuation/benchmark' },
    { icon: '🔥', label: 'Wrażliwość', href: '/valuation/sensitivity' },
    { icon: '💎', label: 'Dywidendy', href: '/valuation/dividends' },
    { icon: '🏗️', label: 'Kapitał', href: '/valuation/capital' },
];

interface CompanyData {
    ticker: string;
    company_name: string;
    current_price: number;
    change_pct?: number;
    source?: string;
}

export function Sidebar() {
    const pathname = usePathname();
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            const data = JSON.parse(stored);
            setCompany({
                ticker: data.ticker,
                company_name: data.company_name,
                current_price: data.current_price || 0,
                change_pct: data.change_pct,
                source: data.source
            });
        }
    }, [pathname]);

    if (collapsed) {
        return (
            <div className="fixed left-0 top-0 h-screen w-16 bg-[#0A0E17] border-r border-white/5 flex flex-col items-center py-4 z-50">
                <button
                    onClick={() => setCollapsed(false)}
                    className="mb-6 text-gray-400 hover:text-white"
                >
                    ☰
                </button>

                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 text-lg transition-colors ${pathname === item.href
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-gray-500 hover:bg-white/5 hover:text-white'
                            }`}
                        title={item.label}
                    >
                        {item.icon}
                    </Link>
                ))}
            </div>
        );
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0A0E17] border-r border-white/5 flex flex-col z-50">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <span className="font-mono text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            StochFin
                        </span>
                    </Link>
                    <button
                        onClick={() => setCollapsed(true)}
                        className="text-gray-500 hover:text-white text-sm"
                    >
                        ←
                    </button>
                </div>
            </div>

            {/* Company Card */}
            {company && (
                <div className="px-4 py-4 border-b border-white/5">
                    <div className="bg-[#111827] rounded-lg p-4 border border-white/5">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <div className="font-mono font-bold text-lg">{company.ticker}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {company.company_name}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-[#0A0E17] px-2 py-1 rounded">
                                {company.source?.toUpperCase() || 'API'}
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-xl font-mono font-bold">
                                ${company.current_price?.toFixed(2) || '—'}
                            </div>
                            {company.change_pct !== undefined && (
                                <div className={`text-sm font-mono ${company.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {company.change_pct >= 0 ? '▲' : '▼'} {Math.abs(company.change_pct).toFixed(2)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Analiza
                </div>

                {navItems.map(item => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${isActive
                                ? 'bg-emerald-600/20 text-emerald-400 border-l-3 border-emerald-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            style={isActive ? { borderLeftWidth: '3px' } : {}}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                            {item.badge && (
                                <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 text-xs text-gray-600">
                <div className="text-center">v1.0 — Premium Fintech</div>
            </div>
        </aside>
    );
}

// Layout wrapper for pages using sidebar
export function SidebarLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#06090F]">
            <Sidebar />
            <div className="ml-64 flex-1 transition-all">
                {children}
            </div>
        </div>
    );
}
