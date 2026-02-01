// =============================================
// Agent 3: Anomaly Detector
// Real-time anomaly detection in data streams
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    AnomalyResult
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface AnomalyDetectorInput {
    current_value: number;
    variable_name: string;
    history: number[];
    detection_method?: DetectionMethod;
    sensitivity?: number;
}

export type DetectionMethod = 'z_score' | 'iqr' | 'mad' | 'rolling_std' | 'ensemble';

export interface AnomalyDetectorOutput {
    is_anomaly: boolean;
    anomaly_details?: AnomalyResult;
    detection_scores: DetectionScore[];
    explanation?: string;
    historical_context: HistoricalContext;
}

export interface DetectionScore {
    method: DetectionMethod;
    score: number;
    threshold: number;
    is_anomaly: boolean;
}

export interface HistoricalContext {
    mean: number;
    std: number;
    min: number;
    max: number;
    percentile_5: number;
    percentile_95: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

// =============================================
// Agent Implementation
// =============================================

export class AnomalyDetectorAgent extends BaseAgent<AnomalyDetectorInput, AnomalyDetectorOutput> {
    readonly id: AgentId = 'agent-anomaly-detector';
    readonly name = 'Anomaly Detector';
    readonly category: AgentCategory = 'data';
    readonly description = 'Wykrywa anomalie w danych w czasie rzeczywistym';
    readonly triggers: TriggerType[] = ['realtime', 'data_event'];

    protected async run(
        input: AnomalyDetectorInput,
        context: AgentContext
    ): Promise<AnomalyDetectorOutput> {
        const { current_value, variable_name, history } = input;
        const method = input.detection_method || 'ensemble';
        const sensitivity = input.sensitivity || 1.0;

        context.log(`[${this.id}] Analyzing ${variable_name} = ${current_value}`);

        const historicalContext = this.computeHistoricalContext(history);
        const detectionScores: DetectionScore[] = [];

        if (method === 'ensemble' || method === 'z_score') {
            detectionScores.push(this.detectZScore(current_value, history, sensitivity));
        }
        if (method === 'ensemble' || method === 'iqr') {
            detectionScores.push(this.detectIQR(current_value, history, sensitivity));
        }
        if (method === 'ensemble' || method === 'mad') {
            detectionScores.push(this.detectMAD(current_value, history, sensitivity));
        }

        const anomalyVotes = detectionScores.filter(s => s.is_anomaly).length;
        const is_anomaly = method === 'ensemble'
            ? anomalyVotes >= Math.ceil(detectionScores.length / 2)
            : detectionScores[0]?.is_anomaly ?? false;

        let anomaly_details: AnomalyResult | undefined;

        if (is_anomaly) {
            const deviation = (current_value - historicalContext.mean) / historicalContext.std;
            anomaly_details = {
                index: history.length,
                value: current_value,
                expected: historicalContext.mean,
                deviation: Math.abs(deviation),
                type: deviation > 0 ? 'spike' : 'dip',
                severity: this.getSeverity(Math.abs(deviation))
            };
        }

        return {
            is_anomaly,
            anomaly_details,
            detection_scores: detectionScores,
            historical_context: historicalContext
        };
    }

    private detectZScore(value: number, history: number[], sensitivity: number): DetectionScore {
        const mean = this.mean(history);
        const std = this.std(history);
        const score = std > 0 ? Math.abs((value - mean) / std) : 0;
        const threshold = 3 / sensitivity;
        return { method: 'z_score', score, threshold, is_anomaly: score > threshold };
    }

    private detectIQR(value: number, history: number[], sensitivity: number): DetectionScore {
        const sorted = [...history].sort((a, b) => a - b);
        const q1 = this.percentile(sorted, 25);
        const q3 = this.percentile(sorted, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr / sensitivity;
        const upperBound = q3 + 1.5 * iqr / sensitivity;
        const score = value < lowerBound || value > upperBound ? 1 : 0;
        return { method: 'iqr', score, threshold: 0, is_anomaly: score > 0 };
    }

    private detectMAD(value: number, history: number[], sensitivity: number): DetectionScore {
        const median = this.percentile(history, 50);
        const deviations = history.map(x => Math.abs(x - median));
        const mad = this.percentile(deviations, 50);
        const score = mad > 0 ? Math.abs(0.6745 * (value - median) / mad) : 0;
        const threshold = 3.5 / sensitivity;
        return { method: 'mad', score, threshold, is_anomaly: score > threshold };
    }

    private getSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
        if (score > 5) return 'critical';
        if (score > 4) return 'high';
        if (score > 3) return 'medium';
        return 'low';
    }

    private computeHistoricalContext(history: number[]): HistoricalContext {
        const sorted = [...history].sort((a, b) => a - b);
        const mean = this.mean(history);
        const firstHalf = this.mean(history.slice(0, Math.floor(history.length / 2)));
        const secondHalf = this.mean(history.slice(-Math.floor(history.length / 2)));
        const trendDiff = (secondHalf - firstHalf) / (Math.abs(firstHalf) + 0.0001);

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (trendDiff > 0.05) trend = 'increasing';
        else if (trendDiff < -0.05) trend = 'decreasing';

        return {
            mean,
            std: this.std(history),
            min: Math.min(...history),
            max: Math.max(...history),
            percentile_5: this.percentile(sorted, 5),
            percentile_95: this.percentile(sorted, 95),
            trend
        };
    }
}

export const anomalyDetectorAgent = new AnomalyDetectorAgent();
