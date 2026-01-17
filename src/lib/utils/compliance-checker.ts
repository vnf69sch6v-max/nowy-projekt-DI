/**
 * Checklist zgodności z rozporządzeniem Dz.U. 2020.1053
 * Rozporządzenie Ministra Finansów w sprawie prospektu
 */

export interface ComplianceItem {
    paragraph: string;
    title: string;
    description: string;
    required: boolean;
    section: 'intro' | 'risks' | 'responsible' | 'offer' | 'issuer' | 'financial' | 'attachments';
    checkPatterns: string[];
}

/**
 * Pełna lista wymagań rozporządzenia
 */
export const REGULATION_CHECKLIST: ComplianceItem[] = [
    // WSTĘP (§1-§16)
    {
        paragraph: '§1',
        title: 'Nazwa emitenta',
        description: 'Pełna nazwa (firma) emitenta',
        required: true,
        section: 'intro',
        checkPatterns: ['nazwa emitenta', 'emitent:', 'spółka akcyjna'],
    },
    {
        paragraph: '§2',
        title: 'Siedziba i adres',
        description: 'Siedziba i adres emitenta wraz z numerami telekomunikacyjnymi',
        required: true,
        section: 'intro',
        checkPatterns: ['siedziba', 'adres', 'telefon', 'email', 'strona internetowa'],
    },
    {
        paragraph: '§3',
        title: 'Numer KRS',
        description: 'Numer wpisu do właściwego rejestru',
        required: true,
        section: 'intro',
        checkPatterns: ['krs', 'krajowy rejestr sądowy', 'numer wpisu'],
    },
    {
        paragraph: '§4',
        title: 'NIP',
        description: 'Numer identyfikacji podatkowej (NIP)',
        required: true,
        section: 'intro',
        checkPatterns: ['nip', 'numer identyfikacji podatkowej'],
    },
    {
        paragraph: '§5',
        title: 'Liczba i rodzaj akcji',
        description: 'Liczba, rodzaj, jednostkowa wartość nominalna i oznaczenie serii akcji',
        required: true,
        section: 'intro',
        checkPatterns: ['liczba akcji', 'seria akcji', 'wartość nominalna', 'akcje zwykłe'],
    },
    {
        paragraph: '§6',
        title: 'Cel emisji',
        description: 'Cel emisji akcji',
        required: true,
        section: 'intro',
        checkPatterns: ['cel emisji', 'przeznaczenie środków', 'pozyskane środki'],
    },
    {
        paragraph: '§7',
        title: 'Cena emisyjna',
        description: 'Cena emisyjna lub sposób jej ustalenia',
        required: true,
        section: 'intro',
        checkPatterns: ['cena emisyjna', 'cena akcji', 'sposób ustalenia ceny'],
    },
    {
        paragraph: '§8',
        title: 'Sprzedający',
        description: 'Wskazanie sprzedającego akcje',
        required: true,
        section: 'intro',
        checkPatterns: ['sprzedający', 'oferta sprzedaży'],
    },
    {
        paragraph: '§9',
        title: 'Wartość emisji',
        description: 'Przewidywane wpływy netto z emisji',
        required: true,
        section: 'offer',
        checkPatterns: ['wpływy z emisji', 'wartość emisji', 'środki pozyskane'],
    },
    {
        paragraph: '§10',
        title: 'Koszty emisji',
        description: 'Szacunkowe koszty emisji',
        required: true,
        section: 'offer',
        checkPatterns: ['koszty emisji', 'wynagrodzenie', 'opłaty'],
    },

    // CZYNNIKI RYZYKA (§17-§18)
    {
        paragraph: '§17',
        title: 'Czynniki ryzyka',
        description: 'Opis czynników ryzyka związanych z emitentem i oferowanymi papierami',
        required: true,
        section: 'risks',
        checkPatterns: ['czynniki ryzyka', 'ryzyko', 'zagrożenie'],
    },
    {
        paragraph: '§18',
        title: 'Kategoryzacja ryzyk',
        description: 'Ryzyka powinny być pogrupowane według kategorii',
        required: true,
        section: 'risks',
        checkPatterns: ['ryzyko rynkowe', 'ryzyko operacyjne', 'ryzyko regulacyjne', 'ryzyko finansowe'],
    },

    // OSOBY ODPOWIEDZIALNE (§19-§21)
    {
        paragraph: '§19',
        title: 'Osoby odpowiedzialne',
        description: 'Wskazanie osób odpowiedzialnych za informacje zawarte w memorandum',
        required: true,
        section: 'responsible',
        checkPatterns: ['osoby odpowiedzialne', 'odpowiedzialność', 'zarząd'],
    },
    {
        paragraph: '§20',
        title: 'Oświadczenie',
        description: 'Oświadczenie osób odpowiedzialnych o prawdziwości informacji',
        required: true,
        section: 'responsible',
        checkPatterns: ['oświadczam', 'zgodne z prawdą', 'rzetelne'],
    },

    // DANE O OFERCIE (§22-§35)
    {
        paragraph: '§22',
        title: 'Warunki oferty',
        description: 'Termin otwarcia i zamknięcia subskrypcji',
        required: true,
        section: 'offer',
        checkPatterns: ['termin subskrypcji', 'otwarcie subskrypcji', 'zamknięcie subskrypcji'],
    },
    {
        paragraph: '§23',
        title: 'Miejsca przyjmowania zapisów',
        description: 'Miejsca, w których można składać zapisy na akcje',
        required: true,
        section: 'offer',
        checkPatterns: ['zapisy na akcje', 'miejsce zapisów', 'dom maklerski'],
    },
    {
        paragraph: '§24',
        title: 'Minimalna liczba akcji',
        description: 'Minimalna i maksymalna liczba akcji objętych jednym zapisem',
        required: true,
        section: 'offer',
        checkPatterns: ['minimalna liczba akcji', 'minimalny zapis', 'przydział akcji'],
    },
    {
        paragraph: '§25',
        title: 'Podstawa prawna emisji',
        description: 'Uchwała o emisji akcji',
        required: true,
        section: 'offer',
        checkPatterns: ['uchwała', 'walne zgromadzenie', 'podstawa prawna'],
    },
    {
        paragraph: '§26',
        title: 'Prawa z akcji',
        description: 'Opis praw wynikających z akcji',
        required: true,
        section: 'offer',
        checkPatterns: ['prawa z akcji', 'dywidenda', 'prawo głosu'],
    },

    // DANE O EMITENCIE (§36-§48)
    {
        paragraph: '§36',
        title: 'Historia emitenta',
        description: 'Krótki opis historii emitenta',
        required: true,
        section: 'issuer',
        checkPatterns: ['historia', 'powstanie spółki', 'rozwój'],
    },
    {
        paragraph: '§37',
        title: 'Kapitał zakładowy',
        description: 'Wysokość kapitału zakładowego',
        required: true,
        section: 'issuer',
        checkPatterns: ['kapitał zakładowy', 'struktura kapitału'],
    },
    {
        paragraph: '§38',
        title: 'Zarząd',
        description: 'Skład zarządu i organów nadzorczych',
        required: true,
        section: 'issuer',
        checkPatterns: ['zarząd', 'prezes', 'rada nadzorcza', 'członek zarządu'],
    },
    {
        paragraph: '§39',
        title: 'Struktura akcjonariatu',
        description: 'Akcjonariusze posiadający co najmniej 5% głosów',
        required: true,
        section: 'issuer',
        checkPatterns: ['akcjonariusze', 'struktura właścicielska', 'głosy'],
    },
    {
        paragraph: '§40',
        title: 'Przedmiot działalności',
        description: 'Opis przedmiotu działalności emitenta',
        required: true,
        section: 'issuer',
        checkPatterns: ['przedmiot działalności', 'pkd', 'działalność gospodarcza'],
    },
    {
        paragraph: '§41',
        title: 'Rynek i konkurencja',
        description: 'Opis rynku i pozycji konkurencyjnej',
        required: true,
        section: 'issuer',
        checkPatterns: ['rynek', 'konkurencja', 'udział w rynku'],
    },

    // SPRAWOZDANIA FINANSOWE (§49-§58)
    {
        paragraph: '§49',
        title: 'Bilans',
        description: 'Dane finansowe - bilans',
        required: true,
        section: 'financial',
        checkPatterns: ['bilans', 'aktywa', 'pasywa', 'suma bilansowa'],
    },
    {
        paragraph: '§50',
        title: 'Rachunek zysków i strat',
        description: 'Dane finansowe - rachunek wyników',
        required: true,
        section: 'financial',
        checkPatterns: ['rachunek zysków i strat', 'przychody', 'zysk netto'],
    },
    {
        paragraph: '§51',
        title: 'Opinia biegłego',
        description: 'Opinia biegłego rewidenta lub oświadczenie o braku badania',
        required: true,
        section: 'financial',
        checkPatterns: ['biegły rewident', 'opinia', 'badanie sprawozdania'],
    },
];

