// =============================================
// Agent 10: Model Comparator
// Compares multiple models using various metrics
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    ModelFit
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface ModelComparatorInput {
    models: ModelCandidate[];
    validation_data?: ValidationData;
    comparison_method?: ComparisonMethod;
}

export interface ModelCandidate {
    name: string;
    type: string;
    predictions: number[];
    actuals?: boolean[];
    parameters: Record<string, number>;
    log_likelihood?: number;
    n_parameters: number;
}

export interface ValidationData {
    dates: Date[];
    actuals: boolean[];
}

export type ComparisonMethod = 'aic' | 'bic' | 'cross_validation' | 'all';

export interface ModelComparatorOutput {
    winner: string;
    ranking: ModelRankingResult[];
    comparison_matrix: ComparisonCell[][];
    recommendation: string;
}

export interface ModelRankingResult {
    model_name: string;
    rank: number;
    aic: number;
    bic: number;
    brier_score: number;
    log_loss: number;
    cv_score?: number;
    relative_score: number;
}

export interface ComparisonCell {
    model_a: string;
    model_b: string;
    likelihood_ratio: number;
    vuong_stat: number;
    preferred: string;
}

// =============================================
// Agent Implementation
// =============================================

export class ModelComparatorAgent extends BaseAgent<ModelComparatorInput, ModelComparatorOutput> {
    readonly id: AgentId = 'agent-model-comparator';
    readonly name = 'Model Comparator';
    readonly category: AgentCategory = 'models';
    readonly description = 'Porównuje modele przy użyciu różnych metryk';
    readonly triggers: TriggerType[] = ['user_action'];

    protected async run(
        input: ModelComparatorInput,
        context: AgentContext
    ): Promise<ModelComparatorOutput> {
        const { models } = input;
        const method = input.comparison_method || 'all';

        context.log(`[${this.id}] Comparing ${models.length} models`);

        if (models.length < 2) {
            throw new Error('At least 2 models required for comparison');
        }

        // Compute metrics for each model
        const rankings: ModelRankingResult[] = models.map(model => {
            const n = model.predictions.length;

            // AIC and BIC
            const ll = model.log_likelihood ?? this.estimateLogLikelihood(model);
            const aic = 2 * model.n_parameters - 2 * ll;
            const bic = model.n_parameters * Math.log(n) - 2 * ll;

            // Brier and Log Loss (if actuals available)
            let brier_score = 0.25;
            let log_loss = 0.693;

            if (model.actuals && model.actuals.length === model.predictions.length) {
                brier_score = this.computeBrierScore(model.predictions, model.actuals);
                log_loss = this.computeLogLoss(model.predictions, model.actuals);
            }

            // CV score (simplified - use validation data if provided)
            let cv_score: number | undefined;
            if (input.validation_data) {
                cv_score = this.computeCVScore(model, input.validation_data);
            }

            return {
                model_name: model.name,
                rank: 0,
                aic,
                bic,
                brier_score,
                log_loss,
                cv_score,
                relative_score: 0
            };
        });

        // Rank by primary metric (AIC by default)
        rankings.sort((a, b) => a.aic - b.aic);
        rankings.forEach((r, i) => { r.rank = i + 1; });

        // Compute relative scores (1.0 for best, 0.0 for worst)
        const minAIC = Math.min(...rankings.map(r => r.aic));
        const maxAIC = Math.max(...rankings.map(r => r.aic));
        rankings.forEach(r => {
            r.relative_score = maxAIC !== minAIC
                ? 1 - (r.aic - minAIC) / (maxAIC - minAIC)
                : 1;
        });

        // Pairwise comparison matrix
        const comparison_matrix = this.buildComparisonMatrix(models);

        // Generate recommendation
        const winner = rankings[0].model_name;
        let recommendation = `Model ${winner} jest zalecanym wyborem.`;

        if (context.gemini) {
            try {
                const topModels = rankings.slice(0, 3);
                const { text } = await this.callGemini(
                    `Sformułuj rekomendację wyboru modelu (max 3 zdania):
                    
                    Ranking:
                    ${topModels.map(m => `${m.rank}. ${m.model_name}: AIC=${m.aic.toFixed(1)}, Brier=${m.brier_score.toFixed(4)}`).join('\n')}
                    
                    Różnica AIC między 1. a 2.: ${rankings[1] ? Math.abs(rankings[0].aic - rankings[1].aic).toFixed(1) : 'N/A'}
                    
                    Uzasadnij wybór i wskaż ewentualne zastrzeżenia.`,
                    context
                );
                recommendation = text;
            } catch (e) {
                context.log(`[${this.id}] Gemini failed: ${e}`, 'warn');
            }
        }

        return {
            winner,
            ranking: rankings,
            comparison_matrix,
            recommendation
        };
    }

