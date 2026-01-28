// =========================================
// AGENT 5: LEGAL CONTENT GENERATOR
// =========================================
// Generates legal content for each memorandum section (§1-§47)

import { getVertexAI, getGenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '@/lib/firebase';
import {
    AgentResult,
    GeneratedSection,
    Company,
    BoardMember,
    Shareholder,
    FinancialStatement,
    FinancialRatios,
    IdentifiedRisk,
    OfferParameters
} from '@/lib/db/types';

// =========================================
// SECTION TEMPLATES - Zgodne z Dz.U. 2020.1053
// =========================================

interface SectionTemplate {
    number: string;
    title: string;
    chapter: string;
    prompt: string;
    requiredData: ('company' | 'board' | 'shareholders' | 'financials' | 'ratios' | 'risks' | 'offer')[];
}

const SECTION_TEMPLATES: SectionTemplate[] = [
    // ======= ROZDZIAŁ I: WSTĘP (§1-§10) =======
    {
        number: '§1',
        title: 'Emitent',
        chapter: 'I. WSTĘP',
        requiredData: ['company', 'board'],
        prompt: `Wygeneruj §1 EMITENT zawierający WSZYSTKIE dane:
- Pełna nazwa firmy: {NAZWA}
- Numer KRS: {KRS}
- NIP: {NIP}
- REGON: {REGON}
- Forma prawna: {FORMA_PRAWNA}
- Siedziba i adres: {ADRES}
- Kapitał zakładowy: {KAPITAL} PLN (wpłacony w całości/niepełni)
- Zarząd: {ZARZAD}
- Sposób reprezentacji: {REPREZENTACJA}
- Telefon, email, strona www: [DO UZUPEŁNIENIA przez Emitenta]`
    },
    {
        number: '§2',
        title: 'Sprzedający',
        chapter: 'I. WSTĘP',
        requiredData: ['company'],
        prompt: `Wygeneruj §2 SPRZEDAJĄCY:
"Sprzedającym jest Emitent, tj. {NAZWA} z siedzibą w {MIEJSCOWOSC}."`
    },
    {
        number: '§3',
        title: 'Papiery wartościowe',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §3 PAPIERY WARTOŚCIOWE:
- Rodzaj: akcje zwykłe na okaziciela
- Seria: {SERIA}
- Liczba akcji: {LICZBA_AKCJI}
- Wartość nominalna jednej akcji: {WARTOSC_NOMINALNA} PLN
- Łączna wartość nominalna emisji: {LACZNIE} PLN`
    },
    {
        number: '§4',
        title: 'Podmiot udzielający zabezpieczenia',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §4 PODMIOT UDZIELAJĄCY ZABEZPIECZENIA:
"Emisja akcji serii {SERIA} nie jest objęta gwarancją ani zabezpieczeniem 
osób trzecich. Spółka nie zawarła umów gwarancyjnych dotyczących emisji."`
    },
    {
        number: '§5',
        title: 'Cena emisyjna',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §5 CENA EMISYJNA:
Jeśli cena ustalona: "Cena emisyjna jednej akcji serii {SERIA} wynosi {CENA} PLN."
Jeśli przedział: "Cena emisyjna zostanie ustalona przez Zarząd przed rozpoczęciem 
subskrypcji, w przedziale od [MIN] do [MAX] PLN."`
    },
    {
        number: '§6',
        title: 'Miejsce i warunki oferty',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §6 MIEJSCE I WARUNKI OFERTY:
"Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach 
i zgodnie z zasadami określonymi w niniejszym Memorandum Informacyjnym.
Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym 
informacje o ofercie publicznej akcji serii {SERIA}."`
    },
    {
        number: '§7',
        title: 'Podstawa prawna oferty publicznej',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §7 PODSTAWA PRAWNA OFERTY PUBLICZNEJ (DOKŁADNIE!):
"Oferta publiczna akcji serii {SERIA} prowadzona jest na podstawie 
art. 37a ust. 1 ustawy z dnia 29 lipca 2005 r. o ofercie publicznej 
i warunkach wprowadzania instrumentów finansowych do zorganizowanego 
systemu obrotu oraz o spółkach publicznych (Dz.U. z 2025 r. poz. 592, t.j.).

Zgodnie z art. 37a ust. 1 ww. ustawy, oferta publiczna może być prowadzona 
na podstawie memorandum informacyjnego, jeżeli spełniony jest co najmniej 
jeden z następujących warunków:
1) oferta jest kierowana wyłącznie do inwestorów, z których każdy nabywa 
   papiery wartościowe o wartości co najmniej 100 000 EUR,
2) oferta dotyczy papierów wartościowych o jednostkowej wartości nominalnej 
   wynoszącej co najmniej 100 000 EUR,
3) łączna wartość papierów wartościowych będących przedmiotem ofert 
   publicznych prowadzonych w okresie poprzednich 12 miesięcy nie przekracza 
   2 500 000 EUR (lub równowartości w PLN).

