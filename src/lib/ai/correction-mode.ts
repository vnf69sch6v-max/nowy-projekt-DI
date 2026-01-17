/**
 * Tryb korekty - AI poprawia istniejące memorandum
 */

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getApps, initializeApp, getApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function getFirebaseApp() {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

export interface CorrectionSuggestion {
    section: string;
    originalText: string;
    suggestedText: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

export interface CorrectionResult {
    suggestions: CorrectionSuggestion[];
    overallScore: number;
    summary: string;
}

const CORRECTION_PROMPT = `Przeanalizuj poniższe memorandum informacyjne i zaproponuj poprawki.

ZASADY:
1. Szukaj niekompletnych sekcji (zawierających [DO UZUPEŁNIENIA])
2. Znajdź błędy merytoryczne lub niejasności
3. Sprawdź zgodność z rozporządzeniem Dz.U. 2020.1053
4. Oceń jakość językową i formalną

Zwróć TYLKO JSON (bez markdown):
{
  "suggestions": [
    {
      "section": "nazwa sekcji",
      "originalText": "fragment do poprawy",
      "suggestedText": "proponowana poprawka",
      "reason": "uzasadnienie zmiany",
      "priority": "high/medium/low"
    }
  ],
  "overallScore": 0-100,
  "summary": "ogólna ocena dokumentu"
}

MEMORANDUM DO ANALIZY:
`;

/**
 * Analizuje memorandum i proponuje poprawki
 */
export async function correctMemorandum(content: string): Promise<CorrectionResult> {
    const app = getFirebaseApp();
    const vertexAI = getVertexAI(app);
    const model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });

    const result = await model.generateContent(CORRECTION_PROMPT + content);
    const text = result.response.text();

    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Nieprawidłowa odpowiedź AI');
    }

    const parsed = JSON.parse(jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));

    return {
        suggestions: parsed.suggestions || [],
        overallScore: parsed.overallScore || 0,
        summary: parsed.summary || '',
    };
}

/**
 * Automatycznie aplikuje poprawki do treści
 */
export function applySuggestions(
    content: string,
    suggestions: CorrectionSuggestion[]
): string {
    let result = content;

    for (const suggestion of suggestions) {
        if (suggestion.originalText && suggestion.suggestedText) {
            result = result.replace(suggestion.originalText, suggestion.suggestedText);
        }
    }

    return result;
}

/**
 * Generuje raport poprawek
 */
export function generateCorrectionReport(result: CorrectionResult): string {
    const lines: string[] = [
        '═══════════════════════════════════════════════════════════════',
        'RAPORT KOREKTY MEMORANDUM',
        '═══════════════════════════════════════════════════════════════',
        '',
        `Ocena dokumentu: ${result.overallScore}/100`,
        `Liczba sugestii: ${result.suggestions.length}`,
        '',
        result.summary,
        '',
    ];

    const highPriority = result.suggestions.filter(s => s.priority === 'high');
    const mediumPriority = result.suggestions.filter(s => s.priority === 'medium');
    const lowPriority = result.suggestions.filter(s => s.priority === 'low');

    if (highPriority.length > 0) {
        lines.push('PILNE POPRAWKI:');
        for (const s of highPriority) {
            lines.push(`  - ${s.section}: ${s.reason}`);
        }
        lines.push('');
    }

    if (mediumPriority.length > 0) {
        lines.push('ZALECANE POPRAWKI:');
        for (const s of mediumPriority) {
            lines.push(`  - ${s.section}: ${s.reason}`);
        }
        lines.push('');
    }

    if (lowPriority.length > 0) {
        lines.push('DROBNE USPRAWNIENIA:');
        for (const s of lowPriority) {
            lines.push(`  - ${s.section}: ${s.reason}`);
        }
    }

    return lines.join('\n');
}
