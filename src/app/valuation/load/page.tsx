'use client';

// =============================================
// StochFin — Load Company Data Screen
// Based on MASTER_PROMPTS v3 specification
// 3 tabs with ~20 fields for complete financial data
// =============================================

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyData } from '@/contexts/CompanyDataContext';

// =============================================
// Types
// =============================================

type TabType = 'income' | 'balance' | 'cashflow';
type LoadingStep = { label: string; done: boolean };

interface YearData {
    year: string;
    // Income Statement
    revenue: string;
    costOfRevenue: string;
    ebitda: string;
    depreciation: string;
    ebit: string;
    interestExpense: string;
    netIncome: string;
    // Balance Sheet
    totalAssets: string;
    currentAssets: string;
    cash: string;
    inventory: string;
    receivables: string;
    totalLiabilities: string;
    currentLiabilities: string;
    longTermDebt: string;
    totalEquity: string;
    retainedEarnings: string;
    // Cash Flow
    operatingCF: string;
    capex: string;
    dividendsPaid: string;
}

const emptyYearData = (year: string): YearData => ({
    year,
    revenue: '', costOfRevenue: '', ebitda: '', depreciation: '',
    ebit: '', interestExpense: '', netIncome: '',
    totalAssets: '', currentAssets: '', cash: '', inventory: '',
    receivables: '', totalLiabilities: '', currentLiabilities: '',
    longTermDebt: '', totalEquity: '', retainedEarnings: '',
    operatingCF: '', capex: '', dividendsPaid: ''
});

// =============================================
// Glass Card Component
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
// Number Input Row
// =============================================

function NumberInputRow({
    label,
    values,
    field,
    onChange,
    computed = false
}: {
    label: string;
    values: YearData[];
    field: keyof YearData;
    onChange: (yearIdx: number, value: string) => void;
    computed?: boolean;
}) {
    return (
        <div className="grid grid-cols-4 gap-4 items-center py-2 border-b border-white/5">
            <div className="text-sm text-gray-400">{label}</div>
            {values.map((yearData, idx) => (
                <input
                    key={yearData.year}
                    type="number"
                    step="0.1"
                    value={yearData[field]}
                    onChange={(e) => onChange(idx, e.target.value)}
                    placeholder="0"
                    className={`
                        w-full px-3 py-2 rounded-lg text-right font-mono text-sm
                        bg-black/30 border border-white/10
                        ${computed ? 'bg-emerald-500/5 text-emerald-400 cursor-not-allowed' : 'text-white'}
                        focus:border-emerald-500/50 focus:outline-none
                        transition-all duration-200
                    `}
                    disabled={computed}
                />
            ))}
        </div>
    );
}

