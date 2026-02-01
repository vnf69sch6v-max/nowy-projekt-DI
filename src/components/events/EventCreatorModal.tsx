'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { ProbabilityGauge } from './ProbabilityGauge';
import { NLEventInputCompact } from './NLEventInput';
import {
    runEventSimulation,
    type EventDefinition,
    type EventVariable,
    type ThresholdBreachEvent,
    type CompoundEvent,
    type EventSimulationConfig,
    type EventProbabilityResult,
    DEFAULT_SIMULATION_CONFIG,
    type NLSuggestedVariable
} from '@/lib/engine';

interface EventCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (event: any) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

// Demo data for variable selection
const DEMO_VARIABLES = [
    { name: 'cpi_inflation', label: 'Inflacja CPI', defaultModel: 'ornstein_uhlenbeck' as const },
    { name: 'gdp_growth', label: 'Wzrost PKB', defaultModel: 'gbm' as const },
    { name: 'debt_to_ebitda', label: 'Debt/EBITDA', defaultModel: 'ornstein_uhlenbeck' as const },
    { name: 'revenue', label: 'Przychody', defaultModel: 'gbm' as const },
    { name: 'interest_rate', label: 'Stopa procentowa', defaultModel: 'ornstein_uhlenbeck' as const },
    { name: 'equity_price', label: 'Cena akcji', defaultModel: 'gbm' as const }
];

const OPERATORS = [
    { value: '>', label: 'większe niż (>)' },
    { value: '<', label: 'mniejsze niż (<)' },
    { value: '>=', label: 'większe lub równe (≥)' },
    { value: '<=', label: 'mniejsze lub równe (≤)' },
    { value: '==', label: 'równe (=)' }
];

const COPULA_OPTIONS = [
    { value: 'gaussian', label: 'Gaussian (brak ogonów)', lambda: '0.00' },
    { value: 'clayton', label: 'Clayton (dolny ogon)', lambda: '0.41' },
    { value: 'gumbel', label: 'Gumbel (górny ogon)', lambda: '0.35' },
    { value: 'student_t', label: 't-Student (oba ogony)', lambda: '0.25' }
];

