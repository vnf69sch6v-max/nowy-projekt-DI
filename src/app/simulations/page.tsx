'use client';

// =============================================
// StochFin: Simulations List Page (Premium Design)
// =============================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronRight,
    BarChart3,
    RefreshCw,
    Activity,
    Loader2,
    Zap,
    TrendingUp,
    Play
} from 'lucide-react';

interface Simulation {
    id: string;
    model_id: string;
    model_name?: string;
    status: string;
    run_type: string;
    n_simulations: number;
    started_at: string;
    completed_at: string | null;
    compute_time_seconds: number | null;
    error_message: string | null;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string; bgColor: string }> = {
    pending: { icon: Clock, color: 'text-amber-400', label: 'Oczekuje', bgColor: 'bg-amber-500/15' },
    running: { icon: RefreshCw, color: 'text-blue-400', label: 'W toku', bgColor: 'bg-blue-500/15' },
    completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Ukończona', bgColor: 'bg-emerald-500/15' },
    failed: { icon: XCircle, color: 'text-red-400', label: 'Błąd', bgColor: 'bg-red-500/15' },
    cancelled: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Anulowana', bgColor: 'bg-yellow-500/15' },
};

const typeLabels: Record<string, string> = {
    full_monte_carlo: 'Monte Carlo',
    sensitivity: 'Analiza wrażliwości',
    stress_test: 'Stress Test',
    scenario_analysis: 'Scenariusze'
};

