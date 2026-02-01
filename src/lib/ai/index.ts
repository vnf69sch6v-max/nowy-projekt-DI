// AI Module - Barrel Export

// Core Gemini functions
export { getGeminiModel, generateText, streamText } from './gemini';

// Anthropic (Claude)
export { anthropic, generateMessage, streamMessage } from './anthropic';

// StochFin-specific AI functions
export {
    extractAssumptions,
    validateAssumptions,
    generateNarrative,
    streamNarrative,
    type ExtractedAssumption,
    type ExtractionResult,
    type ValidationIssue,
    type ValidationResult,
    type NarrativeResult,
    type NarrativeSection
} from './stochfin-ai';
