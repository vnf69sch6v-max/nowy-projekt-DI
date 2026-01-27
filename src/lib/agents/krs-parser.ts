// =========================================
// AGENT 2: KRS PARSER
// =========================================
// Parses KRS documents into structured company data

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import { AgentResult, ParsedKRS, Company, BoardMember, Shareholder } from '@/lib/db/types';

const KRS_PARSING_PROMPT = `
ROLA: Jesteś ekspertem od KRS i prawa spółek handlowych w Polsce.

ZADANIE: Sparsuj odpis z KRS i zwróć KOMPLETNE dane w formacie JSON.

WYMAGANE POLA (wszystkie które znajdziesz):

1. DANE REJESTROWE:
   - krs (10 cyfr)
   - nip (10 cyfr, bez myślników)
   - regon (9 lub 14 cyfr)
   - nazwa (pełna nazwa firmy)
   - formaPrawna (np. "SPÓŁKA AKCYJNA")

2. ADRES SIEDZIBY:
   - ulica
   - numerBudynku
   - numerLokalu (jeśli jest)
   - kodPocztowy (XX-XXX)
   - miejscowosc

3. KAPITAŁ:
   - kapitalZakladowy (liczba w PLN)
   - kapitalWplacony (liczba w PLN)
   - liczbaAkcjiWszystkich
   - wartoscNominalnaAkcji (jeśli podana)

4. DATY:
   - dataRejestracji (YYYY-MM-DD)
   - dataOstatniegoWpisu (YYYY-MM-DD)

5. PKD:
   - pkdPrzewazajace (np. "62.01.Z")
   - pkdPozostale (tablica pozostałych kodów PKD)

6. REPREZENTACJA:
   - sposobReprezentacji (DOKŁADNY CYTAT z KRS!)

7. ZARZĄD (tablica):
   - imie
   - nazwisko
   - funkcja (PREZES ZARZĄDU, WICEPREZES, CZŁONEK ZARZĄDU)

8. AKCJONARIUSZE >5% (jeśli są):
   - nazwa
   - typ (OSOBA_FIZYCZNA lub OSOBA_PRAWNA)
   - liczbaAkcji
   - procentKapitalu
   - procentGlosow

FORMAT ODPOWIEDZI (JSON):
{
    "company": {
        "krs": "0000123456",
        "nip": "1234567890",
        "regon": "123456789",
        "nazwa": "PRZYKŁAD SPÓŁKA AKCYJNA",
        "formaPrawna": "SPÓŁKA AKCYJNA",
        "ulica": "ul. Przykładowa",
        "numerBudynku": "1",
        "numerLokalu": "2",
        "kodPocztowy": "00-001",
        "miejscowosc": "Warszawa",
        "kapitalZakladowy": 100000.00,
        "kapitalWplacony": 100000.00,
        "liczbaAkcjiWszystkich": 1000000,
        "wartoscNominalnaAkcji": 0.10,
        "dataRejestracji": "2020-01-15",
        "dataOstatniegoWpisu": "2024-06-01",
        "pkdPrzewazajace": "62.01.Z",
        "pkdPozostale": ["58.21.Z", "63.11.Z"],
        "sposobReprezentacji": "DO SKŁADANIA OŚWIADCZEŃ W IMIENIU SPÓŁKI UPRAWNIENI SĄ: DWÓCH CZŁONKÓW ZARZĄDU DZIAŁAJĄCYCH ŁĄCZNIE LUB CZŁONEK ZARZĄDU DZIAŁAJĄCY ŁĄCZNIE Z PROKURENTEM."
    },
    "boardMembers": [
        {
            "imie": "Jan",
            "nazwisko": "Kowalski",
            "funkcja": "PREZES ZARZĄDU"
        }
    ],
    "shareholders": [
        {
            "nazwa": "Jan Kowalski",
            "typ": "OSOBA_FIZYCZNA",
            "liczbaAkcji": 500000,
            "procentKapitalu": 50.00,
            "procentGlosow": 50.00
        }
    ]
}

WAŻNE:
- Wszystkie liczby bez separatorów tysięcy
- Daty w formacie YYYY-MM-DD
- PESEL i dane wrażliwe pomijaj
- Sposób reprezentacji przepisz DOKŁADNIE jak w dokumencie

ODPIS KRS DO SPARSOWANIA:
`;

