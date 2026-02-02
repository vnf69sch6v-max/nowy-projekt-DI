// @ts-nocheck
// =============================================
// StochFin - Financial Data API Proxy
// Fetches real company data from FMP / Alpha Vantage
// =============================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================
// Types
// =============================================

interface FetchRequest {
    ticker: string;
    source?: 'fmp' | 'alpha_vantage';
}

interface CompanyFinancials {
    source: string;
    fetched_at: string;
    ticker: string;
    company_name: string;
    exchange: string;
    currency: string;
    sector: string;
    current_price: number | null;
    market_cap: number | null;
    shares_outstanding: number | null;
    statements: {
        income_statement: StatementData;
        balance_sheet: StatementData;
        cash_flow_statement: StatementData;
    };
    metrics: MarketMetrics;
}

interface StatementData {
    periods: string[];
    data: Record<string, Record<string, number | null>>;
}

interface MarketMetrics {
    pe_ratio: number | null;
    ev_to_ebitda: number | null;
    ev_to_revenue: number | null;
    pb_ratio: number | null;
    roic: number | null;
    debt_to_equity: number | null;
    dividend_yield: number | null;
}

// =============================================
// FMP API Fetcher
// =============================================

async function fetchFromFMP(ticker: string): Promise<CompanyFinancials> {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
        throw new Error('FMP_API_KEY not configured. Add it to your .env file.');
    }

    // New stable API base URL (v3 endpoints are deprecated)
    const baseUrl = 'https://financialmodelingprep.com/stable';

    // Parallel fetch all endpoints - using new query param format
    const [
        profileRes,
        incomeRes,
        balanceRes,
        cashFlowRes,
        quoteRes
    ] = await Promise.all([
        fetch(`${baseUrl}/profile?symbol=${ticker}&apikey=${apiKey}`),
        fetch(`${baseUrl}/income-statement?symbol=${ticker}&period=annual&limit=5&apikey=${apiKey}`),
        fetch(`${baseUrl}/balance-sheet-statement?symbol=${ticker}&period=annual&limit=5&apikey=${apiKey}`),
        fetch(`${baseUrl}/cash-flow-statement?symbol=${ticker}&period=annual&limit=5&apikey=${apiKey}`),
        fetch(`${baseUrl}/quote?symbol=${ticker}&apikey=${apiKey}`)
    ]);

    // Check for API errors
    if (!profileRes.ok) {
        const errorText = await profileRes.text();
        if (errorText.includes('Limit Reach')) {
            throw new Error('API_LIMIT_REACHED');
        }
        throw new Error(`FMP API error: ${errorText}`);
    }

    const [profile, income, balance, cashFlow, quote] = await Promise.all([
        profileRes.json(),
        incomeRes.json(),
        balanceRes.json(),
        cashFlowRes.json(),
        quoteRes.json()
    ]);

    // Handle not found
    if (!profile || profile.length === 0) {
        throw new Error('TICKER_NOT_FOUND');
    }

    const company = profile[0];
    const latestQuote = quote[0] || {};
    // key-metrics endpoint deprecated, use profile data for metrics
    const latestMetrics: Record<string, number | null> = {};

    // Extract periods (years)
    const periods = income.map((item: any) => {
        const date = new Date(item.date);
        return date.getFullYear().toString();
    });

    // Build income statement
    const incomeData: Record<string, Record<string, number | null>> = {
        revenue: {},
        cost_of_revenue: {},
        gross_profit: {},
        operating_expenses: {},
        ebitda: {},
        depreciation: {},
        ebit: {},
        interest_expense: {},
        pretax_income: {},
        tax: {},
        net_income: {},
        eps: {},
        shares_outstanding: {}
    };

    for (const item of income) {
        const year = new Date(item.date).getFullYear().toString();
        incomeData.revenue[year] = item.revenue;
        incomeData.cost_of_revenue[year] = item.costOfRevenue;
        incomeData.gross_profit[year] = item.grossProfit;
        incomeData.operating_expenses[year] = item.operatingExpenses;
        incomeData.ebitda[year] = item.ebitda;
        incomeData.depreciation[year] = item.depreciationAndAmortization;
        incomeData.ebit[year] = item.operatingIncome;
        incomeData.interest_expense[year] = item.interestExpense;
        incomeData.pretax_income[year] = item.incomeBeforeTax;
        incomeData.tax[year] = item.incomeTaxExpense;
        incomeData.net_income[year] = item.netIncome;
        incomeData.eps[year] = item.eps;
        incomeData.shares_outstanding[year] = item.weightedAverageShsOut;
    }

    // Build balance sheet
    const balanceData: Record<string, Record<string, number | null>> = {
        total_assets: {},
        current_assets: {},
        cash: {},
        total_liabilities: {},
        current_liabilities: {},
        long_term_debt: {},
        total_equity: {}
    };

    for (const item of balance) {
        const year = new Date(item.date).getFullYear().toString();
        balanceData.total_assets[year] = item.totalAssets;
        balanceData.current_assets[year] = item.totalCurrentAssets;
        balanceData.cash[year] = item.cashAndCashEquivalents;
        balanceData.total_liabilities[year] = item.totalLiabilities;
        balanceData.current_liabilities[year] = item.totalCurrentLiabilities;
        balanceData.long_term_debt[year] = item.longTermDebt;
        balanceData.total_equity[year] = item.totalStockholdersEquity;
    }

    // Build cash flow
    const cashFlowData: Record<string, Record<string, number | null>> = {
        operating_cf: {},
        capex: {},
        free_cash_flow: {},
        investing_cf: {},
        financing_cf: {}
    };

    for (const item of cashFlow) {
        const year = new Date(item.date).getFullYear().toString();
        cashFlowData.operating_cf[year] = item.operatingCashFlow;
        cashFlowData.capex[year] = item.capitalExpenditure;
        cashFlowData.free_cash_flow[year] = item.freeCashFlow;
        cashFlowData.investing_cf[year] = item.netCashUsedForInvestingActivites;
        cashFlowData.financing_cf[year] = item.netCashUsedProvidedByFinancingActivities;
    }

    return {
        source: 'fmp',
        fetched_at: new Date().toISOString(),
        ticker: ticker.toUpperCase(),
        company_name: company.companyName,
        exchange: company.exchangeShortName,
        currency: company.currency,
        sector: company.sector,
        current_price: latestQuote.price || null,
        market_cap: company.mktCap || null,
        shares_outstanding: company.sharesOutstanding || null,
        statements: {
            income_statement: { periods, data: incomeData },
            balance_sheet: { periods, data: balanceData },
            cash_flow_statement: { periods, data: cashFlowData }
        },
        metrics: {
            pe_ratio: latestMetrics.peRatio || null,
            ev_to_ebitda: latestMetrics.enterpriseValueOverEBITDA || null,
            ev_to_revenue: latestMetrics.evToSales || null,
            pb_ratio: latestMetrics.pbRatio || null,
            roic: latestMetrics.roic || null,
            debt_to_equity: latestMetrics.debtToEquity || null,
            dividend_yield: latestMetrics.dividendYield || null
        }
    };
}

