// @ts-nocheck
// =============================================
// Agent 1: Data Collector
// Fetches data from external sources (NBP, GUS, Yahoo)
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    TimeSeriesData,
    NBPExchangeRate,
    YahooPriceData
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface DataCollectorInput {
    sources: DataSource[];
    startDate?: Date;
    endDate?: Date;
}

export interface DataSource {
    type: 'nbp' | 'gus' | 'yahoo' | 'manual';
    identifier: string; // currency code, GUS indicator ID, ticker symbol
    variable_name: string;
}

export interface DataCollectorOutput {
    collected: TimeSeriesData[];
    errors: { source: string; error: string }[];
    summary: string;
}

// =============================================
// Agent Implementation
// =============================================

export class DataCollectorAgent extends BaseAgent<DataCollectorInput, DataCollectorOutput> {
    readonly id: AgentId = 'agent-data-collector';
    readonly name = 'Data Collector';
    readonly category: AgentCategory = 'data';
    readonly description = 'Pobiera dane ze źródeł zewnętrznych (NBP, GUS, Yahoo Finance)';
    readonly triggers: TriggerType[] = ['cron', 'user_action'];

    // =============================================
    // Main Execution
    // =============================================

    protected async run(
        input: DataCollectorInput,
        context: AgentContext
    ): Promise<DataCollectorOutput> {
        const collected: TimeSeriesData[] = [];
        const errors: { source: string; error: string }[] = [];

        const endDate = input.endDate || new Date();
        const startDate = input.startDate || new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

        for (const source of input.sources) {
            try {
                context.log(`[${this.id}] Fetching from ${source.type}: ${source.identifier}`);

                let data: TimeSeriesData;

                switch (source.type) {
                    case 'nbp':
                        data = await this.fetchFromNBP(source.identifier, source.variable_name, startDate, endDate);
                        break;
                    case 'yahoo':
                        data = await this.fetchFromYahoo(source.identifier, source.variable_name, startDate, endDate);
                        break;
                    case 'gus':
                        data = await this.fetchFromGUS(source.identifier, source.variable_name);
                        break;
                    default:
                        throw new Error(`Unknown source type: ${source.type}`);
                }

                collected.push(data);
                context.log(`[${this.id}] Collected ${data.values.length} data points for ${source.variable_name}`);

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                errors.push({ source: `${source.type}:${source.identifier}`, error: errorMsg });
                context.log(`[${this.id}] Error fetching ${source.identifier}: ${errorMsg}`, 'error');
            }
        }

        // Generate summary with Gemini (if available)
        let summary = `Zebrano ${collected.length} serii danych.`;

        if (context.gemini && collected.length > 0) {
            try {
                const statsInfo = collected.map(d => ({
                    name: d.variable_name,
                    points: d.values.length,
                    min: Math.min(...d.values).toFixed(4),
                    max: Math.max(...d.values).toFixed(4),
                    mean: this.mean(d.values).toFixed(4)
                }));

                const { text } = await this.callGemini(
                    `Przygotuj krótkie podsumowanie (2-3 zdania) pobranych danych finansowych: ${JSON.stringify(statsInfo)}`,
                    context
                );
                summary = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini summary failed: ${e}`, 'warn');
            }
        }

        return { collected, errors, summary };
    }

    // =============================================
    // NBP API (Polish National Bank)
    // =============================================

    private async fetchFromNBP(
        currencyCode: string,
        variableName: string,
        startDate: Date,
        endDate: Date
    ): Promise<TimeSeriesData> {
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const url = `https://api.nbp.pl/api/exchangerates/rates/a/${currencyCode}/${formatDate(startDate)}/${formatDate(endDate)}/?format=json`;

        const response = await this.retry(async () => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`NBP API error: ${res.status}`);
            return res.json();
        });

        const rates: NBPExchangeRate[] = response.rates || [];

        return {
            variable_name: variableName,
            values: rates.map(r => r.mid),
            dates: rates.map(r => new Date(r.effectiveDate)),
            frequency: 'daily',
            source: `NBP:${currencyCode}`
        };
    }

    // =============================================
    // Yahoo Finance (via yfinance-like endpoint)
    // =============================================

    private async fetchFromYahoo(
        ticker: string,
        variableName: string,
        startDate: Date,
        endDate: Date
    ): Promise<TimeSeriesData> {
        // Using Yahoo Finance API (simplified - in production use proper API)
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

        const response = await this.retry(async () => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
            return res.json();
        });

        const result = response.chart?.result?.[0];
        if (!result) throw new Error('No data from Yahoo Finance');

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        // Filter out null values
        const validData: { date: Date; value: number }[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] !== null && closes[i] !== undefined) {
                validData.push({
                    date: new Date(timestamps[i] * 1000),
                    value: closes[i]
                });
            }
        }

        return {
            variable_name: variableName,
            values: validData.map(d => d.value),
            dates: validData.map(d => d.date),
            frequency: 'daily',
            source: `Yahoo:${ticker}`
        };
    }

    // =============================================
    // GUS API (Polish Central Statistical Office)
    // =============================================

    private async fetchFromGUS(
        indicatorId: string,
        variableName: string
    ): Promise<TimeSeriesData> {
        // GUS BDL API
        const url = `https://bdl.stat.gov.pl/api/v1/data/by-variable/${indicatorId}?format=json&lang=pl`;

        const response = await this.retry(async () => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`GUS API error: ${res.status}`);
            return res.json();
        });

        const results = response.results || [];
        const values: number[] = [];
        const dates: Date[] = [];

        for (const result of results) {
            for (const val of result.values || []) {
                if (val.val !== null) {
                    values.push(parseFloat(val.val));
                    dates.push(new Date(`${val.year}-01-01`));
                }
            }
        }

        return {
            variable_name: variableName,
            values,
            dates,
            frequency: 'yearly',
            source: `GUS:${indicatorId}`
        };
    }

    // =============================================
    // Missing Data Detection
    // =============================================

    detectMissingData(series: TimeSeriesData): {
        missing_count: number;
        missing_periods: string[];
        completeness: number;
    } {
        // This is a simplified version - in production would be more sophisticated
        const missingPeriods: string[] = [];
        let expectedCount = series.values.length;

        // Check for gaps in dates
        for (let i = 1; i < series.dates.length; i++) {
            const diff = series.dates[i].getTime() - series.dates[i - 1].getTime();
            const expectedDiff = this.getExpectedDiff(series.frequency);

            if (diff > expectedDiff * 1.5) {
                missingPeriods.push(`${series.dates[i - 1].toISOString()} - ${series.dates[i].toISOString()}`);
            }
        }

        return {
            missing_count: missingPeriods.length,
            missing_periods: missingPeriods,
            completeness: (expectedCount - missingPeriods.length) / expectedCount * 100
        };
    }

    private getExpectedDiff(frequency: string): number {
        switch (frequency) {
            case 'daily': return 24 * 60 * 60 * 1000;
            case 'weekly': return 7 * 24 * 60 * 60 * 1000;
            case 'monthly': return 30 * 24 * 60 * 60 * 1000;
            case 'quarterly': return 90 * 24 * 60 * 60 * 1000;
            case 'yearly': return 365 * 24 * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    }
}

// =============================================
// Export singleton instance
// =============================================

export const dataCollectorAgent = new DataCollectorAgent();
