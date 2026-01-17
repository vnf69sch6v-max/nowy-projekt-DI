/**
 * Profesjonalny generator memorandum - Claude Sonnet 4
 * Zgodny z rozporządzeniem Dz.U. 2020.1053 (§7-§17)
 * Sekcyjne generowanie dla minimalnego zużycia tokenów
 */

import Anthropic from '@anthropic-ai/sdk';
import { KRSCompany, FinancialData } from '@/types';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-sonnet-4-20250514';

// ============================================
// STRUKTURA SEKCJI (§7)
// ============================================

export interface MemorandumSection {
    id: string;
    title: string;
    paragraph: string;
    content: string;
}

// ============================================
// §8 - WSTĘP
// ============================================

export async function generateIntro(company: KRSCompany): Promise<string> {
    const prompt = `Napisz WSTĘP memorandum informacyjnego zgodnie z §8 rozporządzenia.

DANE:
- Firma: ${company.nazwa}
- Forma: ${company.formaOrganizacyjna}
- Siedziba: ${company.siedzibaAdres}
- KRS: ${company.krs}
- Data: ${new Date().toLocaleDateString('pl-PL')}

WYMAGANIA §8 (zamieść DOKŁADNIE):
1. Tytuł "MEMORANDUM INFORMACYJNE"
2. Firma i siedziba emitenta
3. Stwierdzenie: "Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w memorandum. Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym informacje o papierach wartościowych, ich ofercie i emitencie."
4. Podstawa prawna (art. 37a ustawy o ofercie publicznej)
5. Data sporządzenia

Napisz 3-4 profesjonalne akapity. Tylko tekst, bez formatowania markdown.`;

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ============================================
// §9 - CZYNNIKI RYZYKA
// ============================================

export async function generateRisks(
    company: KRSCompany,
    financials: FinancialData[]
): Promise<string> {
    const lastYear = financials[financials.length - 1];
    const rentownosc = lastYear ? ((lastYear.zyskNetto / lastYear.przychodyNetto) * 100).toFixed(1) : 'brak danych';
    const zadluzenie = lastYear ? ((lastYear.zobowiazania / lastYear.sumaBilansowa) * 100).toFixed(1) : 'brak danych';

    const prompt = `Napisz rozdział "CZYNNIKI RYZYKA" zgodnie z §9 rozporządzenia.

DANE SPÓŁKI:
- Nazwa: ${company.nazwa}
- Branża: ${company.pkdPrzewazajace}
- Kapitał: ${company.kapitalZakladowy} PLN
- Rentowność: ${rentownosc}%
- Zadłużenie: ${zadluzenie}%
- Zarząd: ${company.reprezentacja?.length || 1} osób

WYMAGANIA §9:
Zamieść informacje o czynnikach ryzyka dla nabywcy papierów wartościowych:
1. Czynniki związane z sytuacją FINANSOWĄ emitenta
2. Czynniki związane z OTOCZENIEM (rynek, konkurencja, regulacje)
3. Inne czynniki istotne dla oceny emisji

FORMAT: Każde ryzyko jako osobny akapit z nagłówkiem.
Napisz 5-7 konkretnych ryzyk opartych na danych. Bez markdown.`;

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ============================================
// §10 - OSOBY ODPOWIEDZIALNE
// ============================================

export function generateResponsiblePersons(company: KRSCompany): string {
    // Ta sekcja nie wymaga AI - używamy szablonu z danymi
    const zarzad = company.reprezentacja || [];

    let content = `OSOBY ODPOWIEDZIALNE ZA INFORMACJE ZAWARTE W MEMORANDUM

Zgodnie z §10 rozporządzenia, za informacje zawarte w niniejszym memorandum odpowiadają:

`;

    if (zarzad.length > 0) {
        zarzad.forEach((osoba, i) => {
            content += `${i + 1}. ${osoba.imie} ${osoba.nazwisko} - ${osoba.funkcja}\n`;
        });
    } else {
        content += `1. Zarząd ${company.nazwa}\n`;
    }

    content += `
OŚWIADCZENIE:

"Zgodnie z moją najlepszą wiedzą zawarte w memorandum informacje są zgodne ze stanem faktycznym i memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie, w szczególności zawarte w nim informacje są prawdziwe, rzetelne i kompletne."

`;

    return content;
}

// ============================================
// §11-12 - DANE O EMISJI
// ============================================

export async function generateEmissionData(company: KRSCompany): Promise<string> {
    const prompt = `Napisz rozdział "DANE O EMISJI" zgodnie z §11-12 rozporządzenia.

DANE:
- Emitent: ${company.nazwa}
- Forma: ${company.formaOrganizacyjna}
- Kapitał zakładowy: ${company.kapitalZakladowy} PLN

WYMAGANIA §11-12 (uwzględnij):
1. Rodzaj, liczba i wartość papierów wartościowych
2. Cele emisji i planowane wpływy
3. Szacunkowe koszty emisji
4. Podstawa prawna emisji (organ, data decyzji)
5. Zasady dystrybucji (terminy, miejsca, zasady zapisów)

UWAGA: Gdzie brak konkretnych danych, napisz "[DO UZUPEŁNIENIA]".
Napisz profesjonalnie, 4-5 akapitów. Bez markdown.`;

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ============================================
// §13-14 - DANE O EMITENCIE
// ============================================

export async function generateIssuerData(company: KRSCompany): Promise<string> {
    const wspolnicy = company.wspolnicy?.map(w => `${w.nazwa}: ${w.udzialy || '?'}%`).join(', ') || 'brak danych';
    const pkd = company.pkd?.map(p => `${p.kod} - ${p.opis}`).join('; ') || company.pkdPrzewazajace;

    const prompt = `Napisz rozdział "DANE O EMITENCIE" zgodnie z §13-14 rozporządzenia.

DANE REJESTROWE:
- Firma: ${company.nazwa}
- Forma prawna: ${company.formaOrganizacyjna}
- Siedziba: ${company.siedzibaAdres}
- KRS: ${company.krs}
- NIP: ${company.nip}
- REGON: ${company.regon}
- Data powstania: ${company.dataPowstania}

KAPITAŁ I WŁASNOŚĆ:
- Kapitał zakładowy: ${company.kapitalZakladowy} PLN
- Wspólnicy/Akcjonariusze: ${wspolnicy}

DZIAŁALNOŚĆ:
- PKD: ${pkd}
- Przeważająca: ${company.pkdPrzewazajace}

ZARZĄD:
${company.reprezentacja?.map(z => `- ${z.imie} ${z.nazwisko}: ${z.funkcja}`).join('\n') || '- brak danych'}
- Sposób reprezentacji: ${company.sposobReprezentacji}

WYMAGANIA §13-14:
1. Pełne dane rejestrowe
2. Kapitały własne i zasady ich tworzenia
3. Historia emitenta
4. Podstawowa działalność
5. Organy spółki i sposób reprezentacji
6. Struktura akcjonariatu (>5% głosów)

Napisz profesjonalnie, 5-6 akapitów. Bez markdown.`;

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ============================================
// §15 - SPRAWOZDANIA FINANSOWE
// ============================================

export async function generateFinancialReport(
    company: KRSCompany,
    financials: FinancialData[]
): Promise<string> {
    if (financials.length === 0) {
        return `SPRAWOZDANIA FINANSOWE

Zgodnie z §15 rozporządzenia, w rozdziale tym powinno znajdować się sprawozdanie finansowe emitenta za ostatni rok obrotowy, obejmujące dane porównawcze, sporządzone zgodnie z przepisami i zbadane przez biegłego rewidenta.

[DANE FINANSOWE DO UZUPEŁNIENIA]

Emitent zobowiązuje się do udostępnienia pełnego sprawozdania finansowego na żądanie inwestora.`;
    }

    const finTable = financials.map(f =>
        `Rok ${f.rok}: Przychody ${(f.przychodyNetto / 1000).toFixed(0)}tys., Zysk netto ${(f.zyskNetto / 1000).toFixed(0)}tys., Suma bilansowa ${(f.sumaBilansowa / 1000).toFixed(0)}tys.`
    ).join('\n');

    const prompt = `Napisz rozdział "SPRAWOZDANIA FINANSOWE" zgodnie z §15 rozporządzenia.

DANE FINANSOWE ${company.nazwa}:
${finTable}

WYMAGANIA §15:
1. Omówienie sprawozdania za ostatni rok obrotowy
2. Dane porównawcze
3. Komentarz do sytuacji finansowej
4. Wskaźniki (płynność, rentowność, zadłużenie)

Napisz profesjonalną analizę, 3-4 akapity. Bez markdown.`;

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ============================================
// §16 - ZAŁĄCZNIKI
// ============================================

export function generateAttachments(): string {
    return `ZAŁĄCZNIKI

Zgodnie z §16 rozporządzenia, do memorandum dołącza się:

1. ODPIS Z KRAJOWEGO REJESTRU SĄDOWEGO
   Aktualny odpis z KRS został załączony do niniejszego memorandum.

2. STATUT EMITENTA
   Aktualny tekst statutu spółki jest dostępny w siedzibie emitenta oraz na stronie internetowej.

3. DEFINICJE I OBJAŚNIENIA SKRÓTÓW
   
   KRS - Krajowy Rejestr Sądowy
   KSH - Kodeks Spółek Handlowych
   NIP - Numer Identyfikacji Podatkowej
   REGON - Rejestr Gospodarki Narodowej
   PKD - Polska Klasyfikacja Działalności
   WZA - Walne Zgromadzenie Akcjonariuszy
   PLN - Polski Złoty
`;
}

// ============================================
// GŁÓWNY GENERATOR
// ============================================

export interface GeneratedMemorandum {
    sections: MemorandumSection[];
    generatedAt: Date;
    tokensUsed: number;
}

export async function generateFullMemorandum(
    company: KRSCompany,
    financials: FinancialData[]
): Promise<GeneratedMemorandum> {
    console.log('📄 Generating professional memorandum for:', company.nazwa);

    const sections: MemorandumSection[] = [];
    let tokensUsed = 0;

    // §8 - Wstęp
    console.log('  → Generating §8 Wstęp...');
    const intro = await generateIntro(company);
    sections.push({ id: 'intro', title: 'WSTĘP', paragraph: '§8', content: intro });
    tokensUsed += 500;

    // Delay for rate limiting
    await new Promise(r => setTimeout(r, 1000));

    // §9 - Czynniki ryzyka
    console.log('  → Generating §9 Czynniki ryzyka...');
    const risks = await generateRisks(company, financials);
    sections.push({ id: 'risks', title: 'CZYNNIKI RYZYKA', paragraph: '§9', content: risks });
    tokensUsed += 800;

    await new Promise(r => setTimeout(r, 1000));

    // §10 - Osoby odpowiedzialne (template)
    console.log('  → Generating §10 Osoby odpowiedzialne...');
    const responsible = generateResponsiblePersons(company);
    sections.push({ id: 'responsible', title: 'OSOBY ODPOWIEDZIALNE', paragraph: '§10', content: responsible });

    // §11-12 - Dane o emisji
    console.log('  → Generating §11-12 Dane o emisji...');
    const emission = await generateEmissionData(company);
    sections.push({ id: 'emission', title: 'DANE O EMISJI', paragraph: '§11-12', content: emission });
    tokensUsed += 600;

    await new Promise(r => setTimeout(r, 1000));

    // §13-14 - Dane o emitencie
    console.log('  → Generating §13-14 Dane o emitencie...');
    const issuer = await generateIssuerData(company);
    sections.push({ id: 'issuer', title: 'DANE O EMITENCIE', paragraph: '§13-14', content: issuer });
    tokensUsed += 800;

    await new Promise(r => setTimeout(r, 1000));

    // §15 - Sprawozdania finansowe
    console.log('  → Generating §15 Sprawozdania finansowe...');
    const financial = await generateFinancialReport(company, financials);
    sections.push({ id: 'financial', title: 'SPRAWOZDANIA FINANSOWE', paragraph: '§15', content: financial });
    tokensUsed += 500;

    // §16 - Załączniki (template)
    console.log('  → Generating §16 Załączniki...');
    const attachments = generateAttachments();
    sections.push({ id: 'attachments', title: 'ZAŁĄCZNIKI', paragraph: '§16', content: attachments });

    console.log(`✅ Memorandum generated. Estimated tokens: ${tokensUsed}`);

    return {
        sections,
        generatedAt: new Date(),
        tokensUsed,
    };
}
