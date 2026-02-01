'use client';

// =============================================
// StochFin - Comparables (Peer Analysis)
// =============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { CompanyFinancials } from '@/types/valuation';

// =============================================
// Types
// =============================================

interface PeerCompany {
    ticker: string;
    name: string;
    source: 'api' | 'manual';
    revenue: number | null;
    ebitda: number | null;
    market_cap: number | null;
    pe_ratio: number | null;
    ev_ebitda: number | null;
    ev_revenue: number | null;
    included: boolean;
}

interface FootballFieldBar {
    method: string;
    low: number;
    median: number;
    high: number;
    color: string;
}

// =============================================
// Default Peer Lists by Sector
// =============================================

const SECTOR_PEERS: Record<string, string[]> = {
    'Technology': ['MSFT', 'GOOGL', 'META', 'NVDA', 'ORCL'],
    'Consumer Cyclical': ['AMZN', 'TSLA', 'NKE', 'SBUX', 'TGT'],
    'Financial Services': ['JPM', 'BAC', 'GS', 'MS', 'BLK'],
    'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK'],
    'Communication Services': ['DIS', 'NFLX', 'CMCSA', 'T', 'VZ'],
    'default': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
};

// =============================================
// Comparables Page
// =============================================

export default function ComparablesPage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyFinancials | null>(null);
    const [peers, setPeers] = useState<PeerCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingPeers, setFetchingPeers] = useState(false);
    const [newPeerTicker, setNewPeerTicker] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('stochfin_company_data');
        if (stored) {
            setData(JSON.parse(stored));
        }

        // Load cached peers
        const cachedPeers = localStorage.getItem('stochfin_peers');
        if (cachedPeers) {
            setPeers(JSON.parse(cachedPeers));
        }

        setLoading(false);
    }, []);

    // Fetch peer data from API
    const fetchPeer = async (ticker: string): Promise<PeerCompany | null> => {
        try {
            const res = await fetch('/api/financials/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, source: 'fmp' })
            });

            const json = await res.json();

            if (!res.ok || !json.data) return null;

            const d = json.data;
            const income = d.statements?.income_statement?.data;
            const latestYear = d.statements?.income_statement?.periods?.[0];

            return {
                ticker: d.ticker,
                name: d.company_name,
                source: 'api',
                revenue: income?.revenue?.[latestYear] || null,
                ebitda: income?.ebitda?.[latestYear] || null,
                market_cap: d.market_cap,
                pe_ratio: d.metrics?.pe_ratio || null,
                ev_ebitda: d.metrics?.ev_to_ebitda || null,
                ev_revenue: d.metrics?.ev_to_revenue || null,
                included: true
            };
        } catch {
            return null;
        }
    };

    // Auto-fetch suggested peers
    const autoFetchPeers = async () => {
        if (!data) return;

        setFetchingPeers(true);

        const suggestedTickers = SECTOR_PEERS[data.sector] || SECTOR_PEERS['default'];
        const filtered = suggestedTickers.filter(t => t !== data.ticker);

        const fetched: PeerCompany[] = [];
        for (const ticker of filtered.slice(0, 5)) {
            const peer = await fetchPeer(ticker);
            if (peer) {
                fetched.push(peer);
            }
        }

        setPeers(fetched);
        localStorage.setItem('stochfin_peers', JSON.stringify(fetched));
        setFetchingPeers(false);
    };

    // Add single peer
    const addPeer = async () => {
        if (!newPeerTicker.trim()) return;

        setFetchingPeers(true);
        const peer = await fetchPeer(newPeerTicker.trim().toUpperCase());

        if (peer) {
            const updated = [...peers, peer];
            setPeers(updated);
            localStorage.setItem('stochfin_peers', JSON.stringify(updated));
        }

        setNewPeerTicker('');
        setFetchingPeers(false);
    };

    // Toggle peer inclusion
    const togglePeer = (ticker: string) => {
        const updated = peers.map(p =>
            p.ticker === ticker ? { ...p, included: !p.included } : p
        );
        setPeers(updated);
        localStorage.setItem('stochfin_peers', JSON.stringify(updated));
    };

    // Calculate medians
    const includedPeers = peers.filter(p => p.included);
    const calcMedian = (arr: number[]) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const medianPE = calcMedian(includedPeers.map(p => p.pe_ratio).filter(Boolean) as number[]);
    const medianEVEBITDA = calcMedian(includedPeers.map(p => p.ev_ebitda).filter(Boolean) as number[]);
    const medianEVRev = calcMedian(includedPeers.map(p => p.ev_revenue).filter(Boolean) as number[]);

    // Calculate implied values
    const latestYear = data?.statements?.income_statement?.periods?.[0];
    const targetEPS = data?.statements?.income_statement?.data?.eps?.[latestYear || ''] ||
        ((data?.statements?.income_statement?.data?.net_income?.[latestYear || ''] || 0) / (data?.shares_outstanding || 1));
    const targetEBITDA = data?.statements?.income_statement?.data?.ebitda?.[latestYear || ''] || 0;
    const targetRevenue = data?.statements?.income_statement?.data?.revenue?.[latestYear || ''] || 0;

    const impliedFromPE = targetEPS * medianPE;
    const impliedFromEVEBITDA = (targetEBITDA * medianEVEBITDA) / (data?.shares_outstanding || 1);
    const impliedFromEVRev = (targetRevenue * medianEVRev) / (data?.shares_outstanding || 1);

    // Football field data
    const footballField: FootballFieldBar[] = [
        {
            method: 'P/E Multiple',
            low: impliedFromPE * 0.75,
            median: impliedFromPE,
            high: impliedFromPE * 1.25,
            color: '#8B5CF6'
        },
        {
            method: 'EV/EBITDA',
            low: impliedFromEVEBITDA * 0.75,
            median: impliedFromEVEBITDA,
            high: impliedFromEVEBITDA * 1.25,
            color: '#06B6D4'
        },
        {
            method: 'EV/Revenue',
            low: impliedFromEVRev * 0.75,
            median: impliedFromEVRev,
            high: impliedFromEVRev * 1.25,
            color: '#10B981'
        }
    ];

    const maxValue = Math.max(...footballField.map(f => f.high), data?.current_price || 0) * 1.1;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Ładowanie...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#06090F] flex flex-col items-center justify-center gap-4 text-white">
                <p className="text-gray-400">Brak załadowanych danych</p>
                <button onClick={() => router.push('/valuation/load')} className="bg-cyan-600 px-6 py-2 rounded-lg text-sm">
                    Załaduj dane
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0A0E17]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button onClick={() => router.push('/valuation/dcf')} className="text-gray-500 hover:text-white text-sm mb-2">
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-bold font-mono">
                        Wycena Porównawcza
                        <span className="text-gray-400 ml-3">({data.ticker})</span>
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                <div className="grid grid-cols-12 gap-8">
                    {/* Left Column - Peer Table */}
                    <div className="col-span-7">
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Peer Group</h2>
                                <button
                                    onClick={autoFetchPeers}
                                    disabled={fetchingPeers}
                                    className="text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-1.5 rounded"
                                >
                                    {fetchingPeers ? '⟳' : '🔍'} Sugerowane peers ({data.sector})
                                </button>
                            </div>

                            {/* Peer Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                                            <th className="text-left py-3">Spółka</th>
                                            <th className="text-right py-3">P/E</th>
                                            <th className="text-right py-3">EV/EBITDA</th>
                                            <th className="text-right py-3">EV/Rev</th>
                                            <th className="text-center py-3">✓</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {peers.map(peer => (
                                            <tr key={peer.ticker} className={`border-b border-white/5 ${!peer.included ? 'opacity-40' : ''}`}>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{peer.ticker}</span>
                                                        <SourceBadge type={peer.source} compact />
                                                    </div>
                                                    <div className="text-xs text-gray-500">{peer.name}</div>
                                                </td>
                                                <td className="text-right py-3">{peer.pe_ratio?.toFixed(1) || '—'}x</td>
                                                <td className="text-right py-3">{peer.ev_ebitda?.toFixed(1) || '—'}x</td>
                                                <td className="text-right py-3">{peer.ev_revenue?.toFixed(1) || '—'}x</td>
                                                <td className="text-center py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={peer.included}
                                                        onChange={() => togglePeer(peer.ticker)}
                                                        className="w-4 h-4 accent-cyan-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Add Peer Row */}
                                        <tr>
                                            <td colSpan={5} className="py-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newPeerTicker}
                                                        onChange={e => setNewPeerTicker(e.target.value)}
                                                        placeholder="Dodaj ticker..."
                                                        className="flex-1 bg-[#0A0E17] border border-white/10 rounded px-3 py-1.5 text-sm"
                                                    />
                                                    <button
                                                        onClick={addPeer}
                                                        disabled={fetchingPeers}
                                                        className="bg-[#0A0E17] hover:bg-[#1F2937] px-3 py-1.5 rounded text-sm"
                                                    >
                                                        + Dodaj
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Median Summary */}
                            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Mediana P/E</div>
                                    <div className="text-xl font-mono font-bold text-violet-400">{medianPE.toFixed(1)}x</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Mediana EV/EBITDA</div>
                                    <div className="text-xl font-mono font-bold text-cyan-400">{medianEVEBITDA.toFixed(1)}x</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Mediana EV/Rev</div>
                                    <div className="text-xl font-mono font-bold text-emerald-400">{medianEVRev.toFixed(1)}x</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Football Field */}
                    <div className="col-span-5">
                        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-6">Football Field</h2>

                            <div className="space-y-4">
                                {footballField.map(bar => (
                                    <div key={bar.method}>
                                        <div className="text-xs text-gray-500 mb-1">{bar.method}</div>
                                        <div className="relative h-8 bg-[#0A0E17] rounded">
                                            {/* Range bar */}
                                            <div
                                                className="absolute h-full rounded opacity-30"
                                                style={{
                                                    left: `${(bar.low / maxValue) * 100}%`,
                                                    width: `${((bar.high - bar.low) / maxValue) * 100}%`,
                                                    background: bar.color
                                                }}
                                            />
                                            {/* Median marker */}
                                            <div
                                                className="absolute h-full w-1 rounded"
                                                style={{
                                                    left: `${(bar.median / maxValue) * 100}%`,
                                                    background: bar.color
                                                }}
                                            />
                                            {/* Value label */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 text-xs font-mono"
                                                style={{
                                                    left: `${(bar.median / maxValue) * 100 + 2}%`,
                                                    color: bar.color
                                                }}
                                            >
                                                ${bar.median.toFixed(0)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Market price line */}
                                {data.current_price && (
                                    <div className="relative h-8 mt-4">
                                        <div className="text-xs text-gray-500 mb-1">Cena rynkowa</div>
                                        <div className="relative h-8 bg-[#0A0E17] rounded">
                                            <div
                                                className="absolute h-full w-0.5 bg-rose-500"
                                                style={{ left: `${(data.current_price / maxValue) * 100}%` }}
                                            />
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 text-xs font-mono text-rose-400"
                                                style={{ left: `${(data.current_price / maxValue) * 100 + 2}%` }}
                                            >
                                                ${data.current_price.toFixed(0)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Implied Values */}
                            <div className="mt-8 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-semibold mb-3">Wartość implikowana</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">z P/E:</span>
                                        <span className="font-mono text-violet-400">${impliedFromPE.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">z EV/EBITDA:</span>
                                        <span className="font-mono text-cyan-400">${impliedFromEVEBITDA.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">z EV/Revenue:</span>
                                        <span className="font-mono text-emerald-400">${impliedFromEVRev.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={() => router.push('/valuation/sensitivity')}
                                className="w-full bg-[#111827] hover:bg-[#1F2937] border border-white/5 py-3 px-4 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                                <span className="text-xl">🔥</span>
                                <div>
                                    <div className="font-medium">Analiza Wrażliwości</div>
                                    <div className="text-xs text-gray-500">Heatmap WACC / Terminal</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
