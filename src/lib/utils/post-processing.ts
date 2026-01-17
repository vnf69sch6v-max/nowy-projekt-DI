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
 * Usuwa powtarzające się sekcje (np. sposób reprezentacji, podpisy)
 */
export function removeDuplicateSections(content: string): string {
    let result = content;

    // Wzorce powtarzających się sekcji
    const duplicatePatterns = [
        // Sposób reprezentacji - często powtarzany
        /(DO SKLADANIA OSWIADCZEN W IMIENIU SPOLKI[\s\S]*?PROKURENTEM\s*\.?)(\s*DO SKLADANIA OSWIADCZEN W IMIENIU SPOLKI[\s\S]*?PROKURENTEM\s*\.?)+/gi,
        // Powtórzony spis treści
        /(Spis\s+tres[c]?i[\s\S]*?VII\.\s*ZALACZNIKI)(\s*Spis\s+tres[c]?i[\s\S]*?VII\.\s*ZALACZNIKI)+/gi,
        // Powtórzony blok podpisów
        /(PODPISY\s+OS[OÓ]B\s+ODPOWIEDZIALNYCH[\s\S]*?podpis\))(\s*PODPISY\s+OS[OÓ]B\s+ODPOWIEDZIALNYCH[\s\S]*?podpis\))+/gi,
    ];

    for (const pattern of duplicatePatterns) {
        result = result.replace(pattern, '$1');
    }

    // Usuń całą sekcję podpisów z treści AI (PDF generator doda własne)
    result = result.replace(/\n*PODPISY\s+OS[OÓ]B\s+ODPOWIEDZIALNYCH[\s\S]*?_{5,}[\s\S]*?(\(podpis\)\s*)+/gi, '');

    // Usuń powtórzony nagłówek "MEMORANDUM INFORMACYJNE" po spisie treści
    result = result.replace(/(\n\s*VII\.\s*ZALACZNIKI[\s\S]*?)\n+MEMORANDUM\s+INFORMACYJNE\s*\n/gi, '$1\n');

    return result;
}

/**
 * Usuwa podwójne nagłówki sekcji (np. "I. WSTEP" powtórzone)
 */
export function removeDuplicateHeaders(content: string): string {
    const lines = content.split('\n');
    const seenHeaders = new Set<string>();
    const result: string[] = [];

    // Wzorce nagłówków sekcji
    const headerPattern = /^[IVX]+\.\s+[A-Z]/; // I. WSTEP, II. CZYNNIKI, etc.
    const subHeaderPattern = /^§?\d+\.\s+/; // §11., 12., etc.

    for (const line of lines) {
        const trimmed = line.trim().toUpperCase();

        // Sprawdź czy to nagłówek sekcji głównej
        if (headerPattern.test(trimmed)) {
            // Wyciągnij tylko numer sekcji (I., II., etc.)
            const sectionMatch = trimmed.match(/^([IVX]+\.)/);
            if (sectionMatch) {
                const sectionKey = sectionMatch[1];
                if (seenHeaders.has(sectionKey)) {
                    // Pomiń duplikat
                    continue;
                }
                seenHeaders.add(sectionKey);
            }
        }

        result.push(line);
    }

    return result.join('\n');
}

/**
 * Naprawia formatowanie roku (np. "2 024" → "2024", "2 025" → "2025")
 */
export function fixYearFormatting(content: string): string {
    let result = content;

    // Naprawa roku z błędną spacją: "2 024" → "2024", "2 025" → "2025"
    result = result.replace(/\b2\s+0\s*(\d{2})\b/g, '20$1');
    result = result.replace(/\b2\s0(\d{2})\b/g, '20$1');

    // Specyficzne przypadki
    result = result.replace(/2 024/g, '2024');
    result = result.replace(/2 025/g, '2025');
    result = result.replace(/2 026/g, '2026');

    return result;
}

/**
 * Standaryzuje numerację w dokumencie - naprawia skoki i luki
 */
export function standardizeNumbering(content: string): string {
    let result = content;
    const lines = result.split('\n');
    const processedLines: string[] = [];

    // Śledź aktualną numerację dla różnych poziomów
    let currentParagraph = 0; // §11, §12, etc.
    let currentPoint = 0;     // 1., 2., 3. - resetuje się w każdym §
    let lastSectionNum = 0;   // I., II., III.

    for (const line of lines) {
        let processedLine = line;
        const trimmed = line.trim();

        // Sekcja główna (I., II., III., etc.) - reset punktów
        const sectionMatch = trimmed.match(/^([IVX]+)\.\s+(.+)/);
        if (sectionMatch) {
            currentPoint = 0; // Reset numeracji punktów
            processedLines.push(processedLine);
            continue;
        }

        // Paragraf (§xx. lub xx. gdzie xx >= 10)
        const paragraphMatch = trimmed.match(/^(§?)(\d{2,})\.\s+(.+)/);
        if (paragraphMatch) {
            const hasSymbol = paragraphMatch[1] === '§';
            const num = parseInt(paragraphMatch[2]);
            const text = paragraphMatch[3];

            // Jeśli to pierwszy paragraf lub numer jest rozsądny (różnica <= 5)
            if (currentParagraph === 0) {
                currentParagraph = num; // Zachowaj oryginalny numer startowy
            } else if (num > currentParagraph + 5) {
                // Skok jest zbyt duży - normalizuj
                currentParagraph++;
            } else {
                currentParagraph = num;
            }

            currentPoint = 0; // Reset punktów w nowym paragrafie

            // Dodaj symbol § jeśli brakuje
            const indent = line.match(/^(\s*)/)?.[1] || '';
            processedLine = `${indent}§${currentParagraph}. ${text}`;
            processedLines.push(processedLine);
            continue;
        }

        // Punkt numerowany (1., 2., 3., etc.) - normalizacja sekwencji
        const pointMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (pointMatch) {
            const num = parseInt(pointMatch[1]);
            const text = pointMatch[2];

            // Jeśli numer jest zbyt duży (skok > 3), normalizuj
            if (num > currentPoint + 3) {
                currentPoint++;
            } else {
                currentPoint = num;
            }

            const indent = line.match(/^(\s*)/)?.[1] || '';
            // Zachowaj oryginalny numer jeśli nie ma skoku
            if (num <= currentPoint + 1) {
                processedLines.push(processedLine);
            } else {
                processedLine = `${indent}${currentPoint}. ${text}`;
                processedLines.push(processedLine);
            }
            continue;
        }

        processedLines.push(processedLine);
    }

    result = processedLines.join('\n');

    // Dodatkowy cleanup
    result = result.replace(/  +/g, ' ');
    result = result.replace(/\s+:/g, ':');

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

    // 1. Napraw formatowanie roku (2 024 → 2024)
    result = fixYearFormatting(result);

    // 2. Usuń podwójne nagłówki sekcji
    result = removeDuplicateHeaders(result);

    // 3. Usuń powtarzające się sekcje
    result = removeDuplicateSections(result);

    // 4. Standaryzuj numerację
    result = standardizeNumbering(result);

    // 5. Normalizacja formatów
    result = normalizeFormats(result);

    // 6. Usuń duplikaty zdań
    result = removeDuplicates(result);

    // 7. Smart placeholders (jeśli podano kontekst)
    if (context) {
        result = smartPlaceholders(result, context);
    }

    // 8. Cleanup - nadmiarowe puste linie
    result = result.replace(/\n{4,}/g, '\n\n\n');

    return result.trim();
}
