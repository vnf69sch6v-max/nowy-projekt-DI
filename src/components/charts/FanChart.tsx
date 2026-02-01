'use client';

// =============================================
// StochFin Charts: Fan Chart
// Time series with confidence bands
// =============================================

import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from 'recharts';
import { cn, formatNumber, formatDate } from '@/lib/utils';

export interface FanChartDataPoint {
    date: string;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    actual?: number;  // Historical actual values
}

export interface FanChartProps {
    data: FanChartDataPoint[];
    title?: string;
    unit?: string;
    showGrid?: boolean;
    height?: number;
    className?: string;
}

export function FanChart({
    data,
    title,
    unit = 'PLN',
    showGrid = true,
    height = 300,
    className
}: FanChartProps) {
    // Transform data for shaded areas
    const chartData = useMemo(() => {
        return data.map(d => ({
            ...d,
            // For area charts, we need to compute the band heights
            band_90: [d.p10, d.p90],
            band_50: [d.p25, d.p75]
        }));
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ value: number; name: string; color: string }>;
        label?: string;
    }) => {
        if (!active || !payload?.length) return null;

        const dataPoint = data.find(d => d.date === label);
        if (!dataPoint) return null;

        return (
            <div className="bg-[hsl(var(--surface-3))] border border-[hsl(var(--border-default))] rounded-lg p-3 shadow-lg">
                <p className="text-xs text-[hsl(var(--text-secondary))] mb-2">
                    {formatDate(label || '', 'long')}
                </p>
                <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[hsl(var(--text-muted))]">P90 (optymistyczny)</span>
                        <span className="text-green-400 font-mono">
                            {formatNumber(dataPoint.p90, { compact: true, currency: unit })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[hsl(var(--text-muted))]">P75</span>
                        <span className="text-green-400/70 font-mono">
                            {formatNumber(dataPoint.p75, { compact: true, currency: unit })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 font-semibold">
                        <span className="text-[hsl(var(--text-primary))]">P50 (mediana)</span>
                        <span className="text-[hsl(var(--color-primary))] font-mono">
                            {formatNumber(dataPoint.p50, { compact: true, currency: unit })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[hsl(var(--text-muted))]">P25</span>
                        <span className="text-orange-400/70 font-mono">
                            {formatNumber(dataPoint.p25, { compact: true, currency: unit })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[hsl(var(--text-muted))]">P10 (pesymistyczny)</span>
                        <span className="text-red-400 font-mono">
                            {formatNumber(dataPoint.p10, { compact: true, currency: unit })}
                        </span>
                    </div>
                    {dataPoint.actual !== undefined && (
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-[hsl(var(--border-subtle))]">
                            <span className="text-[hsl(var(--text-secondary))]">Rzeczywista</span>
                            <span className="text-white font-mono font-semibold">
                                {formatNumber(dataPoint.actual, { compact: true, currency: unit })}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={cn('w-full', className)}>
            {title && (
                <h4 className="text-sm font-medium text-[hsl(var(--text-secondary))] mb-3">
                    {title}
                </h4>
            )}
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(215, 20%, 25%)"
                            vertical={false}
                        />
                    )}

                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }}
                        tickLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        axisLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        tickFormatter={(v) => formatDate(v)}
                    />

                    <YAxis
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }}
                        tickLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        axisLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        tickFormatter={(v) => formatNumber(v, { compact: true })}
                        width={60}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    {/* P10-P90 band (widest) */}
                    <Area
                        type="monotone"
                        dataKey="band_90"
                        fill="hsl(220, 90%, 56%, 0.1)"
                        stroke="none"
                        isAnimationActive={false}
                    />

                    {/* P25-P75 band */}
                    <Area
                        type="monotone"
                        dataKey="band_50"
                        fill="hsl(220, 90%, 56%, 0.2)"
                        stroke="none"
                        isAnimationActive={false}
                    />

                    {/* P50 median line */}
                    <Line
                        type="monotone"
                        dataKey="p50"
                        stroke="hsl(220, 90%, 56%)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />

                    {/* Actual values if present */}
                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="white"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ fill: 'white', r: 3 }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-[hsl(var(--text-muted))]">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[hsl(220,90%,56%,0.1)]" />
                    <span>P10–P90</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[hsl(220,90%,56%,0.3)]" />
                    <span>P25–P75</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-[hsl(220,90%,56%)]" />
                    <span>Mediana</span>
                </div>
            </div>
        </div>
    );
}