Niniejsze Memorandum zostało sporządzone zgodnie z wymogami rozporządzenia 
Ministra Finansów z dnia 12 maja 2020 r. (Dz.U. z 2020 r. poz. 1053)."`
    },
    {
        number: '§8',
        title: 'Firma inwestycyjna',
        chapter: 'I. WSTĘP',
        requiredData: ['offer'],
        prompt: `Wygeneruj §8 FIRMA INWESTYCYJNA:
Jeśli brak: "Oferta publiczna akcji serii {SERIA} prowadzona jest bez 
pośrednictwa firmy inwestycyjnej, zgodnie z art. 37a ust. 3 ustawy o ofercie."
Jeśli podana: użyj nazwy firmy {FIRMA_INWESTYCYJNA}.`
    },
    {
        number: '§9',
        title: 'Data ważności memorandum',
        chapter: 'I. WSTĘP',
        requiredData: [],
        prompt: `Wygeneruj §9 DATA WAŻNOŚCI MEMORANDUM:
"Niniejsze Memorandum Informacyjne jest ważne przez okres 12 miesięcy 
od dnia jego sporządzenia, tj. od dnia [DATA] do dnia [DATA + 12 MIESIĘCY].

Po upływie okresu ważności Memorandum nie może stanowić podstawy 
prowadzenia oferty publicznej."`
    },
    {
        number: '§10',
        title: 'Tryb informowania o zmianach',
        chapter: 'I. WSTĘP',
        requiredData: ['company'],
        prompt: `Wygeneruj §10 TRYB INFORMOWANIA O ZMIANACH (BARDZO SZCZEGÓŁOWO!):
"Informacje o zmianach danych zawartych w niniejszym Memorandum 
będą podawane do publicznej wiadomości zgodnie z art. 37b ustawy 
o ofercie publicznej poprzez publikację na stronie internetowej Emitenta.

Aktualizacje będą dotyczyć w szczególności:
a) istotnych zmian w sytuacji finansowej lub prawnej Emitenta,
b) zmian w składzie organów Emitenta,
c) istotnych umów zawartych przez Emitenta,
d) postępowań sądowych, arbitrażowych lub administracyjnych,
e) zmian w strukturze akcjonariatu przekraczających 5% głosów na WZA,
f) wydarzeń mogących mieć istotny wpływ na sytuację majątkową Emitenta.

Aktualizacje będą publikowane niezwłocznie, nie później niż w terminie 
7 dni roboczych od dnia wystąpienia zdarzenia."`
    },

    // ======= ROZDZIAŁ II: CZYNNIKI RYZYKA (§11-§15) =======
    {
        number: '§11',
        title: 'Ryzyka związane z działalnością Emitenta',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['company', 'risks'],
        prompt: `Wygeneruj §11 RYZYKA ZWIĄZANE Z DZIAŁALNOŚCIĄ EMITENTA.
Użyj ryzyk z kategorii OPERACYJNE. Minimum 4 ryzyka.
Każde ryzyko opisz szczegółowo: nazwa, opis, wpływ, mitygacja.`
    },
    {
        number: '§12',
        title: 'Ryzyka o charakterze finansowym',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['financials', 'ratios', 'risks'],
        prompt: `Wygeneruj §12 RYZYKA O CHARAKTERZE FINANSOWYM.
Użyj ryzyk z kategorii FINANSOWE. Minimum 4 ryzyka.
Użyj KONKRETNYCH danych finansowych:
- Przychody: {PRZYCHODY} PLN
- Zysk netto: {ZYSK} PLN
- Wskaźnik zadłużenia: {ZADLUZENIE}%
- Rentowność: {RENTOWNOSC}%`
    },
    {
        number: '§13',
        title: 'Ryzyka rynkowe',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['company', 'risks'],
        prompt: `Wygeneruj §13 RYZYKA RYNKOWE.
Użyj ryzyk z kategorii RYNKOWE. Minimum 2 ryzyka.
Uwzględnij branżę: {PKD} - {BRANZA}.`
    },
    {
        number: '§14',
        title: 'Ryzyka prawne i regulacyjne',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['risks'],
        prompt: `Wygeneruj §14 RYZYKA PRAWNE I REGULACYJNE.
Użyj ryzyk z kategorii PRAWNE_REGULACYJNE. Minimum 2 ryzyka.
Uwzględnij ryzyko MAR (rozporządzenie 596/2014).`
    },
    {
        number: '§15',
        title: 'Ryzyka związane z inwestycją w akcje',
        chapter: 'II. CZYNNIKI RYZYKA',
        requiredData: ['offer', 'risks'],
        prompt: `Wygeneruj §15 RYZYKA ZWIĄZANE Z INWESTYCJĄ W AKCJE.
Użyj ryzyk z kategorii INWESTYCYJNE. Minimum 4 ryzyka:
- Ryzyko braku płynności akcji
- Ryzyko rozwodnienia kapitału
- Ryzyko braku wypłaty dywidendy
- Ryzyko wyceny akcji`
    },

    // ======= ROZDZIAŁ III: DANE O EMITENCIE (§16-§35) =======
    {
        number: '§16',
        title: 'Dane o ofercie akcji',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §16 - podstawowe dane identyfikacyjne Emitenta.
Podaj: nazwa, forma prawna, kraj siedziby, adres, NIP, REGON.`
    },
    {
        number: '§17',
        title: 'Czas trwania Emitenta',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §17 CZAS TRWANIA EMITENTA:
"Emitent został utworzony na czas nieoznaczony, zgodnie z postanowieniami
umowy spółki/statutu. Emitent nie przewiduje zakończenia działalności
w określonym terminie."`
    },
    {
        number: '§18',
        title: 'Przepisy prawa, na podstawie których utworzono Emitenta',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §18 PRZEPISY PRAWA NA PODSTAWIE KTÓRYCH UTWORZONO EMITENTA:
"Emitent został utworzony i działa na podstawie przepisów prawa polskiego,
w szczególności:
1) Ustawy z dnia 15 września 2000 r. - Kodeks spółek handlowych
   (Dz.U. z 2024 r. poz. 18, t.j.),
2) Ustawy z dnia 29 lipca 2005 r. o ofercie publicznej i warunkach
   wprowadzania instrumentów finansowych do zorganizowanego systemu obrotu
   oraz o spółkach publicznych (Dz.U. z 2025 r. poz. 592, t.j.),
