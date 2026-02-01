// @ts-nocheck
// =============================================
// Agent 16: NL Summarizer
// Generates natural language summaries using Gemini
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    RiskMetrics
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface NLSummarizerInput {
    type: SummaryType;
    data: SummaryData;
    audience?: AudienceType;
    language?: 'pl' | 'en';
    max_length?: number;
}

export type SummaryType =
    | 'simulation'
    | 'backtest'
    | 'risk_report'
    | 'event_analysis'
    | 'daily_briefing'
    | 'model_comparison';

export type AudienceType =
    | 'executive'    // Non-technical, high-level
    | 'technical'    // Detailed, includes methodology
    | 'client'       // Professional, actionable
    | 'audit';       // Formal, comprehensive

export interface SummaryData {
    // For simulation summaries
    simulation_results?: {
        event_name: string;
        probability: number;
        ci_lower: number;
        ci_upper: number;
        n_simulations: number;
        variables: { name: string; model: string }[];
    };

    // For backtest summaries
    backtest_results?: {
        hit_rate: number;
        brier_score: number;
        n_predictions: number;
        period: string;
    };

    // For risk reports
    risk_metrics?: RiskMetrics;

    // For event analysis
    event_details?: {
        event_name: string;
        description: string;
        probability_history: { date: string; probability: number }[];
        key_drivers: { variable: string; impact: number }[];
    };

    // For model comparison
    model_comparison?: {
        models: {
            name: string;
            aic: number;
            bic: number;
            pros: string[];
            cons: string[];
        }[];
    };
}

export interface NLSummarizerOutput {
    summary: string;
    key_points: string[];
    recommended_actions?: string[];
    metadata: {
        type: SummaryType;
        audience: AudienceType;
        word_count: number;
        language: 'pl' | 'en';
    };
}

// =============================================
// Agent Implementation
// =============================================

export class NLSummarizerAgent extends BaseAgent<NLSummarizerInput, NLSummarizerOutput> {
    readonly id: AgentId = 'agent-nl-summarizer';
    readonly name = 'NL Summarizer';
    readonly category: AgentCategory = 'reports';
    readonly description = 'Generuje streszczenia w języku naturalnym';
    readonly triggers: TriggerType[] = ['user_action', 'data_event'];

    // =============================================
    // Main Execution
    // =============================================

    protected async run(
        input: NLSummarizerInput,
        context: AgentContext
    ): Promise<NLSummarizerOutput> {
        const audience = input.audience || 'technical';
        const language = input.language || 'pl';
        const maxLength = input.max_length || 200;

        context.log(`[${this.id}] Generating ${input.type} summary for ${audience} audience`);

        // Build prompt based on summary type
        const prompt = this.buildPrompt(input.type, input.data, audience, language, maxLength);

        let summary: string;
        let keyPoints: string[] = [];
        let recommendedActions: string[] = [];

        if (context.gemini) {
            try {
                const { text } = await this.callGemini(prompt, context);

                // Parse structured response
                const parsed = this.parseGeminiResponse(text);
                summary = parsed.summary;
                keyPoints = parsed.keyPoints;
                recommendedActions = parsed.actions;

            } catch (e) {
                context.log(`[${this.id}] Gemini failed, using fallback: ${e}`, 'warn');
                summary = this.generateFallbackSummary(input.type, input.data, language);
            }
        } else {
            context.log(`[${this.id}] Gemini not available, using fallback`, 'warn');
            summary = this.generateFallbackSummary(input.type, input.data, language);
        }

        return {
            summary,
            key_points: keyPoints,
            recommended_actions: recommendedActions.length > 0 ? recommendedActions : undefined,
            metadata: {
                type: input.type,
                audience,
                word_count: summary.split(/\s+/).length,
                language
            }
        };
    }

    // =============================================
    // Prompt Building
    // =============================================

