/**
 * Prompty zgodne z rozporządzeniem Dz.U. 2020.1053 (§7-§17)
 * Struktura memorandum informacyjnego
 */

/**
 * System prompt z kontekstem prawnym
 */
export const LEGAL_SYSTEM_PROMPT = `
Jesteś doświadczonym radcą prawnym specjalizującym się w polskim prawie spółek handlowych oraz prawie rynków kapitałowych. Sporządzasz memoranda informacyjne zgodnie z:

PODSTAWY PRAWNE:
- Rozporządzenie MF w sprawie szczegółowych warunków memorandum informacyjnego (Dz.U. 2020.1053)
- Kodeks Spółek Handlowych (Dz.U. 2024.18 t.j.)
- Ustawa o ofercie publicznej

STRUKTURA MEMORANDUM (§7 rozporządzenia):
1. Wstęp (§8)
2. Czynniki ryzyka (§9)
3. Osoby odpowiedzialne za informacje (§10)
4. Dane o emisji lub sprzedaży (§11-12)
5. Dane o emitencie (§13-14)
6. Sprawozdania finansowe (§15)
7. Załączniki (§16)

ZASADY PISANIA:
1. Używaj precyzyjnego języka prawniczego
2. Cytuj konkretne artykuły KSH gdy uzasadnione
3. Każde stwierdzenie opieraj na danych
4. Identyfikuj potencjalne ryzyka dla inwestorów
5. Zachowaj konserwatywny, profesjonalny ton

FORMAT: Odpowiadaj w czystym tekście, bez markdown.
`;

/**
 * §8 - Wstęp
 */
export const INTRO_SECTION_PROMPT = `
Sporządź WSTĘP memorandum informacyjnego zgodnie z §8 rozporządzenia Dz.U. 2020.1053.

DANE SPÓŁKI:
{company_data}

WYMAGANE ELEMENTY WSTĘPU (§8):
1. Tytuł "Memorandum informacyjne"
2. Firma (nazwa) i siedziba emitenta
3. Stwierdzenie: "Oferowanie papierów wartościowych odbywa się wyłącznie na warunkach i zgodnie z zasadami określonymi w memorandum. Memorandum jest jedynym prawnie wiążącym dokumentem zawierającym informacje o papierach wartościowych, ich ofercie i emitencie."
4. Określenie podstawy prawnej prowadzenia oferty
5. Data sporządzenia memorandum

Napisz profesjonalny wstęp (4-5 akapitów) zawierający wszystkie wymagane elementy.
`;

/**
 * §13-14 - Dane o emitencie (kapitał)
 */
export const CAPITAL_SECTION_PROMPT = `
Sporządź sekcję "KAPITAŁ ZAKŁADOWY I STRUKTURA WŁASNOŚCIOWA" zgodnie z §13 ust. 1 pkt 6-9.

DANE SPÓŁKI:
- Kapitał zakładowy: {kapital} PLN
- Forma prawna: {forma}
- Data powstania: {data_powstania}
- Wspólnicy/Akcjonariusze: {wspolnicy}

KONTEKST KSH:
{ksh_articles}

WYMAGANE INFORMACJE (§13 ust. 1):
- pkt 6: rodzaje i wartości kapitałów własnych oraz zasady ich tworzenia
- pkt 7: informacje o nieopłaconej części kapitału zakładowego
- pkt 8: przewidywane zmiany kapitału
- pkt 22: struktura akcjonariatu (>5% głosów)

Napisz 3-4 profesjonalne akapity.
`;

/**
 * §13 pkt 21 - Organy spółki
 */
export const BOARD_SECTION_PROMPT = `
Sporządź sekcję "OSOBY ZARZĄDZAJĄCE I NADZORUJĄCE" zgodnie z §13 ust. 1 pkt 21.

SKŁAD ZARZĄDU:
{reprezentacja}

SPOSÓB REPREZENTACJI:
{sposob_reprezentacji}

FORMA PRAWNA: {forma}

KONTEKST KSH:
{ksh_articles}

WYMAGANE INFORMACJE (§13 ust. 1 pkt 21):
a) imię, nazwisko, zajmowane stanowisko, termin upływu kadencji
b) istotne informacje o wykształceniu i kwalifikacjach
c) czy pełnili funkcje w podmiotach w upadłości/likwidacji (5 lat)
d) wpis w rejestrze dłużników niewypłacalnych
e) informacje o pozbawieniu prawa prowadzenia działalności
f) postępowania cywilne/karne (2 lata)
g) potencjalne konflikty interesów

Napisz profesjonalną sekcję, wskazując dostępne dane i zaznaczając brak informacji gdzie dotyczy.
`;

/**
 * §13 pkt 13 - Przedmiot działalności
 */
