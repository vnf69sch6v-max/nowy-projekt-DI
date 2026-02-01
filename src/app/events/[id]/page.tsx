// @ts-nocheck
'use client';

// =============================================
// EventProb Engine - Event Detail Page (API Connected)
// =============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ProbabilityGauge } from '@/components/events/ProbabilityGauge';
import { CopulaScatterPlot, CopulaComparison } from '@/components/events/CopulaScatterPlot';
import { cn } from '@/lib/utils';
import {
    runEventSimulationWithComparison,
    sampleFromCopula,
    MersenneTwister,
    type EventDefinition,
    type EventVariable,
    type EventProbabilityResult,
    type CopulaConfig
} from '@/lib/engine';
import {
    ArrowLeft,
    RefreshCw,
    Download,
    Loader2,
    AlertTriangle,
    Zap
} from 'lucide-react';

// Types for API response
interface EventFromAPI {
    id: string;
    name: string;
    description: string | null;
    event_type: 'threshold_breach' | 'compound' | 'conditional' | 'sequence' | 'at_least_k';
    definition_json: EventDefinition;
    horizon_months: number;
    current_probability: number | null;
    current_ci_lower: number | null;
    current_ci_upper: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    last_computed_at: string | null;
    event_variables: {
        id: string;
        variable_name: string;
        variable_label: string | null;
        sde_model: 'gbm' | 'ornstein_uhlenbeck' | 'heston' | 'merton_jump';
        sde_parameters: Record<string, number>;
        initial_value: number;
        data_frequency: string;
    }[];
    copula_specifications: {
        id: string;
        copula_family: string;
        parameters: Record<string, number>;
        tail_dependence: { lambda_lower?: number; lambda_upper?: number } | null;
    }[];
    bayesian_versions: {
        id: string;
        version_number: string;
        probability_estimate: { mean: number; ci_90?: [number, number] };
        computed_at: string;
        notes: string | null;
    }[];
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params?.id as string;

