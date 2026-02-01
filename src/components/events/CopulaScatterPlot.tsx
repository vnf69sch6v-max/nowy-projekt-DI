'use client';

import React, { useMemo } from 'react';

interface CopulaScatterPlotProps {
    samples: [number, number][];  // Array of (u, v) pairs in [0,1]²
    copulaName: string;
    width?: number;
    height?: number;
    showDensity?: boolean;
    highlightCorner?: 'lower-left' | 'upper-right' | 'both' | null;
    title?: string;
}

export function CopulaScatterPlot({
    samples,
    copulaName,
    width = 280,
    height = 280,
    showDensity = true,
    highlightCorner = null,
    title
}: CopulaScatterPlotProps) {
    const padding = 40;
    const plotSize = width - padding * 2;

    // Calculate density grid for heatmap background
    const densityGrid = useMemo(() => {
        if (!showDensity) return null;

        const gridSize = 20;
        const grid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));

        samples.forEach(([u, v]) => {
            const i = Math.min(Math.floor(u * gridSize), gridSize - 1);
            const j = Math.min(Math.floor(v * gridSize), gridSize - 1);
            grid[i][j]++;
        });

        // Normalize
        const maxCount = Math.max(...grid.flat());
        return grid.map(row => row.map(count => count / maxCount));
    }, [samples, showDensity]);

    // Density color function
    const getDensityColor = (density: number) => {
        if (density < 0.1) return '#f8fafc';
        if (density < 0.3) return '#e0e7ff';
        if (density < 0.5) return '#c7d2fe';
        if (density < 0.7) return '#a5b4fc';
        if (density < 0.9) return '#818cf8';
        return '#6366f1';
    };

    // Get corner highlight color
    const getCornerHighlight = () => {
        switch (highlightCorner) {
            case 'lower-left': return { x: 0, y: 0.7, label: 'Dolny ogon (Clayton)' };
            case 'upper-right': return { x: 0.7, y: 0.7, label: 'Górny ogon (Gumbel)' };
            case 'both': return { x: 0, y: 0, label: 't-Student (oba)' };
            default: return null;
        }
    };

    const cornerHighlight = getCornerHighlight();

    return (
        <div className="flex flex-col items-center">
            {title && (
                <div className="text-sm font-medium text-slate-700 mb-2">{title}</div>
            )}

            <svg width={width} height={height} className="bg-white rounded-lg">
                {/* Background */}
                <rect
                    x={padding}
                    y={padding}
                    width={plotSize}
                    height={plotSize}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                />

                {/* Density heatmap */}
                {densityGrid && densityGrid.map((row, i) =>
                    row.map((density, j) => (
                        <rect
                            key={`${i}-${j}`}
                            x={padding + i * (plotSize / 20)}
                            y={padding + (19 - j) * (plotSize / 20)}
                            width={plotSize / 20 + 1}
                            height={plotSize / 20 + 1}
                            fill={getDensityColor(density)}
                        />
                    ))
                )}

                {/* Corner highlight zone */}
                {cornerHighlight && (
                    <rect
                        x={padding + cornerHighlight.x * plotSize}
                        y={padding + (1 - cornerHighlight.y - 0.3) * plotSize}
                        width={plotSize * 0.3}
                        height={plotSize * 0.3}
                        fill="rgba(239, 68, 68, 0.15)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4,4"
                        rx={4}
                    />
                )}

                {/* Sample points */}
                {samples.slice(0, 2000).map(([u, v], idx) => (
                    <circle
                        key={idx}
                        cx={padding + u * plotSize}
                        cy={padding + (1 - v) * plotSize}
                        r={1.5}
                        fill="rgba(99, 102, 241, 0.4)"
                    />
                ))}

                {/* Axes */}
                <line
                    x1={padding} y1={height - padding}
                    x2={width - padding} y2={height - padding}
                    stroke="#94a3b8" strokeWidth={1}
                />
                <line
                    x1={padding} y1={padding}
                    x2={padding} y2={height - padding}
                    stroke="#94a3b8" strokeWidth={1}
                />

                {/* Axis labels */}
                <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={12} fill="#64748b">
                    U₁
                </text>
                <text
                    x={12} y={height / 2}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#64748b"
                    transform={`rotate(-90, 12, ${height / 2})`}
                >
                    U₂
                </text>

                {/* Tick marks */}
                {[0, 0.5, 1].map(tick => (
                    <g key={tick}>
                        <text
                            x={padding + tick * plotSize}
                            y={height - padding + 15}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#94a3b8"
                        >
                            {tick}
                        </text>
                        <text
                            x={padding - 8}
                            y={padding + (1 - tick) * plotSize + 4}
                            textAnchor="end"
                            fontSize={10}
                            fill="#94a3b8"
                        >
                            {tick}
                        </text>
                    </g>
                ))}
            </svg>

            {/* Copula name badge */}
            <div className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {copulaName}
            </div>

            {/* Corner label */}
            {cornerHighlight && (
                <div className="mt-1 text-xs text-red-500">
                    {cornerHighlight.label}
                </div>
            )}
        </div>
    );
}

// Component for comparing multiple copulas side by side
interface CopulaComparisonProps {
    gaussianSamples: [number, number][];
    claytonSamples: [number, number][];
    gumbelSamples: [number, number][];
    tSamples?: [number, number][];
    probabilities?: {
        gaussian: number;
        clayton: number;
        gumbel: number;
        student_t?: number;
    };
}

export function CopulaComparison({
    gaussianSamples,
    claytonSamples,
    gumbelSamples,
    tSamples,
    probabilities
}: CopulaComparisonProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
                Struktura zależności ogonowych
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
                    <CopulaScatterPlot
                        samples={gaussianSamples}
                        copulaName="Gaussian"
                        width={200}
                        height={200}
                        highlightCorner={null}
                    />
                    {probabilities && (
                        <div className="mt-3 text-center">
                            <div className="text-2xl font-bold text-slate-700">
                                {(probabilities.gaussian * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">λ_L = 0.00</div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <CopulaScatterPlot
                        samples={claytonSamples}
                        copulaName="Clayton"
                        width={200}
                        height={200}
                        highlightCorner="lower-left"
                    />
                    {probabilities && (
                        <div className="mt-3 text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {(probabilities.clayton * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-red-500">λ_L = 0.41</div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
                    <CopulaScatterPlot
                        samples={gumbelSamples}
                        copulaName="Gumbel"
                        width={200}
                        height={200}
                        highlightCorner="upper-right"
                    />
                    {probabilities && (
                        <div className="mt-3 text-center">
                            <div className="text-2xl font-bold text-slate-700">
                                {(probabilities.gumbel * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">λ_U = 0.35</div>
                        </div>
                    )}
                </div>

                {tSamples && (
                    <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
                        <CopulaScatterPlot
                            samples={tSamples}
                            copulaName="t-Student"
                            width={200}
                            height={200}
                            highlightCorner="both"
                        />
                        {probabilities?.student_t && (
                            <div className="mt-3 text-center">
                                <div className="text-2xl font-bold text-slate-700">
                                    {(probabilities.student_t * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-slate-500">λ = 0.25</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Interpretation */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div className="text-sm text-amber-800">
                        <strong>Interpretacja:</strong> Clayton (λ_L = 0.41) modeluje "rozlewanie się kryzysu" —
                        gdy jedna zmienna drastycznie spada, druga również. Stąd P(zdarzenie) dla Claytona
                        może być kilkukrotnie wyższe niż dla Gaussa, który nie uwzględnia zależności ogonowych.
                    </div>
                </div>
            </div>
        </div>
    );
}
