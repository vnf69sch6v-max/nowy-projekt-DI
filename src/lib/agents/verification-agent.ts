// =========================================
// AGENT 6: VERIFICATION AGENT
// =========================================
// Verifies and corrects generated content for legal accuracy and completeness

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import { AgentResult, VerificationResult, GeneratedSection, Company, FinancialStatement } from '@/lib/db/types';

// =========================================
// VERIFICATION RULES
// =========================================

interface VerificationRule {
    id: string;
    name: string;
    type: 'regex' | 'presence' | 'comparison' | 'legal';
    severity: 'error' | 'warning' | 'info';
    pattern?: RegExp;
    requiredTerms?: string[];
    description: string;
}

const VERIFICATION_RULES: VerificationRule[] = [
    // Placeholder detection
    {
        id: 'no-placeholders',
        name: 'No Placeholders',
        type: 'regex',
        severity: 'error',
        pattern: /\[DO UZUPEŁNIENIA\]|\[BRAK DANYCH\]|\[\?\]|\[X+\]|\[\.\.\.?\]/gi,
        description: 'Content should not contain any placeholders'
    },
    // Legal references
    {
        id: 'legal-ksh-refs',
        name: 'KSH References',
        type: 'presence',
        severity: 'warning',
        requiredTerms: ['art.', 'KSH', 'Kodeks spółek handlowych'],
        description: 'Company law sections should reference KSH articles'
    },
    // Offer law reference
    {
        id: 'offer-law-ref',
        name: 'Offer Public Law Reference',
        type: 'presence',
        severity: 'warning',
        requiredTerms: ['ustawy o ofercie', 'Dz.U.', '2025', 'poz. 592'],
        description: 'Legal basis should reference current offer law'
    },
    // Memorandum regulation
    {
        id: 'memo-regulation',
        name: 'Memorandum Regulation',
        type: 'presence',
        severity: 'warning',
        requiredTerms: ['Dz.U.', '2020', 'poz. 1053'],
        description: 'Should reference memorandum regulation'
    },
    // PLN amounts format
    {
        id: 'pln-format',
        name: 'PLN Amount Format',
        type: 'regex',
        severity: 'info',
        pattern: /\d{1,3}(?:\s?\d{3})*(?:,\d{2})?\s*PLN/g,
        description: 'Monetary amounts should be properly formatted with PLN'
    },
    // Date format
    {
        id: 'date-format',
        name: 'Date Format',
        type: 'regex',
        severity: 'info',
        pattern: /\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+\d{4}/gi,
        description: 'Dates should be in Polish format'
    },
];

// =========================================
// VERIFICATION PROMPT
// =========================================

const VERIFICATION_PROMPT = `
ROLA: Jesteś senior prawnikiem weryfikującym dokumenty memorandum informacyjnego.

ZADANIE: Sprawdź wygenerowany tekst pod kątem:

1. ZGODNOŚĆ PRAWNA:
   - Czy cytowane artykuły ustaw są poprawne?
   - Czy numery Dzienników Ustaw są aktualne (Dz.U. 2025)?
   - Czy terminologia prawna jest prawidłowa?

2. SPÓJNOŚĆ DANYCH:
   - Czy dane zgadzają się z dostarczonymi informacjami?
   - Czy kwoty są spójne?
   - Czy nazwy i numery KRS są poprawne?

3. KOMPLETNOŚĆ:
   - Czy sekcja zawiera wszystkie wymagane elementy?
   - Czy są jakieś [DO UZUPEŁNIENIA] lub podobne placeholdery?

4. POPRAWNOŚĆ JĘZYKOWA:
   - Czy tekst jest napisany formalnym językiem prawniczym?
   - Czy nie ma błędów gramatycznych?

DANE REFERENCYJNE:
{REFERENCE_DATA}

TEKST DO WERYFIKACJI:
Sekcja: {SECTION_NUMBER} - {SECTION_TITLE}
---
{CONTENT}
---

ODPOWIEDŹ (JSON):
{
    "passed": true/false,
    "issues": [
        {
            "type": "error|warning|info",
            "description": "Opis problemu",
            "location": "fragment tekstu z błędem",
            "suggestion": "sugerowana poprawka"
        }
    ],
    "correctedContent": "poprawiony tekst (tylko jeśli passed=false i są poprawki)"
}
`;

// =========================================
// VERIFICATION FUNCTIONS
// =========================================

// Apply regex-based rules
function applyRegexRules(content: string): { ruleId: string; matches: string[] }[] {
    const results: { ruleId: string; matches: string[] }[] = [];

    for (const rule of VERIFICATION_RULES) {
        if (rule.type === 'regex' && rule.pattern) {
            const matches = content.match(rule.pattern);
            if (rule.id === 'no-placeholders' && matches) {
                results.push({ ruleId: rule.id, matches });
            }
        }
    }

    return results;
}

// Check for required terms
function checkPresenceRules(content: string, sectionNumber: string): { ruleId: string; missing: string[] }[] {
    const results: { ruleId: string; missing: string[] }[] = [];

    // Only check relevant rules based on section
    const relevantRules = VERIFICATION_RULES.filter(rule => {
        if (rule.type !== 'presence') return false;

        // §7 needs offer law reference
        if (rule.id === 'offer-law-ref' && sectionNumber === '§7') return true;
        // §22 needs KSH references
        if (rule.id === 'legal-ksh-refs' && sectionNumber === '§22') return true;
        // All sections benefit from memo regulation check
        if (rule.id === 'memo-regulation' && sectionNumber === '§7') return true;

        return false;
    });

    for (const rule of relevantRules) {
        if (rule.requiredTerms) {
            const missing = rule.requiredTerms.filter(term =>
                !content.toLowerCase().includes(term.toLowerCase())
            );
            if (missing.length > 0) {
                results.push({ ruleId: rule.id, missing });
            }
        }
    }

    return results;
}

