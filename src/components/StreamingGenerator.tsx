'use client';

import { useState, useCallback } from 'react';
import DocumentUploader from './DocumentUploader';
import OfferParametersForm, { OfferParameters } from './OfferParametersForm';
import { Sparkles, Download, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { KRSCompany, FinancialData } from '@/types';

export default function MemorandumGenerator() {
    const [krsFile, setKrsFile] = useState<File | null>(null);
    const [financialFile, setFinancialFile] = useState<File | null>(null);
    const [offerParams, setOfferParams] = useState<OfferParameters | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [companyData, setCompanyData] = useState<KRSCompany | null>(null);
    const [financialsData, setFinancialsData] = useState<FinancialData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleGenerate = useCallback(async () => {
        if (!krsFile) return;

        setIsGenerating(true);
        setGeneratedContent('');
        setError(null);
        setIsComplete(false);

        const formData = new FormData();
        formData.append('krs', krsFile);
        if (financialFile) {
            formData.append('financial', financialFile);
        }
        if (offerParams) {
            formData.append('offerParams', JSON.stringify(offerParams));
        }

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
                            if (event.type === 'complete') {
                                setCompanyData(event.company);
                                setFinancialsData(event.financials || []);
                                setIsComplete(true);
                            }
                            if (event.type === 'error') setError(event.message);
                        } catch { /* ignore */ }
                    }
                }
            }
            setGeneratedContent(content);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nieznany błąd');
        } finally {
            setIsGenerating(false);
        }
    }, [krsFile, financialFile, offerParams]);

    const handleDownloadPdf = useCallback(async () => {
        if (!companyData || !generatedContent) return;

        setIsDownloading(true);
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: generatedContent,
                    company: companyData,
                    financials: financialsData,
                    offerParams: offerParams,
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
    }, [generatedContent, companyData, financialsData, offerParams]);

    return (
        <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Auto-Memorandum</h1>
                <p className="text-white/60">Generator memorandów informacyjnych</p>
            </div>

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
                                <p className="text-green-300">Memorandum wygenerowane!</p>
                            </div>

                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generowanie PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        Pobierz Profesjonalny PDF
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-white/40 text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Zgodne z Dz.U. 2020.1053 • Firebase Gemini 2.0</span>
                </div>
            </div>
        </div>
    );
}
