/**
 * Post-processing treści memorandum
 * Usuwanie duplikatów, normalizacja formatów, walidacja
 */

/**
 * Usuwa powtórzenia zdań i akapitów
 */
export function removeDuplicates(content: string): string {
    const lines = content.split('\n');
    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
        const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ');

        // Pomiń puste linie
        if (!normalized) {
            result.push(line);
            continue;
        }

        // Pomiń bardzo krótkie linie (nagłówki, numery)
        if (normalized.length < 30) {
            result.push(line);
            continue;
        }

        // Sprawdź czy już widzieliśmy podobne zdanie
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(line);
        }
    }

    return result.join('\n');
}

/**
 * Normalizuje formaty kwot i dat
 */
export function normalizeFormats(content: string): string {
    let result = content;

    // Normalizacja kwot: 1000000 -> 1 000 000
    result = result.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');

    // Normalizacja "zł" -> "PLN"
    result = result.replace(/\s+zł\b/gi, ' PLN');
    result = result.replace(/\s+złotych\b/gi, ' PLN');

    // Normalizacja dat: 2025-01-17 -> 17.01.2025
    result = result.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3.$2.$1');

    // Normalizacja procent: 5 % -> 5%
    result = result.replace(/(\d)\s+%/g, '$1%');

    return result;
}

/**
 * Usuwa powtarzające się sekcje (np. sposób reprezentacji)
 */
export function removeDuplicateSections(content: string): string {
    let result = content;

    // Wzorce powtarzających się sekcji
    const duplicatePatterns = [
        // Sposób reprezentacji - często powtarzany
        /(DO SKLADANIA OSWIADCZEN W IMIENIU SPOLKI[\s\S]*?PROKURENTEM\s*\.?)(\s*DO SKLADANIA OSWIADCZEN W IMIENIU SPOLKI[\s\S]*?PROKURENTEM\s*\.?)+/gi,
        // Powtórzony spis treści
        /(Spis\s+tres[c]?i[\s\S]*?VII\.\s*ZALACZNIKI)(\s*Spis\s+tres[c]?i[\s\S]*?VII\.\s*ZALACZNIKI)+/gi,
    ];

    for (const pattern of duplicatePatterns) {
        result = result.replace(pattern, '$1');
    }

    return result;
}

/**
 * Zastępuje puste [DO UZUPEŁNIENIA] inteligentnymi sugestiami
 */
export function smartPlaceholders(content: string, context: {
    companyName?: string;
    pkd?: string;
    hasExport?: boolean;
    hasLoans?: boolean;
}): string {
    let result = content;

    // Kontekstowe sugestie
    const replacements: [RegExp, string][] = [
        // Ryzyko walutowe
        [/\[DO UZUPELNIENIA\s*-?\s*ryzyko walutowe[^\]]*\]/gi,
            context.hasExport
                ? 'Spolka prowadzi dzialalnosc eksportowa, co naraża ją na ryzyko walutowe związane ze zmianami kursów walut obcych.'
                : 'Spolka prowadzi dzialalnosc wylacznie na rynku krajowym, w zwiazku z czym ryzyko walutowe nie ma istotnego wplywu na jej wyniki finansowe.'],

        // Ryzyko stopy procentowej
        [/\[DO UZUPELNIENIA\s*-?\s*ryzyko stopy procentowej[^\]]*\]/gi,
            context.hasLoans
                ? 'Spolka posiada zobowiazania oprocentowane zmienną stopą procentową, w zwiazku z czym wzrost stop procentowych moze negatywnie wplynac na koszty finansowe.'
                : 'Spolka nie posiada istotnych zobowiazan oprocentowanych zmienną stopą, dlatego ryzyko stopy procentowej jest ograniczone.'],
    ];

    for (const [pattern, replacement] of replacements) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

/**
 * Główna funkcja post-processingu
 */
export function postProcessContent(content: string, context?: {
    companyName?: string;
    pkd?: string;
    hasExport?: boolean;
    hasLoans?: boolean;
}): string {
    let result = content;

    // 1. Usuń powtarzające się sekcje
    result = removeDuplicateSections(result);

    // 2. Normalizacja formatów
    result = normalizeFormats(result);

    // 3. Usuń duplikaty zdań
    result = removeDuplicates(result);

    // 4. Smart placeholders (jeśli podano kontekst)
    if (context) {
        result = smartPlaceholders(result, context);
    }

    // 5. Cleanup - nadmiarowe puste linie
    result = result.replace(/\n{4,}/g, '\n\n\n');

    return result.trim();
}