    private buildPrompt(
        type: SummaryType,
        data: SummaryData,
        audience: AudienceType,
        language: 'pl' | 'en',
        maxLength: number
    ): string {
        const audienceInstructions = this.getAudienceInstructions(audience);
        const languageNote = language === 'pl'
            ? 'Odpowiedz po polsku.'
            : 'Respond in English.';

        let dataSection = '';

        switch (type) {
            case 'simulation':
                dataSection = this.formatSimulationData(data);
                break;
            case 'backtest':
                dataSection = this.formatBacktestData(data);
                break;
            case 'risk_report':
                dataSection = this.formatRiskData(data);
                break;
            case 'event_analysis':
                dataSection = this.formatEventData(data);
                break;
            case 'model_comparison':
                dataSection = this.formatModelComparisonData(data);
                break;
            default:
                dataSection = JSON.stringify(data, null, 2);
        }

        return `${languageNote}

${audienceInstructions}

Dane do podsumowania:
${dataSection}

Wygeneruj odpowiedź w formacie:
SUMMARY: [główne streszczenie, max ${maxLength} słów]
KEY_POINTS:
- [punkt 1]
- [punkt 2]
- [punkt 3]
ACTIONS:
- [rekomendacja 1]
- [rekomendacja 2]`;
    }

    private getAudienceInstructions(audience: AudienceType): string {
        switch (audience) {
            case 'executive':
                return `Przygotuj EXECUTIVE SUMMARY dla zarządu:
- Używaj prostego języka, unikaj żargonu technicznego
- Skup się na biznesowych implikacjach
- Przedstaw konkretne liczby i trendy
- Podaj jasne rekomendacje działań`;

            case 'technical':
                return `Przygotuj TECHNICAL SUMMARY dla analityków:
- Możesz używać terminologii technicznej
- Uwzględnij metodologię i założenia
- Zwróć uwagę na ograniczenia modelu
- Opisz kluczowe metryki i ich interpretację`;

            case 'client':
                return `Przygotuj PROFESSIONAL SUMMARY dla klienta:
- Profesjonalny, ale przystępny ton
- Skup się na wartości dla klienta
- Podaj konkretne, wykonalne rekomendacje
- Buduj zaufanie przez transparentność`;

            case 'audit':
                return `Przygotuj AUDIT REPORT:
- Formalny, precyzyjny język
- Pełna dokumentacja metodologii
- Wszystkie założenia i ograniczenia
- Zgodność z wymogami regulacyjnymi`;

            default:
                return 'Przygotuj profesjonalne podsumowanie.';
        }
    }

    // =============================================
    // Data Formatting
    // =============================================

    private formatSimulationData(data: SummaryData): string {
        const sim = data.simulation_results;
        if (!sim) return 'Brak danych symulacji.';

        return `Symulacja Monte Carlo:
- Zdarzenie: ${sim.event_name}
- Prawdopodobieństwo: ${(sim.probability * 100).toFixed(1)}%
- Przedział ufności 95%: [${(sim.ci_lower * 100).toFixed(1)}% — ${(sim.ci_upper * 100).toFixed(1)}%]
- Liczba symulacji: ${sim.n_simulations.toLocaleString()}
- Zmienne: ${sim.variables.map(v => `${v.name} (${v.model})`).join(', ')}`;
    }

    private formatBacktestData(data: SummaryData): string {
        const bt = data.backtest_results;
        if (!bt) return 'Brak danych backtestu.';

        return `Wyniki Backtestu:
- Hit Rate: ${(bt.hit_rate * 100).toFixed(1)}%
- Brier Score: ${bt.brier_score.toFixed(4)}
- Liczba predykcji: ${bt.n_predictions}
- Okres: ${bt.period}`;
    }

    private formatRiskData(data: SummaryData): string {
        const risk = data.risk_metrics;
        if (!risk) return 'Brak danych ryzyka.';

        return `Metryki Ryzyka:
- VaR(95%): ${risk.var_95.toLocaleString('pl-PL')} PLN
- VaR(99%): ${risk.var_99.toLocaleString('pl-PL')} PLN
- ES(99%): ${risk.es_99.toLocaleString('pl-PL')} PLN
- Max Drawdown: ${(risk.max_drawdown * 100).toFixed(1)}%
- Volatility: ${(risk.volatility * 100).toFixed(1)}%`;
    }

