// =============================================
// Agent 18: Recommendation Engine
// Generates actionable recommendations based on analysis
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    RecommendationItem
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface RecommendationEngineInput {
    risk_level: RiskLevel;
    risk_metrics?: RiskMetricsInput;
    event_probabilities?: EventProbabilityInput[];
    model_suggestions?: ModelSuggestion[];
    user_profile?: UserProfile;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskMetricsInput {
    var_99: number;
    var_99_threshold: number;
    max_drawdown: number;
    volatility: number;
}

export interface EventProbabilityInput {
    event_name: string;
    probability: number;
    impact: 'low' | 'medium' | 'high';
}

export interface ModelSuggestion {
    current_model: string;
    suggested_model: string;
    improvement_expected: number;
    reason: string;
}

export interface UserProfile {
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
    investment_horizon: 'short' | 'medium' | 'long';
    regulatory_constraints?: string[];
}

export interface RecommendationEngineOutput {
    recommendations: RecommendationItem[];
    priority_actions: string[];
    risk_mitigation_plan: RiskMitigationStep[];
    summary: string;
}

export interface RiskMitigationStep {
    step: number;
    action: string;
    timeline: string;
    expected_impact: string;
    dependencies?: string[];
}

// =============================================
// Agent Implementation
// =============================================

export class RecommendationEngineAgent extends BaseAgent<RecommendationEngineInput, RecommendationEngineOutput> {
    readonly id: AgentId = 'agent-recommendation-engine';
    readonly name = 'Recommendation Engine';
    readonly category: AgentCategory = 'reports';
    readonly description = 'Generuje rekomendacje działań na podstawie analizy';
    readonly triggers: TriggerType[] = ['data_event', 'user_action', 'threshold_alert'];

    protected async run(
        input: RecommendationEngineInput,
        context: AgentContext
    ): Promise<RecommendationEngineOutput> {
        const { risk_level } = input;

        context.log(`[${this.id}] Generating recommendations for risk level: ${risk_level}`);

        // Generate recommendations based on different inputs
        const recommendations: RecommendationItem[] = [];

        // Risk-based recommendations
        const riskRecs = this.generateRiskRecommendations(risk_level, input.risk_metrics);
        recommendations.push(...riskRecs);

        // Event-based recommendations
        if (input.event_probabilities?.length) {
            const eventRecs = this.generateEventRecommendations(input.event_probabilities);
            recommendations.push(...eventRecs);
        }

        // Model improvement recommendations
        if (input.model_suggestions?.length) {
            const modelRecs = this.generateModelRecommendations(input.model_suggestions);
            recommendations.push(...modelRecs);
        }

        // Personalize based on user profile
        const personalizedRecs = this.personalizeRecommendations(recommendations, input.user_profile);

        // Priority actions
        const priority_actions = this.extractPriorityActions(personalizedRecs);

        // Risk mitigation plan
        const risk_mitigation_plan = this.buildMitigationPlan(risk_level, personalizedRecs);

        // Generate summary with Gemini
        let summary = `Poziom ryzyka: ${risk_level}. Wygenerowano ${personalizedRecs.length} rekomendacji.`;

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    this.buildSummaryPrompt(risk_level, personalizedRecs, risk_mitigation_plan),
                    context
                );
                summary = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            recommendations: personalizedRecs,
            priority_actions,
            risk_mitigation_plan,
            summary
        };
    }

    // =============================================
    // Risk-Based Recommendations
    // =============================================

    private generateRiskRecommendations(
        level: RiskLevel,
        metrics?: RiskMetricsInput
    ): RecommendationItem[] {
        const recs: RecommendationItem[] = [];

        // General risk level recommendations
        switch (level) {
            case 'critical':
                recs.push({
                    id: crypto.randomUUID(),
                    action: 'Natychmiastowy przegląd pozycji',
                    rationale: 'Poziom ryzyka krytyczny wymaga natychmiastowej reakcji',
                    priority: 'urgent',
                    estimated_impact: 'Redukcja ekspozycji o 20-30%'
                });
                recs.push({
                    id: crypto.randomUUID(),
                    action: 'Zwiększenie rezerw kapitałowych',
                    rationale: 'Zabezpieczenie przed potencjalnymi stratami',
                    priority: 'high',
                    estimated_impact: 'Poprawa wskaźnika wypłacalności'
                });
                break;

            case 'high':
                recs.push({
                    id: crypto.randomUUID(),
                    action: 'Wdrożenie hedgingu ryzyka rynkowego',
                    rationale: 'Ograniczenie ekspozycji na zmienność',
                    priority: 'high',
                    estimated_impact: 'Redukcja VaR o 15-20%'
                });
                break;

            case 'medium':
                recs.push({
                    id: crypto.randomUUID(),
                    action: 'Przegląd limitów ryzyka',
                    rationale: 'Dostosowanie limitów do aktualnej sytuacji',
                    priority: 'medium',
                    estimated_impact: 'Lepsza kontrola ekspozycji'
                });
                break;

            case 'low':
                recs.push({
                    id: crypto.randomUUID(),
                    action: 'Rozważenie zwiększenia ekspozycji',
                    rationale: 'Niski poziom ryzyka pozwala na większą alokację',
                    priority: 'low',
                    estimated_impact: 'Potencjalny wzrost zwrotu'
                });
                break;
        }

        // VaR-specific recommendations
        if (metrics?.var_99 && metrics.var_99 > metrics.var_99_threshold) {
            const excess = ((metrics.var_99 - metrics.var_99_threshold) / metrics.var_99_threshold * 100).toFixed(0);
            recs.push({
                id: crypto.randomUUID(),
                action: 'Redukcja pozycji przekraczających limit VaR',
                rationale: `VaR przekracza limit o ${excess}%`,
                priority: 'high',
                estimated_impact: 'Powrót do zgodności z polityką ryzyka'
            });
        }

        // Drawdown recommendations
        if (metrics?.max_drawdown && metrics.max_drawdown > 0.15) {
            recs.push({
                id: crypto.randomUUID(),
                action: 'Implementacja stop-loss na poziomie portfela',
                rationale: `Max drawdown (${(metrics.max_drawdown * 100).toFixed(1)}%) przekracza akceptowalny poziom`,
                priority: 'medium',
                estimated_impact: 'Ograniczenie maksymalnej straty'
            });
        }

        return recs;
    }

    // =============================================
    // Event-Based Recommendations
    // =============================================

    private generateEventRecommendations(events: EventProbabilityInput[]): RecommendationItem[] {
        const recs: RecommendationItem[] = [];

        // Sort by probability * impact
        const impactOrder = { low: 1, medium: 2, high: 3 };
        events.sort((a, b) =>
            b.probability * impactOrder[b.impact] - a.probability * impactOrder[a.impact]
        );

        // High probability, high impact events
        const critical = events.filter(e => e.probability > 0.3 && e.impact === 'high');
        for (const event of critical.slice(0, 2)) {
            recs.push({
                id: crypto.randomUUID(),
                action: `Przygotuj plan awaryjny: ${event.event_name}`,
                rationale: `P=${(event.probability * 100).toFixed(0)}% z wysokim wpływem`,
                priority: 'urgent',
                estimated_impact: 'Gotowość na scenariusz stresowy'
            });
        }

        // Rising probability events
        for (const event of events.filter(e => e.probability > 0.2 && e.impact !== 'low')) {
            recs.push({
                id: crypto.randomUUID(),
                action: `Monitoruj: ${event.event_name}`,
                rationale: `Wzrastające prawdopodobieństwo (${(event.probability * 100).toFixed(0)}%)`,
                priority: 'medium',
                estimated_impact: 'Wczesne wykrycie zmian'
            });
        }

        return recs;
    }

    // =============================================
    // Model-Based Recommendations
    // =============================================

    private generateModelRecommendations(suggestions: ModelSuggestion[]): RecommendationItem[] {
        return suggestions
            .filter(s => s.improvement_expected > 0.05)
            .map(s => ({
                id: crypto.randomUUID(),
                action: `Zmień model: ${s.current_model} → ${s.suggested_model}`,
                rationale: s.reason,
                priority: s.improvement_expected > 0.15 ? 'high' as const : 'medium' as const,
                estimated_impact: `Poprawa dokładności o ${(s.improvement_expected * 100).toFixed(0)}%`
            }));
    }

    // =============================================
    // Personalization
    // =============================================

    private personalizeRecommendations(
        recs: RecommendationItem[],
        profile?: UserProfile
    ): RecommendationItem[] {
        if (!profile) return recs;

        // Filter based on risk tolerance
        let filtered = recs;

        if (profile.risk_tolerance === 'conservative') {
            // Prioritize risk reduction
            filtered = recs.filter(r =>
                !r.action.toLowerCase().includes('zwiększ') &&
                !r.action.toLowerCase().includes('ekspozycj')
            );
        } else if (profile.risk_tolerance === 'aggressive') {
            // Include growth opportunities
            filtered = recs;
        }

        // Add regulatory recommendations if constraints exist
        if (profile.regulatory_constraints?.length) {
            for (const constraint of profile.regulatory_constraints) {
                filtered.push({
                    id: crypto.randomUUID(),
                    action: `Weryfikuj zgodność: ${constraint}`,
                    rationale: 'Wymóg regulacyjny',
                    priority: 'high',
                    estimated_impact: 'Uniknięcie sankcji regulacyjnych'
                });
            }
        }

        return filtered;
    }

    // =============================================
    // Priority Actions & Mitigation Plan
    // =============================================

    private extractPriorityActions(recs: RecommendationItem[]): string[] {
        return recs
            .filter(r => r.priority === 'urgent' || r.priority === 'high')
            .slice(0, 5)
            .map(r => r.action);
    }

    private buildMitigationPlan(
        level: RiskLevel,
        recs: RecommendationItem[]
    ): RiskMitigationStep[] {
        const steps: RiskMitigationStep[] = [];
        const urgent = recs.filter(r => r.priority === 'urgent');
        const high = recs.filter(r => r.priority === 'high');
        const medium = recs.filter(r => r.priority === 'medium');

        let stepNum = 1;

        // Urgent actions - immediate
        for (const rec of urgent.slice(0, 3)) {
            steps.push({
                step: stepNum++,
                action: rec.action,
                timeline: 'Natychmiast (0-24h)',
                expected_impact: rec.estimated_impact || 'Redukcja ryzyka'
            });
        }

        // High priority - this week
        for (const rec of high.slice(0, 3)) {
            steps.push({
                step: stepNum++,
                action: rec.action,
                timeline: 'Ten tydzień (1-7 dni)',
                expected_impact: rec.estimated_impact || 'Poprawa pozycji ryzyka',
                dependencies: urgent.length > 0 ? ['Zakończenie działań pilnych'] : undefined
            });
        }

        // Medium priority - this month
        for (const rec of medium.slice(0, 2)) {
            steps.push({
                step: stepNum++,
                action: rec.action,
                timeline: 'Ten miesiąc (1-4 tygodnie)',
                expected_impact: rec.estimated_impact || 'Długoterminowa poprawa',
                dependencies: high.length > 0 ? ['Zakończenie działań wysokiego priorytetu'] : undefined
            });
        }

        return steps;
    }

    // =============================================
    // Gemini Integration
    // =============================================

    private buildSummaryPrompt(
        level: RiskLevel,
        recs: RecommendationItem[],
        plan: RiskMitigationStep[]
    ): string {
        const urgentCount = recs.filter(r => r.priority === 'urgent').length;
        const highCount = recs.filter(r => r.priority === 'high').length;

        return `Podsumuj plan działań w 3-4 zdaniach:

Poziom ryzyka: ${level}
Rekomendacje: ${recs.length} (${urgentCount} pilnych, ${highCount} wysokiego priorytetu)

Główne działania:
${plan.slice(0, 4).map(s => `${s.step}. ${s.action} (${s.timeline})`).join('\n')}

Napisz profesjonalne podsumowanie dla zarządu, skupiając się na:
- Najważniejszych działaniach
- Oczekiwanych efektach
- Harmonogramie`;
    }
}

export const recommendationEngineAgent = new RecommendationEngineAgent();
