// =========================================
// AGENT 5: LEGAL CONTENT GENERATOR
// =========================================
// Generates legal content for each memorandum section (§1-§48)

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import {
    AgentResult,
    GeneratedSection,
    Company,
    BoardMember,
    Shareholder,
    FinancialStatement,
    FinancialRatios,
    IdentifiedRisk,
    OfferParameters
} from '@/lib/db/types';

// =========================================
// SECTION TEMPLATES - Zgodne z Dz.U. 2020.1053
// =========================================

interface SectionTemplate {
    number: string;
    title: string;
    chapter: string;
    prompt: string;
    requiredData: ('company' | 'board' | 'shareholders' | 'financials' | 'ratios' | 'risks' | 'offer')[];
}

const SECTION_TEMPLATES: SectionTemplate[] = [
    // ======= ROZDZIAŁ I: WSTĘP (§1-§10) =======
    {
        number: '§1',
        title: 'Emitent',
        chapter: 'I. WSTĘP',
        requiredData: ['company', 'board'],
        prompt: `Wygeneruj §1 EMITENT zawierający WSZYSTKIE dane:
- Pełna nazwa firmy: {NAZWA}
- Numer KRS: {KRS}
- NIP: {NIP}
- REGON: {REGON}
- Forma prawna: {FORMA_PRAWNA}
- Siedziba i adres: {ADRES}
- Kapitał zakładowy: {KAPITAL} PLN (wpłacony w całości/niepełni)
- Zarząd: {ZARZAD}
- Sposób reprezentacji: {REPREZENTACJA}
- Telefon, email, strona www: [DO UZUPEŁNIENIA przez Emitenta]`
    },
    {
        number: '§2',
        title: 'Sprzedający',
        chapter: 'I. WSTĘP',
        requiredData: ['company'],
        prompt: `Wygeneruj §2 SPRZEDAJĄCY:
"Sprzedającym jest Emitent, tj. {NAZWA} z siedzibą w {MIEJSCOWOSC}."`
    },
    {
        number: '§3',
        title: 'Papiery wartościowe',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §3 PAPIERY WARTOŚCIOWE:
- Rodzaj: akcje zwykłe na okaziciela
- Seria: {SERIA}
- Liczba akcji: {LICZBA_AKCJI}
- Wartość nominalna jednej akcji: {WARTOSC_NOMINALNA} PLN
- Łączna wartość nominalna emisji: {LACZNIE} PLN`
    },
    {
        number: '§4',
        title: 'Podmiot udzielający zabezpieczenia',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §4 PODMIOT UDZIELAJĄCY ZABEZPIECZENIA:
"Emisja akcji serii {SERIA} nie jest objęta gwarancją ani zabezpieczeniem 
osób trzecich. Spółka nie zawarła umów gwarancyjnych dotyczących emisji."`
    },
    {
        number: '§5',
        title: 'Cena emisyjna',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §5 CENA EMISYJNA:
Jeśli cena ustalona: "Cena emisyjna jednej akcji serii {SERIA} wynosi {CENA} PLN."
Jeśli przedział: "Cena emisyjna zostanie ustalona przez Zarząd przed rozpoczęciem 
subskrypcji, w przedziale od [MIN] do [MAX] PLN."`
    },
    {
        number: '§6',
        title: 'Miejsce i warunki oferty',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §6 MIEJSCE I WARUNKI OFERTY:
"Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach 
i zgodnie z zasadami określonymi w niniejszym Memorandum Informacyjnym.
Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym 
informacje o ofercie publicznej akcji serii {SERIA}."`
    },
    {
        number: '§7',
        title: 'Podstawa prawna oferty publicznej',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §7 PODSTAWA PRAWNA OFERTY PUBLICZNEJ (DOKŁADNIE!):
"Oferta publiczna akcji serii {SERIA} prowadzona jest na podstawie 
art. 37a ust. 1 ustawy z dnia 29 lipca 2005 r. o ofercie publicznej 
i warunkach wprowadzania instrumentów finansowych do zorganizowanego 
systemu obrotu oraz o spółkach publicznych (Dz.U. z 2025 r. poz. 592, t.j.).

Zgodnie z art. 37a ust. 1 ww. ustawy, oferta publiczna może być prowadzona 
na podstawie memorandum informacyjnego, jeżeli spełniony jest co najmniej 
jeden z następujących warunków:
1) oferta jest kierowana wyłącznie do inwestorów, z których każdy nabywa 
   papiery wartościowe o wartości co najmniej 100 000 EUR,
2) oferta dotyczy papierów wartościowych o jednostkowej wartości nominalnej 
   wynoszącej co najmniej 100 000 EUR,
