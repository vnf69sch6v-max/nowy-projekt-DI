/**
 * Streaming Memorandum Generator
 * Real-time generation with Server-Sent Events
 */

import Anthropic from '@anthropic-ai/sdk';
import { KRSCompany, FinancialData } from '@/types';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-sonnet-4-20250514';

// ============================================
// STRUKTURA SEKCJI (zgodna z przykładowym memorandum)
// ============================================

export interface SectionConfig {
    id: string;
    title: string;
    paragraph: string;
    subsections?: string[];
    requiresAI: boolean;
    maxTokens: number;
}

export const MEMORANDUM_SECTIONS: SectionConfig[] = [
    {
        id: 'intro',
        title: 'WSTĘP',
        paragraph: 'I',
        subsections: [
            'Spółka, której akcje są przedmiotem oferty publicznej',
            'Nazwa i siedziba sprzedającego',
            'Liczba, rodzaj i wartość nominalna papierów wartościowych',
            'Podmiot udzielający zabezpieczenia',
            'Cena emisyjna oferowanych papierów',
            'Stwierdzenie o oferowaniu papierów wartościowych',
            'Podstawa prawna prowadzenia oferty',
            'Firma inwestycyjna pośrednicząca w ofercie',
            'Data ważności memorandum',
            'Tryb informowania o zmianach',
        ],
        requiresAI: true,
        maxTokens: 1500,
    },
    {
        id: 'risks',
        title: 'CZYNNIKI RYZYKA',
        paragraph: 'II',
        subsections: [
            'Czynniki ryzyka związane z działalnością i branżą',
            'Czynniki ryzyka o charakterze finansowym',
            'Czynniki ryzyka związane z instrumentami finansowymi',
        ],
        requiresAI: true,
        maxTokens: 3000,
    },
    {
        id: 'responsible',
        title: 'OSOBY ODPOWIEDZIALNE ZA INFORMACJE ZAWARTE W MEMORANDUM',
        paragraph: 'III',
        subsections: ['Emitent', 'Firma inwestycyjna'],
        requiresAI: false,
        maxTokens: 500,
    },
    {
        id: 'offer',
        title: 'DANE O OFERCIE AKCJI',
        paragraph: 'IV',
        subsections: [
            'Rodzaje, liczba i wartość papierów wartościowych',
            'Cele emisji',
            'Koszty emisji',
            'Podstawa prawna emisji',
            'Prawo pierwszeństwa',
            'Dywidenda',
            'Prawa z papierów wartościowych',
            'Polityka dywidendowa',
            'Zasady opodatkowania',
            'Umowy o gwarancję emisji',
            'Zasady dystrybucji',
        ],
        requiresAI: true,
        maxTokens: 2500,
    },
    {
        id: 'issuer',
        title: 'DANE O EMITENCIE',
        paragraph: 'V',
        subsections: [
            'Podstawowe dane o emitencie',
            'Czas trwania emitenta',
            'Przepisy prawa tworzące emitenta',
            'Sąd rejestrowy',
            'Krótki opis historii emitenta',
            'Kapitały własne emitenta',
            'Informacje o nieopłaconej części kapitału',
            'Przewidywane zmiany kapitału',
            'Kapitał docelowy',
            'Notowania papierów wartościowych',
            'Rating',
            'Powiązania organizacyjne i kapitałowe',
            'Podstawowe produkty i usługi',
            'Główne inwestycje',
            'Postępowania sądowe i administracyjne',
            'Zobowiązania emitenta',
            'Nietypowe zdarzenia',
            'Istotne zmiany po sporządzeniu sprawozdania',
            'Prognozy wyników',
            'Osoby zarządzające i nadzorujące',
            'Struktura akcjonariatu',
        ],
        requiresAI: true,
        maxTokens: 4000,
    },
    {
        id: 'financial',
        title: 'SPRAWOZDANIA FINANSOWE EMITENTA',
        paragraph: 'VI',
        subsections: [
            'Sprawozdanie zarządu z działalności',
            'Sprawozdanie finansowe',
            'Opinie biegłego rewidenta',
            'Skrócone sprawozdanie kwartalne',
        ],
        requiresAI: true,
        maxTokens: 2000,
    },
    {
        id: 'attachments',
        title: 'ZAŁĄCZNIKI',
        paragraph: 'VII',
        subsections: [
            'Odpis z Krajowego Rejestru Sądowego',
            'Statut',
            'Uchwały Walnego Zgromadzenia',
            'Wzór formularza zapisu na akcje',
            'Wzór oświadczenia o wycofaniu zapisu',
            'Definicje i objaśnienia skrótów',
        ],
        requiresAI: false,
        maxTokens: 500,
    },
];

// ============================================
// GENEROWANIE SPISU TREŚCI
// ============================================

