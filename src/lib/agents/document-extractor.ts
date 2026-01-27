// =========================================
// AGENT 1: DOCUMENT EXTRACTOR
// =========================================
// Extracts raw text and structure from PDF documents

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import { AgentResult, ExtractedDocument } from '@/lib/db/types';

const EXTRACTION_PROMPT = `
ROLA: Jesteś ekspertem OCR i ekstrakcji dokumentów prawnych.

ZADANIE: Wyekstrahuj WSZYSTKIE dane z dokumentu PDF. Zachowaj pełną strukturę.

INSTRUKCJE:
1. Rozpoznaj typ dokumentu (KRS, Sprawozdanie finansowe, Uchwała WZA, Inny)
2. Wyekstrahuj cały tekst zachowując formatowanie
3. Zidentyfikuj główne sekcje dokumentu
4. Oceń jakość ekstrakcji (0.0 - 1.0)

FORMAT ODPOWIEDZI (JSON):
{
    "documentType": "KRS" | "FINANCIAL" | "WZA_RESOLUTION" | "OTHER",
    "extractionConfidence": 0.95,
    "sections": [
        {
            "title": "Dział 1 - Dane podmiotu",
            "content": "pełny tekst sekcji..."
        }
    ],
    "rawText": "cały tekst dokumentu..."
}

DOKUMENT DO ANALIZY:
`;

export async function extractDocument(
    pdfBase64: string,
    mimeType: string = 'application/pdf'
): Promise<AgentResult<ExtractedDocument>> {
    const startTime = Date.now();

    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        });

        const result = await model.generateContent([
            { text: EXTRACTION_PROMPT },
            {
                inlineData: {
                    mimeType,
                    data: pdfBase64
                }
            }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse extraction response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const latencyMs = Date.now() - startTime;

        return {
            success: true,
            data: {
                rawText: parsed.rawText || '',
                documentType: parsed.documentType || 'OTHER',
                pageCount: parsed.pageCount || 1,
                extractionConfidence: parsed.extractionConfidence || 0.8,
                sections: parsed.sections || []
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown extraction error',
            latencyMs
        };
    }
}

// Detect document type from filename and content
export function detectDocumentType(filename: string, content?: string): 'KRS' | 'FINANCIAL' | 'WZA_RESOLUTION' | 'OTHER' {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.includes('krs') || lowerFilename.includes('odpis')) {
        return 'KRS';
    }

    if (lowerFilename.includes('finans') || lowerFilename.includes('sprawozdanie') ||
        lowerFilename.includes('bilans') || lowerFilename.includes('raport')) {
        return 'FINANCIAL';
    }

    if (lowerFilename.includes('uchwał') || lowerFilename.includes('wza') ||
        lowerFilename.includes('zgromadzeni')) {
        return 'WZA_RESOLUTION';
    }

    // Check content hints
    if (content) {
        if (content.includes('ODPIS AKTUALNY') || content.includes('CENTRALNA INFORMACJA')) {
            return 'KRS';
        }
        if (content.includes('BILANS') || content.includes('RACHUNEK ZYSKÓW')) {
            return 'FINANCIAL';
        }
        if (content.includes('UCHWAŁA') && content.includes('WALNE ZGROMADZENIE')) {
            return 'WZA_RESOLUTION';
        }
    }

    return 'OTHER';
}
