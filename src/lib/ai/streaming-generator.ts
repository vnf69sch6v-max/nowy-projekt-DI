/**
 * Streaming Memorandum Generator - Firebase Vertex AI
 * Każda sekcja generowana przez AI krok po kroku
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { KRSCompany, FinancialData } from '@/types';

// Firebase config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function getFirebaseApp() {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

// ============================================
// STRUKTURA MEMORANDUM
// ============================================

export interface SectionConfig {
    id: string;
    title: string;
    paragraph: string;
    subsections: string[];
    requiresAI: boolean;
}

export const MEMORANDUM_SECTIONS: SectionConfig[] = [
    {
        id: 'intro',
        title: 'WSTĘP',
        paragraph: 'I',
        requiresAI: true,
        subsections: [
            'Spółka, której akcje są przedmiotem oferty publicznej',
            'Liczba, rodzaj i wartość nominalna papierów wartościowych',
            'Cena emisyjna lub sposób jej ustalenia',
            'Podstawa prawna oferty publicznej',
            'Data ważności memorandum',
        ],
    },
    {
        id: 'risks',
        title: 'CZYNNIKI RYZYKA',
        paragraph: 'II',
        requiresAI: true,
        subsections: [
            'Ryzyka związane z działalnością emitenta',
            'Ryzyka finansowe',
            'Ryzyka związane z papierami wartościowymi',
        ],
    },
    {
        id: 'responsible',
        title: 'OSOBY ODPOWIEDZIALNE',
        paragraph: 'III',
        requiresAI: false,
        subsections: ['Emitent', 'Oświadczenie'],
    },
    {
        id: 'offer',
        title: 'DANE O OFERCIE AKCJI',
        paragraph: 'IV',
        requiresAI: true,
        subsections: [
            'Szczegóły oferowanych papierów wartościowych',
            'Cele emisji',
            'Koszty emisji',
            'Zasady dystrybucji',
        ],
    },
    {
        id: 'issuer',
        title: 'DANE O EMITENCIE',
        paragraph: 'V',
        requiresAI: true,
        subsections: [
            'Podstawowe dane rejestrowe',
            'Historia i działalność',
            'Kapitały własne',
            'Zarząd i rada nadzorcza',
            'Struktura akcjonariatu',
        ],
    },
    {
        id: 'financial',
        title: 'SPRAWOZDANIA FINANSOWE',
        paragraph: 'VI',
        requiresAI: true,
        subsections: [
            'Wybrane dane finansowe',
            'Analiza sytuacji finansowej',
        ],
    },
    {
        id: 'attachments',
        title: 'ZAŁĄCZNIKI',
        paragraph: 'VII',
        requiresAI: false,
        subsections: ['Lista załączników', 'Definicje'],
    },
];

// ============================================
// SPIS TREŚCI
// ============================================

export function generateTableOfContents(): string {
    let toc = 'Spis treści\n\n';
    for (const section of MEMORANDUM_SECTIONS) {
        toc += `${section.paragraph}. ${section.title}\n`;
        for (let i = 0; i < section.subsections.length; i++) {
            toc += `   ${i + 1}. ${section.subsections[i]}\n`;
        }
        toc += '\n';
    }
    return toc;
}

// ============================================
// STREAMING SEKCJI Z AI
// ============================================

export async function* streamMemorandumSection(
    sectionId: string,
    company: KRSCompany,
    financials: FinancialData[]
): AsyncGenerator<string> {
    const section = MEMORANDUM_SECTIONS.find(s => s.id === sectionId);
    if (!section) {
        yield `[BŁĄD] Nieznana sekcja: ${sectionId}`;
        return;
    }

    // Sekcje statyczne
    if (!section.requiresAI) {
        if (sectionId === 'responsible') {
            yield* generateResponsibleSection(company);
            return;
        }
        if (sectionId === 'attachments') {
            yield* generateAttachmentsSection();
            return;
        }
    }

    // Sekcje z AI
    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });

        const prompt = generateSectionPrompt(sectionId, section, company, financials);

        console.log(`🤖 Generating section ${sectionId} with AI...`);

        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) yield text;
        }
    } catch (error) {
        console.error(`Section ${sectionId} error:`, error);
        yield `\n[BŁĄD GENEROWANIA: ${error instanceof Error ? error.message : 'nieznany'}]\n`;
    }
}

// ============================================
// PROMPTY DLA SEKCJI
// ============================================

function generateSectionPrompt(
    sectionId: string,
    section: SectionConfig,
    company: KRSCompany,
    financials: FinancialData[]
): string {
    const companyData = `
DANE SPÓŁKI:
- Nazwa: ${company.nazwa}
- KRS: ${company.krs}
- NIP: ${company.nip}
- REGON: ${company.regon}
- Forma prawna: ${company.formaOrganizacyjna}
- Adres: ${company.siedzibaAdres}
- Kapitał zakładowy: ${company.kapitalZakladowy?.toLocaleString('pl-PL')} PLN
- PKD: ${company.pkdPrzewazajace}
- Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko} (${z.funkcja})`).join(', ')}
- Sposób reprezentacji: ${company.sposobReprezentacji}
`;

    const finData = financials.length > 0
        ? `\nDANE FINANSOWE:\n${financials.map(f =>
            `Rok ${f.rok}: Przychody ${f.przychodyNetto?.toLocaleString('pl-PL')} PLN, ` +
            `Zysk netto ${f.zyskNetto?.toLocaleString('pl-PL')} PLN, ` +
            `Suma bilansowa ${f.sumaBilansowa?.toLocaleString('pl-PL')} PLN, ` +
            `Kapitał własny ${f.kapitalWlasny?.toLocaleString('pl-PL')} PLN, ` +
            `Zobowiązania ${f.zobowiazania?.toLocaleString('pl-PL')} PLN`
        ).join('\n')}`
        : '';

    const subsectionsText = section.subsections.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const sectionPrompts: Record<string, string> = {
        intro: `Napisz szczegółowy rozdział WSTĘP memorandum informacyjnego dla spółki akcyjnej.

${companyData}

WYMAGANE PODSEKCJE:
${subsectionsText}

ZASADY:
- Pisz profesjonalnym językiem prawniczym, formalnym
- Podaj dokładne dane spółki (nazwa, KRS, NIP, adres)
- Opisz przedmiot oferty publicznej
- Powołaj się na art. 37a ustawy o ofercie publicznej
- Gdzie brak konkretnych danych o emisji, wpisz [DO UZUPEŁNIENIA]
- Format: czyste numerowane sekcje, bez markdown`,

        risks: `Napisz szczegółowy rozdział CZYNNIKI RYZYKA memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE KATEGORIE:
${subsectionsText}

ZASADY:
- Opisz minimum 3-4 konkretne ryzyka w każdej kategorii
- Ryzyka operacyjne: konkurencja, kadry, technologia, regulacje branżowe
- Ryzyka finansowe: płynność, zadłużenie, wahania kursu, stopy procentowe
- Ryzyka inwestycyjne: brak gwarancji zysku, płynność akcji, rozwodnienie
- Pisz szczegółowo i profesjonalnie
- Format: numerowane podsekcje`,

        offer: `Napisz szczegółowy rozdział DANE O OFERCIE AKCJI memorandum informacyjnego.

${companyData}

WYMAGANE PODSEKCJE:
${subsectionsText}

ZASADY:
- Opisz rodzaj oferowanych akcji (zwykłe na okaziciela)
- Gdzie brak danych o liczbie akcji i cenie, wpisz [DO UZUPEŁNIENIA]
- Opisz typowe cele emisji (rozwój, inwestycje, kapitał obrotowy)
- Opisz szacunkowe koszty emisji
- Opisz zasady dystrybucji i terminy
- Format: profesjonalny, numerowany`,

        issuer: `Napisz szczegółowy rozdział DANE O EMITENCIE memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE PODSEKCJE:
${subsectionsText}

ZASADY:
- Podaj wszystkie dane rejestrowe szczegółowo
- Opisz historię i profil działalności spółki
- Przedstaw strukturę kapitałów
- Wymień członków zarządu z funkcjami
- Gdzie brak danych o akcjonariacie, wpisz [DO UZUPEŁNIENIA]
- Format: profesjonalny, szczegółowy`,

        financial: `Napisz rozdział SPRAWOZDANIA FINANSOWE memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE ELEMENTY:
${subsectionsText}

ZASADY:
- Przedstaw dane finansowe w formie tabeli
- Skomentuj tendencje (wzrost/spadek przychodów, zysków)
- Oceń płynność i wypłacalność na podstawie danych
- Wskaż mocne strony finansowe
- Wskaż potencjalne zagrożenia
- Format: tabela + analiza opisowa`,
    };

    return sectionPrompts[sectionId] || `Napisz sekcję ${section.title} memorandum.\n${companyData}`;
}

// ============================================
// SEKCJE STATYCZNE
// ============================================

async function* generateResponsibleSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. EMITENT

Za informacje zawarte w niniejszym memorandum informacyjnym odpowiada:

${c.nazwa}
${c.siedzibaAdres}
KRS: ${c.krs}, NIP: ${c.nip}, REGON: ${c.regon}

Osoby działające w imieniu Emitenta:
`;
    for (const z of c.reprezentacja || []) {
        yield `- ${z.imie} ${z.nazwisko} - ${z.funkcja}\n`;
    }
    yield `
2. OŚWIADCZENIE EMITENTA

"Zgodnie z naszą najlepszą wiedzą i przy dołożeniu należytej staranności, 
informacje zawarte w memorandum są prawdziwe, rzetelne i zgodne ze stanem 
faktycznym, a memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie."

Podpisy osób odpowiedzialnych:
`;
    for (const z of c.reprezentacja || []) {
        yield `\n___________________________\n${z.imie} ${z.nazwisko}\n${z.funkcja}\n`;
    }
}

async function* generateAttachmentsSection(): AsyncGenerator<string> {
    yield `1. LISTA ZAŁĄCZNIKÓW

Do niniejszego memorandum informacyjnego załączono:

1.1. Odpis aktualny z Krajowego Rejestru Sądowego
1.2. Tekst jednolity statutu Spółki
1.3. Uchwały Walnego Zgromadzenia dotyczące emisji akcji
1.4. Wzór formularza zapisu na akcje
1.5. Wzór oświadczenia o odstąpieniu od zapisu

2. DEFINICJE I SKRÓTY

ASO - Alternatywny System Obrotu
GPW - Giełda Papierów Wartościowych w Warszawie S.A.
KDPW - Krajowy Depozyt Papierów Wartościowych S.A.
KNF - Komisja Nadzoru Finansowego
KRS - Krajowy Rejestr Sądowy
KSH - Kodeks Spółek Handlowych
NewConnect - rynek NewConnect prowadzony przez GPW
NIP - Numer Identyfikacji Podatkowej
PKD - Polska Klasyfikacja Działalności
PLN - Polski Złoty
REGON - Rejestr Gospodarki Narodowej
WZA - Walne Zgromadzenie Akcjonariuszy
`;
}

// ============================================
// FORMATOWANIE TABELI FINANSOWEJ
// ============================================

export function formatFinancialTable(financials: FinancialData[]): string {
    if (!financials.length) return '[BRAK DANYCH FINANSOWYCH]\n';

    const fmt = (n: number) => n ? n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
    const years = financials.map(f => f.rok.toString());

    let t = 'Wybrane dane finansowe (w PLN):\n\n';
    t += '+-------------------------+' + years.map(() => '----------------+').join('') + '\n';
    t += '| Pozycja                 |' + years.map(y => ` ${y.padStart(14)} |`).join('') + '\n';
    t += '+-------------------------+' + years.map(() => '----------------+').join('') + '\n';

    const rows: [string, string[]][] = [
        ['Przychody netto', financials.map(f => fmt(f.przychodyNetto))],
        ['Zysk (strata) netto', financials.map(f => fmt(f.zyskNetto))],
        ['Suma bilansowa', financials.map(f => fmt(f.sumaBilansowa))],
        ['Kapitał własny', financials.map(f => fmt(f.kapitalWlasny))],
        ['Zobowiązania', financials.map(f => fmt(f.zobowiazania))],
    ];

    for (const [label, vals] of rows) {
        t += `| ${label.padEnd(23)} |` + vals.map(v => ` ${v.padStart(14)} |`).join('') + '\n';
    }

    t += '+-------------------------+' + years.map(() => '----------------+').join('') + '\n';
    return t;
}
