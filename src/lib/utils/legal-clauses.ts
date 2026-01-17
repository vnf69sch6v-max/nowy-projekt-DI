/**
 * Standardowe klauzule prawne dla memorandum
 */

export interface LegalClause {
    id: string;
    name: string;
    section: string;
    text: string;
    required: boolean;
}

/**
 * Standardowe klauzule zgodne z rozporządzeniem
 */
export const STANDARD_CLAUSES: LegalClause[] = [
    // OŚWIADCZENIA
    {
        id: 'liability_statement',
        name: 'Oświadczenie o odpowiedzialności',
        section: 'responsible',
        text: `Oświadczamy, że zgodnie z naszą najlepszą wiedzą i przy dołożeniu należytej staranności, 
by zapewnić taki stan, informacje zawarte w memorandum są prawdziwe, rzetelne i zgodne ze 
stanem faktycznym, oraz że w memorandum nie pominięto niczego, co mogłoby wpływać na 
jego znaczenie.`,
        required: true,
    },
    {
        id: 'prospectus_disclaimer',
        name: 'Zastrzeżenie o braku prospektu',
        section: 'intro',
        text: `Niniejsze memorandum informacyjne zostało sporządzone w związku z ofertą publiczną akcji 
prowadzoną na podstawie art. 37a ust. 2 ustawy z dnia 29 lipca 2005 r. o ofercie publicznej, 
bez konieczności sporządzania prospektu emisyjnego. Memorandum nie jest prospektem 
emisyjnym i nie podlega zatwierdzeniu przez Komisję Nadzoru Finansowego.`,
        required: true,
    },

    // RYZYKA UNIWERSALNE
    {
        id: 'risk_market',
        name: 'Ryzyko rynkowe',
        section: 'risks',
        text: `Spółka jest narażona na ryzyko związane z ogólną koniunkturą gospodarczą, wahaniami 
popytu na rynku oraz zmianami preferencji konsumentów. Negatywne zmiany w otoczeniu 
makroekonomicznym mogą wpłynąć na wyniki finansowe Spółki.`,
        required: true,
    },
    {
        id: 'risk_liquidity',
        name: 'Ryzyko płynności akcji',
        section: 'risks',
        text: `Istnieje ryzyko ograniczonej płynności akcji Spółki. Inwestorzy mogą napotkać trudności 
ze zbyciem akcji po oczekiwanej cenie lub w oczekiwanym terminie. Cena akcji może 
podlegać znacznym wahaniom.`,
        required: true,
    },
    {
        id: 'risk_dilution',
        name: 'Ryzyko rozwodnienia',
        section: 'risks',
        text: `W wyniku emisji nowych akcji może nastąpić rozwodnienie udziału dotychczasowych 
akcjonariuszy w kapitale zakładowym i w ogólnej liczbie głosów na Walnym Zgromadzeniu. 
Rozwodnienie może wpłynąć na wartość posiadanych akcji.`,
        required: true,
    },
    {
        id: 'risk_emission_failure',
        name: 'Ryzyko niedojścia emisji',
        section: 'risks',
        text: `Istnieje ryzyko, że emisja akcji nie dojdzie do skutku w przypadku nieobjęcia 
minimalnej liczby akcji lub z innych przyczyn określonych w warunkach emisji. 
W takim przypadku wpłaty zostaną zwrócone subskrybentom.`,
        required: true,
    },
    {
        id: 'risk_regulatory',
        name: 'Ryzyko regulacyjne',
        section: 'risks',
        text: `Działalność Spółki podlega regulacjom prawnym, które mogą ulegać zmianom. Zmiany 
w przepisach prawa, w tym prawa podatkowego, mogą wpłynąć na działalność operacyjną 
i wyniki finansowe Spółki.`,
        required: true,
    },

    // PRAWA Z AKCJI
    {
        id: 'rights_dividend',
        name: 'Prawo do dywidendy',
        section: 'offer',
        text: `Akcjonariusze mają prawo do udziału w zysku wykazanym w sprawozdaniu finansowym, 
zbadanym przez biegłego rewidenta, który został przeznaczony przez Walne Zgromadzenie 
do wypłaty akcjonariuszom. Dywidenda jest wypłacana proporcjonalnie do liczby posiadanych akcji.`,
        required: true,
    },
    {
        id: 'rights_voting',
        name: 'Prawo głosu',
        section: 'offer',
        text: `Każda akcja na okaziciela daje prawo do jednego głosu na Walnym Zgromadzeniu. 
Akcjonariusze mogą uczestniczyć w Walnym Zgromadzeniu osobiście lub przez pełnomocnika.`,
        required: true,
    },
    {
        id: 'rights_preemptive',
        name: 'Prawo poboru',
        section: 'offer',
        text: `Akcjonariuszom przysługuje prawo poboru akcji nowej emisji proporcjonalnie do liczby 
posiadanych akcji. Walne Zgromadzenie może pozbawić akcjonariuszy prawa poboru w całości 
lub w części, jeśli jest to uzasadnione interesem Spółki.`,
        required: true,
    },

    // ZASTRZEŻENIA
    {
        id: 'disclaimer_forward',
        name: 'Zastrzeżenie dot. prognoz',
        section: 'issuer',
        text: `Niniejsze memorandum może zawierać stwierdzenia odnoszące się do przyszłości. Takie 
stwierdzenia są jedynie wyrazem obecnych oczekiwań Spółki i obarczone są ryzykiem oraz 
niepewnością. Rzeczywiste wyniki mogą istotnie różnić się od prognoz.`,
        required: false,
    },
    {
        id: 'disclaimer_tax',
        name: 'Zastrzeżenie podatkowe',
        section: 'offer',
        text: `Niniejsze memorandum nie stanowi porady podatkowej. Inwestorzy powinni zasięgnąć 
niezależnej porady podatkowej w zakresie konsekwencji nabycia, posiadania i zbycia akcji 
zgodnie z przepisami prawa obowiązującymi w ich jurysdykcji.`,
        required: false,
    },
];

