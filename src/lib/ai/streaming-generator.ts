/**
 * Streaming Memorandum Generator - SZABLONY STATYCZNE
 * Bez AI - wszystkie sekcje jako szablony z danymi z KRS
 * Zero kosztów API dla generowania treści
 */

import { KRSCompany, FinancialData } from '@/types';

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
        requiresAI: false,
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
        requiresAI: false,
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
        subsections: ['Emitent', 'Firma inwestycyjna'],
    },
    {
        id: 'offer',
        title: 'DANE O OFERCIE AKCJI',
        paragraph: 'IV',
        requiresAI: false,
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
        requiresAI: false,
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
        requiresAI: false,
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
            toc += `   ${i + 1}. ${section.subsections[i]}\n`;
        }
        toc += '\n';
    }
    return toc;
}

// ============================================
// GENERATOR SEKCJI - SZABLONY STATYCZNE
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

    switch (sectionId) {
        case 'intro':
            yield* generateIntroSection(company);
            break;
        case 'risks':
            yield* generateRisksSection(company);
            break;
        case 'responsible':
            yield* generateResponsibleSection(company);
            break;
        case 'offer':
            yield* generateOfferSection(company);
            break;
        case 'issuer':
            yield* generateIssuerSection(company);
            break;
        case 'financial':
            yield* generateFinancialSection(company, financials);
            break;
        case 'attachments':
            yield* generateAttachmentsSection();
            break;
    }
}

// ============================================
// I. WSTĘP
// ============================================

async function* generateIntroSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. SPÓŁKA, KTÓREJ AKCJE SĄ PRZEDMIOTEM OFERTY PUBLICZNEJ („EMITENT")

${c.nazwa}
${c.siedzibaAdres}
KRS: ${c.krs}, NIP: ${c.nip}, REGON: ${c.regon}
Kapitał zakładowy: ${c.kapitalZakladowy?.toLocaleString('pl-PL')} PLN

2. NAZWA (FIRMA) I SIEDZIBA SPRZEDAJĄCEGO

[DO UZUPEŁNIENIA - jeśli sprzedający jest inny niż Emitent]

3. LICZBA, RODZAJ, JEDNOSTKOWA WARTOŚĆ NOMINALNA PAPIERÓW WARTOŚCIOWYCH

Przedmiotem oferty publicznej są akcje zwykłe na okaziciela serii [_].
Liczba akcji: [DO UZUPEŁNIENIA]
Wartość nominalna: [DO UZUPEŁNIENIA] PLN

4. PODMIOT UDZIELAJĄCY ZABEZPIECZENIA

Emisja akcji nie jest objęta gwarancją ani zabezpieczeniem.

5. CENA EMISYJNA

Cena emisyjna: [DO UZUPEŁNIENIA] PLN za jedną akcję
Sposób ustalenia: [DO UZUPEŁNIENIA]

6. OŚWIADCZENIE

Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w niniejszym memorandum informacyjnym. Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym informacje o papierach wartościowych, ich ofercie i Emitencie.

7. PODSTAWA PRAWNA

Niniejsza oferta publiczna prowadzona jest na podstawie art. 37a ustawy z dnia 29 lipca 2005 r. o ofercie publicznej i warunkach wprowadzania instrumentów finansowych do zorganizowanego systemu obrotu oraz o spółkach publicznych.

8. FIRMA INWESTYCYJNA

[DO UZUPEŁNIENIA - nazwa i siedziba firmy inwestycyjnej pośredniczącej w ofercie]

9. DATA WAŻNOŚCI MEMORANDUM

Data sporządzenia: ${new Date().toLocaleDateString('pl-PL')}
Memorandum jest ważne przez 12 miesięcy od daty sporządzenia.

10. TRYB INFORMOWANIA O ZMIANACH

Informacje o zmianach danych zawartych w memorandum będą publikowane na stronie internetowej Emitenta: [DO UZUPEŁNIENIA - adres www]

`;
}

// ============================================
// II. CZYNNIKI RYZYKA
// ============================================

async function* generateRisksSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. CZYNNIKI RYZYKA ZWIĄZANE Z DZIAŁALNOŚCIĄ EMITENTA

1.1. Ryzyko związane z sytuacją makroekonomiczną
Działalność ${c.nazwa} jest uzależniona od ogólnej koniunktury gospodarczej. Pogorszenie sytuacji makroekonomicznej może negatywnie wpłynąć na wyniki finansowe Spółki.

1.2. Ryzyko konkurencji
Spółka działa na konkurencyjnym rynku. Wzrost konkurencji może wpłynąć na marże i udział w rynku.

1.3. Ryzyko kadrowe
Spółka może napotkać trudności w pozyskaniu i utrzymaniu wykwalifikowanej kadry.

1.4. Ryzyko regulacyjne
Zmiany w przepisach prawnych mogą wpłynąć na działalność operacyjną Spółki.

2. CZYNNIKI RYZYKA O CHARAKTERZE FINANSOWYM

2.1. Ryzyko płynności
Spółka może napotkać trudności w regulowaniu bieżących zobowiązań.

2.2. Ryzyko walutowe
[DO UZUPEŁNIENIA - jeśli dotyczy]

2.3. Ryzyko stopy procentowej
[DO UZUPEŁNIENIA - jeśli dotyczy]

3. CZYNNIKI RYZYKA ZWIĄZANE Z INSTRUMENTAMI FINANSOWYMI

3.1. Ryzyko związane z nabywaniem akcji
Inwestowanie w akcje wiąże się z ryzykiem utraty części lub całości zainwestowanego kapitału.

3.2. Ryzyko płynności akcji
Nie ma gwarancji, że akcje będą przedmiotem aktywnego obrotu.

3.3. Ryzyko niedojścia oferty do skutku
Oferta może nie dojść do skutku w przypadku nieosiągnięcia progu emisji.

`;
}

