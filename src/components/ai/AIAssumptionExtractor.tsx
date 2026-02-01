'use client';

// =============================================
// StochFin: AI Assumption Extractor Component
// =============================================

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatNumber } from '@/lib/utils';
import {
    Sparkles,
    Upload,
    FileText,
    Check,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Plus
} from 'lucide-react';

interface ExtractedAssumption {
    variableCode: string;
    variableName: string;
    variableNamePl: string;
    suggestedDistribution: string;
    suggestedParams: Record<string, number>;
    confidence: 'high' | 'medium' | 'low';
    sourceText: string;
    reasoning: string;
}

interface AIAssumptionExtractorProps {
    onAssumptionsExtracted?: (assumptions: ExtractedAssumption[]) => void;
    onCancel?: () => void;
}

export function AIAssumptionExtractor({
    onAssumptionsExtracted,
    onCancel
}: AIAssumptionExtractorProps) {
    const [documentText, setDocumentText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedAssumptions, setExtractedAssumptions] = useState<ExtractedAssumption[]>([]);
    const [selectedAssumptions, setSelectedAssumptions] = useState<Set<string>>(new Set());
    const [expandedAssumption, setExpandedAssumption] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExtract = useCallback(async () => {
        if (!documentText.trim()) return;

        setIsExtracting(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentText })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setExtractedAssumptions(result.data.assumptions || []);
            // Select all high confidence by default
            const highConfidenceCodes: string[] = result.data.assumptions
                .filter((a: ExtractedAssumption) => a.confidence === 'high')
                .map((a: ExtractedAssumption) => a.variableCode);
            setSelectedAssumptions(new Set(highConfidenceCodes));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setIsExtracting(false);
        }
    }, [documentText]);

    const toggleAssumption = (code: string) => {
        const newSelected = new Set(selectedAssumptions);
        if (newSelected.has(code)) {
            newSelected.delete(code);
        } else {
            newSelected.add(code);
        }
        setSelectedAssumptions(newSelected);
    };

    const handleConfirm = () => {
        const selected = extractedAssumptions.filter(a => selectedAssumptions.has(a.variableCode));
        onAssumptionsExtracted?.(selected);
    };

    const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
        switch (confidence) {
            case 'high': return 'text-green-400 bg-green-500/15';
            case 'medium': return 'text-amber-400 bg-amber-500/15';
            case 'low': return 'text-red-400 bg-red-500/15';
        }
    };

    const formatParams = (distribution: string, params: Record<string, number>) => {
        switch (distribution) {
            case 'pert':
                return `${(params.pessimistic * 100).toFixed(0)}% / ${(params.most_likely * 100).toFixed(0)}% / ${(params.optimistic * 100).toFixed(0)}%`;
            case 'normal':
                return `μ=${(params.mean * 100).toFixed(1)}%, σ=${(params.std * 100).toFixed(1)}%`;
            case 'triangular':
                return `${(params.min * 100).toFixed(0)}% – ${(params.max * 100).toFixed(0)}%`;
            case 'lognormal':
                return `μ=${params.mu?.toFixed(2)}, σ=${params.sigma?.toFixed(2)}`;
            default:
                return JSON.stringify(params);
        }
    };

    return (
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <CardTitle>Ekstrakcja założeń AI</CardTitle>
                        <p className="text-sm text-[hsl(var(--text-muted))]">
                            Wyodrębnij założenia stochastyczne z dokumentu finansowego
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Input Phase */}
                {extractedAssumptions.length === 0 && (
                    <>
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))] mb-1.5">
                                Tekst dokumentu
                            </label>
                            <textarea
                                placeholder="Wklej tekst z dokumentu finansowego, biznes planu, memorandum informacyjnego..."
                                value={documentText}
                                onChange={(e) => setDocumentText(e.target.value)}
                                className="w-full h-48 px-3 py-2 bg-[hsl(var(--surface-2))] border border-[hsl(var(--border-default))] rounded-lg text-sm resize-none focus:outline-none focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.15)]"
                            />
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                                {documentText.length.toLocaleString()} / 50,000 znaków
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-300">
                                <p className="font-medium mb-1">Jak to działa?</p>
                                <ul className="text-blue-300/70 space-y-1 text-xs">
                                    <li>• AI analizuje dokument i identyfikuje zmienne do modelowania</li>
                                    <li>• Sugeruje odpowiednie rozkłady prawdopodobieństwa</li>
                                    <li>• Proponuje parametry na podstawie języka dokumentu</li>
                                    <li>• Identyfikuje potencjalne korelacje między zmiennymi</li>
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {/* Results Phase */}
                {extractedAssumptions.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[hsl(var(--text-secondary))]">
                                Znaleziono <strong>{extractedAssumptions.length}</strong> założeń
                            </p>
                            <button
                                onClick={() => {
                                    if (selectedAssumptions.size === extractedAssumptions.length) {
                                        setSelectedAssumptions(new Set());
                                    } else {
                                        setSelectedAssumptions(new Set(extractedAssumptions.map(a => a.variableCode)));
                                    }
                                }}
                                className="text-xs text-[hsl(var(--color-primary))] hover:underline"
                            >
                                {selectedAssumptions.size === extractedAssumptions.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                            </button>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {extractedAssumptions.map((assumption) => {
                                const isSelected = selectedAssumptions.has(assumption.variableCode);
                                const isExpanded = expandedAssumption === assumption.variableCode;

                                return (
                                    <div
                                        key={assumption.variableCode}
                                        className={cn(
                                            'border rounded-lg transition-colors',
                                            isSelected
                                                ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]'
                                                : 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))]'
                                        )}
                                    >
                                        <div
                                            className="flex items-center gap-3 p-3 cursor-pointer"
                                            onClick={() => toggleAssumption(assumption.variableCode)}
                                        >
                                            <div className={cn(
                                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                                isSelected
                                                    ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))]'
                                                    : 'border-[hsl(var(--border-strong))]'
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{assumption.variableNamePl}</span>
                                                    <span className="text-xs font-mono text-[hsl(var(--text-muted))]">
                                                        {assumption.variableCode}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-[hsl(var(--text-secondary))]">
                                                        {assumption.suggestedDistribution.toUpperCase()}: {formatParams(assumption.suggestedDistribution, assumption.suggestedParams)}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className={cn(
                                                'px-1.5 py-0.5 text-[10px] font-medium uppercase rounded',
                                                getConfidenceColor(assumption.confidence)
                                            )}>
                                                {assumption.confidence}
                                            </span>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedAssumption(isExpanded ? null : assumption.variableCode);
                                                }}
                                                className="p-1 hover:bg-[hsl(var(--surface-3))] rounded"
                                            >
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-0 space-y-2 text-xs border-t border-[hsl(var(--border-subtle))]">
                                                <div className="pt-2">
                                                    <p className="text-[hsl(var(--text-muted))] uppercase tracking-wide mb-1">Źródło</p>
                                                    <p className="text-[hsl(var(--text-secondary))] italic">"{assumption.sourceText}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[hsl(var(--text-muted))] uppercase tracking-wide mb-1">Uzasadnienie AI</p>
                                                    <p className="text-[hsl(var(--text-secondary))]">{assumption.reasoning}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="justify-between">
                <Button variant="ghost" onClick={onCancel}>
                    Anuluj
                </Button>

                {extractedAssumptions.length === 0 ? (
                    <Button
                        onClick={handleExtract}
                        loading={isExtracting}
                        disabled={!documentText.trim() || documentText.length > 50000}
                        leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                        Analizuj dokument
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setExtractedAssumptions([]);
                                setSelectedAssumptions(new Set());
                            }}
                        >
                            Wróć
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedAssumptions.size === 0}
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Dodaj wybrane ({selectedAssumptions.size})
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
