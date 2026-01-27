-- =========================================
-- AUTONOMOUS MEMORANDUM SYSTEM - FULL SCHEMA
-- =========================================

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING', 'PROCESSING', 'GENERATING', 'VERIFYING', 'COMPLETED', 'ERROR')),
    current_step TEXT,
    progress_percent INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    last_error TEXT,
    error_count INT DEFAULT 0
);

-- Companies (from KRS)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Identifiers
    krs VARCHAR(10) NOT NULL,
    nip VARCHAR(10),
    regon VARCHAR(14),
    nazwa VARCHAR(500) NOT NULL,
    forma_prawna VARCHAR(100),
    
    -- Address
    ulica VARCHAR(200),
    numer_budynku VARCHAR(20),
    numer_lokalu VARCHAR(20),
    kod_pocztowy VARCHAR(10),
    miejscowosc VARCHAR(100),
    
    -- Capital
    kapital_zakladowy DECIMAL(15,2),
    kapital_wplacony DECIMAL(15,2),
    liczba_akcji_wszystkich BIGINT,
    wartosc_nominalna_akcji DECIMAL(10,2),
    
    -- Dates
    data_rejestracji DATE,
    data_ostatniego_wpisu DATE,
    
    -- PKD
    pkd_przewazajace VARCHAR(10),
    pkd_pozostale TEXT,
    
    -- Representation
    sposob_reprezentacji TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Board members
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    imie VARCHAR(100) NOT NULL,
    nazwisko VARCHAR(100) NOT NULL,
    funkcja VARCHAR(100) NOT NULL,
    pesel VARCHAR(11),
    data_powolania DATE,
    wyksztalcenie TEXT,
    doswiadczenie TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shareholders
CREATE TABLE IF NOT EXISTS shareholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    nazwa VARCHAR(500) NOT NULL,
    typ TEXT CHECK (typ IN ('OSOBA_FIZYCZNA', 'OSOBA_PRAWNA')),
    liczba_akcji BIGINT NOT NULL,
    procent_kapitalu DECIMAL(5,2),
    procent_glosow DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Financial statements
CREATE TABLE IF NOT EXISTS financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rok INT NOT NULL,
    typ_sprawozdania TEXT DEFAULT 'JEDNOSTKOWE',
    
    -- P&L
    przychody_netto DECIMAL(15,2),
    przychody_pozostale DECIMAL(15,2),
    koszty_dzialalnosci DECIMAL(15,2),
    zysk_brutto DECIMAL(15,2),
    podatek_dochodowy DECIMAL(15,2),
    zysk_netto DECIMAL(15,2),
    
    -- Balance - Assets
    aktywa_trwale DECIMAL(15,2),
    aktywa_obrotowe DECIMAL(15,2),
    suma_aktywow DECIMAL(15,2),
    
    -- Balance - Liabilities
    kapital_wlasny DECIMAL(15,2),
    zobowiazania_dlugoterminowe DECIMAL(15,2),
    zobowiazania_krotkoterminowe DECIMAL(15,2),
    suma_pasywow DECIMAL(15,2),
    
    -- Cash flow
    przeplywy_operacyjne DECIMAL(15,2),
    przeplywy_inwestycyjne DECIMAL(15,2),
    przeplywy_finansowe DECIMAL(15,2),
    
    audytor VARCHAR(200),
    opinia_audytora TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, rok, typ_sprawozdania)
);

-- Financial ratios
CREATE TABLE IF NOT EXISTS financial_ratios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES financial_statements(id) ON DELETE CASCADE,
    
    rentownosc_netto DECIMAL(5,2),
    rentownosc_brutto DECIMAL(5,2),
    roe DECIMAL(5,2),
    roa DECIMAL(5,2),
    
    wskaznik_plynnosci_biezacej DECIMAL(5,2),
    wskaznik_plynnosci_szybkiej DECIMAL(5,2),
    
    wskaznik_zadluzenia DECIMAL(5,2),
    wskaznik_zadluzenia_kapitalu DECIMAL(5,2),
    
    dynamika_przychodow DECIMAL(5,2),
    dynamika_zysku DECIMAL(5,2),
    dynamika_aktywow DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Identified risks
CREATE TABLE IF NOT EXISTS identified_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    kategoria TEXT CHECK (kategoria IN ('OPERACYJNE', 'FINANSOWE', 'RYNKOWE', 'PRAWNE_REGULACYJNE', 'INWESTYCYJNE')),
    nazwa VARCHAR(200) NOT NULL,
    opis TEXT NOT NULL,
    wplyw_na_emitenta TEXT NOT NULL,
    mitygacja TEXT,
    prawdopodobienstwo TEXT CHECK (prawdopodobienstwo IN ('NISKIE', 'SREDNIE', 'WYSOKIE')),
    dotkliwosc TEXT CHECK (dotkliwosc IN ('NISKA', 'SREDNIA', 'WYSOKA')),
    ocena_ogolna INT,
    zrodlo TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Memorandum sections
CREATE TABLE IF NOT EXISTS memorandum_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    section_number VARCHAR(10) NOT NULL,
    section_title VARCHAR(200) NOT NULL,
    section_content TEXT NOT NULL,
    generation_status TEXT DEFAULT 'PENDING' CHECK (generation_status IN ('PENDING', 'GENERATED', 'VERIFIED', 'CORRECTED', 'APPROVED')),
    generation_attempts INT DEFAULT 1,
    has_placeholders BOOLEAN DEFAULT FALSE,
    placeholder_count INT DEFAULT 0,
    verification_notes TEXT,
    word_count INT,
    generated_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    UNIQUE(session_id, section_number)
);

-- Offer parameters
CREATE TABLE IF NOT EXISTS offer_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    seria_akcji VARCHAR(10),
    liczba_akcji BIGINT,
    wartosc_nominalna DECIMAL(10,2),
    cena_emisyjna DECIMAL(10,2),
    cele_emisji TEXT,
    szacunkowe_koszty DECIMAL(15,2),
    data_otwarcia_subskrypcji DATE,
    data_zamkniecia_subskrypcji DATE,
    data_przydzialu DATE,
    miejsce_zapisow TEXT,
    minimalna_liczba_akcji INT,
    firma_inwestycyjna VARCHAR(200),
    numer_uchwaly_wza VARCHAR(50),
    data_uchwaly_wza DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated documents
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    format TEXT CHECK (format IN ('PDF', 'DOCX')),
    title VARCHAR(500),
    page_count INT,
    file_size_kb INT,
    storage_path TEXT NOT NULL,
    version INT DEFAULT 1,
    is_final BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP DEFAULT NOW(),
    downloaded_at TIMESTAMP,
    has_errors BOOLEAN DEFAULT FALSE,
    error_details TEXT
);

-- API call logging
CREATE TABLE IF NOT EXISTS api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gemini-2.0-flash',
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    latency_ms INT,
    success BOOLEAN,
    error_message TEXT,
    called_at TIMESTAMP DEFAULT NOW()
);

-- Verification logs
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES memorandum_sections(id) ON DELETE CASCADE,
    verification_type TEXT CHECK (verification_type IN ('LEGAL_ACCURACY', 'DATA_CONSISTENCY', 'PLACEHOLDER_CHECK', 'FORMATTING_CHECK', 'COMPLETENESS_CHECK')),
    passed BOOLEAN NOT NULL,
    issues_found TEXT,
    corrections_made TEXT,
    verified_at TIMESTAMP DEFAULT NOW()
);
