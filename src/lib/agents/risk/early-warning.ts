// @ts-nocheck
// =============================================
// Agent 15: Early Warning System
// Daily risk monitoring and alerting
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    RiskMetrics,
    Alert,
    MorningBriefing,
    InsightItem,
    RecommendationItem
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface EarlyWarningInput {
    risk_metrics?: RiskMetrics;
    correlation_changes?: CorrelationChange[];
    anomalies?: AnomalyAlert[];
    events?: EventProbability[];
    threshold_config?: ThresholdConfig;
}

export interface CorrelationChange {
    variable_pair: [string, string];
    old_correlation: number;
    new_correlation: number;
    change_pct: number;
    window_days: number;
}

export interface AnomalyAlert {
    variable: string;
    value: number;
    expected: number;
    z_score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface EventProbability {
    event_name: string;
    probability: number;
    ci_lower: number;
    ci_upper: number;
    change_from_last: number;
}

export interface ThresholdConfig {
    var_99_max: number;
    correlation_change_max: number;
    anomaly_z_score_max: number;
    event_probability_max: number;
}

export interface EarlyWarningOutput {
    risk_score: number; // 0-100
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    alerts: Alert[];
    briefing: MorningBriefing;
}

// =============================================
// Agent Implementation
// =============================================

export class EarlyWarningAgent extends BaseAgent<EarlyWarningInput, EarlyWarningOutput> {
    readonly id: AgentId = 'agent-early-warning';
    readonly name = 'Early Warning System';
    readonly category: AgentCategory = 'risk';
    readonly description = 'System wczesnego ostrzegania o zagrożeniach';
    readonly triggers: TriggerType[] = ['cron', 'threshold_alert', 'realtime'];

    private defaultThresholds: ThresholdConfig = {
        var_99_max: 0.15,          // VaR(99%) > 15% is alarming
        correlation_change_max: 0.3, // >30% correlation change
        anomaly_z_score_max: 3,     // Z-score > 3
        event_probability_max: 0.3   // Event probability > 30%
    };

    // =============================================
    // Main Execution
    // =============================================

    protected async run(
        input: EarlyWarningInput,
        context: AgentContext
    ): Promise<EarlyWarningOutput> {
        const thresholds = input.threshold_config || this.defaultThresholds;
        const alerts: Alert[] = [];

        context.log(`[${this.id}] Running early warning scan...`);

        // 1. Check risk metrics
        if (input.risk_metrics) {
            const riskAlerts = this.checkRiskMetrics(input.risk_metrics, thresholds);
            alerts.push(...riskAlerts);
        }

        // 2. Check correlation changes
        if (input.correlation_changes) {
            const corrAlerts = this.checkCorrelationChanges(input.correlation_changes, thresholds);
            alerts.push(...corrAlerts);
        }

        // 3. Check anomalies
        if (input.anomalies) {
            const anomalyAlerts = this.checkAnomalies(input.anomalies, thresholds);
            alerts.push(...anomalyAlerts);
        }

        // 4. Check event probabilities
        if (input.events) {
            const eventAlerts = this.checkEventProbabilities(input.events, thresholds);
            alerts.push(...eventAlerts);
        }

        // 5. Compute composite risk score
        const risk_score = this.computeCompositeRiskScore(alerts, input);
        const risk_level = this.getRiskLevel(risk_score);

        context.log(`[${this.id}] Risk score: ${risk_score}, Level: ${risk_level}, Alerts: ${alerts.length}`);

        // 6. Generate morning briefing
        const briefing = await this.generateBriefing(
            risk_score,
            risk_level,
            alerts,
            input,
            context
        );

        return {
            risk_score,
            risk_level,
            alerts: this.prioritizeAlerts(alerts),
            briefing
        };
    }

    // =============================================
    // Risk Metric Checks
    // =============================================

