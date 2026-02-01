import { NextRequest, NextResponse } from 'next/server';

// =============================================
// Health Check API - Calculate All Metrics
// =============================================

interface HealthRequest {
    financials: any;
}

interface HealthResult {
    overall_score: number;
    components: {
        altman_z: AltmanResult;
        piotroski_f: PiotrostkiResult;
        beneish_m: BeneishResult;
        dupont: DuPontResult;
        ratios: RatiosResult;
        cashflow_quality: CashflowResult;
    };
    warnings: string[];
    computed_at: string;
}

interface AltmanResult {
    score: number;
    zone: 'safe' | 'grey' | 'distress';
    label: string;
    component_score: number;
    max_score: number;
    breakdown: {
        A: { value: number; weighted: number };
        B: { value: number; weighted: number };
        C: { value: number; weighted: number };
        D: { value: number; weighted: number };
        E: { value: number; weighted: number };
    };
    missing_fields: string[];
}

interface PiotrostkiResult {
    score: number;
    label: string;
    component_score: number;
    max_score: number;
    criteria: {
        id: number;
        name: string;
        pass: boolean;
        detail: string;
    }[];
}

interface BeneishResult {
    score: number | null;
    label: string;
    is_manipulator: boolean | null;
    missing_fields: string[];
}

interface DuPontResult {
    roe: number;
    decomposition: {
        tax_burden: number;
        interest_burden: number;
        ebit_margin: number;
        asset_turnover: number;
        equity_multiplier: number;
    };
}

interface RatiosResult {
    liquidity: Record<string, { value: number; benchmark: number; status: string }>;
    solvency: Record<string, { value: number; benchmark: number; status: string }>;
    profitability: Record<string, { value: number; benchmark: number; status: string }>;
    efficiency: Record<string, { value: number; benchmark: number; status: string }>;
}

interface CashflowResult {
    accrual_ratio: number;
    ocf_to_ni_ratio: number;
    fcf_positive: boolean;
    component_score: number;
    max_score: number;
}

// =============================================
// Helper Functions
// =============================================

function getLatestValue(data: Record<string, number> | undefined, periods: string[]): number | null {
    if (!data || !periods.length) return null;
    for (const period of periods) {
        if (data[period] !== undefined) return data[period];
    }
    return null;
}

function getPreviousValue(data: Record<string, number> | undefined, periods: string[]): number | null {
    if (!data || periods.length < 2) return null;
    return data[periods[1]] ?? null;
}

function getRatioStatus(value: number, benchmark: number, higherIsBetter: boolean): string {
    if (higherIsBetter) {
        if (value >= benchmark * 1.5) return 'excellent';
        if (value >= benchmark) return 'ok';
        if (value >= benchmark * 0.5) return 'warning';
        return 'critical';
    } else {
        if (value <= benchmark * 0.5) return 'excellent';
        if (value <= benchmark) return 'ok';
        if (value <= benchmark * 1.5) return 'warning';
        return 'critical';
    }
}

// =============================================
// Altman Z-Score Calculator
// =============================================

