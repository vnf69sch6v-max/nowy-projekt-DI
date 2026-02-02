'use client';

// =============================================
// StochFin — Company Data Context
// Central state management for all financial data
// Based on MASTER_PROMPTS v3 specification
// =============================================

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// =============================================
// Types
// =============================================

export interface MarketData {
    currentPrice: number | null;
    sharesOutstanding: number | null;
    marketCap: number | null;
}

export interface IncomeStatementYear {
    revenue: number | null;
    costOfRevenue: number | null;
    grossProfit: number | null;
    sga: number | null;
    researchAndDev: number | null;  // R&D expenses (v4)
    ebitda: number | null;
    depreciation: number | null;
    ebit: number | null;
    interestExpense: number | null;
    ebt: number | null;
    incomeTax: number | null;
    effectiveTaxRate: number | null;  // Effective tax rate (v4)
    netIncome: number | null;
}

export interface BalanceSheetYear {
    totalAssets: number | null;
    currentAssets: number | null;
    cash: number | null;
    inventory: number | null;
    receivables: number | null;
    ppe: number | null;
    goodwill: number | null;  // Goodwill (v4)
    intangibleAssets: number | null;  // Intangible assets (v4)
    totalLiabilities: number | null;
    currentLiabilities: number | null;
    shortTermDebt: number | null;  // Short-term debt (v4)
    longTermDebt: number | null;
    totalDebt: number | null;
    operatingLeases: number | null;  // Operating lease liabilities (v4)
    totalEquity: number | null;
    retainedEarnings: number | null;
    minorityInterest: number | null;  // Minority interest (v4)
    preferredEquity: number | null;  // Preferred equity (v4)
    sharesOutstanding: number | null;
}

export interface CashFlowYear {
    operatingCF: number | null;
    capex: number | null;
    freeCashFlow: number | null;
    dividendsPaid: number | null;
    sharesRepurchased: number | null;
    acquisitions: number | null;  // M&A spending (v4)
    debtRepayment: number | null;  // Debt repayment (v4)
    debtIssuance: number | null;  // New debt issued (v4)
    stockCompensation: number | null;  // Stock-based compensation (v4)
}

export interface DCFResults {
    scenariosRun: number;
    percentiles: {
        p5: { ev: number; equityValue: number; perShare: number | null };
        p25: { ev: number; equityValue: number; perShare: number | null };
        p50: { ev: number; equityValue: number; perShare: number | null };
        p75: { ev: number; equityValue: number; perShare: number | null };
        p95: { ev: number; equityValue: number; perShare: number | null };
    };
    mean: {
        ev: number;
        equityValue: number;
        perShare: number | null;
    };
    histogram: { lo: number; hi: number; mid: number; count: number }[];
    currentPrice: number | null;
    netDebt: number;
    sharesUsed: number | null;
}

export interface HealthResults {
    overall_score: number;
    altmanZ: number | null;
    piotroskiScore: number;
    warnings: string[];
}

export interface ComparableResults {
    peers: {
        name: string;
        ticker: string;
        pe: number | null;
        evEbitda: number | null;
        evRevenue: number | null;
    }[];
    medians: {
        pe: number | null;
        evEbitda: number | null;
        evRevenue: number | null;
    };
}

// ========== V4 Advanced Module Results ==========

export interface ROICWACCResults {
    roicByYear: Record<string, { nopat: number | null; ic: number | null; roic: number | null }>;
    wacc: number;
    spread: number | null;
    eva: number | null;
    verdict: 'strong_creator' | 'creator' | 'marginal_creator' | 'marginal_destroyer' | 'destroyer' | 'unknown';
}

export interface EarningsQualityResults {
    accrualRatio: number | null;
    cfCoverage: number | null;
    eqScore: number;
    redFlags: string[];
}

export interface DuPontResults {
    byYear: Record<string, {
        taxBurden: number | null;
        interestBurden: number | null;
        ebitMargin: number | null;
        assetTurnover: number | null;
        leverage: number | null;
        roeDirect: number | null;
        roeDupont: number | null;
    }>;
}

export interface ForecastResults {
    scenarios: {
        bear: { projections: ForecastProjection[] };
        base: { projections: ForecastProjection[] };
        bull: { projections: ForecastProjection[] };
    };
}

export interface ForecastProjection {
    year: string;
    revenue: number;
    ebitda: number;
    netIncome: number;
    capex: number;
    fcf: number;
}