// =============================================
// Loading Steps Indicator
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
                >
                    {step.done ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-emerald-500 animate-spin" />
                    )}
                    <span className={step.done ? 'text-emerald-400' : 'text-gray-400'}>
                        {step.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// =============================================
// Main Component
// =============================================

export default function LoadDataPage() {
    const router = useRouter();
    const { dispatch } = useCompanyData();

    // Company info state
    const [companyName, setCompanyName] = useState('');
    const [ticker, setTicker] = useState('');
    const [currency, setCurrency] = useState('PLN');

    // Market data state
    const [stockPrice, setStockPrice] = useState('');
    const [sharesMillions, setSharesMillions] = useState('');

    // Financial data state (3 years)
    const [years, setYears] = useState<YearData[]>([
        emptyYearData('2024'),
        emptyYearData('2023'),
        emptyYearData('2022')
    ]);

    // UI state
    const [activeTab, setActiveTab] = useState<TabType>('income');
    const [tickerInput, setTickerInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
    const [error, setError] = useState('');

    // File upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [isDragging, setIsDragging] = useState(false);

    // Update year data with auto-calculation of EBITDA/EBIT
    const updateYearData = useCallback((yearIdx: number, field: keyof YearData, value: string) => {
        setYears(prev => prev.map((y, i) => {
            if (i !== yearIdx) return y;

            const updated = { ...y, [field]: value };

            // Auto-calculate EBITDA and EBIT when related fields change
            // Only if user hasn't manually entered EBITDA/EBIT
            if (['netIncome', 'interestExpense', 'depreciation'].includes(field)) {
                const netIncome = parseFloat(updated.netIncome) || 0;
                const interest = Math.abs(parseFloat(updated.interestExpense) || 0);
                const depreciation = Math.abs(parseFloat(updated.depreciation) || 0);

                // Only auto-calculate if not manually set or if it was 0/""/undefined
                if (!updated.ebit || updated.ebit === '' || updated.ebit === '0') {
                    // EBIT ≈ Net Income + Interest + estimated tax (~25% of interest)
                    const estimatedTax = interest * 0.25;
                    const calculatedEbit = netIncome + interest + estimatedTax;
                    if (calculatedEbit > 0) {
                        updated.ebit = calculatedEbit.toFixed(1);
                    }
                }

                if (!updated.ebitda || updated.ebitda === '' || updated.ebitda === '0') {
                    // EBITDA = EBIT + Depreciation
                    const ebitValue = parseFloat(updated.ebit) || 0;
                    const calculatedEbitda = ebitValue + depreciation;
                    if (calculatedEbitda > 0) {
                        updated.ebitda = calculatedEbitda.toFixed(1);
                    }
                }
            }

            return updated;
        }));
    }, []);

    // File upload handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFile = useCallback(async (file: File) => {
        setSelectedFile(file);
        setUploadStatus('uploading');
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/valuation/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            const data = result.data;

            // Save extracted data to context
            dispatch({
                type: 'SET_COMPANY_INFO',
                payload: {
                    companyName: data.companyName || 'Uploaded Company',
                    ticker: data.ticker || '',
                    currency: data.currency || 'PLN',
                    dataSource: 'pdf',
                    sourceLabel: '📄 PDF Upload'
                }
            });

            if (data.years && data.years.length > 0) {
                dispatch({
                    type: 'SET_ALL_YEARS_DATA',
                    payload: {
                        incomeStatement: data.incomeStatement || {},
                        balanceSheet: data.balanceSheet || {},
                        cashFlow: data.cashFlow || {},
                        availableYears: data.years
                    }
                });
            }

            setUploadStatus('success');

            // Navigate to DCF after short delay
            setTimeout(() => {
                router.push('/valuation/dcf');
            }, 1000);

        } catch (err) {
            setUploadStatus('error');
            setError(err instanceof Error ? err.message : 'Błąd przetwarzania pliku');
        }
    }, [dispatch, router]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);

    // Fetch from API
    const handleFetch = async () => {
        if (!tickerInput.trim()) {
            setError('Wpisz ticker spółki');
            return;
        }

        setIsLoading(true);
        setError('');
        setLoadingSteps([
            { label: 'Łączenie z API...', done: false },
            { label: 'Pobieranie profilu spółki...', done: false },
            { label: 'Pobieranie Income Statement...', done: false },
            { label: 'Pobieranie Balance Sheet...', done: false },
            { label: 'Pobieranie Cash Flow...', done: false }
        ]);

        try {
            // Step 1
            await new Promise(r => setTimeout(r, 300));
            setLoadingSteps(s => s.map((st, i) => i === 0 ? { ...st, done: true } : st));

            // Fetch from API - use POST method
            const response = await fetch('/api/financials/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: tickerInput.trim() })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Nie znaleziono tickera. Sprawdź pisownię.');
            }

            const result = await response.json();
            const data = result.data;

            if (!data) {
                throw new Error('Nie udało się pobrać danych finansowych');
            }

            // Step 2
            setLoadingSteps(s => s.map((st, i) => i <= 1 ? { ...st, done: true } : st));
            await new Promise(r => setTimeout(r, 200));

            // Step 3
            setLoadingSteps(s => s.map((st, i) => i <= 2 ? { ...st, done: true } : st));
            await new Promise(r => setTimeout(r, 200));

            // Step 4
            setLoadingSteps(s => s.map((st, i) => i <= 3 ? { ...st, done: true } : st));
            await new Promise(r => setTimeout(r, 200));

            // Step 5
            setLoadingSteps(s => s.map((st, i) => ({ ...st, done: true })));

            // Save to context - map FMP response structure
            dispatch({
                type: 'SET_COMPANY_INFO',
                payload: {
                    companyName: data.company_name || tickerInput.toUpperCase(),
                    ticker: data.ticker || tickerInput.toUpperCase(),
                    currency: data.currency || 'USD',
                    exchange: data.exchange || '',
                    sector: data.sector || '',
                    dataSource: 'api',
                    sourceLabel: '🌐 FMP API'
                }
            });

            if (data.current_price || data.shares_outstanding) {
                dispatch({
                    type: 'SET_MARKET_DATA',
                    payload: {
                        currentPrice: data.current_price,
                        sharesOutstanding: data.shares_outstanding,
                        marketCap: data.market_cap
                    }
                });
            }

            // Map FMP statements to context format
            if (data.statements) {
                const periods = data.statements.income_statement?.periods || [];
                const incomeData = data.statements.income_statement?.data || {};
                const balanceData = data.statements.balance_sheet?.data || {};
                const cashFlowData = data.statements.cash_flow_statement?.data || {};

                // Build year-keyed objects for context
                const incomeStatement: Record<string, Record<string, number | null>> = {};
                const balanceSheet: Record<string, Record<string, number | null>> = {};
                const cashFlow: Record<string, Record<string, number | null>> = {};

                for (const year of periods) {
                    incomeStatement[year] = {
                        revenue: incomeData.revenue?.[year] ?? null,
                        costOfRevenue: incomeData.cost_of_revenue?.[year] ?? null,
                        grossProfit: incomeData.gross_profit?.[year] ?? null,
                        ebitda: incomeData.ebitda?.[year] ?? null,
                        depreciation: incomeData.depreciation?.[year] ?? null,
                        ebit: incomeData.ebit?.[year] ?? null,
                        interestExpense: incomeData.interest_expense?.[year] ?? null,
                        netIncome: incomeData.net_income?.[year] ?? null,
                    };
                    balanceSheet[year] = {
                        totalAssets: balanceData.total_assets?.[year] ?? null,
                        currentAssets: balanceData.current_assets?.[year] ?? null,
                        cash: balanceData.cash?.[year] ?? null,
                        totalLiabilities: balanceData.total_liabilities?.[year] ?? null,
                        currentLiabilities: balanceData.current_liabilities?.[year] ?? null,
                        longTermDebt: balanceData.long_term_debt?.[year] ?? null,
                        totalEquity: balanceData.total_equity?.[year] ?? null,
                    };
                    cashFlow[year] = {
                        operatingCF: cashFlowData.operating_cf?.[year] ?? null,
                        capex: cashFlowData.capex?.[year] ?? null,
                        freeCashFlow: cashFlowData.free_cash_flow?.[year] ?? null,
                    };
                }

                dispatch({
                    type: 'SET_ALL_YEARS_DATA',
                    payload: {
                        incomeStatement,
                        balanceSheet,
                        cashFlow,
                        availableYears: periods
                    }
                });
            }

            // Navigate to DCF
            await new Promise(r => setTimeout(r, 500));
            router.push('/valuation/dcf');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania danych');
            setIsLoading(false);
            setLoadingSteps([]);
        }
    };

    // Save manual data
    const handleSaveManual = () => {
        // Validation
        if (!companyName.trim()) {
            setError('Wpisz nazwę spółki');
            return;
        }

        const revenue = parseFloat(years[0].revenue);
        if (!revenue || revenue <= 0) {
            setError('Wpisz przychody za ostatni rok');
            return;
        }

        setError('');
        const UNIT = 1_000_000; // Users enter in millions

        // Helper to parse value
        const parseVal = (val: string): number | null => {
            const v = parseFloat(val);
            if (isNaN(v)) return null;
            return v * UNIT;
        };

        // =============================================
        // Auto-calculate EBITDA and EBIT when missing
        // EBITDA = Net Income + Interest Expense + Tax + Depreciation
        // EBIT = EBITDA - Depreciation (or Net Income + Interest + Tax)
        // =============================================
        const calculateEbitdaEbit = (yearData: YearData) => {
            const netIncome = parseVal(yearData.netIncome);
            const interest = parseVal(yearData.interestExpense);
            const depreciation = parseVal(yearData.depreciation);

            // Try to get tax from explicit field or estimate it
            // Tax = EBT - Net Income (if we had EBT), or estimate ~20% of EBT
            // For simplicity: Tax ≈ interest expense * 0.25 as rough estimate if not available
            const estimatedTax = interest !== null ? Math.abs(interest) * 0.25 : 0;

            let ebitda = parseVal(yearData.ebitda);
            let ebit = parseVal(yearData.ebit);

            // Auto-calculate EBIT if missing but we have net income + interest
            if (ebit === null && netIncome !== null && interest !== null) {
                // EBIT ≈ Net Income + |Interest Expense| + Tax
                // Simplified: EBIT ≈ Net Income + |Interest| * 1.25 (including tax effect)
                ebit = netIncome + Math.abs(interest) + estimatedTax;
            }

            // Auto-calculate EBITDA if missing
            if (ebitda === null) {
                if (ebit !== null && depreciation !== null) {
                    // EBITDA = EBIT + Depreciation
                    ebitda = ebit + Math.abs(depreciation);
                } else if (netIncome !== null && interest !== null && depreciation !== null) {
                    // EBITDA = Net Income + |Interest| + Tax + |Depreciation|
                    ebitda = netIncome + Math.abs(interest) + estimatedTax + Math.abs(depreciation);
                }
            }

            return { ebitda, ebit };
        };

        // Save company info
        dispatch({
            type: 'SET_COMPANY_INFO',
            payload: {
                companyName: companyName.trim(),
                ticker: ticker.trim() || '',
                currency: currency,
                dataSource: 'manual',
                sourceLabel: '✏️ Ręcznie'
            }
        });

        // Save market data if provided
        const price = parseFloat(stockPrice);
        const shares = parseFloat(sharesMillions);
        if (price && shares) {
            dispatch({
                type: 'SET_MARKET_DATA',
                payload: {
                    currentPrice: price,
                    sharesOutstanding: shares * UNIT,
                    marketCap: price * shares * UNIT
                }
            });
        }

        // Save financial data for each year
        years.forEach(yearData => {
            dispatch({
                type: 'SET_FINANCIAL_DATA',
                payload: {
                    year: yearData.year,
                    incomeStatement: (() => {
                        const { ebitda, ebit } = calculateEbitdaEbit(yearData);
                        return {
                            revenue: parseVal(yearData.revenue),
                            costOfRevenue: parseVal(yearData.costOfRevenue),
                            ebitda,  // Auto-calculated if missing
                            depreciation: parseVal(yearData.depreciation),
                            ebit,    // Auto-calculated if missing
                            interestExpense: parseVal(yearData.interestExpense),
                            netIncome: parseVal(yearData.netIncome)
                        };
                    })(),
                    balanceSheet: {
                        totalAssets: parseVal(yearData.totalAssets),
                        currentAssets: parseVal(yearData.currentAssets),
                        cash: parseVal(yearData.cash),
                        inventory: parseVal(yearData.inventory),
                        receivables: parseVal(yearData.receivables),
                        totalLiabilities: parseVal(yearData.totalLiabilities),
                        currentLiabilities: parseVal(yearData.currentLiabilities),
                        longTermDebt: parseVal(yearData.longTermDebt),
                        totalEquity: parseVal(yearData.totalEquity),
                        retainedEarnings: parseVal(yearData.retainedEarnings)
                    },
                    cashFlow: {
                        operatingCF: parseVal(yearData.operatingCF),
                        capex: yearData.capex ? -Math.abs(parseFloat(yearData.capex)) * UNIT : null,
                        freeCashFlow: (yearData.operatingCF && yearData.capex)
                            ? parseFloat(yearData.operatingCF) * UNIT - Math.abs(parseFloat(yearData.capex)) * UNIT
                            : null,
                        dividendsPaid: yearData.dividendsPaid
                            ? -Math.abs(parseFloat(yearData.dividendsPaid)) * UNIT
                            : null
                    }
                }
            });
        });

        router.push('/valuation/dcf');
    };

    // Tabs configuration
    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'income', label: 'Rachunek Zysków i Strat', icon: '💰' },
        { key: 'balance', label: 'Bilans', icon: '📋' },
        { key: 'cashflow', label: 'Cash Flow', icon: '💧' }
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-purple-500/3 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-8 py-6">
                    <div className="font-mono text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        StochFin
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                        Probabilistic Company Valuation
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-8 py-10">
                {/* Title */}
                <h1 className="text-3xl font-mono font-bold mb-2">
                    Załaduj dane spółki
                </h1>
                <p className="text-gray-400 mb-8">
                    Wybierz sposób importu danych finansowych
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                        ⚠️ {error}
                    </div>
                )}

                {/* Section A: Fetch from Exchange */}
                <GlassCard className="mb-6" glowColor="cyan">
                    <div className="flex items-start gap-4 mb-4">
                        <FeatureIcon emoji="🌐" color="cyan" />
                        <div>
                            <h2 className="text-xl font-semibold">Pobierz z giełdy</h2>
                            <p className="text-sm text-gray-400">
                                Automatycznie pobierz dane z NYSE, NASDAQ, WSE i więcej
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={tickerInput}
                            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                            placeholder="Wpisz ticker: AAPL, MSFT, CDR.WA..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                        />
                        <button
                            onClick={handleFetch}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                        >
                            📡 Pobierz dane
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                        US: AAPL, MSFT, GOOGL • PL: CDR.WA, PKO.WA • DE: VOW3.DE
                    </p>

                    {isLoading && <LoadingSteps steps={loadingSteps} />}
                </GlassCard>

                {/* Section B: Upload Report */}
                <GlassCard className="mb-6" glowColor="purple">
                    <div className="flex items-start gap-4 mb-4">
                        <FeatureIcon emoji="📄" color="purple" />
                        <div>
                            <h2 className="text-xl font-semibold">Wgraj raport</h2>
                            <p className="text-sm text-gray-400">
                                Wgraj sprawozdanie finansowe (PDF) lub plik Excel
                            </p>
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.xlsx,.xls,.csv"
                        className="hidden"
                    />

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                            ${isDragging
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5'
                            }
                            ${uploadStatus === 'uploading' ? 'pointer-events-none opacity-60' : ''}
                        `}
                    >
                        {uploadStatus === 'uploading' ? (
                            <>
                                <div className="w-8 h-8 mx-auto mb-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <div className="text-purple-400 font-medium">
                                    Przetwarzanie pliku...
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    AI analizuje dane finansowe
                                </div>
                            </>
                        ) : uploadStatus === 'success' ? (
                            <>
                                <div className="text-4xl mb-2">✅</div>
                                <div className="text-emerald-400 font-medium">
                                    Dane załadowane pomyślnie!
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    Przechodzę do analizy...
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-4xl mb-2">📁</div>
                                <div className="text-gray-400">
                                    {isDragging ? 'Upuść plik tutaj!' : 'Przeciągnij plik lub kliknij aby wybrać'}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    PDF, XLSX, XLS, CSV • Max 20 MB
                                </div>
                            </>
                        )}
                    </div>

                    {selectedFile && uploadStatus !== 'success' && (
                        <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                            <span className="text-2xl">📄</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                                <div className="text-xs text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setError(''); }}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {uploadStatus === 'error' && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            ⚠️ {error || 'Błąd przetwarzania pliku'}
                        </div>
                    )}
                </GlassCard>

                {/* Section C: Manual Entry */}
                <GlassCard className="mb-6" glowColor="amber">
                    <div className="flex items-start gap-4 mb-6">
                        <FeatureIcon emoji="✏️" color="amber" />
                        <div>
                            <h2 className="text-xl font-semibold">Wprowadź ręcznie</h2>
                            <p className="text-sm text-gray-400">
                                Dla spółek prywatnych — wpisz dane finansowe
                            </p>
                        </div>
                    </div>

                    {/* Company Info Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Nazwa spółki</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="np. Firma Sp. z o.o."
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Ticker</label>
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="np. ABC"
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Waluta</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none"
                            >
                                <option value="PLN">PLN</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>
                    </div>

                    {/* Market Data Row (Optional) */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Cena akcji (opcjonalne)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={stockPrice}
                                onChange={(e) => setStockPrice(e.target.value)}
                                placeholder="np. 125.50"
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Liczba akcji (mln)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={sharesMillions}
                                onChange={(e) => setSharesMillions(e.target.value)}
                                placeholder="np. 15.2"
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-6 -mt-4">
                        Opcjonalne — potrzebne do wyceny per share
                    </p>

                    {/* Financial Data Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-white/10">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`
                                    px-4 py-3 text-sm font-medium transition-all
                                    ${activeTab === tab.key
                                        ? 'border-b-2 border-amber-500 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }
                                `}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Year Headers */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-xs text-gray-500 uppercase">Pole</div>
                        {years.map((y, idx) => (
                            <input
                                key={idx}
                                type="text"
                                value={y.year}
                                onChange={(e) => updateYearData(idx, 'year', e.target.value)}
                                className="text-center px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white font-mono text-sm"
                            />
                        ))}
                    </div>

                    {/* Income Statement Tab */}
                    {activeTab === 'income' && (
                        <div className="space-y-1">
                            <NumberInputRow label="Przychody (Revenue)" values={years} field="revenue" onChange={(i, v) => updateYearData(i, 'revenue', v)} />
                            <NumberInputRow label="Koszt sprzedaży" values={years} field="costOfRevenue" onChange={(i, v) => updateYearData(i, 'costOfRevenue', v)} />
                            <NumberInputRow label="EBITDA" values={years} field="ebitda" onChange={(i, v) => updateYearData(i, 'ebitda', v)} />
                            <NumberInputRow label="Amortyzacja (D&A)" values={years} field="depreciation" onChange={(i, v) => updateYearData(i, 'depreciation', v)} />
                            <NumberInputRow label="EBIT" values={years} field="ebit" onChange={(i, v) => updateYearData(i, 'ebit', v)} />
                            <NumberInputRow label="Koszty odsetkowe" values={years} field="interestExpense" onChange={(i, v) => updateYearData(i, 'interestExpense', v)} />
                            <NumberInputRow label="Zysk netto" values={years} field="netIncome" onChange={(i, v) => updateYearData(i, 'netIncome', v)} />
                        </div>
                    )}

                    {/* Balance Sheet Tab */}
                    {activeTab === 'balance' && (
                        <div className="space-y-1">
                            <NumberInputRow label="Aktywa ogółem" values={years} field="totalAssets" onChange={(i, v) => updateYearData(i, 'totalAssets', v)} />
                            <NumberInputRow label="Aktywa obrotowe" values={years} field="currentAssets" onChange={(i, v) => updateYearData(i, 'currentAssets', v)} />
                            <NumberInputRow label="Środki pieniężne" values={years} field="cash" onChange={(i, v) => updateYearData(i, 'cash', v)} />
                            <NumberInputRow label="Zapasy" values={years} field="inventory" onChange={(i, v) => updateYearData(i, 'inventory', v)} />
                            <NumberInputRow label="Należności" values={years} field="receivables" onChange={(i, v) => updateYearData(i, 'receivables', v)} />
                            <NumberInputRow label="Zobowiązania ogółem" values={years} field="totalLiabilities" onChange={(i, v) => updateYearData(i, 'totalLiabilities', v)} />
                            <NumberInputRow label="Zobowiązania krótkoterm." values={years} field="currentLiabilities" onChange={(i, v) => updateYearData(i, 'currentLiabilities', v)} />
                            <NumberInputRow label="Dług długoterminowy" values={years} field="longTermDebt" onChange={(i, v) => updateYearData(i, 'longTermDebt', v)} />
                            <NumberInputRow label="Kapitał własny" values={years} field="totalEquity" onChange={(i, v) => updateYearData(i, 'totalEquity', v)} />
                            <NumberInputRow label="Zysk zatrzymany" values={years} field="retainedEarnings" onChange={(i, v) => updateYearData(i, 'retainedEarnings', v)} />
                        </div>
                    )}

                    {/* Cash Flow Tab */}
                    {activeTab === 'cashflow' && (
                        <div className="space-y-1">
                            <NumberInputRow label="CF z działalności oper." values={years} field="operatingCF" onChange={(i, v) => updateYearData(i, 'operatingCF', v)} />
                            <NumberInputRow label="CAPEX (wartość dodatnia)" values={years} field="capex" onChange={(i, v) => updateYearData(i, 'capex', v)} />
                            <NumberInputRow label="Dywidendy wypłacone" values={years} field="dividendsPaid" onChange={(i, v) => updateYearData(i, 'dividendsPaid', v)} />
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-4 mb-6">
                        Wartości w milionach {currency}
                    </p>

                    {/* Info Box */}
                    <div className="bg-cyan-500/5 border-l-4 border-cyan-500 rounded-r-xl p-4 mb-6">
                        <div className="text-sm font-medium text-cyan-400 mb-2">
                            ℹ️ Jakie dane potrzebujesz?
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                            <div>⚡ <strong>MINIMUM (DCF):</strong> Revenue, EBITDA, Net Income (1 tab)</div>
                            <div>📊 <strong>Health Check:</strong> + Bilans (2 taby)</div>
                            <div>💎 <strong>PEŁNA ANALIZA:</strong> + Cash Flow (3 taby)</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-3">
                            Im więcej danych wpiszesz, tym więcej funkcji odblokujesz.
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveManual}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-lg hover:from-emerald-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                    >
                        💾 Zapisz i przejdź do analizy
                    </button>
                </GlassCard>

                {/* Footer Link */}
                <div className="text-center mt-8">
                    <button
                        onClick={() => router.push('/landing')}
                        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                        ← Powrót na stronę główną
                    </button>
                </div>
            </main>
        </div>
    );
}
