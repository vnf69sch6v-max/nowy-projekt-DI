'use client';

import React, { useMemo } from 'react';

interface HistogramChartProps {
    data: number[];
    bins?: number;
    width?: number;
    height?: number;
    threshold?: number;
    thresholdLabel?: string;
    colorScheme?: 'blue' | 'red' | 'green' | 'purple';
    showStats?: boolean;
    xLabel?: string;
    title?: string;
}

export function HistogramChart({
    data,
    bins = 40,
    width = 400,
    height = 200,
    threshold,
    thresholdLabel,
    colorScheme = 'blue',
    showStats = true,
    xLabel,
    title
}: HistogramChartProps) {
    const padding = { left: 50, right: 20, top: 30, bottom: 40 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const colors = {
        blue: { fill: '#6366f1', stroke: '#4f46e5', bg: '#e0e7ff' },
        red: { fill: '#ef4444', stroke: '#dc2626', bg: '#fee2e2' },
        green: { fill: '#10b981', stroke: '#059669', bg: '#d1fae5' },
        purple: { fill: '#a855f7', stroke: '#9333ea', bg: '#f3e8ff' }
    };

    const { histogram, stats, minVal, maxVal, maxCount } = useMemo(() => {
        if (data.length === 0) {
            return { histogram: [], stats: null, minVal: 0, maxVal: 1, maxCount: 1 };
        }

        const sorted = [...data].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const range = max - min || 1;
        const binWidth = range / bins;

        // Create histogram bins
        const hist: { start: number; end: number; count: number }[] = [];
        for (let i = 0; i < bins; i++) {
            hist.push({
                start: min + i * binWidth,
                end: min + (i + 1) * binWidth,
                count: 0
            });
        }

        // Fill bins
        data.forEach(val => {
            const idx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
            if (idx >= 0 && idx < bins) {
                hist[idx].count++;
            }
        });

        // Calculate stats
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
        const std = Math.sqrt(variance);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p5 = sorted[Math.floor(sorted.length * 0.05)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];

        return {
            histogram: hist,
            stats: { mean, std, median, p5, p95 },
            minVal: min,
            maxVal: max,
            maxCount: Math.max(...hist.map(h => h.count))
        };
    }, [data, bins]);

    // Scale function
    const xScale = (val: number) => padding.left + ((val - minVal) / (maxVal - minVal)) * plotWidth;
    const yScale = (count: number) => padding.top + plotHeight - (count / maxCount) * plotHeight;

    const color = colors[colorScheme];

    return (
        <div className="flex flex-col">
            {title && (
                <div className="text-sm font-medium text-slate-700 mb-2">{title}</div>
            )}

            <svg width={width} height={height}>
                {/* Background */}
                <rect
                    x={padding.left}
                    y={padding.top}
                    width={plotWidth}
                    height={plotHeight}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                />

                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(pct => (
                    <line
                        key={pct}
                        x1={padding.left}
                        y1={padding.top + plotHeight * (1 - pct)}
                        x2={padding.left + plotWidth}
                        y2={padding.top + plotHeight * (1 - pct)}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                    />
                ))}

                {/* Histogram bars */}
                {histogram.map((bin, idx) => {
                    const barX = xScale(bin.start);
                    const barWidth = (plotWidth / bins) - 1;
                    const barHeight = (bin.count / maxCount) * plotHeight;
                    const isAboveThreshold = threshold !== undefined && bin.start >= threshold;

                    return (
                        <rect
                            key={idx}
                            x={barX}
                            y={padding.top + plotHeight - barHeight}
                            width={Math.max(1, barWidth)}
                            height={barHeight}
                            fill={isAboveThreshold ? '#ef4444' : color.fill}
                            opacity={0.7}
                        />
                    );
                })}

                {/* Threshold line */}
                {threshold !== undefined && threshold >= minVal && threshold <= maxVal && (
                    <>
                        <line
                            x1={xScale(threshold)}
                            y1={padding.top}
                            x2={xScale(threshold)}
                            y2={padding.top + plotHeight}
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5,5"
                        />
                        {thresholdLabel && (
                            <text
                                x={xScale(threshold) + 5}
                                y={padding.top + 15}
                                fill="#ef4444"
                                fontSize={10}
                            >
                                {thresholdLabel}
                            </text>
                        )}
                    </>
                )}

                {/* Mean line */}
                {stats && (
                    <line
                        x1={xScale(stats.mean)}
                        y1={padding.top}
                        x2={xScale(stats.mean)}
                        y2={padding.top + plotHeight}
                        stroke={color.stroke}
                        strokeWidth={2}
                    />
                )}

                {/* X-axis */}
                <line
                    x1={padding.left}
                    y1={padding.top + plotHeight}
                    x2={padding.left + plotWidth}
                    y2={padding.top + plotHeight}
                    stroke="#94a3b8"
                    strokeWidth={1}
                />

                {/* X-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const val = minVal + pct * (maxVal - minVal);
                    return (
                        <g key={pct}>
                            <line
                                x1={padding.left + pct * plotWidth}
                                y1={padding.top + plotHeight}
                                x2={padding.left + pct * plotWidth}
                                y2={padding.top + plotHeight + 5}
                                stroke="#94a3b8"
                                strokeWidth={1}
                            />
                            <text
                                x={padding.left + pct * plotWidth}
                                y={padding.top + plotHeight + 18}
                                textAnchor="middle"
                                fontSize={10}
                                fill="#64748b"
                            >
                                {val.toFixed(2)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis label */}
                {xLabel && (
                    <text
                        x={width / 2}
                        y={height - 5}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#64748b"
                    >
                        {xLabel}
                    </text>
                )}

                {/* Y-axis label */}
                <text
                    x={15}
                    y={height / 2}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#64748b"
                    transform={`rotate(-90, 15, ${height / 2})`}
                >
                    Częstość
                </text>
            </svg>

            {/* Stats display */}
            {showStats && stats && (
                <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
                    <span>μ = {stats.mean.toFixed(3)}</span>
                    <span>σ = {stats.std.toFixed(3)}</span>
                    <span>P5 = {stats.p5.toFixed(3)}</span>
                    <span>P95 = {stats.p95.toFixed(3)}</span>
                </div>
            )}
        </div>
    );
}

// Mini histogram for inline display
export function MiniHistogram({
    data,
    width = 100,
    height = 30,
    colorScheme = 'blue'
}: {
    data: number[];
    width?: number;
    height?: number;
    colorScheme?: 'blue' | 'red' | 'green' | 'purple';
}) {
    const colors = {
        blue: '#6366f1',
        red: '#ef4444',
        green: '#10b981',
        purple: '#a855f7'
    };

    const bins = 15;

    const histogram = useMemo(() => {
        if (data.length === 0) return [];

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const binWidth = range / bins;

        const hist: number[] = Array(bins).fill(0);
        data.forEach(val => {
            const idx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
            if (idx >= 0) hist[idx]++;
        });

        const maxCount = Math.max(...hist);
        return hist.map(c => c / maxCount);
    }, [data]);

    const barWidth = width / bins;

    return (
        <svg width={width} height={height}>
            {histogram.map((h, idx) => (
                <rect
                    key={idx}
                    x={idx * barWidth}
                    y={height - h * height}
                    width={barWidth - 1}
                    height={h * height}
                    fill={colors[colorScheme]}
                    opacity={0.7}
                />
            ))}
        </svg>
    );
}
