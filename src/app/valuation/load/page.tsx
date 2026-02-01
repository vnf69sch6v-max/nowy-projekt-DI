'use client';

// =============================================
// StochFin - Data Loading Page
// Three methods: API, PDF/Excel, Manual
// =============================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/ui/SourceBadge';

type LoadMethod = 'api' | 'upload' | 'manual';
type LoadingStep = { label: string; done: boolean };

export default function LoadDataPage() {
    const router = useRouter();
    const [activeMethod, setActiveMethod] = useState<LoadMethod | null>(null);

    // API fetch state
    const [ticker, setTicker] = useState('');
    const [apiLoading, setApiLoading] = useState(false);
    const [apiSteps, setApiSteps] = useState<LoadingStep[]>([]);
    const [apiError, setApiError] = useState<string | null>(null);

    // File upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Manual input state
    const [manualData, setManualData] = useState({
        company_name: '',
        currency: 'PLN',
        years: ['2024', '2023', '2022'],
        revenue: {} as Record<string, string>,
        ebitda: {} as Record<string, string>,
        net_income: {} as Record<string, string>
    });

    // =============================================
    // API Fetch Handler
    // =============================================

    const handleFetchFromAPI = async () => {
        if (!ticker.trim()) return;

        setApiLoading(true);
        setApiError(null);
        setApiSteps([
            { label: 'Pobieranie profilu spółki...', done: false },
            { label: 'Pobieranie rachunku zysków i strat...', done: false },
            { label: 'Pobieranie bilansu...', done: false },
            { label: 'Pobieranie przepływów pieniężnych...', done: false },
            { label: 'Pobieranie wskaźników rynkowych...', done: false }
        ]);

        // Simulate step progress
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 300));
            setApiSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, done: true } : s
            ));
        }

        try {
            const res = await fetch('/api/financials/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: ticker.trim(), source: 'fmp' })
            });

            const result = await res.json();

            if (!res.ok) {
                setApiError(result.error || 'Błąd pobierania danych');
                setApiLoading(false);
                return;
            }

            // Store data and redirect
            localStorage.setItem('stochfin_company_data', JSON.stringify(result.data));
            router.push('/valuation/dcf');

        } catch (error) {
            setApiError('Błąd sieci. Spróbuj ponownie.');
            setApiLoading(false);
        }
    };

    // =============================================
    // File Upload Handler
    // =============================================

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            setUploadedFile(file);
            await processFile(file);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        setUploadLoading(true);
        setUploadProgress(0);

        // TODO: Implement actual upload and extraction
        // For now, simulate progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(r => setTimeout(r, 200));
            setUploadProgress(i);
        }

        setUploadLoading(false);
        // router.push('/valuation/verify');
    };

    // =============================================
    // Manual Save Handler
    // =============================================

    const handleManualSave = () => {
        const data = {
            source: 'manual',
            source_type: 'manual',
            fetched_at: new Date().toISOString(),
            ticker: '',
            company_name: manualData.company_name,
            currency: manualData.currency,
            statements: {
                income_statement: {
                    periods: manualData.years,
                    data: {
                        revenue: Object.fromEntries(
                            manualData.years.map(y => [y, parseFloat(manualData.revenue[y]) || null])
                        ),
                        ebitda: Object.fromEntries(
                            manualData.years.map(y => [y, parseFloat(manualData.ebitda[y]) || null])
                        ),
                        net_income: Object.fromEntries(
                            manualData.years.map(y => [y, parseFloat(manualData.net_income[y]) || null])
                        )
                    }
                }
            }
        };

        localStorage.setItem('stochfin_company_data', JSON.stringify(data));
        router.push('/valuation/dcf');
    };

    // =============================================
    // Render
    // =============================================

    return (
        <div className="min-h-screen bg-[#06090F] text-white">
            {/* Header */}
            <header className="border-b border-white/5 px-8 py-6">
                <h1 className="font-mono text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    StochFin
                </h1>
                <p className="text-gray-400 text-sm mt-1">Probabilistyczna Wycena Spółek</p>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-8 py-12">
                <h2 className="text-xl font-semibold mb-8">Załaduj Dane Spółki</h2>

                <div className="space-y-6">
                    {/* Card 1: API Fetch */}
                    <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">🌐</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Pobierz z Giełdy</h3>
                                <p className="text-gray-400 text-sm mt-1 mb-4">
                                    Automatycznie pobierz dane finansowe spółki notowanej na giełdzie
                                </p>

                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={ticker}
                                        onChange={e => setTicker(e.target.value)}
                                        placeholder="np. AAPL, CDR.WA, VOW3.DE"
                                        className="flex-1 bg-[#0A0E17] border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                                        disabled={apiLoading}
                                    />
                                    <button
                                        onClick={handleFetchFromAPI}
                                        disabled={apiLoading || !ticker.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {apiLoading ? '...' : '📡 Pobierz dane'}
                                    </button>
                                </div>

                                <p className="text-gray-500 text-xs mt-2">
                                    US: ticker (AAPL) | PL: ticker.WA (CDR.WA) | DE: ticker.DE (VOW3.DE)
                                </p>

                                {/* Loading Steps */}
                                {apiLoading && (
                                    <div className="mt-4 space-y-2">
                                        {apiSteps.map((step, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                {step.done ? (
                                                    <span className="text-emerald-400">✓</span>
                                                ) : (
                                                    <span className="animate-spin">⟳</span>
                                                )}
                                                <span className={step.done ? 'text-gray-400' : 'text-white'}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Error */}
                                {apiError && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                        {apiError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: File Upload */}
                    <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">📄</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Wgraj Raport (PDF / Excel)</h3>
                                <p className="text-gray-400 text-sm mt-1 mb-4">
                                    Wgraj sprawozdanie finansowe lub arkusz Excel
                                </p>

                                <div
                                    onDrop={handleFileDrop}
                                    onDragOver={e => e.preventDefault()}
                                    className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-violet-500/50 transition-colors cursor-pointer"
                                >
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-input"
                                    />
                                    <label htmlFor="file-input" className="cursor-pointer">
                                        <span className="text-4xl block mb-3">📄</span>
                                        <p className="text-gray-400 text-sm">
                                            Przeciągnij plik tutaj lub <span className="text-violet-400">kliknij aby wybrać</span>
                                        </p>
                                        <p className="text-gray-500 text-xs mt-2">
                                            PDF, XLSX, XLS, CSV • Max 20 MB
                                        </p>
                                    </label>
                                </div>

                                {/* Upload Progress */}
                                {uploadLoading && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                                            <span>Przetwarzanie...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 bg-[#0A0E17] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500 transition-all duration-200"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Manual Input */}
                    <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">✏️</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Wprowadź Ręcznie</h3>
                                <p className="text-gray-400 text-sm mt-1 mb-4">
                                    Dla spółek nienotowanych — wpisz dane finansowe ręcznie
                                </p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                Nazwa spółki
                                            </label>
                                            <input
                                                type="text"
                                                value={manualData.company_name}
                                                onChange={e => setManualData(prev => ({ ...prev, company_name: e.target.value }))}
                                                placeholder="np. Moja Spółka S.A."
                                                className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                Waluta
                                            </label>
                                            <select
                                                value={manualData.currency}
                                                onChange={e => setManualData(prev => ({ ...prev, currency: e.target.value }))}
                                                className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                <option value="PLN">PLN</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Simple data table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-gray-500 text-xs uppercase">
                                                    <th className="text-left py-2">Pole</th>
                                                    {manualData.years.map(y => (
                                                        <th key={y} className="text-right py-2">{y}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-white/5">
                                                    <td className="py-2 text-gray-400">Przychody (mln)</td>
                                                    {manualData.years.map(y => (
                                                        <td key={y} className="py-2">
                                                            <input
                                                                type="number"
                                                                value={manualData.revenue[y] || ''}
                                                                onChange={e => setManualData(prev => ({
                                                                    ...prev,
                                                                    revenue: { ...prev.revenue, [y]: e.target.value }
                                                                }))}
                                                                className="w-20 bg-[#0A0E17] border border-white/10 rounded px-2 py-1 text-right text-sm"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-t border-white/5">
                                                    <td className="py-2 text-gray-400">EBITDA (mln)</td>
                                                    {manualData.years.map(y => (
                                                        <td key={y} className="py-2">
                                                            <input
                                                                type="number"
                                                                value={manualData.ebitda[y] || ''}
                                                                onChange={e => setManualData(prev => ({
                                                                    ...prev,
                                                                    ebitda: { ...prev.ebitda, [y]: e.target.value }
                                                                }))}
                                                                className="w-20 bg-[#0A0E17] border border-white/10 rounded px-2 py-1 text-right text-sm"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-t border-white/5">
                                                    <td className="py-2 text-gray-400">Zysk netto (mln)</td>
                                                    {manualData.years.map(y => (
                                                        <td key={y} className="py-2">
                                                            <input
                                                                type="number"
                                                                value={manualData.net_income[y] || ''}
                                                                onChange={e => setManualData(prev => ({
                                                                    ...prev,
                                                                    net_income: { ...prev.net_income, [y]: e.target.value }
                                                                }))}
                                                                className="w-20 bg-[#0A0E17] border border-white/10 rounded px-2 py-1 text-right text-sm"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        onClick={handleManualSave}
                                        disabled={!manualData.company_name}
                                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        💾 Zapisz i przejdź do wyceny
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