    // =============================================
    // Metrics Computation
    // =============================================

    private estimateLogLikelihood(model: ModelCandidate): number {
        // Estimate from predictions assuming normal distribution
        const n = model.predictions.length;
        const mean = this.mean(model.predictions);
        const variance = this.variance(model.predictions);

        if (variance <= 0) return -Infinity;

        let ll = -n / 2 * Math.log(2 * Math.PI) - n / 2 * Math.log(variance);
        for (const p of model.predictions) {
            ll -= Math.pow(p - mean, 2) / (2 * variance);
        }

        return ll;
    }

    private computeBrierScore(predictions: number[], actuals: boolean[]): number {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.pow(predictions[i] - (actuals[i] ? 1 : 0), 2);
        }
        return sum / predictions.length;
    }

    private computeLogLoss(predictions: number[], actuals: boolean[]): number {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            const p = Math.max(0.001, Math.min(0.999, predictions[i]));
            sum -= actuals[i] ? Math.log(p) : Math.log(1 - p);
        }
        return sum / predictions.length;
    }

    private computeCVScore(model: ModelCandidate, validation: ValidationData): number {
        // Simple validation score using Brier
        if (!validation.actuals.length) return 0;

        // Assume predictions align with validation data
        const n = Math.min(model.predictions.length, validation.actuals.length);
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += Math.pow(model.predictions[i] - (validation.actuals[i] ? 1 : 0), 2);
        }

        return 1 - sum / n; // Higher is better
    }

    // =============================================
    // Pairwise Comparison
    // =============================================

    private buildComparisonMatrix(models: ModelCandidate[]): ComparisonCell[][] {
        const matrix: ComparisonCell[][] = [];

        for (let i = 0; i < models.length; i++) {
            const row: ComparisonCell[] = [];
            for (let j = 0; j < models.length; j++) {
                if (i === j) {
                    row.push({
                        model_a: models[i].name,
                        model_b: models[j].name,
                        likelihood_ratio: 1,
                        vuong_stat: 0,
                        preferred: '-'
                    });
                } else {
                    const comparison = this.compareModels(models[i], models[j]);
                    row.push(comparison);
                }
            }
            matrix.push(row);
        }

        return matrix;
    }

    private compareModels(a: ModelCandidate, b: ModelCandidate): ComparisonCell {
        // Likelihood ratio test
        const ll_a = a.log_likelihood ?? this.estimateLogLikelihood(a);
        const ll_b = b.log_likelihood ?? this.estimateLogLikelihood(b);

        const likelihood_ratio = Math.exp(ll_a - ll_b);

        // Vuong statistic (simplified)
        const vuong_stat = (ll_a - ll_b) / Math.sqrt(a.predictions.length);

        // Preferred model (using AIC-like criterion)
        const aic_a = 2 * a.n_parameters - 2 * ll_a;
        const aic_b = 2 * b.n_parameters - 2 * ll_b;
        const preferred = aic_a < aic_b ? a.name : b.name;

        return {
            model_a: a.name,
            model_b: b.name,
            likelihood_ratio,
            vuong_stat,
            preferred
        };
    }

    // =============================================
    // Helpers
    // =============================================

    private variance(data: number[]): number {
        const m = this.mean(data);
        return data.reduce((acc, x) => acc + (x - m) ** 2, 0) / (data.length - 1);
    }
}

export const modelComparatorAgent = new ModelComparatorAgent();
