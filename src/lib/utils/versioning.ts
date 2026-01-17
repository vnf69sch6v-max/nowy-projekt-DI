/**
 * System wersjonowania dokumentów
 */

export interface DocumentVersion {
    id: string;
    timestamp: number;
    content: string;
    changes: string;
    author: string;
    companyKrs: string;
    score?: number;
}

export interface VersionDiff {
    added: string[];
    removed: string[];
    modified: string[];
}

const STORAGE_KEY = 'auto-memorandum-versions';
const MAX_VERSIONS_PER_DOC = 10;

/**
 * Zapisuje nową wersję dokumentu
 */
export function saveVersion(
    companyKrs: string,
    content: string,
    changes: string = 'Nowa wersja',
    author: string = 'Użytkownik'
): DocumentVersion {
    const version: DocumentVersion = {
        id: `${companyKrs}-${Date.now()}`,
        timestamp: Date.now(),
        content,
        changes,
        author,
        companyKrs,
    };

    const allVersions = getAllVersions();
    const docVersions = allVersions.filter(v => v.companyKrs === companyKrs);

    // Limit versions per document
    if (docVersions.length >= MAX_VERSIONS_PER_DOC) {
        const oldest = docVersions.sort((a, b) => a.timestamp - b.timestamp)[0];
        const index = allVersions.findIndex(v => v.id === oldest.id);
        if (index > -1) allVersions.splice(index, 1);
    }

    allVersions.push(version);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allVersions));
    } catch (e) {
        console.error('Failed to save version:', e);
    }

    return version;
}

/**
 * Pobiera wszystkie wersje
 */
export function getAllVersions(): DocumentVersion[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * Pobiera wersje dla konkretnego dokumentu
 */
export function getDocumentVersions(companyKrs: string): DocumentVersion[] {
    return getAllVersions()
        .filter(v => v.companyKrs === companyKrs)
        .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Pobiera konkretną wersję
 */
export function getVersion(versionId: string): DocumentVersion | null {
    return getAllVersions().find(v => v.id === versionId) || null;
}

/**
 * Porównuje dwie wersje
 */
export function compareVersions(v1: DocumentVersion, v2: DocumentVersion): VersionDiff {
    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Simple diff - check for added/removed lines
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);

    for (const line of lines2) {
        if (!set1.has(line) && line.trim()) {
            added.push(line);
        }
    }

    for (const line of lines1) {
        if (!set2.has(line) && line.trim()) {
            removed.push(line);
        }
    }

    // Detect modified sections (simplified)
    const sections1 = extractSections(v1.content);
    const sections2 = extractSections(v2.content);

    for (const [name, content] of Object.entries(sections2)) {
        if (sections1[name] && sections1[name] !== content) {
            modified.push(name);
        }
    }

    return { added, removed, modified };
}

/**
 * Wyciąga sekcje z dokumentu
 */
function extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const regex = /^([IVX]+\.\s*.+?)$/gm;
    let match;
    let lastSection = 'WSTĘP';
    let lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
        if (lastSection) {
            sections[lastSection] = content.substring(lastIndex, match.index).trim();
        }
        lastSection = match[1];
        lastIndex = match.index + match[0].length;
    }

    if (lastSection) {
        sections[lastSection] = content.substring(lastIndex).trim();
    }

    return sections;
}

/**
 * Formatuje datę wersji
 */
export function formatVersionDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Usuwa wersję
 */
export function deleteVersion(versionId: string): void {
    const allVersions = getAllVersions().filter(v => v.id !== versionId);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allVersions));
    } catch (e) {
        console.error('Failed to delete version:', e);
    }
}

/**
 * Przywraca wersję (kopiuje jako aktualną)
 */
export function restoreVersion(versionId: string): DocumentVersion | null {
    const version = getVersion(versionId);
    if (!version) return null;

    return saveVersion(
        version.companyKrs,
        version.content,
        `Przywrócono z wersji ${formatVersionDate(version.timestamp)}`,
        'System'
    );
}
