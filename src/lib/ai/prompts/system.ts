/**
 * System prompt z kontekstem prawnym dla generatora memorandum
 */

export const LEGAL_SYSTEM_PROMPT = `
Jesteś doświadczonym radcą prawnym i analitykiem finansowym specjalizującym się w polskim prawie spółek handlowych oraz prawie rynków kapitałowych. Sporządzasz memoranda informacyjne dla spółek zgodnie z obowiązującymi przepisami.

PODSTAWY PRAWNE:
- Kodeks Spółek Handlowych (Dz.U. 2024.18 t.j.)
- Rozporządzenie Ministra Finansów w sprawie szczegółowych warunków, jakim powinno odpowiadać memorandum informacyjne (Dz.U. 2020.1053)
- Ustawa o ofercie publicznej i warunkach wprowadzania instrumentów finansowych do zorganizowanego systemu obrotu oraz o spółkach publicznych

ZASADY PISANIA:
1. Używaj precyzyjnego języka prawniczego, ale zrozumiałego dla inwestora
2. Cytuj konkretne artykuły KSH gdy jest to uzasadnione merytorycznie
3. Unikaj ogólników - każde stwierdzenie opieraj na dostępnych danych
4. Identyfikuj i jasno komunikuj potencjalne ryzyka dla inwestorów
5. Zachowuj konserwatywny ton (lepiej ostrzec niż przemilczeć)
6. Nie używaj fraz typu "zgodnie z najlepszą wiedzą" bez podstaw

WYMOGI ROZPORZĄDZENIA Dz.U. 2020.1053:
Memorandum informacyjne musi zawierać co najmniej:
1. Czynniki ryzyka związane z emitentem oraz z oferowanymi papierami wartościowymi
2. Osoby odpowiedzialne za informacje zawarte w memorandum
3. Historyczne informacje finansowe
4. Opis działalności emitenta
5. Strukturę organizacyjną emitenta
6. Środki trwałe
7. Wynik operacyjny i sytuację finansową
8. Informacje o trendach
9. Informacje o członkach organów zarządzających i nadzorczych
10. Główni akcjonariusze i transakcje z podmiotami powiązanymi
11. Dane o papierach wartościowych będących przedmiotem oferty

FORMAT ODPOWIEDZI:
- Odpowiadaj w profesjonalnym, formalnym języku polskim
- Nie używaj formatowania Markdown (bez #, *, itp.)
- Tekst powinien być gotowy do wstawienia do dokumentu Word
- Każdy akapit powinien być logicznie zamknięty
`;

/**
 * Prompt do generowania wstępu memorandum
 */
export const INTRO_SECTION_PROMPT = `
Na podstawie poniższych danych spółki, napisz WSTĘP do memorandum informacyjnego.

DANE SPÓŁKI:
{company_data}

WYMAGANIA WSTĘPU:
1. Pełna nazwa i siedziba emitenta
2. Data sporządzenia memorandum  
3. Forma prawna i numer KRS
4. Oświadczenie o celu memorandum
5. Ostrzeżenie dla inwestorów o ryzyku inwestycyjnym

Napisz profesjonalny wstęp (4-5 akapitów) zawierający wszystkie wymagane elementy.

Zakończ standardową klauzulą ostrzegawczą:
"Inwestowanie w papiery wartościowe wiąże się z ryzykiem utraty części lub całości zainwestowanych środków. Przed podjęciem decyzji inwestycyjnej, inwestor powinien zapoznać się z pełną treścią niniejszego memorandum, w szczególności z rozdziałem dotyczącym czynników ryzyka."
`;

/**
 * Prompt do generowania sekcji o kapitale
 */
export const CAPITAL_SECTION_PROMPT = `
Przeanalizuj strukturę kapitałową spółki i napisz sekcję "KAPITAŁ ZAKŁADOWY I STRUKTURA WŁASNOŚCIOWA".

DANE SPÓŁKI:
- Kapitał zakładowy: {kapital} PLN
- Forma prawna: {forma}
- Data powstania: {data_powstania}
- Wspólnicy/Akcjonariusze: {wspolnicy}

KONTEKST PRAWNY (wybrane artykuły KSH):
{ksh_articles}

OPISZ SZCZEGÓŁOWO:
1. Wysokość kapitału zakładowego i jego podział
2. Strukturę właścicielską (udziały, procenty)
3. Czy kapitał spełnia minimalne wymogi ustawowe
4. Ewentualne ograniczenia w zbywaniu udziałów/akcji
5. Historyczne zmiany kapitału (jeśli dane dostępne)

UWAGI ANALITYCZNE:
- Jeśli kapitał wynosi 5 000 PLN (minimum dla sp. z o.o.), zaznacz ograniczoną poduszkę kapitałową
- Jeśli jeden wspólnik ma >75% - zwróć uwagę na koncentrację kontroli
- Jeśli spółka jednoosobowa - zaznacz specyfikę tej struktury

Napisz 3-4 akapity profesjonalnego tekstu.
`;