    private checkRiskMetrics(metrics: RiskMetrics, thresholds: ThresholdConfig): Alert[] {
        const alerts: Alert[] = [];

        if (metrics.var_99 > thresholds.var_99_max) {
            alerts.push({
                id: crypto.randomUUID(),
                agent_id: this.id,
                severity: metrics.var_99 > thresholds.var_99_max * 1.5 ? 'critical' : 'warning',
                title: 'Wysoki VaR(99%)',
                message: `VaR(99%) = ${(metrics.var_99 * 100).toFixed(1)}% przekracza próg ${(thresholds.var_99_max * 100).toFixed(1)}%`,
                data: { var_99: metrics.var_99, threshold: thresholds.var_99_max },
                created_at: new Date(),
                acknowledged: false
            });
        }

        if (metrics.max_drawdown > 0.2) {
            alerts.push({
                id: crypto.randomUUID(),
                agent_id: this.id,
                severity: metrics.max_drawdown > 0.3 ? 'critical' : 'warning',
                title: 'Znaczący Max Drawdown',
                message: `Max Drawdown = ${(metrics.max_drawdown * 100).toFixed(1)}%`,
                data: { max_drawdown: metrics.max_drawdown },
                created_at: new Date(),
                acknowledged: false
            });
        }

        return alerts;
    }

    // =============================================
    // Correlation Change Checks
    // =============================================

    private checkCorrelationChanges(
        changes: CorrelationChange[],
        thresholds: ThresholdConfig
    ): Alert[] {
        const alerts: Alert[] = [];

        for (const change of changes) {
            if (Math.abs(change.change_pct) > thresholds.correlation_change_max) {
                const direction = change.change_pct > 0 ? 'wzrosła' : 'spadła';
                alerts.push({
                    id: crypto.randomUUID(),
                    agent_id: this.id,
                    severity: Math.abs(change.change_pct) > 0.5 ? 'critical' : 'warning',
                    title: 'Zmiana korelacji',
                    message: `Korelacja ${change.variable_pair[0]}/${change.variable_pair[1]} ${direction} o ${(Math.abs(change.change_pct) * 100).toFixed(0)}% w ciągu ${change.window_days} dni`,
                    data: change,
                    created_at: new Date(),
                    acknowledged: false
                });
            }
        }

        return alerts;
    }

    // =============================================
    // Anomaly Checks
    // =============================================

    private checkAnomalies(
        anomalies: AnomalyAlert[],
        thresholds: ThresholdConfig
    ): Alert[] {
        const alerts: Alert[] = [];

        for (const anomaly of anomalies) {
            if (Math.abs(anomaly.z_score) > thresholds.anomaly_z_score_max) {
                alerts.push({
                    id: crypto.randomUUID(),
                    agent_id: this.id,
                    severity: anomaly.severity,
                    title: `Anomalia: ${anomaly.variable}`,
                    message: `${anomaly.variable} = ${anomaly.value.toFixed(4)} (oczekiwane: ${anomaly.expected.toFixed(4)}, z-score: ${anomaly.z_score.toFixed(2)})`,
                    data: anomaly,
                    created_at: new Date(),
                    acknowledged: false
                });
            }
        }

        return alerts;
    }

    // =============================================
    // Event Probability Checks
    // =============================================

    private checkEventProbabilities(
        events: EventProbability[],
        thresholds: ThresholdConfig
    ): Alert[] {
        const alerts: Alert[] = [];

        for (const event of events) {
            if (event.probability > thresholds.event_probability_max) {
                alerts.push({
                    id: crypto.randomUUID(),
                    agent_id: this.id,
                    severity: event.probability > 0.5 ? 'critical' : 'warning',
                    title: `Wysokie prawdopodobieństwo: ${event.event_name}`,
                    message: `P(${event.event_name}) = ${(event.probability * 100).toFixed(1)}% [${(event.ci_lower * 100).toFixed(1)}% — ${(event.ci_upper * 100).toFixed(1)}%]`,
                    data: event,
                    created_at: new Date(),
                    acknowledged: false
                });
            }

            // Also alert on significant increases
            if (event.change_from_last > 0.1) {
                alerts.push({
                    id: crypto.randomUUID(),
                    agent_id: this.id,
                    severity: 'info',
                    title: `Wzrost prawdopodobieństwa: ${event.event_name}`,
                    message: `P(${event.event_name}) wzrosło o ${(event.change_from_last * 100).toFixed(1)}pp`,
                    data: event,
                    created_at: new Date(),
                    acknowledged: false
                });
            }
        }

        return alerts;
    }