function calculateAltmanZ(financials: any): AltmanResult {
    const missing: string[] = [];
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};

    const currentAssets = getLatestValue(balance.current_assets, periods);
    const currentLiabilities = getLatestValue(balance.current_liabilities, periods);
    const totalAssets = getLatestValue(balance.total_assets, periods);
    const retainedEarnings = getLatestValue(balance.retained_earnings, periods);
    const totalLiabilities = getLatestValue(balance.total_liabilities, periods);
    const ebit = getLatestValue(income.ebit, periods) || getLatestValue(income.operating_income, periods);
    const revenue = getLatestValue(income.revenue, periods);
    const marketCap = financials.market_cap;

    if (!totalAssets) missing.push('total_assets');
    if (!totalLiabilities) missing.push('total_liabilities');
    if (!revenue) missing.push('revenue');

    // Calculate components
    const workingCapital = (currentAssets || 0) - (currentLiabilities || 0);
    const A = totalAssets ? workingCapital / totalAssets : 0;
    const B = totalAssets && retainedEarnings ? retainedEarnings / totalAssets : 0;
    const C = totalAssets && ebit ? ebit / totalAssets : 0;
    const D = totalLiabilities && marketCap ? marketCap / totalLiabilities : 0;
    const E = totalAssets && revenue ? revenue / totalAssets : 0;

    const Z = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E;

    let zone: 'safe' | 'grey' | 'distress';
    let label: string;
    let componentScore: number;

    if (Z > 3.0) {
        zone = 'safe';
        label = 'Bezpieczna';
        componentScore = 25;
    } else if (Z >= 1.8) {
        zone = 'grey';
        label = 'Szara strefa';
        componentScore = 12;
    } else {
        zone = 'distress';
        label = 'Zagrożenia';
        componentScore = 5;
    }

    return {
        score: parseFloat(Z.toFixed(2)),
        zone,
        label,
        component_score: componentScore,
        max_score: 25,
        breakdown: {
            A: { value: parseFloat(A.toFixed(3)), weighted: parseFloat((1.2 * A).toFixed(3)) },
            B: { value: parseFloat(B.toFixed(3)), weighted: parseFloat((1.4 * B).toFixed(3)) },
            C: { value: parseFloat(C.toFixed(3)), weighted: parseFloat((3.3 * C).toFixed(3)) },
            D: { value: parseFloat(D.toFixed(3)), weighted: parseFloat((0.6 * D).toFixed(3)) },
            E: { value: parseFloat(E.toFixed(3)), weighted: parseFloat((1.0 * E).toFixed(3)) }
        },
        missing_fields: missing
    };
}

// =============================================
// Piotroski F-Score Calculator
// =============================================