// Count issues by severity
function countIssuesBySeverity(issues: { type: string }[]): { errors: number; warnings: number; info: number } {
    return {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length
    };
}

// Main verification function
export async function verifySection(
    section: GeneratedSection,
    company?: Partial<Company>,
    financials?: Partial<FinancialStatement>[]
): Promise<AgentResult<VerificationResult>> {
    const startTime = Date.now();
    const issues: { type: string; description: string; location?: string; suggestion?: string }[] = [];

    // Step 1: Apply local rules first (fast)
    const placeholderMatches = applyRegexRules(section.content);
    for (const match of placeholderMatches) {
        if (match.ruleId === 'no-placeholders') {
            for (const placeholder of match.matches) {
                issues.push({
                    type: 'error',
                    description: 'Znaleziono placeholder wymagający uzupełnienia',
                    location: placeholder,
                    suggestion: 'Uzupełnij brakujące dane'
                });
            }
        }
    }

    // Step 2: Check presence rules
    const missingTerms = checkPresenceRules(section.content, section.sectionNumber);
    for (const check of missingTerms) {
        const rule = VERIFICATION_RULES.find(r => r.id === check.ruleId);
        issues.push({
            type: rule?.severity || 'warning',
            description: `Brakuje wymaganych terminów: ${check.missing.join(', ')}`,
            suggestion: `Dodaj odwołania do: ${check.missing.join(', ')}`
        });
    }

    // If there are already critical errors, skip AI verification
    const counts = countIssuesBySeverity(issues);
    if (counts.errors > 2) {
        return {
            success: true,
            data: {
                passed: false,
                issues: issues.map(i => i.description)
            },
            latencyMs: Date.now() - startTime
        };
    }

    // Step 3: AI verification for deeper analysis
    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
            }
        });

        // Build reference data
        let referenceData = '';
        if (company) {
            referenceData += `KRS: ${company.krs}, Nazwa: ${company.nazwa}, Kapitał: ${company.kapitalZakladowy} PLN\n`;
        }
        if (financials?.[0]) {
            referenceData += `Rok: ${financials[0].rok}, Przychody: ${financials[0].przychodyNetto} PLN, Zysk: ${financials[0].zyskNetto} PLN\n`;
        }

        const prompt = VERIFICATION_PROMPT
            .replace('{REFERENCE_DATA}', referenceData || 'Brak danych referencyjnych')
            .replace('{SECTION_NUMBER}', section.sectionNumber)
            .replace('{SECTION_TITLE}', section.sectionTitle)
            .replace('{CONTENT}', section.content);

        const result = await model.generateContent([{ text: prompt }]);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            // Merge AI issues with local issues
            if (parsed.issues) {
                for (const issue of parsed.issues) {
                    issues.push({
                        type: issue.type || 'warning',
                        description: issue.description,
                        location: issue.location,
                        suggestion: issue.suggestion
                    });
                }
            }

            const latencyMs = Date.now() - startTime;

            return {
                success: true,
                data: {
                    passed: parsed.passed && counts.errors === 0,
                    issues: issues.map(i => i.description),
                    correctedContent: parsed.correctedContent
                },
                tokensUsed: result.response.usageMetadata?.totalTokenCount,
                latencyMs
            };
        }

        // Fallback if JSON parsing fails
        return {
            success: true,
            data: {
                passed: counts.errors === 0,
                issues: issues.map(i => i.description)
            },
            latencyMs: Date.now() - startTime
        };

    } catch (error) {
        // If AI fails, return local verification results
        return {
            success: true,
            data: {
                passed: counts.errors === 0,
                issues: issues.map(i => i.description)
            },
            latencyMs: Date.now() - startTime
        };
    }
}

// Verify all sections
export async function verifyAllSections(
    sections: GeneratedSection[],
    company?: Partial<Company>,
    financials?: Partial<FinancialStatement>[],
    onProgress?: (section: string, progress: number) => void
): Promise<AgentResult<{ section: string; result: VerificationResult }[]>> {
    const startTime = Date.now();
    const results: { section: string; result: VerificationResult }[] = [];

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const progress = ((i + 1) / sections.length) * 100;

        if (onProgress) {
            onProgress(section.sectionNumber, progress);
        }

        const result = await verifySection(section, company, financials);

        if (result.success && result.data) {
            results.push({
                section: section.sectionNumber,
                result: result.data
            });
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    const latencyMs = Date.now() - startTime;

    // Calculate summary
    const passedCount = results.filter(r => r.result.passed).length;
    const totalIssues = results.reduce((sum, r) => sum + r.result.issues.length, 0);

    console.log(`Verification complete: ${passedCount}/${results.length} sections passed, ${totalIssues} total issues`);

    return {
        success: true,
        data: results,
        latencyMs
    };
}

// Quick check for critical issues only (no AI)
export function quickVerify(content: string): { hasErrors: boolean; errorCount: number; errors: string[] } {
    const placeholders = content.match(/\[DO UZUPEŁNIENIA\]|\[BRAK DANYCH\]|\[\?\]/gi) || [];

    return {
        hasErrors: placeholders.length > 0,
        errorCount: placeholders.length,
        errors: placeholders
    };
}
