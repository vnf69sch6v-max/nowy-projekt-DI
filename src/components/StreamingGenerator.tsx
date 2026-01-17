'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentUploader from './DocumentUploader';
import {
    Sparkles,
    FileText,
    Download,
    Loader2,
    CheckCircle,
    AlertCircle,
    BookOpen,
    BarChart3,
    Users,
    Building,
    FileSpreadsheet,
    Paperclip
} from 'lucide-react';

interface StreamEvent {
    type: 'status' | 'content' | 'complete' | 'error';
    section?: string;
    message?: string;
    text?: string;
    progress?: number;
    companyName?: string;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
    analysis: <FileText className="w-4 h-4" />,
    header: <BookOpen className="w-4 h-4" />,
    toc: <FileText className="w-4 h-4" />,
    intro: <BookOpen className="w-4 h-4" />,
    risks: <AlertCircle className="w-4 h-4" />,
    responsible: <Users className="w-4 h-4" />,
    offer: <BarChart3 className="w-4 h-4" />,
    issuer: <Building className="w-4 h-4" />,
    financial: <FileSpreadsheet className="w-4 h-4" />,
    attachments: <Paperclip className="w-4 h-4" />,
    footer: <CheckCircle className="w-4 h-4" />,
};

export default function StreamingGenerator() {
    const [krsFile, setKrsFile] = useState<File | null>(null);
    const [financialFile, setFinancialFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [currentSection, setCurrentSection] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [companyName, setCompanyName] = useState<string | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (contentRef.current && isGenerating) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [generatedContent, isGenerating]);

    const handleGenerate = useCallback(async () => {
        if (!krsFile) return;

        setIsGenerating(true);
        setGeneratedContent('');
        setCurrentSection('');
        setProgress(0);
        setError(null);
        setIsComplete(false);

        const formData = new FormData();
        formData.append('krs', krsFile);
        if (financialFile) {
            formData.append('financial', financialFile);
        }

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/generate-stream', {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event: StreamEvent = JSON.parse(line.slice(6));

                            switch (event.type) {
                                case 'status':
                                    setCurrentSection(event.section || '');
                                    if (event.progress) setProgress(event.progress);
                                    break;
                                case 'content':
                                    if (event.text) {
                                        setGeneratedContent(prev => prev + event.text);
                                    }
                                    break;
                                case 'complete':
                                    setIsComplete(true);
                                    setCompanyName(event.companyName || null);
                                    break;
                                case 'error':
                                    setError(event.message || 'Nieznany błąd');
                                    break;
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError(err.message);
            }
        } finally {
            setIsGenerating(false);
        }
    }, [krsFile, financialFile]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([generatedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Memorandum_${companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }, [generatedContent, companyName]);

    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsGenerating(false);
    }, []);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Auto-Memorandum
                    <span className="text-purple-400"> Streaming</span>
                </h1>
                <p className="text-white/60">
                    Obserwuj generowanie memorandum w czasie rzeczywistym
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left panel - Upload */}
                <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Dokumenty</h2>

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
                                hint="Opcjonalne - bilans i rachunek zysków (PDF/Excel)"
                                acceptedTypes={['.pdf', '.xlsx', '.xls']}
                                maxFiles={1}
                                onFilesChange={(files) => setFinancialFile(files[0] || null)}
                            />
                        </div>

                        {/* Generate button */}
                        <div className="mt-6">
                            {isGenerating ? (
                                <button
                                    onClick={handleStop}
                                    className="w-full py-3 px-6 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                                >
                                    Zatrzymaj generowanie
                                </button>
                            ) : (
                                <button
                                    onClick={handleGenerate}
                                    disabled={!krsFile}
                                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Generuj Memorandum
                                </button>
                            )}
                        </div>

                        {/* Progress */}
                        <AnimatePresence>
                            {(isGenerating || isComplete) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {isGenerating ? (
                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                        )}
                                        <span className="text-sm text-white/70">
                                            {isComplete ? 'Zakończono!' : currentSection}
                                        </span>
                                    </div>

                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between mt-2 text-xs text-white/50">
                                        <span>
                                            {SECTION_ICONS[currentSection]}
                                        </span>
                                        <span>{progress}%</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Download button */}
                        {isComplete && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleDownload}
                                className="w-full mt-4 py-3 px-6 bg-green-500/20 border border-green-500/50 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Pobierz dokument (.txt)
                            </motion.button>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Right panel - Live preview */}
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">Podgląd na żywo</span>
                        </div>
                        {isGenerating && (
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-xs text-green-400">Generowanie...</span>
                            </div>
                        )}
                    </div>

                    <div
                        ref={contentRef}
                        className="h-[600px] overflow-y-auto p-4 font-mono text-xs text-white/80 whitespace-pre-wrap"
                        style={{ lineHeight: 1.6 }}
                    >
                        {generatedContent || (
                            <div className="flex items-center justify-center h-full text-white/30">
                                Tu pojawi się generowane memorandum...
                            </div>
                        )}
                        {isGenerating && (
                            <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse" />
                        )}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 text-center text-xs text-white/40">
                <p>Struktura zgodna z rozporządzeniem Dz.U. 2020.1053 (§7-§17)</p>
                <p className="mt-1">Claude Sonnet 4 • Streaming • Real-time</p>
            </div>
        </div>
    );
}