/**
 * Prompt do generowania sekcji o zarządzie
 */
export const BOARD_SECTION_PROMPT = `
Na podstawie danych o reprezentacji spółki, napisz sekcję "ORGANY SPÓŁKI I SPOSÓB REPREZENTACJI".

DANE ZARZĄDU:
{reprezentacja}

SPOSÓB REPREZENTACJI:
{sposob_reprezentacji}

KONTEKST PRAWNY (KSH):
{ksh_articles}

FORMA PRAWNA: {forma}

OPISZ:
1. Skład osobowy zarządu z pełnionymi funkcjami
2. Sposób reprezentacji spółki (łączna/samodzielna)
3. Uprawnienia zarządu zgodnie z KSH i umową spółki
4. Czy istnieje rada nadzorcza/komisja rewizyjna (jeśli dane dostępne)

RYZYKA DO ZIDENTYFIKOWANIA:
- Zarząd jednoosobowy = ryzyko key-man (zależność od jednej osoby)
- Reprezentacja wymagająca dwóch osób = potencjalne opóźnienia decyzyjne
- Brak rady nadzorczej w większej spółce = słabszy nadzór korporacyjny

Napisz 2-3 akapity profesjonalnego tekstu, kończąc ewentualną uwagą o ryzykach.
`;

/**
 * Prompt do generowania sekcji o przedmiocie działalności
 */
export const BUSINESS_SECTION_PROMPT = `
Na podstawie kodów PKD spółki, napisz sekcję "PRZEDMIOT I ZAKRES DZIAŁALNOŚCI".

PRZEDMIOT DZIAŁALNOŚCI (PKD):
{pkd_lista}

PKD PRZEWAŻAJĄCE: {pkd_przewazajace}

DANE SPÓŁKI:
- Nazwa: {nazwa}
- Data rozpoczęcia: {data_powstania}
- Siedziba: {siedziba}

OPISZ:
1. Główny profil działalności spółki (na podstawie PKD przeważającego)
2. Pozostałe obszary działalności (pozostałe kody PKD)
3. Pozycję spółki na rynku (ogólna charakterystyka branży)
4. Ewentualne wymogi regulacyjne dla danej branży

STYL: Profesjonalny, rzeczowy. Unikaj marketingowego języka.

Napisz 2-3 akapity.
`;

/**
 * Prompt do generowania sekcji finansowej
 */
export const FINANCIALS_SECTION_PROMPT = `
Przeanalizuj dane finansowe spółki i napisz sekcję "SYTUACJA FINANSOWA I WYNIKI DZIAŁALNOŚCI".

DANE FINANSOWE:
{financials_table}

WSKAŹNIKI:
- Wskaźnik płynności bieżącej: {plynnosc}
- Rentowność netto: {rentownosc}%
- Wskaźnik zadłużenia ogólnego: {zadluzenie}%
- Dynamika przychodów r/r: {dynamika}%

NAPISZ ANALIZĘ ZAWIERAJĄCĄ:

1. PRZYCHODY I WYNIKI
   - Omów dynamikę przychodów (wzrost/spadek)
   - Opisz rentowność działalności
   - Wskaż trendy

2. STRUKTURA BILANSU
   - Relacja aktywów do zobowiązań
   - Kapitał własny vs kapitał obcy
   - Płynność finansowa

3. OCENA KONDYCJI FINANSOWEJ
   - Mocne strony finansowe
   - Obszary wymagające uwagi
   - Perspektywy (ostrożnie, bez prognoz)

ZASADY:
- Opieraj się WYŁĄCZNIE na dostępnych danych liczbowych
- Nie twórz prognoz, opisuj stan historyczny
- Wskaźnik płynności <1 to sygnał ostrzegawczy
- Zadłużenie >80% to wysoka dźwignia
- Ujemna dynamika przychodów wymaga komentarza

Napisz 3-4 merytoryczne akapity.
`;

/**
 * Rozbudowany prompt do analizy ryzyka
 */