/**
 * Sprawdza zgodność treści z checklistą
 */
export function checkCompliance(content: string): {
    total: number;
    passed: number;
    failed: ComplianceItem[];
    score: number;
}[] {
    const contentLower = content.toLowerCase();

    const sections = ['intro', 'risks', 'responsible', 'offer', 'issuer', 'financial'] as const;
    const results: { total: number; passed: number; failed: ComplianceItem[]; score: number }[] = [];

    for (const section of sections) {
        const sectionItems = REGULATION_CHECKLIST.filter(item => item.section === section);
        const failed: ComplianceItem[] = [];
        let passed = 0;

        for (const item of sectionItems) {
            const hasMatch = item.checkPatterns.some(pattern =>
                contentLower.includes(pattern.toLowerCase())
            );

            if (hasMatch) {
                passed++;
            } else if (item.required) {
                failed.push(item);
            }
        }

        results.push({
            total: sectionItems.length,
            passed,
            failed,
            score: sectionItems.length > 0 ? Math.round((passed / sectionItems.length) * 100) : 100,
        });
    }

    return results;
}

/**
 * Generuje raport zgodności
 */
export function generateComplianceReport(content: string): string {
    const contentLower = content.toLowerCase();
    const lines: string[] = [
        '',
        '═══════════════════════════════════════════════════════════════',
        'RAPORT ZGODNOŚCI Z ROZPORZĄDZENIEM Dz.U. 2020.1053',
        '═══════════════════════════════════════════════════════════════',
        '',
    ];

    let totalPassed = 0;
    let totalItems = 0;
    const missingItems: ComplianceItem[] = [];

    for (const item of REGULATION_CHECKLIST) {
        totalItems++;
        const hasMatch = item.checkPatterns.some(pattern =>
            contentLower.includes(pattern.toLowerCase())
        );

        if (hasMatch) {
            totalPassed++;
        } else if (item.required) {
            missingItems.push(item);
        }
    }

    const score = Math.round((totalPassed / totalItems) * 100);

    lines.push(`Ogólny wynik: ${score}% (${totalPassed}/${totalItems} wymagań spełnionych)`);
    lines.push('');

    if (missingItems.length > 0) {
        lines.push('BRAKUJĄCE ELEMENTY:');
        lines.push('');
        for (const item of missingItems) {
            lines.push(`  ⚠ ${item.paragraph} - ${item.title}`);
            lines.push(`    ${item.description}`);
        }
    } else {
        lines.push('✓ Wszystkie wymagane elementy są obecne w dokumencie.');
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Wykrywa luki i sugeruje uzupełnienia
 */
export function detectGaps(content: string): { paragraph: string; suggestion: string }[] {
    const contentLower = content.toLowerCase();
    const gaps: { paragraph: string; suggestion: string }[] = [];

    // Sprawdź główne wymagania
    if (!contentLower.includes('cel emisji') && !contentLower.includes('przeznaczenie środków')) {
        gaps.push({
            paragraph: '§6',
            suggestion: 'Dodaj sekcję opisującą cel emisji i planowane przeznaczenie pozyskanych środków.',
        });
    }

    if (!contentLower.includes('cena emisyjna')) {
        gaps.push({
            paragraph: '§7',
            suggestion: 'Uzupełnij cenę emisyjną akcji lub opisz sposób jej ustalenia.',
        });
    }

    if (!contentLower.includes('termin subskrypcji') && !contentLower.includes('okres zapisów')) {
        gaps.push({
            paragraph: '§22',
            suggestion: 'Określ termin otwarcia i zamknięcia subskrypcji na akcje.',
        });
    }

    if (!contentLower.includes('miejsce zapisów') && !contentLower.includes('dom maklerski')) {
        gaps.push({
            paragraph: '§23',
            suggestion: 'Wskaż miejsca/podmioty przyjmujące zapisy na akcje.',
        });
    }

    if (!contentLower.includes('biegły rewident') && !contentLower.includes('opinia')) {
        gaps.push({
            paragraph: '§51',
            suggestion: 'Dodaj informację o opinii biegłego rewidenta lub oświadczenie o braku badania.',
        });
    }

    return gaps;
}
