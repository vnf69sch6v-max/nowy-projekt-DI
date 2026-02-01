-- =============================================
-- StochFin Database Schema: Core
-- Schema for entities, variables, and historical facts
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SCHEMA: core
-- =============================================
CREATE SCHEMA IF NOT EXISTS core;

-- =============================================
-- Entities (Companies/Projects being modeled)
-- =============================================
CREATE TABLE core.entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'company', 'project', 'portfolio', 'segment'
  )),
  parent_entity_id UUID REFERENCES core.entities(id),
  industry VARCHAR(100),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX idx_entities_type ON core.entities(entity_type);
CREATE INDEX idx_entities_parent ON core.entities(parent_entity_id);

-- =============================================
-- Variable Definitions (Master list of variables)
-- =============================================
CREATE TABLE core.variable_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_pl VARCHAR(255),
  description TEXT,
  variable_category VARCHAR(50) NOT NULL CHECK (variable_category IN (
    'income_statement', 'balance_sheet', 'cash_flow',
    'ratio', 'macro', 'operational', 'custom'
  )),
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN (
    'monetary', 'percentage', 'ratio', 'count', 'text'
  )),
  default_unit VARCHAR(20),
  typical_process VARCHAR(50) CHECK (typical_process IN (
    'gbm', 'ornstein_uhlenbeck', 'poisson', 'deterministic'
  )),
  is_driver BOOLEAN DEFAULT FALSE,
  is_derived BOOLEAN DEFAULT FALSE,
  derivation_formula TEXT,
  bounds_min DECIMAL(20,4),
  bounds_max DECIMAL(20,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variables_category ON core.variable_definitions(variable_category);
CREATE INDEX idx_variables_code ON core.variable_definitions(code);

-- =============================================
-- Standard Variable Seed Data
-- =============================================
INSERT INTO core.variable_definitions (code, name, name_pl, variable_category, data_type, default_unit, typical_process, is_driver) VALUES
-- Income Statement
('REVENUE', 'Revenue', 'Przychody', 'income_statement', 'monetary', 'PLN', 'gbm', true),
('COGS', 'Cost of Goods Sold', 'Koszt własny sprzedaży', 'income_statement', 'monetary', 'PLN', 'gbm', false),
('GROSS_PROFIT', 'Gross Profit', 'Zysk brutto', 'income_statement', 'monetary', 'PLN', NULL, false),
('OPEX', 'Operating Expenses', 'Koszty operacyjne', 'income_statement', 'monetary', 'PLN', 'gbm', false),
('EBITDA', 'EBITDA', 'EBITDA', 'income_statement', 'monetary', 'PLN', NULL, false),
('EBIT', 'EBIT', 'EBIT', 'income_statement', 'monetary', 'PLN', NULL, false),
('NET_INCOME', 'Net Income', 'Zysk netto', 'income_statement', 'monetary', 'PLN', NULL, false),
-- Margins (mean-reverting)
('GROSS_MARGIN', 'Gross Margin', 'Marża brutto', 'ratio', 'percentage', '%', 'ornstein_uhlenbeck', true),
('EBITDA_MARGIN', 'EBITDA Margin', 'Marża EBITDA', 'ratio', 'percentage', '%', 'ornstein_uhlenbeck', true),
('NET_MARGIN', 'Net Margin', 'Marża netto', 'ratio', 'percentage', '%', 'ornstein_uhlenbeck', false),
-- Balance Sheet
('TOTAL_ASSETS', 'Total Assets', 'Aktywa razem', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('TOTAL_LIABILITIES', 'Total Liabilities', 'Zobowiązania razem', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('TOTAL_EQUITY', 'Total Equity', 'Kapitał własny', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('NET_DEBT', 'Net Debt', 'Dług netto', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('CASH', 'Cash & Equivalents', 'Środki pieniężne', 'balance_sheet', 'monetary', 'PLN', NULL, false),
-- Working Capital
('ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'Należności', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('INVENTORY', 'Inventory', 'Zapasy', 'balance_sheet', 'monetary', 'PLN', NULL, false),
('ACCOUNTS_PAYABLE', 'Accounts Payable', 'Zobowiązania handlowe', 'balance_sheet', 'monetary', 'PLN', NULL, false),
-- Cash Flow
('OCF', 'Operating Cash Flow', 'Przepływy operacyjne', 'cash_flow', 'monetary', 'PLN', NULL, false),
('ICF', 'Investing Cash Flow', 'Przepływy inwestycyjne', 'cash_flow', 'monetary', 'PLN', NULL, false),
('FCF', 'Free Cash Flow', 'Wolne przepływy pieniężne', 'cash_flow', 'monetary', 'PLN', NULL, false),
('CAPEX', 'Capital Expenditure', 'Nakłady inwestycyjne', 'cash_flow', 'monetary', 'PLN', 'gbm', true),
-- Operational Ratios (drivers)
('REVENUE_GROWTH', 'Revenue Growth Rate', 'Tempo wzrostu przychodów', 'ratio', 'percentage', '%', 'ornstein_uhlenbeck', true),
('DSO', 'Days Sales Outstanding', 'Dni rotacji należności', 'operational', 'count', 'days', 'ornstein_uhlenbeck', true),
('DIO', 'Days Inventory Outstanding', 'Dni rotacji zapasów', 'operational', 'count', 'days', 'ornstein_uhlenbeck', true),
('DPO', 'Days Payable Outstanding', 'Dni rotacji zobowiązań', 'operational', 'count', 'days', 'ornstein_uhlenbeck', true),
('CAPEX_TO_REVENUE', 'CAPEX to Revenue', 'CAPEX do przychodów', 'ratio', 'percentage', '%', 'ornstein_uhlenbeck', true),
-- Leverage Ratios
('DEBT_TO_EBITDA', 'Debt to EBITDA', 'Dług/EBITDA', 'ratio', 'ratio', 'x', NULL, false),
('DSCR', 'Debt Service Coverage Ratio', 'Wskaźnik pokrycia długu', 'ratio', 'ratio', 'x', NULL, false),
-- Macro
('GDP_GROWTH', 'GDP Growth', 'Wzrost PKB', 'macro', 'percentage', '%', 'ornstein_uhlenbeck', true),
('INFLATION', 'Inflation Rate', 'Stopa inflacji', 'macro', 'percentage', '%', 'ornstein_uhlenbeck', true),
('INTEREST_RATE', 'Interest Rate', 'Stopy procentowe', 'macro', 'percentage', '%', 'ornstein_uhlenbeck', true);

-- =============================================
-- Historical Facts
-- =============================================
CREATE TABLE core.historical_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES core.entities(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES core.variable_definitions(id),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('instant', 'duration')),
  period_start DATE NOT NULL,
  period_end DATE,
  value DECIMAL(20,4) NOT NULL,
  currency VARCHAR(3),
  confidence_level VARCHAR(30) DEFAULT 'unaudited' CHECK (confidence_level IN (
    'audited_final', 'audited_preliminary',
    'unaudited', 'estimated', 'restated'
  )),
  measurement_error_std DECIMAL(10,6) DEFAULT 0,
  source_type VARCHAR(50),
  source_document_url TEXT,
  source_api VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT unique_fact UNIQUE (
    entity_id, variable_id, period_type, period_start, period_end
  )
);

CREATE INDEX idx_facts_entity_period ON core.historical_facts(entity_id, period_end DESC);
CREATE INDEX idx_facts_variable ON core.historical_facts(variable_id);

-- =============================================
-- Industry Correlation Templates
-- =============================================
CREATE TABLE core.industry_correlation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry_code VARCHAR(50) NOT NULL,
  industry_name VARCHAR(255) NOT NULL,
  industry_name_pl VARCHAR(255),
  variables UUID[] NOT NULL,
  matrix_values FLOAT[][] NOT NULL,
  source VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE core.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.historical_facts ENABLE ROW LEVEL SECURITY;

-- Policies will be added based on auth setup
