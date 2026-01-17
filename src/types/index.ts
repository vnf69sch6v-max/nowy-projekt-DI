// KRS Company Data Types
export interface KRSAddress {
    ulica: string;
    numer: string;
    lokal?: string;
    kodPocztowy: string;
    miejscowosc: string;
    kraj: string;
}

export interface ReprezentantInfo {
    imie: string;
    nazwisko: string;
    funkcja: string;
    dataPowolania?: string;
}

export interface WspolnikInfo {
    nazwa: string;
    udzialy?: number;
    wartoscUdzialow?: number;
}

export interface PKDInfo {
    kod: string;
    opis: string;
    przewazajaca: boolean;
}

export interface KRSCompanyData {
    krs: string;
    nip: string;
    regon: string;
    nazwa: string;
    nazwaSkrocona?: string;
    formaOrganizacyjna: string;
    adres: KRSAddress;
    kapitalZakladowy: number;
    waluta: string;
    dataPowstania: string;
    dataRozpoczeciaDzialalnosci?: string;
    reprezentacja: {
        sposob: string;
        osoby: ReprezentantInfo[];
    };
    wspolnicy?: WspolnikInfo[];
    przedmiotDzialalnosci: PKDInfo[];
    organNadzoru?: ReprezentantInfo[];
    status: 'AKTYWNY' | 'WYKREŚLONY' | 'ZAWIESZONY';
}

// Financial Data Types
export interface FinancialData {
    rok: number;
    przychodyNetto: number;
    zyskBrutto: number;
    zyskNetto: number;
    sumaBilansowa: number;
    kapitalWlasny: number;
    zobowiazania: number;
    aktywaObrotowe: number;
    aktywaTrwale: number;
    zatrudnienie?: number;
}

// Risk Analysis Types
export interface RiskFactor {
    kategoria: 'finansowe' | 'operacyjne' | 'prawne' | 'rynkowe';
    tytul: string;
    opis: string;
    istotnosc: 'wysoka' | 'srednia' | 'niska';
}

// Document Generation Types
export interface MemorandumContext {
    // Company Info
    nazwa_spolki: string;
    nazwa_skrocona: string;
    nip: string;
    krs: string;
    regon: string;
    forma_prawna: string;

    // Address
    adres_pelny: string;
    ulica: string;
    kod_pocztowy: string;
    miejscowosc: string;

    // Capital
    kapital_zakladowy: string;
    waluta: string;

    // Dates
    data_powstania: string;
    data_generacji: string;

    // Management
    reprezentacja: ReprezentantInfo[];
    sposob_reprezentacji: string;

    // Business
    przedmiot_dzialalnosci: PKDInfo[];
    pkd_przewazajace: string;

    // Financials
    finanse: FinancialData[];
    przychody_ostatni_rok: string;
    zysk_ostatni_rok: string;
    suma_bilansowa: string;

    // AI Analysis
    ryzyka: RiskFactor[];
    podsumowanie_ai: string;
}

// API Response Types
export interface GenerateDocumentRequest {
    nip?: string;
    krs?: string;
}

export interface GenerateDocumentResponse {
    success: boolean;
    documentUrl?: string;
    error?: string;
}
