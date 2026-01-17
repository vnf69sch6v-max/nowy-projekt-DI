/**
 * Szablony branżowe i baza ryzyk wg PKD
 */

export interface IndustryTemplate {
    name: string;
    pkdCodes: string[];
    specificRisks: string[];
    regulatoryRisks: string[];
    marketRisks: string[];
    operationalRisks: string[];
    sectionHints: {
        business: string;
        competition: string;
        outlook: string;
    };
}

/**
 * Szablony dla głównych branż
 */
export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
    it: {
        name: 'Technologie informacyjne / IT',
        pkdCodes: ['62.01', '62.02', '62.03', '62.09', '63.11', '63.12'],
        specificRisks: [
            'Ryzyko utraty kluczowych programistów i specjalistów IT',
            'Ryzyko szybkiej dezaktualizacji technologii i konieczności ciągłych inwestycji w R&D',
            'Ryzyko cyberbezpieczeństwa i potencjalnych naruszeń danych',
            'Ryzyko niewykonania projektów w terminie i budżecie',
            'Ryzyko uzależnienia od głównych klientów korporacyjnych',
        ],
        regulatoryRisks: [
            'Ryzyko związane z RODO i ochroną danych osobowych',
            'Ryzyko zmian regulacji dotyczących AI i automatyzacji',
            'Ryzyko wymogów certyfikacji i compliance',
        ],
        marketRisks: [
            'Ryzyko silnej konkurencji ze strony globalnych graczy technologicznych',
            'Ryzyko szybkich zmian preferencji i technologii na rynku',
            'Ryzyko konsolidacji rynku IT',
        ],
        operationalRisks: [
            'Ryzyko awarii infrastruktury IT i przestojów',
            'Ryzyko uzależnienia od dostawców usług chmurowych',
        ],
        sectionHints: {
            business: 'Spółka działa w sektorze technologii informacyjnych, oferując [produkty/usługi]. Kluczowymi obszarami działalności są: rozwój oprogramowania, usługi IT, [inne].',
            competition: 'Głównymi konkurentami są [lista konkurentów]. Spółka wyróżnia się [przewagi konkurencyjne].',
            outlook: 'Rynek IT w Polsce rośnie w tempie [X]% rocznie. Spółka planuje rozwijać działalność poprzez [plany].',
        },
    },

    manufacturing: {
        name: 'Produkcja przemysłowa',
        pkdCodes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
        specificRisks: [
            'Ryzyko wahań cen surowców i materiałów produkcyjnych',
            'Ryzyko zakłóceń w łańcuchu dostaw',
            'Ryzyko awarii maszyn i linii produkcyjnych',
            'Ryzyko uzależnienia od głównych dostawców',
            'Ryzyko konieczności dużych nakładów inwestycyjnych',
        ],
        regulatoryRisks: [
            'Ryzyko zaostrzenia norm środowiskowych i emisyjnych',
            'Ryzyko zmian w przepisach BHP',
            'Ryzyko regulacji dotyczących zrównoważonego rozwoju (ESG)',
        ],
        marketRisks: [
            'Ryzyko wahań popytu w cyklach koniunkturalnych',
            'Ryzyko konkurencji cenowej z importu',
            'Ryzyko zmian preferencji konsumentów',
        ],
        operationalRisks: [
            'Ryzyko strajków i problemów z zatrudnieniem',
            'Ryzyko wzrostu kosztów energii',
        ],
        sectionHints: {
            business: 'Spółka prowadzi działalność produkcyjną w zakresie [produkty]. Zakłady produkcyjne zlokalizowane są w [lokalizacje].',
            competition: 'Rynek [branża] charakteryzuje się [opis]. Główni konkurenci to [lista].',
            outlook: 'Spółka planuje zwiększenie mocy produkcyjnych poprzez [plany inwestycyjne].',
        },
    },

    services: {
        name: 'Usługi profesjonalne',
        pkdCodes: ['69', '70', '71', '72', '73', '74', '78', '80', '81', '82'],
        specificRisks: [
            'Ryzyko utraty kluczowych pracowników i ekspertów',
            'Ryzyko uzależnienia od głównych klientów',
            'Ryzyko reputacyjne i odpowiedzialności zawodowej',
            'Ryzyko niskiej skalowalności modelu biznesowego',
        ],
        regulatoryRisks: [
            'Ryzyko zmian w regulacjach branżowych',
            'Ryzyko wymogów licencyjnych i certyfikacyjnych',
        ],
        marketRisks: [
            'Ryzyko presji cenowej ze strony konkurencji',
            'Ryzyko cykliczności popytu na usługi doradcze',
        ],
        operationalRisks: [
            'Ryzyko trudności w rekrutacji wykwalifikowanej kadry',
            'Ryzyko wzrostu kosztów wynagrodzeń',
        ],
        sectionHints: {
            business: 'Spółka świadczy usługi [rodzaj usług] dla klientów z sektora [sektory]. Zespół składa się z [liczba] specjalistów.',
            competition: 'Rynek usług [branża] jest konkurencyjny. Spółka wyróżnia się [przewagi].',
            outlook: 'Spółka planuje ekspansję poprzez [plany rozwoju].',
        },
    },

    retail: {
        name: 'Handel detaliczny',
        pkdCodes: ['47'],
        specificRisks: [
            'Ryzyko wahań sezonowych sprzedaży',
            'Ryzyko konkurencji ze strony e-commerce',
            'Ryzyko uzależnienia od lokalizacji sklepów',
            'Ryzyko zmian zachowań konsumentów',
        ],
        regulatoryRisks: [
            'Ryzyko ograniczeń handlu w niedziele',
            'Ryzyko regulacji ochrony konsumentów',
        ],
        marketRisks: [
            'Ryzyko presji marżowej',
            'Ryzyko inflacji wpływającej na popyt',
        ],
        operationalRisks: [
            'Ryzyko zarządzania zapasami',
            'Ryzyko rotacji pracowników',
        ],
        sectionHints: {
            business: 'Spółka prowadzi sieć [liczba] sklepów [format] oferujących [produkty].',
            competition: 'Główni konkurenci to [lista]. Spółka konkuruje poprzez [strategia].',
            outlook: 'Plany rozwoju obejmują [ekspansja/e-commerce/inne].',
        },
    },

    fintech: {
        name: 'Fintech / Usługi finansowe',
        pkdCodes: ['64', '65', '66'],
        specificRisks: [
            'Ryzyko regulacyjne i licencyjne (KNF)',
            'Ryzyko cyberbezpieczeństwa i fraudów',
            'Ryzyko kredytowe i płynnościowe',
            'Ryzyko technologiczne i systemowe',
            'Ryzyko reputacyjne',
        ],
        regulatoryRisks: [
            'Ryzyko zmian regulacji finansowych (MiFID, PSD)',
            'Ryzyko wymogów kapitałowych',
            'Ryzyko AML/KYC compliance',
        ],
        marketRisks: [
            'Ryzyko konkurencji ze strony banków i BigTech',
            'Ryzyko zmian stóp procentowych',
        ],
        operationalRisks: [
            'Ryzyko awarii systemów płatniczych',
            'Ryzyko uzależnienia od partnerów infrastrukturalnych',
        ],
        sectionHints: {
            business: 'Spółka działa w sektorze fintech, oferując [usługi]. Posiada licencję [typ licencji].',
            competition: 'Konkurencja obejmuje [tradycyjne banki/fintechy/BigTech].',
            outlook: 'Sektor fintech rośnie w tempie [X]%. Spółka planuje [rozwój produktowy/ekspansję].',
        },
    },

    gaming: {
        name: 'Gry wideo / GameDev',
        pkdCodes: ['58.21', '62.01'],
        specificRisks: [
            'Ryzyko niepowodzenia komercyjnego gier (hit-driven business)',
            'Ryzyko uzależnienia od platform dystrybucyjnych (Steam, Epic, konsole)',
            'Ryzyko opóźnień w produkcji gier',
            'Ryzyko utraty kluczowych twórców i programistów',
            'Ryzyko negatywnych recenzji i opinii społeczności',
        ],
        regulatoryRisks: [
            'Ryzyko regulacji loot boxów i mikrotransakcji',
            'Ryzyko ograniczeń wiekowych i content rating',
        ],
        marketRisks: [
            'Ryzyko silnej konkurencji globalnej',
            'Ryzyko zmian preferencji graczy',
            'Ryzyko konsolidacji branży',
        ],
        operationalRisks: [
            'Ryzyko wysokich kosztów marketingu',
            'Ryzyko piractwa i ochrony IP',
        ],
        sectionHints: {
            business: 'Spółka jest deweloperem gier wideo specjalizującym się w [gatunek]. Portfolio obejmuje [tytuły].',
            competition: 'Konkurencja w segmencie [gatunek] jest intensywna. Spółka wyróżnia się [styl/jakość/IP].',
            outlook: 'W produkcji znajdują się [liczba] projektów. Premiera [tytuł] planowana na [data].',
        },
    },
};

