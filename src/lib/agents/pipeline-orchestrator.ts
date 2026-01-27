// =========================================
// PIPELINE ORCHESTRATOR
// =========================================
// Coordinates all agents to generate a complete memorandum

import {
    extractDocument,
    parseKRS,
    analyzeFinancials,
    analyzeRisks,
    generateSection,
    verifySection,
    quickVerify
} from './index';

import {
    Company,
    BoardMember,
    Shareholder,
    FinancialStatement,
    FinancialRatios,
    IdentifiedRisk,
    OfferParameters,
    GeneratedSection
} from '@/lib/db/types';

import { GenerationContext, getSectionTemplates } from './legal-content-generator';

// =========================================
// PIPELINE STATE
// =========================================

export interface PipelineState {
    sessionId: string;
    status: 'IDLE' | 'EXTRACTING' | 'PARSING' | 'ANALYZING' | 'GENERATING' | 'VERIFYING' | 'COMPLETED' | 'ERROR';
    progress: number;
    currentStep: string;

    // Extracted data
    company?: Partial<Company>;
    board?: Partial<BoardMember>[];
    shareholders?: Partial<Shareholder>[];
    financials?: Partial<FinancialStatement>[];
    ratios?: Partial<FinancialRatios>[];
    risks?: Partial<IdentifiedRisk>[];
    offer?: Partial<OfferParameters>;

    // Generated content
    sections?: GeneratedSection[];

    // Metrics
    totalTokensUsed: number;
    totalLatencyMs: number;
    errors: string[];
}

export interface PipelineOptions {
    onProgress?: (state: PipelineState) => void;
    onSection?: (section: GeneratedSection) => void;
    skipVerification?: boolean;
    maxRetries?: number;
}

// =========================================
// PIPELINE ORCHESTRATOR CLASS
// =========================================

export class PipelineOrchestrator {
    private state: PipelineState;
    private options: PipelineOptions;

    constructor(sessionId: string, options: PipelineOptions = {}) {
        this.state = {
            sessionId,
            status: 'IDLE',
            progress: 0,
            currentStep: 'Inicjalizacja',
            totalTokensUsed: 0,
            totalLatencyMs: 0,
            errors: []
        };
        this.options = {
            maxRetries: 2,
            ...options
        };
    }

    private updateState(updates: Partial<PipelineState>) {
        this.state = { ...this.state, ...updates };
        if (this.options.onProgress) {
            this.options.onProgress(this.state);
        }
    }

    private addTokens(tokens?: number, latency?: number) {
        if (tokens) this.state.totalTokensUsed += tokens;
        if (latency) this.state.totalLatencyMs += latency;
    }

    // =========================================
    // STEP 1: EXTRACT DOCUMENTS
    // =========================================

    async extractDocuments(krsFile: File, financialFile?: File): Promise<boolean> {
        this.updateState({
            status: 'EXTRACTING',
            currentStep: 'Ekstrakcja dokumentów PDF',
            progress: 5
        });

        try {
            // Extract KRS
            const krsBuffer = await krsFile.arrayBuffer();
            const krsBase64 = Buffer.from(krsBuffer).toString('base64');

            const krsResult = await extractDocument(krsBase64, 'application/pdf');

            if (!krsResult.success || !krsResult.data) {
                throw new Error(`KRS extraction failed: ${krsResult.error}`);
            }

            this.addTokens(krsResult.tokensUsed, krsResult.latencyMs);

            this.updateState({
                currentStep: 'Parsowanie odpisu KRS',
                progress: 15
            });

            // Parse KRS
            const parseResult = await parseKRS(krsResult.data.rawText);

            if (!parseResult.success || !parseResult.data) {
                throw new Error(`KRS parsing failed: ${parseResult.error}`);
            }

            this.addTokens(parseResult.tokensUsed, parseResult.latencyMs);

            this.updateState({
                company: parseResult.data.company,
                board: parseResult.data.boardMembers,
                shareholders: parseResult.data.shareholders,
                progress: 25
            });

            // Extract financials if provided
            if (financialFile) {
                this.updateState({
                    currentStep: 'Analiza sprawozdania finansowego',
                    progress: 30
                });

                const finBuffer = await financialFile.arrayBuffer();
                const finBase64 = Buffer.from(finBuffer).toString('base64');

                const finExtract = await extractDocument(finBase64, 'application/pdf');

                if (finExtract.success && finExtract.data) {
                    this.addTokens(finExtract.tokensUsed, finExtract.latencyMs);

                    const finResult = await analyzeFinancials(finExtract.data.rawText);

                    if (finResult.success && finResult.data) {
                        this.addTokens(finResult.tokensUsed, finResult.latencyMs);

                        this.updateState({
                            financials: finResult.data.statements,
                            ratios: finResult.data.ratios,
                            progress: 40
                        });
                    }
                }
            }

            return true;

        } catch (error) {
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown extraction error');
            this.updateState({ status: 'ERROR' });
            return false;
        }
    }

