// =============================================
// StochFin EventProb Engine: Gemini NL Parser
// Natural Language to Event Definition DSL
// =============================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
    type EventDefinition,
    type ThresholdBreachEvent,
    type CompoundEvent,
    type AtLeastKEvent,
    type SDEModelType,
    type ComparisonOperator,
    validateEventDefinition
} from './events';

// =============================================
// Types
// =============================================

export interface NLParseResult {
    success: boolean;
    event?: EventDefinition;
    suggestedVariables?: NLSuggestedVariable[];
    reasoning?: string;
    error?: string;
}

export interface NLSuggestedVariable {
    name: string;
    label: string;
    sde_model: SDEModelType;
    suggested_parameters: Record<string, number>;
    data_source?: string;
}

export interface NLInterpretation {
    summary: string;
    probability_interpretation: string;
    risk_factors: string[];
    recommendations: string[];
    copula_rationale?: string;
}

// =============================================
// Gemini Client
// =============================================

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
    if (!model) {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.1, // Low temperature for structured output
                topP: 0.8,
                maxOutputTokens: 4096
            }
        });
    }
    return model;
}

// =============================================
// NL to Event DSL Parser
// =============================================

const PARSE_SYSTEM_PROMPT = `You are a financial event definition parser. Convert natural language descriptions of financial events into structured JSON format.

Output ONLY valid JSON with this structure:
{
  "event": { Event definition object },
  "suggested_variables": [ Variable suggestions ],
  "reasoning": "Explanation of parsing"
}

Event types supported:
1. threshold_breach: { type: "threshold_breach", variable: string, operator: ">"|"<"|">="|"<=", threshold: number, horizon_months: number }
2. compound (AND/OR): { type: "compound", operator: "AND"|"OR", conditions: [event1, event2, ...], horizon_months: number }
3. at_least_k: { type: "at_least_k", k: number, events: [threshold events...], horizon_months: number }

SDE models for suggested_variables:
- "gbm": Geometric Brownian Motion (stocks, indices) - params: { mu, sigma }
- "ornstein_uhlenbeck": Mean-reverting (rates, spreads) - params: { theta, mu, sigma }
- "heston": Stochastic volatility (options, vol products) - params: { mu, kappa, theta, xi, rho, initial_variance }
- "merton_jump": With jumps (credit events, crashes) - params: { mu, sigma, lambda, mu_jump, sigma_jump }

Variable naming convention: snake_case, e.g., "cpi_inflation", "gdp_growth", "sp500_price"

Examples:

Input: "Inflacja przekracza 5% w ciągu roku"
Output: {
  "event": { "type": "threshold_breach", "variable": "cpi_inflation", "operator": ">", "threshold": 0.05, "horizon_months": 12 },
  "suggested_variables": [{ "name": "cpi_inflation", "label": "Inflacja CPI", "sde_model": "ornstein_uhlenbeck", "suggested_parameters": { "theta": 0.3, "mu": 0.025, "sigma": 0.015 } }],
  "reasoning": "Single threshold event for inflation rate, modeled as mean-reverting OU process"
}

Input: "Stagflacja - wysoka inflacja powyżej 6% przy ujemnym wzroście PKB"
Output: {
  "event": { "type": "compound", "operator": "AND", "conditions": [
    { "type": "threshold_breach", "variable": "cpi_inflation", "operator": ">", "threshold": 0.06, "horizon_months": 12 },
    { "type": "threshold_breach", "variable": "gdp_growth", "operator": "<", "threshold": 0, "horizon_months": 12 }
  ], "horizon_months": 12 },
  "suggested_variables": [
    { "name": "cpi_inflation", "label": "Inflacja CPI", "sde_model": "ornstein_uhlenbeck", "suggested_parameters": { "theta": 0.3, "mu": 0.025, "sigma": 0.02 } },
    { "name": "gdp_growth", "label": "Wzrost PKB", "sde_model": "gbm", "suggested_parameters": { "mu": 0.025, "sigma": 0.03 } }
  ],
  "reasoning": "Compound AND event combining inflation spike with GDP contraction. Both conditions must be met."
}`;

