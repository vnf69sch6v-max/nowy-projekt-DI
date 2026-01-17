/**
 * Moduł wyszukiwania i dostępu do artykułów KSH
 */

// Typy dla artykułów KSH
export interface KSHArticle {
    id: string;
    type: string;
    Article: string;
    Content: string;
    RelatedTextbook: string[];
}

// Lazy loading - ładuj tylko gdy potrzebne
let kshCache: KSHArticle[] | null = null;

async function loadKSH(): Promise<KSHArticle[]> {
    if (kshCache) return kshCache;

    // Dynamiczny import dla server-side
    const data = await import('@/data/ksh_data.json');
    kshCache = data.default as KSHArticle[];
    return kshCache;
}

/**
 * Wyszukuje artykuły KSH zawierające podane frazy
 */
export async function searchKSH(query: string, limit: number = 10): Promise<KSHArticle[]> {
    const articles = await loadKSH();
    const lowerQuery = query.toLowerCase();

    return articles
        .filter(article =>
            article.Content.toLowerCase().includes(lowerQuery) ||
            article.Article.toLowerCase().includes(lowerQuery)
        )
        .slice(0, limit);
}

/**
 * Pobiera konkretny artykuł po numerze (np. "art. 154", "154", "Art. 154.")
 */
export async function getArticle(articleNumber: string): Promise<KSHArticle | null> {
    const articles = await loadKSH();
    const cleanNum = articleNumber.replace(/\D/g, '');

    return articles.find(article => {
        const artNum = article.Article.replace(/\D/g, '');
        return artNum === cleanNum;
    }) || null;
}

/**
 * Pobiera artykuły dla danej formy prawnej spółki
 */
export async function getArticlesByCompanyForm(forma: string): Promise<KSHArticle[]> {
    const articles = await loadKSH();

    // Zakresy artykułów dla różnych form prawnych
    const ranges: Record<string, [number, number]> = {
        'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ': [151, 300],
        'SP. Z O.O.': [151, 300],
        'SPÓŁKA AKCYJNA': [301, 490],
        'S.A.': [301, 490],
        'SPÓŁKA JAWNA': [22, 85],
        'SP. J.': [22, 85],
        'SPÓŁKA KOMANDYTOWA': [102, 124],
        'SP. K.': [102, 124],
        'SPÓŁKA KOMANDYTOWO-AKCYJNA': [125, 150],
        'S.K.A.': [125, 150],
        'PROSTA SPÓŁKA AKCYJNA': [3001, 300134],
        'P.S.A.': [3001, 300134],
        'SPÓŁKA PARTNERSKA': [86, 101],
        'SP. P.': [86, 101],
    };

    const formaUpper = forma.toUpperCase();
    const range = Object.entries(ranges).find(([key]) => formaUpper.includes(key))?.[1];

    if (!range) {
        // Fallback: zwróć przepisy ogólne
        return articles.filter(article => {
            const num = parseInt(article.Article.match(/\d+/)?.[0] || '0');
            return num >= 1 && num <= 21; // Przepisy ogólne
        });
    }

    return articles.filter(article => {
        const num = parseInt(article.Article.match(/\d+/)?.[0] || '0');
        return num >= range[0] && num <= range[1];
    });
}

/**
 * Pobiera kluczowe artykuły dla memorandum (kapitał, zarząd, reprezentacja)
 */
export async function getKeyArticlesForMemorandum(forma: string): Promise<{
    capital: KSHArticle[];
    board: KSHArticle[];
    representation: KSHArticle[];
    liability: KSHArticle[];
}> {
    const articles = await loadKSH();

    // Określ numery artykułów w zależności od formy
    const isSpzoo = forma.toUpperCase().includes('Z OGRANICZONĄ') || forma.toUpperCase().includes('Z O.O');
    const isSA = forma.toUpperCase().includes('AKCYJNA') && !forma.toUpperCase().includes('PROSTA');

    if (isSpzoo) {
        return {
            capital: await Promise.all([154, 157, 158, 260].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            board: await Promise.all([201, 202, 203, 204, 207, 208, 209, 210, 211].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            representation: await Promise.all([204, 205, 206].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            liability: await Promise.all([291, 293, 299].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
        };
    }

    if (isSA) {
        return {
            capital: await Promise.all([302, 308, 309, 310].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            board: await Promise.all([368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            representation: await Promise.all([373, 374].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
            liability: await Promise.all([479, 480, 483, 484].map(n => getArticle(n.toString()))).then(arr => arr.filter(Boolean) as KSHArticle[]),
        };
    }

    // Fallback dla innych form
    return {
        capital: [],
        board: [],
        representation: [],
        liability: [],
    };
}

/**
 * Formatuje artykuł do czytelnej postaci
 */
export function formatArticle(article: KSHArticle): string {
    return `${article.Article}\n${article.Content}`;
}

/**
 * Formatuje listę artykułów jako kontekst dla AI
 */
export function formatArticlesForAI(articles: { Article: string; Content: string }[]): string {
    if (articles.length === 0) return 'Brak dostępnych artykułów KSH.';

    return articles
        .map(a => `[${a.Article}]\n${a.Content.substring(0, 500)}${a.Content.length > 500 ? '...' : ''}`)
        .join('\n\n---\n\n');
}