// ============================================
// III. OSOBY ODPOWIEDZIALNE
// ============================================

async function* generateResponsibleSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. EMITENT

Za informacje zawarte w niniejszym memorandum informacyjnym odpowiada:

${c.nazwa}
${c.siedzibaAdres}

Osoby działające w imieniu Emitenta:
`;
    for (const z of c.reprezentacja || []) {
        yield `- ${z.imie} ${z.nazwisko} - ${z.funkcja}\n`;
    }
    yield `
OŚWIADCZENIE EMITENTA:
"Zgodnie z moją najlepszą wiedzą i przy dołożeniu należytej staranności, informacje zawarte w memorandum są prawdziwe, rzetelne i zgodne ze stanem faktycznym, a memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie."

2. FIRMA INWESTYCYJNA

[DO UZUPEŁNIENIA - dane firmy inwestycyjnej pośredniczącej w ofercie papierów wartościowych]

`;
}

// ============================================
// IV. DANE O OFERCIE
// ============================================

async function* generateOfferSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. SZCZEGÓŁOWE OKREŚLENIE PAPIERÓW WARTOŚCIOWYCH

Przedmiotem oferty są akcje zwykłe na okaziciela serii [_] spółki ${c.nazwa}.
Liczba oferowanych akcji: [DO UZUPEŁNIENIA]
Wartość nominalna jednej akcji: [DO UZUPEŁNIENIA] PLN
Łączna wartość nominalna: [DO UZUPEŁNIENIA] PLN

Akcje nie są uprzywilejowane.

2. CELE EMISJI

Środki pozyskane z emisji zostaną przeznaczone na:
- [DO UZUPEŁNIENIA]

3. KOSZTY EMISJI

Szacunkowe koszty emisji: [DO UZUPEŁNIENIA] PLN
w tym:
- koszty przygotowania memorandum: [DO UZUPEŁNIENIA] PLN
- koszty doradztwa prawnego: [DO UZUPEŁNIENIA] PLN
- inne koszty: [DO UZUPEŁNIENIA] PLN

4. PODSTAWA PRAWNA EMISJI

Akcje emitowane są na podstawie uchwały [DO UZUPEŁNIENIA - numer i data uchwały] Walnego Zgromadzenia Akcjonariuszy ${c.nazwa}.

5. PRAWO PIERWSZEŃSTWA

[DO UZUPEŁNIENIA - czy akcjonariusze mają prawo pierwszeństwa]

6. UCZESTNICTWO W DYWIDENDZIE

Akcje serii [_] uczestniczą w dywidendzie od dnia [DO UZUPEŁNIENIA].

7. PRAWA Z AKCJI

Akcjonariuszom przysługują następujące prawa:
- prawo do dywidendy
- prawo głosu na Walnym Zgromadzeniu
- prawo poboru akcji nowej emisji
- prawo do udziału w masie likwidacyjnej

8. POLITYKA DYWIDENDOWA

[DO UZUPEŁNIENIA - opis polityki dywidendowej]

9. OPODATKOWANIE

Dochody z tytułu dywidendy oraz zbycia akcji podlegają opodatkowaniu zgodnie z obowiązującymi przepisami prawa.

10. UMOWY O GWARANCJĘ EMISJI

[DO UZUPEŁNIENIA - lub: Emitent nie zawarł umów o gwarancję emisji]

11. ZASADY DYSTRYBUCJI

Terminy oferty: [DO UZUPEŁNIENIA]
Miejsce składania zapisów: [DO UZUPEŁNIENIA]
Minimalna liczba akcji w zapisie: [DO UZUPEŁNIENIA]
Wpłaty: [DO UZUPEŁNIENIA]

`;
}

