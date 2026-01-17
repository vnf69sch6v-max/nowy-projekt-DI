/**
 * Streaming Memorandum Generator - GEMINI (DARMOWY!)
 * Zoptymalizowany dla minimalnego zużycia tokenów
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================
// STRUKTURA SEKCJI
// ============================================

export interface SectionConfig {
    id: string;
    title: string;
    paragraph: string;
    subsections?: string[];
    requiresAI: boolean;
}

export const MEMORANDUM_SECTIONS: SectionConfig[] = [
    { id: 'intro', title: 'WSTĘP', paragraph: 'I', requiresAI: true, subsections: ['Spółka', 'Sprzedający', 'Papiery wartościowe', 'Zabezpieczenie', 'Cena', 'Oświadczenie', 'Podstawa prawna', 'Firma inwestycyjna', 'Ważność', 'Zmiany'] },
    { id: 'risks', title: 'CZYNNIKI RYZYKA', paragraph: 'II', requiresAI: true, subsections: ['Ryzyka działalności', 'Ryzyka finansowe', 'Ryzyka instrumentów'] },
    { id: 'responsible', title: 'OSOBY ODPOWIEDZIALNE', paragraph: 'III', requiresAI: false, subsections: ['Emitent', 'Firma inwestycyjna'] },
    { id: 'offer', title: 'DANE O OFERCIE AKCJI', paragraph: 'IV', requiresAI: true, subsections: ['Rodzaj papierów', 'Cele', 'Koszty', 'Podstawa prawna', 'Pierwszeństwo', 'Dywidenda', 'Prawa', 'Polityka', 'Opodatkowanie', 'Gwarancja', 'Dystrybucja'] },
    { id: 'issuer', title: 'DANE O EMITENCIE', paragraph: 'V', requiresAI: true, subsections: ['Dane podstawowe', 'Historia', 'Kapitały', 'Działalność', 'Zarząd', 'Akcjonariat'] },
    { id: 'financial', title: 'SPRAWOZDANIA FINANSOWE', paragraph: 'VI', requiresAI: true, subsections: ['Sprawozdanie', 'Bilans', 'Rachunek', 'Wskaźniki'] },
    { id: 'attachments', title: 'ZAŁĄCZNIKI', paragraph: 'VII', requiresAI: false, subsections: ['KRS', 'Statut', 'Uchwały', 'Formularze', 'Definicje'] },
];

// ============================================
// SPIS TREŚCI
// ============================================

export function generateTableOfContents(): string {
    let toc = 'SPIS TREŚCI\n\n';
    let page = 3;

    for (const section of MEMORANDUM_SECTIONS) {
        toc += `${section.paragraph}. ${section.title} ${'─'.repeat(Math.max(1, 70 - section.title.length))} ${page}\n`;
        if (section.subsections) {
            for (let i = 0; i < section.subsections.length; i++) {
                const sub = section.subsections[i];
                toc += `   ${i + 1}. ${sub} ${'─'.repeat(Math.max(1, 65 - sub.length))} ${page + i + 1}\n`;
            }
        }
        page += (section.subsections?.length || 0) + 5;
    }

    return toc;
}

// ============================================
// STREAMING Z GEMINI (DARMOWY!)
// ============================================

export async function* streamMemorandumSection(
    sectionId: string,
    company: KRSCompany,
    financials: FinancialData[]
): AsyncGenerator<string> {
    const section = MEMORANDUM_SECTIONS.find(s => s.id === sectionId);
    if (!section) {
        yield `[ERROR] Nieznana sekcja: ${sectionId}`;
        return;
    }

    // Sekcje bez AI
    if (!section.requiresAI) {
        if (sectionId === 'responsible') {
            yield* streamResponsiblePersons(company);
            return;
        }
        if (sectionId === 'attachments') {
            yield* streamAttachments();
            return;
        }
    }

    // Generuj z Gemini
    const prompt = generatePrompt(sectionId, company, financials);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) yield text;
        }
    } catch (error) {
        yield `\n[BŁĄD: ${error instanceof Error ? error.message : 'nieznany'}]\n`;
    }
}

// ============================================
// MINIMALNE PROMPTY
// ============================================

function generatePrompt(sectionId: string, company: KRSCompany, financials: FinancialData[]): string {
    const dane = `Spółka: ${company.nazwa}, KRS: ${company.krs}, Forma: ${company.formaOrganizacyjna}, Adres: ${company.siedzibaAdres}, Kapitał: ${company.kapitalZakladowy}zł, PKD: ${company.pkdPrzewazajace}, Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko}`).join(', ')}`;

    const fin = financials.length > 0
        ? `Finanse: ${financials.map(f => `${f.rok}: przych. ${f.przychodyNetto}, zysk ${f.zyskNetto}`).join('; ')}`
        : '';

    const prompts: Record<string, string> = {
        intro: `Napisz krótki WSTĘP memorandum dla: ${dane}. Zawrzyj: nazwę, siedzibę, oświadczenie o oferowaniu (art.37a ustawy o ofercie). Bez markdown, 3-4 akapity.`,
        risks: `Napisz CZYNNIKI RYZYKA dla: ${dane}. ${fin}. 5 ryzyk: 2 branżowe, 2 finansowe, 1 inwestycyjne. Numeruj 1-5. Bez markdown.`,
        offer: `Napisz DANE O OFERCIE dla: ${dane}. Gdzie brak danych pisz [DO UZUPEŁNIENIA]. Uwzględnij: rodzaj, cele, koszty, dystrybucja. Bez markdown.`,
        issuer: `Napisz DANE O EMITENCIE dla: ${dane}. ${fin}. Historia, działalność, zarząd, kapitały. Bez markdown.`,
        financial: `Napisz analizę finansową dla: ${dane}. ${fin}. Wskaźniki, komentarz. Bez markdown.`,
    };

    return prompts[sectionId] || `Napisz sekcję memorandum dla: ${dane}`;
}

// ============================================
// SEKCJE STATYCZNE (0 TOKENÓW)
// ============================================

async function* streamResponsiblePersons(company: KRSCompany): AsyncGenerator<string> {
    yield `${MEMORANDUM_SECTIONS[2].paragraph}. ${MEMORANDUM_SECTIONS[2].title}\n\n`;
    yield `1. EMITENT\n\n`;
    yield `Za informacje zawarte w memorandum odpowiada:\n\n`;
    yield `${company.nazwa}\n${company.siedzibaAdres}\n\n`;
    yield `Zarząd:\n`;
    for (const z of company.reprezentacja || []) {
        yield `- ${z.imie} ${z.nazwisko} (${z.funkcja})\n`;
    }
    yield `\nOŚWIADCZENIE:\n"Zgodnie z moją najlepszą wiedzą zawarte informacje są zgodne ze stanem faktycznym, prawdziwe, rzetelne i kompletne."\n\n`;
    yield `2. FIRMA INWESTYCYJNA\n[DO UZUPEŁNIENIA]\n`;
}

async function* streamAttachments(): AsyncGenerator<string> {
    yield `${MEMORANDUM_SECTIONS[6].paragraph}. ${MEMORANDUM_SECTIONS[6].title}\n\n`;
    const items = ['ODPIS KRS', 'STATUT', 'UCHWAŁY WZA', 'FORMULARZ ZAPISU', 'WYCOFANIE ZAPISU', 'DEFINICJE'];
    for (let i = 0; i < items.length; i++) {
        yield `${i + 1}. ${items[i]}\n`;
        await new Promise(r => setTimeout(r, 30));
    }
    yield `\nSkróty: KRS, KSH, NIP, REGON, PKD, WZA, PLN, ASO\n`;
}

// ============================================
// TABELKA FINANSOWA
// ============================================

export function formatFinancialTable(financials: FinancialData[]): string {
    if (!financials.length) return '[BRAK DANYCH FINANSOWYCH]';

    const fmt = (n: number) => n ? n.toLocaleString('pl-PL') : '-';
    const years = financials.map(f => f.rok.toString());

    let t = '\n┌─────────────────────────┬' + years.map(() => '────────────────┬').join('').slice(0, -1) + '┐\n';
    t += '│ Pozycja                 │' + years.map(y => ` ${y.padStart(14)} │`).join('') + '\n';
    t += '├─────────────────────────┼' + years.map(() => '────────────────┼').join('').slice(0, -1) + '┤\n';

    const rows: [string, string[]][] = [
        ['Przychody netto', financials.map(f => fmt(f.przychodyNetto))],
        ['Zysk netto', financials.map(f => fmt(f.zyskNetto))],
        ['Suma bilansowa', financials.map(f => fmt(f.sumaBilansowa))],
        ['Kapitał własny', financials.map(f => fmt(f.kapitalWlasny))],
    ];

    for (const [label, vals] of rows) {
        t += `│ ${label.padEnd(23)} │` + vals.map(v => ` ${v.padStart(14)} │`).join('') + '\n';
    }

    t += '└─────────────────────────┴' + years.map(() => '────────────────┴').join('').slice(0, -1) + '┘\n';
    return t;
}