export function generateTableOfContents(): string {
    let toc = 'SPIS TREŚCI\n\n';
    let pageNum = 3;

    for (const section of MEMORANDUM_SECTIONS) {
        toc += `${section.paragraph}. ${section.title} ${'─'.repeat(80 - section.title.length - 10)} ${pageNum}\n`;

        if (section.subsections) {
            for (let i = 0; i < section.subsections.length; i++) {
                const sub = section.subsections[i];
                toc += `   ${i + 1}. ${sub} ${'─'.repeat(75 - sub.length - 10)} ${pageNum + i + 1}\n`;
            }
        }

        pageNum += (section.subsections?.length || 0) + 5;
    }

    return toc;
}

// ============================================
// STREAMING GENERATOR
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

    // Generuj prompt dla sekcji
    const prompt = generateSectionPrompt(sectionId, section, company, financials);

    // Stream z Claude
    const stream = await anthropic.messages.stream({
        model: MODEL,
        max_tokens: section.maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
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
- Forma: ${company.formaOrganizacyjna}
- Siedziba: ${company.siedzibaAdres}
- KRS: ${company.krs}
- NIP: ${company.nip}
- REGON: ${company.regon}
- Kapitał: ${company.kapitalZakladowy} PLN
- Data powstania: ${company.dataPowstania}
- PKD: ${company.pkdPrzewazajace}
- Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko} (${z.funkcja})`).join(', ')}
- Reprezentacja: ${company.sposobReprezentacji}
`;

    const finData = financials.length > 0 ? `
DANE FINANSOWE:
${financials.map(f => `Rok ${f.rok}: Przychody ${f.przychodyNetto}, Zysk ${f.zyskNetto}, Bilans ${f.sumaBilansowa}`).join('\n')}
` : '';

    const prompts: Record<string, string> = {
        intro: `Napisz rozdział "${section.title}" memorandum informacyjnego.

${companyData}

WYMAGANE PODSEKCJE (ponumeruj 1-10):
${section.subsections?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

WAŻNE:
- Użyj DOKŁADNEGO stwierdzenia: "Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w memorandum. Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym informacje o papierach wartościowych, ich ofercie i emitencie."
- Podstawa prawna: art. 37a ustawy o ofercie publicznej
- Gdzie brak danych, wpisz [DO UZUPEŁNIENIA]
- Pisz profesjonalnym językiem prawniczym
- NIE używaj markdown, tylko czysty tekst z numeracją`,

        risks: `Napisz rozdział "${section.title}" memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE KATEGORIE RYZYK:
1. CZYNNIKI RYZYKA ZWIĄZANE Z DZIAŁALNOŚCIĄ I BRANŻĄ
   - Minimum 5-7 szczegółowych ryzyk dla branży ${company.pkdPrzewazajace}
   
2. CZYNNIKI RYZYKA O CHARAKTERZE FINANSOWYM  
   - Analiza na podstawie danych finansowych
   - Ryzyko płynności, zadłużenia, rentowności
   
3. CZYNNIKI RYZYKA ZWIĄZANE Z INSTRUMENTAMI FINANSOWYMI
   - Ryzyko inwestycji w akcje
   - Ryzyko płynności obrotu
   - Ryzyko braku dywidendy

Każde ryzyko opisz w 2-3 akapitach. Numeruj: 1.1, 1.2, 2.1, 2.2, 3.1, itd.
Pisz profesjonalnie, bez markdown.`,

        offer: `Napisz rozdział "${section.title}" memorandum informacyjnego.

${companyData}

WYMAGANE PODSEKCJE (ponumeruj 1-11):
${section.subsections?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Gdzie brak konkretnych danych o emisji, wpisz [DO UZUPEŁNIENIA].
Opisz procedury, terminy, zasady zapisów zgodnie z rozporządzeniem.
Pisz profesjonalnie, bez markdown.`,

        issuer: `Napisz rozdział "${section.title}" memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE PODSEKCJE (ponumeruj 1-22):
${section.subsections?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

WAŻNE:
- Dla osób zarządzających podaj: imię, nazwisko, stanowisko, kadencja, wykształcenie, doświadczenie
- Dla struktury akcjonariatu: wskaż akcjonariuszy >5%
- Opisz szczegółowo działalność na podstawie PKD
Pisz profesjonalnie, bez markdown.`,

        financial: `Napisz rozdział "${section.title}" memorandum informacyjnego.

${companyData}
${finData}

WYMAGANE ELEMENTY:
1. Wprowadzenie do sprawozdań finansowych
2. Analiza kluczowych pozycji (przychody, koszty, wynik)
3. Analiza bilansu (aktywa, pasywa, kapitały)
4. Wskaźniki finansowe (płynność, rentowność, zadłużenie)
5. Komentarz do sytuacji finansowej

Dane finansowe przedstaw w formie opisowej z odniesieniem do konkretnych liczb.
Pisz profesjonalnie, bez markdown.`,
    };

    return prompts[sectionId] || `Napisz sekcję "${section.title}" memorandum informacyjnego.\n${companyData}`;
}

// ============================================
// SEKCJE BEZ AI
// ============================================

