import { KRSCompanyData, ReprezentantInfo, PKDInfo } from '@/types';

const KRS_API_BASE = 'https://api-krs.ms.gov.pl/api/krs';

/**
 * Pobiera dane spółki z publicznego API KRS
 * @param krsNumber - Numer KRS spółki (10 cyfr)
 */
export async function fetchKRSData(krsNumber: string): Promise<KRSCompanyData> {
    const cleanKrs = krsNumber.replace(/\D/g, '').padStart(10, '0');

    const url = `${KRS_API_BASE}/OdpisAktualny/${cleanKrs}?rejestr=P&format=json`;

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Nie znaleziono podmiotu o numerze KRS: ${cleanKrs}`);
        }
        throw new Error(`Błąd API KRS: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    return parseKRSResponse(rawData);
}

/**
 * Konwertuje NIP na numer KRS (poprzez wyszukiwanie)
 * UWAGA: Publiczne API nie obsługuje bezpośrednio wyszukiwania po NIP
 * W wersji produkcyjnej należy użyć komercyjnego API lub Firestore cache
 */
export async function nipToKrs(nip: string): Promise<string | null> {
    // Dla demo: zwracamy przykładowy KRS dla znanych NIP-ów
    const knownMappings: Record<string, string> = {
        '5213534885': '0000527166', // Allegro
        '5272518318': '0000441246', // Asseco Poland
        '5260300291': '0000010681', // PKN Orlen
        '5272526848': '0000033012', // CD Projekt
    };

    const cleanNip = nip.replace(/\D/g, '');
    return knownMappings[cleanNip] || null;
}

/**
 * Parsuje surową odpowiedź z API KRS do uporządkowanej struktury
 */
function parseKRSResponse(data: Record<string, unknown>): KRSCompanyData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const odpis = (data as any).odpis;
    const dane = odpis?.dane;
    const dzial1 = dane?.dzial1;
    const dzial2 = dane?.dzial2;
    const dzial3 = dane?.dzial3;

    // Dane podstawowe
    const danePodstawowe = dzial1?.danePodstawowe;
    const siedzibaIAdres = dzial1?.siedzibaIAdres;
    const adres = siedzibaIAdres?.adres;

    // Kapitał
    const kapitalInfo = dzial1?.kapital;

    // Reprezentacja (Zarząd)
    const organReprezentacji = dzial2?.reprezentacja?.sklad || [];

    // PKD
    const przedmiotDzialalnosci = dzial3?.przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci || [];

    const reprezentanci: ReprezentantInfo[] = organReprezentacji.map((osoba: Record<string, unknown>) => ({
        imie: (osoba.imiona as string) || 'N/A',
        nazwisko: (osoba.nazwisko as string) || 'N/A',
        funkcja: (osoba.funkcjaWOrganie as string) || 'Członek Zarządu',
        dataPowolania: osoba.dataOd as string,
    }));

    const pkdList: PKDInfo[] = przedmiotDzialalnosci.map((pkd: Record<string, unknown>, index: number) => ({
        kod: (pkd.kodDzial as string) || '',
        opis: (pkd.opis as string) || '',
        przewazajaca: index === 0,
    }));

    return {
        krs: danePodstawowe?.numerKRS || '',
        nip: danePodstawowe?.nip || '',
        regon: danePodstawowe?.regon || '',
        nazwa: danePodstawowe?.nazwa || 'Nieznana nazwa',
        nazwaSkrocona: danePodstawowe?.nazwaSkrocona,
        formaOrganizacyjna: danePodstawowe?.formaPrawna || 'SPÓŁKA Z O.O.',
        adres: {
            ulica: adres?.ulica || '',
            numer: adres?.nrDomu || '',
            lokal: adres?.nrLokalu,
            kodPocztowy: adres?.kodPocztowy || '',
            miejscowosc: adres?.miejscowosc || '',
            kraj: 'POLSKA',
        },
        kapitalZakladowy: parseFloat(kapitalInfo?.wysokoscKapitaluZakladowego?.replace(/[^\d.,]/g, '').replace(',', '.') || '0'),
        waluta: 'PLN',
        dataPowstania: danePodstawowe?.dataRozpoczecia || new Date().toISOString().split('T')[0],
        reprezentacja: {
            sposob: dzial2?.reprezentacja?.sposobReprezentacji || 'Jednoosobowo',
            osoby: reprezentanci,
        },
        przedmiotDzialalnosci: pkdList,
        status: 'AKTYWNY',
    };
}

/**
 * Formatuje adres do postaci jednoliniowej
 */
export function formatAddress(address: KRSCompanyData['adres']): string {
    const parts = [
        `ul. ${address.ulica} ${address.numer}`,
        address.lokal ? `lok. ${address.lokal}` : '',
        `${address.kodPocztowy} ${address.miejscowosc}`,
    ].filter(Boolean);

    return parts.join(', ');
}

/**
 * Formatuje kwotę w PLN
 */
export function formatCurrency(amount: number, currency: string = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}