    const [event, setEvent] = useState<EventFromAPI | null>(null);
    const [activeTab, setActiveTab] = useState<'probability' | 'history' | 'dependencies'>('probability');
    const [result, setResult] = useState<EventProbabilityResult | null>(null);
    const [copulaSamples, setCopulaSamples] = useState<{
        gaussian: [number, number][];
        clayton: [number, number][];
        gumbel: [number, number][];
        student_t: [number, number][];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch event from API
    const fetchEvent = useCallback(async () => {
        if (!eventId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/events/${eventId}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Zdarzenie nie zostało znalezione');
                throw new Error('Błąd pobierania zdarzenia');
            }
            const data = await res.json();
            setEvent(data.event);
        } catch (err) {
            console.error('Fetch event error:', err);
            setError(err instanceof Error ? err.message : 'Nieznany błąd');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    // Run simulation for this event
    const runSimulation = useCallback(async () => {
        if (!event) return;

        setIsSimulating(true);
        try {
            // Convert API variables to engine format
            const variables: EventVariable[] = event.event_variables.map(v => ({
                name: v.variable_name,
                label: v.variable_label || v.variable_name,
                sde_model: v.sde_model,
                parameters: v.sde_parameters,
                initial_value: v.initial_value,
                data_frequency: v.data_frequency as any
            }));

            const copulaSpec = event.copula_specifications?.[0];

            // Run simulation with comparison
            const simResult = runEventSimulationWithComparison(
                event.definition_json,
                variables,
                {
                    n_scenarios: 10000,
                    horizon_months: event.horizon_months || 12,
                    dt_months: 1,
                    discretization: 'milstein',
                    use_copula_noise: !!copulaSpec,
                    copula_config: copulaSpec ? {
                        type: copulaSpec.copula_family as any,
                        ...copulaSpec.parameters
                    } : undefined,
                    random_seed: 42
                }
            );
            setResult(simResult);

            // Generate copula samples for visualization
            const rng = new MersenneTwister(42);
            const n = 2000;

            const gaussianConfig: CopulaConfig = { type: 'gaussian', correlationMatrix: [[1, 0.5], [0.5, 1]] };
            const claytonConfig: CopulaConfig = { type: 'clayton', theta: copulaSpec?.parameters?.theta || 2.0 };
            const gumbelConfig: CopulaConfig = { type: 'gumbel', theta: 2.0 };
            const tConfig: CopulaConfig = { type: 't', correlationMatrix: [[1, 0.5], [0.5, 1]], degreesOfFreedom: 4 };

            setCopulaSamples({
                gaussian: sampleFromCopula(rng, gaussianConfig, n) as [number, number][],
                clayton: sampleFromCopula(rng, claytonConfig, n) as [number, number][],
                gumbel: sampleFromCopula(rng, gumbelConfig, n) as [number, number][],
                student_t: sampleFromCopula(rng, tConfig, n) as [number, number][]
            });

        } catch (error) {
            console.error('Simulation error:', error);
        } finally {
            setIsSimulating(false);
        }
    }, [event]);

    // Fetch event on mount
    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    // Run simulation when event is loaded
    useEffect(() => {
        if (event && !result && !isSimulating) {
            runSimulation();
        }
    }, [event, result, isSimulating, runSimulation]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[hsl(var(--surface-0))] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                    <p className="text-[hsl(var(--text-muted))]">Ładowanie zdarzenia...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-[hsl(var(--surface-0))] flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Błąd</h2>
                    <p className="text-[hsl(var(--text-muted))] mb-6">{error || 'Zdarzenie nie zostało znalezione'}</p>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/events')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Wróć do listy
                    </Button>
                </div>
            </div>
        );
    }

    // Convert versions to UI format
    const versions = event.bayesian_versions?.map(v => ({
        version: v.version_number,
        date: new Date(v.computed_at).toISOString().split('T')[0],
        probability: v.probability_estimate?.mean || 0,
        notes: v.notes || ''
    })) || [];

    return (
        <div className="min-h-screen bg-[hsl(var(--surface-0))] text-[hsl(var(--text-primary))]">
            {/* Header */}
            <header className="bg-[hsl(var(--surface-0)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--border-subtle))] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/events')}
                            className="p-2 rounded-lg hover:bg-[hsl(var(--surface-1))] text-[hsl(var(--text-muted))]">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                {event.name}
                            </h1>
                            <p className="text-sm text-[hsl(var(--text-muted))]">
                                {event.description || 'Brak opisu'}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={runSimulation}
                            disabled={isSimulating}
                            leftIcon={isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        >
                            {isSimulating ? 'Obliczanie...' : 'Aktualizuj dane'}
                        </Button>
                        <Button leftIcon={<Download className="w-4 h-4" />}>
                            Eksportuj PDF
                        </Button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-[hsl(var(--surface-1))] border-b border-[hsl(var(--border-subtle))]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {[
                            { id: 'probability' as const, label: 'Prawdopodobieństwo', icon: '📊' },
                            { id: 'history' as const, label: 'Historia Bayesa', icon: '📈' },
                            { id: 'dependencies' as const, label: 'Zależności', icon: '🔗' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    activeTab === tab.id
                                        ? 'border-orange-500 text-orange-400'
                                        : 'border-transparent text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
                                )}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {isSimulating && !result ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            <p className="text-[hsl(var(--text-muted))]">Obliczanie prawdopodobieństwa...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'probability' && result && (
                            <ProbabilityTab result={result} event={event} />
                        )}

                        {activeTab === 'history' && (
                            <HistoryTab versions={versions} />
                        )}

                        {activeTab === 'dependencies' && copulaSamples && result && (
                            <DependenciesTab
                                copulaSamples={copulaSamples}
                                result={result}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// =============================================
// Tab Components
// =============================================

interface Version {
    version: string;
    date: string;
    probability: number;
    notes: string;
}

function ProbabilityTab({ result, event }: { result: EventProbabilityResult; event: EventFromAPI }) {
    return (
        <div className="space-y-8">
            {/* Main gauge and stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gauge */}
                <div className="lg:col-span-1 bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))] flex flex-col items-center justify-center">
                    <ProbabilityGauge
                        probability={result.probability.mean}
                        ciLower={result.probability.ci_90[0]}
                        ciUpper={result.probability.ci_90[1]}
                        size="lg"
                        showLabel={true}
                    />
                    <p className="mt-4 text-sm text-[hsl(var(--text-muted))] text-center">
                        Na podstawie {result.n_scenarios.toLocaleString()} symulacji MC
                    </p>
                </div>

                {/* Decomposition */}
                <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
                    <h3 className="text-lg font-semibold mb-4">Dekompozycja</h3>
                    <div className="space-y-3">
                        {Object.entries(result.decomposition.per_variable).map(([name, prob]) => (
                            <div key={name} className="flex items-center justify-between">
                                <span className="text-sm text-[hsl(var(--text-muted))]">P({name} przekracza próg)</span>
                                <span className="font-mono font-medium">
                                    {((prob as number) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-[hsl(var(--border-subtle))] pt-3 mt-3">
                            <div className="flex items-center justify-between text-[hsl(var(--text-muted))]">
                                <span className="text-sm">P(niezależne)</span>
                                <span className="font-mono">{(result.decomposition.joint_independent * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-orange-400 font-medium mt-2">
                                <span className="text-sm">P(z kopułą)</span>
                                <span className="font-mono">{(result.decomposition.joint_copula * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk multiplier */}
                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl p-6 border border-red-500/30">
                    <h3 className="text-lg font-semibold text-red-400 mb-4">Mnożnik Ryzyka Kopuły</h3>
                    <div className="text-center">
                        <div className="text-5xl font-bold text-red-400">
                            {result.decomposition.copula_risk_multiplier.toFixed(1)}×
                        </div>
                        <p className="mt-2 text-sm text-red-400/80">
                            wyższe ryzyko niż przy założeniu niezależności
                        </p>
                    </div>
                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-300">
                            Kopuła ujmuje "efekt rozlewania kryzysu" —
                            gdy jedna zmienna się pogarsza, prawdopodobieństwo kryzysu w drugiej również rośnie.
                        </p>
                    </div>
                </div>
            </div>

            {/* Model comparison */}
            {result.model_comparison && (
                <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
                    <h3 className="text-lg font-semibold mb-4">Porównanie modeli kopuł</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { name: 'Gaussian', prob: result.model_comparison.gaussian, lambda: '0.00', recommended: false },
                            { name: 'Clayton', prob: result.model_comparison.clayton, lambda: '0.41', recommended: true },
                            { name: 'Gumbel', prob: result.model_comparison.gumbel, lambda: '0.35', recommended: false },
                            { name: 't-Student', prob: result.model_comparison.student_t, lambda: '0.25', recommended: false }
                        ].map(model => (
                            <div
                                key={model.name}
                                className={cn(
                                    'p-4 rounded-xl text-center',
                                    model.recommended
                                        ? 'bg-orange-500/10 border-2 border-orange-500/50'
                                        : 'bg-[hsl(var(--surface-2))]'
                                )}
                            >
                                <div className="text-sm font-medium text-[hsl(var(--text-muted))]">{model.name}</div>
                                <div className={cn(
                                    'text-2xl font-bold mt-1',
                                    model.recommended ? 'text-orange-400' : ''
                                )}>
                                    {(model.prob * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-[hsl(var(--text-muted))] mt-1">λ = {model.lambda}</div>
                                {model.recommended && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                                        Rekomendowany
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Percentiles */}
            <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
                <h3 className="text-lg font-semibold mb-4">Rozkład na horyzoncie</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[hsl(var(--border-subtle))]">
                                <th className="text-left py-2 text-sm font-medium text-[hsl(var(--text-muted))]">Zmienna</th>
                                <th className="text-center py-2 text-sm font-medium text-[hsl(var(--text-muted))]">P5</th>
                                <th className="text-center py-2 text-sm font-medium text-[hsl(var(--text-muted))]">P25</th>
                                <th className="text-center py-2 text-sm font-medium text-[hsl(var(--text-muted))]">P50 (mediana)</th>
                                <th className="text-center py-2 text-sm font-medium text-[hsl(var(--text-muted))]">P75</th>
                                <th className="text-center py-2 text-sm font-medium text-[hsl(var(--text-muted))]">P95</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(result.percentiles).map(([name, p]) => (
                                <tr key={name} className="border-b border-[hsl(var(--border-subtle))]">
                                    <td className="py-3 font-medium">{name}</td>
                                    <td className="text-center font-mono text-[hsl(var(--text-muted))]">{p.p5.toFixed(3)}</td>
                                    <td className="text-center font-mono text-[hsl(var(--text-muted))]">{p.p25.toFixed(3)}</td>
                                    <td className="text-center font-mono font-medium">{p.p50.toFixed(3)}</td>
                                    <td className="text-center font-mono text-[hsl(var(--text-muted))]">{p.p75.toFixed(3)}</td>
                                    <td className="text-center font-mono text-[hsl(var(--text-muted))]">{p.p95.toFixed(3)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HistoryTab({ versions }: { versions: Version[] }) {
    if (versions.length === 0) {
        return (
            <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-12 text-center border border-[hsl(var(--border-subtle))]">
                <Zap className="w-12 h-12 text-orange-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak historii</h3>
                <p className="text-[hsl(var(--text-muted))]">
                    Historia aktualizacji Bayesowskich pojawi się po pierwszej aktualizacji
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
            <h3 className="text-lg font-semibold mb-6">Historia Aktualizacji Bayesowskich</h3>
            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[hsl(var(--border-subtle))]" />
                <div className="space-y-6">
                    {versions.map((v, i) => (
                        <div key={v.version} className="relative pl-10">
                            <div className={cn(
                                'absolute left-2 w-4 h-4 rounded-full border-2',
                                i === 0
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'bg-[hsl(var(--surface-1))] border-[hsl(var(--border-subtle))]'
                            )} />
                            <div className="bg-[hsl(var(--surface-2))] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{v.version}</span>
                                    <span className="text-sm text-[hsl(var(--text-muted))]">{v.date}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-orange-400">
                                        {(v.probability * 100).toFixed(1)}%
                                    </span>
                                    {i < versions.length - 1 && (
                                        <span className={cn(
                                            'text-xs px-2 py-0.5 rounded',
                                            v.probability > versions[i + 1].probability
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-emerald-500/20 text-emerald-400'
                                        )}>
                                            {v.probability > versions[i + 1].probability ? '↑' : '↓'}
                                            {Math.abs((v.probability - versions[i + 1].probability) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-[hsl(var(--text-muted))] mt-2">{v.notes}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DependenciesTab({
    copulaSamples,
    result
}: {
    copulaSamples: {
        gaussian: [number, number][];
        clayton: [number, number][];
        gumbel: [number, number][];
        student_t: [number, number][];
    };
    result: EventProbabilityResult;
}) {
    return (
        <div className="space-y-8">
            {/* Copula Comparison */}
            <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
                <h3 className="text-lg font-semibold mb-4">Porównanie Kopuł — Scatter Plots</h3>
                <CopulaComparison samples={copulaSamples} size={200} />
            </div>

            {/* Tail Dependence */}
            <div className="bg-[hsl(var(--surface-1))] rounded-2xl p-6 border border-[hsl(var(--border-subtle))]">
                <h3 className="text-lg font-semibold mb-4">Zależność w ogonach (Tail Dependence)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { name: 'Gaussian', lower: 0, upper: 0 },
                        { name: 'Clayton', lower: 0.41, upper: 0 },
                        { name: 'Gumbel', lower: 0, upper: 0.35 },
                        { name: 't-Student', lower: 0.25, upper: 0.25 }
                    ].map(td => (
                        <div key={td.name} className="bg-[hsl(var(--surface-2))] rounded-xl p-4 text-center">
                            <div className="text-sm font-medium text-[hsl(var(--text-muted))] mb-2">{td.name}</div>
                            <div className="flex justify-center gap-4">
                                <div>
                                    <div className="text-xs text-[hsl(var(--text-muted))]">λ↓</div>
                                    <div className="text-lg font-bold text-blue-400">{td.lower.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[hsl(var(--text-muted))]">λ↑</div>
                                    <div className="text-lg font-bold text-red-400">{td.upper.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-sm text-[hsl(var(--text-muted))]">
                    <strong>λ↓ (lower tail)</strong>: prawdopodobieństwo jednoczesnych ekstremalnie niskich wartości<br />
                    <strong>λ↑ (upper tail)</strong>: prawdopodobieństwo jednoczesnych ekstremalnie wysokich wartości
                </p>
            </div>
        </div>
    );
}
