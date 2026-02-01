'use client';

// =============================================
// StochFin: Distribution Input Component
// Main component for defining probabilistic assumptions
// Enforces stochastic thinking - blocks single values!
// =============================================

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import { Histogram } from '@/components/charts/Histogram';
import {
    BarChart3,
    TrendingUp,
    Sliders,
    AlertTriangle,
    Info,
    Check
} from 'lucide-react';
import type { StochasticProcess } from '@/types/distributions';

export type InputMethod = 'auto' | 'pert' | 'range' | 'deterministic';

export interface DistributionInputProps {
    variableCode: string;
    variableName: string;
    variableNamePl?: string;
    currentValue?: number;
    unit?: string;
    onSave: (params: DistributionParams) => void;
    onCancel?: () => void;
    historicalData?: number[];
    suggestedProcess?: StochasticProcess;
    className?: string;
}

export interface DistributionParams {
    method: InputMethod;
    process: StochasticProcess;
    parameters: Record<string, number>;
    narrative: string;
    deterministicJustification?: string;
}

export function DistributionInput({
    variableCode,
    variableName,
    variableNamePl,
    currentValue,
    unit = 'PLN',
    onSave,
    onCancel,
    historicalData,
    suggestedProcess = 'gbm',
    className
}: DistributionInputProps) {
    const [method, setMethod] = useState<InputMethod>('pert');
    const [narrative, setNarrative] = useState('');
    const [deterministicJustification, setDeterministicJustification] = useState('');

    // PERT parameters
    const [pertOptimistic, setPertOptimistic] = useState<number | undefined>(
        currentValue ? currentValue * 1.2 : undefined
    );
    const [pertMostLikely, setPertMostLikely] = useState<number | undefined>(currentValue);
    const [pertPessimistic, setPertPessimistic] = useState<number | undefined>(
        currentValue ? currentValue * 0.8 : undefined
    );

    // Range parameters
    const [rangeMin, setRangeMin] = useState<number | undefined>(
        currentValue ? currentValue * 0.5 : undefined
    );
    const [rangeMax, setRangeMax] = useState<number | undefined>(
        currentValue ? currentValue * 1.5 : undefined
    );

    // Deterministic value
    const [deterministicValue, setDeterministicValue] = useState<number | undefined>(currentValue);

    // Generate preview samples for histogram
    const getPreviewSamples = (): number[] => {
        if (method === 'deterministic' && deterministicValue !== undefined) {
            // Show single spike
            return Array(100).fill(deterministicValue);
        }

        if (method === 'pert' && pertOptimistic !== undefined && pertMostLikely !== undefined && pertPessimistic !== undefined) {
            // Generate PERT samples (simplified)
            const samples: number[] = [];
            for (let i = 0; i < 1000; i++) {
                samples.push(samplePertApprox(pertPessimistic, pertMostLikely, pertOptimistic));
            }
            return samples;
        }

        if (method === 'range' && rangeMin !== undefined && rangeMax !== undefined) {
            // Generate uniform samples
            const samples: number[] = [];
            for (let i = 0; i < 1000; i++) {
                samples.push(rangeMin + Math.random() * (rangeMax - rangeMin));
            }
            return samples;
        }

        return [];
    };

    const handleSave = () => {
        let params: DistributionParams;

        switch (method) {
            case 'pert':
                if (!pertOptimistic || !pertMostLikely || !pertPessimistic) return;
                params = {
                    method: 'pert',
                    process: 'pert' as StochasticProcess,
                    parameters: {
                        optimistic: pertOptimistic,
                        most_likely: pertMostLikely,
                        pessimistic: pertPessimistic
                    },
                    narrative
                };
                break;

            case 'range':
                if (rangeMin === undefined || rangeMax === undefined) return;
                params = {
                    method: 'range',
                    process: 'triangular' as StochasticProcess,
                    parameters: {
                        min: rangeMin,
                        mode: (rangeMin + rangeMax) / 2,
                        max: rangeMax
                    },
                    narrative
                };
                break;

            case 'deterministic':
                if (deterministicValue === undefined || !deterministicJustification) return;
                params = {
                    method: 'deterministic',
                    process: 'deterministic',
                    parameters: { value: deterministicValue },
                    narrative,
                    deterministicJustification
                };
                break;

            default:
                return;
        }

        onSave(params);
    };

    const methods: { id: InputMethod; label: string; icon: React.ReactNode; description: string }[] = [
        {
            id: 'auto',
            label: 'Auto-kalibracja',
            icon: <BarChart3 className="w-4 h-4" />,
            description: 'Dopasuj rozkład do danych historycznych'
        },
        {
            id: 'pert',
            label: 'PERT (3 scenariusze)',
            icon: <TrendingUp className="w-4 h-4" />,
            description: 'Pesymistyczny / Najbardziej prawdopodobny / Optymistyczny'
        },
        {
            id: 'range',
            label: 'Zakres',
            icon: <Sliders className="w-4 h-4" />,
            description: 'Rozkład trójkątny z minimum i maksimum'
        },
        {
            id: 'deterministic',
            label: 'Deterministyczny',
            icon: <AlertTriangle className="w-4 h-4" />,
            description: 'Wymaga uzasadnienia! (niezalecane)'
        }
    ];

    return (
        <Card className={cn('max-w-2xl', className)}>
            <CardHeader>
                <div>
                    <CardTitle>{variableNamePl || variableName}</CardTitle>
                    <p className="text-xs text-[hsl(var(--text-muted))] font-mono mt-1">{variableCode}</p>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Educational banner */}
                <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">Przyszłość jest niepewna</p>
                        <p className="text-blue-300/70">
                            Zamiast jednej liczby, zdefiniuj rozkład możliwych wartości.
                            System przeprowadzi symulację Monte Carlo dla wszystkich scenariuszy.
                        </p>
                    </div>
                </div>

                {/* Method selection */}
                <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))] mb-2">
                        Metoda definiowania rozkładu
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {methods.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                disabled={m.id === 'auto' && !historicalData?.length}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                                    method === m.id
                                        ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)]'
                                        : 'border-[hsl(var(--border-default))] hover:border-[hsl(var(--border-strong))]',
                                    m.id === 'deterministic' && 'border-orange-500/30',
                                    m.id === 'auto' && !historicalData?.length && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                <div className={cn(
                                    'p-1.5 rounded',
                                    method === m.id ? 'bg-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--surface-3))]',
                                    m.id === 'deterministic' && method === m.id && 'bg-orange-500'
                                )}>
                                    {m.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{m.label}</p>
                                    <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{m.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PERT inputs */}
                {method === 'pert' && (
                    <div className="grid grid-cols-3 gap-4">
                        <NumberInput
                            label="Pesymistyczny (P10)"
                            value={pertPessimistic}
                            onChange={setPertPessimistic}
                            suffix={unit}
                            help="Wartość w złym scenariuszu"
                        />
                        <NumberInput
                            label="Najbardziej prawdopodobny"
                            value={pertMostLikely}
                            onChange={setPertMostLikely}
                            suffix={unit}
                            help="Twoja najlepsza estymata"
                        />
                        <NumberInput
                            label="Optymistyczny (P90)"
                            value={pertOptimistic}
                            onChange={setPertOptimistic}
                            suffix={unit}
                            help="Wartość w dobrym scenariuszu"
                        />
                    </div>
                )}

                {/* Range inputs */}
                {method === 'range' && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                            label="Minimum"
                            value={rangeMin}
                            onChange={setRangeMin}
                            suffix={unit}
                        />
                        <NumberInput
                            label="Maksimum"
                            value={rangeMax}
                            onChange={setRangeMax}
                            suffix={unit}
                        />
                    </div>
                )}

                {/* Deterministic input */}
                {method === 'deterministic' && (
                    <div className="space-y-4">
                        <div className="flex gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-300">
                                <p className="font-medium mb-1">Wartość deterministyczna</p>
                                <p className="text-orange-300/70">
                                    Używanie pojedynczej wartości dla prognozy jest niezalecane.
                                    Wymagane jest uzasadnienie, dlaczego ta zmienna nie podlega niepewności.
                                </p>
                            </div>
                        </div>

                        <NumberInput
                            label="Wartość stała"
                            value={deterministicValue}
                            onChange={setDeterministicValue}
                            suffix={unit}
                        />

                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))] mb-1.5">
                                Uzasadnienie (wymagane)
                            </label>
                            <textarea
                                value={deterministicJustification}
                                onChange={(e) => setDeterministicJustification(e.target.value)}
                                placeholder="Wyjaśnij, dlaczego ta zmienna jest deterministyczna..."
                                className="w-full h-20 px-3 py-2 bg-[hsl(var(--surface-2))] border border-orange-500/30 rounded-lg text-sm resize-none focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                            />
                        </div>
                    </div>
                )}

                {/* Preview histogram */}
                {getPreviewSamples().length > 0 && method !== 'deterministic' && (
                    <div className="pt-4 border-t border-[hsl(var(--border-subtle))]">
                        <Histogram
                            values={getPreviewSamples()}
                            title="Podgląd rozkładu"
                            unit={unit}
                            height={150}
                        />
                    </div>
                )}

                {/* Narrative */}
                <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))] mb-1.5">
                        Uzasadnienie założeń
                    </label>
                    <textarea
                        value={narrative}
                        onChange={(e) => setNarrative(e.target.value)}
                        placeholder="Opisz źródło i uzasadnienie dla przyjętych parametrów..."
                        className="w-full h-20 px-3 py-2 bg-[hsl(var(--surface-2))] border border-[hsl(var(--border-default))] rounded-lg text-sm resize-none focus:outline-none focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.15)]"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel}>
                            Anuluj
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        leftIcon={<Check className="w-4 h-4" />}
                        disabled={
                            (method === 'pert' && (!pertOptimistic || !pertMostLikely || !pertPessimistic)) ||
                            (method === 'range' && (rangeMin === undefined || rangeMax === undefined)) ||
                            (method === 'deterministic' && (!deterministicValue || !deterministicJustification))
                        }
                    >
                        Zapisz założenie
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Simplified PERT sampling for preview
function samplePertApprox(min: number, mode: number, max: number): number {
    const u = Math.random();
    const v = Math.random();

    // Beta approximation using normal
    const mean = (min + 4 * mode + max) / 6;
    const std = (max - min) / 6;

    // Box-Muller
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    let sample = mean + std * z;

    // Clamp to range
    return Math.max(min, Math.min(max, sample));
}
