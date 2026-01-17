'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import DocumentUploader from './DocumentUploader';
import OfferParametersForm, { OfferParameters } from './OfferParametersForm';
import { Sparkles, Download, Loader2, CheckCircle, AlertCircle, FileText, Eye, Edit3, X } from 'lucide-react';
import { KRSCompany, FinancialData, OfferDocumentData } from '@/types';

// Progress sections
const SECTION_NAMES = [
    { id: 'analysis', name: 'Analiza dokumentów', icon: '📄' },
    { id: 'intro', name: 'I. Wstęp', icon: '📋' },
    { id: 'risks', name: 'II. Czynniki ryzyka', icon: '⚠️' },
    { id: 'responsible', name: 'III. Osoby odpowiedzialne', icon: '👤' },
    { id: 'offer', name: 'IV. Dane o ofercie', icon: '📈' },
    { id: 'issuer', name: 'V. Dane o emitencie', icon: '🏢' },
    { id: 'financial', name: 'VI. Sprawozdania', icon: '💰' },
    { id: 'attachments', name: 'VII. Załączniki', icon: '📎' },
];

interface EditableField {
    id: string;
    placeholder: string;
    value: string;
    context: string;
}

export default function MemorandumGenerator() {
    const [krsFile, setKrsFile] = useState<File | null>(null);
    const [financialFile, setFinancialFile] = useState<File | null>(null);
    const [offerFile, setOfferFile] = useState<File | null>(null);
    const [offerParams, setOfferParams] = useState<OfferParameters | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [companyData, setCompanyData] = useState<KRSCompany | null>(null);
    const [financialsData, setFinancialsData] = useState<FinancialData[]>([]);
    const [offerData, setOfferData] = useState<OfferDocumentData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentSection, setCurrentSection] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [editableFields, setEditableFields] = useState<EditableField[]>([]);
    const previewRef = useRef<HTMLDivElement>(null);

    // Extract editable fields from content
    useEffect(() => {
        if (generatedContent) {
            const regex = /\[DO UZUPEŁNIENIA[^\]]*\]/g;
            const matches = [...generatedContent.matchAll(regex)];
            const fields: EditableField[] = matches.map((match, idx) => ({
                id: `field-${idx}`,
                placeholder: match[0],
                value: '',
                context: generatedContent.substring(Math.max(0, match.index! - 50), match.index! + match[0].length + 50),
            }));
            setEditableFields(fields);
        }
    }, [generatedContent]);

    const handleGenerate = useCallback(async () => {
        if (!krsFile) return;

        setIsGenerating(true);
        setGeneratedContent('');
        setError(null);
        setIsComplete(false);
        setProgress(0);
        setCurrentSection('analysis');

        const formData = new FormData();
        formData.append('krs', krsFile);
        if (financialFile) formData.append('financial', financialFile);
        if (offerFile) formData.append('offer', offerFile);
        if (offerParams) formData.append('offerParams', JSON.stringify(offerParams));

        try {
            const response = await fetch('/api/generate-stream', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let buffer = '';
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            if (event.type === 'content') content += event.text || '';
                            if (event.type === 'status') {
                                setCurrentSection(event.section || '');
                                setProgress(event.progress || 0);
                            }
                            if (event.type === 'complete') {
                                setCompanyData(event.company);
                                setFinancialsData(event.financials || []);
                                setOfferData(event.offerData || null);
                                setIsComplete(true);
                                setProgress(100);
                            }
                            if (event.type === 'error') setError(event.message);
                        } catch { /* ignore */ }
                    }
                }
                setGeneratedContent(content);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nieznany błąd');
        } finally {
            setIsGenerating(false);
        }
    }, [krsFile, financialFile, offerFile, offerParams]);

    // Apply edits to content
    const getEditedContent = useCallback(() => {
        let content = generatedContent;
        for (const field of editableFields) {
            if (field.value) {
                content = content.replace(field.placeholder, field.value);
            }
        }
        return content;
    }, [generatedContent, editableFields]);

    const handleDownloadPdf = useCallback(async () => {
        if (!companyData || !generatedContent) return;

        const mergedOfferParams = { ...offerData, ...offerParams };
        const finalContent = getEditedContent();

        setIsDownloading(true);
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: finalContent,
                    company: companyData,
                    financials: financialsData,
                    offerParams: mergedOfferParams,
                }),
            });

            if (!response.ok) throw new Error('PDF generation failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Memorandum_${companyData.nazwa?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Błąd pobierania PDF');
        } finally {
            setIsDownloading(false);
        }
    }, [generatedContent, companyData, financialsData, offerParams, offerData, getEditedContent]);

    const updateField = (id: string, value: string) => {
        setEditableFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Auto-Memorandum</h1>
                <p className="text-white/60">Generator memorandów informacyjnych</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Upload & Controls */}
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                    <div className="space-y-4">
                        <DocumentUploader
                            label="Odpis z KRS"
                            hint="Wgraj odpis aktualny z KRS (PDF)"
                            acceptedTypes={['.pdf']}
                            maxFiles={1}
                            required
                            onFilesChange={(files) => setKrsFile(files[0] || null)}
                        />

                        <DocumentUploader
                            label="Sprawozdanie finansowe"
                            hint="Opcjonalne (PDF/Excel)"
                            acceptedTypes={['.pdf', '.xlsx', '.xls']}
                            maxFiles={1}
                            onFilesChange={(files) => setFinancialFile(files[0] || null)}
                        />

                        <DocumentUploader
                            label="Warunki oferty / Uchwała WZA"
                            hint="Opcjonalne - AI wyciągnie parametry"
                            acceptedTypes={['.pdf']}
                            maxFiles={1}
                            onFilesChange={(files) => setOfferFile(files[0] || null)}
                        />

                        <OfferParametersForm onChange={setOfferParams} />

                        <button
                            onClick={handleGenerate}
                            disabled={!krsFile || isGenerating}
                            className="w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generowanie...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generuj Memorandum
                                </>
                            )}
                        </button>

                        {/* Progress Bar */}
                        {isGenerating && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>{SECTION_NAMES.find(s => s.id === currentSection)?.name || 'Przygotowanie...'}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-pink-500 to-orange-400 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex gap-1">
                                    {SECTION_NAMES.map((section, idx) => (
                                        <div
                                            key={section.id}
                                            className={`flex-1 h-1 rounded-full transition-all ${idx <= SECTION_NAMES.findIndex(s => s.id === currentSection)
                                                    ? 'bg-gradient-to-r from-pink-500 to-orange-400'
                                                    : 'bg-white/10'
                                                }`}
                                            title={section.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {isComplete && (
                            <div className="space-y-3">
                                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <div className="flex-1">
                                        <p className="text-green-300">Memorandum wygenerowane!</p>
                                        {editableFields.length > 0 && (
                                            <p className="text-green-300/70 text-xs mt-1">
                                                {editableFields.filter(f => !f.value).length} pól do uzupełnienia
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Podgląd
                                    </button>
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={isDownloading}
                                        className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                        {isDownloading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-white/40 text-xs">
                        <FileText className="w-4 h-4" />
                        <span>Zgodne z Dz.U. 2020.1053</span>
                    </div>
                </div>

                {/* Right: Preview / Edit */}
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                    {!generatedContent && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <FileText className="w-12 h-12 mb-4" />
                            <p>Wgraj dokumenty i wygeneruj memorandum</p>
                            <p className="text-sm mt-2">Podgląd pojawi się tutaj</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 text-white/60">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Generowanie na żywo...</span>
                            </div>
                            <div
                                ref={previewRef}
                                className="flex-1 overflow-auto bg-white/5 rounded-xl p-4 font-mono text-xs text-white/70 whitespace-pre-wrap"
                                style={{ maxHeight: '500px' }}
                            >
                                {generatedContent || 'Czekam na treść...'}
                            </div>
                        </div>
                    )}

                    {isComplete && !showPreview && (
                        <div className="h-full">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" />
                                Uzupełnij brakujące dane ({editableFields.filter(f => !f.value).length})
                            </h3>

                            {editableFields.length === 0 ? (
                                <div className="text-center text-white/40 py-8">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                    <p>Wszystkie dane zostały uzupełnione!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-auto">
                                    {editableFields.slice(0, 10).map((field) => (
                                        <div key={field.id} className="bg-white/5 rounded-lg p-3">
                                            <p className="text-white/50 text-xs mb-2 line-clamp-2">
                                                ...{field.context.replace(field.placeholder, `**${field.placeholder}**`)}...
                                            </p>
                                            <input
                                                type="text"
                                                placeholder={field.placeholder}
                                                value={field.value}
                                                onChange={(e) => updateField(field.id, e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                                            />
                                        </div>
                                    ))}
                                    {editableFields.length > 10 && (
                                        <p className="text-white/40 text-xs text-center">
                                            +{editableFields.length - 10} więcej pól...
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Full Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-white font-medium">Podgląd memorandum</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <div className="bg-white text-black rounded-lg p-8 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                                {getEditedContent()}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                            >
                                Zamknij
                            </button>
                            <button
                                onClick={() => { setShowPreview(false); handleDownloadPdf(); }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                            >
                                Pobierz PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