3) Ustawy z dnia 29 lipca 2005 r. o obrocie instrumentami finansowymi
   (Dz.U. z 2024 r. poz. 722, t.j.)."`
    },
    {
        number: '§19',
        title: 'Sąd rejestrowy',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §19 SĄD REJESTROWY:
"Emitent jest wpisany do rejestru przedsiębiorców Krajowego Rejestru Sądowego
prowadzonego przez Sąd Rejonowy {SAD_REJONOWY}, Wydział Gospodarczy Krajowego
Rejestru Sądowego, pod numerem KRS {KRS}.

Data pierwszego wpisu do rejestru: {DATA_REJESTRACJI}"`
    },
    {
        number: '§20',
        title: 'Historia Emitenta',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §20 HISTORIA EMITENTA:
Opisz krótko historię spółki, obejmując:
1. Data i miejsce założenia
2. Główne etapy rozwoju
3. Ważne wydarzenia korporacyjne (podwyższenia kapitału, przekształcenia)
4. Rozwój działalności operacyjnej
5. Kluczowe osiągnięcia

Użyj danych: {NAZWA}, założona w {MIEJSCOWOSC}, KRS: {KRS}`
    },
    {
        number: '§21',
        title: 'Opis podstawowej działalności Emitenta',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'financials'],
        prompt: `Wygeneruj §21 OPIS PODSTAWOWEJ DZIAŁALNOŚCI EMITENTA:
1. Główny przedmiot działalności według PKD: {PKD}
2. Charakterystyka oferowanych produktów/usług
3. Rynki, na których działa Emitent (geograficzne i branżowe)
4. Główni odbiorcy i dostawcy (bez ujawniania danych poufnych)
5. Pozycja konkurencyjna
6. Sezonowość działalności (jeśli dotyczy)
7. Istotne patenty, licencje, znaki towarowe (jeśli dotyczy)

Użyj danych finansowych do pokazania skali działalności:
Przychody: {PRZYCHODY} PLN`
    },
    {
        number: '§22',
        title: 'Prawa z oferowanych papierów wartościowych',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §22 PRAWA Z OFEROWANYCH PAPIERÓW WARTOŚCIOWYCH (wg KSH!):

A. PRAWA MAJĄTKOWE:
1. Prawo do dywidendy (art. 347 KSH) - szczegółowy opis
2. Prawo do udziału w masie likwidacyjnej (art. 474 KSH)
3. Prawo poboru akcji nowej emisji (art. 433 KSH)

B. PRAWA KORPORACYJNE:
1. Prawo głosu na WZA (art. 411 KSH) - 1 akcja = 1 głos
2. Prawo do informacji (art. 428 KSH)
3. Prawo do zaskarżania uchwał WZA (art. 422, 425 KSH)
4. Prawo żądania zwołania WZA (art. 400 KSH) - 5% kapitału
5. Prawo do wglądu w księgę akcyjną (art. 341 KSH)

C. OGRANICZENIA:
Akcje nie są uprzywilejowane. Brak ograniczeń w zbywaniu.`
    },
    {
        number: '§23',
        title: 'Zasady zmiany praw akcjonariuszy',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §23 ZASADY ZMIANY PRAW AKCJONARIUSZY:
"Zmiana praw z akcji wymaga zmiany statutu Emitenta i następuje zgodnie
z przepisami Kodeksu spółek handlowych:

1. Uchwała Walnego Zgromadzenia Akcjonariuszy podjęta większością 3/4 głosów
   (art. 415 KSH),
2. Wpis zmiany statutu do rejestru przedsiębiorców KRS (art. 430 KSH),
3. W przypadku uprzywilejowania akcji - zgoda wszystkich akcjonariuszy,
   których akcje dotyczą (art. 415 § 3 KSH).

Prawa z akcji nie mogą być zmienione bez zgody akcjonariusza, którego
prawa mają ulec zmianie, chyba że statut stanowi inaczej."`
    },
    {
        number: '§24',
        title: 'Sposób działania Walnego Zgromadzenia Akcjonariuszy',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §24 SPOSÓB DZIAŁANIA WALNEGO ZGROMADZENIA AKCJONARIUSZY:
Opisz szczegółowo:

1. ZWOŁYWANIE WZA:
- Zarząd zwołuje WZA (art. 399 KSH)
- Ogłoszenie w MSiG min. 3 tygodnie przed WZA
- Akcjonariusze posiadający min. 5% kapitału mogą żądać zwołania (art. 400 KSH)

2. KOMPETENCJE WZA:
- Rozpatrzenie i zatwierdzenie sprawozdań
- Podział zysku lub pokrycie straty
- Udzielenie absolutorium członkom organów
- Zmiany statutu
- Podwyższenie lub obniżenie kapitału zakładowego
- Emisja obligacji
- Połączenie, podział, przekształcenie spółki
- Rozwiązanie i likwidacja spółki

3. PODEJMOWANIE UCHWAŁ:
- Bezwzględna większość głosów, chyba że ustawa/statut przewidują inaczej
- Kworum według statutu Emitenta`
    },
    {
        number: '§25',
        title: 'Organy Emitenta',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'board'],
        prompt: `Wygeneruj §25 ORGANY EMITENTA:
Opisz strukturę organów spółki:

1. ZARZĄD:
- Skład: {ZARZAD}
- Kadencja: [określona w statucie] lat
- Kompetencje: prowadzenie spraw spółki, reprezentacja
- Sposób reprezentacji: {REPREZENTACJA}

2. RADA NADZORCZA (jeśli dotyczy):
- Skład: [członkowie RN]
- Kadencja: [określona w statucie] lat
- Kompetencje: nadzór nad działalnością spółki

3. WALNE ZGROMADZENIE AKCJONARIUSZY:
- Najwyższy organ spółki
- Kompetencje określone w KSH i statucie`
    },
    {
        number: '§26',
        title: 'Opis kapitału zakładowego',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'offer'],
        prompt: `Wygeneruj §26 OPIS KAPITAŁU ZAKŁADOWEGO:
Przedstaw szczegółowe informacje o kapitale:

1. WYSOKOŚĆ KAPITAŁU ZAKŁADOWEGO:
- Kapitał zakładowy: {KAPITAL} PLN
- Kapitał wpłacony: {KAPITAL} PLN (w całości)

2. STRUKTURA KAPITAŁU PRZED EMISJĄ:
- Liczba akcji: [przed emisją]
- Wartość nominalna: {WARTOSC_NOMINALNA} PLN
- Serie akcji i ich liczba

3. STRUKTURA KAPITAŁU PO EMISJI (planowana):
- Liczba akcji ogółem: [po emisji]
- W tym akcje nowej emisji serii {SERIA}: {LICZBA_AKCJI}
- Rozwodnienie dotychczasowych akcjonariuszy: [X]%

4. UPRZYWILEJOWANIE AKCJI:
Akcje nie są uprzywilejowane / Opis uprzywilejowania

5. KAPITAŁ DOCELOWY (jeśli dotyczy):
[Informacje o kapitale docelowym]`
    },
    {
        number: '§27',
        title: 'Informacje o osobach zarządzających',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['board'],
        prompt: `Wygeneruj §27 INFORMACJE O OSOBACH ZARZĄDZAJĄCYCH.
Dla każdego członka Zarządu podaj:
- Imię i nazwisko, funkcja
- Wykształcenie i doświadczenie zawodowe
- Powiązania z Emitentem (posiadane akcje, jeśli dotyczy)`
    },
    {
        number: '§28',
        title: 'Struktura akcjonariatu',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['shareholders', 'company'],
        prompt: `Wygeneruj §28 STRUKTURA AKCJONARIATU:
Przedstaw tabelę głównych akcjonariuszy (powyżej 5% kapitału/głosów):

| Akcjonariusz | Liczba akcji | % kapitału | % głosów |
|--------------|--------------|------------|----------|
{AKCJONARIUSZE}

Łączna liczba akcji: [liczba]
Akcje w wolnym obrocie (free float): [liczba] ([X]%)

Informacje o:
- Porozumieniach akcjonariuszy (art. 87 ustawy o ofercie)
- Akcjach własnych posiadanych przez Emitenta
- Znanych Emitentowi umowach mogących wpłynąć na strukturę akcjonariatu`
    },
    {
        number: '§29',
        title: 'Uzależnienie od innych podmiotów',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'shareholders'],
        prompt: `Wygeneruj §29 UZALEŻNIENIE OD INNYCH PODMIOTÓW:
Opisz powiązania kapitałowe i osobowe:

1. POWIĄZANIA KAPITAŁOWE:
- Podmioty dominujące wobec Emitenta
- Podmioty zależne od Emitenta
- Podmioty powiązane (wspólni akcjonariusze)

2. POWIĄZANIA OSOBOWE:
- Członkowie organów pełniący funkcje w innych podmiotach
- Wspólni członkowie zarządów/rad nadzorczych

3. ISTOTNE UMOWY Z PODMIOTAMI POWIĄZANYMI:
- Transakcje z podmiotami powiązanymi za ostatni rok obrotowy
- Warunki tych transakcji (rynkowe/nierynkowe)

Jeśli brak: "Emitent nie jest bezpośrednio ani pośrednio uzależniony
od innych podmiotów."`
    },
    {
        number: '§30',
        title: 'Informacje o postępowaniach sądowych i administracyjnych',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §30 INFORMACJE O POSTĘPOWANIACH SĄDOWYCH I ADMINISTRACYJNYCH:
Przedstaw informacje o:

1. POSTĘPOWANIA SĄDOWE:
- Sprawy, w których Emitent jest stroną
- Wartość przedmiotu sporu (jeśli przekracza 10% kapitałów własnych)
- Etap postępowania i prognozowane rozstrzygnięcie

2. POSTĘPOWANIA ARBITRAŻOWE:
- Toczące się postępowania arbitrażowe

3. POSTĘPOWANIA ADMINISTRACYJNE:
- Postępowania podatkowe, kontrole
- Postępowania przed UOKiK, KNF, innych regulatorów

4. POSTĘPOWANIA EGZEKUCYJNE:
- Prowadzone egzekucje przeciwko Emitentowi

Jeśli brak: "Według najlepszej wiedzy Emitenta, na dzień sporządzenia
Memorandum nie toczą się żadne postępowania sądowe, arbitrażowe
ani administracyjne, których stroną jest Emitent, które mogłyby mieć
istotny wpływ na sytuację finansową lub działalność Emitenta."`
    },
    {
        number: '§31',
        title: 'Otoczenie rynkowe i konkurencja',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §31 OTOCZENIE RYNKOWE I KONKURENCJA:
Opisz branżę i pozycję konkurencyjną Emitenta:

1. CHARAKTERYSTYKA RYNKU:
- Branża: {PKD} - {BRANZA}
- Wielkość rynku i dynamika wzrostu
- Główne trendy i czynniki wzrostu
- Regulacje branżowe

2. POZYCJA KONKURENCYJNA:
- Szacunkowy udział Emitenta w rynku
- Główni konkurenci
- Przewagi konkurencyjne Emitenta
- Bariery wejścia na rynek

3. KLUCZOWI KLIENCI I DOSTAWCY:
- Koncentracja odbiorców (bez nazw, jeśli poufne)
- Koncentracja dostawców
- Zależność od kluczowych kontrahentów`
    },
    {
        number: '§32',
        title: 'Strategia i plany rozwoju',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'offer'],
        prompt: `Wygeneruj §32 STRATEGIA I PLANY ROZWOJU:
Przedstaw strategię rozwoju Emitenta:

1. MISJA I WIZJA:
- Misja Emitenta
- Wizja rozwoju na najbliższe lata

2. CELE STRATEGICZNE:
- Cele krótkoterminowe (1-2 lata)
- Cele średnioterminowe (3-5 lat)
- Mierniki realizacji celów

3. PLANOWANE INWESTYCJE:
- Główne projekty inwestycyjne
- Przewidywane nakłady
- Źródła finansowania (w tym środki z emisji)

4. ROZWÓJ PRODUKTÓW/USŁUG:
- Planowane nowe produkty/usługi
- Rozwój oferty

5. EKSPANSJA GEOGRAFICZNA:
- Plany wejścia na nowe rynki`
    },
    {
        number: '§33',
        title: 'Istotne umowy',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company'],
        prompt: `Wygeneruj §33 ISTOTNE UMOWY:
Opisz umowy istotne dla działalności Emitenta:

1. UMOWY HANDLOWE:
- Umowy o wartości przekraczającej 10% przychodów
- Długoterminowe kontrakty z kluczowymi kontrahentami

2. UMOWY KREDYTOWE I FINANSOWE:
- Umowy kredytowe (kwota, oprocentowanie, zabezpieczenia, terminy)
- Umowy leasingowe
- Umowy faktoringowe

3. UMOWY UBEZPIECZENIOWE:
- Kluczowe polisy ubezpieczeniowe

4. UMOWY O WSPÓŁPRACY:
- Umowy joint venture
- Umowy licencyjne
- Umowy franczyzowe

5. UMOWY Z PODMIOTAMI POWIĄZANYMI:
- Umowy z akcjonariuszami, członkami organów

Jeśli brak umów istotnych: "Emitent nie zawarł umów, które można
uznać za istotne dla jego działalności, poza umowami zawieranymi
w normalnym toku działalności gospodarczej."`
    },
    {
        number: '§34',
        title: 'Zobowiązania pozabilansowe',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'financials'],
        prompt: `Wygeneruj §34 ZOBOWIĄZANIA POZABILANSOWE:
Opisz zobowiązania warunkowe i pozabilansowe:

1. GWARANCJE I PORĘCZENIA:
- Udzielone gwarancje bankowe
- Poręczenia za zobowiązania innych podmiotów
- Gwarancje korporacyjne

2. ZOBOWIĄZANIA WARUNKOWE:
- Potencjalne zobowiązania z tytułu sporów
- Zobowiązania z tytułu umów (kary umowne)

3. LEASING OPERACYJNY:
- Wartość przyszłych płatności leasingowych
- Harmonogram płatności

4. INNE ZOBOWIĄZANIA:
- Zobowiązania inwestycyjne
- Pozostałe zobowiązania nieujęte w bilansie

Jeśli brak: "Na dzień sporządzenia Memorandum Emitent nie posiada
istotnych zobowiązań pozabilansowych."`
    },
    {
        number: '§35',
        title: 'Polityka dywidendowa',
        chapter: 'III. DANE O EMITENCIE',
        requiredData: ['company', 'financials'],
        prompt: `Wygeneruj §35 POLITYKA DYWIDENDOWA:
Opisz politykę dywidendową Emitenta:

1. DOTYCHCZASOWE DYWIDENDY:
| Rok | Dywidenda na akcję | Łączna kwota | Stopa dywidendy |
|-----|-------------------|--------------|-----------------|
[Dane za ostatnie 3 lata lub informacja o braku wypłat]

2. DEKLAROWANA POLITYKA DYWIDENDOWA:
- Założenia polityki dywidendowej
- Planowany wskaźnik wypłaty dywidendy (payout ratio)
- Czynniki wpływające na decyzje o wypłacie

3. OGRANICZENIA W WYPŁACIE DYWIDENDY:
- Ograniczenia ustawowe (art. 348 KSH)
- Ograniczenia wynikające z umów kredytowych
- Ograniczenia statutowe

OSTRZEŻENIE: "Emitent nie gwarantuje wypłaty dywidendy w przyszłości.
Decyzja o wypłacie dywidendy zależy od sytuacji finansowej Emitenta
i jest podejmowana przez WZA na wniosek Zarządu."`
    },

    // ======= ROZDZIAŁ IV: DANE FINANSOWE (§36-§42) =======
    {
        number: '§36',
        title: 'Wybrane dane finansowe',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['financials', 'ratios'],
        prompt: `Wygeneruj §36 WYBRANE DANE FINANSOWE.
Przedstaw tabelę z danymi za ostatnie 2-3 lata:

| Pozycja | {ROK-2} | {ROK-1} | {ROK} | Zmiana YoY |
|---------|---------|---------|-------|------------|
| Przychody netto | X | X | X | X% |
| Zysk netto | X | X | X | X% |
| Suma aktywów | X | X | X | X% |
| Kapitał własny | X | X | X | X% |
| Zobowiązania | X | X | X | X% |

WSKAŹNIKI FINANSOWE:
- Rentowność netto: {RENTOWNOSC}%
- ROE: {ROE}%
- ROA: {ROA}%
- Wskaźnik zadłużenia: {ZADLUZENIE}%
- Płynność bieżąca: {PLYNNOSC}`
    },
    {
        number: '§37',
        title: 'Opinia biegłego rewidenta',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['financials'],
        prompt: `Wygeneruj §37 OPINIA BIEGŁEGO REWIDENTA:
Przedstaw informacje o badaniu sprawozdań finansowych:

1. INFORMACJE O BIEGŁYM REWIDENCIE:
- Nazwa firmy audytorskiej
- Numer na liście PANA (Polska Agencja Nadzoru Audytowego)
- Kluczowy biegły rewident

2. ZAKRES BADANIA:
- Okres objęty badaniem
- Rodzaj opinii (bez zastrzeżeń / z zastrzeżeniami / negatywna / odmowa)

3. TREŚĆ OPINII (streszczenie):
"Sprawozdanie finansowe za rok {ROK} zostało zbadane przez biegłego
rewidenta, który wydał opinię [bez zastrzeżeń / z zastrzeżeniami].
Sprawozdanie przedstawia rzetelny i jasny obraz sytuacji majątkowej
i finansowej Emitenta."

4. ZASTRZEŻENIA / UWAGI (jeśli dotyczy):
[Opis zastrzeżeń lub objaśnień zawartych w opinii]

Jeśli sprawozdanie nie było badane:
"Sprawozdanie finansowe Emitenta za rok {ROK} nie podlegało
obowiązkowemu badaniu przez biegłego rewidenta zgodnie z przepisami
ustawy o rachunkowości."`
    },
    {
        number: '§38',
        title: 'Zasady rachunkowości',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['company'],
        prompt: `Wygeneruj §38 ZASADY RACHUNKOWOŚCI:
Opisz główne zasady rachunkowości stosowane przez Emitenta:

1. PODSTAWA SPORZĄDZENIA:
- Sprawozdania sporządzane zgodnie z Ustawą o rachunkowości / MSSF
- Rok obrotowy: od 1 stycznia do 31 grudnia

2. GŁÓWNE ZASADY WYCENY:
a) Środki trwałe - wg cen nabycia pomniejszonych o odpisy amortyzacyjne
b) Zapasy - wg cen nabycia lub kosztów wytworzenia, nie wyższych od cen sprzedaży netto
c) Należności - w kwocie wymaganej zapłaty z uwzględnieniem odpisów aktualizujących
d) Inwestycje krótkoterminowe - wg wartości rynkowej lub ceny nabycia
e) Zobowiązania - w kwocie wymagającej zapłaty

3. METODY AMORTYZACJI:
- Środki trwałe: metoda liniowa
- Wartości niematerialne: metoda liniowa

4. ISTOTNE ZMIANY ZASAD RACHUNKOWOŚCI:
[Opis zmian lub informacja o braku zmian]`
    },
    {
        number: '§39',
        title: 'Opis aktywów trwałych',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['financials'],
        prompt: `Wygeneruj §39 OPIS AKTYWÓW TRWAŁYCH:
Przedstaw strukturę aktywów trwałych Emitenta:

1. RZECZOWE AKTYWA TRWAŁE:
| Kategoria | Wartość brutto | Umorzenie | Wartość netto |
|-----------|---------------|-----------|---------------|
| Grunty | X PLN | - | X PLN |
| Budynki i budowle | X PLN | X PLN | X PLN |
| Maszyny i urządzenia | X PLN | X PLN | X PLN |
| Środki transportu | X PLN | X PLN | X PLN |
| Inne | X PLN | X PLN | X PLN |
| RAZEM | X PLN | X PLN | X PLN |

2. WARTOŚCI NIEMATERIALNE I PRAWNE:
- Oprogramowanie
- Licencje
- Znaki towarowe
- Wartość firmy (goodwill)

3. INWESTYCJE DŁUGOTERMINOWE:
- Udziały i akcje w innych podmiotach
- Długoterminowe aktywa finansowe

4. OBCIĄŻENIA AKTYWÓW:
- Hipoteki
- Zastawy
- Przewłaszczenia`
    },
    {
        number: '§40',
        title: 'Kapitał obrotowy',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['financials', 'ratios'],
        prompt: `Wygeneruj §40 KAPITAŁ OBROTOWY:
Przedstaw analizę kapitału obrotowego:

1. STRUKTURA KAPITAŁU OBROTOWEGO:
| Pozycja | Wartość | % aktywów obrotowych |
|---------|---------|---------------------|
| Zapasy | X PLN | X% |
| Należności krótkoterminowe | X PLN | X% |
| Środki pieniężne | X PLN | X% |
| Inne aktywa obrotowe | X PLN | X% |
| AKTYWA OBROTOWE RAZEM | X PLN | 100% |
| Zobowiązania krótkoterminowe | X PLN | - |
| KAPITAŁ OBROTOWY NETTO | X PLN | - |

2. WSKAŹNIKI PŁYNNOŚCI:
- Płynność bieżąca (current ratio): {PLYNNOSC}
- Płynność szybka (quick ratio): [wartość]
- Płynność gotówkowa: [wartość]

3. CYKL KONWERSJI GOTÓWKI:
- Cykl rotacji zapasów: [X] dni
- Cykl rotacji należności: [X] dni
- Cykl rotacji zobowiązań: [X] dni
- Cykl konwersji gotówki: [X] dni

4. OŚWIADCZENIE O WYSTARCZALNOŚCI KAPITAŁU OBROTOWEGO:
"Według oceny Zarządu, kapitał obrotowy Emitenta jest wystarczający
do pokrycia bieżących potrzeb operacyjnych w okresie co najmniej
12 miesięcy od daty publikacji Memorandum."`
    },
    {
        number: '§41',
        title: 'Prognozy finansowe',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['company', 'financials'],
        prompt: `Wygeneruj §41 PROGNOZY FINANSOWE:
Przedstaw prognozy finansowe (jeśli Emitent je publikuje):

OPCJA A - EMITENT PUBLIKUJE PROGNOZY:
1. ZAŁOŻENIA PROGNOZY:
- Okres prognozy: [rok/lata]
- Kluczowe założenia makroekonomiczne
- Założenia dotyczące branży

2. PROGNOZOWANE WYNIKI:
| Pozycja | Prognoza | Zmiana vs rok poprzedni |
|---------|----------|------------------------|
| Przychody | X PLN | +X% |
| EBITDA | X PLN | +X% |
| Zysk netto | X PLN | +X% |

3. CZYNNIKI RYZYKA DLA PROGNOZY:
- Główne czynniki mogące wpłynąć na realizację
- Wrażliwość prognozy na zmiany założeń

OPCJA B - EMITENT NIE PUBLIKUJE PROGNOZ:
"Zarząd Emitenta podjął decyzję o niepublikowaniu prognoz finansowych
w niniejszym Memorandum ze względu na niepewność otoczenia rynkowego
oraz chęć uniknięcia tworzenia nieuzasadnionych oczekiwań wśród inwestorów.

Historyczne wyniki finansowe Emitenta zostały przedstawione w §36."`
    },
    {
        number: '§42',
        title: 'Szczegółowy opis wykorzystania środków z emisji',
        chapter: 'IV. SPRAWOZDANIA FINANSOWE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §42 SZCZEGÓŁOWY OPIS WYKORZYSTANIA ŚRODKÓW Z EMISJI:
Przedstaw planowane wykorzystanie środków:

1. SZACUNKOWE WPŁYWY Z EMISJI:
- Wpływy brutto: {LICZBA_AKCJI} × {CENA} PLN = X PLN
- Szacunkowe koszty emisji: {KOSZTY} PLN
- Wpływy netto: X PLN

2. PLANOWANE PRZEZNACZENIE ŚRODKÓW:
| Cel | Kwota | % wpływów | Termin realizacji |
|-----|-------|-----------|------------------|
| [Cel 1] | X PLN | X% | [Q/rok] |
| [Cel 2] | X PLN | X% | [Q/rok] |
| [Cel 3] | X PLN | X% | [Q/rok] |
| Kapitał obrotowy | X PLN | X% | bieżąco |
| RAZEM | X PLN | 100% | - |

3. SZCZEGÓŁOWY OPIS KAŻDEGO CELU:
{CELE_EMISJI}

4. HARMONOGRAM WYKORZYSTANIA:
- Q1-Q2: [opis]
- Q3-Q4: [opis]
- Kolejny rok: [opis]

5. ZASTRZEŻENIE:
"W przypadku pozyskania mniejszych środków niż zakładane, Zarząd
zastrzega sobie prawo do zmiany kolejności i zakresu realizacji
poszczególnych celów emisji."`
    },

    // ======= ROZDZIAŁ V: INFORMACJE DODATKOWE =======
    {
        number: '§43',
        title: 'Cele emisji',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §43 CELE EMISJI.
Opisz cele wykorzystania środków z emisji:
{CELE_EMISJI}

Jeśli brak konkretnych celów:
"Środki pozyskane z emisji akcji serii {SERIA} zostaną przeznaczone na:
1. Finansowanie rozwoju działalności operacyjnej Emitenta
2. Inwestycje w rozwój produktów/usług
3. Wzmocnienie kapitału obrotowego
4. Potencjalne akwizycje podmiotów z branży"`
    },
    {
        number: '§44',
        title: 'Koszty emisji',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['offer'],
        prompt: `Wygeneruj §44 KOSZTY EMISJI.
Szacunkowe koszty emisji: {KOSZTY} PLN

Struktura kosztów:
- Przygotowanie i dystrybucja Memorandum: X PLN
- Opłaty prawne i doradcze: X PLN
- Promocja oferty: X PLN
- Pozostałe koszty: X PLN`
    },
    {
        number: '§45',
        title: 'Załączniki',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['company'],
        prompt: `Wygeneruj §45 ZAŁĄCZNIKI:
Przedstaw listę załączników do Memorandum:

ZAŁĄCZNIKI DO MEMORANDUM INFORMACYJNEGO:

1. Odpis aktualny z rejestru przedsiębiorców KRS
2. Statut Emitenta (tekst jednolity)
3. Uchwała WZA w sprawie emisji akcji serii {SERIA}
4. Sprawozdanie finansowe za rok {ROK} wraz z opinią biegłego rewidenta
   (jeśli podlegało badaniu)
5. Sprawozdanie finansowe za rok {ROK-1}
6. Formularz zapisu na akcje serii {SERIA}
7. Pełnomocnictwo do składania zapisów (wzór)

UWAGA: "Załączniki stanowią integralną część niniejszego Memorandum
Informacyjnego i są dostępne:
a) w siedzibie Emitenta pod adresem: {ADRES}
b) na stronie internetowej Emitenta: [adres www]
c) [w biurze firmy inwestycyjnej - jeśli dotyczy]"`
    },
    {
        number: '§46',
        title: 'Oświadczenie Emitenta',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['company', 'board'],
        prompt: `Wygeneruj §46 OŚWIADCZENIE EMITENTA:
Sporządź formalne oświadczenie zgodne z wymogami prawa:

"OŚWIADCZENIE EMITENTA

Zarząd {NAZWA} z siedzibą w {MIEJSCOWOSC} oświadcza, że:

1. Zgodnie z najlepszą wiedzą Emitenta, informacje zawarte w niniejszym
   Memorandum Informacyjnym są prawdziwe, rzetelne i zgodne ze stanem
   faktycznym oraz że nie pominięto w nim żadnych faktów, które mogłyby
   wpływać na jego znaczenie.

2. Memorandum Informacyjne zostało sporządzone zgodnie z wymogami
   rozporządzenia Ministra Finansów z dnia 12 maja 2020 r. w sprawie
   szczegółowych warunków, jakim powinno odpowiadać memorandum informacyjne
   (Dz.U. z 2020 r. poz. 1053).

3. Emitent jest świadomy odpowiedzialności cywilnej i karnej za podanie
   nieprawdziwych lub wprowadzających w błąd informacji w Memorandum,
   zgodnie z art. 98 ustawy o ofercie publicznej.

4. Emitent zobowiązuje się do publikowania aktualizacji Memorandum
   w przypadku wystąpienia istotnych zmian w przedstawionych informacjach.

{MIEJSCOWOSC}, dnia [DATA]

Za Zarząd {NAZWA}:
{ZARZAD}"`
    },
    {
        number: '§47',
        title: 'Podpisy osób odpowiedzialnych za informacje zawarte w Memorandum',
        chapter: 'V. INFORMACJE DODATKOWE',
        requiredData: ['company', 'board'],
        prompt: `Wygeneruj §47 PODPISY OSÓB ODPOWIEDZIALNYCH:
Sporządź sekcję z miejscami na podpisy:

"PODPISY OSÓB ODPOWIEDZIALNYCH ZA INFORMACJE ZAWARTE W MEMORANDUM

Niniejsze Memorandum Informacyjne zostało sporządzone przez {NAZWA}
z siedzibą w {MIEJSCOWOSC}.

Za treść Memorandum odpowiadają następujące osoby:

1. ZARZĄD EMITENTA:
{ZARZAD}

Oświadczam(y), że informacje zawarte w niniejszym Memorandum Informacyjnym
są prawdziwe, rzetelne i zgodne ze stanem faktycznym oraz że nie pominięto
w nim żadnych faktów, które mogłyby wpływać na jego znaczenie.

_____________________          _____________________
[Imię i Nazwisko]              [Imię i Nazwisko]
[Funkcja]                      [Funkcja]

{MIEJSCOWOSC}, dnia [DATA]


[Miejsce na pieczęć Emitenta]


Memorandum Informacyjne sporządzono na podstawie art. 37a ustawy z dnia
29 lipca 2005 r. o ofercie publicznej i warunkach wprowadzania instrumentów
finansowych do zorganizowanego systemu obrotu oraz o spółkach publicznych
(Dz.U. z 2025 r. poz. 592, t.j.) oraz rozporządzenia Ministra Finansów
z dnia 12 maja 2020 r. (Dz.U. z 2020 r. poz. 1053)."`
    },
];

