'use client';

// =============================================
// StochFin: Simulation Results Page (Premium UI)
// =============================================

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FanChart } from '@/components/charts/FanChart';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
    ArrowLeft,
    Download,
    Share2,
    RefreshCw,
    Clock,
    Cpu,
    BarChart3,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Loader2,
    Play,
    Activity,
    Target,
    Zap,
    CheckCircle2,
    XCircle,
    ChevronRight
} from 'lucide-react';

interface SimulationData {
    id: string;
    model_id: string;
    model_name?: string;
    status: string;
    n_simulations: number;
    run_type: string;
    started_at: string;
    completed_at: string | null;
    compute_time_seconds: number | null;
    error_message: string | null;
    results?: SimulationResult[];
}

interface SimulationResult {
    variable_id: string;
    period_index: number;
    period_date: string;
    mean: number;
    median: number;
    std_dev: number;
    p05: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    min_value: number;
    max_value: number;
    prob_negative: number;
}

// Variable name mapping
const VARIABLE_NAMES: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
    'REVENUE_GROWTH': { name: 'Wzrost przychodów', icon: <TrendingUp className="w-4 h-4" />, color: 'emerald' },
    'COGS_RATIO': { name: 'Udział COGS', icon: <Activity className="w-4 h-4" />, color: 'blue' },
    'EBITDA_MARGIN': { name: 'Marża EBITDA', icon: <Target className="w-4 h-4" />, color: 'violet' },
    'INTEREST_RATE': { name: 'Stopa procentowa', icon: <Zap className="w-4 h-4" />, color: 'amber' },
};

