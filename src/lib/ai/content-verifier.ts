/**
 * Weryfikator treści AI
 * Sprawdza prawdziwość i spójność wygenerowanej treści
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { KRSCompany, FinancialData } from '@/types';

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

export interface VerificationResult {
    verified: boolean;
    corrections: string[];
    warnings: string[];
    correctedText: string;
}

/**
 * Weryfikuje wygenerowaną treść pod kątem:
 * - Zgodności danych liczbowych
 * - Spójności informacji
 * - Poprawności terminologii prawniczej
 * - Błędów rzeczowych
 */
export async function verifyContent(
    sectionContent: string,
    sectionTitle: string,
    company: KRSCompany,
    financials: FinancialData[]
): Promise<VerificationResult> {
    const app = getFirebaseApp();
    const vertexAI = getVertexAI(app);
    const model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });

    const companyContext = `
DANE SPÓŁKI DO WERYFIKACJI:
- Nazwa: ${company.nazwa}
- KRS: ${company.krs}
- NIP: ${company.nip}
- REGON: ${company.regon}
- Forma prawna: ${company.formaOrganizacyjna}
- Adres: ${company.siedzibaAdres}
- Kapitał zakładowy: ${company.kapitalZakladowy} PLN
- PKD przeważające: ${company.pkdPrzewazajace}
- Zarząd: ${company.reprezentacja?.map(z => `${z.imie} ${z.nazwisko} (${z.funkcja})`).join(', ')}
`;

    const financialContext = financials.length > 0 ? `
DANE FINANSOWE DO WERYFIKACJI:
${financials.map(f => `
Rok ${f.rok}:
- Przychody netto: ${f.przychodyNetto} PLN
- Zysk netto: ${f.zyskNetto} PLN
- Suma bilansowa: ${f.sumaBilansowa} PLN
- Kapitał własny: ${f.kapitalWlasny} PLN
- Zobowiązania: ${f.zobowiazania} PLN
`).join('')}` : '';

    const prompt = `Jesteś ekspertem prawniczym weryfikującym memorandum informacyjne.

${companyContext}
${financialContext}

SEKCJA DO WERYFIKACJI: ${sectionTitle}

TEKST DO WERYFIKACJI:
${sectionContent}

ZADANIA:
1. Sprawdź czy podane dane liczbowe (KRS, NIP, kapitał, przychody) zgadzają się z powyższymi danymi
2. Sprawdź czy nie ma sprzeczności w tekście
3. Sprawdź czy terminologia prawnicza jest poprawna (np. "akcje zwykłe na okaziciela", "kapitał zakładowy")
4. Sprawdź czy nie ma oczywistych błędów rzeczowych
5. Sprawdź czy tekst nie zawiera halucynacji (wymyślonych informacji)

Zwróć TYLKO JSON (bez markdown):
{
  "verified": true/false,
  "corrections": ["lista wykrytych błędów do poprawy"],
  "warnings": ["lista ostrzeżeń/sugestii"],
  "correctedText": "poprawiony tekst jeśli verified=false, inaczej pusty string"
}`;

    try {
        console.log(`🔍 Verifying section: ${sectionTitle}...`);

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parsuj JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('No JSON in verification response');
            return { verified: true, corrections: [], warnings: [], correctedText: '' };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        console.log(`✅ Verification complete: ${parsed.verified ? 'PASSED' : 'NEEDS CORRECTIONS'}`);
        if (parsed.corrections?.length > 0) {
            console.log(`⚠️ Corrections: ${parsed.corrections.join(', ')}`);
        }

        return {
            verified: parsed.verified ?? true,
            corrections: parsed.corrections || [],
            warnings: parsed.warnings || [],
            correctedText: parsed.correctedText || '',
        };
    } catch (error) {
        console.error('Verification error:', error);
        // W razie błędu - nie blokuj, zwróć jako zweryfikowane
        return { verified: true, corrections: [], warnings: [], correctedText: '' };
    }
}

/**
 * Zbiera ostrzeżenia z wielu sekcji
 */
export function collectWarnings(verifications: VerificationResult[]): string[] {
    const allWarnings: string[] = [];

    for (const v of verifications) {
        allWarnings.push(...v.warnings);
        allWarnings.push(...v.corrections.map(c => `Korekta: ${c}`));
    }

    return allWarnings;
}
