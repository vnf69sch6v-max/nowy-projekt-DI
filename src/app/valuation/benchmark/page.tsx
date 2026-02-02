'use client';

// =============================================
// StochFin — Comparable Analysis (Benchmark)
// Based on MASTER_PROMPTS v3 specification
// Peer group management + implied valuations
// =============================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCompanyData,
    getField,
    getLatestYear,
    safeDivide,
    formatNumber,
    formatMultiple
} from '@/contexts/CompanyDataContext';
import EmptyState from '@/components/ui/EmptyState';

// =============================================
// Types
// =============================================

interface Peer {
    id: string;
    name: string;
    ticker: string;
    revenue: number;
    ebitda: number;
    netIncome: number;
    marketCap: number;
    netDebt: number;
    ev: number;
    pe: number | null;
    evEbitda: number | null;
    evRevenue: number | null;
}

// =============================================
// Glass Card Component
// =============================================

function GlassCard({
    children,
    className = '',
    glowColor = 'cyan'
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
}) {
    const glowMap = {
        emerald: 'hover:shadow-emerald-500/20',
        cyan: 'hover:shadow-cyan-500/20',
        purple: 'hover:shadow-purple-500/20',
        amber: 'hover:shadow-amber-500/20'
    };

    return (
        <div className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-white/[0.08] to-white/[0.02]
            backdrop-blur-xl border border-white/[0.08]
            shadow-xl shadow-black/20 transition-all duration-300
            hover:border-white/20 hover:shadow-2xl ${glowMap[glowColor]}
            ${className}
        `}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// =============================================
// Median calculation helper
// =============================================

function median(arr: (number | null)[]): number | null {
    const sorted = arr.filter((x): x is number => x !== null).sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// =============================================
// Add Peer Modal
// =============================================

function AddPeerModal({
    isOpen,
    onClose,
    onAdd,
    initialTicker = ''
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (peer: Peer) => void;
    initialTicker?: string;
}) {
    const [name, setName] = useState('');
    const [ticker, setTicker] = useState(initialTicker);
    const [revenue, setRevenue] = useState('');
    const [ebitda, setEbitda] = useState('');
    const [netIncome, setNetIncome] = useState('');
    const [marketCap, setMarketCap] = useState('');
    const [netDebt, setNetDebt] = useState('');

    const handleSubmit = () => {
        const revVal = parseFloat(revenue) || 0;
        const ebitdaVal = parseFloat(ebitda) || 0;
        const netIncVal = parseFloat(netIncome) || 0;
        const mcVal = parseFloat(marketCap) || 0;
        const ndVal = parseFloat(netDebt) || 0;

        const ev = mcVal + ndVal;

        const peer: Peer = {
            id: Date.now().toString(),
            name: name || ticker.toUpperCase(),
            ticker: ticker.toUpperCase(),
            revenue: revVal * 1_000_000,
            ebitda: ebitdaVal * 1_000_000,
            netIncome: netIncVal * 1_000_000,
            marketCap: mcVal * 1_000_000,
            netDebt: ndVal * 1_000_000,
            ev: ev * 1_000_000,
            pe: safeDivide(mcVal, netIncVal),
            evEbitda: safeDivide(ev, ebitdaVal),
            evRevenue: safeDivide(ev, revVal)
        };

        onAdd(peer);
        onClose();

        // Reset form
        setName('');
        setTicker('');
        setRevenue('');
        setEbitda('');
        setNetIncome('');
        setMarketCap('');
        setNetDebt('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Dodaj spółkę porównawczą</h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">Nazwa</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Microsoft Corp."
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">Ticker</label>
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="MSFT"
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">Revenue (mln)</label>
                            <input
                                type="number"
                                value={revenue}
                                onChange={(e) => setRevenue(e.target.value)}
                                placeholder="245,122"
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">EBITDA (mln)</label>
                            <input
                                type="number"
                                value={ebitda}
                                onChange={(e) => setEbitda(e.target.value)}
                                placeholder="125,447"
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">Net Income (mln)</label>
                            <input
                                type="number"
                                value={netIncome}
                                onChange={(e) => setNetIncome(e.target.value)}
                                placeholder="72,361"
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">Market Cap (mln)</label>
                            <input
                                type="number"
                                value={marketCap}
                                onChange={(e) => setMarketCap(e.target.value)}
                                placeholder="3,100,000"
                                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase mb-1">Net Debt (mln)</label>
                        <input
                            type="number"
                            value={netDebt}
                            onChange={(e) => setNetDebt(e.target.value)}
                            placeholder="12,345"
                            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors font-medium"
                    >
                        Dodaj peera
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Football Field Chart
// =============================================

function FootballField({
    methods,
    marketPrice,
    currency
}: {
    methods: { name: string; value: number | null; color: string }[];
    marketPrice: number | null;
    currency: string;
}) {
    const validMethods = methods.filter(m => m.value !== null);
    if (validMethods.length === 0) return null;

    const values = validMethods.map(m => m.value!);
    const minVal = Math.min(...values) * 0.8;
    const maxVal = Math.max(...values) * 1.2;
    const range = maxVal - minVal;

    return (
        <div className="space-y-3">
            {validMethods.map((m, i) => {
                const pct = ((m.value! - minVal) / range) * 100;
                return (
                    <div key={m.name} className="flex items-center gap-4">
                        <div className="w-24 text-right text-sm text-gray-400">{m.name}</div>
                        <div className="flex-1 relative h-8 bg-white/5 rounded-lg">
                            {/* Bar */}
                            <div
                                className="absolute top-0 h-full rounded-lg"
                                style={{
                                    left: '0%',
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${m.color}40, ${m.color})`
                                }}
                            />
                            {/* Value label */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-white"
                                style={{ left: `${Math.min(pct, 90)}%`, paddingLeft: '8px' }}
                            >
                                {formatNumber(m.value, currency)}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Market price line */}
            {marketPrice !== null && marketPrice >= minVal && marketPrice <= maxVal && (
                <div className="flex items-center gap-4 mt-4">
                    <div className="w-24 text-right text-sm text-rose-400">Cena rynk.</div>
                    <div className="flex-1 relative h-2">
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-rose-500"
                            style={{ left: `${((marketPrice - minVal) / range) * 100}%` }}
                        />
                        <div
                            className="absolute -top-4 text-xs font-mono text-rose-400"
                            style={{ left: `${((marketPrice - minVal) / range) * 100}%`, transform: 'translateX(-50%)' }}
                        >
                            {formatNumber(marketPrice, currency)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// Main Component
// =============================================

export default function ComparablePage() {
    const router = useRouter();
    const { state } = useCompanyData();

    const y0 = getLatestYear(state);
    const currency = state.currency || 'PLN';
    const companyName = state.companyName || 'Brak danych';
    const ticker = state.ticker || '';

    const [peers, setPeers] = useState<Peer[]>([]);
    const [tickerInput, setTickerInput] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Guard: if no data loaded
    if (!state.dataLoaded || !y0) {
        return (
            <div className="min-h-screen bg-[#030712] text-white">
                <EmptyState
                    message="Brak załadowanych danych"
                    description="Załaduj dane spółki aby przeprowadzić analizę porównawczą"
                    ctaText="📡 Załaduj dane"
                    onCta={() => router.push('/valuation/load')}
                    icon="📈"
                />
            </div>
        );
    }

    // Target company data
    const targetRevenue = getField(state, 'incomeStatement', y0, 'revenue');
    const targetEbitda = getField(state, 'incomeStatement', y0, 'ebitda');
    const targetNetIncome = getField(state, 'incomeStatement', y0, 'netIncome');
    const totalDebt = getField(state, 'balanceSheet', y0, 'totalDebt')
        || getField(state, 'balanceSheet', y0, 'longTermDebt') || 0;
    const cash = getField(state, 'balanceSheet', y0, 'cash') || 0;
    const targetNetDebt = totalDebt - cash;
    const targetShares = state.market.sharesOutstanding
        || getField(state, 'balanceSheet', y0, 'sharesOutstanding');

    // Peer group medians
    const medPE = median(peers.map(p => p.pe));
    const medEvEbitda = median(peers.map(p => p.evEbitda));
    const medEvRevenue = median(peers.map(p => p.evRevenue));

    // Implied values
    const impliedFromPE = (medPE !== null && targetNetIncome !== null && targetShares !== null)
        ? (medPE * targetNetIncome) / targetShares
        : null;

    const impliedFromEvEbitda = (medEvEbitda !== null && targetEbitda !== null && targetShares !== null)
        ? ((medEvEbitda * targetEbitda) - targetNetDebt) / targetShares
        : null;

    const impliedFromEvRev = (medEvRevenue !== null && targetRevenue !== null && targetShares !== null)
        ? ((medEvRevenue * targetRevenue) - targetNetDebt) / targetShares
        : null;

    const handleAddPeer = (peer: Peer) => {
        setPeers(prev => [...prev, peer]);
    };

    const handleRemovePeer = (id: string) => {
        setPeers(prev => prev.filter(p => p.id !== id));
    };

    const handleOpenModal = () => {
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="text-gray-500 hover:text-white text-sm mb-2 transition-colors"
                    >
                        ← Powrót do DCF
                    </button>
                    <h1 className="text-2xl font-mono font-bold">
                        Wycena Porównawcza — {companyName}
                    </h1>
                    <div className="text-sm text-gray-500 mt-1">
                        {ticker && `${ticker} • `}{currency}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 py-8">
                <div className="grid grid-cols-2 gap-6">
                    {/* Left: Peer Group */}
                    <GlassCard className="p-6" glowColor="cyan">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">👥</span>
                                <div>
                                    <div className="font-semibold">Peer Group</div>
                                    <div className="text-xs text-gray-500">{peers.length} spółek</div>
                                </div>
                            </div>
                        </div>

                        {/* Add peer input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={tickerInput}
                                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                                placeholder="Wpisz ticker peera..."
                                className="flex-1 px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500"
                            />
                            <button
                                onClick={handleOpenModal}
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors font-medium"
                            >
                                + Dodaj
                            </button>
                        </div>

                        {/* Peers table */}
                        {peers.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                Dodaj spółki porównawcze aby zobaczyć mnożniki
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-2 text-gray-500 font-normal">Spółka</th>
                                            <th className="text-right py-2 text-gray-500 font-normal">P/E</th>
                                            <th className="text-right py-2 text-gray-500 font-normal">EV/EBITDA</th>
                                            <th className="text-right py-2 text-gray-500 font-normal">EV/Revenue</th>
                                            <th className="w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {peers.map(peer => (
                                            <tr key={peer.id} className="border-b border-white/5">
                                                <td className="py-2">
                                                    <div className="font-medium">{peer.ticker}</div>
                                                    <div className="text-xs text-gray-500">{peer.name}</div>
                                                </td>
                                                <td className="text-right py-2 font-mono">
                                                    {peer.pe !== null ? formatMultiple(peer.pe) : '—'}
                                                </td>
                                                <td className="text-right py-2 font-mono">
                                                    {peer.evEbitda !== null ? formatMultiple(peer.evEbitda) : '—'}
                                                </td>
                                                <td className="text-right py-2 font-mono">
                                                    {peer.evRevenue !== null ? formatMultiple(peer.evRevenue) : '—'}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => handleRemovePeer(peer.id)}
                                                        className="text-gray-500 hover:text-rose-400 transition-colors"
                                                    >
                                                        ✗
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Median row */}
                                        <tr className="bg-white/5 font-semibold">
                                            <td className="py-2 text-cyan-400">MEDIANA</td>
                                            <td className="text-right py-2 font-mono text-cyan-400">
                                                {medPE !== null ? formatMultiple(medPE) : '—'}
                                            </td>
                                            <td className="text-right py-2 font-mono text-cyan-400">
                                                {medEvEbitda !== null ? formatMultiple(medEvEbitda) : '—'}
                                            </td>
                                            <td className="text-right py-2 font-mono text-cyan-400">
                                                {medEvRevenue !== null ? formatMultiple(medEvRevenue) : '—'}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </GlassCard>

                    {/* Right: Results */}
                    <div className="space-y-6">
                        {/* Implied Values */}
                        <GlassCard className="p-6" glowColor="emerald">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">💎</span>
                                <div className="font-semibold">Wartość implikowana {companyName}</div>
                            </div>

                            {peers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Dodaj peery aby zobaczyć wycenę
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 text-center">
                                        <div className="text-xs text-gray-500 uppercase mb-1">z P/E</div>
                                        <div className="text-xl font-mono font-bold text-white">
                                            {impliedFromPE !== null ? formatNumber(impliedFromPE, currency) : '—'}
                                        </div>
                                        <div className="text-xs text-gray-500">/ akcję</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 text-center">
                                        <div className="text-xs text-gray-500 uppercase mb-1">z EV/EBITDA</div>
                                        <div className="text-xl font-mono font-bold text-white">
                                            {impliedFromEvEbitda !== null ? formatNumber(impliedFromEvEbitda, currency) : '—'}
                                        </div>
                                        <div className="text-xs text-gray-500">/ akcję</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 text-center">
                                        <div className="text-xs text-gray-500 uppercase mb-1">z EV/Revenue</div>
                                        <div className="text-xl font-mono font-bold text-white">
                                            {impliedFromEvRev !== null ? formatNumber(impliedFromEvRev, currency) : '—'}
                                        </div>
                                        <div className="text-xs text-gray-500">/ akcję</div>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* Football Field */}
                        <GlassCard className="p-6" glowColor="purple">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">📊</span>
                                <div className="font-semibold">Football Field</div>
                            </div>

                            {peers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Dodaj peery i uzupełnij dane aby zobaczyć Football Field
                                </div>
                            ) : (
                                <FootballField
                                    methods={[
                                        { name: 'P/E', value: impliedFromPE, color: '#10B981' },
                                        { name: 'EV/EBITDA', value: impliedFromEvEbitda, color: '#06B6D4' },
                                        { name: 'EV/Revenue', value: impliedFromEvRev, color: '#8B5CF6' }
                                    ]}
                                    marketPrice={state.market.currentPrice}
                                    currency={currency}
                                />
                            )}
                        </GlassCard>

                        {/* Navigation */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => router.push('/valuation/sensitivity')}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                            >
                                <div className="text-2xl mb-1">🔥</div>
                                <div className="font-medium">Analiza Wrażliwości</div>
                            </button>
                            <button
                                onClick={() => router.push('/valuation/dcf')}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center"
                            >
                                <div className="text-2xl mb-1">💰</div>
                                <div className="font-medium">Powrót do DCF</div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Peer Modal */}
            <AddPeerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onAdd={handleAddPeer}
                initialTicker={tickerInput}
            />
        </div>
    );
}