    // =============================================
    // Composite Risk Score
    // =============================================

    private computeCompositeRiskScore(alerts: Alert[], input: EarlyWarningInput): number {
        // Base score from alert severity
        let score = 0;

        for (const alert of alerts) {
            switch (alert.severity) {
                case 'critical': score += 25; break;
                case 'warning': score += 15; break;
                case 'info': score += 5; break;
            }
        }

        // Add VaR contribution
        if (input.risk_metrics) {
            score += input.risk_metrics.var_99 * 100;
        }

        // Add event probability contribution
        if (input.events) {
            const maxProb = Math.max(...input.events.map(e => e.probability), 0);
            score += maxProb * 50;
        }

        return Math.min(100, Math.round(score));
    }

    private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    }

    // =============================================
    // Alert Prioritization
    // =============================================

    private prioritizeAlerts(alerts: Alert[]): Alert[] {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return [...alerts].sort((a, b) =>
            severityOrder[a.severity] - severityOrder[b.severity]
        );
    }

    // =============================================
    // Morning Briefing Generation
    // =============================================

    private async generateBriefing(
        risk_score: number,
        risk_level: string,
        alerts: Alert[],
        input: EarlyWarningInput,
        context: AgentContext
    ): Promise<MorningBriefing> {
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        const warningAlerts = alerts.filter(a => a.severity === 'warning');

        // Generate insights
        const insights: InsightItem[] = [];

        if (input.correlation_changes?.length) {
            const maxChange = input.correlation_changes.reduce((max, c) =>
                Math.abs(c.change_pct) > Math.abs(max.change_pct) ? c : max
                , input.correlation_changes[0]);

            insights.push({
                id: crypto.randomUUID(),
                title: 'Zmiana struktury korelacji',
                description: `Największa zmiana korelacji: ${maxChange.variable_pair.join('/')} (${(maxChange.change_pct * 100).toFixed(0)}%)`,
                importance: Math.min(10, Math.round(Math.abs(maxChange.change_pct) * 20)),
                category: 'correlation'
            });
        }

        // Generate recommendations
        const recommendations: RecommendationItem[] = [];

        if (risk_level === 'critical' || risk_level === 'high') {
            recommendations.push({
                id: crypto.randomUUID(),
                action: 'Zwiększ monitoring pozycji',
                rationale: `Poziom ryzyka: ${risk_level}. Wymagana częstsza weryfikacja.`,
                priority: 'urgent',
                estimated_impact: 'Wczesne wykrycie problemów'
            });
        }

        if (criticalAlerts.length > 0) {
            recommendations.push({
                id: crypto.randomUUID(),
                action: 'Przegląd scenariuszy stresowych',
                rationale: `${criticalAlerts.length} alertów krytycznych wymaga uwagi`,
                priority: 'high',
                estimated_impact: 'Identyfikacja działań hedgingowych'
            });
        }

        // Generate summary with Gemini
        let summary = `Poziom ryzyka: ${risk_score}/100 (${risk_level}). Alertów: ${alerts.length}.`;

        if (context.gemini) {
            try {
                const alertSummary = alerts.slice(0, 5).map(a => `- ${a.title}: ${a.message}`).join('\n');

                const { text } = await this.callGemini(
                    `Przygotuj poranny briefing ryzyka (max 100 słów) na podstawie:
                    
                    Poziom ryzyka: ${risk_score}/100 (${risk_level})
                    Alerty krytyczne: ${criticalAlerts.length}
                    Alerty ostrzegawcze: ${warningAlerts.length}
                    
                    Główne alerty:
                    ${alertSummary}
                    
                    Napisz profesjonalnie, konkretnie, z rekomendacjami działań.`,
                    context
                );
                summary = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini briefing failed: ${e}`, 'warn');
            }
        }

        return {
            date: new Date(),
            overall_risk_score: risk_score,
            key_alerts: criticalAlerts.slice(0, 5),
            insights,
            recommendations,
            summary
        };
    }
}

// =============================================
// Export singleton instance
// =============================================

export const earlyWarningAgent = new EarlyWarningAgent();