export async function parseNaturalLanguageEvent(
    naturalLanguageDescription: string
): Promise<NLParseResult> {
    try {
        const model = getModel();

        const prompt = `${PARSE_SYSTEM_PROMPT}

Parse this event description:
"${naturalLanguageDescription}"

Respond ONLY with valid JSON, no markdown:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean JSON response
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const parsed = JSON.parse(jsonText);

        // Validate the parsed event
        const validation = validateEventDefinition(parsed.event);
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid event structure: ${validation.errors.join(', ')}`,
                reasoning: parsed.reasoning
            };
        }

        return {
            success: true,
            event: parsed.event as EventDefinition,
            suggestedVariables: parsed.suggested_variables as NLSuggestedVariable[],
            reasoning: parsed.reasoning
        };

    } catch (error) {
        return {
            success: false,
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

// =============================================
// Result Interpreter
// =============================================

const INTERPRET_SYSTEM_PROMPT = `You are a financial risk analyst AI. Given simulation results, provide a clear interpretation for executives.

Output JSON with this structure:
{
  "summary": "One sentence headline",
  "probability_interpretation": "What the probability means in plain terms",
  "risk_factors": ["factor1", "factor2", ...],
  "recommendations": ["action1", "action2", ...],
  "copula_rationale": "Why dependency structure matters (if applicable)"
}

Be concise but insightful. Focus on actionable information.`;

export async function interpretSimulationResult(
    eventName: string,
    eventDescription: string,
    probability: number,
    confidenceInterval: [number, number],
    riskMultiplier?: number,
    copulaType?: string
): Promise<NLInterpretation> {
    try {
        const model = getModel();

        const prompt = `${INTERPRET_SYSTEM_PROMPT}

Event: "${eventName}"
Description: "${eventDescription}"
Probability: ${(probability * 100).toFixed(1)}%
90% Confidence Interval: [${(confidenceInterval[0] * 100).toFixed(1)}%, ${(confidenceInterval[1] * 100).toFixed(1)}%]
${riskMultiplier ? `Copula Risk Multiplier: ${riskMultiplier.toFixed(1)}× (vs independence)` : ''}
${copulaType ? `Copula Model: ${copulaType}` : ''}

Provide interpretation JSON:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean JSON response
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
        if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
        if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

        return JSON.parse(jsonText.trim()) as NLInterpretation;

    } catch (error) {
        // Fallback interpretation
        return {
            summary: `${eventName}: ${(probability * 100).toFixed(1)}% probability`,
            probability_interpretation: probability > 0.5
                ? 'High likelihood - event is likely to occur'
                : probability > 0.2
                    ? 'Moderate likelihood - event should be monitored'
                    : 'Low likelihood - event is unlikely but possible',
            risk_factors: ['Market conditions', 'Economic indicators'],
            recommendations: ['Monitor key indicators', 'Review hedging strategy']
        };
    }
}

// =============================================
// Batch Parsing with Examples
// =============================================

export const EXAMPLE_PROMPTS = [
    {
        prompt: 'Kryzys kredytowy - spread CDS przekracza 500bps',
        expectedType: 'threshold_breach' as const
    },
    {
        prompt: 'S&P 500 spada o ponad 20% (bear market)',
        expectedType: 'threshold_breach' as const
    },
    {
        prompt: 'Stagflacja: inflacja >8% i PKB <0%',
        expectedType: 'compound' as const
    },
    {
        prompt: 'Co najmniej 3 z 5 spółek w portfelu defaultuje',
        expectedType: 'at_least_k' as const
    },
    {
        prompt: 'VIX przekracza 40 podczas gdy stopy pozostają poniżej 2%',
        expectedType: 'compound' as const
    }
];

// =============================================
// Streaming Parser for UI
// =============================================

export async function* parseNaturalLanguageEventStreaming(
    naturalLanguageDescription: string
): AsyncGenerator<{ type: 'progress' | 'result'; data: string | NLParseResult }> {
    yield { type: 'progress', data: 'Analizowanie opisu zdarzenia...' };

    await new Promise(r => setTimeout(r, 300)); // Simulate processing
    yield { type: 'progress', data: 'Identyfikacja zmiennych finansowych...' };

    await new Promise(r => setTimeout(r, 200));
    yield { type: 'progress', data: 'Generowanie struktury DSL...' };

    const result = await parseNaturalLanguageEvent(naturalLanguageDescription);

    yield { type: 'progress', data: 'Walidacja definicji...' };
    await new Promise(r => setTimeout(r, 200));

    yield { type: 'result', data: result };
}
