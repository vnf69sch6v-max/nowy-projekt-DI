// =============================================
// Agent 9: Backtester
// Historical backtesting of probability models
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface BacktesterInput {
    predictions: PredictionRecord[];
    actuals: ActualRecord[];
    calibration_bins?: number;
}

export interface PredictionRecord {
    date: Date;
    event_id: string;
    predicted_probability: number;
    confidence_interval?: [number, number];
}

export interface ActualRecord {
    date: Date;
    event_id: string;
    occurred: boolean;
}

export interface BacktesterOutput {
    overall_metrics: OverallMetrics;
    calibration: CalibrationResult;
    reliability_diagram: ReliabilityPoint[];
    failure_periods: FailurePeriod[];
    interpretation: string;
}

export interface OverallMetrics {
    hit_rate: number;
    brier_score: number;
    log_loss: number;
    auc_roc: number;
    n_predictions: number;
    period_start: Date;
    period_end: Date;
}

export interface CalibrationResult {
    is_well_calibrated: boolean;
    hosmer_lemeshow_stat: number;
    hosmer_lemeshow_pvalue: number;
    calibration_slope: number;
    calibration_intercept: number;
}

export interface ReliabilityPoint {
    bin_midpoint: number;
    predicted_avg: number;
    actual_rate: number;
    count: number;
    error: number;
}

export interface FailurePeriod {
    start: Date;
    end: Date;
    n_predictions: number;
    avg_error: number;
    description: string;
}

// =============================================
// Agent Implementation
// =============================================

export class BacktesterAgent extends BaseAgent<BacktesterInput, BacktesterOutput> {
    readonly id: AgentId = 'agent-backtester';
    readonly name = 'Backtester';
    readonly category: AgentCategory = 'models';
    readonly description = 'Backtesting modeli prawdopodobieństwa';
    readonly triggers: TriggerType[] = ['user_action', 'cron'];

