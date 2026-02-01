'use client';

import React from 'react';

interface ProbabilityGaugeProps {
    probability: number;  // 0-1
    ciLower?: number;
    ciUpper?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function ProbabilityGauge({
    probability,
    ciLower,
    ciUpper,
    size = 'md',
    showLabel = true
}: ProbabilityGaugeProps) {
    const percent = Math.round(probability * 100);

    // Determine color based on probability
    const getColor = (p: number) => {
        if (p < 0.15) return { main: '#10b981', bg: '#d1fae5', label: 'Niskie' };      // green
        if (p < 0.40) return { main: '#f59e0b', bg: '#fef3c7', label: 'Średnie' };     // amber
        if (p < 0.65) return { main: '#f97316', bg: '#ffedd5', label: 'Wysokie' };     // orange
        return { main: '#ef4444', bg: '#fee2e2', label: 'Krytyczne' };                 // red
    };

    const colors = getColor(probability);

    // Size configurations
    const sizes = {
        sm: { width: 100, height: 60, strokeWidth: 8, fontSize: '1rem' },
        md: { width: 160, height: 90, strokeWidth: 12, fontSize: '1.5rem' },
        lg: { width: 220, height: 120, strokeWidth: 16, fontSize: '2rem' }
    };

    const config = sizes[size];

    // Arc calculations
    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = Math.PI * radius; // Half circle
    const offset = circumference * (1 - probability);

    return (
        <div className="flex flex-col items-center">
            <svg
                width={config.width}
                height={config.height}
                viewBox={`0 0 ${config.width} ${config.height}`}
            >
                {/* Background arc */}
                <path
                    d={describeArc(
                        config.width / 2,
                        config.height - 5,
                        radius,
                        180,
                        0
                    )}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                />

                {/* Progress arc */}
                <path
                    d={describeArc(
                        config.width / 2,
                        config.height - 5,
                        radius,
                        180,
                        180 + (180 * probability)
                    )}
                    fill="none"
                    stroke={colors.main}
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 0.5s ease-in-out'
                    }}
                />

                {/* Percentage text */}
                <text
                    x={config.width / 2}
                    y={config.height - 15}
                    textAnchor="middle"
                    fill={colors.main}
                    fontSize={config.fontSize}
                    fontWeight="bold"
                >
                    {percent}%
                </text>
            </svg>

            {/* Confidence interval */}
            {(ciLower !== undefined && ciUpper !== undefined) && (
                <div className="text-xs text-slate-500 -mt-1">
                    [{Math.round(ciLower * 100)}% — {Math.round(ciUpper * 100)}%]
                </div>
            )}

            {/* Risk label */}
            {showLabel && (
                <div
                    className="mt-2 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                        backgroundColor: colors.bg,
                        color: colors.main
                    }}
                >
                    {colors.label} ryzyko
                </div>
            )}
        </div>
    );
}

// Helper function to describe SVG arc
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}
