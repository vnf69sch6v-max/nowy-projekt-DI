// =============================================
// StochFin Valuation Module - Types
// =============================================

// =============================================
// Data Source Types
// =============================================

export type DataSourceType = 'api' | 'pdf' | 'excel' | 'manual';

export interface SourceInfo {
    type: DataSourceType;
    label: string;
    timestamp?: string;
    page?: number;
    fileName?: string;
}

// =============================================
// Company Financial Data
// =============================================

export interface CompanyFinancials {
    id?: string;
    source: string;
    source_type: DataSourceType;
    source_details?: SourceInfo;
    fetched_at: string;
    ticker: string;
    company_name: string;
    exchange: string;
    currency: string;
    sector: string;
    current_price: number | null;
    market_cap: number | null;
    shares_outstanding: number | null;
    unit_multiplier: number;
    unit_label: string;
    statements: FinancialStatements;
    metrics: MarketMetrics;
}

export interface FinancialStatements {
    income_statement: StatementData;
    balance_sheet: StatementData;
    cash_flow_statement: StatementData;
}

export interface StatementData {
    periods: string[];
    data: Record<string, Record<string, number | null>>;
    source_info?: Record<string, SourceInfo>; // Per-field source tracking
}

// =============================================
// Standard Field Mappings
// =============================================

export const INCOME_STATEMENT_FIELDS = {
    revenue: { pl: 'Przychody ze sprzedaży', en: 'Revenue' },
    cost_of_revenue: { pl: 'Koszt sprzedanych produktów', en: 'Cost of Revenue' },
    gross_profit: { pl: 'Zysk brutto', en: 'Gross Profit' },
    operating_expenses: { pl: 'Koszty operacyjne', en: 'Operating Expenses' },
    ebitda: { pl: 'EBITDA', en: 'EBITDA' },
    depreciation: { pl: 'Amortyzacja', en: 'Depreciation & Amortization' },
    ebit: { pl: 'Zysk operacyjny', en: 'Operating Income' },
    interest_expense: { pl: 'Koszty finansowe', en: 'Interest Expense' },
    pretax_income: { pl: 'Zysk przed opodatkowaniem', en: 'Pre-tax Income' },
    tax: { pl: 'Podatek dochodowy', en: 'Income Tax' },
    net_income: { pl: 'Zysk netto', en: 'Net Income' },
    eps: { pl: 'Zysk na akcję', en: 'EPS' },
    shares_outstanding: { pl: 'Liczba akcji', en: 'Shares Outstanding' }
} as const;

export const BALANCE_SHEET_FIELDS = {
    total_assets: { pl: 'Aktywa razem', en: 'Total Assets' },
    current_assets: { pl: 'Aktywa obrotowe', en: 'Current Assets' },
    cash: { pl: 'Środki pieniężne', en: 'Cash & Equivalents' },
    total_liabilities: { pl: 'Zobowiązania razem', en: 'Total Liabilities' },
    current_liabilities: { pl: 'Zobowiązania krótkoterminowe', en: 'Current Liabilities' },
    long_term_debt: { pl: 'Zadłużenie długoterminowe', en: 'Long-term Debt' },
    total_equity: { pl: 'Kapitał własny', en: 'Total Equity' }
} as const;

export const CASH_FLOW_FIELDS = {
    operating_cf: { pl: 'Przepływy operacyjne', en: 'Operating Cash Flow' },
    capex: { pl: 'Nakłady inwestycyjne', en: 'Capital Expenditure' },
    free_cash_flow: { pl: 'Wolne przepływy pieniężne', en: 'Free Cash Flow' },
    investing_cf: { pl: 'Przepływy inwestycyjne', en: 'Investing Cash Flow' },
    financing_cf: { pl: 'Przepływy finansowe', en: 'Financing Cash Flow' }
} as const;

// =============================================
// Market Metrics
// =============================================

export interface MarketMetrics {
    pe_ratio: number | null;
    ev_to_ebitda: number | null;
    ev_to_revenue: number | null;
    pb_ratio: number | null;
    roic: number | null;
    debt_to_equity: number | null;
    dividend_yield: number | null;
}

// =============================================
// DCF Valuation Types
// =============================================

export interface DCFAssumptions {
    revenue_growth: DistributionParam;
    ebitda_margin: DistributionParam;
    capex_to_revenue: DistributionParam;
    nwc_to_revenue_change: DistributionParam;
    wacc: DistributionParam;
    terminal_growth: DistributionParam;
    terminal_multiple?: DistributionParam;
}

export interface DistributionParam {
    type: 'normal' | 'triangular' | 'uniform' | 'lognormal';
    mean: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
    calibrated_from_history?: boolean;
}

export interface DCFResult {
    n_scenarios: number;
    enterprise_value: {
        mean: number;
        median: number;
        std: number;
        percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
    };
    equity_value: {
        mean: number;
        median: number;
        std: number;
        percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
    };
    per_share: {
        mean: number;
        median: number;
        std: number;
        percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
    };
    terminal_value_pct: number;
    upside_probability: number;
    histogram_data: { bin: number; count: number }[];
}

// =============================================
// Comparables Types
// =============================================

export interface PeerCompany {
    ticker: string;
    company_name: string;
    source: DataSourceType;
    revenue: number | null;
    ebitda: number | null;
    ebitda_margin: number | null;
    net_income: number | null;
    pe_ratio: number | null;
    ev_to_ebitda: number | null;
    ev_to_revenue: number | null;
    pb_ratio: number | null;
    included_in_median: boolean;
}

export interface ComparablesResult {
    peers: PeerCompany[];
    median_multiples: {
        pe_ratio: number;
        ev_to_ebitda: number;
        ev_to_revenue: number;
        pb_ratio: number;
    };
    implied_values: {
        from_pe: number;
        from_ev_ebitda: number;
        from_ev_revenue: number;
        from_pb: number;
    };
}

// =============================================
// Sensitivity Analysis Types
// =============================================

export interface SensitivityResult {
    wacc_range: number[];
    terminal_growth_range: number[];
    value_matrix: number[][];
    base_case_position: { wacc_idx: number; growth_idx: number };
}

export interface TornadoItem {
    parameter: string;
    low_value: number;
    high_value: number;
    low_label: string;
    high_label: string;
}

// =============================================
// API Response Types
// =============================================

export interface FetchCompanyResponse {
    data?: CompanyFinancials;
    error?: string;
    suggestion?: string;
}

export interface ExtractPDFResponse {
    extraction_method: string;
    language_detected: string;
    currency_detected: string;
    unit_multiplier: number;
    unit_label: string;
    tables_found: number;
    tables_matched: number;
    statements: FinancialStatements;
    warnings: string[];
    raw_tables?: any[];
}