    // =========================================
    // STEP 2: ANALYZE RISKS
    // =========================================

    async analyzeRisks(): Promise<boolean> {
        if (!this.state.company) {
            this.state.errors.push('No company data available for risk analysis');
            return false;
        }

        this.updateState({
            status: 'ANALYZING',
            currentStep: 'Generowanie analizy ryzyk',
            progress: 45
        });

        try {
            const riskResult = await analyzeRisks(
                this.state.company,
                this.state.financials || [],
                this.state.ratios || []
            );

            if (!riskResult.success || !riskResult.data) {
                throw new Error(`Risk analysis failed: ${riskResult.error}`);
            }

            this.addTokens(riskResult.tokensUsed, riskResult.latencyMs);

            this.updateState({
                risks: riskResult.data.risks,
                progress: 55
            });

            console.log(`Generated ${riskResult.data.totalCount} risks`);
            return true;

        } catch (error) {
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown risk analysis error');
            return false;
        }
    }

    // =========================================
    // STEP 3: GENERATE SECTIONS
    // =========================================

    async generateSections(): Promise<boolean> {
        this.updateState({
            status: 'GENERATING',
            currentStep: 'Generowanie treści memorandum',
            progress: 60
        });

        const templates = getSectionTemplates();
        const sections: GeneratedSection[] = [];
        const context: GenerationContext = {
            company: this.state.company,
            board: this.state.board,
            shareholders: this.state.shareholders,
            financials: this.state.financials,
            ratios: this.state.ratios,
            risks: this.state.risks,
            offer: this.state.offer
        };

        try {
            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                const progressStep = 60 + (i / templates.length) * 25;

                this.updateState({
                    currentStep: `Generowanie ${template.number} ${template.title}`,
                    progress: progressStep
                });

                let attempts = 0;
                let generated = false;

                while (attempts < (this.options.maxRetries || 2) && !generated) {
                    attempts++;

                    const result = await generateSection(template.number, context);

                    if (result.success && result.data) {
                        this.addTokens(result.tokensUsed, result.latencyMs);

                        // Quick verification
                        const quickCheck = quickVerify(result.data.content);

                        if (!quickCheck.hasErrors || attempts >= (this.options.maxRetries || 2)) {
                            sections.push(result.data);
                            generated = true;

                            if (this.options.onSection) {
                                this.options.onSection(result.data);
                            }
                        } else {
                            console.log(`Section ${template.number} has placeholders, retrying...`);
                        }
                    } else {
                        this.state.errors.push(`Section ${template.number}: ${result.error}`);
                    }

                    // Small delay between attempts
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (!generated) {
                    console.warn(`Failed to generate ${template.number} after ${attempts} attempts`);
                }
            }

            this.updateState({
                sections,
                progress: 85
            });

            console.log(`Generated ${sections.length}/${templates.length} sections`);
            return sections.length > 0;

        } catch (error) {
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown generation error');
            return false;
        }
    }

    // =========================================
    // STEP 4: VERIFY CONTENT
    // =========================================

