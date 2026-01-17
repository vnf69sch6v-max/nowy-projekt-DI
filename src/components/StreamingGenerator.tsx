'use client';

import { useState, useCallback } from 'react';
import DocumentUploader from './DocumentUploader';
import { Sparkles, Download, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';

export default function MemorandumGenerator() {
    const [krsFile, setKrsFile] = useState<File | null>(null);
    const [financialFile, setFinancialFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

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
                                setCompanyName(event.companyName);
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
    }, [krsFile, financialFile]);

    const handleDownloadPdf = useCallback(async () => {
        const { generateMemorandumPDF } = await import('@/lib/documents/pdf-generator');
        const pdfBytes = await generateMemorandumPDF(generatedContent, companyName || 'Spółka');
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Memorandum_${companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    }, [generatedContent, companyName]);

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
                        onFilesChange={(files) => setKrsFile(files[0] || null)}
                        required
                    />

                    <DocumentUploader
                        label="Sprawozdanie finansowe"
                        hint="Opcjonalne (PDF/Excel)"
                        acceptedTypes={['.pdf', '.xlsx', '.xls']}
                        maxFiles={1}
                        onFilesChange={(files) => setFinancialFile(files[0] || null)}
                    />
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleGenerate}
                        disabled={!krsFile || isGenerating}
                        className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generuję...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generuj Memorandum
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {isComplete && (
                    <div className="mt-4 space-y-3">
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            <span>Memorandum wygenerowane!</span>
                        </div>

                        <button
                            onClick={handleDownloadPdf}
                            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Pobierz PDF
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-6 text-center text-xs text-white/40">
                Zgodne z Dz.U. 2020.1053 • Gemini 2.0 Flash
            </p>
        </div>
    );
}