export default function SimulationResultsPage() {
    const params = useParams();
    const id = params.id as string;

    const [simulation, setSimulation] = useState<SimulationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'sensitivity'>('overview');

    useEffect(() => {
        const fetchSimulation = async () => {
            try {
                const res = await fetch(`/api/simulations/${id}?include_results=true`);
                const json = await res.json();

                if (json.error) {
                    setError(json.error);
                } else {
                    setSimulation(json.data);
                }
            } catch {
                setError('Nie udało się pobrać danych symulacji');
            } finally {
                setLoading(false);
            }
        };

        fetchSimulation();
    }, [id]);

    const handleRunSimulation = async () => {
        setIsRunning(true);
        try {
            const res = await fetch(`/api/simulations/${id}/run`, { method: 'POST' });
            const json = await res.json();

            if (json.error) {
                setError(json.error);
            } else {
                const refreshRes = await fetch(`/api/simulations/${id}?include_results=true`);
                const refreshJson = await refreshRes.json();
                setSimulation(refreshJson.data);
            }
        } catch {
            setError('Błąd podczas uruchamiania symulacji');
        } finally {
            setIsRunning(false);
        }
    };

    const getFanChartData = (variableId: string) => {
        if (!simulation?.results) return [];

        return simulation.results
            .filter(r => r.variable_id === variableId)
            .sort((a, b) => a.period_index - b.period_index)
            .map(r => ({
                date: r.period_date,
                p10: r.p10,
                p25: r.p25,
                p50: r.p50,
                p75: r.p75,
                p90: r.p90
            }));
    };

    const getVariableIds = () => {
        if (!simulation?.results) return [];
        return [...new Set(simulation.results.map(r => r.variable_id))];
    };

    const getFinalStats = (variableId: string) => {
        if (!simulation?.results) return null;
        const varResults = simulation.results.filter(r => r.variable_id === variableId);
        const maxPeriod = Math.max(...varResults.map(r => r.period_index));
        return varResults.find(r => r.period_index === maxPeriod);
    };

    const getVariableInfo = (index: number) => {
        const keys = Object.keys(VARIABLE_NAMES);
        const key = keys[index % keys.length];
        return VARIABLE_NAMES[key] || { name: `Zmienna ${index + 1}`, icon: <Activity className="w-4 h-4" />, color: 'blue' };
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-[hsl(var(--accent-primary))]/20" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[hsl(var(--accent-primary))] animate-spin" />
                        </div>
                        <p className="text-[hsl(var(--text-muted))]">Ładowanie wyników...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (error || !simulation) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-red-400 font-medium">{error || 'Nie znaleziono symulacji'}</p>
                    <Link href="/simulations">
                        <Button variant="secondary">Powrót do listy</Button>
                    </Link>
                </div>
            </AppLayout>
        );
    }

    const variableIds = getVariableIds();

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))] border border-[hsl(var(--border-subtle))] p-6">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--accent-primary))]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <Link href="/simulations">
                                <Button variant="ghost" size="icon" className="mt-1">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                        {simulation.model_name || `Symulacja ${simulation.id.slice(0, 8)}`}
                                    </h1>
                                    <span className={cn(
                                        'px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5',
                                        simulation.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
                                        simulation.status === 'pending' && 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
                                        simulation.status === 'running' && 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
                                        simulation.status === 'failed' && 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                                    )}>
                                        {simulation.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                        {simulation.status === 'pending' && <Clock className="w-3 h-3" />}
                                        {simulation.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {simulation.status === 'failed' && <XCircle className="w-3 h-3" />}
                                        {simulation.status === 'completed' && 'Ukończona'}
                                        {simulation.status === 'pending' && 'Oczekująca'}
                                        {simulation.status === 'running' && 'W trakcie'}
                                        {simulation.status === 'failed' && 'Błąd'}
                                    </span>
                                </div>
                                <p className="text-sm text-[hsl(var(--text-muted))]">
                                    {simulation.run_type?.replace(/_/g, ' ') || 'Monte Carlo'}
                                </p>

                                {/* Stats row */}
                                <div className="flex items-center gap-6 mt-4 text-sm">
                                    {simulation.completed_at && (
                                        <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                            <Clock className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                            {formatDate(simulation.completed_at, 'long')}
                                        </div>
                                    )}
                                    {simulation.compute_time_seconds !== null && (
                                        <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                            <Cpu className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                            <span className="font-mono">{simulation.compute_time_seconds}s</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                        <BarChart3 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                        <span className="font-mono">{formatNumber(simulation.n_simulations, { compact: true })}</span>
                                        <span className="text-[hsl(var(--text-muted))]">iteracji</span>
                                    </div>
                                    {simulation.results && (
                                        <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                            <TrendingUp className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                            <span className="font-mono">{variableIds.length}</span>
                                            <span className="text-[hsl(var(--text-muted))]">zmiennych</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {simulation.status === 'pending' && (
                                <Button
                                    onClick={handleRunSimulation}
                                    disabled={isRunning}
                                    leftIcon={isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90"
                                >
                                    {isRunning ? 'Uruchamiam...' : 'Uruchom'}
                                </Button>
                            )}
                            {simulation.status === 'completed' && (
                                <>
                                    <Button variant="ghost" size="icon">
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                            <Link href={`/models/${simulation.model_id}`}>
                                <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                                    Model
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Error message */}
                {simulation.status === 'failed' && simulation.error_message && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-red-400">Błąd symulacji</h4>
                            <p className="text-sm text-red-400/80 mt-1">{simulation.error_message}</p>
                        </div>
                    </div>
                )}

                {/* Pending state */}
                {simulation.status === 'pending' && (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <Clock className="w-10 h-10 text-amber-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                <span className="text-xs font-bold text-black">!</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold mb-2">Symulacja oczekuje na uruchomienie</h3>
                            <p className="text-[hsl(var(--text-muted))] max-w-md">
                                Kliknij przycisk poniżej aby uruchomić silnik Monte Carlo i wygenerować rozkłady prawdopodobieństwa
                            </p>
                        </div>
                        <Button
                            onClick={handleRunSimulation}
                            disabled={isRunning}
                            size="lg"
                            className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90 px-8"
                            leftIcon={isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        >
                            {isRunning ? 'Uruchamiam Monte Carlo...' : 'Uruchom symulację'}
                        </Button>
                    </div>
                )}

                {/* Results */}
                {simulation.status === 'completed' && simulation.results && simulation.results.length > 0 && (
                    <>
                        {/* Premium Tabs */}
                        <div className="flex items-center gap-1 p-1.5 bg-[hsl(var(--surface-1))] rounded-xl w-fit border border-[hsl(var(--border-subtle))]">
                            {[
                                { id: 'overview', label: 'Przegląd', icon: <Activity className="w-4 h-4" /> },
                                { id: 'distributions', label: 'Rozkłady', icon: <BarChart3 className="w-4 h-4" /> },
                                { id: 'sensitivity', label: 'Statystyki', icon: <Target className="w-4 h-4" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={cn(
                                        'px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 text-white shadow-lg shadow-[hsl(var(--accent-primary))]/25'
                                            : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Premium stat cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {variableIds.slice(0, 4).map((varId, index) => {
                                        const stats = getFinalStats(varId);
                                        const varInfo = getVariableInfo(index);
                                        if (!stats) return null;

                                        const isPercentage = stats.mean < 1 && stats.mean > -1;
                                        const formatVal = (v: number) => isPercentage
                                            ? (v * 100).toFixed(1) + '%'
                                            : formatNumber(v, { compact: true });

                                        const trend = stats.mean > stats.p50 ? 'up' : 'down';

                                        return (
                                            <div
                                                key={varId}
                                                className={cn(
                                                    'relative overflow-hidden rounded-xl p-5 border transition-all hover:scale-[1.02] cursor-pointer',
                                                    'bg-gradient-to-br',
                                                    varInfo.color === 'emerald' && 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
                                                    varInfo.color === 'blue' && 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40',
                                                    varInfo.color === 'violet' && 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
                                                    varInfo.color === 'amber' && 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                                                )}
                                            >
                                                {/* Icon */}
                                                <div className={cn(
                                                    'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                                                    varInfo.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                                                    varInfo.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                                                    varInfo.color === 'violet' && 'bg-violet-500/20 text-violet-400',
                                                    varInfo.color === 'amber' && 'bg-amber-500/20 text-amber-400'
                                                )}>
                                                    {varInfo.icon}
                                                </div>

                                                <p className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-medium">
                                                    {varInfo.name}
                                                </p>
                                                <p className="text-3xl font-bold mt-1 tracking-tight">
                                                    {formatVal(stats.mean)}
                                                </p>

                                                {/* Range indicator */}
                                                <div className="flex items-center gap-2 mt-3 text-xs">
                                                    <span className="text-red-400 font-mono">{formatVal(stats.p10)}</span>
                                                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--surface-3))] overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full',
                                                                varInfo.color === 'emerald' && 'bg-gradient-to-r from-red-400 via-emerald-400 to-green-400',
                                                                varInfo.color === 'blue' && 'bg-gradient-to-r from-red-400 via-blue-400 to-green-400',
                                                                varInfo.color === 'violet' && 'bg-gradient-to-r from-red-400 via-violet-400 to-green-400',
                                                                varInfo.color === 'amber' && 'bg-gradient-to-r from-red-400 via-amber-400 to-green-400'
                                                            )}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <span className="text-green-400 font-mono">{formatVal(stats.p90)}</span>
                                                </div>

                                                {/* Trend indicator */}
                                                <div className={cn(
                                                    'absolute top-4 right-4 flex items-center gap-1 text-xs font-medium',
                                                    trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                                                )}>
                                                    {trend === 'up' ? (
                                                        <TrendingUp className="w-3 h-3" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Fan charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {variableIds.slice(0, 2).map((varId, index) => {
                                        const data = getFanChartData(varId);
                                        const varInfo = getVariableInfo(index);

                                        return (
                                            <Card key={varId} className="overflow-hidden">
                                                <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-8 h-8 rounded-lg flex items-center justify-center',
                                                            varInfo.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                                                            varInfo.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                                                            varInfo.color === 'violet' && 'bg-violet-500/20 text-violet-400',
                                                            varInfo.color === 'amber' && 'bg-amber-500/20 text-amber-400'
                                                        )}>
                                                            {varInfo.icon}
                                                        </div>
                                                        <CardTitle>{varInfo.name}</CardTitle>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <FanChart data={data} height={280} />
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Distributions Tab */}
                        {activeTab === 'distributions' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {variableIds.map((varId, index) => {
                                    const data = getFanChartData(varId);
                                    const varInfo = getVariableInfo(index);

                                    return (
                                        <Card key={varId} className="overflow-hidden">
                                            <CardHeader className="border-b border-[hsl(var(--border-subtle))] py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        'w-8 h-8 rounded-lg flex items-center justify-center',
                                                        varInfo.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                                                        varInfo.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                                                        varInfo.color === 'violet' && 'bg-violet-500/20 text-violet-400',
                                                        varInfo.color === 'amber' && 'bg-amber-500/20 text-amber-400'
                                                    )}>
                                                        {varInfo.icon}
                                                    </div>
                                                    <CardTitle className="text-base">{varInfo.name}</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <FanChart data={data} height={220} />
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Statistics Tab */}
                        {activeTab === 'sensitivity' && (
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                                <Target className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <div>
                                                <CardTitle>Statystyki końcowe</CardTitle>
                                                <p className="text-sm text-[hsl(var(--text-muted))]">
                                                    Okres {Math.max(...simulation.results.map(r => r.period_index))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[hsl(var(--surface-2))]">
                                                    <th className="text-left py-4 px-6 font-semibold text-[hsl(var(--text-secondary))]">Zmienna</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-[hsl(var(--text-secondary))]">Mean</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-[hsl(var(--text-secondary))]">Std Dev</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-red-400/80">P5</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-[hsl(var(--text-secondary))]">P50</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-green-400/80">P95</th>
                                                    <th className="text-right py-4 px-4 font-semibold text-[hsl(var(--text-secondary))]">P(&lt;0)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {variableIds.map((varId, index) => {
                                                    const stats = getFinalStats(varId);
                                                    const varInfo = getVariableInfo(index);
                                                    if (!stats) return null;

                                                    const isPercentage = stats.mean < 1 && stats.mean > -1;
                                                    const format = (v: number) => isPercentage
                                                        ? (v * 100).toFixed(2) + '%'
                                                        : formatNumber(v, { decimals: 2 });

                                                    return (
                                                        <tr
                                                            key={varId}
                                                            className="border-t border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--surface-1))] transition-colors"
                                                        >
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        'w-8 h-8 rounded-lg flex items-center justify-center',
                                                                        varInfo.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                                                                        varInfo.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                                                                        varInfo.color === 'violet' && 'bg-violet-500/20 text-violet-400',
                                                                        varInfo.color === 'amber' && 'bg-amber-500/20 text-amber-400'
                                                                    )}>
                                                                        {varInfo.icon}
                                                                    </div>
                                                                    <span className="font-medium">{varInfo.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <span className="font-mono font-semibold text-[hsl(var(--accent-primary))]">
                                                                    {format(stats.mean)}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-right font-mono text-[hsl(var(--text-muted))]">
                                                                {format(stats.std_dev)}
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <span className="font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                                                    {format(stats.p05)}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-right font-mono">
                                                                {format(stats.p50)}
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <span className="font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                                                    {format(stats.p95)}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-right font-mono">
                                                                <span className={cn(
                                                                    'px-2 py-1 rounded',
                                                                    stats.prob_negative > 0.1
                                                                        ? 'text-red-400 bg-red-500/10'
                                                                        : 'text-emerald-400 bg-emerald-500/10'
                                                                )}>
                                                                    {(stats.prob_negative * 100).toFixed(1)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* No results */}
                {simulation.status === 'completed' && (!simulation.results || simulation.results.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-[hsl(var(--text-muted))]" />
                        </div>
                        <p className="text-[hsl(var(--text-muted))]">Brak wyników do wyświetlenia</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
