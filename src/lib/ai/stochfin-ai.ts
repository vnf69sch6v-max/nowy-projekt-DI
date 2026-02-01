// =============================================
// StochFin AI: Assumption Extraction & Validation
// Uses Gemini via Firebase Vertex AI
// =============================================

import { getGeminiModel, generateText } from './gemini';
import type {
    DistributionType,
    DistributionParams,
    StochasticProcess
} from '@/types/distributions';

// =============================================
// Types
// =============================================

export interface ExtractedAssumption {
    variableCode: string;
    variableName: string;
    variableNamePl: string;
    suggestedDistribution: DistributionType;
    suggestedParams: DistributionParams;
    confidence: 'high' | 'medium' | 'low';
    sourceText: string;
    reasoning: string;
}

export interface ExtractionResult {
    assumptions: ExtractedAssumption[];
    warnings: string[];
    suggestedCorrelations: Array<{
        var1: string;
        var2: string;
        suggestedValue: number;
        reasoning: string;
    }>;
}

export interface ValidationIssue {
    variableCode: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
}

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    overallAssessment: string;
}

export interface NarrativeSection {
    title: string;
    content: string;
}

export interface NarrativeResult {
    executiveSummary: string;
    sections: NarrativeSection[];
    keyTakeaways: string[];
    riskHighlights: string[];
}

// =============================================
// Prompts
// =============================================

const EXTRACT_ASSUMPTIONS_PROMPT = `You are a financial analyst AI specialized in probabilistic modeling for StochFin, a Monte Carlo simulation platform.

Analyze the following financial document and extract assumptions that should be modeled stochastically.

For each assumption, provide:
1. Variable code (e.g., REVENUE_GROWTH, COGS_RATIO)
2. Variable name in English and Polish
3. Suggested probability distribution (one of: normal, lognormal, pert, triangular, uniform)
4. Distribution parameters appropriate for the distribution type
5. Your confidence level (high/medium/low)
6. The source text from the document
7. Brief reasoning for your choice

Also identify any correlations between variables that should be modeled.

IMPORTANT RULES:
- Prefer PERT distribution for business estimates with optimistic/pessimistic scenarios
- Use lognormal for strictly positive variables like prices or ratios
- Use normal for growth rates that can be negative
- Be conservative with parameter ranges - capture uncertainty honestly
- Flag deterministic assumptions that should probably be stochastic

Respond in valid JSON format matching this structure:
{
  "assumptions": [
    {
      "variableCode": "REVENUE_GROWTH",
      "variableName": "Revenue Growth Rate",
      "variableNamePl": "Wzrost przychodów",
      "suggestedDistribution": "pert",
      "suggestedParams": {
        "pessimistic": 0.02,
        "most_likely": 0.08,
        "optimistic": 0.15,
        "lambda": 4
      },
      "confidence": "high",
      "sourceText": "Management expects 5-10% growth...",
      "reasoning": "PERT captures management's point estimate with appropriate uncertainty"
    }
  ],
  "warnings": ["Consider adding correlation between REVENUE and GDP"],
  "suggestedCorrelations": [
    {
      "var1": "REVENUE",
      "var2": "COGS",
      "suggestedValue": 0.75,
      "reasoning": "Cost of goods typically scales with revenue"
    }
  ]
}

DOCUMENT TO ANALYZE:
`;

const VALIDATE_ASSUMPTIONS_PROMPT = `You are a financial risk analyst reviewing a set of assumptions for a Monte Carlo simulation.

Review the following assumptions for:
1. Internal consistency (do ranges make sense together?)
2. Missing correlations (variables that should be correlated)
3. Unrealistic parameters (too narrow or too wide distributions)
4. Deterministic values that should be stochastic
5. Potential model risks

For each issue found, provide:
- Variable code affected
- Severity (error/warning/info)
- Clear message explaining the issue
- Concrete suggestion for fixing it

Respond in valid JSON format:
{
  "isValid": true/false,
  "issues": [
    {
      "variableCode": "INTEREST_RATE",
      "severity": "warning",
      "message": "Interest rate is deterministic but rates are inherently uncertain",
      "suggestion": "Consider using a normal distribution with current forward curve as mean and 50bps std"
    }
  ],
  "overallAssessment": "Brief overall assessment of the assumption set"
}

ASSUMPTIONS TO VALIDATE:
`;