/**
 * Pobiera klauzule dla danej sekcji
 */
export function getClausesForSection(section: string): LegalClause[] {
    return STANDARD_CLAUSES.filter(c => c.section === section);
}

/**
 * Pobiera wymagane klauzule
 */
export function getRequiredClauses(): LegalClause[] {
    return STANDARD_CLAUSES.filter(c => c.required);
}

/**
 * Sprawdza czy dokument zawiera klauzulę
 */
export function hasClause(content: string, clause: LegalClause): boolean {
    // Check for key phrases from the clause
    const keyPhrases = clause.text
        .split('.')
        .map(s => s.trim().substring(0, 30).toLowerCase())
        .filter(s => s.length > 10);

    return keyPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

/**
 * Zwraca brakujące wymagane klauzule
 */
export function getMissingClauses(content: string): LegalClause[] {
    return getRequiredClauses().filter(clause => !hasClause(content, clause));
}

/**
 * Generuje tekst z brakującymi klauzulami
 */
export function generateMissingClausesText(content: string): string {
    const missing = getMissingClauses(content);

    if (missing.length === 0) return '';

    const lines: string[] = [
        '',
        '═══════════════════════════════════════════════════════════════',
        'BRAKUJĄCE KLAUZULE STANDARDOWE',
        '═══════════════════════════════════════════════════════════════',
        '',
        `Wykryto ${missing.length} brakujących klauzul wymaganych przepisami:`,
        '',
    ];

    for (const clause of missing) {
        lines.push(`📌 ${clause.name} (sekcja: ${clause.section})`);
        lines.push(`   ${clause.text.substring(0, 100)}...`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Sugeruje klauzulę na podstawie kontekstu
 */
export function suggestClause(section: string, context: string): LegalClause | null {
    const sectionClauses = getClausesForSection(section);

    // Find most relevant clause based on context
    for (const clause of sectionClauses) {
        const keywords = clause.name.toLowerCase().split(' ');
        if (keywords.some(kw => context.toLowerCase().includes(kw))) {
            return clause;
        }
    }

    return sectionClauses[0] || null;
}