export interface CapitalAllocationResults {
    opCF: number | null;
    allocations: {
        capex: number | null;
        acquisitions: number | null;
        dividends: number | null;
        buybacks: number | null;
        debtRepaid: number | null;
    };
    payoutRatio: number | null;
    divYield: number | null;
    fcfYield: number | null;
    reinvestRate: number | null;
    shareholderYield: number | null;
}

export interface CompanyDataState {
    // Identification
    companyName: string;
    ticker: string;
    currency: string;
    exchange: string;
    sector: string;
    sectorType: 'traditional' | 'saas' | 'financial' | 'realestate' | '';  // Sector classification (v4)
    dataSource: string;
    sourceLabel: string;
    dataLoaded: boolean;

    // Market data
    market: MarketData;

    // Available years (sorted descending)
    availableYears: string[];

    // Financial statements (keyed by year)
    incomeStatement: Record<string, Partial<IncomeStatementYear>>;
    balanceSheet: Record<string, Partial<BalanceSheetYear>>;
    cashFlow: Record<string, Partial<CashFlowYear>>;

    // Computed results (v3)
    dcfResults: DCFResults | null;
    healthResults: HealthResults | null;
    comparableResults: ComparableResults | null;

    // Advanced module results (v4)
    roicWaccResults: ROICWACCResults | null;
    earningsQualityResults: EarningsQualityResults | null;
    dupontResults: DuPontResults | null;
    forecastResults: ForecastResults | null;
    capitalAllocationResults: CapitalAllocationResults | null;
}

// =============================================
// Initial State
// =============================================

const initialState: CompanyDataState = {
    companyName: '',
    ticker: '',
    currency: 'PLN',
    exchange: '',
    sector: '',
    sectorType: '',
    dataSource: '',
    sourceLabel: '',
    dataLoaded: false,

    market: {
        currentPrice: null,
        sharesOutstanding: null,
        marketCap: null,
    },

    availableYears: [],
    incomeStatement: {},
    balanceSheet: {},
    cashFlow: {},

    dcfResults: null,
    healthResults: null,
    comparableResults: null,

    // V4 advanced module results
    roicWaccResults: null,
    earningsQualityResults: null,
    dupontResults: null,
    forecastResults: null,
    capitalAllocationResults: null,
};

// =============================================
// Actions
// =============================================

type Action =
    | {
        type: 'SET_COMPANY_INFO';
        payload: {
            companyName: string;
            ticker?: string;
            currency?: string;
            exchange?: string;
            sector?: string;
            dataSource: string;
            sourceLabel: string;
        };
    }
    | {
        type: 'SET_MARKET_DATA';
        payload: Partial<MarketData>;
    }
    | {
        type: 'SET_FINANCIAL_DATA';
        payload: {
            year: string;
            incomeStatement?: Partial<IncomeStatementYear>;
            balanceSheet?: Partial<BalanceSheetYear>;
            cashFlow?: Partial<CashFlowYear>;
        };
    }
    | {
        type: 'SET_ALL_YEARS_DATA';
        payload: {
            incomeStatement: Record<string, Partial<IncomeStatementYear>>;
            balanceSheet: Record<string, Partial<BalanceSheetYear>>;
            cashFlow: Record<string, Partial<CashFlowYear>>;
            availableYears: string[];
        };
    }
    | { type: 'SET_DCF_RESULTS'; payload: DCFResults }
    | { type: 'SET_HEALTH_RESULTS'; payload: HealthResults }
    | { type: 'SET_COMPARABLE_RESULTS'; payload: ComparableResults }
    // V4 actions
    | { type: 'SET_ROIC_WACC_RESULTS'; payload: ROICWACCResults }
    | { type: 'SET_EARNINGS_QUALITY_RESULTS'; payload: EarningsQualityResults }
    | { type: 'SET_DUPONT_RESULTS'; payload: DuPontResults }
    | { type: 'SET_FORECAST_RESULTS'; payload: ForecastResults }
    | { type: 'SET_CAPITAL_ALLOCATION_RESULTS'; payload: CapitalAllocationResults }
    | { type: 'SET_SECTOR_TYPE'; payload: CompanyDataState['sectorType'] }
    | { type: 'CLEAR_ALL' };

// =============================================
// Reducer
// =============================================

