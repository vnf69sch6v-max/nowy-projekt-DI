/**
 * Streaming Memorandum Generator - GEMINI (DARMOWY!)
 * Struktura zgodna z profesjonalnym memorandum (Dz.U. 2020.1053)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KRSCompany, FinancialData } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================
// PEŁNA STRUKTURA MEMORANDUM
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
            'Spółka, której akcje są przedmiotem oferty publicznej („Emitent")',
            'Nazwa (firma) i siedziba lub imię i nazwisko oraz siedziba (miejsce zamieszkania) sprzedającego',
            'Liczba, rodzaj, jednostkowa wartość nominalna i oznaczenie emisji papierów wartościowych',
            'Firma (nazwa), siedziba i adres podmiotu udzielającego zabezpieczenia (gwarantującego)',
            'Cena emisyjna oferowanych papierów wartościowych albo sposób jej ustalenia',
            'Stwierdzenie, że oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w memorandum',
            'Określenie podstawy prawnej prowadzenia oferty publicznej na podstawie memorandum',
            'Wskazanie firmy (nazwy) i siedziby firmy inwestycyjnej pośredniczącej w ofercie',
            'Data ważności memorandum oraz data uwzględnienia informacji aktualizujących',
            'Tryb informowania o zmianach danych zawartych w memorandum',
        ],
    },
    {
        id: 'risks',
        title: 'CZYNNIKI RYZYKA',
        paragraph: 'II',
        requiresAI: true,
        subsections: [
            'Czynniki ryzyka związane z działalnością i branżą emitenta oraz otoczeniem',
            'Czynniki ryzyka o charakterze finansowym',
            'Czynniki ryzyka związane z instrumentami finansowymi i inne czynniki istotne dla oceny oferty publicznej',
        ],
    },
    {
        id: 'responsible',
        title: 'OSOBY ODPOWIEDZIALNE ZA INFORMACJE ZAWARTE W MEMORANDUM',
        paragraph: 'III',
        requiresAI: false,
        subsections: [
            'Emitent',
            'Firma inwestycyjna',
        ],
    },
    {
        id: 'offer',
        title: 'DANE O OFERCIE AKCJI',
        paragraph: 'IV',
        requiresAI: true,
        subsections: [
            'Szczegółowe określenie rodzajów, liczby oraz łącznej wartości papierów wartościowych',
            'Cele emisji, których realizacji mają służyć wpływy uzyskane z emisji',
            'Wskazanie łącznych kosztów emisji',
            'Określenie podstawy prawnej emisji papierów wartościowych',
            'Wskazanie, czy ma zastosowanie prawo pierwszeństwa do objęcia akcji',
            'Oznaczenie dat, od których oferowane akcje mają uczestniczyć w dywidendzie',
            'Wskazanie praw z oferowanych papierów wartościowych',
            'Określenie podstawowych zasad polityki emitenta co do wypłaty dywidendy',
            'Informacje o zasadach opodatkowania dochodów',
            'Wskazanie stron umów o gwarancję emisji',
            'Zasady dystrybucji oferowanych papierów wartościowych',
        ],
    },
    {
        id: 'issuer',
        title: 'DANE O EMITENCIE',
        paragraph: 'V',
        requiresAI: true,
        subsections: [
            'Podstawowe dane o emitencie',
            'Wskazanie czasu trwania emitenta',
            'Wskazanie przepisów prawa, na podstawie których został utworzony emitent',
            'Wskazanie sądu, który wydał postanowienie o wpisie do właściwego rejestru',
            'Krótki opis historii emitenta',
            'Określenie rodzajów i wartości kapitałów (funduszy) własnych emitenta',
            'Informacje o nieopłaconej części kapitału zakładowego',
            'Informacje o przewidywanych zmianach kapitału zakładowego',
            'Wskazanie liczby akcji i wartości kapitału zakładowego w ramach kapitału docelowego',
            'Wskazanie, na jakich rynkach papierów wartościowych są lub były notowane papiery emitenta',
            'Informacje o ratingu przyznanym emitentowi',
            'Podstawowe informacje o powiązaniach organizacyjnych lub kapitałowych emitenta',
            'Podstawowe informacje o podstawowych produktach, towarach lub usługach',
            'Opis głównych inwestycji krajowych i zagranicznych emitenta',
            'Informacje o wszczętych wobec emitenta postępowaniach',
            'Informacje o wszystkich innych postępowaniach',
            'Zobowiązania emitenta',
            'Informacje o nietypowych zdarzeniach mających wpływ na wyniki',
            'Wskazanie istotnych zmian w sytuacji finansowej i majątkowej emitenta',
            'Prognoza wyników finansowych emitenta',
            'Informacje o osobach zarządzających i nadzorujących emitenta',
            'Struktura akcjonariatu spółki',
        ],
    },
    {
        id: 'financial',
        title: 'SPRAWOZDANIA FINANSOWE EMITENTA',
        paragraph: 'VI',
        requiresAI: true,
        subsections: [
            'Sprawozdanie zarządu z działalności emitenta',
            'Sprawozdanie finansowe emitenta',
            'Opinie biegłego rewidenta do sprawozdania',
            'Skrócone sprawozdanie kwartalne',
        ],
    },
    {
        id: 'attachments',
        title: 'ZAŁĄCZNIKI',
        paragraph: 'VII',
        requiresAI: false,
        subsections: [
            'Odpis z Krajowego Rejestru Sądowego',
            'Statut',
            'Treść podjętych uchwał Walnego Zgromadzenia',
            'Wzór formularza zapisu na akcje',
            'Wzór oświadczenia o wycofaniu zgody zapisu na akcje',
            'Definicje i objaśnienia skrótów',
        ],
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
            const sub = section.subsections[i];
            toc += `   ${i + 1}. ${sub}\n`;
        }
        toc += '\n';
    }

    return toc;
}

// ============================================
// STREAMING Z GEMINI
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

    const prompt = generatePrompt(sectionId, section, company, financials);
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
// PROMPTY
// ============================================

function generatePrompt(sectionId: string, section: SectionConfig, company: KRSCompany, financials: FinancialData[]): string {
    const dane = `Spółka: ${company.nazwa}, KRS: ${company.krs}, NIP: ${company.nip}, REGON: ${company.regon}, Forma: ${company.formaOrganizacyjna}, Adres: ${company.siedzibaAdres}, Kapitał: ${company.kapitalZakladowy}zł, PKD: ${company.pkdPrzewazajace}, Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko} (${z.funkcja})`).join(', ')}, Reprezentacja: ${company.sposobReprezentacji}`;

    const fin = financials.length > 0
        ? `Finanse: ${financials.map(f => `${f.rok}: przych. ${f.przychodyNetto}, zysk ${f.zyskNetto}, bilans ${f.sumaBilansowa}, kapitał ${f.kapitalWlasny}`).join('; ')}`
        : '';

    const subsectionsText = section.subsections.map((s, i) => `${i + 1}. ${s}`).join('\n');

    return `Napisz rozdział "${section.paragraph}. ${section.title}" memorandum informacyjnego dla spółki akcyjnej.

DANE SPÓŁKI:
${dane}
${fin}

WYMAGANE PODSEKCJE (numeruj dokładnie tak):
${subsectionsText}

ZASADY:
- Gdzie brak konkretnych danych, wpisz [DO UZUPEŁNIENIA]
- Pisz profesjonalnym językiem prawniczym
- Nie używaj markdown, tylko czysty tekst z numeracją
- Każdą podsekcję rozpocznij od jej numeru i tytułu
- Bądź szczegółowy i zgodny z rozporządzeniem Dz.U. 2020.1053`;
}

// ============================================
// SEKCJE STATYCZNE
// ============================================

async function* streamResponsiblePersons(company: KRSCompany): AsyncGenerator<string> {
    yield `III. OSOBY ODPOWIEDZIALNE ZA INFORMACJE ZAWARTE W MEMORANDUM\n\n`;
    yield `1. EMITENT\n\n`;
    yield `Za informacje zawarte w niniejszym memorandum informacyjnym odpowiada:\n\n`;
    yield `${company.nazwa}\n`;
    yield `${company.siedzibaAdres}\n\n`;
    yield `Osoby działające w imieniu Emitenta:\n\n`;
    for (const z of company.reprezentacja || []) {
        yield `- ${z.imie} ${z.nazwisko} - ${z.funkcja}\n`;
    }
    yield `\nOŚWIADCZENIE EMITENTA:\n`;
    yield `"Zgodnie z moją najlepszą wiedzą i przy dołożeniu należytej staranności, informacje zawarte w memorandum są prawdziwe, rzetelne i zgodne ze stanem faktycznym, a memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie."\n\n`;
    yield `2. FIRMA INWESTYCYJNA\n\n`;
    yield `[DO UZUPEŁNIENIA - dane firmy inwestycyjnej pośredniczącej w ofercie papierów wartościowych]\n`;
}

async function* streamAttachments(): AsyncGenerator<string> {
    yield `VII. ZAŁĄCZNIKI\n\n`;
    yield `1. ODPIS Z KRAJOWEGO REJESTRU SĄDOWEGO\n`;
    yield `   Aktualny odpis z KRS stanowi załącznik do niniejszego memorandum.\n\n`;
    yield `2. STATUT\n`;
    yield `   Aktualny tekst jednolity statutu Spółki stanowi załącznik do niniejszego memorandum.\n\n`;
    yield `3. TREŚĆ PODJĘTYCH UCHWAŁ WALNEGO ZGROMADZENIA\n`;
    yield `   Treść uchwał WZA dotyczących emisji akcji oraz zmian statutu stanowi załącznik.\n\n`;
    yield `4. WZÓR FORMULARZA ZAPISU NA AKCJE\n`;
    yield `   Wzór formularza zapisu stanowi załącznik do niniejszego memorandum.\n\n`;
    yield `5. WZÓR OŚWIADCZENIA O WYCOFANIU ZGODY ZAPISU NA AKCJE\n`;
    yield `   Wzór oświadczenia stanowi załącznik do niniejszego memorandum.\n\n`;
    yield `6. DEFINICJE I OBJAŚNIENIA SKRÓTÓW\n\n`;
    yield `   KRS - Krajowy Rejestr Sądowy\n`;
    yield `   KSH - Kodeks Spółek Handlowych\n`;
    yield `   NIP - Numer Identyfikacji Podatkowej\n`;
    yield `   REGON - Rejestr Gospodarki Narodowej\n`;
    yield `   PKD - Polska Klasyfikacja Działalności\n`;
    yield `   WZA - Walne Zgromadzenie Akcjonariuszy\n`;
    yield `   PLN - Polski Złoty\n`;
    yield `   ASO - Alternatywny System Obrotu\n`;
    yield `   NewConnect - rynek NewConnect prowadzony przez GPW w Warszawie S.A.\n`;
    yield `   GPW - Giełda Papierów Wartościowych w Warszawie S.A.\n`;
    yield `   KNF - Komisja Nadzoru Finansowego\n`;
    yield `   KDPW - Krajowy Depozyt Papierów Wartościowych S.A.\n`;
}

// ============================================
// TABELKA FINANSOWA
// ============================================

export function formatFinancialTable(financials: FinancialData[]): string {
    if (!financials.length) return '[BRAK DANYCH FINANSOWYCH]';

    const fmt = (n: number) => n ? n.toLocaleString('pl-PL') : '-';
    const years = financials.map(f => f.rok.toString());

    let t = '\nWybrane dane finansowe (w PLN):\n\n';
    t += '┌─────────────────────────┬' + years.map(() => '────────────────┬').join('').slice(0, -1) + '┐\n';
    t += '│ Pozycja                 │' + years.map(y => ` ${y.padStart(14)} │`).join('') + '\n';
    t += '├─────────────────────────┼' + years.map(() => '────────────────┼').join('').slice(0, -1) + '┤\n';

    const rows: [string, string[]][] = [
        ['Przychody netto', financials.map(f => fmt(f.przychodyNetto))],
        ['Zysk (strata) netto', financials.map(f => fmt(f.zyskNetto))],
        ['Suma bilansowa', financials.map(f => fmt(f.sumaBilansowa))],
        ['Kapitał własny', financials.map(f => fmt(f.kapitalWlasny))],
        ['Zobowiązania', financials.map(f => fmt(f.zobowiazania))],
    ];

    for (const [label, vals] of rows) {
        t += `│ ${label.padEnd(23)} │` + vals.map(v => ` ${v.padStart(14)} │`).join('') + '\n';
    }

    t += '└─────────────────────────┴' + years.map(() => '────────────────┴').join('').slice(0, -1) + '┘\n';
    return t;
}