function calculatePiotroski(financials: any): PiotrostkiResult {
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};
    const cashflow = financials.statements?.cash_flow_statement?.data || {};

    const criteria: PiotrostkiResult['criteria'] = [];
    let score = 0;

    // Get values
    const netIncome = getLatestValue(income.net_income, periods);
    const totalAssets = getLatestValue(balance.total_assets, periods);
    const prevTotalAssets = getPreviousValue(balance.total_assets, periods);
    const operatingCF = getLatestValue(cashflow.operating_cash_flow, periods);
    const prevNetIncome = getPreviousValue(income.net_income, periods);
    const longTermDebt = getLatestValue(balance.long_term_debt, periods);
    const prevLongTermDebt = getPreviousValue(balance.long_term_debt, periods);
    const currentAssets = getLatestValue(balance.current_assets, periods);
    const currentLiabilities = getLatestValue(balance.current_liabilities, periods);
    const prevCurrentAssets = getPreviousValue(balance.current_assets, periods);
    const prevCurrentLiabilities = getPreviousValue(balance.current_liabilities, periods);
    const grossProfit = getLatestValue(income.gross_profit, periods);
    const prevGrossProfit = getPreviousValue(income.gross_profit, periods);
    const revenue = getLatestValue(income.revenue, periods);
    const prevRevenue = getPreviousValue(income.revenue, periods);
    const shares = financials.shares_outstanding;
    const prevShares = financials.prev_shares_outstanding;

    // Calculate metrics
    const roa = totalAssets && netIncome ? netIncome / totalAssets : null;
    const prevRoa = prevTotalAssets && prevNetIncome ? prevNetIncome / prevTotalAssets : null;
    const currentRatio = currentLiabilities ? (currentAssets || 0) / currentLiabilities : null;
    const prevCurrentRatio = prevCurrentLiabilities ? (prevCurrentAssets || 0) / prevCurrentLiabilities : null;
    const grossMargin = revenue && grossProfit ? grossProfit / revenue : null;
    const prevGrossMargin = prevRevenue && prevGrossProfit ? prevGrossProfit / prevRevenue : null;
    const assetTurnover = totalAssets && revenue ? revenue / totalAssets : null;
    const prevAssetTurnover = prevTotalAssets && prevRevenue ? prevRevenue / prevTotalAssets : null;

    // 1. ROA > 0
    const test1 = roa !== null && roa > 0;
    criteria.push({ id: 1, name: 'ROA > 0', pass: test1, detail: roa ? `${(roa * 100).toFixed(1)}%` : 'N/A' });
    if (test1) score++;

    // 2. Operating CF > 0
    const test2 = operatingCF !== null && operatingCF > 0;
    criteria.push({ id: 2, name: 'Operating CF > 0', pass: test2, detail: operatingCF ? `$${(operatingCF / 1e9).toFixed(1)}B` : 'N/A' });
    if (test2) score++;

    // 3. ROA growing
    const test3 = roa !== null && prevRoa !== null && roa > prevRoa;
    criteria.push({ id: 3, name: 'ROA rosnące', pass: test3, detail: roa && prevRoa ? `${(roa * 100).toFixed(1)}% vs ${(prevRoa * 100).toFixed(1)}%` : 'N/A' });
    if (test3) score++;

    // 4. OCF > Net Income
    const test4 = operatingCF !== null && netIncome !== null && operatingCF > netIncome;
    criteria.push({ id: 4, name: 'OCF > Net Income', pass: test4, detail: test4 ? 'Tak' : 'Nie' });
    if (test4) score++;

    // 5. LT Debt decreasing
    const test5 = longTermDebt !== null && prevLongTermDebt !== null && longTermDebt < prevLongTermDebt;
    criteria.push({ id: 5, name: 'Dług malejący', pass: test5, detail: longTermDebt !== null ? `$${(longTermDebt / 1e9).toFixed(1)}B` : 'N/A' });
    if (test5) score++;

    // 6. Current ratio growing
    const test6 = currentRatio !== null && prevCurrentRatio !== null && currentRatio > prevCurrentRatio;
    criteria.push({ id: 6, name: 'Current ratio rosnący', pass: test6, detail: currentRatio ? `${currentRatio.toFixed(2)}x` : 'N/A' });
    if (test6) score++;

    // 7. No dilution
    const test7 = shares !== undefined && prevShares !== undefined && shares <= prevShares;
    criteria.push({ id: 7, name: 'Brak rozwodnienia', pass: test7, detail: shares ? `${(shares / 1e9).toFixed(2)}B akcji` : 'N/A' });
    if (test7) score++;

    // 8. Gross margin growing
    const test8 = grossMargin !== null && prevGrossMargin !== null && grossMargin > prevGrossMargin;
    criteria.push({ id: 8, name: 'Marża brutto rosnąca', pass: test8, detail: grossMargin ? `${(grossMargin * 100).toFixed(1)}%` : 'N/A' });
    if (test8) score++;

    // 9. Asset turnover growing
    const test9 = assetTurnover !== null && prevAssetTurnover !== null && assetTurnover > prevAssetTurnover;
    criteria.push({ id: 9, name: 'Asset turnover rosnący', pass: test9, detail: assetTurnover ? `${assetTurnover.toFixed(2)}x` : 'N/A' });
    if (test9) score++;

    let label = 'Słaba';
    if (score >= 7) label = 'Silna';
    else if (score >= 4) label = 'Średnia';

    return {
        score,
        label,
        component_score: parseFloat((score * (25 / 9)).toFixed(1)),
        max_score: 25,
        criteria
    };
}

// =============================================
// DuPont Decomposition
// =============================================