function companyDataReducer(state: CompanyDataState, action: Action): CompanyDataState {
    switch (action.type) {
        case 'SET_COMPANY_INFO':
            return {
                ...state,
                companyName: action.payload.companyName,
                ticker: action.payload.ticker || state.ticker,
                currency: action.payload.currency || state.currency,
                exchange: action.payload.exchange || state.exchange,
                sector: action.payload.sector || state.sector,
                dataSource: action.payload.dataSource,
                sourceLabel: action.payload.sourceLabel,
                dataLoaded: true,
            };

        case 'SET_MARKET_DATA':
            return {
                ...state,
                market: {
                    ...state.market,
                    ...action.payload,
                },
            };

        case 'SET_FINANCIAL_DATA': {
            const { year, incomeStatement, balanceSheet, cashFlow } = action.payload;
            const newYears = state.availableYears.includes(year)
                ? state.availableYears
                : [...state.availableYears, year].sort((a, b) => parseInt(b) - parseInt(a));

            return {
                ...state,
                availableYears: newYears,
                incomeStatement: incomeStatement
                    ? { ...state.incomeStatement, [year]: { ...state.incomeStatement[year], ...incomeStatement } }
                    : state.incomeStatement,
                balanceSheet: balanceSheet
                    ? { ...state.balanceSheet, [year]: { ...state.balanceSheet[year], ...balanceSheet } }
                    : state.balanceSheet,
                cashFlow: cashFlow
                    ? { ...state.cashFlow, [year]: { ...state.cashFlow[year], ...cashFlow } }
                    : state.cashFlow,
            };
        }

        case 'SET_ALL_YEARS_DATA':
            return {
                ...state,
                incomeStatement: action.payload.incomeStatement,
                balanceSheet: action.payload.balanceSheet,
                cashFlow: action.payload.cashFlow,
                availableYears: action.payload.availableYears.sort((a, b) => parseInt(b) - parseInt(a)),
            };

        case 'SET_DCF_RESULTS':
            return { ...state, dcfResults: action.payload };

        case 'SET_HEALTH_RESULTS':
            return { ...state, healthResults: action.payload };

        case 'SET_COMPARABLE_RESULTS':
            return { ...state, comparableResults: action.payload };

        // V4 reducer cases
        case 'SET_ROIC_WACC_RESULTS':
            return { ...state, roicWaccResults: action.payload };

        case 'SET_EARNINGS_QUALITY_RESULTS':
            return { ...state, earningsQualityResults: action.payload };

        case 'SET_DUPONT_RESULTS':
            return { ...state, dupontResults: action.payload };

        case 'SET_FORECAST_RESULTS':
            return { ...state, forecastResults: action.payload };

        case 'SET_CAPITAL_ALLOCATION_RESULTS':
            return { ...state, capitalAllocationResults: action.payload };

        case 'SET_SECTOR_TYPE':
            return { ...state, sectorType: action.payload };

        case 'CLEAR_ALL':
            return initialState;

        default:
            return state;
    }
}

// =============================================
// Helper Functions
// =============================================

/**
 * Safe field retrieval from state
 * Returns null if section, year, or field doesn't exist
 */
export function getField(
    state: CompanyDataState,
    section: 'incomeStatement' | 'balanceSheet' | 'cashFlow',
    year: string,
    field: string
): number | null {
    if (!state[section]) return null;
    const yearData = state[section][year];
    if (!yearData) return null;
    const val = (yearData as Record<string, unknown>)[field];
    if (val === undefined || val === null || val === '') return null;
    return Number(val);
}

/**
 * Get the most recent year available
 */
export function getLatestYear(state: CompanyDataState): string | null {
    if (!state.availableYears || state.availableYears.length === 0) return null;
    return state.availableYears[0]; // sorted descending
}

/**
 * Get the second most recent year (for YoY comparisons)
 */
export function getPreviousYear(state: CompanyDataState): string | null {
    if (!state.availableYears || state.availableYears.length < 2) return null;
    return state.availableYears[1];
}

/**
 * Safe division - returns null if denominator is 0 or null
 */
export function safeDivide(numerator: number | null, denominator: number | null): number | null {
    if (numerator === null || denominator === null) return null;
    if (denominator === 0) return null;
    return numerator / denominator;
}

/**
 * Format number with currency suffix
 * Handles billions, millions, thousands
 */
export function formatNumber(value: number | null | undefined, currency?: string): string {
    if (value === null || value === undefined) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const cur = currency || '';

    if (abs >= 1_000_000_000) {
        return sign + (abs / 1_000_000_000).toFixed(1) + ' mld ' + cur;
    }
    if (abs >= 1_000_000) {
        return sign + (abs / 1_000_000).toFixed(1) + ' mln ' + cur;
    }
    if (abs >= 1_000) {
        return sign + (abs / 1_000).toFixed(1) + ' tys. ' + cur;
    }
    return sign + abs.toFixed(0) + ' ' + cur;
}

