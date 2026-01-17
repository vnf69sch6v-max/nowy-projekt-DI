/**
 * Analizator dokumentów - Claude Sonnet dla ekstrakcji, minimalne zużycie tokenów
 * Claude obsługuje PDF przez base64 w vision
 */

import Anthropic from '@anthropic-ai/sdk';
import { KRSCompany, FinancialData } from '@/types';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Używamy Haiku dla minimalnych kosztów, Sonnet jako fallback
const MODEL = 'claude-3-5-haiku-20241022'; // Najtańszy, szybki

/**
 * Prompt do ekstrakcji KRS - BARDZO KRÓTKI dla oszczędności tokenów
 */
const KRS_PROMPT = `Z tego odpisu KRS wyodrębnij JSON:
{"nazwa":"","krs":"","nip":"","regon":"","forma":"","adres":"","kapital":0,"data_powstania":"","zarzad":[{"imie":"","nazwisko":"","funkcja":""}],"reprezentacja":"","wspolnicy":[{"nazwa":"","udzialy":0}],"pkd":[{"kod":"","opis":"","glowny":true}]}
Tylko JSON.`;

/**
 * Prompt do ekstrakcji finansów - KRÓTKI
 */
const FIN_PROMPT = `Wyodrębnij dane finansowe jako JSON:
{"lata":[{"rok":2024,"przychody":0,"zysk":0,"bilans":0,"kapital":0,"zobowiazania":0}]}
Tylko JSON.`;

/**
 * Analizuje odpis KRS przez Claude Vision
 */
export async function analyzeKRSDocument(pdfBuffer: Buffer): Promise<KRSCompany> {
    console.log('📄 Analyzing KRS with Claude...');

    const base64 = pdfBuffer.toString('base64');

    try {
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024, // Ograniczenie dla oszczędności
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: base64,
                            },
                        },
                        {
                            type: 'text',
                            text: KRS_PROMPT,
                        },
                    ],
                },
            ],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        console.log('Claude KRS response:', text.substring(0, 200));

        // Wyciągnij JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Nie udało się wyekstrahować danych z KRS');
        }

        const d = JSON.parse(jsonMatch[0]);

        return {
            krs: d.krs || '',
            nip: d.nip || '',
            regon: d.regon || '',
            nazwa: d.nazwa || 'Nieznana spółka',
            formaOrganizacyjna: d.forma || '',
            siedzibaAdres: d.adres || '',
            kapitalZakladowy: d.kapital || 0,
            dataPowstania: d.data_powstania || '',
            reprezentacja: (d.zarzad || []).map((z: { imie: string; nazwisko: string; funkcja: string }) => ({
                imie: z.imie,
                nazwisko: z.nazwisko,
                funkcja: z.funkcja,
            })),
            sposobReprezentacji: d.reprezentacja || '',
            wspolnicy: (d.wspolnicy || []).map((w: { nazwa: string; udzialy?: number }) => ({
                nazwa: w.nazwa,
                udzialy: w.udzialy,
            })),
            pkd: (d.pkd || []).map((p: { kod: string; opis: string; glowny?: boolean }) => ({
                kod: p.kod,
                opis: p.opis,
                przewazajaca: p.glowny || false,
            })),
            pkdPrzewazajace: d.pkd?.find((p: { glowny?: boolean }) => p.glowny)?.opis || d.pkd?.[0]?.opis || '',
        };
    } catch (error) {
        console.error('Claude KRS error:', error);
        throw new Error(`Błąd analizy KRS: ${error instanceof Error ? error.message : 'nieznany błąd'}`);
    }
}

/**
 * Analizuje sprawozdanie finansowe
 */
export async function analyzeFinancialDocument(
    buffer: Buffer,
    mimeType: string
): Promise<FinancialData[]> {
    console.log('📊 Analyzing financial document...');

    // Dla Excel - parsuj lokalnie bez API
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return parseExcelFinancials(buffer);
    }

    // Dla PDF - użyj Claude
    const base64 = buffer.toString('base64');

    try {
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: base64,
                            },
                        },
                        {
                            type: 'text',
                            text: FIN_PROMPT,
                        },
                    ],
                },
            ],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        console.log('Claude financial response:', text.substring(0, 200));

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('Could not extract financial data');
            return [];
        }

        const data = JSON.parse(jsonMatch[0]);

        return (data.lata || []).map((y: {
            rok: number;
            przychody: number;
            zysk: number;
            bilans: number;
            kapital: number;
            zobowiazania: number;
        }) => ({
            rok: y.rok,
            przychodyNetto: y.przychody || 0,
            zyskBrutto: y.zysk || 0,
            zyskNetto: y.zysk || 0,
            sumaBilansowa: y.bilans || 0,
            kapitalWlasny: y.kapital || 0,
            zobowiazania: y.zobowiazania || 0,
            aktywaObrotowe: 0,
            aktywaTrwale: 0,
        }));
    } catch (error) {
        console.error('Claude financial error:', error);
        return []; // Fallback do mock
    }
}

/**
 * Parsuje Excel lokalnie
 */
async function parseExcelFinancials(buffer: Buffer): Promise<FinancialData[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const financials: FinancialData[] = [];

    for (const row of data) {
        const r = row as Record<string, unknown>;
        const rok = r['Rok'] || r['rok'] || r['Year'];
        if (rok && typeof rok === 'number') {
            financials.push({
                rok: rok,
                przychodyNetto: Number(r['Przychody'] || r['przychody_netto'] || 0),
                zyskBrutto: Number(r['Zysk brutto'] || 0),
                zyskNetto: Number(r['Zysk netto'] || r['zysk_netto'] || 0),
                sumaBilansowa: Number(r['Suma bilansowa'] || 0),
                kapitalWlasny: Number(r['Kapitał własny'] || 0),
                zobowiazania: Number(r['Zobowiązania'] || 0),
                aktywaObrotowe: 0,
                aktywaTrwale: 0,
            });
        }
    }

    return financials;
}
