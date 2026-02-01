'use client';

// =============================================
// StochFin: Models List Page (Premium Design)
// =============================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatDate } from '@/lib/utils';
import {
    Plus,
    Search,
    FolderOpen,
    MoreVertical,
    Clock,
    AlertTriangle,
    Calculator,
    ChevronRight,
    Loader2,
    Activity,
    TrendingUp,
    Zap
} from 'lucide-react';

interface Model {
    id: string;
    name: string;
    description?: string;
    entity_name?: string;
    status: string;
    forecast_start_date?: string;
    forecast_periods?: number;
    created_at: string;
    updated_at: string;
    variable_count?: number;
}

export default function ModelsPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch('/api/models');
                const json = await res.json();
                if (json.data) {
                    setModels(json.data);
                }
            } catch {
                console.error('Error fetching models');
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, []);

    const filteredModels = models.filter(model => {
        const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (model.entity_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || model.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getColorByIndex = (index: number) => {
        const colors = ['blue', 'violet', 'emerald', 'amber'];
        return colors[index % colors.length];
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))] border border-[hsl(var(--border-subtle))] p-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <Calculator className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                    Modele prognostyczne
                                </h1>
                                <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                                    Zarządzaj modelami finansowymi i ich założeniami
                                </p>
                            </div>
                        </div>
                        <Link href="/models/new">
                            <Button
                                className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90 shadow-lg shadow-[hsl(var(--accent-primary))]/25"
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Nowy model
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="relative grid grid-cols-3 gap-4 mt-6">
                        {[
                            { label: 'Wszystkie', value: models.length, color: 'blue' },
                            { label: 'Aktywne', value: models.filter(m => m.status === 'active').length, color: 'emerald' },
                            { label: 'Drafty', value: models.filter(m => m.status === 'draft').length, color: 'amber' },
                        ].map((stat, index) => (
                            <div key={index} className="text-center">
                                <p className={cn(
                                    'text-3xl font-bold',
                                    stat.color === 'blue' && 'text-blue-400',
                                    stat.color === 'emerald' && 'text-emerald-400',
                                    stat.color === 'amber' && 'text-amber-400'
                                )}>
                                    {stat.value}
                                </p>
                                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder="Szukaj modelu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftAddon={<Search className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex items-center gap-1 p-1.5 bg-[hsl(var(--surface-1))] rounded-xl border border-[hsl(var(--border-subtle))]">
                        {(['all', 'active', 'draft'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setSelectedStatus(status)}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                    selectedStatus === status
                                        ? 'bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 text-white shadow-lg shadow-[hsl(var(--accent-primary))]/25'
                                        : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
                                )}
                            >
                                {status === 'all' ? 'Wszystkie' : status === 'active' ? 'Aktywne' : 'Drafty'}
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
                            <p className="text-[hsl(var(--text-muted))]">Ładowanie modeli...</p>
                        </div>
                    </div>
                )}

                {/* Models Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredModels.map((model, index) => {
                            const color = getColorByIndex(index);

                            return (
                                <Link key={model.id} href={`/models/${model.id}`}>
                                    <Card className={cn(
                                        'h-full transition-all cursor-pointer group overflow-hidden',
                                        'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/25',
                                        'border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--accent-primary))]/50'
                                    )}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                                        color === 'blue' && 'bg-blue-500/20',
                                                        color === 'violet' && 'bg-violet-500/20',
                                                        color === 'emerald' && 'bg-emerald-500/20',
                                                        color === 'amber' && 'bg-amber-500/20'
                                                    )}>
                                                        {color === 'blue' && <Calculator className="w-5 h-5 text-blue-400" />}
                                                        {color === 'violet' && <Activity className="w-5 h-5 text-violet-400" />}
                                                        {color === 'emerald' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                                                        {color === 'amber' && <Zap className="w-5 h-5 text-amber-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <CardTitle className="text-base group-hover:text-[hsl(var(--accent-primary))] transition-colors truncate">
                                                                {model.name}
                                                            </CardTitle>
                                                            <span className={cn(
                                                                'px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full flex-shrink-0',
                                                                model.status === 'active'
                                                                    ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                                                    : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                                                            )}>
                                                                {model.status === 'active' ? 'Aktywny' : 'Draft'}
                                                            </span>
                                                        </div>
                                                        {model.entity_name && (
                                                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5 truncate">
                                                                {model.entity_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--surface-3))] transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                                                </button>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            {model.description && (
                                                <p className="text-sm text-[hsl(var(--text-secondary))] line-clamp-2 mb-4">
                                                    {model.description}
                                                </p>
                                            )}

                                            {/* Stats row */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="p-3 bg-[hsl(var(--surface-2))] rounded-lg">
                                                    <p className="text-xs text-[hsl(var(--text-muted))]">Zmienne</p>
                                                    <p className="text-lg font-bold">{model.variable_count || 0}</p>
                                                </div>
                                                <div className="p-3 bg-[hsl(var(--surface-2))] rounded-lg">
                                                    <p className="text-xs text-[hsl(var(--text-muted))]">Okresy</p>
                                                    <p className="text-lg font-bold">{model.forecast_periods || 0}</p>
                                                </div>
                                            </div>

                                            {/* Meta info */}
                                            <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))] pt-3 border-t border-[hsl(var(--border-subtle))]">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(model.updated_at, 'long')}
                                                </div>
                                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--accent-primary))]" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {/* Empty state */}
                        {filteredModels.length === 0 && !loading && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
                                    <FolderOpen className="w-10 h-10 text-[hsl(var(--text-muted))]" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">
                                    {searchQuery ? 'Brak wyników' : 'Brak modeli'}
                                </h3>
                                <p className="text-sm text-[hsl(var(--text-muted))] max-w-sm mb-6">
                                    {searchQuery
                                        ? 'Nie znaleziono modeli pasujących do wyszukiwania'
                                        : 'Utwórz pierwszy model, aby rozpocząć prognozowanie probabilistyczne'
                                    }
                                </p>
                                {!searchQuery && (
                                    <Link href="/models/new">
                                        <Button
                                            className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                        >
                                            Utwórz pierwszy model
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
