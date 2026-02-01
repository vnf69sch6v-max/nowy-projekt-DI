'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui';

interface BayesianUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventName: string;
    currentProbability: number;
    onUpdate: (newProbability: number, notes: string) => void;
}

interface PriorConfig {
    alpha: number;
    beta: number;
}

// Beta distribution PDF
function betaPDF(x: number, alpha: number, beta: number): number {
    if (x <= 0 || x >= 1) return 0;

    // Using log-gamma for numerical stability
    const logBeta = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
    const logPDF = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBeta;

    return Math.exp(logPDF);
}

// Log-gamma function (Stirling's approximation)
function logGamma(z: number): number {
    const c = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5
    ];

    let x = z;
    let y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
        y++;
        ser += c[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Calculate posterior parameters
function updateBeta(prior: PriorConfig, successes: number, trials: number): PriorConfig {
    return {
        alpha: prior.alpha + successes,
        beta: prior.beta + trials - successes
    };
}

// Calculate mean of Beta distribution
function betaMean(alpha: number, beta: number): number {
    return alpha / (alpha + beta);
}

// Calculate 90% HDI (Highest Density Interval) approximately
function betaHDI90(alpha: number, beta: number): [number, number] {
    // Approximate using quantiles
    const points: number[] = [];
    for (let i = 1; i <= 99; i++) {
        points.push(i / 100);
    }

    // Sort by density
    const densities = points.map(x => ({ x, d: betaPDF(x, alpha, beta) }));
    densities.sort((a, b) => b.d - a.d);

    // Take top 90%
    const hdi = densities.slice(0, 90).map(p => p.x);
    return [Math.min(...hdi), Math.max(...hdi)];
}

export function BayesianUpdateModal({
    isOpen,
    onClose,
    eventName,
    currentProbability,
    onUpdate
}: BayesianUpdateModalProps) {
    // Prior parameters (derived from current probability)
    const [priorStrength, setPriorStrength] = useState(20); // n equivalent

    const prior = useMemo((): PriorConfig => {
        // Convert current probability to Beta parameters with given strength
        const alpha = currentProbability * priorStrength;
        const beta = (1 - currentProbability) * priorStrength;
        return { alpha: Math.max(0.5, alpha), beta: Math.max(0.5, beta) };
    }, [currentProbability, priorStrength]);

    // New evidence
    const [newTrials, setNewTrials] = useState(10);
    const [newSuccesses, setNewSuccesses] = useState(2);
    const [updateNotes, setUpdateNotes] = useState('');

    // Posterior calculation
    const posterior = useMemo(() => {
        return updateBeta(prior, newSuccesses, newTrials);
    }, [prior, newSuccesses, newTrials]);

    const posteriorMean = useMemo(() => betaMean(posterior.alpha, posterior.beta), [posterior]);
    const priorMean = useMemo(() => betaMean(prior.alpha, prior.beta), [prior]);

    const priorHDI = useMemo(() => betaHDI90(prior.alpha, prior.beta), [prior]);
    const posteriorHDI = useMemo(() => betaHDI90(posterior.alpha, posterior.beta), [posterior]);

    // Generate distribution curves
    const distributionData = useMemo(() => {
        const points: { x: number; prior: number; posterior: number; likelihood: number }[] = [];

        for (let i = 0; i <= 100; i++) {
            const x = i / 100;
            const priorDensity = betaPDF(x, prior.alpha, prior.beta);
            const posteriorDensity = betaPDF(x, posterior.alpha, posterior.beta);

            // Binomial likelihood
            const p = x;
            const likelihood = Math.pow(p, newSuccesses) * Math.pow(1 - p, newTrials - newSuccesses);

            points.push({
                x,
                prior: priorDensity,
                posterior: posteriorDensity,
                likelihood: likelihood * 100 // Scale for visibility
            });
        }

        // Normalize for display
        const maxPrior = Math.max(...points.map(p => p.prior));
        const maxPosterior = Math.max(...points.map(p => p.posterior));
        const maxLikelihood = Math.max(...points.map(p => p.likelihood));
        const maxY = Math.max(maxPrior, maxPosterior, maxLikelihood);

        return { points, maxY };
    }, [prior, posterior, newSuccesses, newTrials]);

    const handleSubmit = useCallback(() => {
        onUpdate(posteriorMean, updateNotes);
        onClose();
    }, [posteriorMean, updateNotes, onUpdate, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Aktualizacja Bayesowska
                    </h2>
                    <p className="text-sm text-slate-500">
                        {eventName} — P(prior) = {(priorMean * 100).toFixed(1)}%
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Distribution visualization */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">
                            Rozkłady: Prior → Posterior
                        </h3>

                        <svg
                            viewBox="0 0 500 200"
                            className="w-full h-48"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Grid */}
                            <defs>
                                <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect x="40" y="10" width="440" height="160" fill="url(#grid)" />

                            {/* Prior curve (blue) */}
                            <path
                                d={`M ${40 + distributionData.points[0].x * 440} ${170 - (distributionData.points[0].prior / distributionData.maxY) * 150} ` +
                                    distributionData.points.map((p, i) =>
                                        `L ${40 + p.x * 440} ${170 - (p.prior / distributionData.maxY) * 150}`
                                    ).join(' ')}
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2"
                                opacity="0.6"
                            />

                            {/* Posterior curve (purple) */}
                            <path
                                d={`M ${40 + distributionData.points[0].x * 440} ${170 - (distributionData.points[0].posterior / distributionData.maxY) * 150} ` +
                                    distributionData.points.map((p, i) =>
                                        `L ${40 + p.x * 440} ${170 - (p.posterior / distributionData.maxY) * 150}`
                                    ).join(' ')}
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="3"
                            />

                            {/* Prior mean line */}
                            <line
                                x1={40 + priorMean * 440} y1="10"
                                x2={40 + priorMean * 440} y2="170"
                                stroke="#6366f1"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                            />

                            {/* Posterior mean line */}
                            <line
                                x1={40 + posteriorMean * 440} y1="10"
                                x2={40 + posteriorMean * 440} y2="170"
                                stroke="#a855f7"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                            />

                            {/* X-axis labels */}
                            {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                                <text
                                    key={tick}
                                    x={40 + tick * 440}
                                    y="190"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#94a3b8"
                                >
                                    {(tick * 100).toFixed(0)}%
                                </text>
                            ))}

                            {/* Labels */}
                            <text x="45" y="25" fontSize="11" fill="#6366f1">Prior</text>
                            <text x="45" y="40" fontSize="11" fill="#a855f7">Posterior</text>
                        </svg>

                        {/* Legend */}
                        <div className="flex items-center gap-6 mt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-indigo-500 rounded opacity-60" />
                                <span className="text-xs text-slate-600">
                                    Prior: Beta({prior.alpha.toFixed(1)}, {prior.beta.toFixed(1)})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-purple-500 rounded" />
                                <span className="text-xs text-slate-600">
                                    Posterior: Beta({posterior.alpha.toFixed(1)}, {posterior.beta.toFixed(1)})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Evidence input */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nowe obserwacje (próby)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={1000}
                                value={newTrials}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value) || 1;
                                    setNewTrials(v);
                                    if (newSuccesses > v) setNewSuccesses(v);
                                }}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Ile nowych przypadków zaobserwowano
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Sukcesy (zdarzenia)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={newTrials}
                                value={newSuccesses}
                                onChange={(e) => setNewSuccesses(Math.min(parseInt(e.target.value) || 0, newTrials))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Ile razy zdarzenie wystąpiło
                            </p>
                        </div>
                    </div>

                    {/* Prior strength slider */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Siła priora (n-equivalent): {priorStrength}
                        </label>
                        <input
                            type="range"
                            min={5}
                            max={100}
                            value={priorStrength}
                            onChange={(e) => setPriorStrength(parseInt(e.target.value))}
                            className="w-full accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>Słaby (elastyczny)</span>
                            <span>Silny (sztywny)</span>
                        </div>
                    </div>

                    {/* Results summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-xl text-center">
                            <div className="text-sm text-indigo-600">Prior</div>
                            <div className="text-2xl font-bold text-indigo-700">
                                {(priorMean * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-indigo-500">
                                [{(priorHDI[0] * 100).toFixed(0)}% — {(priorHDI[1] * 100).toFixed(0)}%]
                            </div>
                        </div>

                        <div className="p-4 bg-slate-100 rounded-xl text-center flex flex-col justify-center">
                            <div className="text-2xl">→</div>
                            <div className="text-xs text-slate-500">
                                +{newSuccesses}/{newTrials}
                            </div>
                        </div>

                        <div className="p-4 bg-purple-50 rounded-xl text-center">
                            <div className="text-sm text-purple-600">Posterior</div>
                            <div className="text-2xl font-bold text-purple-700">
                                {(posteriorMean * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-purple-500">
                                [{(posteriorHDI[0] * 100).toFixed(0)}% — {(posteriorHDI[1] * 100).toFixed(0)}%]
                            </div>
                        </div>
                    </div>

                    {/* Delta indicator */}
                    <div className={`p-3 rounded-lg text-center ${posteriorMean > priorMean
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                        <span className="font-medium">
                            Δ = {((posteriorMean - priorMean) * 100).toFixed(2)} punktów procentowych
                        </span>
                        <span className="ml-2">
                            {posteriorMean > priorMean ? '↑ Ryzyko wzrosło' : '↓ Ryzyko spadło'}
                        </span>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notatki do aktualizacji
                        </label>
                        <textarea
                            value={updateNotes}
                            onChange={(e) => setUpdateNotes(e.target.value)}
                            placeholder="np. Dane Q4 2025, korekta na podstawie nowych publikacji..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
                    <Button variant="secondary" onClick={onClose}>
                        Anuluj
                    </Button>
                    <Button onClick={handleSubmit}>
                        Zapisz aktualizację
                    </Button>
                </div>
            </div>
        </div>
    );
}
