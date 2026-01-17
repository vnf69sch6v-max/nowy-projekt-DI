import { NextRequest, NextResponse } from 'next/server';
import { fetchKRSData, nipToKrs, formatAddress, formatCurrency } from '@/lib/krs/api';
import { generateMockFinancials, formatFinancialAmount } from '@/lib/financials/mock';
import { analyzeRisks, generateSummary } from '@/lib/ai/analyzer';
import { generateMemorandum } from '@/lib/documents/generator';
import { MemorandumContext } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nip, krs } = body;

        if (!nip && !krs) {
            return NextResponse.json(
                { error: 'Wymagany jest numer NIP lub KRS' },
                { status: 400 }
            );
        }

        // Określ numer KRS
        let krsNumber = krs;
        if (!krsNumber && nip) {
            krsNumber = await nipToKrs(nip);
            if (!krsNumber) {
                // Dla demo: generuj przykładowe dane jeśli nie znaleziono mapowania
                krsNumber = '0000' + nip.slice(0, 6);
            }
        }

        console.log(`Generating memorandum for KRS: ${krsNumber}`);

        // Pobierz dane z KRS
        let companyData;
        try {
            companyData = await fetchKRSData(krsNumber);
        } catch (krsError) {
            console.warn('KRS API error, using mock data:', krsError);
            // Fallback: generuj przykładowe dane
            companyData = generateMockCompanyData(nip || krsNumber);
        }

        // Generuj dane finansowe (mock)
        const financials = generateMockFinancials(companyData.nazwa);

        // Analiza AI
        console.log('Running AI analysis...');
        const [risks, summary] = await Promise.all([
            analyzeRisks(companyData, financials),
            generateSummary(companyData, financials),
        ]);

        // Przygotuj kontekst dokumentu
        const context: MemorandumContext = {
            nazwa_spolki: companyData.nazwa,
            nazwa_skrocona: companyData.nazwaSkrocona || companyData.nazwa.split(' ')[0],
            nip: companyData.nip,
            krs: companyData.krs,
            regon: companyData.regon,
            forma_prawna: companyData.formaOrganizacyjna,

            adres_pelny: formatAddress(companyData.adres),
            ulica: companyData.adres.ulica,
            kod_pocztowy: companyData.adres.kodPocztowy,
            miejscowosc: companyData.adres.miejscowosc,

            kapital_zakladowy: formatCurrency(companyData.kapitalZakladowy),
            waluta: companyData.waluta,

            data_powstania: companyData.dataPowstania,
            data_generacji: new Date().toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),

            reprezentacja: companyData.reprezentacja.osoby,
            sposob_reprezentacji: companyData.reprezentacja.sposob,

            przedmiot_dzialalnosci: companyData.przedmiotDzialalnosci,
            pkd_przewazajace: companyData.przedmiotDzialalnosci[0]?.opis || 'Działalność gospodarcza',

            finanse: financials,
            przychody_ostatni_rok: formatFinancialAmount(financials[0].przychodyNetto),
            zysk_ostatni_rok: formatFinancialAmount(financials[0].zyskNetto),
            suma_bilansowa: formatFinancialAmount(financials[0].sumaBilansowa),

            ryzyka: risks,
            podsumowanie_ai: summary,
        };

        // Generuj dokument
        console.log('Generating Word document...');
        const documentBuffer = await generateMemorandum(context);

        // Zwróć plik
        const filename = `Memorandum_${companyData.nazwa.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${Date.now()}.docx`;

        // Convert Buffer to Uint8Array for NextResponse
        const responseBody = new Uint8Array(documentBuffer);

        return new NextResponse(responseBody, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas generowania dokumentu' },
            { status: 500 }
        );
    }
}

// Generuje przykładowe dane spółki gdy API KRS nie odpowiada
function generateMockCompanyData(identifier: string) {
    const seed = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return {
        krs: '0000' + identifier.slice(0, 6).padStart(6, '0'),
        nip: identifier.replace(/\D/g, '').padEnd(10, '0').slice(0, 10),
        regon: (seed % 1000000000).toString().padStart(9, '0'),
        nazwa: `Przykładowa Spółka ${seed % 1000} Sp. z o.o.`,
        nazwaSkrocona: `Przykładowa ${seed % 1000}`,
        formaOrganizacyjna: 'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
        adres: {
            ulica: 'Przykładowa',
            numer: (seed % 100).toString(),
            kodPocztowy: '00-001',
            miejscowosc: 'Warszawa',
            kraj: 'POLSKA',
        },
        kapitalZakladowy: 5000 + (seed % 995000),
        waluta: 'PLN',
        dataPowstania: `${2010 + (seed % 14)}-01-15`,
        reprezentacja: {
            sposob: 'Każdy członek zarządu samodzielnie',
            osoby: [
                { imie: 'Jan', nazwisko: 'Kowalski', funkcja: 'PREZES ZARZĄDU' },
                { imie: 'Anna', nazwisko: 'Nowak', funkcja: 'CZŁONEK ZARZĄDU' },
            ],
        },
        przedmiotDzialalnosci: [
            { kod: '62.01.Z', opis: 'Działalność związana z oprogramowaniem', przewazajaca: true },
            { kod: '62.02.Z', opis: 'Działalność związana z doradztwem w zakresie informatyki', przewazajaca: false },
        ],
        status: 'AKTYWNY' as const,
    };
}
