'use client';

// =============================================
// StochFin - Premium Data Loading Page
// Modern fintech UI with animated cards
// =============================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoadingStep = { label: string; done: boolean };

// =============================================
// Premium Glass Card
// =============================================

function GlassCard({
    children,
    className = '',
    glowColor = 'cyan',
    active = false,
    onClick
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
    active?: boolean;
    onClick?: () => void;
}) {
    const glowMap = {
        emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
        cyan: 'hover:border-cyan-500/30 hover:shadow-cyan-500/10',
        purple: 'hover:border-purple-500/30 hover:shadow-purple-500/10',
        amber: 'hover:border-amber-500/30 hover:shadow-amber-500/10'
    };

    const activeMap = {
        emerald: 'border-emerald-500/40 shadow-emerald-500/20 bg-emerald-500/5',
        cyan: 'border-cyan-500/40 shadow-cyan-500/20 bg-cyan-500/5',
        purple: 'border-purple-500/40 shadow-purple-500/20 bg-purple-500/5',
        amber: 'border-amber-500/40 shadow-amber-500/20 bg-amber-500/5'
    };

    return (
        <div
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-2xl p-6
                backdrop-blur-xl transition-all duration-300
                ${active
                    ? `${activeMap[glowColor]} border shadow-xl`
                    : `bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:shadow-xl ${glowMap[glowColor]}`
                }
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Premium inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// =============================================
// Feature Icon Box
// =============================================

function FeatureIcon({
    emoji,
    color = 'cyan'
}: {
    emoji: string;
    color?: 'emerald' | 'cyan' | 'purple' | 'amber';
}) {
    const gradientMap = {
        emerald: 'from-emerald-500 to-teal-600',
        cyan: 'from-cyan-500 to-blue-600',
        purple: 'from-purple-500 to-pink-600',
        amber: 'from-amber-500 to-orange-600'
    };

    return (
        <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center text-2xl
            bg-gradient-to-br ${gradientMap[color]}
            shadow-lg
        `}>
            {emoji}
        </div>
    );
}

// =============================================
// Premium Input
// =============================================

function PremiumInput({
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    className = ''
}: {
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`
                w-full px-4 py-3 rounded-xl
                bg-black/30 backdrop-blur-sm
                border border-white/10
                text-white placeholder-gray-500
                focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
        />
    );
}

// =============================================
// Premium Button
// =============================================

function PremiumButton({
    children,
    onClick,
    disabled = false,
    variant = 'primary',
    size = 'md',
    className = ''
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const variantStyles = {
        primary: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25',
        secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
        gradient: 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                rounded-xl font-medium transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:scale-[1.02] active:scale-[0.98]
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `}
        >
            {children}
        </button>
    );
}

// =============================================
// Loading Step Indicator
// =============================================

function LoadingSteps({ steps }: { steps: LoadingStep[] }) {
    return (
        <div className="mt-6 space-y-2">
            {steps.map((step, idx) => (
                <div
                    key={idx}
                    className={`
                        flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                        ${step.done ? 'bg-emerald-500/10' : 'bg-white/5'}
                    `}
                    style={{ animationDelay: `${idx * 100}ms` }}
                >
                    {step.done ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-cyan-500/50 border-t-cyan-500 animate-spin" />
                    )}
                    <span className={step.done ? 'text-emerald-300' : 'text-white'}>
                        {step.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// =============================================
// Main Page Component
// =============================================

export default function LoadDataPage() {
    const router = useRouter();

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
    // Handlers
    // =============================================

    const handleFetchFromAPI = async () => {
        if (!ticker.trim()) return;

        setApiLoading(true);
        setApiError(null);
        setApiSteps([
            { label: 'Fetching company profile...', done: false },
            { label: 'Loading income statement...', done: false },
            { label: 'Loading balance sheet...', done: false },
            { label: 'Loading cash flow...', done: false },
            { label: 'Loading market data...', done: false }
        ]);

        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 400));
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
                setApiError(result.error || 'Failed to fetch data');
                setApiLoading(false);
                return;
            }

            localStorage.setItem('stochfin_company_data', JSON.stringify(result.data));
            router.push('/valuation/dcf');

        } catch {
            setApiError('Network error. Try again.');
            setApiLoading(false);
        }
    };

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

        for (let i = 0; i <= 100; i += 10) {
            await new Promise(r => setTimeout(r, 200));
            setUploadProgress(i);
        }

        setUploadLoading(false);
    };

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
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[80px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/30">
                            S
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                                StochFin
                            </h1>
                            <p className="text-sm text-gray-500">Probabilistic Company Valuation</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-8 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-3">Load Company Data</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Choose how you&apos;d like to import financial data for valuation analysis
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* Card 1: API Fetch */}
                    <GlassCard glowColor="cyan">
                        <div className="flex items-start gap-5">
                            <FeatureIcon emoji="🌐" color="cyan" />
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-1">Fetch from Exchange</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Automatically download financial data from NYSE, NASDAQ, WSE, and more
                                </p>

                                <div className="flex gap-3 mb-4">
                                    <PremiumInput
                                        value={ticker}
                                        onChange={e => setTicker(e.target.value)}
                                        placeholder="Enter ticker: AAPL, MSFT, CDR.WA..."
                                        disabled={apiLoading}
                                        className="flex-1"
                                    />
                                    <PremiumButton
                                        onClick={handleFetchFromAPI}
                                        disabled={apiLoading || !ticker.trim()}
                                        variant="primary"
                                    >
                                        {apiLoading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Loading...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                📡 Fetch Data
                                            </span>
                                        )}
                                    </PremiumButton>
                                </div>

                                <div className="flex gap-4 text-xs text-gray-500">
                                    <span className="px-2 py-1 rounded-md bg-white/5">US: AAPL</span>
                                    <span className="px-2 py-1 rounded-md bg-white/5">PL: CDR.WA</span>
                                    <span className="px-2 py-1 rounded-md bg-white/5">DE: VOW3.DE</span>
                                </div>

                                {apiLoading && <LoadingSteps steps={apiSteps} />}

                                {apiError && (
                                    <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-start gap-3">
                                        <span className="text-xl">⚠️</span>
                                        <div>
                                            <div className="font-medium">Error</div>
                                            <div className="text-sm text-rose-300/70">{apiError}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 2: File Upload */}
                    <GlassCard glowColor="purple">
                        <div className="flex items-start gap-5">
                            <FeatureIcon emoji="📄" color="purple" />
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-1">Upload Report</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Upload financial statement (PDF) or Excel workbook
                                </p>

                                <div
                                    onDrop={handleFileDrop}
                                    onDragOver={e => e.preventDefault()}
                                    className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-purple-500/50 transition-all duration-300 cursor-pointer bg-white/[0.02] hover:bg-purple-500/5"
                                >
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-input"
                                    />
                                    <label htmlFor="file-input" className="cursor-pointer">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                            <span className="text-3xl">📄</span>
                                        </div>
                                        <p className="text-gray-300 mb-1">
                                            Drop file here or <span className="text-purple-400 hover:text-purple-300">browse</span>
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                            PDF, XLSX, XLS, CSV • Max 20 MB
                                        </p>
                                    </label>
                                </div>

                                {uploadLoading && (
                                    <div className="mt-6">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-400">Processing {uploadedFile?.name}...</span>
                                            <span className="text-purple-400 font-mono">{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 3: Manual Input */}
                    <GlassCard glowColor="amber">
                        <div className="flex items-start gap-5">
                            <FeatureIcon emoji="✏️" color="amber" />
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-1">Enter Manually</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    For private companies — enter financial data manually
                                </p>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                                                Company Name
                                            </label>
                                            <PremiumInput
                                                value={manualData.company_name}
                                                onChange={e => setManualData(prev => ({ ...prev, company_name: e.target.value }))}
                                                placeholder="e.g. My Company Ltd."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                                                Currency
                                            </label>
                                            <select
                                                value={manualData.currency}
                                                onChange={e => setManualData(prev => ({ ...prev, currency: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:border-white/30 focus:outline-none transition-all"
                                            >
                                                <option value="PLN">PLN</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Data Table */}
                                    <div className="overflow-hidden rounded-xl border border-white/10">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Metric</th>
                                                    {manualData.years.map(y => (
                                                        <th key={y} className="text-center py-3 px-4 text-gray-400 font-medium">{y}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    { key: 'revenue', label: 'Revenue (M)', icon: '💰' },
                                                    { key: 'ebitda', label: 'EBITDA (M)', icon: '📈' },
                                                    { key: 'net_income', label: 'Net Income (M)', icon: '💵' }
                                                ].map(row => (
                                                    <tr key={row.key} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-3 px-4 text-gray-300 flex items-center gap-2">
                                                            <span>{row.icon}</span>
                                                            {row.label}
                                                        </td>
                                                        {manualData.years.map(y => (
                                                            <td key={y} className="py-3 px-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    value={(manualData as any)[row.key][y] || ''}
                                                                    onChange={e => setManualData(prev => ({
                                                                        ...prev,
                                                                        [row.key]: { ...(prev as any)[row.key], [y]: e.target.value }
                                                                    }))}
                                                                    className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-center text-white font-mono focus:border-amber-500/50 focus:outline-none transition-all"
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <PremiumButton
                                        onClick={handleManualSave}
                                        disabled={!manualData.company_name}
                                        variant="gradient"
                                        size="lg"
                                        className="w-full"
                                    >
                                        💾 Save and Continue to Valuation
                                    </PremiumButton>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Quick Links */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm mb-4">Already have data loaded?</p>
                    <button
                        onClick={() => router.push('/valuation/dcf')}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                    >
                        Go to DCF Valuation →
                    </button>
                </div>
            </main>
        </div>
    );
}