// =============================================
// Alpha Vantage Fetcher (Fallback)
// =============================================

async function fetchFromAlphaVantage(ticker: string): Promise<CompanyFinancials> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        throw new Error('ALPHA_VANTAGE_API_KEY not configured');
    }

    const baseUrl = 'https://www.alphavantage.co/query';

    const [overviewRes, incomeRes, balanceRes, cashFlowRes] = await Promise.all([
        fetch(`${baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`),
        fetch(`${baseUrl}?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${apiKey}`),
        fetch(`${baseUrl}?function=BALANCE_SHEET&symbol=${ticker}&apikey=${apiKey}`),
        fetch(`${baseUrl}?function=CASH_FLOW&symbol=${ticker}&apikey=${apiKey}`)
    ]);

    const [overview, income, balance, cashFlow] = await Promise.all([
        overviewRes.json(),
        incomeRes.json(),
        balanceRes.json(),
        cashFlowRes.json()
    ]);

    if (overview.Note) {
        throw new Error('API_LIMIT_REACHED');
    }

    if (!overview.Symbol) {
        throw new Error('TICKER_NOT_FOUND');
    }

    const annualReports = income.annualReports || [];
    const periods = annualReports.slice(0, 5).map((r: any) => r.fiscalDateEnding.substring(0, 4));

    // Build statements (simplified mapping)
    const incomeData: Record<string, Record<string, number | null>> = {
        revenue: {},
        gross_profit: {},
        ebit: {},
        net_income: {}
    };

    for (const item of annualReports.slice(0, 5)) {
        const year = item.fiscalDateEnding.substring(0, 4);
        incomeData.revenue[year] = parseFloat(item.totalRevenue) || null;
        incomeData.gross_profit[year] = parseFloat(item.grossProfit) || null;
        incomeData.ebit[year] = parseFloat(item.operatingIncome) || null;
        incomeData.net_income[year] = parseFloat(item.netIncome) || null;
    }

    return {
        source: 'alpha_vantage',
        fetched_at: new Date().toISOString(),
        ticker: ticker.toUpperCase(),
        company_name: overview.Name || ticker,
        exchange: overview.Exchange || 'Unknown',
        currency: overview.Currency || 'USD',
        sector: overview.Sector || 'Unknown',
        current_price: parseFloat(overview['50DayMovingAverage']) || null,
        market_cap: parseFloat(overview.MarketCapitalization) || null,
        shares_outstanding: parseFloat(overview.SharesOutstanding) || null,
        statements: {
            income_statement: { periods, data: incomeData },
            balance_sheet: { periods, data: {} },
            cash_flow_statement: { periods, data: {} }
        },
        metrics: {
            pe_ratio: parseFloat(overview.PERatio) || null,
            ev_to_ebitda: parseFloat(overview.EVToEBITDA) || null,
            ev_to_revenue: parseFloat(overview.EVToRevenue) || null,
            pb_ratio: parseFloat(overview.PriceToBookRatio) || null,
            roic: parseFloat(overview.ReturnOnInvestmentROI) || null,
            debt_to_equity: null,
            dividend_yield: parseFloat(overview.DividendYield) || null
        }
    };
}

