'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui';
import {
    parseNaturalLanguageEvent,
    type NLParseResult,
    type NLSuggestedVariable,
    EXAMPLE_PROMPTS
} from '@/lib/engine/gemini-nl-parser';
import type { EventDefinition } from '@/lib/engine/events';

interface NLEventInputProps {
    onEventParsed: (event: EventDefinition, variables: NLSuggestedVariable[]) => void;
    onError?: (error: string) => void;
}

export function NLEventInput({ onEventParsed, onError }: NLEventInputProps) {
    const [input, setInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parseResult, setParseResult] = useState<NLParseResult | null>(null);
    const [progressSteps, setProgressSteps] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleParse = useCallback(async () => {
        if (!input.trim()) return;

        setIsParsing(true);
        setProgressSteps([]);
        setParseResult(null);

        // Simulate progress
        const steps = [
            'Analizowanie opisu zdarzenia...',
            'Identyfikacja zmiennych finansowych...',
            'Mapowanie na strukturę DSL...',
            'Dobór modelu SDE...',
            'Walidacja definicji...'
        ];

        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 250));
            setProgressSteps(prev => [...prev, steps[i]]);
        }

        try {
            const result = await parseNaturalLanguageEvent(input);
            setParseResult(result);

            if (result.success && result.event && result.suggestedVariables) {
                onEventParsed(result.event, result.suggestedVariables);
            } else if (!result.success && onError) {
                onError(result.error || 'Nie udało się sparsować zdarzenia');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
            setParseResult({ success: false, error: errorMsg });
            onError?.(errorMsg);
        } finally {
            setIsParsing(false);
        }
    }, [input, onEventParsed, onError]);

    const handleExampleClick = useCallback((prompt: string) => {
        setInput(prompt);
        textareaRef.current?.focus();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleParse();
        }
    }, [handleParse]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✨</span>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-slate-700">
                        Asystent AI Gemini
                    </h3>
                    <p className="text-xs text-slate-500">
                        Opisz zdarzenie w języku naturalnym
                    </p>
                </div>
            </div>

            {/* Input area */}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='np. "Stagflacja - inflacja powyżej 8% przy ujemnym wzroście PKB w ciągu 12 miesięcy"'
                    className="w-full h-24 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                    disabled={isParsing}
                />
                <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                    ⌘+Enter aby parsować
                </div>
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">Przykłady:</span>
                {EXAMPLE_PROMPTS.slice(0, 3).map((ex, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleExampleClick(ex.prompt)}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                    >
                        {ex.prompt.slice(0, 30)}...
                    </button>
                ))}
            </div>

            {/* Parse button */}
            <Button
                onClick={handleParse}
                disabled={isParsing || !input.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
                {isParsing ? (
                    <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        Parsowanie...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <span>🚀</span>
                        Parsuj z Gemini
                    </span>
                )}
            </Button>

            {/* Progress steps */}
            {isParsing && progressSteps.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                    {progressSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="text-green-500">✓</span>
                            <span className="text-slate-600">{step}</span>
                        </div>
                    ))}
                    {progressSteps.length < 5 && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="animate-pulse text-indigo-500">●</span>
                            <span className="text-slate-400">Przetwarzanie...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Parse result */}
            {parseResult && (
                <div className={`rounded-lg p-4 ${parseResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                    {parseResult.success ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-green-600 text-lg">✓</span>
                                <span className="font-medium text-green-700">
                                    Zdarzenie sparsowane pomyślnie
                                </span>
                            </div>

                            {parseResult.reasoning && (
                                <p className="text-sm text-green-700">
                                    {parseResult.reasoning}
                                </p>
                            )}

                            {/* Parsed event preview */}
                            <div className="bg-white/50 rounded p-2 mt-2">
                                <div className="text-xs text-slate-500 mb-1">Typ zdarzenia:</div>
                                <div className="font-mono text-xs text-slate-700">
                                    {parseResult.event?.type}
                                    {parseResult.event?.type === 'compound' &&
                                        ` (${(parseResult.event as any).operator})`}
                                </div>
                            </div>

                            {/* Variables preview */}
                            {parseResult.suggestedVariables && parseResult.suggestedVariables.length > 0 && (
                                <div className="bg-white/50 rounded p-2">
                                    <div className="text-xs text-slate-500 mb-1">
                                        Zidentyfikowane zmienne:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {parseResult.suggestedVariables.map((v, i) => (
                                            <span
                                                key={i}
                                                className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded"
                                            >
                                                {v.label} ({v.sde_model})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <span className="text-red-600 text-lg">✗</span>
                            <div>
                                <span className="font-medium text-red-700">
                                    Błąd parsowania
                                </span>
                                <p className="text-sm text-red-600 mt-1">
                                    {parseResult.error}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Compact version for inline use
export function NLEventInputCompact({
    onEventParsed
}: {
    onEventParsed: (event: EventDefinition, variables: NLSuggestedVariable[]) => void
}) {
    const [input, setInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    const handleParse = useCallback(async () => {
        if (!input.trim() || isParsing) return;

        setIsParsing(true);
        try {
            const result = await parseNaturalLanguageEvent(input);
            if (result.success && result.event && result.suggestedVariables) {
                onEventParsed(result.event, result.suggestedVariables);
                setInput('');
            }
        } finally {
            setIsParsing(false);
        }
    }, [input, isParsing, onEventParsed]);

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                placeholder="Opisz zdarzenie..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={isParsing}
            />
            <Button
                onClick={handleParse}
                disabled={isParsing || !input.trim()}
                className="px-4"
            >
                {isParsing ? '...' : '✨'}
            </Button>
        </div>
    );
}