export default function SimulationsPage() {
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'running' | 'pending' | 'failed'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimulations = async () => {
            try {
                const res = await fetch('/api/simulations');
                const json = await res.json();
                if (json.data) {
                    setSimulations(json.data);
                }
            } catch {
                console.error('Error fetching simulations');
            } finally {
                setLoading(false);
            }
        };

        fetchSimulations();
    }, []);

    const filteredSimulations = simulations.filter(sim => {
        const matchesSearch = (sim.model_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || sim.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: simulations.length,
        completed: simulations.filter(s => s.status === 'completed').length,
        pending: simulations.filter(s => s.status === 'pending').length,
        failed: simulations.filter(s => s.status === 'failed').length,
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))] border border-[hsl(var(--border-subtle))] p-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                <Activity className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                    Symulacje Monte Carlo
                                </h1>
                                <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                                    Historia uruchomionych symulacji probabilistycznych
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="relative grid grid-cols-4 gap-4 mt-6">
                        {[
                            { label: 'Wszystkie', value: stats.total, color: 'violet', icon: <BarChart3 className="w-4 h-4" /> },
                            { label: 'Ukończone', value: stats.completed, color: 'emerald', icon: <CheckCircle2 className="w-4 h-4" /> },
                            { label: 'Oczekujące', value: stats.pending, color: 'amber', icon: <Clock className="w-4 h-4" /> },
                            { label: 'Błędy', value: stats.failed, color: 'red', icon: <XCircle className="w-4 h-4" /> },
                        ].map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <span className={cn(
                                        stat.color === 'violet' && 'text-violet-400',
                                        stat.color === 'emerald' && 'text-emerald-400',
                                        stat.color === 'amber' && 'text-amber-400',
                                        stat.color === 'red' && 'text-red-400'
                                    )}>
                                        {stat.icon}
                                    </span>
                                    <p className={cn(
                                        'text-3xl font-bold',
                                        stat.color === 'violet' && 'text-violet-400',
                                        stat.color === 'emerald' && 'text-emerald-400',
                                        stat.color === 'amber' && 'text-amber-400',
                                        stat.color === 'red' && 'text-red-400'
                                    )}>
                                        {stat.value}
                                    </p>
                                </div>
                                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder="Szukaj po nazwie modelu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftAddon={<Search className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex items-center gap-1 p-1.5 bg-[hsl(var(--surface-1))] rounded-xl border border-[hsl(var(--border-subtle))]">
                        {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                    statusFilter === status
                                        ? 'bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 text-white shadow-lg shadow-[hsl(var(--accent-primary))]/25'
                                        : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
                                )}
                            >
                                {status === 'all' ? 'Wszystkie' : statusConfig[status]?.label || status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-[hsl(var(--accent-primary))]/20" />
                                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[hsl(var(--accent-primary))] animate-spin" />
                            </div>
                            <p className="text-[hsl(var(--text-muted))]">Ładowanie symulacji...</p>
                        </div>
                    </div>
                )}

                {/* Simulations Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSimulations.map((sim) => {
                            const config = statusConfig[sim.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <Link key={sim.id} href={`/simulations/${sim.id}`}>
                                    <Card className={cn(
                                        'h-full transition-all cursor-pointer group overflow-hidden',
                                        'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/25',
                                        'border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--accent-primary))]/50'
                                    )}>
                                        <CardContent className="pt-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        'w-10 h-10 rounded-xl flex items-center justify-center',
                                                        config.bgColor
                                                    )}>
                                                        <StatusIcon className={cn(
                                                            'w-5 h-5',
                                                            config.color,
                                                            sim.status === 'running' && 'animate-spin'
                                                        )} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold group-hover:text-[hsl(var(--accent-primary))] transition-colors line-clamp-1">
                                                            {sim.model_name || `Symulacja ${sim.id.slice(0, 8)}`}
                                                        </p>
                                                        <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                                            {typeLabels[sim.run_type] || sim.run_type}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    'px-2.5 py-1 text-xs font-semibold rounded-full ring-1',
                                                    sim.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
                                                    sim.status === 'pending' && 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
                                                    sim.status === 'running' && 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
                                                    sim.status === 'failed' && 'bg-red-500/15 text-red-400 ring-red-500/30'
                                                )}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            {/* Stats grid */}
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <div className="p-2.5 bg-[hsl(var(--surface-2))] rounded-lg text-center">
                                                    <p className="text-xs text-[hsl(var(--text-muted))]">Iteracje</p>
                                                    <p className="text-sm font-bold font-mono mt-0.5">
                                                        {formatNumber(sim.n_simulations, { compact: true })}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 bg-[hsl(var(--surface-2))] rounded-lg text-center">
                                                    <p className="text-xs text-[hsl(var(--text-muted))]">Czas</p>
                                                    <p className="text-sm font-bold font-mono mt-0.5">
                                                        {sim.compute_time_seconds !== null
                                                            ? `${sim.compute_time_seconds}s`
                                                            : '—'
                                                        }
                                                    </p>
                                                </div>
                                                <div className="p-2.5 bg-[hsl(var(--surface-2))] rounded-lg text-center">
                                                    <p className="text-xs text-[hsl(var(--text-muted))]">Typ</p>
                                                    <p className="text-sm font-bold mt-0.5">
                                                        MC
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Error message */}
                                            {sim.status === 'failed' && sim.error_message && (
                                                <div className="p-2 bg-red-500/10 rounded-lg mb-4 border border-red-500/20">
                                                    <p className="text-xs text-red-400 line-clamp-2">
                                                        {sim.error_message}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Footer */}
                                            <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))] pt-3 border-t border-[hsl(var(--border-subtle))]">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(sim.started_at, 'long')}
                                                </div>
                                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--accent-primary))]" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {/* Empty state */}
                        {filteredSimulations.length === 0 && !loading && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
                                    <BarChart3 className="w-10 h-10 text-[hsl(var(--text-muted))]" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">
                                    {searchQuery ? 'Brak wyników' : 'Brak symulacji'}
                                </h3>
                                <p className="text-sm text-[hsl(var(--text-muted))] max-w-sm mb-6">
                                    {searchQuery
                                        ? 'Nie znaleziono symulacji pasujących do wyszukiwania'
                                        : 'Uruchom pierwszą symulację z poziomu modelu'
                                    }
                                </p>
                                {!searchQuery && (
                                    <Link href="/models">
                                        <Button
                                            className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90"
                                            leftIcon={<Play className="w-4 h-4" />}
                                        >
                                            Przejdź do modeli
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