async function* streamResponsiblePersons(company: KRSCompany): AsyncGenerator<string> {
    yield `${MEMORANDUM_SECTIONS[2].paragraph}. ${MEMORANDUM_SECTIONS[2].title}\n\n`;
    yield `1. EMITENT\n\n`;
    yield `Za informacje zawarte w niniejszym memorandum odpowiada:\n\n`;
    yield `${company.nazwa}\n`;
    yield `${company.siedzibaAdres}\n\n`;
    yield `Osoby działające w imieniu Emitenta:\n\n`;

    const zarzad = company.reprezentacja || [];
    for (let i = 0; i < zarzad.length; i++) {
        yield `${i + 1}. ${zarzad[i].imie} ${zarzad[i].nazwisko} - ${zarzad[i].funkcja}\n`;
    }

    yield `\nOŚWIADCZENIE EMITENTA:\n\n`;
    yield `"Zgodnie z moją najlepszą wiedzą zawarte w memorandum informacje są zgodne ze stanem faktycznym `;
    yield `i memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie, `;
    yield `w szczególności zawarte w nim informacje są prawdziwe, rzetelne i kompletne."\n\n`;

    yield `2. FIRMA INWESTYCYJNA\n\n`;
    yield `[DO UZUPEŁNIENIA - dane firmy inwestycyjnej pośredniczącej w ofercie]\n`;
}

async function* streamAttachments(): AsyncGenerator<string> {
    yield `${MEMORANDUM_SECTIONS[6].paragraph}. ${MEMORANDUM_SECTIONS[6].title}\n\n`;

    const attachments = [
        'ODPIS Z KRAJOWEGO REJESTRU SĄDOWEGO\n   Aktualny odpis z KRS stanowi załącznik do niniejszego memorandum.',
        'STATUT\n   Aktualny tekst jednolity statutu Spółki stanowi załącznik do niniejszego memorandum.',
        'UCHWAŁY WALNEGO ZGROMADZENIA\n   Treść uchwał WZA dotyczących emisji akcji stanowi załącznik do niniejszego memorandum.',
        'WZÓR FORMULARZA ZAPISU NA AKCJE\n   Wzór formularza zapisu stanowi załącznik do niniejszego memorandum.',
        'WZÓR OŚWIADCZENIA O WYCOFANIU ZAPISU\n   Wzór oświadczenia stanowi załącznik do niniejszego memorandum.',
        'DEFINICJE I OBJAŚNIENIA SKRÓTÓW',
    ];

    for (let i = 0; i < attachments.length; i++) {
        yield `${i + 1}. ${attachments[i]}\n\n`;
        await new Promise(r => setTimeout(r, 50)); // Symulacja opóźnienia
    }

    yield `   KRS - Krajowy Rejestr Sądowy\n`;
    yield `   KSH - Kodeks Spółek Handlowych\n`;
    yield `   NIP - Numer Identyfikacji Podatkowej\n`;
    yield `   REGON - Rejestr Gospodarki Narodowej\n`;
    yield `   PKD - Polska Klasyfikacja Działalności\n`;
    yield `   WZA - Walne Zgromadzenie Akcjonariuszy\n`;
    yield `   PLN - Polski Złoty\n`;
    yield `   ASO - Alternatywny System Obrotu\n`;
    yield `   NewConnect - rynek NewConnect prowadzony przez GPW\n`;
}

// ============================================
// FORMATOWANIE TABEL FINANSOWYCH
// ============================================

export function formatFinancialTable(financials: FinancialData[]): string {
    if (financials.length === 0) return '[BRAK DANYCH FINANSOWYCH]';

    const formatNum = (n: number) => n ? n.toLocaleString('pl-PL') : '-';

    let table = '\n┌─────────────────────────────┬';
    table += financials.map(() => '──────────────────┬').join('');
    table = table.slice(0, -1) + '┐\n';

    table += '│ Pozycja                     │';
    table += financials.map(f => ` ${f.rok.toString().padEnd(16)} │`).join('');
    table += '\n';

    table += '├─────────────────────────────┼';
    table += financials.map(() => '──────────────────┼').join('');
    table = table.slice(0, -1) + '┤\n';

    const rows: [string, string[]][] = [
        ['Przychody netto ze sprzedaży', financials.map(f => formatNum(f.przychodyNetto))],
        ['Zysk (strata) brutto', financials.map(f => formatNum(f.zyskBrutto))],
        ['Zysk (strata) netto', financials.map(f => formatNum(f.zyskNetto))],
        ['Suma bilansowa', financials.map(f => formatNum(f.sumaBilansowa))],
        ['Kapitał własny', financials.map(f => formatNum(f.kapitalWlasny))],
        ['Zobowiązania ogółem', financials.map(f => formatNum(f.zobowiazania))],
    ];

    for (const [label, values] of rows) {
        table += `│ ${label.padEnd(27)} │`;
        for (const val of values) {
            table += ` ${val.padStart(16)} │`;
        }
        table += '\n';
    }

    table += '└─────────────────────────────┴';
    table += financials.map(() => '──────────────────┴').join('');
    table = table.slice(0, -1) + '┘\n';

    return table;
}