function calculateDuPont(financials: any): DuPontResult {
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};

    const netIncome = getLatestValue(income.net_income, periods) || 0;
    const ebt = getLatestValue(income.income_before_tax, periods) || netIncome * 1.2;
    const ebit = getLatestValue(income.ebit, periods) || getLatestValue(income.operating_income, periods) || ebt * 1.05;
    const revenue = getLatestValue(income.revenue, periods) || 1;
    const totalAssets = getLatestValue(balance.total_assets, periods) || 1;
    const totalEquity = getLatestValue(balance.total_equity, periods) || 1;

    const taxBurden = ebt !== 0 ? netIncome / ebt : 0;
    const interestBurden = ebit !== 0 ? ebt / ebit : 0;
    const ebitMargin = revenue !== 0 ? ebit / revenue : 0;
    const assetTurnover = totalAssets !== 0 ? revenue / totalAssets : 0;
    const equityMultiplier = totalEquity !== 0 ? totalAssets / totalEquity : 0;

    const roe = taxBurden * interestBurden * ebitMargin * assetTurnover * equityMultiplier;

    return {
        roe: parseFloat(roe.toFixed(3)),
        decomposition: {
            tax_burden: parseFloat(taxBurden.toFixed(2)),
            interest_burden: parseFloat(interestBurden.toFixed(2)),
            ebit_margin: parseFloat(ebitMargin.toFixed(3)),
            asset_turnover: parseFloat(assetTurnover.toFixed(2)),
            equity_multiplier: parseFloat(equityMultiplier.toFixed(2))
        }
    };
}

// =============================================
// Financial Ratios
// =============================================

function calculateRatios(financials: any): RatiosResult {
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};
    const cashflow = financials.statements?.cash_flow_statement?.data || {};

    const currentAssets = getLatestValue(balance.current_assets, periods) || 0;
    const currentLiabilities = getLatestValue(balance.current_liabilities, periods) || 1;
    const inventory = getLatestValue(balance.inventory, periods) || 0;
    const cash = getLatestValue(balance.cash, periods) || 0;
    const totalDebt = getLatestValue(balance.total_debt, periods) || getLatestValue(balance.long_term_debt, periods) || 0;
    const totalEquity = getLatestValue(balance.total_equity, periods) || 1;
    const totalAssets = getLatestValue(balance.total_assets, periods) || 1;
    const ebit = getLatestValue(income.ebit, periods) || getLatestValue(income.operating_income, periods) || 0;
    const interestExpense = getLatestValue(income.interest_expense, periods) || 1;
    const revenue = getLatestValue(income.revenue, periods) || 1;
    const grossProfit = getLatestValue(income.gross_profit, periods) || 0;
    const ebitda = getLatestValue(income.ebitda, periods) || ebit * 1.15;
    const netIncome = getLatestValue(income.net_income, periods) || 0;
    const operatingCF = getLatestValue(cashflow.operating_cash_flow, periods) || 0;
    const netDebt = totalDebt - cash;
    const receivables = getLatestValue(balance.accounts_receivable, periods) || 0;

    return {
        liquidity: {
            current_ratio: {
                value: parseFloat((currentAssets / currentLiabilities).toFixed(2)),
                benchmark: 1.5,
                status: getRatioStatus(currentAssets / currentLiabilities, 1.5, true)
            },
            quick_ratio: {
                value: parseFloat(((currentAssets - inventory) / currentLiabilities).toFixed(2)),
                benchmark: 1.0,
                status: getRatioStatus((currentAssets - inventory) / currentLiabilities, 1.0, true)
            },
            cash_ratio: {
                value: parseFloat((cash / currentLiabilities).toFixed(2)),
                benchmark: 0.5,
                status: getRatioStatus(cash / currentLiabilities, 0.5, true)
            },
            ocf_to_current_liab: {
                value: parseFloat((operatingCF / currentLiabilities).toFixed(2)),
                benchmark: 0.8,
                status: getRatioStatus(operatingCF / currentLiabilities, 0.8, true)
            }
        },
        solvency: {
            debt_to_equity: {
                value: parseFloat((totalDebt / totalEquity).toFixed(2)),
                benchmark: 1.0,
                status: getRatioStatus(totalDebt / totalEquity, 1.0, false)
            },
            debt_to_assets: {
                value: parseFloat((totalDebt / totalAssets).toFixed(2)),
                benchmark: 0.5,
                status: getRatioStatus(totalDebt / totalAssets, 0.5, false)
            },
            interest_coverage: {
                value: parseFloat((ebit / interestExpense).toFixed(1)),
                benchmark: 5.0,
                status: getRatioStatus(ebit / interestExpense, 5.0, true)
            },
            net_debt_to_ebitda: {
                value: parseFloat((netDebt / ebitda).toFixed(2)),
                benchmark: 2.0,
                status: getRatioStatus(netDebt / ebitda, 2.0, false)
            }
        },
        profitability: {
            gross_margin: {
                value: parseFloat((grossProfit / revenue * 100).toFixed(1)),
                benchmark: 30,
                status: getRatioStatus(grossProfit / revenue * 100, 30, true)
            },
            ebitda_margin: {
                value: parseFloat((ebitda / revenue * 100).toFixed(1)),
                benchmark: 20,
                status: getRatioStatus(ebitda / revenue * 100, 20, true)
            },
            net_margin: {
                value: parseFloat((netIncome / revenue * 100).toFixed(1)),
                benchmark: 10,
                status: getRatioStatus(netIncome / revenue * 100, 10, true)
            },
            roe: {
                value: parseFloat((netIncome / totalEquity * 100).toFixed(1)),
                benchmark: 15,
                status: getRatioStatus(netIncome / totalEquity * 100, 15, true)
            },
            roa: {
                value: parseFloat((netIncome / totalAssets * 100).toFixed(1)),
                benchmark: 10,
                status: getRatioStatus(netIncome / totalAssets * 100, 10, true)
            }
        },
        efficiency: {
            asset_turnover: {
                value: parseFloat((revenue / totalAssets).toFixed(2)),
                benchmark: 0.5,
                status: getRatioStatus(revenue / totalAssets, 0.5, true)
            },
            inventory_turnover: {
                value: inventory > 0 ? parseFloat((revenue / inventory).toFixed(1)) : 0,
                benchmark: 10,
                status: inventory > 0 ? getRatioStatus(revenue / inventory, 10, true) : 'ok'
            },
            receivables_turnover: {
                value: receivables > 0 ? parseFloat((revenue / receivables).toFixed(1)) : 0,
                benchmark: 10,
                status: receivables > 0 ? getRatioStatus(revenue / receivables, 10, true) : 'ok'
            },
            dso: {
                value: receivables > 0 ? parseFloat((365 / (revenue / receivables)).toFixed(0)) : 0,
                benchmark: 45,
                status: receivables > 0 ? getRatioStatus(365 / (revenue / receivables), 45, false) : 'ok'
            }
        }
    };
}