// ============================================
// V. DANE O EMITENCIE
// ============================================

async function* generateIssuerSection(c: KRSCompany): AsyncGenerator<string> {
    yield `1. PODSTAWOWE DANE O EMITENCIE

Firma: ${c.nazwa}
Forma prawna: ${c.formaOrganizacyjna}
Siedziba: ${c.siedzibaAdres}
KRS: ${c.krs}
NIP: ${c.nip}
REGON: ${c.regon}
Kapitał zakładowy: ${c.kapitalZakladowy?.toLocaleString('pl-PL')} PLN (wpłacony w całości)

2. CZAS TRWANIA EMITENTA

Spółka została utworzona na czas nieoznaczony.

3. PRZEPISY PRAWA

Spółka została utworzona i działa na podstawie przepisów prawa polskiego, w szczególności Kodeksu spółek handlowych.

4. SĄD REJESTROWY

Sąd Rejonowy [DO UZUPEŁNIENIA], [DO UZUPEŁNIENIA] Wydział Gospodarczy KRS

5. HISTORIA EMITENTA

Data powstania: ${c.dataPowstania || '[DO UZUPEŁNIENIA]'}
[DO UZUPEŁNIENIA - krótki opis historii]

6. KAPITAŁY WŁASNE

Kapitał zakładowy: ${c.kapitalZakladowy?.toLocaleString('pl-PL')} PLN
Kapitał zapasowy: [DO UZUPEŁNIENIA]
Kapitał rezerwowy: [DO UZUPEŁNIENIA]

7. NIEOPŁACONA CZĘŚĆ KAPITAŁU

Kapitał zakładowy został opłacony w całości.

8. PRZEWIDYWANE ZMIANY KAPITAŁU

[DO UZUPEŁNIENIA]

9. KAPITAŁ DOCELOWY

[DO UZUPEŁNIENIA - lub: Zarząd nie posiada upoważnienia do podwyższenia kapitału w ramach kapitału docelowego]

10. NOTOWANIA

Akcje Emitenta [nie są / są] notowane na rynku regulowanym ani w alternatywnym systemie obrotu.

11. RATING

Emitent nie posiada ratingu.

12. POWIĄZANIA KAPITAŁOWE

[DO UZUPEŁNIENIA]

13. PRZEDMIOT DZIAŁALNOŚCI

PKD: ${c.pkdPrzewazajace}
${c.pkd?.map(p => `- ${p.kod}: ${p.opis}`).join('\n') || '[DO UZUPEŁNIENIA]'}

14. GŁÓWNE INWESTYCJE

[DO UZUPEŁNIENIA]

15. POSTĘPOWANIA UPADŁOŚCIOWE/LIKWIDACYJNE

Wobec Emitenta nie toczą się postępowania upadłościowe, układowe ani likwidacyjne.

16. INNE POSTĘPOWANIA

[DO UZUPEŁNIENIA - lub: Brak istotnych postępowań]

17. ZOBOWIĄZANIA EMITENTA

[DO UZUPEŁNIENIA]

18. NIETYPOWE ZDARZENIA

[DO UZUPEŁNIENIA - lub: Brak nietypowych zdarzeń]

19. ZMIANY W SYTUACJI FINANSOWEJ

[DO UZUPEŁNIENIA]

20. PROGNOZA WYNIKÓW

[DO UZUPEŁNIENIA - lub: Emitent nie publikuje prognoz]

21. ZARZĄD I RADA NADZORCZA

ZARZĄD:
`;
    for (const z of c.reprezentacja || []) {
        yield `- ${z.imie} ${z.nazwisko} - ${z.funkcja}\n`;
    }
    yield `
Sposób reprezentacji: ${c.sposobReprezentacji || '[DO UZUPEŁNIENIA]'}

RADA NADZORCZA:
[DO UZUPEŁNIENIA]

22. STRUKTURA AKCJONARIATU

[DO UZUPEŁNIENIA - tabela z akcjonariuszami]

`;
}

