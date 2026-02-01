'use client';

// =============================================
// StochFin Charts: Risk Gauge
// Circular gauge showing probability
// =============================================

import React from 'react';
import { cn } from '@/lib/utils';

export interface GaugeChartProps {
    value: number;  // 0-1 probability
    label: string;
    size?: 'sm' | 'md' | 'lg';
    showThresholds?: boolean;
    thresholds?: {
        low: number;
        medium: number;
        high: number;
    };
    className?: string;
}

export function GaugeChart({
    value,
    label,
    size = 'md',
    showThresholds = true,
    thresholds = { low: 0.05, medium: 0.15, high: 0.30 },
    className
}: GaugeChartProps) {
    const clampedValue = Math.max(0, Math.min(1, value));

    // Size configurations
    const sizes = {
        sm: { diameter: 80, stroke: 6, fontSize: '1rem' },
        md: { diameter: 120, stroke: 8, fontSize: '1.5rem' },
        lg: { diameter: 160, stroke: 10, fontSize: '2rem' }
    };

    const { diameter, stroke, fontSize } = sizes[size];
    const radius = (diameter - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate arc length (180° = half circle gauge)
    const arcLength = circumference * 0.5;
    const offset = arcLength * (1 - clampedValue);

    // Determine risk level color
    const getColor = () => {
        if (clampedValue < thresholds.low) return 'hsl(142, 76%, 36%)';  // Green
        if (clampedValue < thresholds.medium) return 'hsl(48, 96%, 53%)'; // Yellow
        if (clampedValue < thresholds.high) return 'hsl(25, 95%, 53%)';   // Orange
        return 'hsl(0, 84%, 60%)';  // Red
    };

    const displayValue = (clampedValue * 100).toFixed(0);

    return (
        <div className={cn('flex flex-col items-center', className)}>
            <svg
                width={diameter}
                height={diameter / 2 + stroke}
                className="overflow-visible"
            >
                {/* Background arc */}
                <path
                    d={describeArc(diameter / 2, diameter / 2, radius, 180, 360)}
                    fill="none"
                    stroke="hsl(215, 28%, 23%)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                />

                {/* Threshold markers */}
                {showThresholds && (
                    <>
                        {[thresholds.low, thresholds.medium, thresholds.high].map((t, i) => {
                            const angle = 180 + (180 * t);
                            const x = diameter / 2 + radius * Math.cos((angle * Math.PI) / 180);
                            const y = diameter / 2 + radius * Math.sin((angle * Math.PI) / 180);
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r={2}
                                    fill="hsl(215, 20%, 45%)"
                                />
                            );
                        })}
                    </>
                )}

                {/* Value arc */}
                <path
                    d={describeArc(diameter / 2, diameter / 2, radius, 180, 180 + (180 * clampedValue))}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 0.5s ease-out',
                        filter: `drop-shadow(0 0 6px ${getColor()})`
                    }}
                />

                {/* Center value */}
                <text
                    x={diameter / 2}
                    y={diameter / 2 - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                        fontSize,
                        fontWeight: 700,
                        fill: getColor(),
                        fontVariantNumeric: 'tabular-nums'
                    }}
                >
                    {displayValue}%
                </text>
            </svg>

            <p className="text-xs text-[hsl(var(--text-secondary))] mt-1 text-center max-w-24">
                {label}
            </p>
        </div>
    );
}

// Helper function to describe an arc path
function describeArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
}

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
}