    async verifyContent(): Promise<boolean> {
        if (!this.state.sections || this.state.sections.length === 0) {
            return false;
        }

        if (this.options.skipVerification) {
            this.updateState({
                status: 'COMPLETED',
                currentStep: 'Zakończono (bez weryfikacji)',
                progress: 100
            });
            return true;
        }

        this.updateState({
            status: 'VERIFYING',
            currentStep: 'Weryfikacja treści',
            progress: 88
        });

        try {
            let issuesCount = 0;

            for (let i = 0; i < this.state.sections.length; i++) {
                const section = this.state.sections[i];
                const progressStep = 88 + (i / this.state.sections.length) * 10;

                this.updateState({
                    currentStep: `Weryfikacja ${section.sectionNumber}`,
                    progress: progressStep
                });

                const result = await verifySection(
                    section,
                    this.state.company,
                    this.state.financials
                );

                if (result.success && result.data) {
                    this.addTokens(result.tokensUsed, result.latencyMs);

                    if (!result.data.passed) {
                        issuesCount += result.data.issues.length;

                        // Apply corrections if available
                        if (result.data.correctedContent) {
                            section.content = result.data.correctedContent;
                            section.hasPlaceholders = false;
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }

            this.updateState({
                status: 'COMPLETED',
                currentStep: `Zakończono (${issuesCount} uwag)`,
                progress: 100
            });

            console.log(`Verification complete with ${issuesCount} issues`);
            return true;

        } catch (error) {
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown verification error');
            return false;
        }
    }

    // =========================================
    // FULL PIPELINE
    // =========================================

    async run(
        krsFile: File,
        financialFile?: File,
        offerParams?: Partial<OfferParameters>
    ): Promise<PipelineState> {

        console.log('🚀 Starting memorandum generation pipeline...');

        // Set offer parameters
        if (offerParams) {
            this.state.offer = offerParams;
        }

        // Step 1: Extract and parse documents
        const extracted = await this.extractDocuments(krsFile, financialFile);
        if (!extracted) {
            return this.state;
        }

        // Step 2: Analyze risks
        await this.analyzeRisks();

        // Step 3: Generate all sections
        const generated = await this.generateSections();
        if (!generated) {
            this.updateState({ status: 'ERROR' });
            return this.state;
        }

        // Step 4: Verify content
        await this.verifyContent();

        console.log(`✅ Pipeline complete!`);
        console.log(`   Tokens used: ${this.state.totalTokensUsed}`);
        console.log(`   Total time: ${(this.state.totalLatencyMs / 1000).toFixed(1)}s`);
        console.log(`   Sections: ${this.state.sections?.length || 0}`);
        console.log(`   Errors: ${this.state.errors.length}`);

        return this.state;
    }

    // Get current state
    getState(): PipelineState {
        return this.state;
    }

    // Get generated content as markdown
    getMarkdown(): string {
        if (!this.state.sections) return '';

        let markdown = '';
        let currentChapter = '';

        for (const section of this.state.sections) {
            // Check if we need a chapter header
            const chapterMatch = section.sectionNumber.match(/§(\d+)/);
            if (chapterMatch) {
                const sectionNum = parseInt(chapterMatch[1]);
                let chapter = '';
                if (sectionNum <= 10) chapter = 'I. WSTĘP';
                else if (sectionNum <= 15) chapter = 'II. CZYNNIKI RYZYKA';
                else if (sectionNum <= 35) chapter = 'III. DANE O EMITENCIE';
                else if (sectionNum <= 42) chapter = 'IV. SPRAWOZDANIA FINANSOWE';
                else chapter = 'V. INFORMACJE DODATKOWE';

                if (chapter !== currentChapter) {
                    currentChapter = chapter;
                    markdown += `\n# ${chapter}\n\n`;
                }
            }

            markdown += `## ${section.sectionNumber} ${section.sectionTitle}\n\n`;
            markdown += section.content + '\n\n';
        }

        return markdown;
    }
}

// Factory function
export function createPipeline(sessionId: string, options?: PipelineOptions): PipelineOrchestrator {
    return new PipelineOrchestrator(sessionId, options);
}