// =========================================
// GENERATION FUNCTION
// =========================================

export interface GenerationContext {
    company?: Partial<Company>;
    board?: Partial<BoardMember>[];
    shareholders?: Partial<Shareholder>[];
    financials?: Partial<FinancialStatement>[];
    ratios?: Partial<FinancialRatios>[];
    risks?: Partial<IdentifiedRisk>[];
    offer?: Partial<OfferParameters>;
}

function buildContextString(template: SectionTemplate, context: GenerationContext): string {
    let contextStr = '';

    if (template.requiredData.includes('company') && context.company) {
        contextStr += `
=== DANE SPÓŁKI ===
Nazwa: ${context.company.nazwa}
KRS: ${context.company.krs}
NIP: ${context.company.nip}
REGON: ${context.company.regon}
Forma prawna: ${context.company.formaPrawna}
Adres: ${context.company.ulica} ${context.company.numerBudynku}, ${context.company.kodPocztowy} ${context.company.miejscowosc}
Kapitał zakładowy: ${context.company.kapitalZakladowy?.toLocaleString('pl-PL')} PLN
PKD: ${context.company.pkdPrzewazajace}
Sposób reprezentacji: ${context.company.sposobReprezentacji}
`;
    }

    if (template.requiredData.includes('board') && context.board) {
        contextStr += `
=== ZARZĄD ===
${context.board.map(m => `${m.imie} ${m.nazwisko} - ${m.funkcja}`).join('\n')}
`;
    }

    if (template.requiredData.includes('shareholders') && context.shareholders) {
        contextStr += `
=== AKCJONARIUSZE ===
${context.shareholders.map(s => `${s.nazwa}: ${s.procentKapitalu}% kapitału`).join('\n')}
`;
    }

    if (template.requiredData.includes('financials') && context.financials?.[0]) {
        const fin = context.financials[0];
        contextStr += `
=== DANE FINANSOWE (${fin.rok}) ===
Przychody netto: ${fin.przychodyNetto?.toLocaleString('pl-PL')} PLN
Zysk netto: ${fin.zyskNetto?.toLocaleString('pl-PL')} PLN
Suma aktywów: ${fin.sumaAktywow?.toLocaleString('pl-PL')} PLN
Kapitał własny: ${fin.kapitalWlasny?.toLocaleString('pl-PL')} PLN
Zobowiązania: ${((fin.zobowiazaniaDlugoterminowe || 0) + (fin.zobowiazaniaKrotkoterminowe || 0)).toLocaleString('pl-PL')} PLN
`;
    }

    if (template.requiredData.includes('ratios') && context.ratios?.[0]) {
        const r = context.ratios[0];
        contextStr += `
=== WSKAŹNIKI FINANSOWE ===
Rentowność netto: ${r.rentownoscNetto}%
ROE: ${r.roe}%
ROA: ${r.roa}%
Wskaźnik zadłużenia: ${r.wskaznikZadluzenia}%
Płynność bieżąca: ${r.wskaznikPlynnosciBiezacej}
`;
    }

    if (template.requiredData.includes('risks') && context.risks) {
        const categoryRisks: Record<string, typeof context.risks> = {};
        context.risks.forEach(r => {
            if (r.kategoria) {
                if (!categoryRisks[r.kategoria]) categoryRisks[r.kategoria] = [];
                categoryRisks[r.kategoria].push(r);
            }
        });

        contextStr += `
=== ZIDENTYFIKOWANE RYZYKA ===
${Object.entries(categoryRisks).map(([cat, risks]) => `
${cat}:
${risks.map(r => `- ${r.nazwa}: ${r.opis}`).join('\n')}
`).join('\n')}
`;
    }

    if (template.requiredData.includes('offer') && context.offer) {
        contextStr += `
=== PARAMETRY OFERTY ===
Seria akcji: ${context.offer.seriaAkcji}
Liczba akcji: ${context.offer.liczbaAkcji?.toLocaleString('pl-PL')}
Wartość nominalna: ${context.offer.wartoscNominalna} PLN
Cena emisyjna: ${context.offer.cenaEmisyjna} PLN
Cele emisji: ${context.offer.celeEmisji}
Koszty emisji: ${context.offer.szacunkoweKoszty?.toLocaleString('pl-PL')} PLN
Firma inwestycyjna: ${context.offer.firmaInwestycyjna || 'brak'}
`;
    }

    return contextStr;
}