const GENERATE_NARRATIVE_PROMPT = `You are a senior financial analyst writing an executive summary of Monte Carlo simulation results.

Write a clear, concise narrative that:
1. Summarizes key findings in business terms (not technical jargon)
2. Highlights risk metrics and their business implications
3. Identifies the main drivers of uncertainty
4. Provides actionable recommendations

Use Polish language for the output.

Structure your response as JSON:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "sections": [
    {
      "title": "Główne ryzyka",
      "content": "Description of main risks..."
    }
  ],
  "keyTakeaways": [
    "Bullet point 1",
    "Bullet point 2"
  ],
  "riskHighlights": [
    "Critical risk 1",
    "Critical risk 2"
  ]
}

SIMULATION RESULTS:
`;

// =============================================
// Functions
// =============================================

/**
 * Extract assumptions from a financial document using AI
 */
export async function extractAssumptions(
    documentText: string,
    options?: {
        focusVariables?: string[];
        horizonMonths?: number;
    }
): Promise<ExtractionResult> {
    const prompt = EXTRACT_ASSUMPTIONS_PROMPT + documentText;

    if (options?.focusVariables?.length) {
        // Add focus instruction
    }

    try {
        const response = await generateText(prompt);

        // Parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        const result = JSON.parse(jsonMatch[0]) as ExtractionResult;

        // Validate and clean up the result
        result.assumptions = result.assumptions.map(a => ({
            ...a,
            variableCode: a.variableCode.toUpperCase().replace(/\s+/g, '_'),
            confidence: a.confidence || 'medium'
        }));

        return result;
    } catch (error) {
        console.error('Error extracting assumptions:', error);
        return {
            assumptions: [],
            warnings: ['Failed to extract assumptions from document'],
            suggestedCorrelations: []
        };
    }
}

/**
 * Validate a set of assumptions for consistency and completeness
 */
export async function validateAssumptions(
    assumptions: Array<{
        variableCode: string;
        variableName: string;
        isStochastic: boolean;
        distributionType?: DistributionType;
        params?: DistributionParams;
    }>,
    correlationMatrix?: {
        variables: string[];
        matrix: number[][];
    }
): Promise<ValidationResult> {
    const context = {
        assumptions,
        correlations: correlationMatrix
    };

    const prompt = VALIDATE_ASSUMPTIONS_PROMPT + JSON.stringify(context, null, 2);

    try {
        const response = await generateText(prompt);

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        const result = JSON.parse(jsonMatch[0]) as ValidationResult;
        return result;
    } catch (error) {
        console.error('Error validating assumptions:', error);
        return {
            isValid: true,
            issues: [{
                variableCode: 'SYSTEM',
                severity: 'warning',
                message: 'Could not complete AI validation',
                suggestion: 'Review assumptions manually'
            }],
            overallAssessment: 'Validation could not be completed'
        };
    }
}

/**
 * Generate a narrative report from simulation results
 */
export async function generateNarrative(
    simulationResults: {
        probNegativeCF: number;
        cfar95: number;
        cfar99: number;
        variables: Array<{
            code: string;
            name: string;
            p10: number;
            p50: number;
            p90: number;
        }>;
        covenantBreaches: Array<{
            name: string;
            probability: number;
        }>;
        sensitivityAnalysis?: Array<{
            variable: string;
            impact: number;
        }>;
    },
    modelContext?: {
        entityName?: string;
        horizonMonths?: number;
        nSimulations?: number;
    }
): Promise<NarrativeResult> {
    const context = {
        results: simulationResults,
        model: modelContext
    };

    const prompt = GENERATE_NARRATIVE_PROMPT + JSON.stringify(context, null, 2);

    try {
        const response = await generateText(prompt);

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        const result = JSON.parse(jsonMatch[0]) as NarrativeResult;
        return result;
    } catch (error) {
        console.error('Error generating narrative:', error);
        return {
            executiveSummary: 'Unable to generate narrative summary.',
            sections: [],
            keyTakeaways: [],
            riskHighlights: []
        };
    }
}

/**
 * Stream narrative generation for real-time display
 */
export async function* streamNarrative(
    simulationResults: Parameters<typeof generateNarrative>[0],
    modelContext?: Parameters<typeof generateNarrative>[1]
): AsyncGenerator<string> {
    const model = getGeminiModel();

    const context = {
        results: simulationResults,
        model: modelContext
    };

    const prompt = `Write a narrative executive summary in Polish for these Monte Carlo simulation results. 
Use clear business language, highlight key risks and recommendations.

${JSON.stringify(context, null, 2)}`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
            yield text;
        }
    }
}