3) łączna wartość papierów wartościowych będących przedmiotem ofert 
   publicznych prowadzonych w okresie poprzednich 12 miesięcy nie przekracza 
   2 500 000 EUR (lub równowartości w PLN).

Niniejsze Memorandum zostało sporządzone zgodnie z wymogami rozporządzenia 
Ministra Finansów z dnia 12 maja 2020 r. (Dz.U. z 2020 r. poz. 1053)."`
    },
    {
        number: '§8',
        title: 'Firma inwestycyjna',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §8 FIRMA INWESTYCYJNA:
Jeśli brak: "Oferta publiczna akcji serii {SERIA} prowadzona jest bez 
pośrednictwa firmy inwestycyjnej, zgodnie z art. 37a ust. 3 ustawy o ofercie."
Jeśli podana: użyj nazwy firmy {FIRMA_INWESTYCYJNA}.`
    },
    {
        number: '§9',
        title: 'Data ważności memorandum',
        chapter: 'I. WSTĘP',
        requiredData: [],
        prompt: `Wygeneruj §9 DATA WAŻNOŚCI MEMORANDUM:
"Niniejsze Memorandum Informacyjne jest ważne przez okres 12 miesięcy 
od dnia jego sporządzenia, tj. od dnia [DATA] do dnia [DATA + 12 MIESIĘCY].

Po upływie okresu ważności Memorandum nie może stanowić podstawy 
prowadzenia oferty publicznej."`
    },
    {
        number: '§10',
        title: 'Tryb informowania o zmianach',
        chapter: 'I. WSTĘP',
        requiredData: ['company'],
        prompt: `Wygeneruj §10 TRYB INFORMOWANIA O ZMIANACH (BARDZO SZCZEGÓŁOWO!):
"Informacje o zmianach danych zawartych w niniejszym Memorandum 
będą podawane do publicznej wiadomości zgodnie z art. 37b ustawy 
o ofercie publicznej poprzez publikację na stronie internetowej Emitenta.

Aktualizacje będą dotyczyć w szczególności:
a) istotnych zmian w sytuacji finansowej lub prawnej Emitenta,
b) zmian w składzie organów Emitenta,
c) istotnych umów zawartych przez Emitenta,
d) postępowań sądowych, arbitrażowych lub administracyjnych,
e) zmian w strukturze akcjonariatu przekraczających 5% głosów na WZA,
f) wydarzeń mogących mieć istotny wpływ na sytuację majątkową Emitenta.

Aktualizacje będą publikowane niezwłocznie, nie później niż w terminie 
7 dni roboczych od dnia wystąpienia zdarzenia."`
    },

    // ======= ROZDZIAŁ II: CZYNNIKI RYZYKA (§11-§15) =======
    {
        number: '§11',
        title: 'Ryzyka związane z działalnością Emitenta',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['company', 'risks'],
        prompt: `Wygeneruj §11 RYZYKA ZWIĄZANE Z DZIAŁALNOŚCIĄ EMITENTA.
Użyj ryzyk z kategorii OPERACYJNE. Minimum 4 ryzyka.
Każde ryzyko opisz szczegółowo: nazwa, opis, wpływ, mitygacja.`
    },
    {
        number: '§12',
        title: 'Ryzyka o charakterze finansowym',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['financials', 'ratios', 'risks'],
        prompt: `Wygeneruj §12 RYZYKA O CHARAKTERZE FINANSOWYM.
Użyj ryzyk z kategorii FINANSOWE. Minimum 4 ryzyka.
Użyj KONKRETNYCH danych finansowych:
- Przychody: {PRZYCHODY} PLN
- Zysk netto: {ZYSK} PLN
- Wskaźnik zadłużenia: {ZADLUZENIE}%
- Rentowność: {RENTOWNOSC}%`
    },
    {
        number: '§13',
        title: 'Ryzyka rynkowe',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['company', 'risks'],
        prompt: `Wygeneruj §13 RYZYKA RYNKOWE.
Użyj ryzyk z kategorii RYNKOWE. Minimum 2 ryzyka.
Uwzględnij branżę: {PKD} - {BRANZA}.`
    },
    {
        number: '§14',
        title: 'Ryzyka prawne i regulacyjne',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['risks'],
        prompt: `Wygeneruj §14 RYZYKA PRAWNE I REGULACYJNE.
Użyj ryzyk z kategorii PRAWNE_REGULACYJNE. Minimum 2 ryzyka.
Uwzględnij ryzyko MAR (rozporządzenie 596/2014).`
    },
    {
        number: '§15',
        title: 'Ryzyka związane z inwestycją w akcje',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['offer', 'risks'],
        prompt: `Wygeneruj §15 RYZYKA ZWIĄZANE Z INWESTYCJĄ W AKCJE.
Użyj ryzyk z kategorii INWESTYCYJNE. Minimum 4 ryzyka:
- Ryzyko braku płynności akcji
- Ryzyko rozwodnienia kapitału
- Ryzyko braku wypłaty dywidendy
- Ryzyko wyceny akcji`
    },

    // ======= ROZDZIAŁ III: DANE O EMITENCIE (§16-§35) =======
    {
        number: '§16',
        title: 'Dane o ofercie akcji',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §16 - podstawowe dane identyfikacyjne Emitenta.
Podaj: nazwa, forma prawna, kraj siedziby, adres, NIP, REGON.`
    },
    {
        number: '§22',
        title: 'Prawa z oferowanych papierów wartościowych',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §22 PRAWA Z OFEROWANYCH PAPIERÓW WARTOŚCIOWYCH (wg KSH!):

A. PRAWA MAJĄTKOWE:
1. Prawo do dywidendy (art. 347 KSH) - szczegółowy opis
2. Prawo do udziału w masie likwidacyjnej (art. 474 KSH)
3. Prawo poboru akcji nowej emisji (art. 433 KSH)

B. PRAWA KORPORACYJNE:
1. Prawo głosu na WZA (art. 411 KSH) - 1 akcja = 1 głos
2. Prawo do informacji (art. 428 KSH)
3. Prawo do zaskarżania uchwał WZA (art. 422, 425 KSH)
4. Prawo żądania zwołania WZA (art. 400 KSH) - 5% kapitału
5. Prawo do wglądu w księgę akcyjną (art. 341 KSH)

C. OGRANICZENIA:
Akcje nie są uprzywilejowane. Brak ograniczeń w zbywaniu.`
    },
    {
        number: '§27',
        title: 'Informacje o osobach zarządzających',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['board'],
        prompt: `Wygeneruj §27 INFORMACJE O OSOBACH ZARZĄDZAJĄCYCH.
Dla każdego członka Zarządu podaj:
- Imię i nazwisko, funkcja
- Wykształcenie i doświadczenie zawodowe
- Powiązania z Emitentem (posiadane akcje, jeśli dotyczy)`
    },

    // ======= ROZDZIAŁ IV: DANE FINANSOWE (§36-§42) =======
    {
        number: '§36',
        title: 'Wybrane dane finansowe',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['financials', 'ratios'],
        prompt: `Wygeneruj §36 WYBRANE DANE FINANSOWE.
Przedstaw tabelę z danymi za ostatnie 2-3 lata:

| Pozycja | {ROK-2} | {ROK-1} | {ROK} | Zmiana YoY |
|---------|---------|---------|-------|------------|
| Przychody netto | X | X | X | X% |
| Zysk netto | X | X | X | X% |
| Suma aktywów | X | X | X | X% |
| Kapitał własny | X | X | X | X% |
| Zobowiązania | X | X | X | X% |

WSKAŹNIKI FINANSOWE:
- Rentowność netto: {RENTOWNOSC}%
- ROE: {ROE}%
- ROA: {ROA}%
- Wskaźnik zadłużenia: {ZADLUZENIE}%
- Płynność bieżąca: {PLYNNOSC}`
    },

    // ======= ROZDZIAŁ V: INFORMACJE DODATKOWE =======
    {
        number: '§43',
        title: 'Cele emisji',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §43 CELE EMISJI.
Opisz cele wykorzystania środków z emisji:
{CELE_EMISJI}

Jeśli brak konkretnych celów:
"Środki pozyskane z emisji akcji serii {SERIA} zostaną przeznaczone na:
1. Finansowanie rozwoju działalności operacyjnej Emitenta
2. Inwestycje w rozwój produktów/usług
3. Wzmocnienie kapitału obrotowego
4. Potencjalne akwizycje podmiotów z branży"`
    },
    {
        number: '§44',
        title: 'Koszty emisji',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §44 KOSZTY EMISJI.
Szacunkowe koszty emisji: {KOSZTY} PLN

Struktura kosztów:
- Przygotowanie i dystrybucja Memorandum: X PLN
- Opłaty prawne i doradcze: X PLN
- Promocja oferty: X PLN
- Pozostałe koszty: X PLN`
    },
];

// =========================================
// GENERATION FUNCTION
// =========================================

export interface GenerationContext {
    company?: Partial<Company>;
    board?: Partial<BoardMember>[];
    shareholders?: Partial<Shareholder>[];
    financials?: Partial<FinancialStatement>[];
    ratios?: Partial<FinancialRatios>[];
    risks?: Partial<IdentifiedRisk>[];
    offer?: Partial<OfferParameters>;
}

function buildContextString(template: SectionTemplate, context: GenerationContext): string {
    let contextStr = '';

    if (template.requiredData.includes('company') && context.company) {
        contextStr += `
=== DANE SPÓŁKI ===
Nazwa: ${context.company.nazwa}
KRS: ${context.company.krs}
NIP: ${context.company.nip}
REGON: ${context.company.regon}
Forma prawna: ${context.company.formaPrawna}
Adres: ${context.company.ulica} ${context.company.numerBudynku}, ${context.company.kodPocztowy} ${context.company.miejscowosc}
Kapitał zakładowy: ${context.company.kapitalZakladowy?.toLocaleString('pl-PL')} PLN
PKD: ${context.company.pkdPrzewazajace}
Sposób reprezentacji: ${context.company.sposobReprezentacji}
`;
    }

    if (template.requiredData.includes('board') && context.board) {
        contextStr += `
=== ZARZĄD ===
${context.board.map(m => `${m.imie} ${m.nazwisko} - ${m.funkcja}`).join('\n')}
`;
    }

    if (template.requiredData.includes('shareholders') && context.shareholders) {
        contextStr += `
=== AKCJONARIUSZE ===
${context.shareholders.map(s => `${s.nazwa}: ${s.procentKapitalu}% kapitału`).join('\n')}
`;
    }

    if (template.requiredData.includes('financials') && context.financials?.[0]) {
        const fin = context.financials[0];
        contextStr += `
=== DANE FINANSOWE (${fin.rok}) ===
Przychody netto: ${fin.przychodyNetto?.toLocaleString('pl-PL')} PLN
Zysk netto: ${fin.zyskNetto?.toLocaleString('pl-PL')} PLN
Suma aktywów: ${fin.sumaAktywow?.toLocaleString('pl-PL')} PLN
Kapitał własny: ${fin.kapitalWlasny?.toLocaleString('pl-PL')} PLN
Zobowiązania: ${((fin.zobowiazaniaDlugoterminowe || 0) + (fin.zobowiazaniaKrotkoterminowe || 0)).toLocaleString('pl-PL')} PLN
`;
    }

    if (template.requiredData.includes('ratios') && context.ratios?.[0]) {
        const r = context.ratios[0];
        contextStr += `
=== WSKAŹNIKI FINANSOWE ===
Rentowność netto: ${r.rentownoscNetto}%
ROE: ${r.roe}%
ROA: ${r.roa}%
Wskaźnik zadłużenia: ${r.wskaznikZadluzenia}%
Płynność bieżąca: ${r.wskaznikPlynnosciBiezacej}
`;
    }

    if (template.requiredData.includes('risks') && context.risks) {
        const categoryRisks: Record<string, typeof context.risks> = {};
        context.risks.forEach(r => {
            if (r.kategoria) {
                if (!categoryRisks[r.kategoria]) categoryRisks[r.kategoria] = [];
                categoryRisks[r.kategoria].push(r);
            }
        });

        contextStr += `
=== ZIDENTYFIKOWANE RYZYKA ===
${Object.entries(categoryRisks).map(([cat, risks]) => `
${cat}:
${risks.map(r => `- ${r.nazwa}: ${r.opis}`).join('\n')}
`).join('\n')}
`;
    }

    if (template.requiredData.includes('offer') && context.offer) {
        contextStr += `
=== PARAMETRY OFERTY ===
Seria akcji: ${context.offer.seriaAkcji}
Liczba akcji: ${context.offer.liczbaAkcji?.toLocaleString('pl-PL')}
Wartość nominalna: ${context.offer.wartoscNominalna} PLN
Cena emisyjna: ${context.offer.cenaEmisyjna} PLN
Cele emisji: ${context.offer.celeEmisji}
Koszty emisji: ${context.offer.szacunkoweKoszty?.toLocaleString('pl-PL')} PLN
Firma inwestycyjna: ${context.offer.firmaInwestycyjna || 'brak'}
`;
    }

    return contextStr;
}

export async function generateSection(
    sectionNumber: string,
    context: GenerationContext
): Promise<AgentResult<GeneratedSection>> {
    const startTime = Date.now();

    // Find template
    const template = SECTION_TEMPLATES.find(t => t.number === sectionNumber);
    if (!template) {
        return {
            success: false,
            error: `Unknown section: ${sectionNumber}`,
            latencyMs: Date.now() - startTime
        };
    }

    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
            }
        });

        const contextStr = buildContextString(template, context);

        const prompt = `
ROLA: Jesteś prawnikiem specjalizującym się w prawie rynku kapitałowego.
ZADANIE: Wygeneruj sekcję memorandum informacyjnego.

=== SEKCJA DO WYGENEROWANIA ===
Numer: ${template.number}
Tytuł: ${template.title}
Rozdział: ${template.chapter}

=== INSTRUKCJE ===
${template.prompt}

=== KONTEKST (użyj tych danych!) ===
${contextStr}

=== ZASADY FORMATOWANIA ===
1. NIE numeruj paragrafów - numeracja będzie dodana automatycznie
2. Używaj pełnych zdań, język formalny prawniczy
3. Cytuj artykuły ustaw gdzie wymagane
4. ZERO placeholderów [DO UZUPEŁNIENIA] - użyj danych z kontekstu
5. Jeśli brakuje danych, użyj sensownych wartości szacunkowych

Wygeneruj TYLKO treść sekcji, bez numeru i tytułu:
`;

        const result = await model.generateContent([{ text: prompt }]);
        const content = result.response.text().trim();

        const latencyMs = Date.now() - startTime;

        // Count placeholders
        const placeholderMatches = content.match(/\[DO UZUPEŁNIENIA\]|\[BRAK DANYCH\]|\[\?\]/g);
        const placeholderCount = placeholderMatches?.length || 0;

        // Count words
        const wordCount = content.split(/\s+/).length;

        return {
            success: true,
            data: {
                sectionNumber: template.number,
                sectionTitle: template.title,
                content,
                wordCount,
                hasPlaceholders: placeholderCount > 0,
                placeholderCount
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error',
            latencyMs
        };
    }
}

// Generate all sections for a memorandum
export async function generateAllSections(
    context: GenerationContext,
    onProgress?: (section: string, progress: number) => void
): Promise<AgentResult<GeneratedSection[]>> {
    const startTime = Date.now();
    const results: GeneratedSection[] = [];
    const errors: string[] = [];

    for (let i = 0; i < SECTION_TEMPLATES.length; i++) {
        const template = SECTION_TEMPLATES[i];
        const progress = ((i + 1) / SECTION_TEMPLATES.length) * 100;

        if (onProgress) {
            onProgress(template.number, progress);
        }

        const result = await generateSection(template.number, context);

        if (result.success && result.data) {
            results.push(result.data);
        } else {
            errors.push(`${template.number}: ${result.error}`);
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const latencyMs = Date.now() - startTime;

    if (results.length === 0) {
        return {
            success: false,
            error: `Failed to generate any sections. Errors: ${errors.join('; ')}`,
            latencyMs
        };
    }

    return {
        success: true,
        data: results,
        latencyMs
    };
}

// Get section template info
export function getSectionTemplates(): SectionTemplate[] {
    return SECTION_TEMPLATES;
}

// Get sections by chapter
export function getSectionsByChapter(chapter: string): SectionTemplate[] {
    return SECTION_TEMPLATES.filter(t => t.chapter === chapter);
}
