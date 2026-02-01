// @ts-nocheck
// =============================================
// Agent 17: Insight Generator
// Generates actionable insights from analysis results
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    InsightItem
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface InsightGeneratorInput {
    analysis_type: AnalysisType;
    data: AnalysisData;
    context?: InsightContext;
}

export type AnalysisType =
    | 'simulation'
    | 'backtest'
    | 'risk_assessment'
    | 'correlation_change'
    | 'model_selection'
    | 'stress_test';

export interface AnalysisData {
    main_result?: number;
    confidence_interval?: [number, number];
    comparison_baseline?: number;
    key_drivers?: { name: string; impact: number }[];
    trends?: { metric: string; direction: 'up' | 'down' | 'stable'; magnitude: number }[];
    anomalies?: { description: string; severity: string }[];
}

export interface InsightContext {
    historical_average?: number;
    industry_benchmark?: number;
    regulatory_threshold?: number;
    user_risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface InsightGeneratorOutput {
    insights: InsightItem[];
    headline: string;
    key_takeaways: string[];
    confidence_level: 'low' | 'medium' | 'high';
}

// =============================================
// Agent Implementation
// =============================================

export class InsightGeneratorAgent extends BaseAgent<InsightGeneratorInput, InsightGeneratorOutput> {
    readonly id: AgentId = 'agent-insight-generator';
    readonly name = 'Insight Generator';
    readonly category: AgentCategory = 'reports';
    readonly description = 'Generuje actionable insights z wyników analizy';
    readonly triggers: TriggerType[] = ['data_event', 'user_action'];

