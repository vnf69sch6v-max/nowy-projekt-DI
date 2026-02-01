'use client';

// =============================================
// StochFin Charts: Histogram
// Distribution visualization with percentile markers
// =============================================

import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    Cell
} from 'recharts';
import { cn, formatNumber } from '@/lib/utils';

export interface HistogramProps {
    values: number[];
    bins?: number;
    title?: string;
    unit?: string;
    showPercentileMarkers?: boolean;
    highlightTail?: number;  // Highlight values below this percentile
    height?: number;
    className?: string;
}

export function Histogram({
    values,
    bins = 30,
    title,
    unit = '',
    showPercentileMarkers = true,
    highlightTail = 10,
    height = 200,
    className
}: HistogramProps) {
    // Calculate histogram data
    const { histogramData, percentiles } = useMemo((): {
        histogramData: Array<{
            bin: number;
            binStart: number;
            binEnd: number;
            count: number;
            frequency: number;
            isTail: boolean;
        }>;
        percentiles: {
            p5: number;
            p10: number;
            p25: number;
            p50: number;
            p75: number;
            p90: number;
            p95: number;
        };
    } => {
        if (values.length === 0) {
            return {
                histogramData: [],
                percentiles: { p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }
            };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const binWidth = (max - min) / bins;

        // Create bins
        const binCounts = new Array(bins).fill(0);
        for (const v of values) {
            const binIndex = Math.min(bins - 1, Math.floor((v - min) / binWidth));
            binCounts[binIndex]++;
        }

        // Calculate percentiles
        const getPercentile = (p: number) => {
            const index = Math.floor((p / 100) * (sorted.length - 1));
            return sorted[index];
        };

        const percentiles = {
            p5: getPercentile(5),
            p10: getPercentile(10),
            p25: getPercentile(25),
            p50: getPercentile(50),
            p75: getPercentile(75),
            p90: getPercentile(90),
            p95: getPercentile(95)
        };

        // Convert to chart data
        const histogramData = binCounts.map((count, i) => {
            const binStart = min + i * binWidth;
            const binMid = binStart + binWidth / 2;
            const isTail = binMid < percentiles.p10;

            return {
                bin: binMid,
                binStart,
                binEnd: binStart + binWidth,
                count,
                frequency: count / values.length,
                isTail
            };
        });

        return { histogramData, percentiles };
    }, [values, bins]);

    if (values.length === 0) {
        return (
            <div className={cn('w-full flex items-center justify-center text-[hsl(var(--text-muted))]', className)} style={{ height }}>
                Brak danych
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: {
        active?: boolean;
        payload?: Array<{ payload: typeof histogramData[0] }>;
    }) => {
        if (!active || !payload?.length) return null;

        const data = payload[0].payload;

        return (
            <div className="bg-[hsl(var(--surface-3))] border border-[hsl(var(--border-default))] rounded-lg p-2 shadow-lg text-xs">
                <p className="text-[hsl(var(--text-secondary))]">
                    {formatNumber(data.binStart, { decimals: 0 })} – {formatNumber(data.binEnd, { decimals: 0 })} {unit}
                </p>
                <p className="font-semibold text-[hsl(var(--text-primary))]">
                    {data.count} scenariuszy ({(data.frequency * 100).toFixed(1)}%)
                </p>
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
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                        dataKey="bin"
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
                        tickLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        axisLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        tickFormatter={(v) => formatNumber(v, { compact: true })}
                    />

                    <YAxis
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
                        tickLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        axisLine={{ stroke: 'hsl(215, 20%, 35%)' }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        width={40}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    {/* Percentile markers */}
                    {showPercentileMarkers && (
                        <>
                            <ReferenceLine
                                x={percentiles.p10}
                                stroke="hsl(0, 84%, 60%)"
                                strokeDasharray="3 3"
                                label={{ value: 'P10', fill: 'hsl(0, 84%, 60%)', fontSize: 10 }}
                            />
                            <ReferenceLine
                                x={percentiles.p50}
                                stroke="hsl(220, 90%, 56%)"
                                strokeWidth={2}
                                label={{ value: 'P50', fill: 'hsl(220, 90%, 56%)', fontSize: 10 }}
                            />
                            <ReferenceLine
                                x={percentiles.p90}
                                stroke="hsl(142, 76%, 36%)"
                                strokeDasharray="3 3"
                                label={{ value: 'P90', fill: 'hsl(142, 76%, 36%)', fontSize: 10 }}
                            />
                        </>
                    )}

                    <Bar dataKey="frequency" isAnimationActive={false}>
                        {histogramData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isTail
                                    ? 'hsl(0, 84%, 60%, 0.6)'
                                    : 'hsl(220, 90%, 56%, 0.6)'
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Statistics summary */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="text-red-400">
                    P10: {formatNumber(percentiles.p10, { decimals: 0, currency: unit })}
                </div>
                <div className="text-[hsl(var(--color-primary))] font-semibold">
                    Mediana: {formatNumber(percentiles.p50, { decimals: 0, currency: unit })}
                </div>
                <div className="text-green-400">
                    P90: {formatNumber(percentiles.p90, { decimals: 0, currency: unit })}
                </div>
            </div>
        </div>
    );
}
