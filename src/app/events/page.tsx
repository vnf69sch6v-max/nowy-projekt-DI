'use client';

// =============================================
// EventProb Engine Dashboard (No Mock Data)
// Connected to Supabase via API
// =============================================

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { EventCreatorModal } from '@/components/events/EventCreatorModal';
import { cn } from '@/lib/utils';
import {
    Plus,
    AlertTriangle,
    ShieldAlert,
    ShieldCheck,
    Activity,
    ChevronRight,
    Zap,
    RefreshCw,
    Loader2
} from 'lucide-react';

// Event type from API
interface Event {
    id: string;
    name: string;
    description: string | null;
    event_type: 'threshold_breach' | 'compound' | 'conditional' | 'sequence' | 'at_least_k';
    probability: number;
    ci_lower: number;
    ci_upper: number;
    copula: string | null;
    lambda_lower: number | null;
    last_updated: string;
    version: string;
}

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    // Fetch events from API
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/events');
            if (!res.ok) throw new Error('Failed to fetch events');
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            console.error('Fetch events error:', err);
            setError('Nie udało się pobrać zdarzeń. Sprawdź połączenie z bazą danych.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleCreateEvent = useCallback(() => {
        setIsCreatorOpen(true);
    }, []);

    const handleEventCreated = useCallback((newEvent: Event) => {
        setEvents(prev => [newEvent, ...prev]);
        setIsCreatorOpen(false);
    }, []);

    const handleEventClick = useCallback((eventId: string) => {
        router.push(`/events/${eventId}`);
    }, [router]);

    const highRiskCount = events.filter(e => e.probability > 0.4).length;
    const mediumRiskCount = events.filter(e => e.probability >= 0.15 && e.probability <= 0.4).length;
    const lowRiskCount = events.filter(e => e.probability < 0.15).length;

    return (
        <div className="min-h-screen bg-[hsl(var(--surface-0))] text-[hsl(var(--text-primary))]">
            {/* Premium Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[hsl(var(--surface-0)/0.8)] border-b border-[hsl(var(--border-subtle))]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                EventProb Engine
                            </h1>
                            <p className="text-xs text-[hsl(var(--text-muted))]">
                                Prawdopodobieństwa zdarzeń finansowych
                            </p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-1 p-1 bg-[hsl(var(--surface-1))] rounded-xl">
                        {[
                            { href: '/', label: 'Dashboard' },
                            { href: '/models', label: 'Modele' },
                            { href: '/simulations', label: 'Symulacje' },
                            { href: '/events', label: 'EventProb', active: true },
                            { href: '/backtesting', label: 'Backtesting' },
                        ].map((item) => (
                            <Link key={item.href} href={item.href}>
                                <button className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                    item.active
                                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25'
                                        : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
                                )}>
                                    {item.label}
                                </button>
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={fetchEvents}
                            className="text-[hsl(var(--text-muted))]"
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Odśwież
                        </Button>
                        <Button
                            onClick={handleCreateEvent}
                            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 shadow-lg shadow-orange-500/25"
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Nowe Zdarzenie
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Monitorowane zdarzenia"
                        value={events.length}
                        icon={<Activity className="w-5 h-5" />}
                        color="blue"
                    />
                    <StatCard
                        label="Wysokie ryzyko (>40%)"
                        value={highRiskCount}
                        icon={<ShieldAlert className="w-5 h-5" />}
                        color="red"
                    />
                    <StatCard
                        label="Średnie ryzyko (15-40%)"
                        value={mediumRiskCount}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        color="amber"
                    />
                    <StatCard
                        label="Niskie ryzyko (<15%)"
                        value={lowRiskCount}
                        icon={<ShieldCheck className="w-5 h-5" />}
                        color="emerald"
                    />
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                            <p className="text-[hsl(var(--text-muted))]">Ładowanie zdarzeń...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-400">{error}</p>
                        <Button
                            variant="ghost"
                            onClick={fetchEvents}
                            className="mt-4 text-red-400"
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && events.length === 0 && (
                    <div className="bg-[hsl(var(--surface-1))] border border-[hsl(var(--border-subtle))] rounded-2xl p-12 text-center">
                        <Zap className="w-16 h-16 text-orange-500/50 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Brak zdarzeń</h3>
                        <p className="text-[hsl(var(--text-muted))] mb-6">
                            Stwórz pierwsze zdarzenie, aby rozpocząć monitorowanie ryzyka
                        </p>
                        <Button
                            onClick={handleCreateEvent}
                            className="bg-gradient-to-r from-orange-500 to-pink-500"
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Nowe Zdarzenie
                        </Button>
                    </div>
                )}

                {/* Events Grid */}
                {!isLoading && !error && events.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <EventCardPremium
                                key={event.id}
                                event={event}
                                onClick={() => handleEventClick(event.id)}
                            />
                        ))}

                        {/* Add Event Card */}
                        <button
                            onClick={handleCreateEvent}
                            className="group border-2 border-dashed border-[hsl(var(--border-subtle))] rounded-2xl p-8 flex flex-col items-center justify-center text-[hsl(var(--text-muted))] hover:border-orange-500/50 hover:text-orange-400 transition-all duration-300 min-h-[280px] bg-[hsl(var(--surface-1)/0.5)]"
                        >
                            <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-2))] group-hover:bg-orange-500/10 flex items-center justify-center text-3xl mb-4 transition-colors">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-medium">Dodaj nowe zdarzenie</span>
                            <span className="text-sm mt-1">Kliknij aby utworzyć</span>
                        </button>
                    </div>
                )}
            </main>

            {/* Event Creator Modal */}
            {isCreatorOpen && (
                <EventCreatorModal
                    isOpen={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    onCreated={handleEventCreated}
                />
            )}
        </div>
    );
}

