'use client';

// =============================================
// StochFin: New Model Page
// =============================================

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Calendar,
    Settings,
    Sparkles
} from 'lucide-react';

export default function NewModelPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Form state
    const [modelName, setModelName] = useState('');
    const [entityName, setEntityName] = useState('');
    const [description, setDescription] = useState('');
    const [horizonMonths, setHorizonMonths] = useState<number | undefined>(24);
    const [nSimulations, setNSimulations] = useState<number | undefined>(10000);
    const [baseDate, setBaseDate] = useState('');

    const handleCreate = async () => {
        // TODO: Create model via API
        console.log('Creating model...', { modelName, entityName, horizonMonths, nSimulations });
        router.push('/models/1');  // Navigate to new model
    };

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/models">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Nowy model</h1>
                        <p className="text-sm text-[hsl(var(--text-muted))]">
                            Krok {step} z 2
                        </p>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                    <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--surface-3))]'}`} />
                    <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--surface-3))]'}`} />
                </div>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[hsl(var(--color-primary)/0.15)] rounded-lg">
                                    <Building2 className="w-5 h-5 text-[hsl(var(--color-primary))]" />
                                </div>
                                <div>
                                    <CardTitle>Informacje podstawowe</CardTitle>
                                    <p className="text-sm text-[hsl(var(--text-muted))]">
                                        Nazwij model i określ podmiot
                                    </p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Input
                                label="Nazwa modelu"
                                placeholder="np. Prognoza Q1 2026"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                            />

                            <Input
                                label="Podmiot"
                                placeholder="np. TechCorp Sp. z o.o."
                                value={entityName}
                                onChange={(e) => setEntityName(e.target.value)}
                                leftAddon={<Building2 className="w-4 h-4" />}
                            />

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))] mb-1.5">
                                    Opis (opcjonalny)
                                </label>
                                <textarea
                                    placeholder="Cel modelu, kluczowe założenia..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full h-24 px-3 py-2 bg-[hsl(var(--surface-2))] border border-[hsl(var(--border-default))] rounded-lg text-sm resize-none focus:outline-none focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.15)]"
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="justify-end">
                            <Button
                                onClick={() => setStep(2)}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                                disabled={!modelName || !entityName}
                            >
                                Dalej
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Simulation Settings */}
                {step === 2 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[hsl(var(--color-primary)/0.15)] rounded-lg">
                                    <Settings className="w-5 h-5 text-[hsl(var(--color-primary))]" />
                                </div>
                                <div>
                                    <CardTitle>Parametry symulacji</CardTitle>
                                    <p className="text-sm text-[hsl(var(--text-muted))]">
                                        Skonfiguruj horyzont i liczbę scenariuszy
                                    </p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Input
                                label="Data bazowa"
                                type="date"
                                value={baseDate}
                                onChange={(e) => setBaseDate(e.target.value)}
                                leftAddon={<Calendar className="w-4 h-4" />}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <NumberInput
                                    label="Horyzont (miesiące)"
                                    value={horizonMonths}
                                    onChange={setHorizonMonths}
                                    min={1}
                                    max={120}
                                    help="Jak daleko prognozować"
                                />

                                <NumberInput
                                    label="Liczba symulacji"
                                    value={nSimulations}
                                    onChange={setNSimulations}
                                    min={1000}
                                    max={100000}
                                    step={1000}
                                    help="Monte Carlo iterations"
                                />
                            </div>

                            {/* Recommendation */}
                            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-300">
                                    <p className="font-medium mb-1">Rekomendacja</p>
                                    <p className="text-blue-300/70">
                                        Dla stabilnych wyników zalecamy minimum 10,000 symulacji.
                                        Więcej iteracji = większa dokładność ogonów rozkładu.
                                    </p>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)}>
                                Wstecz
                            </Button>
                            <Button onClick={handleCreate}>
                                Utwórz model
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