/**
 * Znajduje szablon branżowy na podstawie kodu PKD
 */
export function findIndustryTemplate(pkdCode: string): IndustryTemplate | null {
    const code = pkdCode.replace(/[.\s]/g, '');
    const shortCode = code.substring(0, 2);

    for (const [, template] of Object.entries(INDUSTRY_TEMPLATES)) {
        for (const templatePkd of template.pkdCodes) {
            const cleanTemplatePkd = templatePkd.replace(/[.\s]/g, '');
            if (code.startsWith(cleanTemplatePkd) || cleanTemplatePkd.startsWith(shortCode)) {
                return template;
            }
        }
    }

    return null;
}

/**
 * Generuje listę ryzyk na podstawie szablonu branżowego
 */
export function generateIndustryRisks(template: IndustryTemplate): string {
    const allRisks = [
        ...template.specificRisks,
        ...template.regulatoryRisks,
        ...template.marketRisks,
        ...template.operationalRisks,
    ];

    return allRisks.map((risk, i) => `${i + 1}. ${risk}`).join('\n');
}

/**
 * Standardowe ryzyka dla wszystkich spółek
 */
export const UNIVERSAL_RISKS = [
    'Ryzyko związane z ogólną sytuacją makroekonomiczną',
    'Ryzyko zmian kursów walut obcych',
    'Ryzyko zmian stóp procentowych',
    'Ryzyko inflacyjne',
    'Ryzyko zmian przepisów podatkowych',
    'Ryzyko związane z pandemią i siłą wyższą',
    'Ryzyko związane z sytuacją geopolityczną',
    'Ryzyko płynności akcji na rynku wtórnym',
    'Ryzyko niedojścia emisji do skutku',
    'Ryzyko rozwodnienia kapitału dla obecnych akcjonariuszy',
];

/**
 * Generuje pełną listę ryzyk
 */
export function generateFullRiskList(pkdCode?: string): string[] {
    const risks = [...UNIVERSAL_RISKS];

    if (pkdCode) {
        const template = findIndustryTemplate(pkdCode);
        if (template) {
            risks.unshift(...template.specificRisks.slice(0, 5));
            risks.push(...template.regulatoryRisks);
        }
    }

    return risks;
}
