import { NextRequest, NextResponse } from 'next/server';
import { fetchKRSData, nipToKrs, formatAddress, formatCurrency } from '@/lib/krs/api';
import { generateMockFinancials, formatFinancialAmount } from '@/lib/financials/mock';
import { generateMemorandumSections, sectionsToMemorandumContext } from '@/lib/ai/pipeline';
import { generateMemorandum } from '@/lib/documents/generator';
import { KRSCompany } from '@/types';

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

        console.log(`🚀 Generating AI-powered memorandum for KRS: ${krsNumber}`);

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

        // Konwertuj do formatu KRSCompany dla pipeline'u AI
        const companyForAI: KRSCompany = {
            krs: companyData.krs,
            nip: companyData.nip,
            regon: companyData.regon,
            nazwa: companyData.nazwa,
            formaOrganizacyjna: companyData.formaOrganizacyjna,
            siedzibaAdres: formatAddress(companyData.adres),
            kapitalZakladowy: companyData.kapitalZakladowy,
            dataPowstania: companyData.dataPowstania,
            reprezentacja: companyData.reprezentacja.osoby,
            sposobReprezentacji: companyData.reprezentacja.sposob,
            wspolnicy: companyData.wspolnicy,
            pkd: companyData.przedmiotDzialalnosci,
            pkdPrzewazajace: companyData.przedmiotDzialalnosci[0]?.opis || 'Działalność gospodarcza',
        };

        // 🤖 Uruchom pełny pipeline AI z generacją sekcyjną
        console.log('🤖 Running AI pipeline with sectional generation...');
        const sections = await generateMemorandumSections(companyForAI, financials);

        // Konwertuj sekcje na kontekst dokumentu
        const context = sectionsToMemorandumContext(companyForAI, financials, sections);

        // Dodaj brakujące pola z oryginalnych danych
        context.ulica = companyData.adres.ulica;
        context.kod_pocztowy = companyData.adres.kodPocztowy;
        context.miejscowosc = companyData.adres.miejscowosc;
        context.przedmiot_dzialalnosci = companyData.przedmiotDzialalnosci;
        context.przychody_ostatni_rok = formatFinancialAmount(financials[0].przychodyNetto);
        context.zysk_ostatni_rok = formatFinancialAmount(financials[0].zyskNetto);
        context.suma_bilansowa = formatFinancialAmount(financials[0].sumaBilansowa);

        // Generuj dokument Word
        console.log('📄 Generating Word document with AI-generated sections...');
        const documentBuffer = await generateMemorandum(context);

        // Zwróć plik
        const filename = `Memorandum_${companyData.nazwa.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${Date.now()}.docx`;

        // Convert Buffer to Uint8Array for NextResponse
        const responseBody = new Uint8Array(documentBuffer);

        console.log('✅ Document generated successfully!');

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
        wspolnicy: [
            { nazwa: 'Jan Kowalski', udzialy: 60, wartoscUdzialow: 3000 },
            { nazwa: 'Anna Nowak', udzialy: 40, wartoscUdzialow: 2000 },
        ],
        przedmiotDzialalnosci: [
            { kod: '62.01.Z', opis: 'Działalność związana z oprogramowaniem', przewazajaca: true },
            { kod: '62.02.Z', opis: 'Działalność związana z doradztwem w zakresie informatyki', przewazajaca: false },
        ],
        status: 'AKTYWNY' as const,
    };
}
