// =========================================
// DATABASE TYPES - Autonomous Memorandum System
// =========================================

export type SessionStatus = 'UPLOADING' | 'PROCESSING' | 'GENERATING' | 'VERIFYING' | 'COMPLETED' | 'ERROR';
export type RiskCategory = 'OPERACYJNE' | 'FINANSOWE' | 'RYNKOWE' | 'PRAWNE_REGULACYJNE' | 'INWESTYCYJNE';
export type RiskLevel = 'NISKIE' | 'SREDNIE' | 'WYSOKIE';
export type SectionStatus = 'PENDING' | 'GENERATED' | 'VERIFIED' | 'CORRECTED' | 'APPROVED';
export type VerificationType = 'LEGAL_ACCURACY' | 'DATA_CONSISTENCY' | 'PLACEHOLDER_CHECK' | 'FORMATTING_CHECK' | 'COMPLETENESS_CHECK';

// Session
export interface Session {
    id: string;
    status: SessionStatus;
    currentStep?: string;
    progressPercent: number;
    startedAt: Date;
    completedAt?: Date;
    lastError?: string;
    errorCount: number;
}

// Company (from KRS)
export interface Company {
    id: string;
    sessionId: string;

    // Identifiers
    krs: string;
    nip?: string;
    regon?: string;
    nazwa: string;
    formaPrawna?: string;

    // Address
    ulica?: string;
    numerBudynku?: string;
    numerLokalu?: string;
    kodPocztowy?: string;
    miejscowosc?: string;

    // Capital
    kapitalZakladowy?: number;
    kapitalWplacony?: number;
    liczbaAkcjiWszystkich?: number;
    wartoscNominalnaAkcji?: number;

    // Dates
    dataRejestracji?: Date;
    dataOstatniegoWpisu?: Date;

    // PKD
    pkdPrzewazajace?: string;
    pkdPozostale?: string[];

    // Representation
    sposobReprezentacji?: string;

    createdAt: Date;
}

// Board member
export interface BoardMember {
    id: string;
    companyId: string;
    imie: string;
    nazwisko: string;
    funkcja: string;
    pesel?: string;
    dataPowolania?: Date;
    wyksztalcenie?: string;
    doswiadczenie?: string;
}

// Shareholder
export interface Shareholder {
    id: string;
    companyId: string;
    nazwa: string;
    typ: 'OSOBA_FIZYCZNA' | 'OSOBA_PRAWNA';
    liczbaAkcji: number;
    procentKapitalu?: number;
    procentGlosow?: number;
}

// Financial statement
export interface FinancialStatement {
    id: string;
    companyId: string;
    rok: number;
    typSprawozdania: 'JEDNOSTKOWE' | 'SKONSOLIDOWANE';

    // P&L
    przychodyNetto?: number;
    przychodyPozostale?: number;
    kosztyDzialalnosci?: number;
    zyskBrutto?: number;
    podatekDochodowy?: number;
    zyskNetto?: number;

    // Balance - Assets
    aktywaTrwale?: number;
    aktywaObrotowe?: number;
    sumaAktywow?: number;

    // Balance - Liabilities
    kapitalWlasny?: number;
    zobowiazaniaDlugoterminowe?: number;
    zobowiazaniaKrotkoterminowe?: number;
    sumaPasywow?: number;

    // Cash flow
    przeplywyOperacyjne?: number;
    przeplywyInwestycyjne?: number;
    przeplywyFinansowe?: number;

    audytor?: string;
    opiniaAudytora?: string;
}

// Financial ratios
export interface FinancialRatios {
    id: string;
    statementId: string;

    // Profitability
    rentownoscNetto?: number;
    rentownoscBrutto?: number;
    roe?: number;
    roa?: number;

    // Liquidity
    wskaznikPlynnosciBiezacej?: number;
    wskaznikPlynnosciSzybkiej?: number;

    // Debt
    wskaznikZadluzenia?: number;
    wskaznikZadluzeniaKapitalu?: number;

    // YoY dynamics
    dynamikaPrzychodow?: number;
    dynamikaZysku?: number;
    dynamikaAktywow?: number;
}

// Identified risk
export interface IdentifiedRisk {
    id: string;
    companyId: string;
    kategoria: RiskCategory;
    nazwa: string;
    opis: string;
    wplywNaEmitenta: string;
    mitygacja?: string;
    prawdopodobienstwo?: RiskLevel;
    dotkliwosc?: RiskLevel;
    ocenaOgolna?: number;
    zrodlo?: string;
}

// Memorandum section
export interface MemorandumSection {
    id: string;
    sessionId: string;
    companyId: string;
    sectionNumber: string;
    sectionTitle: string;
    sectionContent: string;
    generationStatus: SectionStatus;
    generationAttempts: number;
    hasPlaceholders: boolean;
    placeholderCount: number;
    verificationNotes?: string;
    wordCount?: number;
    generatedAt: Date;
    verifiedAt?: Date;
}

// Offer parameters
export interface OfferParameters {
    id: string;
    sessionId: string;
    seriaAkcji?: string;
    liczbaAkcji?: number;
    wartoscNominalna?: number;
    cenaEmisyjna?: number;
    celeEmisji?: string;
    szacunkoweKoszty?: number;
    dataOtwarciaSubskrypcji?: Date;
    dataZamknieciaSubskrypcji?: Date;
    dataPrzydzialu?: Date;
    miejsceZapisow?: string;
    minimalnaLiczbaAkcji?: number;
    firmaInwestycyjna?: string;
    numerUchwalyWza?: string;
    dataUchwalyWza?: Date;
}

// Generated document
export interface GeneratedDocument {
    id: string;
    sessionId: string;
    companyId: string;
    format: 'PDF' | 'DOCX';
    title?: string;
    pageCount?: number;
    fileSizeKb?: number;
    storagePath: string;
    version: number;
    isFinal: boolean;
    generatedAt: Date;
    downloadedAt?: Date;
    hasErrors: boolean;
    errorDetails?: string;
}

// API call log
export interface ApiCall {
    id: string;
    sessionId: string;
    agentName: string;
    modelUsed: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    success: boolean;
    errorMessage?: string;
    calledAt: Date;
}

// Verification log
export interface VerificationLog {
    id: string;
    sectionId: string;
    verificationType: VerificationType;
    passed: boolean;
    issuesFound?: string[];
    correctionsMade?: string[];
    verifiedAt: Date;
}

// =========================================
// AGENT INTERFACES
// =========================================

export interface AgentResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    tokensUsed?: number;
    latencyMs?: number;
}

export interface ExtractedDocument {
    rawText: string;
    documentType: 'KRS' | 'FINANCIAL' | 'WZA_RESOLUTION' | 'OTHER';
    pageCount: number;
    extractionConfidence: number;
    sections?: { title: string; content: string }[];
}

export interface ParsedKRS {
    company: Partial<Company>;
    boardMembers: Partial<BoardMember>[];
    shareholders: Partial<Shareholder>[];
}

export interface AnalyzedFinancials {
    statements: Partial<FinancialStatement>[];
    ratios: Partial<FinancialRatios>[];
    commentary: string;
}

export interface GeneratedRisks {
    risks: Partial<IdentifiedRisk>[];
    totalCount: number;
}

export interface GeneratedSection {
    sectionNumber: string;
    sectionTitle: string;
    content: string;
    wordCount: number;
    hasPlaceholders: boolean;
    placeholderCount: number;
}

export interface VerificationResult {
    passed: boolean;
    issues: string[];
    correctedContent?: string;
}