    protected async run(
        input: InsightGeneratorInput,
        context: AgentContext
    ): Promise<InsightGeneratorOutput> {
        const { analysis_type, data } = input;
        const analysisContext = input.context || {};

        context.log(`[${this.id}] Generating insights for ${analysis_type}`);

        // Generate rule-based insights
        const ruleBasedInsights = this.generateRuleBasedInsights(analysis_type, data, analysisContext);

        // Enhance with Gemini
        let geminiInsights: InsightItem[] = [];
        let headline = this.generateDefaultHeadline(analysis_type, data);
        let key_takeaways: string[] = [];

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(
                    this.buildInsightPrompt(analysis_type, data, analysisContext),
                    context
                );

                const parsed = this.parseGeminiResponse(text);
                geminiInsights = parsed.insights;
                headline = parsed.headline || headline;
                key_takeaways = parsed.takeaways;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed, using rule-based insights: ${e}`, 'warn');
            }
        }

        // Combine and deduplicate insights
        const allInsights = this.combineInsights(ruleBasedInsights, geminiInsights);

        // Determine confidence level
        const confidence_level = this.determineConfidence(data, allInsights);

        return {
            insights: allInsights,
            headline,
            key_takeaways: key_takeaways.length > 0 ? key_takeaways : this.generateDefaultTakeaways(allInsights),
            confidence_level
        };
    }

    // =============================================
    // Rule-Based Insights
    // =============================================

    private generateRuleBasedInsights(
        type: AnalysisType,
        data: AnalysisData,
        ctx: InsightContext
    ): InsightItem[] {
        const insights: InsightItem[] = [];

        // Main result insights
        if (data.main_result !== undefined) {
            // Compare to baseline
            if (data.comparison_baseline !== undefined) {
                const change = (data.main_result - data.comparison_baseline) / data.comparison_baseline;
                if (Math.abs(change) > 0.1) {
                    insights.push({
                        id: crypto.randomUUID(),
                        title: change > 0 ? 'Wzrost względem baseline' : 'Spadek względem baseline',
                        description: `Wynik ${change > 0 ? 'wyższy' : 'niższy'} o ${(Math.abs(change) * 100).toFixed(1)}% od wartości bazowej`,
                        importance: Math.min(10, Math.round(Math.abs(change) * 20)),
                        category: 'comparison'
                    });
                }
            }

            // Compare to historical average
            if (ctx.historical_average !== undefined) {
                const deviation = (data.main_result - ctx.historical_average) / ctx.historical_average;
                if (Math.abs(deviation) > 0.2) {
                    insights.push({
                        id: crypto.randomUUID(),
                        title: 'Odchylenie od średniej historycznej',
                        description: `Wynik odbiega o ${(deviation * 100).toFixed(1)}% od średniej historycznej`,
                        importance: 7,
                        category: 'historical'
                    });
                }
            }

            // Regulatory threshold
            if (ctx.regulatory_threshold !== undefined && data.main_result > ctx.regulatory_threshold) {
                insights.push({
                    id: crypto.randomUUID(),
                    title: '⚠️ Przekroczenie progu regulacyjnego',
                    description: `Wynik (${(data.main_result * 100).toFixed(1)}%) przekracza próg regulacyjny (${(ctx.regulatory_threshold * 100).toFixed(1)}%)`,
                    importance: 10,
                    category: 'regulatory'
                });
            }
        }

        // Key drivers insights
        if (data.key_drivers?.length) {
            const topDriver = data.key_drivers.reduce((max, d) =>
                Math.abs(d.impact) > Math.abs(max.impact) ? d : max
                , data.key_drivers[0]);

            insights.push({
                id: crypto.randomUUID(),
                title: `Główny driver: ${topDriver.name}`,
                description: `${topDriver.name} ma największy wpływ (${(topDriver.impact * 100).toFixed(0)}%)`,
                importance: 6,
                category: 'drivers'
            });
        }

        // Trend insights
        if (data.trends?.length) {
            for (const trend of data.trends) {
                if (trend.magnitude > 0.1) {
                    insights.push({
                        id: crypto.randomUUID(),
                        title: `Trend: ${trend.metric}`,
                        description: `${trend.metric} ${trend.direction === 'up' ? 'rośnie' : trend.direction === 'down' ? 'spada' : 'stabilny'} (${(trend.magnitude * 100).toFixed(0)}%)`,
                        importance: 5,
                        category: 'trend'
                    });
                }
            }
        }

        // Anomaly insights
        if (data.anomalies?.length) {
            for (const anomaly of data.anomalies) {
                insights.push({
                    id: crypto.randomUUID(),
                    title: `Anomalia wykryta`,
                    description: anomaly.description,
                    importance: anomaly.severity === 'critical' ? 9 : anomaly.severity === 'high' ? 7 : 4,
                    category: 'anomaly'
                });
            }
        }

        return insights;
    }

    // =============================================
    // Gemini Integration
    // =============================================

    private buildInsightPrompt(
        type: AnalysisType,
        data: AnalysisData,
        ctx: InsightContext
    ): string {
        return `Wygeneruj 3-5 kluczowych insights biznesowych na podstawie analizy.

Typ analizy: ${type}
Główny wynik: ${data.main_result ?? 'N/A'}
Przedział ufności: ${data.confidence_interval ? `[${data.confidence_interval.join(' — ')}]` : 'N/A'}
Baseline: ${data.comparison_baseline ?? 'N/A'}
Key drivers: ${data.key_drivers?.map(d => `${d.name} (${(d.impact * 100).toFixed(0)}%)`).join(', ') || 'N/A'}
Trendy: ${data.trends?.map(t => `${t.metric}: ${t.direction}`).join(', ') || 'N/A'}

Kontekst:
- Średnia historyczna: ${ctx.historical_average ?? 'N/A'}
- Benchmark branżowy: ${ctx.industry_benchmark ?? 'N/A'}
- Próg regulacyjny: ${ctx.regulatory_threshold ?? 'N/A'}
- Tolerancja ryzyka: ${ctx.user_risk_tolerance ?? 'medium'}

Format odpowiedzi:
HEADLINE: [chwytliwy nagłówek, max 10 słów]
INSIGHTS:
1. [Tytuł]: [Opis 1-2 zdania]
2. [Tytuł]: [Opis]
...
TAKEAWAYS:
- [Kluczowy wniosek 1]
- [Kluczowy wniosek 2]`;
    }

    private parseGeminiResponse(text: string): {
        insights: InsightItem[];
        headline: string | null;
        takeaways: string[];
    } {
        const insights: InsightItem[] = [];
        let headline: string | null = null;
        const takeaways: string[] = [];

        // Extract headline
        const headlineMatch = text.match(/HEADLINE:\s*(.+)/i);
        if (headlineMatch) {
            headline = headlineMatch[1].trim();
        }

        // Extract insights
        const insightMatches = text.matchAll(/\d+\.\s*(.+?):\s*(.+)/g);
        for (const match of insightMatches) {
            insights.push({
                id: crypto.randomUUID(),
                title: match[1].trim(),
                description: match[2].trim(),
                importance: 6,
                category: 'gemini'
            });
        }

        // Extract takeaways
        const takeawayMatches = text.matchAll(/[-•]\s*(.+)/g);
        for (const match of takeawayMatches) {
            const takeaway = match[1].trim();
            if (takeaway.length > 10 && !takeaway.includes(':')) {
                takeaways.push(takeaway);
            }
        }

        return { insights, headline, takeaways };
    }

    // =============================================
    // Helpers
    // =============================================

    private combineInsights(rule: InsightItem[], gemini: InsightItem[]): InsightItem[] {
        const combined = [...rule, ...gemini];
        combined.sort((a, b) => b.importance - a.importance);
        return combined.slice(0, 10);
    }

    private generateDefaultHeadline(type: AnalysisType, data: AnalysisData): string {
        switch (type) {
            case 'simulation':
                return data.main_result
                    ? `Prawdopodobieństwo: ${(data.main_result * 100).toFixed(1)}%`
                    : 'Wyniki symulacji gotowe';
            case 'risk_assessment':
                return 'Ocena ryzyka zakończona';
            case 'stress_test':
                return 'Testy warunków skrajnych zakończone';
            default:
                return 'Analiza zakończona';
        }
    }

    private generateDefaultTakeaways(insights: InsightItem[]): string[] {
        return insights
            .filter(i => i.importance >= 6)
            .slice(0, 3)
            .map(i => i.description);
    }

    private determineConfidence(data: AnalysisData, insights: InsightItem[]): 'low' | 'medium' | 'high' {
        let score = 5;

        if (data.confidence_interval) {
            const width = data.confidence_interval[1] - data.confidence_interval[0];
            if (width < 0.1) score += 2;
            else if (width > 0.3) score -= 2;
        }

        if (insights.length > 5) score += 1;
        if (data.key_drivers?.length) score += 1;

        if (score >= 7) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }
}

export const insightGeneratorAgent = new InsightGeneratorAgent();
