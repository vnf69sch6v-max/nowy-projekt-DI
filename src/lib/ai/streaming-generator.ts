/**
 * Streaming Memorandum Generator - Firebase Vertex AI
 * Pełna zgodność z Dz.U. 2020.1053
 * Weryfikacja AI + zakaz ASCII tabel
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { KRSCompany, FinancialData } from '@/types';
import { verifyContent } from './content-verifier';
import { findIndustryTemplate, generateIndustryRisks, UNIVERSAL_RISKS } from '../utils/industry-templates';

// Typ dla parametrów oferty
export interface OfferParameters {
    seriaAkcji?: string;
    liczbaAkcji?: number | null;
    wartoscNominalna?: number | null;
    cenaEmisyjna?: number | null;
    celeEmisji?: string;
    terminSubskrypcji?: string;
    miejsceZapisow?: string;
    minimalnaLiczbaAkcji?: number | null;
    firmaInwestycyjna?: string;
    dataWaznosci?: string;
}

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
    if (getApps().length === 0) return initializeApp(firebaseConfig);
    return getApp();
}

// ============================================
// STRUKTURA MEMORANDUM (Dz.U. 2020.1053)
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
            '§1. Emitent - podstawowe dane',
            '§2. Sprzedający (jeśli inny niż emitent)',
            '§3. Liczba, rodzaj, jednostkowa wartość nominalna akcji',
            '§4. Podmiot udzielający zabezpieczenia/gwarancji',
            '§5. Cena emisyjna lub sposób jej ustalenia',
            '§6. Oświadczenie o warunkach oferty',
            '§7. Podstawa prawna oferty publicznej',
            '§8. Firma inwestycyjna pośrednicząca',
            '§9. Data ważności memorandum',
            '§10. Tryb informowania o zmianach',
        ],
    },
    {
        id: 'risks',
        title: 'CZYNNIKI RYZYKA',
        paragraph: 'II',
        requiresAI: true,
        subsections: [
            '§11. Ryzyka związane z działalnością i branżą emitenta',
            '§12. Ryzyka o charakterze finansowym',
            '§13. Ryzyka związane z instrumentami finansowymi',
        ],
    },
    {
        id: 'responsible',
        title: 'OSOBY ODPOWIEDZIALNE ZA INFORMACJE ZAWARTE W MEMORANDUM',
        paragraph: 'III',
        requiresAI: false,
        subsections: [
            '§14. Emitent - dane i oświadczenie',
            '§15. Firma inwestycyjna - dane i oświadczenie',
        ],
    },
    {
        id: 'offer',
        title: 'DANE O OFERCIE AKCJI',
        paragraph: 'IV',
        requiresAI: true,
        subsections: [
            '§16. Szczegółowe określenie rodzajów, liczby i wartości papierów',
            '§17. Cele emisji',
            '§18. Łączne koszty emisji',
            '§19. Podstawa prawna emisji (uchwała WZA)',
            '§20. Prawo pierwszeństwa objęcia akcji',
            '§21. Data uczestnictwa w dywidendzie',
            '§22. Prawa z oferowanych papierów wartościowych',
            '§23. Polityka dywidendowa emitenta',
            '§24. Zasady opodatkowania dochodów',
            '§25. Umowy o gwarancję emisji',
            '§26. Zasady dystrybucji oferowanych akcji',
        ],
    },
    {
        id: 'issuer',
        title: 'DANE O EMITENCIE',
        paragraph: 'V',
        requiresAI: true,
        subsections: [
            '§27. Podstawowe dane rejestrowe',
            '§28. Czas trwania emitenta',
            '§29. Przepisy prawa tworzące emitenta',
            '§30. Sąd rejestrowy',
            '§31. Historia emitenta',
            '§32. Rodzaje i wartość kapitałów własnych',
            '§33. Nieopłacona część kapitału zakładowego',
            '§34. Przewidywane zmiany kapitału',
            '§35. Kapitał docelowy',
            '§36. Notowania papierów wartościowych',
            '§37. Rating emitenta',
            '§38. Powiązania organizacyjne i kapitałowe',
            '§39. Produkty, towary, usługi emitenta',
            '§40. Główne inwestycje',
            '§41. Postępowania upadłościowe/likwidacyjne',
            '§42. Inne postępowania',
            '§43. Zobowiązania emitenta',
            '§44. Nietypowe zdarzenia',
            '§45. Zmiany w sytuacji finansowej',
            '§46. Prognoza wyników finansowych',
            '§47. Osoby zarządzające i nadzorujące',
            '§48. Struktura akcjonariatu',
        ],
    },
    {
        id: 'financial',
        title: 'SPRAWOZDANIA FINANSOWE EMITENTA',
        paragraph: 'VI',
        requiresAI: true,
        subsections: [
            '§49. Sprawozdanie zarządu z działalności',
            '§50. Sprawozdanie finansowe',
            '§51. Opinia biegłego rewidenta',
            '§52. Skrócone sprawozdanie kwartalne',
        ],
    },
    {
        id: 'attachments',
        title: 'ZAŁĄCZNIKI',
        paragraph: 'VII',
        requiresAI: false,
        subsections: [
            '§53. Odpis z KRS',
            '§54. Statut',
            '§55. Uchwały WZA dotyczące emisji',
            '§56. Wzór formularza zapisu',
            '§57. Wzór oświadczenia o wycofaniu',
            '§58. Definicje i objaśnienia skrótów',
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
        for (const sub of section.subsections) {
            toc += `   ${sub}\n`;
        }
        toc += '\n';
    }
    return toc;
}

// ============================================
// FORMATOWANIE REGUŁY (dodawane do każdego promptu)
// ============================================

const FORMATTING_RULES = `
FORMATOWANIE - SCISLE ZASADY:
1. NIE uzywaj markdown: ##, **, *, \`\`\`
2. NIE rysuj tabel ASCII z uzyciem znakow |, -, +
3. Dane liczbowe: "Przychody za 2025 rok: 12 119 801,76 PLN"
4. Daty w formacie: DD.MM.YYYY
5. Kwoty w formacie: X XXX XXX,XX PLN
6. Gdzie brak danych: [DO UZUPELNIENIA]
7. Pisz profesjonalnym jezykiem prawniczym

=== KRYTYCZNE INSTRUKCJE FORMATOWANIA ===

*** NIE NUMERUJ PUNKTOW! ***

System post-processingu sam doda numeracje. Ty pisz tylko tytuly i tresc.

STRUKTURA TEKSTU (bez numerow!):
- Tytul paragrafu (np. "Emitent", "Ryzyka operacyjne", "Cele emisji")
- Pod nim punkty jako lista (BEZ numerow 1., 2., 3.)
- Kazdy punkt to oddzielny akapit

PRZYKLAD PRAWIDLOWY:

Emitent
Pelna nazwa emitenta to RENDER CUBE SPOLKA AKCYJNA.
Adres: ul. Ks. Biskupa Wincentego Tymienieckiego 22/24.
KRS: 0000860872.

Sprzedajacy
Sprzedajacym jest Emitent.

Ryzyka operacyjne

Ryzyko konkurencji
Spolka dziala na konkurencyjnym rynku gier komputerowych...

Ryzyko utraty pracownikow
Spolka jest zalezna od kluczowych pracownikow...

=== CZEGO NIE ROBIC ===
- NIE pisz "1.", "2.", "3." przed punktami
- NIE pisz "§11.", "§12." przed paragrafami  
- NIE pisz "a)", "b)", "c)" przed podpunktami
- NIE pisz "I.", "II.", "III." przed sekcjami (to juz jest w naglowku)

System sam doda poprawna, ciagla numeracje!

=== BLEDY DO UNIKANIA ===
- NIE uzywaj: "6. Ryzyko..." a potem "1. Ryzyko..." - to chaos!
- NIE mieszaj poziomow numeracji!
- NIE powtarzaj numeru sekcji (np. "II." tylko raz!)

NIE ZACZYNAJ OD "Spis tresci" - jest juz wbudowany w PDF!
`;

// ============================================
// STREAMING SEKCJI Z AI + WERYFIKACJA
// ============================================

export async function* streamMemorandumSection(
    sectionId: string,
    company: KRSCompany,
    financials: FinancialData[],
    offerParams?: OfferParameters | null
): AsyncGenerator<string> {
    const section = MEMORANDUM_SECTIONS.find(s => s.id === sectionId);
    if (!section) {
        yield `[BŁĄD] Nieznana sekcja: ${sectionId}`;
        return;
    }

    // Sekcje statyczne (bez AI)
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

        const prompt = generateSectionPrompt(sectionId, section, company, financials, offerParams);

        console.log(`🤖 Generating section ${sectionId} with AI...`);

        // Generowanie treści
        let generatedContent = '';
        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                generatedContent += text;
                yield text;
            }
        }

        // Weryfikacja treści
        console.log(`🔍 Verifying section ${sectionId}...`);
        const verification = await verifyContent(generatedContent, section.title, company, financials);

        if (!verification.verified && verification.correctedText) {
            yield `\n\n[UWAGA: Wykryto nieścisłości - treść poprawiona automatycznie]\n`;
            yield verification.correctedText;
        }

        if (verification.warnings.length > 0) {
            yield `\n\n[Ostrzeżenia weryfikacji: ${verification.warnings.join('; ')}]\n`;
        }

    } catch (error) {
        console.error(`Section ${sectionId} error:`, error);
        yield `\n[BŁĄD GENEROWANIA: ${error instanceof Error ? error.message : 'nieznany'}]\n`;
    }
}

// ============================================
// PROMPTY DLA SEKCJI (pełna zgodność z rozporządzeniem)
// ============================================

function generateSectionPrompt(
    sectionId: string,
    section: SectionConfig,
    company: KRSCompany,
    financials: FinancialData[],
    offerParams?: OfferParameters | null
): string {
    // Dane z parametrów oferty (jeśli podane przez użytkownika)
    const offerData = offerParams ? `
PARAMETRY OFERTY (podane przez użytkownika - użyj tych konkretnych wartości!):
- Seria akcji: ${offerParams.seriaAkcji || '[DO UZUPEŁNIENIA]'}
- Liczba akcji w ofercie: ${offerParams.liczbaAkcji?.toLocaleString('pl-PL') || '[DO UZUPEŁNIENIA]'}
- Wartość nominalna jednej akcji: ${offerParams.wartoscNominalna ? offerParams.wartoscNominalna.toFixed(2) + ' PLN' : '[DO UZUPEŁNIENIA]'}
- Cena emisyjna jednej akcji: ${offerParams.cenaEmisyjna ? offerParams.cenaEmisyjna.toFixed(2) + ' PLN' : '[DO UZUPEŁNIENIA]'}
- Cele emisji: ${offerParams.celeEmisji || '[DO UZUPEŁNIENIA]'}
- Termin subskrypcji: ${offerParams.terminSubskrypcji || '[DO UZUPEŁNIENIA]'}
- Miejsce składania zapisów: ${offerParams.miejsceZapisow || '[DO UZUPEŁNIENIA]'}
- Minimalna liczba akcji w zapisie: ${offerParams.minimalnaLiczbaAkcji || '[DO UZUPEŁNIENIA]'}
- Firma inwestycyjna: ${offerParams.firmaInwestycyjna || 'Oferta bez pośrednictwa firmy inwestycyjnej'}
- Data ważności memorandum: ${offerParams.dataWaznosci || '12 miesięcy od daty sporządzenia'}
` : '';
    // Najnowsze dane finansowe do użycia w promptach
    const fin = financials.length > 0 ? financials[financials.length - 1] : null;

    // Ryzyka branżowe na podstawie PKD
    const industryTemplate = company.pkdPrzewazajace ? findIndustryTemplate(company.pkdPrzewazajace) : null;
    const industryRisksText = industryTemplate
        ? `RYZYKA SPECYFICZNE DLA BRANŻY (${industryTemplate.name}):\n${generateIndustryRisks(industryTemplate)}\n\nUWAGA: Użyj POWYŻSZYCH ryzyk branżowych i dostosuj je do konkretnej sytuacji Spółki!`
        : `RYZYKA UNIWERSALNE:\n${UNIVERSAL_RISKS.slice(0, 7).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

    const companyData = `
DANE SPÓŁKI (z odpisu KRS):
- Pełna nazwa: ${company.nazwa}
- Numer KRS: ${company.krs}
- NIP: ${company.nip}
- REGON: ${company.regon}
- Forma prawna: ${company.formaOrganizacyjna}
- Siedziba i adres: ${company.siedzibaAdres}
- Kapitał zakładowy: ${company.kapitalZakladowy?.toLocaleString('pl-PL')} PLN (wpłacony w całości)
- PKD przeważające: ${company.pkdPrzewazajace}
- Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko} - ${z.funkcja}`).join('; ')}
- Sposób reprezentacji: ${company.sposobReprezentacji}
`;

    // Pre-oblicz wskaźniki YoY
    let yoyAnalysis = '';
    if (financials.length >= 2) {
        const curr = financials[0]; // najnowszy rok
        const prev = financials[1]; // poprzedni rok

        // Dynamika przychodów
        if (curr.przychodyNetto && prev.przychodyNetto) {
            const revenueChange = ((curr.przychodyNetto - prev.przychodyNetto) / prev.przychodyNetto) * 100;
            const revenueDir = revenueChange >= 0 ? 'wzrost' : 'spadek';
            yoyAnalysis += `- Przychody: ${revenueDir} o ${Math.abs(revenueChange).toFixed(1)}% (z ${prev.przychodyNetto.toLocaleString('pl-PL')} do ${curr.przychodyNetto.toLocaleString('pl-PL')} PLN)\n`;
        }

        // Dynamika zysku
        if (curr.zyskNetto && prev.zyskNetto) {
            const profitChange = ((curr.zyskNetto - prev.zyskNetto) / Math.abs(prev.zyskNetto)) * 100;
            const profitDir = profitChange >= 0 ? 'wzrost' : 'spadek';
            yoyAnalysis += `- Zysk netto: ${profitDir} o ${Math.abs(profitChange).toFixed(1)}% (z ${prev.zyskNetto.toLocaleString('pl-PL')} do ${curr.zyskNetto.toLocaleString('pl-PL')} PLN)\n`;
        }

        // Rentowność netto
        if (curr.zyskNetto && curr.przychodyNetto) {
            const currProfitability = (curr.zyskNetto / curr.przychodyNetto) * 100;
            yoyAnalysis += `- Rentowność netto ${curr.rok}: ${currProfitability.toFixed(1)}%\n`;
        }
        if (prev.zyskNetto && prev.przychodyNetto) {
            const prevProfitability = (prev.zyskNetto / prev.przychodyNetto) * 100;
            yoyAnalysis += `- Rentowność netto ${prev.rok}: ${prevProfitability.toFixed(1)}%\n`;
        }

        // Wskaźnik zadłużenia
        if (curr.zobowiazania && curr.sumaBilansowa) {
            const debtRatio = (curr.zobowiazania / curr.sumaBilansowa) * 100;
            yoyAnalysis += `- Wskaźnik zadłużenia ${curr.rok}: ${debtRatio.toFixed(1)}%\n`;
        }
    }

    const finData = financials.length > 0
        ? `
DANE FINANSOWE (z dokumentów):
${financials.map(f => `
Rok ${f.rok}:
- Przychody netto ze sprzedaży: ${f.przychodyNetto?.toLocaleString('pl-PL')} PLN
- Zysk (strata) netto: ${f.zyskNetto?.toLocaleString('pl-PL')} PLN
- Suma bilansowa: ${f.sumaBilansowa?.toLocaleString('pl-PL')} PLN
- Kapitał własny: ${f.kapitalWlasny?.toLocaleString('pl-PL')} PLN
- Zobowiązania ogółem: ${f.zobowiazania?.toLocaleString('pl-PL')} PLN`).join('')}

=== PRE-OBLICZONE WSKAŹNIKI (użyj tych wartości!) ===
${yoyAnalysis || 'Brak danych porównawczych'}`
        : '\nDANE FINANSOWE: [DO UZUPEŁNIENIA - nie dostarczono sprawozdań]\n';

    const subsectionsText = section.subsections.map(s => s).join('\n');

    const sectionPrompts: Record<string, string> = {
        intro: `Napisz rozdział I. WSTĘP memorandum informacyjnego zgodnie z Dz.U. 2020.1053.

${companyData}
${offerData}

WYMAGANE PARAGRAFY (rozpisz każdy szczegółowo):
${subsectionsText}

${FORMATTING_RULES}

SZCZEGÓŁOWE WYMAGANIA:
- §1: Podaj pełne dane emitenta (nazwa, KRS, NIP, REGON, adres, kapitał)
- §2: Jeśli sprzedającym jest emitent, napisz "Sprzedającym jest Emitent"
- §3: Opisz rodzaj akcji (zwykłe na okaziciela), użyj KONKRETNYCH danych z PARAMETRÓW OFERTY jeśli podane
- §4: "Emisja nie jest objęta gwarancją" lub szczegóły gwaranta
- §5: Cena emisyjna - użyj KONKRETNEJ wartości z PARAMETRÓW OFERTY jeśli podana
- §6: Cytuj: "Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w niniejszym memorandum informacyjnym."
- §7: Powołaj się na art. 37a ustawy z dnia 29 lipca 2005 r. o ofercie publicznej
- §8: Firma inwestycyjna - użyj KONKRETNEJ wartości z PARAMETRÓW OFERTY jeśli podana
- §9: Data ważności - użyj KONKRETNEJ wartości z PARAMETRÓW OFERTY jeśli podana
- §10: Informacje o zmianach publikowane na stronie [DO UZUPEŁNIENIA]`,

        risks: `Napisz rozdzial II. CZYNNIKI RYZYKA zgodnie z Dz.U. 2020.1053.

${companyData}
${finData}

WYMAGANE PARAGRAFY:
${subsectionsText}

${FORMATTING_RULES}

${industryRisksText}

KLUCZOWE INSTRUKCJE - AUTOMATYCZNA OCENA RYZYK:
Na podstawie danych finansowych SAMODZIELNIE ocen i opisz ryzyka. NIE uzywaj [DO UZUPELNIENIA]!

ANALIZA DANYCH FINANSOWYCH (uzyj konkretnych liczb):
- Przychody: ${fin?.przychodyNetto?.toLocaleString('pl-PL') || 0} PLN
- Zysk netto: ${fin?.zyskNetto?.toLocaleString('pl-PL') || 0} PLN
- Aktywa obrotowe: ${fin?.aktywaObrotowe?.toLocaleString('pl-PL') || 0} PLN
- Zobowiazania: ${fin?.zobowiazania?.toLocaleString('pl-PL') || 0} PLN
- Kapital wlasny: ${fin?.kapitalWlasny?.toLocaleString('pl-PL') || 0} PLN

KONKRETNE WSKAZNIKI (oblicz i uzyj w opisach):
- Wskaznik zadluzenia: ${fin?.sumaBilansowa ? ((fin.zobowiazania / fin.sumaBilansowa) * 100).toFixed(1) : '?'}%
- Rentownosc netto: ${fin?.przychodyNetto ? ((fin.zyskNetto / fin.przychodyNetto) * 100).toFixed(1) : '?'}%

STRUKTURA SEKCJI:
- §11 (5+ ryzyk operacyjnych - UŻyj RYZYK BRANŻOWYCH z góry!)
- §12 (4+ ryzyka finansowe - użyj KONKRETNYCH wskaźników!)
- §13 (4+ ryzyka inwestycyjne)

Kazde ryzyko opisz w 3-5 zdaniach z konkretnymi liczbami!`,

        offer: `Napisz rozdział IV. DANE O OFERCIE AKCJI zgodnie z Dz.U. 2020.1053.

${companyData}
${offerData}

WYMAGANE PARAGRAFY (rozpisz każdy szczegółowo):
${subsectionsText}

${FORMATTING_RULES}

SZCZEGÓŁOWE WYMAGANIA (użyj KONKRETNYCH danych z PARAMETRÓW OFERTY jeśli podane!):
- §16: Rodzaj (akcje zwykłe na okaziciela serii [SERIA]), liczba [LICZBA AKCJI], wartość nominalna [WARTOŚĆ NOMINALNA] PLN - użyj danych z PARAMETRÓW OFERTY
- §17: Cele emisji - użyj KONKRETNYCH celów z PARAMETRÓW OFERTY jeśli podane
- §18: Szacunkowe koszty: przygotowanie dokumentacji, doradztwo, opłaty giełdowe
- §19: Uchwała WZA nr [_] z dnia [_]
- §20: Czy akcjonariusze mają prawo pierwszeństwa
- §21: Od kiedy akcje uczestniczą w dywidendzie
- §22: Prawa majątkowe (dywidenda, udział w masie likwidacyjnej) i korporacyjne (głos na WZA, prawo poboru)
- §23: Polityka dywidendowa - czy spółka zamierza wypłacać dywidendę
- §24: Podatek od dywidendy 19%, podatek od zysków kapitałowych 19%
- §25: Umowy gwarancyjne [DO UZUPEŁNIENIA] lub brak
- §26: Terminy oferty [TERMIN SUBSKRYPCJI], miejsce zapisów [MIEJSCE ZAPISÓW], min. liczba akcji [MINIMALNA LICZBA] - użyj danych z PARAMETRÓW OFERTY`,

        issuer: `Napisz rozdział V. DANE O EMITENCIE zgodnie z Dz.U. 2020.1053.

${companyData}
${finData}

WYMAGANE PARAGRAFY (rozpisz każdy):
${subsectionsText}

${FORMATTING_RULES}

SZCZEGÓŁOWE WYMAGANIA:
- §27: Pełne dane rejestrowe (wszystkie z KRS)
- §28: "Spółka została utworzona na czas nieoznaczony"
- §29: Kodeks spółek handlowych, ustawa o ofercie publicznej
- §30: Sąd Rejonowy [DO UZUPEŁNIENIA], Wydział Gospodarczy KRS
- §31: Data powstania, kluczowe wydarzenia, rozwój działalności
- §32: Kapitał zakładowy, kapitał zapasowy, kapitały rezerwowe
- §33: Czy całość kapitału została opłacona
- §34: Planowane podwyższenia kapitału
- §35: Upoważnienie zarządu do emisji w ramach kapitału docelowego
- §36: Na jakich rynkach są/były notowane akcje
- §37: Czy spółka posiada rating
- §38: Spółki zależne, dominujące, powiązane
- §39: Główne produkty/usługi, udział w rynku
- §40: Znaczące inwestycje
- §41-42: Postępowania sądowe, administracyjne
- §43: Główne zobowiązania
- §44: Nietypowe zdarzenia mające wpływ na wyniki
- §45: Istotne zmiany w ostatnim okresie
- §46: Prognozy (jeśli publikowane)
- §47: Imiona, nazwiska, funkcje członków zarządu i RN
- §48: Akcjonariusze powyżej 5% głosów`,

        financial: `Napisz rozdział VI. SPRAWOZDANIA FINANSOWE zgodnie z Dz.U. 2020.1053.

${companyData}
${finData}

WYMAGANE PARAGRAFY:
${subsectionsText}

${FORMATTING_RULES}

SZCZEGÓŁOWE WYMAGANIA:
- §49: Omów sytuację finansową: przychody, rentowność, płynność, zadłużenie
- §50: Podsumuj kluczowe pozycje bilansu i rachunku zysków i strat
- §51: Status opinii biegłego rewidenta [DO UZUPEŁNIENIA]
- §52: Wyniki za ostatni kwartał [DO UZUPEŁNIENIA]

ANALIZA FINANSOWA (opisz słownie, NIE rysuj tabel):
- Dynamika przychodów rok do roku
- Rentowność (zysk/przychody)
- Wskaźnik płynności (aktywa obrotowe/zobowiązania krótkoterminowe)
- Wskaźnik zadłużenia (zobowiązania/suma bilansowa)

NIE UŻYWAJ TABEL ASCII - tabela finansowa zostanie wygenerowana osobno.`,
    };

    return sectionPrompts[sectionId] || `Napisz sekcję ${section.title} memorandum.\n${companyData}`;
}

// ============================================
// SEKCJE STATYCZNE
// ============================================

async function* generateResponsibleSection(c: KRSCompany): AsyncGenerator<string> {
    yield `§14. EMITENT

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
OŚWIADCZENIE EMITENTA:

"Oświadczamy, że zgodnie z naszą najlepszą wiedzą i przy dołożeniu należytej staranności, informacje zawarte w memorandum są prawdziwe, rzetelne i zgodne ze stanem faktycznym, oraz że memorandum nie pomija niczego, co mogłoby wpływać na jego znaczenie."

Miejscowość, data: [DO UZUPEŁNIENIA]

Podpisy osób odpowiedzialnych:
`;
    for (const z of c.reprezentacja || []) {
        yield `\n________________________\n${z.imie} ${z.nazwisko}\n${z.funkcja}\n`;
    }
    yield `
§15. FIRMA INWESTYCYJNA

[DO UZUPEŁNIENIA - dane firmy inwestycyjnej pośredniczącej w ofercie, jeśli dotyczy]

`;
}

async function* generateAttachmentsSection(): AsyncGenerator<string> {
    yield `§53. ODPIS Z KRAJOWEGO REJESTRU SĄDOWEGO

Aktualny odpis z KRS stanowi załącznik nr 1 do niniejszego memorandum.

§54. STATUT

Aktualny tekst jednolity statutu Spółki stanowi załącznik nr 2.

§55. UCHWAŁY WALNEGO ZGROMADZENIA

Treść uchwał WZA dotyczących emisji akcji stanowi załącznik nr 3.

§56. WZÓR FORMULARZA ZAPISU NA AKCJE

Wzór formularza zapisu stanowi załącznik nr 4.

§57. WZÓR OŚWIADCZENIA O WYCOFANIU ZGODY

Wzór oświadczenia o odstąpieniu od zapisu stanowi załącznik nr 5.

§58. DEFINICJE I OBJAŚNIENIA SKRÓTÓW

Akcje - akcje zwykłe na okaziciela emitowane przez Spółkę
ASO - Alternatywny System Obrotu
Emitent, Spółka - ${'{nazwa spółki}'} S.A.
GPW - Giełda Papierów Wartościowych w Warszawie S.A.
KDPW - Krajowy Depozyt Papierów Wartościowych S.A.
KNF - Komisja Nadzoru Finansowego
KRS - Krajowy Rejestr Sądowy
KSH - Kodeks spółek handlowych
Memorandum - niniejsze memorandum informacyjne
NewConnect - rynek NewConnect prowadzony przez GPW
NIP - Numer Identyfikacji Podatkowej
Oferta - publiczna oferta Akcji
PKD - Polska Klasyfikacja Działalności
PLN - złoty polski
REGON - Krajowy Rejestr Urzędowy Podmiotów Gospodarki Narodowej
RN - Rada Nadzorcza
Ustawa o ofercie - ustawa z dnia 29 lipca 2005 r. o ofercie publicznej
WZA - Walne Zgromadzenie Akcjonariuszy
Zarząd - Zarząd Spółki
`;
}

// ============================================
// FORMATOWANIE TABELI FINANSOWEJ
// ============================================

export function formatFinancialTable(financials: FinancialData[]): string {
    if (!financials.length) return '[BRAK DANYCH FINANSOWYCH]\n';

    // Zwróć dane w formacie tekstowym (tabela graficzna generowana w PDF)
    let result = 'Wybrane dane finansowe (szczegółowa tabela w dokumencie PDF):\n\n';

    for (const f of financials) {
        result += `Rok ${f.rok}:\n`;
        result += `  Przychody netto: ${f.przychodyNetto?.toLocaleString('pl-PL')} PLN\n`;
        result += `  Zysk netto: ${f.zyskNetto?.toLocaleString('pl-PL')} PLN\n`;
        result += `  Suma bilansowa: ${f.sumaBilansowa?.toLocaleString('pl-PL')} PLN\n`;
        result += `  Kapitał własny: ${f.kapitalWlasny?.toLocaleString('pl-PL')} PLN\n`;
        result += `  Zobowiązania: ${f.zobowiazania?.toLocaleString('pl-PL')} PLN\n\n`;
    }

    return result;
}