/**
 * Format number in compact form (e.g., 12.3M, 1.5B)
 */
export function formatCompact(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) {
        return sign + '$' + (abs / 1_000_000_000).toFixed(1) + 'B';
    }
    if (abs >= 1_000_000) {
        return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M';
    }
    if (abs >= 1_000) {
        return sign + '$' + (abs / 1_000).toFixed(1) + 'K';
    }
    return sign + '$' + abs.toFixed(0);
}

/**
 * Format as percentage (value is already a ratio, e.g., 0.25 → "25.0%")
 */
export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return (value * 100).toFixed(1) + '%';
}

/**
 * Format as multiple (e.g., 2.34x)
 */
export function formatMultiple(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return value.toFixed(2) + 'x';
}

/**
 * Format currency per share
 */
export function formatPerShare(value: number | null | undefined, currency?: string): string {
    if (value === null || value === undefined) return '—';
    const cur = currency || 'PLN';
    return value.toFixed(2) + ' ' + cur;
}

// =============================================
// V4 Advanced Helper Functions
// =============================================

/**
 * Calculate NOPAT (Net Operating Profit After Tax)
 * NOPAT = EBIT × (1 - Tax Rate)
 */
export function calcNOPAT(state: CompanyDataState, year: string): number | null {
    const ebit = getField(state, 'incomeStatement', year, 'ebit');
    const taxRate = getField(state, 'incomeStatement', year, 'effectiveTaxRate');
    if (ebit === null) return null;
    const t = taxRate !== null ? taxRate : 0.19; // default 19% CIT in Poland
    return ebit * (1 - t);
}

/**
 * Calculate Invested Capital
 * IC = Total Assets - Cash - Non-Interest-Bearing Current Liabilities
 */
export function calcInvestedCapital(state: CompanyDataState, year: string): number | null {
    const totalAssets = getField(state, 'balanceSheet', year, 'totalAssets');
    const cash = getField(state, 'balanceSheet', year, 'cash') || 0;
    const currentLiab = getField(state, 'balanceSheet', year, 'currentLiabilities') || 0;
    const shortTermDebt = getField(state, 'balanceSheet', year, 'shortTermDebt') || 0;

    if (totalAssets === null) return null;

    // Non-interest-bearing current liabilities
    const nonInterestCurrLiab = currentLiab - shortTermDebt;
    return totalAssets - cash - nonInterestCurrLiab;
}

/**
 * Calculate ROIC (Return on Invested Capital)
 * ROIC = NOPAT / Invested Capital
 */
export function calcROIC(state: CompanyDataState, year: string): number | null {
    const nopat = calcNOPAT(state, year);
    const ic = calcInvestedCapital(state, year);
    return safeDivide(nopat, ic);
}

/**
 * Calculate Year-over-Year change
 * Returns change as a ratio (e.g., 0.10 for 10% growth)
 */
export function calcYoYChange(
    state: CompanyDataState,
    section: 'incomeStatement' | 'balanceSheet' | 'cashFlow',
    field: string,
    yearCurrent: string,
    yearPrevious: string
): number | null {
    const curr = getField(state, section, yearCurrent, field);
    const prev = getField(state, section, yearPrevious, field);
    if (prev === null || prev === 0) return null;
    return safeDivide(curr !== null && prev !== null ? curr - prev : null, Math.abs(prev));
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calcCAGR(startValue: number | null, endValue: number | null, years: number): number | null {
    if (!startValue || !endValue || startValue <= 0 || years <= 0) return null;
    return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Array median helper
 */
export function arrMedian(arr: number[]): number | null {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Array percentile helper
 */
export function arrPercentile(arr: number[], p: number): number | null {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(s.length * p / 100);
    return s[Math.min(idx, s.length - 1)];
}

// =============================================
// Context
// =============================================

interface CompanyDataContextType {
    state: CompanyDataState;
    dispatch: React.Dispatch<Action>;
}

const CompanyDataContext = createContext<CompanyDataContextType | undefined>(undefined);

// =============================================
// Provider
// =============================================

export function CompanyDataProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(companyDataReducer, initialState);

    return (
        <CompanyDataContext.Provider value={{ state, dispatch }}>
            {children}
        </CompanyDataContext.Provider>
    );
}

// =============================================
// Hook
// =============================================

export function useCompanyData(): CompanyDataContextType {
    const context = useContext(CompanyDataContext);
    if (context === undefined) {
        throw new Error('useCompanyData must be used within a CompanyDataProvider');
    }
    return context;
}

// =============================================
// Export types for use in components
// =============================================

export type { Action as CompanyDataAction };
