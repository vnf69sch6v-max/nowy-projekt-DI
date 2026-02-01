'use client';

// =============================================
// StochFin: Scenario Table
// P10/P50/P90 comparison table
// =============================================

import React from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingDown, Minus, TrendingUp } from 'lucide-react';

export interface ScenarioRow {
    variableCode: string;
    variableName: string;
    unit?: string;
    p10: number;
    p50: number;
    p90: number;
    actual?: number;  // Historical actual if available
}

export interface ScenarioTableProps {
    title?: string;
    rows: ScenarioRow[];
    periodLabel?: string;
    showActual?: boolean;
    compact?: boolean;
    className?: string;
}

export function ScenarioTable({
    title = 'Scenariusze',
    rows,
    periodLabel,
    showActual = false,
    compact = false,
    className
}: ScenarioTableProps) {
    return (
        <Card padding={compact ? 'sm' : 'md'} className={className}>
            <CardHeader className={compact ? 'mb-2' : undefined}>
                <CardTitle className={compact ? 'text-base' : undefined}>{title}</CardTitle>
                {periodLabel && (
                    <span className="text-xs text-[hsl(var(--text-muted))] font-mono">
                        {periodLabel}
                    </span>
                )}
            </CardHeader>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[hsl(var(--border-subtle))]">
                            <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                Zmienna
                            </th>
                            <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                                <div className="flex items-center justify-end gap-1">
                                    <TrendingDown className="w-3 h-3" />
                                    P10
                                </div>
                            </th>
                            <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                                <div className="flex items-center justify-end gap-1">
                                    <Minus className="w-3 h-3" />
                                    P50
                                </div>
                            </th>
                            <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-green-400">
                                <div className="flex items-center justify-end gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    P90
                                </div>
                            </th>
                            {showActual && (
                                <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-primary))]">
                                    Rzeczywista
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border-subtle)/0.5)]">
                        {rows.map((row) => (
                            <tr
                                key={row.variableCode}
                                className="hover:bg-[hsl(var(--surface-2)/0.5)] transition-colors"
                            >
                                <td className="py-2.5 px-2">
                                    <div>
                                        <p className="text-sm text-[hsl(var(--text-primary))]">
                                            {row.variableName}
                                        </p>
                                        <p className="text-[10px] text-[hsl(var(--text-muted))] font-mono">
                                            {row.variableCode}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                    <span className={cn(
                                        'font-mono text-sm',
                                        row.p10 < 0 ? 'text-red-400' : 'text-red-400/70'
                                    )}>
                                        {formatNumber(row.p10, { compact: true, currency: row.unit })}
                                    </span>
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                    <span className="font-mono text-sm font-semibold text-[hsl(var(--text-primary))]">
                                        {formatNumber(row.p50, { compact: true, currency: row.unit })}
                                    </span>
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                    <span className={cn(
                                        'font-mono text-sm',
                                        row.p90 > 0 ? 'text-green-400' : 'text-green-400/70'
                                    )}>
                                        {formatNumber(row.p90, { compact: true, currency: row.unit })}
                                    </span>
                                </td>
                                {showActual && (
                                    <td className="py-2.5 px-2 text-right">
                                        {row.actual !== undefined ? (
                                            <span className="font-mono text-sm font-bold text-white">
                                                {formatNumber(row.actual, { compact: true, currency: row.unit })}
                                            </span>
                                        ) : (
                                            <span className="text-[hsl(var(--text-muted))]">—</span>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[hsl(var(--border-subtle))] text-[10px] text-[hsl(var(--text-muted))]">
                <span>P10 = 10% najgorszych scenariuszy</span>
                <span>•</span>
                <span>P50 = mediana</span>
                <span>•</span>
                <span>P90 = 90% scenariuszy</span>
            </div>
        </Card>
    );
}