// =============================================
// Cashflow Quality
// =============================================

function calculateCashflowQuality(financials: any): CashflowResult {
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};
    const cashflow = financials.statements?.cash_flow_statement?.data || {};

    const netIncome = getLatestValue(income.net_income, periods) || 0;
    const operatingCF = getLatestValue(cashflow.operating_cash_flow, periods) || 0;
    const totalAssets = getLatestValue(balance.total_assets, periods) || 1;
    const fcf = getLatestValue(cashflow.free_cash_flow, periods) || 0;

    const accrualRatio = (netIncome - operatingCF) / totalAssets;
    const ocfToNI = netIncome !== 0 ? operatingCF / netIncome : 0;
    const fcfPositive = fcf > 0;

    let score = 0;
    if (operatingCF > 0) score += 8;
    if (operatingCF > netIncome) score += 7;
    if (fcfPositive) score += 5;
    if (accrualRatio < 0) score += 5;

    return {
        accrual_ratio: parseFloat(accrualRatio.toFixed(3)),
        ocf_to_ni_ratio: parseFloat(ocfToNI.toFixed(2)),
        fcf_positive: fcfPositive,
        component_score: score,
        max_score: 25
    };
}

// =============================================
// Beneish M-Score (Simplified)
// =============================================

function calculateBeneish(financials: any): BeneishResult {
    const periods = financials.statements?.income_statement?.periods || [];
    const income = financials.statements?.income_statement?.data || {};
    const balance = financials.statements?.balance_sheet?.data || {};

    // Need 2 years of data
    if (periods.length < 2) {
        return {
            score: null,
            label: 'Brak danych',
            is_manipulator: null,
            missing_fields: ['min 2 lata danych']
        };
    }

    const missing: string[] = [];

    const receivables = getLatestValue(balance.accounts_receivable, periods);
    const prevReceivables = getPreviousValue(balance.accounts_receivable, periods);
    const revenue = getLatestValue(income.revenue, periods);
    const prevRevenue = getPreviousValue(income.revenue, periods);
    const grossProfit = getLatestValue(income.gross_profit, periods);
    const prevGrossProfit = getPreviousValue(income.gross_profit, periods);
    const totalAssets = getLatestValue(balance.total_assets, periods);
    const prevTotalAssets = getPreviousValue(balance.total_assets, periods);
    const netIncome = getLatestValue(income.net_income, periods);
    const operatingCF = financials.statements?.cash_flow_statement?.data?.operating_cash_flow?.[periods[0]];

    if (!receivables) missing.push('accounts_receivable');
    if (!revenue || !prevRevenue) missing.push('revenue');
    if (!totalAssets) missing.push('total_assets');

    if (missing.length > 2) {
        return {
            score: null,
            label: 'Niewystarczające dane',
            is_manipulator: null,
            missing_fields: missing
        };
    }

    // Simplified M-Score using available data
    const DSRI = (receivables && prevReceivables && revenue && prevRevenue)
        ? (receivables / revenue) / (prevReceivables / prevRevenue) : 1;

    const GMI = (grossProfit && prevGrossProfit && revenue && prevRevenue)
        ? (prevGrossProfit / prevRevenue) / (grossProfit / revenue) : 1;

    const SGI = (revenue && prevRevenue) ? revenue / prevRevenue : 1;

    const TATA = (netIncome && operatingCF && totalAssets)
        ? (netIncome - operatingCF) / totalAssets : 0;

    // Simplified formula (using only available variables)
    const M = -4.84 + 0.92 * DSRI + 0.528 * GMI + 0.892 * SGI + 4.679 * TATA;

    const isManipulator = M > -2.22;

    return {
        score: parseFloat(M.toFixed(2)),
        label: isManipulator ? 'Podejrzany' : 'Nie-manipulator',
        is_manipulator: isManipulator,
        missing_fields: missing
    };
}