// Premium Stat Card Component
function StatCard({
    label,
    value,
    icon,
    color
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'red' | 'amber' | 'emerald';
}) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl p-5 border transition-all hover:scale-[1.02] cursor-pointer',
                'bg-gradient-to-br',
                color === 'blue' && 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40',
                color === 'red' && 'from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/40',
                color === 'amber' && 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
                color === 'emerald' && 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
            )}
        >
            <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                color === 'blue' && 'bg-blue-500/20 text-blue-400',
                color === 'red' && 'bg-red-500/20 text-red-400',
                color === 'amber' && 'bg-amber-500/20 text-amber-400',
                color === 'emerald' && 'bg-emerald-500/20 text-emerald-400'
            )}>
                {icon}
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-medium mt-1">
                {label}
            </p>
        </div>
    );
}

// Premium Event Card Component
function EventCardPremium({
    event,
    onClick
}: {
    event: Event;
    onClick: () => void;
}) {
    const getRiskColor = (prob: number) => {
        if (prob >= 0.4) return 'red';
        if (prob >= 0.15) return 'amber';
        return 'emerald';
    };

    const riskColor = getRiskColor(event.probability);
    const riskLabel = event.probability >= 0.4 ? 'Wysokie ryzyko' :
        event.probability >= 0.15 ? 'Średnie ryzyko' : 'Niskie ryzyko';

    const eventTypeLabel = {
        'threshold_breach': 'PROG',
        'compound': 'ZŁOŻONE',
        'at_least_k': 'K Z N',
        'conditional': 'WARUNK',
        'sequence': 'SEKW'
    }[event.event_type] || 'ZDARZENIE';

    const eventTypeIcon = {
        'threshold_breach': '📈',
        'compound': '🔀',
        'at_least_k': '🎯',
        'conditional': '⚡',
        'sequence': '⏱️'
    }[event.event_type] || '📊';

    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all hover:scale-[1.02]',
                'bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-0))]',
                riskColor === 'red' && 'border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10',
                riskColor === 'amber' && 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10',
                riskColor === 'emerald' && 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{eventTypeIcon}</span>
                    <span className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">
                        {eventTypeLabel}
                    </span>
                    <span className="text-xs text-[hsl(var(--text-muted))]">• {event.version}</span>
                </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-1 group-hover:text-white transition-colors">
                {event.name}
            </h3>
            <p className="text-sm text-[hsl(var(--text-muted))] mb-4 line-clamp-2">
                {event.description || 'Brak opisu'}
            </p>

            {/* Probability Gauge */}
            <div className="flex items-center justify-center py-4">
                <div className="relative">
                    <svg width="120" height="60" viewBox="0 0 120 60">
                        {/* Background arc */}
                        <path
                            d="M 10 55 A 50 50 0 0 1 110 55"
                            fill="none"
                            stroke="hsl(var(--surface-2))"
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                        {/* Value arc */}
                        <path
                            d="M 10 55 A 50 50 0 0 1 110 55"
                            fill="none"
                            stroke={riskColor === 'red' ? '#ef4444' : riskColor === 'amber' ? '#f59e0b' : '#10b981'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${event.probability * 157} 157`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                        <span className={cn(
                            'text-2xl font-bold',
                            riskColor === 'red' && 'text-red-400',
                            riskColor === 'amber' && 'text-amber-400',
                            riskColor === 'emerald' && 'text-emerald-400'
                        )}>
                            {Math.round(event.probability * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Confidence Interval */}
            <div className="text-center mb-3">
                <span className="text-xs text-[hsl(var(--text-muted))]">
                    [{Math.round(event.ci_lower * 100)}% — {Math.round(event.ci_upper * 100)}%]
                </span>
                <div className={cn(
                    'text-xs font-medium mt-1',
                    riskColor === 'red' && 'text-red-400',
                    riskColor === 'amber' && 'text-amber-400',
                    riskColor === 'emerald' && 'text-emerald-400'
                )}>
                    {riskLabel}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))] pt-3 border-t border-[hsl(var(--border-subtle))]">
                <span>Kopuła: {event.copula || '—'}</span>
                <span>λ↓: {event.lambda_lower?.toFixed(2) || '—'}</span>
            </div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-1">
                Aktualizacja: {new Date(event.last_updated).toLocaleDateString('pl-PL')}
            </div>

            {/* Hover indicator */}
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