// =============================================
// API Route Handler
// =============================================

export async function POST(req: NextRequest) {
    try {
        const body: FetchRequest = await req.json();
        const { ticker, source = 'fmp' } = body;

        if (!ticker) {
            return NextResponse.json(
                { error: 'Ticker is required' },
                { status: 400 }
            );
        }

        // Normalize ticker
        const normalizedTicker = ticker.toUpperCase().trim();

        let data: CompanyFinancials;

        try {
            if (source === 'fmp') {
                data = await fetchFromFMP(normalizedTicker);
            } else {
                data = await fetchFromAlphaVantage(normalizedTicker);
            }
        } catch (error: any) {
            // Try fallback if primary source fails with limit
            if (error.message === 'API_LIMIT_REACHED' && source === 'fmp') {
                console.log('FMP limit reached, trying Alpha Vantage fallback...');
                try {
                    data = await fetchFromAlphaVantage(normalizedTicker);
                } catch {
                    return NextResponse.json(
                        {
                            error: 'Daily API limit reached for all sources',
                            suggestion: 'Upload PDF/Excel report or enter data manually'
                        },
                        { status: 429 }
                    );
                }
            } else if (error.message === 'TICKER_NOT_FOUND') {
                return NextResponse.json(
                    {
                        error: `Ticker "${normalizedTicker}" not found`,
                        suggestion: 'Check the ticker symbol or try a different exchange suffix (e.g., .WA for Warsaw)'
                    },
                    { status: 404 }
                );
            } else {
                throw error;
            }
        }

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error('Financial fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch financial data' },
            { status: 500 }
        );
    }
}

// GET for health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoints: {
            fmp: !!process.env.FMP_API_KEY,
            alpha_vantage: !!process.env.ALPHA_VANTAGE_API_KEY
        }
    });
}