    private formatEventData(data: SummaryData): string {
        const event = data.event_details;
        if (!event) return 'Brak danych zdarzenia.';

        const recentProb = event.probability_history.slice(-3);
        const trend = recentProb.length > 1
            ? (recentProb[recentProb.length - 1].probability - recentProb[0].probability) * 100
            : 0;

        return `Analiza Zdarzenia: ${event.event_name}
- Opis: ${event.description}
- Historia prawdopodobieństwa (ostatnie 3): ${recentProb.map(p => `${p.date}: ${(p.probability * 100).toFixed(1)}%`).join(', ')}
- Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}pp
- Kluczowe czynniki: ${event.key_drivers.map(d => `${d.variable} (${d.impact > 0 ? '+' : ''}${(d.impact * 100).toFixed(0)}%)`).join(', ')}`;
    }

    private formatModelComparisonData(data: SummaryData): string {
        const comp = data.model_comparison;
        if (!comp) return 'Brak danych porównania.';

        return `Porównanie Modeli:
${comp.models.map((m, i) => `
${i + 1}. ${m.name}
   - AIC: ${m.aic.toFixed(2)}, BIC: ${m.bic.toFixed(2)}
   - Zalety: ${m.pros.join(', ')}
   - Wady: ${m.cons.join(', ')}`).join('\n')}`;
    }

    // =============================================
    // Response Parsing
    // =============================================

    private parseGeminiResponse(text: string): {
        summary: string;
        keyPoints: string[];
        actions: string[];
    } {
        // Extract summary
        const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=KEY_POINTS:|$)/s);
        const summary = summaryMatch?.[1]?.trim() || text;

        // Extract key points
        const keyPointsMatch = text.match(/KEY_POINTS:\s*(.+?)(?=ACTIONS:|$)/s);
        const keyPointsText = keyPointsMatch?.[1] || '';
        const keyPoints = keyPointsText
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);

        // Extract actions
        const actionsMatch = text.match(/ACTIONS:\s*(.+?)$/s);
        const actionsText = actionsMatch?.[1] || '';
        const actions = actionsText
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);

        return { summary, keyPoints, actions };
    }

    // =============================================
    // Fallback Summary
    // =============================================

    private generateFallbackSummary(
        type: SummaryType,
        data: SummaryData,
        language: 'pl' | 'en'
    ): string {
        if (language === 'en') {
            switch (type) {
                case 'simulation':
                    const sim = data.simulation_results;
                    return sim
                        ? `Monte Carlo simulation for "${sim.event_name}" shows probability of ${(sim.probability * 100).toFixed(1)}% (95% CI: ${(sim.ci_lower * 100).toFixed(1)}% — ${(sim.ci_upper * 100).toFixed(1)}%) based on ${sim.n_simulations.toLocaleString()} scenarios.`
                        : 'Simulation results not available.';

                case 'risk_report':
                    const risk = data.risk_metrics;
                    return risk
                        ? `Risk analysis shows VaR(99%) of ${risk.var_99.toLocaleString()} PLN with max drawdown of ${(risk.max_drawdown * 100).toFixed(1)}%.`
                        : 'Risk metrics not available.';

                default:
                    return 'Summary not available.';
            }
        }

        // Polish (default)
        switch (type) {
            case 'simulation':
                const sim = data.simulation_results;
                return sim
                    ? `Symulacja Monte Carlo dla "${sim.event_name}" pokazuje prawdopodobieństwo ${(sim.probability * 100).toFixed(1)}% (95% CI: ${(sim.ci_lower * 100).toFixed(1)}% — ${(sim.ci_upper * 100).toFixed(1)}%) na podstawie ${sim.n_simulations.toLocaleString()} scenariuszy.`
                    : 'Wyniki symulacji niedostępne.';

            case 'risk_report':
                const risk = data.risk_metrics;
                return risk
                    ? `Analiza ryzyka pokazuje VaR(99%) = ${risk.var_99.toLocaleString('pl-PL')} PLN z max drawdown ${(risk.max_drawdown * 100).toFixed(1)}%.`
                    : 'Metryki ryzyka niedostępne.';

            case 'backtest':
                const bt = data.backtest_results;
                return bt
                    ? `Backtest pokazuje hit rate ${(bt.hit_rate * 100).toFixed(1)}% i Brier score ${bt.brier_score.toFixed(4)} na ${bt.n_predictions} predykcjach.`
                    : 'Wyniki backtestu niedostępne.';

            default:
                return 'Podsumowanie niedostępne.';
        }
    }
}

// =============================================
// Export singleton instance
// =============================================

export const nlSummarizerAgent = new NLSummarizerAgent();
