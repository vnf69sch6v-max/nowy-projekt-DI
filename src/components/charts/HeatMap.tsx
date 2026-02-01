'use client';

// =============================================
// StochFin Charts: Correlation Heatmap
// Interactive correlation matrix visualization
// =============================================

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface HeatmapProps {
    variables: string[];
    matrix: number[][];
    onCellClick?: (i: number, j: number) => void;
    highlightDiagonal?: boolean;
    showLabels?: boolean;
    cellSize?: number;
    className?: string;
}

export function CorrelationHeatmap({
    variables,
    matrix,
    onCellClick,
    highlightDiagonal = false,
    showLabels = true,
    cellSize = 48,
    className
}: HeatmapProps) {
    // Color mapping: -1 (red) -> 0 (neutral) -> +1 (green)
    const getColor = (value: number) => {
        if (value >= 0) {
            // Positive: interpolate from gray to green
            const intensity = Math.abs(value);
            return `hsl(142, ${Math.round(76 * intensity)}%, ${Math.round(36 + 20 * (1 - intensity))}%)`;
        } else {
            // Negative: interpolate from gray to red
            const intensity = Math.abs(value);
            return `hsl(0, ${Math.round(84 * intensity)}%, ${Math.round(50 + 10 * (1 - intensity))}%)`;
        }
    };

    const getTextColor = (value: number) => {
        const intensity = Math.abs(value);
        return intensity > 0.5 ? 'white' : 'hsl(215, 20%, 65%)';
    };

    return (
        <div className={cn('overflow-x-auto', className)}>
            <div
                className="inline-grid gap-0.5"
                style={{
                    gridTemplateColumns: `auto repeat(${variables.length}, ${cellSize}px)`
                }}
            >
                {/* Header row */}
                <div /> {/* Empty corner cell */}
                {variables.map((v, i) => (
                    <div
                        key={`header-${i}`}
                        className="flex items-end justify-center pb-1 text-[10px] text-[hsl(var(--text-muted))] font-medium"
                        style={{ height: cellSize, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        title={v}
                    >
                        <span className="truncate max-h-12">{v}</span>
                    </div>
                ))}

                {/* Data rows */}
                {variables.map((rowVar, i) => (
                    <React.Fragment key={`row-${i}`}>
                        {/* Row label */}
                        <div
                            className="flex items-center justify-end pr-2 text-[10px] text-[hsl(var(--text-muted))] font-medium"
                            style={{ height: cellSize }}
                            title={rowVar}
                        >
                            <span className="truncate max-w-20">{rowVar}</span>
                        </div>

                        {/* Cells */}
                        {variables.map((colVar, j) => {
                            const value = matrix[i]?.[j] ?? 0;
                            const isDiagonal = i === j;

                            return (
                                <div
                                    key={`cell-${i}-${j}`}
                                    className={cn(
                                        'flex items-center justify-center text-xs font-mono transition-all duration-150 rounded-sm',
                                        onCellClick && !isDiagonal && 'cursor-pointer hover:scale-105 hover:z-10',
                                        isDiagonal && highlightDiagonal && 'ring-1 ring-white/20'
                                    )}
                                    style={{
                                        width: cellSize,
                                        height: cellSize,
                                        backgroundColor: isDiagonal ? 'hsl(215, 28%, 28%)' : getColor(value),
                                        color: getTextColor(value)
                                    }}
                                    onClick={() => !isDiagonal && onCellClick?.(i, j)}
                                    title={`${rowVar} ↔ ${colVar}: ${value.toFixed(2)}`}
                                >
                                    {showLabels && (isDiagonal ? '1.00' : value.toFixed(2))}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Color legend */}
            <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-[10px] text-[hsl(var(--text-muted))]">−1</span>
                <div
                    className="w-32 h-3 rounded"
                    style={{
                        background: 'linear-gradient(to right, hsl(0, 84%, 50%), hsl(215, 20%, 40%), hsl(142, 76%, 40%))'
                    }}
                />
                <span className="text-[10px] text-[hsl(var(--text-muted))]">+1</span>
            </div>
        </div>
    );
}