export const BUSINESS_SECTION_PROMPT = `
Sporządź sekcję "PODSTAWOWE PRODUKTY, TOWARY I USŁUGI" zgodnie z §13 ust. 1 pkt 13.

PRZEDMIOT DZIAŁALNOŚCI (PKD):
{pkd_lista}

PKD PRZEWAŻAJĄCE: {pkd_przewazajace}

DANE SPÓŁKI:
- Nazwa: {nazwa}
- Data rozpoczęcia: {data_powstania}
- Siedziba: {siedziba}

WYMAGANE (§13 ust. 1 pkt 13):
- podstawowe informacje o produktach, towarach lub usługach
- określenie wartościowe i ilościowe
- udział poszczególnych grup w przychodach
- podział na segmenty działalności

Napisz 2-3 profesjonalne akapity opisujące profil działalności.
`;

/**
 * §15 - Sprawozdania finansowe
 */
export const FINANCIALS_SECTION_PROMPT = `
Sporządź sekcję "SYTUACJA FINANSOWA I WYNIKI DZIAŁALNOŚCI" na podstawie §15 rozporządzenia.

DANE FINANSOWE:
{financials_table}

WSKAŹNIKI:
- Wskaźnik płynności: {plynnosc}
- Rentowność netto: {rentownosc}%
- Wskaźnik zadłużenia: {zadluzenie}%
- Dynamika przychodów r/r: {dynamika}%

KONTEKST (§15 ust. 1):
Memorandum powinno zawierać sprawozdanie finansowe za ostatni rok obrotowy, obejmujące dane porównawcze, sporządzone zgodnie z przepisami i zbadane przez biegłego rewidenta.

NAPISZ ANALIZĘ:
1. Przychody i dynamika
2. Wynik finansowy (zysk/strata)
3. Struktura bilansu
4. Płynność i zadłużenie
5. Ocena kondycji finansowej

Napisz 3-4 merytoryczne akapity oparte na danych.
`;

/**
 * §9 - Czynniki ryzyka (rozbudowany)
 */
export const RISK_ANALYSIS_PROMPT = `
Sporządź rozdział "CZYNNIKI RYZYKA" zgodnie z §9 rozporządzenia.

DANE SPÓŁKI:
{company_data}

DANE FINANSOWE:
{financials}

WSKAŹNIKI:
{ratios}

KONTEKST KSH:
{ksh_context}

WYMOGI §9:
- W rozdziale "Czynniki ryzyka" zamieszcza się informacje o czynnikach powodujących ryzyko dla nabywcy papierów wartościowych
- W szczególności czynniki związane z sytuacją finansową emitenta, jego grupy kapitałowej i z jego otoczeniem
- Inne czynniki istotne dla oceny emisji i związanego z nią ryzyka

KATEGORIE RYZYKA:

1. RYZYKA ZWIĄZANE Z EMITENTEM
   - Sytuacja finansowa (płynność, zadłużenie, rentowność)
   - Działalność operacyjna (key-man, procesy, technologia)
   - Struktura korporacyjna (kapitał, zarząd)

2. RYZYKA ZWIĄZANE Z OTOCZENIEM
   - Konkurencja rynkowa
   - Regulacje i wymogi prawne
   - Koniunktura gospodarcza

3. RYZYKA ZWIĄZANE Z PAPIERAMI WARTOŚCIOWYMI
   - Płynność obrotu
   - Wycena
   - Dywidenda

ZWRÓĆ JSON:
[
  {
    "kategoria": "emitent|otoczenie|papiery_wartosciowe",
    "tytul": "Tytuł ryzyka",
    "opis": "Szczegółowy opis z odniesieniem do danych...",
    "istotnosc": "wysoka|srednia|niska"
  }
]

Zidentyfikuj minimum 5-7 czynników ryzyka.
`;

/**
 * Podsumowanie
 */
export const SUMMARY_SECTION_PROMPT = `
Sporządź PODSUMOWANIE memorandum informacyjnego.

DANE SPÓŁKI:
- Nazwa: {nazwa}
- Forma prawna: {forma}
- Kapitał: {kapital}
- Przedmiot działalności: {pkd}
- Lat na rynku: {lata_dzialalnosci}

KLUCZOWE DANE FINANSOWE:
- Przychody: {przychody}
- Wynik netto: {zysk}
- Suma bilansowa: {suma_bilansowa}

GŁÓWNE RYZYKA:
{ryzyka}

Napisz profesjonalne podsumowanie (2-3 akapity):
1. Syntetyczny opis spółki
2. Kluczowe wskaźniki
3. Najważniejsze ryzyka
4. Zachęta do zapoznania się z pełną treścią memorandum

STYL: Obiektywny, wyważony. Nie zachęcaj wprost do inwestycji.
`;

/**
 * Walidacja prawna
 */
export const VALIDATION_PROMPT = `
Zweryfikuj fragment memorandum pod kątem zgodności z Dz.U. 2020.1053.

FRAGMENT:
{section_content}

TYP SEKCJI: {section_type}

SPRAWDŹ:
1. Czy zawiera wymagane elementy z odpowiedniego paragrafu rozporządzenia?
2. Czy język jest profesjonalny i prawniczy?
3. Czy nie zawiera fałszywych twierdzeń?
4. Czy ostrzeżenia są wystarczające?

ZWRÓĆ JSON:
{
  "valid": true/false,
  "errors": [],
  "warnings": [],
  "missing_elements": []
}
`;