export async function generateSection(
    sectionNumber: string,
    context: GenerationContext
): Promise<AgentResult<GeneratedSection>> {
    const startTime = Date.now();

    // Find template
    const template = SECTION_TEMPLATES.find(t => t.number === sectionNumber);
    if (!template) {
        return {
            success: false,
            error: `Unknown section: ${sectionNumber}`,
            latencyMs: Date.now() - startTime
        };
    }

    try {
        const app = getFirebaseApp();
        const vertexAI = getVertexAI(app);
        const model = getGenerativeModel(vertexAI, {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
            }
        });

        const contextStr = buildContextString(template, context);

        const prompt = `
ROLA: Jesteś prawnikiem specjalizującym się w prawie rynku kapitałowego.
ZADANIE: Wygeneruj sekcję memorandum informacyjnego.

=== SEKCJA DO WYGENEROWANIA ===
Numer: ${template.number}
Tytuł: ${template.title}
Rozdział: ${template.chapter}

=== INSTRUKCJE ===
${template.prompt}

=== KONTEKST (użyj tych danych!) ===
${contextStr}

=== ZASADY FORMATOWANIA ===
1. NIE numeruj paragrafów - numeracja będzie dodana automatycznie
2. Używaj pełnych zdań, język formalny prawniczy
3. Cytuj artykuły ustaw gdzie wymagane
4. ZERO placeholderów [DO UZUPEŁNIENIA] - użyj danych z kontekstu
5. Jeśli brakuje danych, użyj sensownych wartości szacunkowych

Wygeneruj TYLKO treść sekcji, bez numeru i tytułu:
`;

        const result = await model.generateContent([{ text: prompt }]);
        const content = result.response.text().trim();

        const latencyMs = Date.now() - startTime;

        // Count placeholders
        const placeholderMatches = content.match(/\[DO UZUPEŁNIENIA\]|\[BRAK DANYCH\]|\[\?\]/g);
        const placeholderCount = placeholderMatches?.length || 0;

        // Count words
        const wordCount = content.split(/\s+/).length;

        return {
            success: true,
            data: {
                sectionNumber: template.number,
                sectionTitle: template.title,
                content,
                wordCount,
                hasPlaceholders: placeholderCount > 0,
                placeholderCount
            },
            tokensUsed: result.response.usageMetadata?.totalTokenCount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error',
            latencyMs
        };
    }
}