export async function parseKRS(
    extractedText: string
): Promise<AgentResult<ParsedKRS>> {
    const startTime = Date.now();

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

        const result = await model.generateContent([
            { text: KRS_PARSING_PROMPT + extractedText }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse KRS response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!parsed.company || !parsed.company.krs || !parsed.company.nazwa) {
            throw new Error('Missing required company fields (krs, nazwa)');
        }

        const latencyMs = Date.now() - startTime;

        // Transform to our types
        const company: Partial<Company> = {
            krs: parsed.company.krs,
            nip: parsed.company.nip,
            regon: parsed.company.regon,
            nazwa: parsed.company.nazwa,
            formaPrawna: parsed.company.formaPrawna,
            ulica: parsed.company.ulica,
            numerBudynku: parsed.company.numerBudynku,
            numerLokalu: parsed.company.numerLokalu,
            kodPocztowy: parsed.company.kodPocztowy,
            miejscowosc: parsed.company.miejscowosc,
            kapitalZakladowy: parsed.company.kapitalZakladowy,
            kapitalWplacony: parsed.company.kapitalWplacony,
            liczbaAkcjiWszystkich: parsed.company.liczbaAkcjiWszystkich,
            wartoscNominalnaAkcji: parsed.company.wartoscNominalnaAkcji,
            dataRejestracji: parsed.company.dataRejestracji ? new Date(parsed.company.dataRejestracji) : undefined,
            dataOstatniegoWpisu: parsed.company.dataOstatniegoWpisu ? new Date(parsed.company.dataOstatniegoWpisu) : undefined,
            pkdPrzewazajace: parsed.company.pkdPrzewazajace,
            pkdPozostale: parsed.company.pkdPozostale,
            sposobReprezentacji: parsed.company.sposobReprezentacji,
        };

        const boardMembers: Partial<BoardMember>[] = (parsed.boardMembers || []).map((m: Record<string, unknown>) => ({
            imie: m.imie as string,
            nazwisko: m.nazwisko as string,
            funkcja: m.funkcja as string,
            dataPowolania: m.dataPowolania ? new Date(m.dataPowolania as string) : undefined,
        }));

        const shareholders: Partial<Shareholder>[] = (parsed.shareholders || []).map((s: Record<string, unknown>) => ({
            nazwa: s.nazwa as string,
            typ: s.typ as 'OSOBA_FIZYCZNA' | 'OSOBA_PRAWNA',
            liczbaAkcji: s.liczbaAkcji as number,
            procentKapitalu: s.procentKapitalu as number,
            procentGlosow: s.procentGlosow as number,
        }));

        return {
            success: true,
            data: {
                company,
                boardMembers,
                shareholders
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown KRS parsing error',
            latencyMs
        };
    }
}

// Validate KRS number format
export function validateKRS(krs: string): boolean {
    return /^\d{10}$/.test(krs);
}

// Format address from company data
export function formatAddress(company: Partial<Company>): string {
    const parts = [];

    if (company.ulica) {
        let addr = company.ulica;
        if (company.numerBudynku) addr += ` ${company.numerBudynku}`;
        if (company.numerLokalu) addr += `/${company.numerLokalu}`;
        parts.push(addr);
    }

    if (company.kodPocztowy && company.miejscowosc) {
        parts.push(`${company.kodPocztowy} ${company.miejscowosc}`);
    } else if (company.miejscowosc) {
        parts.push(company.miejscowosc);
    }

    return parts.join(', ');
}

// Format board member name with function
export function formatBoardMember(member: Partial<BoardMember>): string {
    return `${member.imie} ${member.nazwisko} - ${member.funkcja}`;
}
