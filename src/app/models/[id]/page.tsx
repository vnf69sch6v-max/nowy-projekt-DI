'use client';

// =============================================
// StochFin: Model Editor Page (Premium Design)
// =============================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { RiskBadge, getRiskLevelFromProbability } from '@/components/ui/RiskBadge';
import { DistributionInput } from '@/components/distribution/DistributionInput';
import { CorrelationHeatmap } from '@/components/charts/HeatMap';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
    ArrowLeft,
    Play,
    Save,
    Plus,
    TrendingUp,
    BarChart3,
    Link2,
    Trash2,
    Edit2,
    Calculator,
    Loader2,
    Clock,
    CheckCircle2,
    Activity,
    Zap,
    ChevronRight,
    Target,
    AlertTriangle
} from 'lucide-react';

interface Model {
    id: string;
    name: string;
    description?: string;
    entity_name?: string;
    status: string;
    forecast_start_date?: string;
    forecast_periods?: number;
    time_step_months?: number;
    n_simulations?: number;
    created_at: string;
    updated_at: string;
}

interface Variable {
    id: string;
    code: string;
    name_pl: string;
    name_en?: string;
    unit?: string;
    process_type: string;
    process_params: Record<string, number>;
    is_output?: boolean;
}

interface Simulation {
    id: string;
    status: string;
    n_simulations: number;
    started_at: string;
    compute_time_seconds?: number;
}

const DEMO_CORRELATION_VARS = ['REV', 'COGS', 'OPEX'];
const DEMO_CORRELATION_MATRIX = [
    [1.00, 0.75, 0.35],
    [0.75, 1.00, 0.25],
    [0.35, 0.25, 1.00]
];