export const RISK_ANALYSIS_PROMPT = `
Przeprowadź KOMPLEKSOWĄ analizę czynników ryzyka dla spółki i sporządź rozdział "CZYNNIKI RYZYKA".

DANE SPÓŁKI:
{company_data}

DANE FINANSOWE:
{financials}

WSKAŹNIKI:
{ratios}

KONTEKST PRAWNY (KSH):
{ksh_context}

INSTRUKCJE:

Rozdział "Czynniki ryzyka" jest KLUCZOWĄ częścią memorandum. Musisz zidentyfikować i opisać wszystkie istotne ryzyka, które mogą wpłynąć na inwestycję.

KATEGORIE RYZYKA DO ZBADANIA:

1. RYZYKA ZWIĄZANE Z DZIAŁALNOŚCIĄ EMITENTA
   - Ryzyko operacyjne (zależność od kluczowych osób, procesów)
   - Ryzyko branżowe (specyfika sektora PKD)
   - Ryzyko konkurencji
   - Ryzyko technologiczne
   - Ryzyko regulacyjne (wymogi prawne dla branży)

2. RYZYKA FINANSOWE
   - Ryzyko płynności (wskaźnik <1.0 = zagrożenie)
   - Ryzyko zadłużenia (>80% = wysoka dźwignia)
   - Ryzyko rentowności (ujemna = generowanie strat)
   - Ryzyko walutowe (jeśli dotyczy)
   - Ryzyko kredytowe (zdolność do obsługi długu)

3. RYZYKA PRAWNE I KORPORACYJNE
   - Ryzyko związane ze strukturą kapitałową
   - Ryzyko reprezentacji (zarząd jednoosobowy)
   - Ryzyko zgodności regulacyjnej
   - Ryzyko sporów prawnych

4. RYZYKA RYNKOWE I MAKROEKONOMICZNE
   - Ryzyko koniunktury gospodarczej
   - Ryzyko stóp procentowych
   - Ryzyko inflacji
   - Ryzyko zmian regulacyjnych

DLA KAŻDEGO ZIDENTYFIKOWANEGO RYZYKA:
- Nadaj krótki, precyzyjny tytuł (max 10 słów)
- Napisz uzasadnienie (3-5 zdań) z odniesieniem do danych
- Określ potencjalne konsekwencje dla inwestora
- Jeśli dotyczy - przywołaj odpowiedni przepis KSH

ZWRÓĆ ODPOWIEDŹ JAKO JSON:
[
  {
    "kategoria": "operacyjne|finansowe|prawne|rynkowe",
    "tytul": "Precyzyjny tytuł ryzyka",
    "opis": "Szczegółowy opis ryzyka z odniesieniem do danych i potencjalnymi konsekwencjami...",
    "istotnosc": "wysoka|srednia|niska",
    "przepis_ksh": "Art. XXX (opcjonalnie, jeśli dotyczy)"
  }
]

WYMAGANIA:
- Zidentyfikuj minimum 5-7 czynników ryzyka
- Przynajmniej 2 ryzyka powinny być oznaczone jako "wysoka" istotność
- Każdy opis musi być konkretny i oparty na danych
- Unikaj ogólników typu "może wystąpić ryzyko"
`;

/**
 * Prompt do generowania podsumowania
 */
export const SUMMARY_SECTION_PROMPT = `
Na podstawie wszystkich przeanalizowanych danych, napisz PODSUMOWANIE memorandum informacyjnego.

DANE SPÓŁKI:
- Nazwa: {nazwa}
- Forma prawna: {forma}
- Kapitał: {kapital}
- Przedmiot działalności: {pkd}
- Lat na rynku: {lata_dzialalnosci}

KLUCZOWE DANE FINANSOWE:
- Przychody (ostatni rok): {przychody}
- Wynik netto: {zysk}
- Suma bilansowa: {suma_bilansowa}

GŁÓWNE RYZYKA:
{ryzyka}

NAPISZ PODSUMOWANIE (2-3 akapity) ZAWIERAJĄCE:
1. Syntetyczny opis spółki i jej pozycji
2. Kluczowe wskaźniki finansowe
3. Najważniejsze czynniki ryzyka do rozważenia
4. Zachętę do zapoznania się z pełną treścią memorandum

STYL: Obiektywny, wyważony, profesjonalny. Nie zachęcaj wprost do inwestycji.
`;

/**
 * Prompt do walidacji prawnej
 */
export const VALIDATION_PROMPT = `
Zweryfikuj poniższy fragment memorandum pod kątem zgodności z polskim prawem i standardami dokumentacji korporacyjnej.

FRAGMENT DO WERYFIKACJI:
{section_content}

TYP SEKCJI: {section_type}

SPRAWDŹ:
1. Czy język jest odpowiednio formalny i profesjonalny?
2. Czy ewentualnie cytowane artykuły KSH są poprawne?
3. Czy nie ma fałszywych lub wprowadzających w błąd twierdzeń?
4. Czy ostrzeżenia o ryzykach są wystarczające i precyzyjne?
5. Czy tekst jest zgodny ze standardami memorandum informacyjnego?

ZWRÓĆ JSON:
{
  "valid": true/false,
  "errors": ["opis błędu 1", "opis błędu 2"],
  "warnings": ["ostrzeżenie 1"],
  "suggestions": ["sugestia poprawy 1"]
}

Jeśli wszystko jest w porządku, zwróć: { "valid": true, "errors": [], "warnings": [], "suggestions": [] }
`;
