// =============================================
// Agent 4: Time Series Processor
// Transforms and processes time series data
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    TimeSeriesData
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface TimeSeriesProcessorInput {
    data: TimeSeriesData;
    operations: ProcessingOperation[];
}

export interface ProcessingOperation {
    type: OperationType;
    params?: Record<string, number | string | boolean>;
}

export type OperationType =
    | 'resample'
    | 'interpolate'
    | 'normalize'
    | 'standardize'
    | 'difference'
    | 'log_transform'
    | 'rolling_mean'
    | 'rolling_std'
    | 'ewma'
    | 'detrend'
    | 'seasonality_adjust'
    | 'winsorize'
    | 'clip';

export interface TimeSeriesProcessorOutput {
    processed_data: TimeSeriesData;
    transformations_applied: TransformationLog[];
    original_stats: SeriesStats;
    processed_stats: SeriesStats;
}

export interface TransformationLog {
    operation: OperationType;
    params: Record<string, unknown>;
    affected_values: number;
    notes?: string;
}

export interface SeriesStats {
    mean: number;
    std: number;
    min: number;
    max: number;
    skewness: number;
}

// =============================================
// Agent Implementation
// =============================================

export class TimeSeriesProcessorAgent extends BaseAgent<TimeSeriesProcessorInput, TimeSeriesProcessorOutput> {
    readonly id: AgentId = 'agent-time-series-processor';
    readonly name = 'Time Series Processor';
    readonly category: AgentCategory = 'data';
    readonly description = 'Przetwarza i transformuje szeregi czasowe';
    readonly triggers: TriggerType[] = ['data_event', 'user_action'];

    protected async run(
        input: TimeSeriesProcessorInput,
        context: AgentContext
    ): Promise<TimeSeriesProcessorOutput> {
        const { data, operations } = input;

        context.log(`[${this.id}] Processing ${data.variable_name} with ${operations.length} operations`);

        // Store original stats
        const original_stats = this.computeStats(data.values);

        // Apply operations sequentially
        let currentValues = [...data.values];
        let currentDates = [...data.dates];
        const transformations_applied: TransformationLog[] = [];

        for (const op of operations) {
            const result = this.applyOperation(op, currentValues, currentDates);
            currentValues = result.values;
            currentDates = result.dates;
            transformations_applied.push(result.log);

            context.log(`[${this.id}] Applied ${op.type}: ${result.log.affected_values} values affected`);
        }

        // Compute processed stats
        const processed_stats = this.computeStats(currentValues);

        return {
            processed_data: {
                variable_name: data.variable_name,
                values: currentValues,
                dates: currentDates
            },
            transformations_applied,
            original_stats,
            processed_stats
        };
    }

    // =============================================
    // Operation Dispatcher
    // =============================================

    private applyOperation(
        op: ProcessingOperation,
        values: number[],
        dates: Date[]
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        switch (op.type) {
            case 'normalize':
                return this.normalize(values, dates, op.params);
            case 'standardize':
                return this.standardize(values, dates, op.params);
            case 'difference':
                return this.difference(values, dates, op.params);
            case 'log_transform':
                return this.logTransform(values, dates, op.params);
            case 'rolling_mean':
                return this.rollingMean(values, dates, op.params);
            case 'rolling_std':
                return this.rollingStd(values, dates, op.params);
            case 'ewma':
                return this.ewma(values, dates, op.params);
            case 'detrend':
                return this.detrend(values, dates, op.params);
            case 'winsorize':
                return this.winsorize(values, dates, op.params);
            case 'clip':
                return this.clip(values, dates, op.params);
            case 'interpolate':
                return this.interpolate(values, dates, op.params);
            default:
                return { values, dates, log: { operation: op.type, params: op.params || {}, affected_values: 0 } };
        }
    }

    // =============================================
    // Transformations
    // =============================================

    private normalize(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const normalized = values.map(v => (v - min) / range);

        return {
            values: normalized,
            dates,
            log: { operation: 'normalize', params: { min, max }, affected_values: values.length }
        };
    }

    private standardize(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const mean = this.mean(values);
        const std = this.std(values) || 1;

        const standardized = values.map(v => (v - mean) / std);

        return {
            values: standardized,
            dates,
            log: { operation: 'standardize', params: { mean, std }, affected_values: values.length }
        };
    }

    private difference(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const order = (params?.order as number) || 1;
        let current = [...values];
        let currentDates = [...dates];

        for (let i = 0; i < order; i++) {
            const diff: number[] = [];
            const newDates: Date[] = [];
            for (let j = 1; j < current.length; j++) {
                diff.push(current[j] - current[j - 1]);
                newDates.push(currentDates[j]);
            }
            current = diff;
            currentDates = newDates;
        }

        return {
            values: current,
            dates: currentDates,
            log: { operation: 'difference', params: { order }, affected_values: values.length - order }
        };
    }