// Generate all sections for a memorandum
export async function generateAllSections(
    context: GenerationContext,
    onProgress?: (section: string, progress: number) => void
): Promise<AgentResult<GeneratedSection[]>> {
    const startTime = Date.now();
    const results: GeneratedSection[] = [];
    const errors: string[] = [];

    for (let i = 0; i < SECTION_TEMPLATES.length; i++) {
        const template = SECTION_TEMPLATES[i];
        const progress = ((i + 1) / SECTION_TEMPLATES.length) * 100;

        if (onProgress) {
            onProgress(template.number, progress);
        }

        const result = await generateSection(template.number, context);

        if (result.success && result.data) {
            results.push(result.data);
        } else {
            errors.push(`${template.number}: ${result.error}`);
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const latencyMs = Date.now() - startTime;

    if (results.length === 0) {
        return {
            success: false,
            error: `Failed to generate any sections. Errors: ${errors.join('; ')}`,
            latencyMs
        };
    }

    return {
        success: true,
        data: results,
        latencyMs
    };
}

// Get section template info
export function getSectionTemplates(): SectionTemplate[] {
    return SECTION_TEMPLATES;
}

// Get sections by chapter
export function getSectionsByChapter(chapter: string): SectionTemplate[] {
    return SECTION_TEMPLATES.filter(t => t.chapter === chapter);
}
