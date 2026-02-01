// @ts-nocheck
// =============================================
// StochFin - Monte Carlo DCF Simulation API
// Runs 10,000 scenarios for probabilistic valuation
// =============================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================
// Types
// =============================================

interface SimulationRequest {
    base_year_revenue: number;
    base_year_fcf: number;
    net_debt: number;
    shares_outstanding: number;
    forecast_years: number;
    n_scenarios: number;
    assumptions: {
        revenue_growth: DistributionParam;
        ebitda_margin: DistributionParam;
        capex_to_revenue: DistributionParam;
        nwc_to_revenue_delta: DistributionParam;
        wacc: DistributionParam;
        terminal_growth: DistributionParam;
    };
}

interface DistributionParam {
    type: 'normal' | 'triangular' | 'uniform';
    mean: number;
    std?: number;
    min?: number;
    max?: number;
}

interface SimulationResult {
    n_scenarios: number;
    enterprise_value: ValueStats;
    equity_value: ValueStats;
    per_share: ValueStats;
    terminal_value_pct: number;
    histogram: { bin_start: number; bin_end: number; count: number }[];
    scenarios_sample: number[];
}

interface ValueStats {
    mean: number;
    median: number;
    std: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
}

// =============================================
// Random Number Generators
// =============================================

function sampleNormal(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
}

function sampleTriangular(min: number, mode: number, max: number): number {
    const u = Math.random();
    const fc = (mode - min) / (max - min);
    if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

function sampleUniform(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function sampleDistribution(param: DistributionParam): number {
    switch (param.type) {
        case 'normal':
            return sampleNormal(param.mean, param.std || param.mean * 0.1);
        case 'triangular':
            const min = param.min ?? param.mean * 0.7;
            const max = param.max ?? param.mean * 1.3;
            return sampleTriangular(min, param.mean, max);
        case 'uniform':
            return sampleUniform(
                param.min ?? param.mean * 0.8,
                param.max ?? param.mean * 1.2
            );
        default:
            return param.mean;
    }
}

// =============================================
// DCF Calculation
// =============================================

function runSingleScenario(
    baseRevenue: number,
    baseFCF: number,
    netDebt: number,
    sharesOutstanding: number,
    forecastYears: number,
    assumptions: SimulationRequest['assumptions']
): { ev: number; equity: number; perShare: number; tvPct: number } {

    // Sample parameters for this scenario
    const revenueGrowth = sampleDistribution(assumptions.revenue_growth) / 100;
    const ebitdaMargin = sampleDistribution(assumptions.ebitda_margin) / 100;
    const capexRatio = sampleDistribution(assumptions.capex_to_revenue) / 100;
    const nwcRatio = sampleDistribution(assumptions.nwc_to_revenue_delta) / 100;
    const wacc = sampleDistribution(assumptions.wacc) / 100;
    const terminalGrowth = sampleDistribution(assumptions.terminal_growth) / 100;

    // Project cash flows
    let revenue = baseRevenue;
    let prevRevenue = baseRevenue;
    let pvFCF = 0;

    for (let year = 1; year <= forecastYears; year++) {
        revenue = revenue * (1 + revenueGrowth);

        const ebitda = revenue * ebitdaMargin;
        const depreciation = ebitda * 0.15; // Assume D&A is ~15% of EBITDA
        const ebit = ebitda - depreciation;
        const nopat = ebit * (1 - 0.21); // 21% tax rate

        const capex = revenue * capexRatio;
        const deltaNWC = (revenue - prevRevenue) * nwcRatio;

        const fcf = nopat + depreciation - capex - deltaNWC;
        const discountFactor = Math.pow(1 + wacc, year);

        pvFCF += fcf / discountFactor;
        prevRevenue = revenue;
    }

    // Terminal Value (Gordon Growth Model)
    const terminalFCF = revenue * ebitdaMargin * 0.85 * (1 - 0.21) * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminal = terminalValue / Math.pow(1 + wacc, forecastYears);

    // Sum up
    const enterpriseValue = pvFCF + pvTerminal;
    const equityValue = enterpriseValue - netDebt;
    const perShare = equityValue / sharesOutstanding;
    const tvPct = pvTerminal / enterpriseValue;

    return {
        ev: enterpriseValue,
        equity: Math.max(0, equityValue),
        perShare: Math.max(0, perShare),
        tvPct
    };
}

// =============================================
// Statistics Helpers
// =============================================

function calculateStats(values: number[]): ValueStats {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    const percentile = (p: number) => sorted[Math.floor(n * p / 100)];

    return {
        mean,
        median: percentile(50),
        std,
        p5: percentile(5),
        p10: percentile(10),
        p25: percentile(25),
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95)
    };
}

function buildHistogram(values: number[], numBins: number = 50): { bin_start: number; bin_end: number; count: number }[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / numBins;

    const histogram = Array.from({ length: numBins }, (_, i) => ({
        bin_start: min + i * binWidth,
        bin_end: min + (i + 1) * binWidth,
        count: 0
    }));

    for (const v of values) {
        const binIndex = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
        histogram[binIndex].count++;
    }

    return histogram;
}

// =============================================
// API Route Handler
// =============================================

export async function POST(req: NextRequest) {
    try {
        const body: SimulationRequest = await req.json();

        const {
            base_year_revenue,
            base_year_fcf,
            net_debt,
            shares_outstanding,
            forecast_years = 5,
            n_scenarios = 10000,
            assumptions
        } = body;

        // Validate inputs
        if (!base_year_revenue || !shares_outstanding) {
            return NextResponse.json(
                { error: 'base_year_revenue and shares_outstanding are required' },
                { status: 400 }
            );
        }

        // Run Monte Carlo simulation
        const evResults: number[] = [];
        const equityResults: number[] = [];
        const perShareResults: number[] = [];
        let totalTVPct = 0;

        for (let i = 0; i < n_scenarios; i++) {
            const result = runSingleScenario(
                base_year_revenue,
                base_year_fcf || base_year_revenue * 0.1,
                net_debt || 0,
                shares_outstanding,
                forecast_years,
                assumptions
            );

            evResults.push(result.ev);
            equityResults.push(result.equity);
            perShareResults.push(result.perShare);
            totalTVPct += result.tvPct;
        }

        // Calculate statistics
        const evStats = calculateStats(evResults);
        const equityStats = calculateStats(equityResults);
        const perShareStats = calculateStats(perShareResults);

        // Build histogram for per-share values
        const histogram = buildHistogram(perShareResults);

        // Sample scenarios for debugging
        const scenariosSample = perShareResults.slice(0, 100);

        const result: SimulationResult = {
            n_scenarios,
            enterprise_value: evStats,
            equity_value: equityStats,
            per_share: perShareStats,
            terminal_value_pct: totalTVPct / n_scenarios,
            histogram,
            scenarios_sample: scenariosSample
        };

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error('Simulation error:', error);
        return NextResponse.json(
            { error: error.message || 'Simulation failed' },
            { status: 500 }
        );
    }
}
