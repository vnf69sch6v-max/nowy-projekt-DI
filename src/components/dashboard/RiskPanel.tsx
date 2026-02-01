'use client';

// =============================================
// StochFin: Risk Dashboard Panel
// Top section showing key risk metrics
// =============================================

import React from 'react';
import { cn, formatNumber, formatProbability } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { RiskBadge, getRiskLevelFromProbability } from '@/components/ui/RiskBadge';
import { GaugeChart } from '@/components/charts/GaugeChart';
import { AlertTriangle, TrendingDown, Banknote, Shield } from 'lucide-react';

export interface RiskMetric {
    id: string;
    label: string;
    labelPl?: string;
    value: number;
    isPositive?: boolean;  // green if true, red if false
    unit?: string;
    description?: string;
}

export interface RiskPanelProps {
    // Key probability metrics
    probNegativeCashFlow?: number;
    cashFlowAtRisk95?: number;
    covenantBreachProbs?: Record<string, number>;

    // Comparison to previous
    previousProbNegative?: number;

    // Additional metrics
    metrics?: RiskMetric[];

    currency?: string;
    className?: string;
}

export function RiskPanel({
    probNegativeCashFlow = 0,
    cashFlowAtRisk95 = 0,
    covenantBreachProbs = {},
    previousProbNegative,
    metrics = [],
    currency = 'PLN',
    className
}: RiskPanelProps) {
    const maxCovenantBreach = Object.values(covenantBreachProbs).length > 0
        ? Math.max(...Object.values(covenantBreachProbs))
        : 0;

    const probChange = previousProbNegative !== undefined
        ? probNegativeCashFlow - previousProbNegative
        : undefined;

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
            {/* Main Risk Gauge - Negative Cash Flow */}
            <Card variant="risk" riskLevel={getRiskLevelFromProbability(probNegativeCashFlow)} className="md:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                        <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                            P(Ujemne CF)
                        </span>
                    </div>

                    <GaugeChart
                        value={probNegativeCashFlow}
                        label="Prawdopodobieństwo ujemnych przepływów pieniężnych"
                        size="lg"
                    />

                    {probChange !== undefined && (
                        <div className={cn(
                            'mt-3 text-xs font-medium',
                            probChange > 0 ? 'text-red-400' : probChange < 0 ? 'text-green-400' : 'text-[hsl(var(--text-muted))]'
                        )}>
                            {probChange > 0 ? '↑' : probChange < 0 ? '↓' : '→'} {formatProbability(Math.abs(probChange))} vs poprzednia symulacja
                        </div>
                    )}
                </div>
            </Card>

            {/* CFaR and Covenant Panel */}
            <Card className="md:col-span-2">
                <div className="grid grid-cols-2 gap-6 h-full">
                    {/* Cash Flow at Risk */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <Banknote className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                            <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                                CFaR (95%)
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <p className={cn(
                                'text-3xl font-bold font-mono',
                                cashFlowAtRisk95 >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                                {formatNumber(cashFlowAtRisk95, { compact: true, sign: true, currency })}
                            </p>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                                Wartość zagrożona w 5% najgorszych scenariuszy
                            </p>
                        </div>
                    </div>

                    {/* Covenant Breaches */}
                    <div className="flex flex-col border-l border-[hsl(var(--border-subtle))] pl-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                            <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                                Kowenganty
                            </span>
                        </div>

                        {Object.keys(covenantBreachProbs).length > 0 ? (
                            <div className="flex-1 space-y-2">
                                {Object.entries(covenantBreachProbs).slice(0, 3).map(([name, prob]) => (
                                    <div key={name} className="flex items-center justify-between">
                                        <span className="text-sm text-[hsl(var(--text-secondary))] truncate max-w-32">
                                            {name}
                                        </span>
                                        <RiskBadge
                                            level={getRiskLevelFromProbability(prob)}
                                            probability={prob}
                                            size="sm"
                                            showIcon={false}
                                        />
                                    </div>
                                ))}

                                {Object.keys(covenantBreachProbs).length > 3 && (
                                    <p className="text-xs text-[hsl(var(--text-muted))]">
                                        +{Object.keys(covenantBreachProbs).length - 3} więcej...
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-[hsl(var(--text-muted))]">
                                Brak zdefiniowanych kowenantów
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Additional metrics */}
            {metrics.length > 0 && (
                <Card className="md:col-span-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metrics.map((metric) => (
                            <div key={metric.id} className="text-center">
                                <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-muted))] mb-1">
                                    {metric.labelPl || metric.label}
                                </p>
                                <p className={cn(
                                    'text-xl font-bold font-mono',
                                    metric.isPositive === true && 'text-green-400',
                                    metric.isPositive === false && 'text-red-400',
                                    metric.isPositive === undefined && 'text-[hsl(var(--text-primary))]'
                                )}>
                                    {formatNumber(metric.value, { compact: true, currency: metric.unit })}
                                </p>
                                {metric.description && (
                                    <p className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                                        {metric.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
