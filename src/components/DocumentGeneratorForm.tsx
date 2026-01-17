'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Sparkles, Download, AlertCircle, Loader2, Building2, FileSpreadsheet, Upload } from 'lucide-react';
import DocumentUploader from './DocumentUploader';

type GenerationStep = 'idle' | 'analyzing-krs' | 'analyzing-financial' | 'generating-sections' | 'creating-document' | 'complete' | 'error';

const stepMessages: Record<GenerationStep, string> = {
    'idle': '',
    'analyzing-krs': 'Analizuję odpis z KRS...',
    'analyzing-financial': 'Ekstraktuję dane finansowe...',
    'generating-sections': 'Generuję sekcje memorandum...',
    'creating-document': 'Tworzę dokument Word...',
    'complete': 'Gotowe!',
    'error': 'Wystąpił błąd',
};

export default function DocumentGeneratorForm() {
    const [krsFiles, setKrsFiles] = useState<File[]>([]);
    const [financialFiles, setFinancialFiles] = useState<File[]>([]);
    const [step, setStep] = useState<GenerationStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const handleGenerate = useCallback(async () => {
        if (krsFiles.length === 0) {
            setError('Wgraj odpis z KRS');
            return;
        }

        setError(null);
        setStep('analyzing-krs');
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('krs', krsFiles[0]);
            if (financialFiles.length > 0) {
                formData.append('financial', financialFiles[0]);
            }

            // Symuluj progress
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    const nextStep = prev + 10;
                    if (nextStep >= 20 && step === 'analyzing-krs') setStep('analyzing-financial');
                    if (nextStep >= 40) setStep('generating-sections');
                    if (nextStep >= 70) setStep('creating-document');
                    return nextStep;
                });
            }, 1500);

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Błąd generowania');
            }

            // Pobierz plik
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            const filename = filenameMatch?.[1] || 'Memorandum.docx';

            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setProgress(100);
            setStep('complete');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nieznany błąd');
            setStep('error');
        }
    }, [krsFiles, financialFiles, step]);

    const isProcessing = step !== 'idle' && step !== 'complete' && step !== 'error';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                >
                    <FileText className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Generator Memorandum</h1>
                <p className="text-white/60">Wgraj dokumenty spółki, AI wygeneruje memorandum informacyjne</p>
            </div>

            {/* Form Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">

                {/* KRS Upload */}
                <DocumentUploader
                    label="Odpis z KRS"
                    hint="Pełny odpis aktualny lub informacja odpowiadająca odpisowi"
                    acceptedTypes={['.pdf']}
                    maxFiles={1}
                    required
                    onFilesChange={setKrsFiles}
                />

                {/* Financial Upload */}
                <DocumentUploader
                    label="Sprawozdanie finansowe"
                    hint="Bilans i rachunek zysków i strat (opcjonalne)"
                    acceptedTypes={['.pdf', '.xlsx', '.xls']}
                    maxFiles={1}
                    onFilesChange={setFinancialFiles}
                />

                {/* Info boxes */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <Building2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-white/90">Dane z KRS</p>
                            <p className="text-xs text-white/50">AI wyekstrahuje wszystkie dane rejestrowe</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-pink-500/10 rounded-xl border border-pink-500/20">
                        <FileSpreadsheet className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-white/90">Analiza finansowa</p>
                            <p className="text-xs text-white/50">Wskaźniki i czynniki ryzyka</p>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/70 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {stepMessages[step]}
                                </span>
                                <span className="text-white/50">{progress}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                        >
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-300">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success message */}
                <AnimatePresence>
                    {step === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                        >
                            <Download className="w-5 h-5 text-green-400" />
                            <p className="text-sm text-green-300">Memorandum zostało pobrane!</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Generate button */}
                <motion.button
                    onClick={handleGenerate}
                    disabled={isProcessing || krsFiles.length === 0}
                    className={`
            w-full py-4 px-6 rounded-xl font-medium text-white
            flex items-center justify-center gap-2
            transition-all duration-200
            ${isProcessing || krsFiles.length === 0
                            ? 'bg-white/10 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25'
                        }
          `}
                    whileHover={!isProcessing && krsFiles.length > 0 ? { scale: 1.02 } : {}}
                    whileTap={!isProcessing && krsFiles.length > 0 ? { scale: 0.98 } : {}}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generowanie...
                        </>
                    ) : step === 'complete' ? (
                        <>
                            <Download className="w-5 h-5" />
                            Wygeneruj ponownie
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Analizuj i Generuj Memorandum
                        </>
                    )}
                </motion.button>

                {/* Regulation reference */}
                <p className="text-center text-xs text-white/30">
                    Struktura zgodna z rozporządzeniem Dz.U. 2020.1053 (§7-§17)
                </p>
            </div>
        </motion.div>
    );
}