// =============================================
// Main API Handler
// =============================================

export async function POST(req: NextRequest) {
    try {
        const body: HealthRequest = await req.json();
        const { financials } = body;

        if (!financials) {
            return NextResponse.json({ error: 'Financials data required' }, { status: 400 });
        }

        // Calculate all components
        const altman = calculateAltmanZ(financials);
        const piotroski = calculatePiotroski(financials);
        const beneish = calculateBeneish(financials);
        const dupont = calculateDuPont(financials);
        const ratios = calculateRatios(financials);
        const cashflow = calculateCashflowQuality(financials);

        // Calculate overall score
        const ratiosScore = Object.values(ratios).flatMap(cat =>
            Object.values(cat as any).filter((r: any) => r.status === 'excellent' || r.status === 'ok').length
        ).reduce((a, b) => a + b, 0);

        const overallScore = Math.min(100, Math.round(
            altman.component_score +
            piotroski.component_score +
            cashflow.component_score +
            Math.min(25, ratiosScore * 2)
        ));

        const warnings: string[] = [];
        if (altman.zone === 'distress') warnings.push('Altman Z-Score w strefie zagrożenia');
        if (piotroski.score < 4) warnings.push('Piotroski F-Score wskazuje na słabą kondycję');
        if (beneish.is_manipulator) warnings.push('Beneish M-Score sugeruje możliwe manipulacje');
        if (ratios.liquidity.current_ratio.status === 'critical') warnings.push('Krytycznie niska płynność');

        const result: HealthResult = {
            overall_score: overallScore,
            components: {
                altman_z: altman,
                piotroski_f: piotroski,
                beneish_m: beneish,
                dupont,
                ratios,
                cashflow_quality: cashflow
            },
            warnings,
            computed_at: new Date().toISOString()
        };

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error('Health check error:', error);
        return NextResponse.json({ error: error.message || 'Health check failed' }, { status: 500 });
    }
}