    protected async run(
        input: BacktesterInput,
        context: AgentContext
    ): Promise<BacktesterOutput> {
        const { predictions, actuals } = input;
        const nBins = input.calibration_bins || 10;

        context.log(`[${this.id}] Backtesting ${predictions.length} predictions`);

        // Match predictions with actuals
        const matched = this.matchPredictionsWithActuals(predictions, actuals);

        if (matched.length === 0) {
            throw new Error('No matching predictions and actuals found');
        }

        // Compute overall metrics
        const overall_metrics = this.computeOverallMetrics(matched);

        // Calibration analysis
        const calibration = this.computeCalibration(matched, nBins);

        // Reliability diagram
        const reliability_diagram = this.computeReliabilityDiagram(matched, nBins);

        // Identify failure periods
        const failure_periods = this.identifyFailurePeriods(matched);

        // Generate interpretation
        let interpretation = `Brier Score: ${overall_metrics.brier_score.toFixed(4)}`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Zinterpretuj wyniki backtestu (max 3 zdania):
                    - Hit rate: ${(overall_metrics.hit_rate * 100).toFixed(1)}%
                    - Brier Score: ${overall_metrics.brier_score.toFixed(4)} (0 = perfect, 0.25 = random)
                    - AUC-ROC: ${overall_metrics.auc_roc.toFixed(3)}
                    - Calibration: ${calibration.is_well_calibrated ? 'dobrze skalibrowany' : 'wymaga rekalibracji'}
                    - Failure periods: ${failure_periods.length}
                    
                    Czy model jest wiarygodny? Co rekomendować?`,
                    context
                );
                interpretation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            overall_metrics,
            calibration,
            reliability_diagram,
            failure_periods,
            interpretation
        };
    }

    // =============================================
    // Matching Predictions and Actuals
    // =============================================

    private matchPredictionsWithActuals(
        predictions: PredictionRecord[],
        actuals: ActualRecord[]
    ): { prediction: number; actual: boolean; date: Date }[] {
        const actualMap = new Map<string, boolean>();

        for (const a of actuals) {
            const key = `${a.event_id}_${a.date.toISOString().split('T')[0]}`;
            actualMap.set(key, a.occurred);
        }

        return predictions
            .map(p => {
                const key = `${p.event_id}_${p.date.toISOString().split('T')[0]}`;
                const actual = actualMap.get(key);
                if (actual !== undefined) {
                    return {
                        prediction: p.predicted_probability,
                        actual,
                        date: p.date
                    };
                }
                return null;
            })
            .filter((x): x is { prediction: number; actual: boolean; date: Date } => x !== null);
    }

    // =============================================
    // Overall Metrics
    // =============================================

    private computeOverallMetrics(
        data: { prediction: number; actual: boolean; date: Date }[]
    ): OverallMetrics {
        const n = data.length;
        const dates = data.map(d => d.date);

        // Hit rate (accuracy at 50% threshold)
        const hits = data.filter(d =>
            (d.prediction >= 0.5 && d.actual) ||
            (d.prediction < 0.5 && !d.actual)
        ).length;
        const hit_rate = hits / n;

        // Brier Score
        const brier_score = data.reduce((sum, d) =>
            sum + Math.pow(d.prediction - (d.actual ? 1 : 0), 2), 0
        ) / n;

        // Log Loss
        const log_loss = data.reduce((sum, d) => {
            const p = Math.max(0.001, Math.min(0.999, d.prediction));
            return sum - (d.actual ? Math.log(p) : Math.log(1 - p));
        }, 0) / n;

        // AUC-ROC (simplified)
        const auc_roc = this.computeAUC(data);

        return {
            hit_rate,
            brier_score,
            log_loss,
            auc_roc,
            n_predictions: n,
            period_start: new Date(Math.min(...dates.map(d => d.getTime()))),
            period_end: new Date(Math.max(...dates.map(d => d.getTime())))
        };
    }

    private computeAUC(data: { prediction: number; actual: boolean }[]): number {
        const positives = data.filter(d => d.actual).map(d => d.prediction);
        const negatives = data.filter(d => !d.actual).map(d => d.prediction);

        if (positives.length === 0 || negatives.length === 0) return 0.5;

        let concordant = 0;
        for (const pos of positives) {
            for (const neg of negatives) {
                if (pos > neg) concordant++;
                else if (pos === neg) concordant += 0.5;
            }
        }

        return concordant / (positives.length * negatives.length);
    }

    // =============================================
    // Calibration Analysis
    // =============================================

    private computeCalibration(
        data: { prediction: number; actual: boolean }[],
        nBins: number
    ): CalibrationResult {
        const bins = this.createBins(data, nBins);

        // Hosmer-Lemeshow test
        let hlStat = 0;
        for (const bin of bins) {
            if (bin.count > 0) {
                const expected = bin.predicted_avg * bin.count;
                const observed = bin.actual_rate * bin.count;
                if (expected > 0 && (bin.count - expected) > 0) {
                    hlStat += Math.pow(observed - expected, 2) / (expected * (1 - expected / bin.count));
                }
            }
        }

        // p-value (chi2 with nBins-2 df)
        const pvalue = 1 - this.chi2CDF(hlStat, Math.max(1, nBins - 2));

        // Calibration slope and intercept (logistic regression)
        const { slope, intercept } = this.computeCalibrationSlope(data);

        return {
            is_well_calibrated: pvalue > 0.05 && Math.abs(slope - 1) < 0.2,
            hosmer_lemeshow_stat: hlStat,
            hosmer_lemeshow_pvalue: pvalue,
            calibration_slope: slope,
            calibration_intercept: intercept
        };
    }

    private computeCalibrationSlope(
        data: { prediction: number; actual: boolean }[]
    ): { slope: number; intercept: number } {
        // Simplified linear calibration
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (const d of data) {
            const x = Math.log(d.prediction / (1 - Math.max(0.001, Math.min(0.999, d.prediction))));
            const y = d.actual ? 1 : 0;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 1;
        const intercept = (sumY - slope * sumX) / n;

        return { slope: Math.max(0.1, Math.min(3, slope)), intercept };
    }

    // =============================================
    // Reliability Diagram
    // =============================================

    private createBins(
        data: { prediction: number; actual: boolean }[],
        nBins: number
    ): ReliabilityPoint[] {
        const binWidth = 1 / nBins;
        const bins: ReliabilityPoint[] = [];

        for (let i = 0; i < nBins; i++) {
            const lowerBound = i * binWidth;
            const upperBound = (i + 1) * binWidth;
            const midpoint = (lowerBound + upperBound) / 2;

            const binData = data.filter(d =>
                d.prediction >= lowerBound && d.prediction < upperBound
            );

            const count = binData.length;
            const predicted_avg = count > 0
                ? binData.reduce((s, d) => s + d.prediction, 0) / count
                : midpoint;
            const actual_rate = count > 0
                ? binData.filter(d => d.actual).length / count
                : 0;

            bins.push({
                bin_midpoint: midpoint,
                predicted_avg,
                actual_rate,
                count,
                error: actual_rate - predicted_avg
            });
        }

        return bins;
    }

    private computeReliabilityDiagram(
        data: { prediction: number; actual: boolean }[],
        nBins: number
    ): ReliabilityPoint[] {
        return this.createBins(data, nBins);
    }

    // =============================================
    // Failure Period Identification
    // =============================================

    private identifyFailurePeriods(
        data: { prediction: number; actual: boolean; date: Date }[]
    ): FailurePeriod[] {
        // Sort by date
        const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());

        // Rolling window analysis
        const windowSize = Math.max(10, Math.floor(sorted.length / 10));
        const failures: FailurePeriod[] = [];

        for (let i = 0; i <= sorted.length - windowSize; i++) {
            const window = sorted.slice(i, i + windowSize);

            // Compute error in window
            const errors = window.map(d =>
                Math.pow(d.prediction - (d.actual ? 1 : 0), 2)
            );
            const avgError = this.mean(errors);

            // If error is significantly high
            if (avgError > 0.3) {
                failures.push({
                    start: window[0].date,
                    end: window[window.length - 1].date,
                    n_predictions: windowSize,
                    avg_error: avgError,
                    description: `Wysoki błąd predykcji (MSE: ${avgError.toFixed(3)})`
                });
                i += windowSize - 1; // Skip to avoid overlap
            }
        }

        return failures;
    }

    // =============================================
    // Helpers
    // =============================================

    private chi2CDF(x: number, df: number): number {
        // Simplified chi-square CDF approximation
        if (x <= 0) return 0;
        return 1 - Math.exp(-x / 2) * Math.pow(x / 2, df / 2 - 1) / this.gamma(df / 2);
    }

    private gamma(n: number): number {
        // Stirling approximation for gamma function
        if (n <= 0) return 1;
        return Math.sqrt(2 * Math.PI / n) * Math.pow(n / Math.E, n);
    }
}

export const backtesterAgent = new BacktesterAgent();
