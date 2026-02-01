'use client';

import React from 'react';
import { ProbabilityGauge } from './ProbabilityGauge';

interface EventCardProps {
    event: {
        id: string;
        name: string;
        description: string;
        event_type: 'threshold_breach' | 'compound' | 'conditional' | 'at_least_k' | 'sequence';
        probability: number;
        ci_lower: number;
        ci_upper: number;
        copula: string | null;
        lambda_lower: number | null;
        last_updated: string;
        version: string;
    };
    onClick?: () => void;
    onRefresh?: () => void;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
    threshold_breach: { label: 'Próg', icon: '📈' },
    compound: { label: 'Złożone', icon: '🔗' },
    conditional: { label: 'Warunkowe', icon: '↪️' },
    at_least_k: { label: 'K z N', icon: '🎯' },
    sequence: { label: 'Sekwencja', icon: '⏱️' }
};

export function EventCard({ event, onClick, onRefresh }: EventCardProps) {
    const typeInfo = EVENT_TYPE_LABELS[event.event_type] || { label: 'Zdarzenie', icon: '📊' };

    // Determine card accent color based on probability
    const getAccentColor = (p: number) => {
        if (p < 0.15) return 'from-emerald-500 to-teal-500';
        if (p < 0.40) return 'from-amber-500 to-orange-500';
        if (p < 0.65) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-rose-600';
    };

    const accentGradient = getAccentColor(event.probability);

    return (
        <div
            className="group bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={onClick}
        >
            {/* Accent bar */}
            <div className={`h-1.5 bg-gradient-to-r ${accentGradient}`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{typeInfo.icon}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                {typeInfo.label}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">{event.version}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {event.name}
                        </h3>
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRefresh?.();
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Aktualizuj"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {event.description}
                </p>

                {/* Gauge */}
                <div className="flex justify-center mb-4">
                    <ProbabilityGauge
                        probability={event.probability}
                        ciLower={event.ci_lower}
                        ciUpper={event.ci_upper}
                        size="md"
                        showLabel={true}
                    />
                </div>

                {/* Footer - Copula info */}
                {event.copula && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Kopuła:</span>
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {event.copula}
                            </span>
                        </div>
                        {event.lambda_lower !== null && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-400">λ_L:</span>
                                <span className="text-xs font-mono font-medium text-slate-600">
                                    {event.lambda_lower.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Last updated */}
                <div className="mt-3 text-xs text-slate-400 text-right">
                    Aktualizacja: {event.last_updated}
                </div>
            </div>
        </div>
    );
}