export function EventCreatorModal({ isOpen, onClose, onCreated }: EventCreatorModalProps) {
    const [step, setStep] = useState<WizardStep>(1);
    const [eventName, setEventName] = useState('');
    const [eventType, setEventType] = useState<'simple' | 'compound'>('simple');

    // Simple event config
    const [selectedVariable, setSelectedVariable] = useState(DEMO_VARIABLES[0].name);
    const [operator, setOperator] = useState('>');
    const [threshold, setThreshold] = useState('');
    const [horizonMonths, setHorizonMonths] = useState(12);

    // Compound event config
    const [compoundOperator, setCompoundOperator] = useState<'AND' | 'OR'>('AND');
    const [conditions, setConditions] = useState([
        { variable: 'cpi_inflation', operator: '>', threshold: '0.08' },
        { variable: 'gdp_growth', operator: '<', threshold: '0' }
    ]);

    // Model config
    const [copula, setCopula] = useState('clayton');
    const [nSimulations, setNSimulations] = useState(10000);

    // Results
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState<EventProbabilityResult | null>(null);

    const handleNext = useCallback(() => {
        if (step < 4) {
            setStep((step + 1) as WizardStep);
        }
    }, [step]);

    const handleBack = useCallback(() => {
        if (step > 1) {
            setStep((step - 1) as WizardStep);
        }
    }, [step]);

    const buildEventDefinition = useCallback((): EventDefinition => {
        if (eventType === 'simple') {
            return {
                type: 'threshold_breach',
                variable: selectedVariable,
                operator: operator as any,
                threshold: parseFloat(threshold),
                horizon_months: horizonMonths
            };
        } else {
            return {
                type: 'compound',
                operator: compoundOperator,
                conditions: conditions.map(c => ({
                    type: 'threshold_breach' as const,
                    variable: c.variable,
                    operator: c.operator as any,
                    threshold: parseFloat(c.threshold),
                    horizon_months: horizonMonths
                })),
                horizon_months: horizonMonths
            };
        }
    }, [eventType, selectedVariable, operator, threshold, horizonMonths, compoundOperator, conditions]);

    const buildVariables = useCallback((): EventVariable[] => {
        const varNames = eventType === 'simple'
            ? [selectedVariable]
            : conditions.map(c => c.variable);

        return varNames.map(name => {
            const varInfo = DEMO_VARIABLES.find(v => v.name === name)!;
            const isRate = ['cpi_inflation', 'interest_rate', 'gdp_growth'].includes(name);

            return {
                name,
                label: varInfo.label,
                sde_model: varInfo.defaultModel,
                parameters: isRate
                    ? { theta: 0.5, mu: 0.025, sigma: 0.01 }  // OU
                    : { mu: 0.05, sigma: 0.2 },               // GBM
                initial_value: isRate ? 0.05 : 100,
                data_frequency: 'monthly' as const
            };
        });
    }, [eventType, selectedVariable, conditions]);

    const handleRunSimulation = useCallback(async () => {
        setIsSimulating(true);

        try {
            const eventDef = buildEventDefinition();
            const variables = buildVariables();

            const config: EventSimulationConfig = {
                ...DEFAULT_SIMULATION_CONFIG,
                n_scenarios: nSimulations,
                horizon_months: horizonMonths
            };

            // Run simulation (this happens synchronously in the browser)
            const simResult = runEventSimulation(
                eventDef,
                variables,
                {
                    family: copula as any,
                    parameters: copula === 'clayton' ? { theta: 2.0 } : { rho: 0.5 }
                },
                config
            );

            setResult(simResult);
            setStep(4);
        } catch (error) {
            console.error('Simulation error:', error);
        } finally {
            setIsSimulating(false);
        }
    }, [buildEventDefinition, buildVariables, copula, nSimulations, horizonMonths]);

    const handleCreate = useCallback(() => {
        if (!result) return;

        onCreated({
            id: Date.now().toString(),
            name: eventName || 'Nowe zdarzenie',
            description: eventType === 'simple'
                ? `${DEMO_VARIABLES.find(v => v.name === selectedVariable)?.label} ${operator} ${threshold}`
                : `${conditions.map(c => `${c.variable} ${c.operator} ${c.threshold}`).join(` ${compoundOperator} `)}`,
            event_type: eventType === 'simple' ? 'threshold_breach' : 'compound',
            probability: result.probability.mean,
            ci_lower: result.probability.ci_90[0],
            ci_upper: result.probability.ci_90[1],
            copula: copula === 'clayton' ? 'Clayton θ=2.0' : copula,
            lambda_lower: copula === 'clayton' ? 0.41 : null,
            last_updated: new Date().toISOString().split('T')[0],
            version: 'v1.0'
        });

        onClose();
    }, [result, eventName, eventType, selectedVariable, operator, threshold, conditions, compoundOperator, copula, onCreated, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-slate-100 flex-shrink-0">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800">
                                Kreator Zdarzenia
                            </h2>
                            <p className="text-sm text-slate-500">
                                Krok {step} z 4: {
                                    step === 1 ? 'Definicja' :
                                        step === 2 ? 'Dane' :
                                            step === 3 ? 'Model' :
                                                'Wynik'
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[400px] overflow-y-auto flex-1">
                    {step === 1 && (
                        <Step1Definition
                            eventName={eventName}
                            setEventName={setEventName}
                            eventType={eventType}
                            setEventType={setEventType}
                            selectedVariable={selectedVariable}
                            setSelectedVariable={setSelectedVariable}
                            operator={operator}
                            setOperator={setOperator}
                            threshold={threshold}
                            setThreshold={setThreshold}
                            horizonMonths={horizonMonths}
                            setHorizonMonths={setHorizonMonths}
                            compoundOperator={compoundOperator}
                            setCompoundOperator={setCompoundOperator}
                            conditions={conditions}
                            setConditions={setConditions}
                        />
                    )}

                    {step === 2 && (
                        <Step2Data
                            eventType={eventType}
                            selectedVariable={selectedVariable}
                            conditions={conditions}
                        />
                    )}

                    {step === 3 && (
                        <Step3Model
                            copula={copula}
                            setCopula={setCopula}
                            nSimulations={nSimulations}
                            setNSimulations={setNSimulations}
                            eventType={eventType}
                        />
                    )}

                    {step === 4 && result && (
                        <Step4Result result={result} copula={copula} />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-between flex-shrink-0">
                    <Button
                        variant="secondary"
                        onClick={step === 1 ? onClose : handleBack}
                    >
                        {step === 1 ? 'Anuluj' : 'Wstecz'}
                    </Button>

                    {step < 3 && (
                        <Button onClick={handleNext}>
                            Dalej
                        </Button>
                    )}

                    {step === 3 && (
                        <Button
                            onClick={handleRunSimulation}
                            disabled={isSimulating}
                        >
                            {isSimulating ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Symulacja...
                                </>
                            ) : (
                                'Oblicz prawdopodobieństwo'
                            )}
                        </Button>
                    )}

                    {step === 4 && (
                        <Button onClick={handleCreate}>
                            Zapisz zdarzenie
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Step 1: Event Definition
function Step1Definition({
    eventName, setEventName,
    eventType, setEventType,
    selectedVariable, setSelectedVariable,
    operator, setOperator,
    threshold, setThreshold,
    horizonMonths, setHorizonMonths,
    compoundOperator, setCompoundOperator,
    conditions, setConditions
}: any) {
    return (
        <div className="space-y-6">
            {/* AI Helper */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <span className="text-sm font-medium text-indigo-700">Asystent AI Gemini</span>
                    <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Beta</span>
                </div>
                <NLEventInputCompact
                    onEventParsed={(event, variables) => {
                        // Apply parsed event
                        if (event.type === 'threshold_breach') {
                            setEventType('simple');
                            setSelectedVariable((event as any).variable);
                            setOperator((event as any).operator);
                            setThreshold(String((event as any).threshold));
                            setHorizonMonths((event as any).horizon_months || 12);
                        } else if (event.type === 'compound') {
                            setEventType('compound');
                            setCompoundOperator((event as any).operator);
                            setConditions((event as any).conditions?.map((c: any) => ({
                                variable: c.variable,
                                operator: c.operator,
                                threshold: String(c.threshold)
                            })) || []);
                            setHorizonMonths((event as any).horizon_months || 12);
                        }
                        // Auto-fill name from first variable
                        if (variables?.[0]) {
                            setEventName(variables[0].label);
                        }
                    }}
                />
                <p className="text-xs text-indigo-500 mt-2">Wpisz opis zdarzenia, np. "Stagflacja w ciągu roku"</p>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-sm text-slate-400">lub wypełnij ręcznie</span>
                </div>
            </div>

            {/* Event name */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nazwa zdarzenia
                </label>
                <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="np. Stagflacja, Default Kredytowy"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* Event type toggle */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Typ zdarzenia
                </label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setEventType('simple')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${eventType === 'simple'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <div className="font-medium">Proste</div>
                        <div className="text-xs text-slate-500">Jedna zmienna</div>
                    </button>
                    <button
                        onClick={() => setEventType('compound')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${eventType === 'compound'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <div className="font-medium">Złożone</div>
                        <div className="text-xs text-slate-500">AND / OR</div>
                    </button>
                </div>
            </div>

            {eventType === 'simple' ? (
                <SimpleEventForm
                    selectedVariable={selectedVariable}
                    setSelectedVariable={setSelectedVariable}
                    operator={operator}
                    setOperator={setOperator}
                    threshold={threshold}
                    setThreshold={setThreshold}
                />
            ) : (
                <CompoundEventForm
                    compoundOperator={compoundOperator}
                    setCompoundOperator={setCompoundOperator}
                    conditions={conditions}
                    setConditions={setConditions}
                />
            )}

            {/* Horizon */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Horyzont czasowy (miesiące): {horizonMonths}
                </label>
                <input
                    type="range"
                    min={1}
                    max={60}
                    value={horizonMonths}
                    onChange={(e) => setHorizonMonths(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1 mies.</span>
                    <span>5 lat</span>
                </div>
            </div>
        </div>
    );
}

function SimpleEventForm({ selectedVariable, setSelectedVariable, operator, setOperator, threshold, setThreshold }: any) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Zmienna</label>
                <select
                    value={selectedVariable}
                    onChange={(e) => setSelectedVariable(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    {DEMO_VARIABLES.map(v => (
                        <option key={v.name} value={v.name}>{v.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Operator</label>
                <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Próg</label>
                <input
                    type="number"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="np. 0.08"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
        </div>
    );
}

function CompoundEventForm({ compoundOperator, setCompoundOperator, conditions, setConditions }: any) {
    const addCondition = () => {
        setConditions([...conditions, { variable: 'revenue', operator: '>', threshold: '' }]);
    };

    const updateCondition = (idx: number, field: string, value: string) => {
        const updated = [...conditions];
        updated[idx] = { ...updated[idx], [field]: value };
        setConditions(updated);
    };

    const removeCondition = (idx: number) => {
        if (conditions.length > 2) {
            setConditions(conditions.filter((_: any, i: number) => i !== idx));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-500">Łącznik:</span>
                <button
                    onClick={() => setCompoundOperator('AND')}
                    className={`px-3 py-1 rounded-full text-sm ${compoundOperator === 'AND'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    AND (wszystkie)
                </button>
                <button
                    onClick={() => setCompoundOperator('OR')}
                    className={`px-3 py-1 rounded-full text-sm ${compoundOperator === 'OR'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    OR (co najmniej jedno)
                </button>
            </div>

            {conditions.map((cond: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <select
                        value={cond.variable}
                        onChange={(e) => updateCondition(idx, 'variable', e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm"
                    >
                        {DEMO_VARIABLES.map(v => (
                            <option key={v.name} value={v.name}>{v.label}</option>
                        ))}
                    </select>
                    <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-slate-200 rounded text-sm"
                    >
                        {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.value}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        value={cond.threshold}
                        onChange={(e) => updateCondition(idx, 'threshold', e.target.value)}
                        placeholder="Próg"
                        className="w-24 px-3 py-1.5 border border-slate-200 rounded text-sm"
                    />
                    <button
                        onClick={() => removeCondition(idx)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        disabled={conditions.length <= 2}
                    >
                        ✕
                    </button>
                </div>
            ))}

            <button
                onClick={addCondition}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-indigo-300 hover:text-indigo-500"
            >
                + Dodaj warunek
            </button>
        </div>
    );
}

// Step 2: Data
function Step2Data({ eventType, selectedVariable, conditions }: any) {
    const variables = eventType === 'simple'
        ? [selectedVariable]
        : conditions.map((c: any) => c.variable);

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-xl">📊</span>
                    <div>
                        <h4 className="font-medium text-amber-800">Dane demonstracyjne</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            W tej wersji używamy wbudowanych parametrów demo.
                            W pełnej wersji będzie można wgrać własne dane CSV.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-medium text-slate-800 mb-3">Zmienne do symulacji:</h4>
                <div className="space-y-2">
                    {variables.map((name: string) => {
                        const varInfo = DEMO_VARIABLES.find(v => v.name === name);
                        return (
                            <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <span className="font-medium text-slate-700">{varInfo?.label}</span>
                                    <span className="text-sm text-slate-400 ml-2">({name})</span>
                                </div>
                                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                                    {varInfo?.defaultModel === 'gbm' ? 'GBM' : 'Ornstein-Uhlenbeck'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Step 3: Model Configuration
function Step3Model({ copula, setCopula, nSimulations, setNSimulations, eventType }: any) {
    return (
        <div className="space-y-6">
            {/* Copula selection (only for compound events) */}
            {eventType === 'compound' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Model zależności (Kopuła)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {COPULA_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setCopula(opt.value)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${copula === opt.value
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="font-medium text-slate-800">{opt.label}</div>
                                <div className="text-xs text-slate-500 mt-1">λ_L = {opt.lambda}</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>Clayton</strong> zalecany dla scenariuszy kryzysowych —
                            modeluje silniejszą korelację w "złych rogach" (krachy).
                        </p>
                    </div>
                </div>
            )}

            {/* Number of simulations */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Liczba symulacji Monte Carlo: {nSimulations.toLocaleString()}
                </label>
                <input
                    type="range"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={nSimulations}
                    onChange={(e) => setNSimulations(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1,000 (szybko)</span>
                    <span>100,000 (precyzyjnie)</span>
                </div>
            </div>

            {/* Estimation info */}
            <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-2">Konfiguracja:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Dyskretyzacja: Milstein (wysoka precyzja)</li>
                    <li>• Krok czasowy: 1 miesiąc</li>
                    <li>• Seed losowy: automatyczny</li>
                </ul>
            </div>
        </div>
    );
}

// Step 4: Results
function Step4Result({ result, copula }: { result: EventProbabilityResult; copula: string }) {
    return (
        <div className="space-y-6">
            {/* Main gauge */}
            <div className="flex justify-center">
                <ProbabilityGauge
                    probability={result.probability.mean}
                    ciLower={result.probability.ci_90[0]}
                    ciUpper={result.probability.ci_90[1]}
                    size="lg"
                    showLabel={true}
                />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-500">Prawdopodobieństwo</div>
                    <div className="text-2xl font-bold text-slate-800">
                        {(result.probability.mean * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-400">
                        CI 90%: [{(result.probability.ci_90[0] * 100).toFixed(1)}% — {(result.probability.ci_90[1] * 100).toFixed(1)}%]
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-500">Mnożnik kopuły</div>
                    <div className="text-2xl font-bold text-slate-800">
                        {result.decomposition.copula_risk_multiplier.toFixed(1)}x
                    </div>
                    <div className="text-xs text-slate-400">
                        vs niezależne: {(result.decomposition.joint_independent * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Decomposition */}
            <div className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-medium text-indigo-800 mb-2">Dekompozycja:</h4>
                <div className="space-y-1 text-sm">
                    {Object.entries(result.decomposition.per_variable).map(([name, prob]) => (
                        <div key={name} className="flex justify-between text-indigo-700">
                            <span>P({name} przekracza próg):</span>
                            <span className="font-mono">{((prob as number) * 100).toFixed(1)}%</span>
                        </div>
                    ))}
                    <div className="border-t border-indigo-200 pt-1 mt-2 flex justify-between font-medium text-indigo-800">
                        <span>P(wszystkie jednocześnie, {copula}):</span>
                        <span className="font-mono">{(result.decomposition.joint_copula * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Computation info */}
            <div className="text-center text-xs text-slate-400">
                Obliczono w {result.computation_time_ms}ms na {result.n_scenarios.toLocaleString()} scenariuszach
            </div>
        </div>
    );
}