export default function ModelEditorPage() {
    const params = useParams();
    const router = useRouter();
    const modelId = params.id as string;

    const [model, setModel] = useState<Model | null>(null);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'assumptions' | 'correlations' | 'simulations'>('assumptions');
    const [editingAssumption, setEditingAssumption] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    // Fetch model data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch model
                const modelRes = await fetch(`/api/models/${modelId}`);
                const modelJson = await modelRes.json();
                if (modelJson.error) {
                    setError(modelJson.error);
                    return;
                }
                setModel(modelJson.data);

                // Fetch variables
                const varsRes = await fetch(`/api/models/${modelId}/variables`);
                const varsJson = await varsRes.json();
                if (varsJson.data) {
                    setVariables(varsJson.data);
                }

                // Fetch simulations
                const simsRes = await fetch(`/api/simulations?model_id=${modelId}`);
                const simsJson = await simsRes.json();
                if (simsJson.data) {
                    setSimulations(simsJson.data);
                }
            } catch {
                setError('Nie udało się pobrać danych modelu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [modelId]);

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        try {
            // Create simulation
            const createRes = await fetch('/api/simulations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: modelId,
                    n_simulations: model?.n_simulations || 500,
                    run_type: 'full_monte_carlo'
                })
            });
            const createJson = await createRes.json();

            if (createJson.data?.id) {
                // Run simulation
                const runRes = await fetch(`/api/simulations/${createJson.data.id}/run`, {
                    method: 'POST'
                });
                const runJson = await runRes.json();

                if (runJson.data) {
                    router.push(`/simulations/${createJson.data.id}`);
                }
            }
        } catch {
            setError('Błąd podczas uruchamiania symulacji');
        } finally {
            setIsSimulating(false);
        }
    };

    const getProcessDescription = (variable: Variable) => {
        const p = variable.process_params;
        switch (variable.process_type) {
            case 'gbm':
                return `GBM: μ=${((p.drift || 0) * 100).toFixed(1)}%, σ=${((p.volatility || 0) * 100).toFixed(1)}%`;
            case 'ornstein_uhlenbeck':
                return `O-U: θ=${(p.theta || 0).toFixed(2)}, μ=${((p.mu || 0) * 100).toFixed(1)}%`;
            case 'normal':
                return `Normal: μ=${((p.mean || 0) * 100).toFixed(1)}%, σ=${((p.std || 0) * 100).toFixed(1)}%`;
            case 'pert':
                return `PERT: ${((p.pessimistic || 0) * 100).toFixed(0)}% / ${((p.most_likely || 0) * 100).toFixed(0)}% / ${((p.optimistic || 0) * 100).toFixed(0)}%`;
            default:
                return variable.process_type;
        }
    };

    const getVariableColor = (index: number) => {
        const colors = ['emerald', 'blue', 'violet', 'amber'];
        return colors[index % colors.length];
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
                        <p className="text-[hsl(var(--text-muted))]">Ładowanie modelu...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (error || !model) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-red-400 font-medium">{error || 'Nie znaleziono modelu'}</p>
                    <Link href="/models">
                        <Button variant="secondary">Powrót do listy</Button>
                    </Link>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))] border border-[hsl(var(--border-subtle))] p-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <Link href="/models">
                                <Button variant="ghost" size="icon" className="mt-1">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                        {model.name}
                                    </h1>
                                    <span className={cn(
                                        'px-3 py-1 text-xs font-medium rounded-full',
                                        model.status === 'active'
                                            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                            : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                                    )}>
                                        {model.status === 'active' ? 'Aktywny' : 'Draft'}
                                    </span>
                                </div>
                                {model.entity_name && (
                                    <p className="text-sm text-[hsl(var(--text-muted))]">
                                        {model.entity_name}
                                    </p>
                                )}

                                {/* Stats row */}
                                <div className="flex items-center gap-6 mt-4 text-sm">
                                    <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                        <Activity className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                        <span className="font-mono">{variables.length}</span>
                                        <span className="text-[hsl(var(--text-muted))]">zmiennych</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                        <Target className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                        <span className="font-mono">{model.forecast_periods || 0}</span>
                                        <span className="text-[hsl(var(--text-muted))]">okresów</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                        <Zap className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                        <span className="font-mono">{formatNumber(model.n_simulations || 500, { compact: true })}</span>
                                        <span className="text-[hsl(var(--text-muted))]">iteracji</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
                                        <Clock className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                        {formatDate(model.updated_at, 'long')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="secondary" leftIcon={<Save className="w-4 h-4" />}>
                                Zapisz
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90 shadow-lg shadow-[hsl(var(--accent-primary))]/25"
                                leftIcon={isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                onClick={handleRunSimulation}
                                disabled={isSimulating || variables.length === 0}
                            >
                                {isSimulating ? 'Uruchamiam...' : `Symulacja`}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Premium Tabs */}
                <div className="flex items-center gap-1 p-1.5 bg-[hsl(var(--surface-1))] rounded-xl w-fit border border-[hsl(var(--border-subtle))]">
                    {[
                        { id: 'assumptions', label: 'Założenia', icon: <TrendingUp className="w-4 h-4" /> },
                        { id: 'correlations', label: 'Korelacje', icon: <Link2 className="w-4 h-4" /> },
                        { id: 'simulations', label: 'Symulacje', icon: <BarChart3 className="w-4 h-4" /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
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

                {/* Assumptions Tab */}
                {activeTab === 'assumptions' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Variables List */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Zmienne stochastyczne</h2>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => setEditingAssumption('new')}
                                >
                                    Dodaj zmienną
                                </Button>
                            </div>

                            {variables.length === 0 ? (
                                <Card className="py-12">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
                                            <Activity className="w-8 h-8 text-[hsl(var(--text-muted))]" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">Brak zmiennych</h3>
                                        <p className="text-sm text-[hsl(var(--text-muted))] max-w-sm mb-4">
                                            Dodaj zmienne stochastyczne, aby móc uruchomić symulację Monte Carlo
                                        </p>
                                        <Button
                                            variant="secondary"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                            onClick={() => setEditingAssumption('new')}
                                        >
                                            Dodaj pierwszą zmienną
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {variables.map((variable, index) => {
                                        const color = getVariableColor(index);

                                        return (
                                            <Card
                                                key={variable.id}
                                                padding="sm"
                                                className="hover:border-[hsl(var(--accent-primary))]/50 transition-all group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-10 h-10 rounded-xl flex items-center justify-center',
                                                            color === 'emerald' && 'bg-emerald-500/20',
                                                            color === 'blue' && 'bg-blue-500/20',
                                                            color === 'violet' && 'bg-violet-500/20',
                                                            color === 'amber' && 'bg-amber-500/20'
                                                        )}>
                                                            {color === 'emerald' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                                                            {color === 'blue' && <Activity className="w-5 h-5 text-blue-400" />}
                                                            {color === 'violet' && <Target className="w-5 h-5 text-violet-400" />}
                                                            {color === 'amber' && <Zap className="w-5 h-5 text-amber-400" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{variable.name_pl}</span>
                                                                <span className="text-xs font-mono text-[hsl(var(--text-muted))] px-1.5 py-0.5 bg-[hsl(var(--surface-2))] rounded">
                                                                    {variable.code}
                                                                </span>
                                                                {variable.is_output && (
                                                                    <span className="px-2 py-0.5 text-[10px] bg-violet-500/15 text-violet-400 rounded-full ring-1 ring-violet-500/30">
                                                                        OUTPUT
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">
                                                                {getProcessDescription(variable)}
                                                                {variable.unit && ` • ${variable.unit}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingAssumption(variable.id)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon">
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-[hsl(var(--accent-primary))]" />
                                        <CardTitle className="text-base">Parametry modelu</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <Input
                                        label="Nazwa modelu"
                                        value={model.name}
                                        onChange={() => { }}
                                    />
                                    <NumberInput
                                        label="Liczba symulacji"
                                        value={model.n_simulations || 500}
                                        onChange={() => { }}
                                        min={100}
                                        max={100000}
                                        step={100}
                                    />
                                    <NumberInput
                                        label="Okresy prognozy"
                                        value={model.forecast_periods || 12}
                                        onChange={() => { }}
                                        min={1}
                                        max={120}
                                    />
                                </CardContent>
                            </Card>

                            {model.description && (
                                <Card>
                                    <CardContent>
                                        <p className="text-sm text-[hsl(var(--text-secondary))]">
                                            {model.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* Correlations Tab */}
                {activeTab === 'correlations' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 overflow-hidden">
                            <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                        <Link2 className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <CardTitle>Macierz korelacji</CardTitle>
                                </div>
                                <Button variant="secondary" size="sm">
                                    Wczytaj szablon
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <CorrelationHeatmap
                                    variables={DEMO_CORRELATION_VARS}
                                    matrix={DEMO_CORRELATION_MATRIX}
                                    cellSize={64}
                                    onCellClick={(i, j) => {
                                        console.log(`Edit correlation: ${DEMO_CORRELATION_VARS[i]} <-> ${DEMO_CORRELATION_VARS[j]}`);
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden">
                            <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
                                <CardTitle className="text-base">Edycja korelacji</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="p-3 bg-[hsl(var(--surface-2))] rounded-lg text-center text-sm text-[hsl(var(--text-muted))]">
                                    Kliknij komórkę macierzy, aby edytować
                                </div>

                                <Slider
                                    label="REV ↔ COGS"
                                    value={0.75}
                                    onChange={() => { }}
                                    min={-1}
                                    max={1}
                                    colorMode="correlation"
                                />

                                <Slider
                                    label="REV ↔ OPEX"
                                    value={0.35}
                                    onChange={() => { }}
                                    min={-1}
                                    max={1}
                                    colorMode="correlation"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Simulations Tab */}
                {activeTab === 'simulations' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Historia symulacji</h2>
                            <Button
                                className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90"
                                leftIcon={isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                onClick={handleRunSimulation}
                                disabled={isSimulating || variables.length === 0}
                            >
                                Nowa symulacja
                            </Button>
                        </div>

                        {simulations.length === 0 ? (
                            <Card className="py-12">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
                                        <BarChart3 className="w-8 h-8 text-[hsl(var(--text-muted))]" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Brak symulacji</h3>
                                    <p className="text-sm text-[hsl(var(--text-muted))] max-w-sm">
                                        Uruchom pierwszą symulację Monte Carlo dla tego modelu
                                    </p>
                                </div>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {simulations.map((sim) => (
                                    <Link key={sim.id} href={`/simulations/${sim.id}`}>
                                        <Card className="h-full hover:border-[hsl(var(--accent-primary))]/50 transition-all cursor-pointer group">
                                            <CardContent className="pt-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className={cn(
                                                        'w-10 h-10 rounded-xl flex items-center justify-center',
                                                        sim.status === 'completed' && 'bg-emerald-500/20',
                                                        sim.status === 'pending' && 'bg-amber-500/20',
                                                        sim.status === 'running' && 'bg-blue-500/20',
                                                        sim.status === 'failed' && 'bg-red-500/20'
                                                    )}>
                                                        {sim.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                                        {sim.status === 'pending' && <Clock className="w-5 h-5 text-amber-400" />}
                                                        {sim.status === 'running' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                                                        {sim.status === 'failed' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                                                    </div>
                                                    <span className={cn(
                                                        'px-2.5 py-1 text-xs font-semibold rounded-full ring-1',
                                                        sim.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
                                                        sim.status === 'pending' && 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
                                                        sim.status === 'running' && 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
                                                        sim.status === 'failed' && 'bg-red-500/15 text-red-400 ring-red-500/30'
                                                    )}>
                                                        {sim.status === 'completed' && 'Ukończona'}
                                                        {sim.status === 'pending' && 'Oczekuje'}
                                                        {sim.status === 'running' && 'W toku'}
                                                        {sim.status === 'failed' && 'Błąd'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div className="p-2 bg-[hsl(var(--surface-2))] rounded-lg">
                                                        <p className="text-xs text-[hsl(var(--text-muted))]">Iteracje</p>
                                                        <p className="font-bold font-mono">{formatNumber(sim.n_simulations, { compact: true })}</p>
                                                    </div>
                                                    <div className="p-2 bg-[hsl(var(--surface-2))] rounded-lg">
                                                        <p className="text-xs text-[hsl(var(--text-muted))]">Czas</p>
                                                        <p className="font-bold font-mono">{sim.compute_time_seconds ? `${sim.compute_time_seconds}s` : '—'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))] pt-3 border-t border-[hsl(var(--border-subtle))]">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDate(sim.started_at, 'long')}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--accent-primary))]" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Distribution Input Modal */}
                {editingAssumption && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="w-full max-w-2xl">
                            <DistributionInput
                                variableCode={editingAssumption === 'new' ? 'NEW_VAR' : 'VARIABLE'}
                                variableName={editingAssumption === 'new' ? 'Nowa zmienna' : 'Edycja zmiennej'}
                                currentValue={0.05}
                                unit="%"
                                onSave={(params) => {
                                    console.log('Saved:', params);
                                    setEditingAssumption(null);
                                }}
                                onCancel={() => setEditingAssumption(null)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
