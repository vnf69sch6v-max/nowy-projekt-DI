/**
 * Funkcje walidacji i rozpoznawania dokumentów
 */

/**
 * Waliduje numer NIP (suma kontrolna)
 */
export function validateNIP(nip: string): boolean {
    const cleaned = nip.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(cleaned)) return false;

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i]) * weights[i];
    }

    const checksum = sum % 11;
    return checksum === parseInt(cleaned[9]);
}

/**
 * Waliduje numer REGON (9 lub 14 cyfr)
 */
export function validateREGON(regon: string): boolean {
    const cleaned = regon.replace(/[\s-]/g, '');

    if (cleaned.length === 9) {
        const weights = [8, 9, 2, 3, 4, 5, 6, 7];
        let sum = 0;
        for (let i = 0; i < 8; i++) {
            sum += parseInt(cleaned[i]) * weights[i];
        }
        const checksum = sum % 11 === 10 ? 0 : sum % 11;
        return checksum === parseInt(cleaned[8]);
    }

    if (cleaned.length === 14) {
        // First validate 9-digit part
        if (!validateREGON(cleaned.substring(0, 9))) return false;

        const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
        let sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cleaned[i]) * weights[i];
        }
        const checksum = sum % 11 === 10 ? 0 : sum % 11;
        return checksum === parseInt(cleaned[13]);
    }

    return false;
}

/**
 * Waliduje numer KRS
 */
export function validateKRS(krs: string): boolean {
    const cleaned = krs.replace(/[\s-]/g, '');
    return /^\d{10}$/.test(cleaned);
}

/**
 * Typy dokumentów
 */
export type DocumentType = 'krs' | 'financial' | 'offer' | 'unknown';

/**
 * Auto-detekcja typu dokumentu na podstawie treści
 */
export function detectDocumentType(text: string): DocumentType {
    const textLower = text.toLowerCase();

    // Wzorce dla KRS
    const krsPatterns = [
        'krajowy rejestr sądowy',
        'odpis aktualny',
        'odpis pełny',
        'numer krs',
        'organ rejestrowy',
        'sąd rejonowy',
        'wydział gospodarczy',
        'rubryka',
        'dział 1',
        'dane podmiotu',
    ];

    // Wzorce dla sprawozdania finansowego
    const financialPatterns = [
        'sprawozdanie finansowe',
        'bilans',
        'rachunek zysków i strat',
        'aktywa trwałe',
        'aktywa obrotowe',
        'pasywa',
        'kapitał własny',
        'zobowiązania',
        'przychody netto ze sprzedaży',
        'wynik finansowy',
        'ustawa o rachunkowości',
    ];

    // Wzorce dla uchwały/oferty
    const offerPatterns = [
        'uchwała',
        'walne zgromadzenie',
        'nadzwyczajne walne',
        'podwyższenie kapitału',
        'emisja akcji',
        'cena emisyjna',
        'seria akcji',
        'subskrypcja',
        'objęcie akcji',
        'prawo poboru',
    ];

    // Zlicz dopasowania
    let krsScore = 0;
    let finScore = 0;
    let offerScore = 0;

    for (const pattern of krsPatterns) {
        if (textLower.includes(pattern)) krsScore++;
    }

    for (const pattern of financialPatterns) {
        if (textLower.includes(pattern)) finScore++;
    }

    for (const pattern of offerPatterns) {
        if (textLower.includes(pattern)) offerScore++;
    }

    // Determine winner
    const maxScore = Math.max(krsScore, finScore, offerScore);

    if (maxScore === 0) return 'unknown';
    if (krsScore === maxScore && krsScore >= 3) return 'krs';
    if (finScore === maxScore && finScore >= 3) return 'financial';
    if (offerScore === maxScore && offerScore >= 2) return 'offer';

    return 'unknown';
}

/**
 * Wyciąga NIP, REGON, KRS z tekstu
 */
export function extractIdentifiers(text: string): {
    nip?: string;
    regon?: string;
    krs?: string;
    valid: { nip: boolean; regon: boolean; krs: boolean };
} {
    const result: {
        nip?: string;
        regon?: string;
        krs?: string;
        valid: { nip: boolean; regon: boolean; krs: boolean };
    } = {
        valid: { nip: false, regon: false, krs: false }
    };

    // NIP pattern
    const nipMatch = text.match(/NIP[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}|\d{10})/i);
    if (nipMatch) {
        result.nip = nipMatch[1].replace(/[\s-]/g, '');
        result.valid.nip = validateNIP(result.nip);
    }

    // REGON pattern
    const regonMatch = text.match(/REGON[:\s]*(\d{9}|\d{14})/i);
    if (regonMatch) {
        result.regon = regonMatch[1];
        result.valid.regon = validateREGON(result.regon);
    }

    // KRS pattern
    const krsMatch = text.match(/KRS[:\s]*(\d{10})/i);
    if (krsMatch) {
        result.krs = krsMatch[1];
        result.valid.krs = validateKRS(result.krs);
    }

    return result;
}

/**
 * Formatuje NIP czytelnie
 */
export function formatNIP(nip: string): string {
    const cleaned = nip.replace(/[\s-]/g, '');
    if (cleaned.length !== 10) return nip;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`;
}

/**
 * Formatuje REGON czytelnie
 */
export function formatREGON(regon: string): string {
    const cleaned = regon.replace(/[\s-]/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    }
    return regon;
}

/**
 * Formatuje KRS czytelnie
 */
export function formatKRS(krs: string): string {
    const cleaned = krs.replace(/[\s-]/g, '');
    return cleaned.padStart(10, '0');
}