    private logTransform(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const offset = (params?.offset as number) || 0;
        const transformed = values.map(v => Math.log(Math.max(0.0001, v + offset)));

        return {
            values: transformed,
            dates,
            log: { operation: 'log_transform', params: { offset }, affected_values: values.length }
        };
    }

    private rollingMean(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const window = (params?.window as number) || 20;
        const result: number[] = [];
        const resultDates: Date[] = [];

        for (let i = window - 1; i < values.length; i++) {
            const windowValues = values.slice(i - window + 1, i + 1);
            result.push(this.mean(windowValues));
            resultDates.push(dates[i]);
        }

        return {
            values: result,
            dates: resultDates,
            log: { operation: 'rolling_mean', params: { window }, affected_values: result.length }
        };
    }

    private rollingStd(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const window = (params?.window as number) || 20;
        const result: number[] = [];
        const resultDates: Date[] = [];

        for (let i = window - 1; i < values.length; i++) {
            const windowValues = values.slice(i - window + 1, i + 1);
            result.push(this.std(windowValues));
            resultDates.push(dates[i]);
        }

        return {
            values: result,
            dates: resultDates,
            log: { operation: 'rolling_std', params: { window }, affected_values: result.length }
        };
    }

    private ewma(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const span = (params?.span as number) || 20;
        const alpha = 2 / (span + 1);
        const result: number[] = [values[0]];

        for (let i = 1; i < values.length; i++) {
            result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
        }

        return {
            values: result,
            dates,
            log: { operation: 'ewma', params: { span, alpha }, affected_values: values.length }
        };
    }

    private detrend(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const n = values.length;

        // Linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const detrended = values.map((v, i) => v - (slope * i + intercept));

        return {
            values: detrended,
            dates,
            log: { operation: 'detrend', params: { slope, intercept }, affected_values: n }
        };
    }

    private winsorize(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const percentile = (params?.percentile as number) || 0.05;
        const sorted = [...values].sort((a, b) => a - b);
        const lowerIdx = Math.floor(values.length * percentile);
        const upperIdx = Math.floor(values.length * (1 - percentile));

        const lowerBound = sorted[lowerIdx];
        const upperBound = sorted[upperIdx];

        let affected = 0;
        const winsorized = values.map(v => {
            if (v < lowerBound) { affected++; return lowerBound; }
            if (v > upperBound) { affected++; return upperBound; }
            return v;
        });

        return {
            values: winsorized,
            dates,
            log: { operation: 'winsorize', params: { percentile, lowerBound, upperBound }, affected_values: affected }
        };
    }

    private clip(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const min = (params?.min as number) ?? -Infinity;
        const max = (params?.max as number) ?? Infinity;

        let affected = 0;
        const clipped = values.map(v => {
            if (v < min || v > max) affected++;
            return Math.min(max, Math.max(min, v));
        });

        return {
            values: clipped,
            dates,
            log: { operation: 'clip', params: { min, max }, affected_values: affected }
        };
    }

    private interpolate(
        values: number[],
        dates: Date[],
        params?: Record<string, unknown>
    ): { values: number[]; dates: Date[]; log: TransformationLog } {
        const method = (params?.method as string) || 'linear';
        const interpolated = [...values];
        let affected = 0;

        for (let i = 0; i < interpolated.length; i++) {
            if (isNaN(interpolated[i]) || interpolated[i] === null) {
                // Find prev and next valid
                let prev = i - 1;
                while (prev >= 0 && (isNaN(interpolated[prev]) || interpolated[prev] === null)) prev--;
                let next = i + 1;
                while (next < interpolated.length && (isNaN(interpolated[next]) || interpolated[next] === null)) next++;

                if (prev >= 0 && next < interpolated.length) {
                    const ratio = (i - prev) / (next - prev);
                    interpolated[i] = interpolated[prev] + ratio * (interpolated[next] - interpolated[prev]);
                    affected++;
                } else if (prev >= 0) {
                    interpolated[i] = interpolated[prev];
                    affected++;
                } else if (next < interpolated.length) {
                    interpolated[i] = interpolated[next];
                    affected++;
                }
            }
        }

        return {
            values: interpolated,
            dates,
            log: { operation: 'interpolate', params: { method }, affected_values: affected }
        };
    }

    // =============================================
    // Helpers
    // =============================================

    private computeStats(values: number[]): SeriesStats {
        const mean = this.mean(values);
        const std = this.std(values);

        let skewness = 0;
        if (std > 0) {
            for (const v of values) {
                skewness += Math.pow((v - mean) / std, 3);
            }
            skewness /= values.length;
        }

        return {
            mean,
            std,
            min: Math.min(...values),
            max: Math.max(...values),
            skewness
        };
    }
}

export const timeSeriesProcessorAgent = new TimeSeriesProcessorAgent();
