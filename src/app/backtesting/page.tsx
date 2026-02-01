'use client';

// =============================================
// StochFin: Backtesting Page
// =============================================

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, getRiskLevelFromProbability } from '@/components/ui/RiskBadge';
import { FanChart } from '@/components/charts/FanChart';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
    Plus,
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ArrowRight
} from 'lucide-react';

// Demo data with actual values falling within or outside predictions
const DEMO_BACKTEST_RESULTS = [
    {
        id: '1',
        periodLabel: 'Q1 2025',
        modelName: 'Prognoza 2025',
        variable: 'EBITDA',
        predicted: { p10: 1200000, p50: 1800000, p90: 2400000 },
        actual: 1950000,
        inRange: true,
        percentile: 62
    },
    {
        id: '2',
        periodLabel: 'Q1 2025',
        modelName: 'Prognoza 2025',
        variable: 'Przychody',
        predicted: { p10: 8000000, p50: 10000000, p90: 12000000 },
        actual: 10500000,
        inRange: true,
        percentile: 55
    },
    {
        id: '3',
        periodLabel: 'Q1 2025',
        modelName: 'Prognoza 2025',
        variable: 'Free Cash Flow',
        predicted: { p10: 200000, p50: 600000, p90: 1000000 },
        actual: 120000,
        inRange: false,
        percentile: 5
    },
    {
        id: '4',
        periodLabel: 'Q4 2024',
        modelName: 'Prognoza Q4',
        variable: 'EBITDA',
        predicted: { p10: 1100000, p50: 1600000, p90: 2100000 },
        actual: 1450000,
        inRange: true,
        percentile: 38
    }
];

const DEMO_FAN_CHART_DATA = [
    { date: '2024-01', p10: 1100000, p25: 1300000, p50: 1600000, p75: 1900000, p90: 2100000, actual: 1580000 },
    { date: '2024-04', p10: 1150000, p25: 1350000, p50: 1650000, p75: 1950000, p90: 2150000, actual: 1620000 },
    { date: '2024-07', p10: 1200000, p25: 1400000, p50: 1700000, p75: 2000000, p90: 2200000, actual: 1710000 },
    { date: '2024-10', p10: 1180000, p25: 1380000, p50: 1680000, p75: 1980000, p90: 2180000, actual: 1450000 },
    { date: '2025-01', p10: 1200000, p25: 1450000, p50: 1800000, p75: 2100000, p90: 2400000, actual: 1950000 },
];

// Calibration metrics
const CALIBRATION_METRICS = {
    coverage80: 0.75,  // Should be ~80%
    coverage50: 0.48,  // Should be ~50%
    meanAbsoluteError: 0.12,
    bias: 0.02  // Slight optimistic bias
};

export default function BacktestingPage() {
    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Backtesting</h1>
                        <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                            Porównaj prognozy z rzeczywistymi wynikami
                        </p>
                    </div>
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        Nowy backtest
                    </Button>
                </div>

                {/* Calibration Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs uppercase tracking-wide text-[hsl(var(--text-muted))] mb-1">
                                Coverage (P10-P90)
                            </p>
                            <p className={cn(
                                'text-2xl font-bold font-mono',
                                Math.abs(CALIBRATION_METRICS.coverage80 - 0.8) < 0.1 ? 'text-green-400' : 'text-orange-400'
                            )}>
                                {(CALIBRATION_METRICS.coverage80 * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                Cel: 80%
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs uppercase tracking-wide text-[hsl(var(--text-muted))] mb-1">
                                Coverage (P25-P75)
                            </p>
                            <p className={cn(
                                'text-2xl font-bold font-mono',
                                Math.abs(CALIBRATION_METRICS.coverage50 - 0.5) < 0.1 ? 'text-green-400' : 'text-orange-400'
                            )}>
                                {(CALIBRATION_METRICS.coverage50 * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                Cel: 50%
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs uppercase tracking-wide text-[hsl(var(--text-muted))] mb-1">
                                Średni błąd (%)
                            </p>
                            <p className="text-2xl font-bold font-mono text-blue-400">
                                {(CALIBRATION_METRICS.meanAbsoluteError * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                MAE względem P50
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs uppercase tracking-wide text-[hsl(var(--text-muted))] mb-1">
                                Bias
                            </p>
                            <div className="flex items-center gap-2">
                                <p className={cn(
                                    'text-2xl font-bold font-mono',
                                    CALIBRATION_METRICS.bias > 0 ? 'text-green-400' : 'text-red-400'
                                )}>
                                    {CALIBRATION_METRICS.bias > 0 ? '+' : ''}{(CALIBRATION_METRICS.bias * 100).toFixed(1)}%
                                </p>
                                {CALIBRATION_METRICS.bias > 0
                                    ? <TrendingUp className="w-5 h-5 text-green-400" />
                                    : <TrendingDown className="w-5 h-5 text-red-400" />
                                }
                            </div>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                Optymistyczny
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Historical Comparison Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>EBITDA – prognoza vs. rzeczywistość</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FanChart
                            data={DEMO_FAN_CHART_DATA}
                            unit="PLN"
                            height={300}
                        />
                    </CardContent>
                </Card>

                {/* Backtest Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Wyniki backtestów</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[hsl(var(--border-subtle))]">
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Okres
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Zmienna
                                    </th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Prognoza (P10-P90)
                                    </th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Rzeczywistość
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Status
                                    </th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                                        Percentyl
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border-subtle)/0.5)]">
                                {DEMO_BACKTEST_RESULTS.map((result) => (
                                    <tr
                                        key={result.id}
                                        className="hover:bg-[hsl(var(--surface-2)/0.5)] transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <span className="font-medium text-[hsl(var(--text-primary))]">
                                                {result.periodLabel}
                                            </span>
                                            <p className="text-xs text-[hsl(var(--text-muted))]">
                                                {result.modelName}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-[hsl(var(--text-secondary))]">
                                                {result.variable}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-sm font-mono text-[hsl(var(--text-muted))]">
                                                {formatNumber(result.predicted.p10, { compact: true })} – {formatNumber(result.predicted.p90, { compact: true })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={cn(
                                                'text-sm font-mono font-medium',
                                                result.inRange ? 'text-[hsl(var(--text-primary))]' : 'text-red-400'
                                            )}>
                                                {formatNumber(result.actual, { compact: true })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {result.inRange ? (
                                                <span className="inline-flex items-center gap-1 text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs">W zakresie</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-xs">Poza zakresem</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={cn(
                                                'text-sm font-mono',
                                                result.percentile < 10 || result.percentile > 90
                                                    ? 'text-red-400'
                                                    : 'text-[hsl(var(--text-secondary))]'
                                            )}>
                                                P{result.percentile}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Insights */}
                <Card variant="risk" riskLevel="medium">
                    <CardContent>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-amber-300 mb-2">Wnioski z backtestingu</h4>
                                <ul className="space-y-2 text-sm text-amber-300/80">
                                    <li>• Coverage 75% jest poniżej celu 80% – rozkłady mogą być <strong>zbyt wąskie</strong></li>
                                    <li>• Free Cash Flow wykazuje tendencję do zaniżania – rozważ szerszy zakres</li>
                                    <li>• EBITDA i Przychody dobrze skalibrowane</li>
                                    <li>• Lekki optymistyczny bias (+2%) jest akceptowalny</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
