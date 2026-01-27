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

// Agent 5: Legal Content Generator
export { generateSection, generateAllSections, getSectionTemplates, getSectionsByChapter } from './legal-content-generator';
export type { GenerationContext } from './legal-content-generator';

// Agent 6: Verification Agent
export { verifySection, verifyAllSections, quickVerify } from './verification-agent';

// Agent 7: PDF Renderer
export { MemorandumPDFRenderer, renderMemorandumPDF } from './pdf-renderer';
export type { RenderOptions } from './pdf-renderer';

// Pipeline Orchestrator
export { PipelineOrchestrator, createPipeline } from './pipeline-orchestrator';
export type { PipelineState, PipelineOptions } from './pipeline-orchestrator';

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
