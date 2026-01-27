// =========================================
// AGENTS INDEX - Export all agents
// =========================================

// Agent 1: Document Extractor
export { extractDocument, detectDocumentType } from './document-extractor';

// Agent 2: KRS Parser
export { parseKRS, validateKRS, formatAddress, formatBoardMember } from './krs-parser';

// Agent 3: Financial Analyzer
export { analyzeFinancials, calculateRatios, calculateYoYDynamics, formatPLN, formatPercent } from './financial-analyzer';

// Agent 4: Risk Analyzer
export { analyzeRisks, getIndustryName, getIndustryRisks, calculateRiskScore } from './risk-analyzer';

// Types
export type {
    AgentResult,
    ExtractedDocument,
    ParsedKRS,
    AnalyzedFinancials,
    GeneratedRisks,
    GeneratedSection,
    VerificationResult
} from '@/lib/db/types';