// ============================================
// VI. SPRAWOZDANIA FINANSOWE
// ============================================

async function* generateFinancialSection(c: KRSCompany, fin: FinancialData[]): AsyncGenerator<string> {
    yield `WYBRANE DANE FINANSOWE (w PLN)\n\n`;

    if (fin.length > 0) {
        yield formatFinancialTable(fin);
    } else {
        yield `[DO UZUPEŁNIENIA - dane finansowe]\n`;
    }

    yield `
1. SPRAWOZDANIE ZARZĄDU Z DZIAŁALNOŚCI

[DO UZUPEŁNIENIA - lub załącznik]

2. SPRAWOZDANIE FINANSOWE

[DO UZUPEŁNIENIA - lub załącznik]

3. OPINIA BIEGŁEGO REWIDENTA

[DO UZUPEŁNIENIA - lub załącznik]

4. SPRAWOZDANIE KWARTALNE

[DO UZUPEŁNIENIA - lub załącznik]

`;
}

// ============================================
// VII. ZAŁĄCZNIKI
// ============================================

async function* generateAttachmentsSection(): AsyncGenerator<string> {
    yield `1. ODPIS Z KRAJOWEGO REJESTRU SĄDOWEGO
   Aktualny odpis z KRS stanowi załącznik do niniejszego memorandum.

2. STATUT
   Aktualny tekst jednolity statutu Spółki stanowi załącznik do niniejszego memorandum.

3. TREŚĆ PODJĘTYCH UCHWAŁ WALNEGO ZGROMADZENIA
   Treść uchwał WZA dotyczących emisji akcji oraz zmian statutu stanowi załącznik.

4. WZÓR FORMULARZA ZAPISU NA AKCJE
   Wzór formularza zapisu stanowi załącznik do niniejszego memorandum.

5. WZÓR OŚWIADCZENIA O WYCOFANIU ZGODY ZAPISU NA AKCJE
   Wzór oświadczenia stanowi załącznik do niniejszego memorandum.

6. DEFINICJE I OBJAŚNIENIA SKRÓTÓW

   KRS - Krajowy Rejestr Sądowy
   KSH - Kodeks Spółek Handlowych
   NIP - Numer Identyfikacji Podatkowej
   REGON - Rejestr Gospodarki Narodowej
   PKD - Polska Klasyfikacja Działalności
   WZA - Walne Zgromadzenie Akcjonariuszy
   PLN - Polski Złoty
   ASO - Alternatywny System Obrotu
   NewConnect - rynek NewConnect prowadzony przez GPW w Warszawie S.A.
   GPW - Giełda Papierów Wartościowych w Warszawie S.A.
   KNF - Komisja Nadzoru Finansowego
   KDPW - Krajowy Depozyt Papierów Wartościowych S.A.

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
