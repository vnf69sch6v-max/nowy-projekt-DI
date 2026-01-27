'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Sparkles,
    Download,
    AlertCircle,
    Loader2,
    Building2,
    FileSpreadsheet,
    CheckCircle2,
    Brain,
    Shield,
    FileCheck
} from 'lucide-react';
import DocumentUploader from './DocumentUploader';

// Pipeline steps with icons
const PIPELINE_STEPS = [
    { id: 'extracting', label: 'Ekstrakcja dokumentów', icon: FileText },
    { id: 'parsing', label: 'Parsowanie KRS', icon: Building2 },
    { id: 'analyzing', label: 'Analiza finansowa i ryzyk', icon: Brain },
    { id: 'generating', label: 'Generowanie treści', icon: Sparkles },
    { id: 'verifying', label: 'Weryfikacja prawna', icon: Shield },
    { id: 'rendering', label: 'Tworzenie PDF', icon: FileCheck },
];

interface OfferParams {
    seriaAkcji: string;
    liczbaAkcji: string;
    wartoscNominalna: string;
    cenaEmisyjna: string;
    celeEmisji: string;
}

export default function AutonomousMemorandumGenerator() {
    const [krsFile, setKrsFile] = useState<File | null>(null);
    const [financialFile, setFinancialFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        pdfBase64?: string;
        markdownContent?: string;
        company?: { nazwa: string; krs: string };
        sectionsCount?: number;
    } | null>(null);

    const [offerParams, setOfferParams] = useState<OfferParams>({
        seriaAkcji: '',
        liczbaAkcji: '',
        wartoscNominalna: '',
        cenaEmisyjna: '',
        celeEmisji: ''
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleGenerate = async () => {
        if (!krsFile) {
            setError('Proszę dodać odpis z KRS');
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        setCurrentStep('Inicjalizacja...');
        setError(null);
        setResult(null);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                const increment = Math.random() * 5 + 2;
                const newProgress = Math.min(prev + increment, 95);

                // Update current step based on progress
                if (newProgress < 15) setCurrentStep('Ekstrakcja dokumentów PDF...');
                else if (newProgress < 30) setCurrentStep('Parsowanie odpisu KRS...');
                else if (newProgress < 45) setCurrentStep('Analiza danych finansowych...');
                else if (newProgress < 60) setCurrentStep('Generowanie analizy ryzyk...');
                else if (newProgress < 80) setCurrentStep('Generowanie treści memorandum...');
                else if (newProgress < 90) setCurrentStep('Weryfikacja prawna...');
                else setCurrentStep('Tworzenie dokumentu PDF...');

                return newProgress;
            });
        }, 1000);

        try {
            const formData = new FormData();
            formData.append('krsFile', krsFile);
            if (financialFile) {
                formData.append('financialFile', financialFile);
            }
            formData.append('params', JSON.stringify({
                seriaAkcji: offerParams.seriaAkcji || undefined,
                liczbaAkcji: offerParams.liczbaAkcji ? parseInt(offerParams.liczbaAkcji) : undefined,
                wartoscNominalna: offerParams.wartoscNominalna ? parseFloat(offerParams.wartoscNominalna) : undefined,
                cenaEmisyjna: offerParams.cenaEmisyjna ? parseFloat(offerParams.cenaEmisyjna) : undefined,
                celeEmisji: offerParams.celeEmisji || undefined
            }));

            const response = await fetch('/api/generate-autonomous', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            clearInterval(progressInterval);

            if (!data.success) {
                throw new Error(data.errors?.join(', ') || 'Błąd generowania');
            }

            setProgress(100);
            setCurrentStep('Gotowe!');
            setResult({
                pdfBase64: data.pdfBase64,
                markdownContent: data.markdownContent,
                company: data.company,
                sectionsCount: data.sectionsCount
            });

        } catch (err) {
            clearInterval(progressInterval);
            setError(err instanceof Error ? err.message : 'Nieznany błąd');
            setProgress(0);
            setCurrentStep('');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!result?.pdfBase64) return;

        const blob = new Blob(
            [Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0))],
            { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memorandum_${result.company?.krs || 'draft'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getStepStatus = (stepId: string): 'pending' | 'active' | 'complete' => {
        const stepIndex = PIPELINE_STEPS.findIndex(s => s.id === stepId);
        const progressStep = Math.floor((progress / 100) * PIPELINE_STEPS.length);

        if (stepIndex < progressStep) return 'complete';
        if (stepIndex === progressStep && isGenerating) return 'active';
        return 'pending';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                    <Brain className="w-8 h-8 text-purple-400" />
                    Autonomiczne Memorandum
                </h1>
                <p className="text-white/60 mt-2">
                    System AI generuje kompletne memorandum informacyjne na podstawie dokumentów
                </p>
            </div>

            {/* File Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DocumentUploader
                    label="Odpis z KRS"
                    hint="PDF z pełnym odpisem z rejestru"
                    onFilesChange={(files) => setKrsFile(files[0] || null)}
                    required
                />
                <DocumentUploader
                    label="Sprawozdanie finansowe"
                    hint="Opcjonalne - poprawi jakość analizy"
                    onFilesChange={(files) => setFinancialFile(files[0] || null)}
                />
            </div>

            {/* Advanced Options */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-4 py-3 flex items-center justify-between text-white/70 hover:text-white transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Parametry oferty (opcjonalne)
                    </span>
                    <motion.span
                        animate={{ rotate: showAdvanced ? 180 : 0 }}
                        className="text-lg"
                    >
                        ▼
                    </motion.span>
                </button>

                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 grid grid-cols-2 gap-4"
                        >
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Seria akcji</label>
                                <input
                                    type="text"
                                    value={offerParams.seriaAkcji}
                                    onChange={(e) => setOfferParams(p => ({ ...p, seriaAkcji: e.target.value }))}
                                    placeholder="np. B"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Liczba akcji</label>
                                <input
                                    type="number"
                                    value={offerParams.liczbaAkcji}
                                    onChange={(e) => setOfferParams(p => ({ ...p, liczbaAkcji: e.target.value }))}
                                    placeholder="np. 1000000"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Wartość nominalna (PLN)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={offerParams.wartoscNominalna}
                                    onChange={(e) => setOfferParams(p => ({ ...p, wartoscNominalna: e.target.value }))}
                                    placeholder="np. 0.10"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Cena emisyjna (PLN)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={offerParams.cenaEmisyjna}
                                    onChange={(e) => setOfferParams(p => ({ ...p, cenaEmisyjna: e.target.value }))}
                                    placeholder="np. 1.50"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-white/60 mb-1">Cele emisji</label>
                                <textarea
                                    value={offerParams.celeEmisji}
                                    onChange={(e) => setOfferParams(p => ({ ...p, celeEmisji: e.target.value }))}
                                    placeholder="Opisz cele wykorzystania środków z emisji..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 resize-none"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={!krsFile || isGenerating}
                className={`
                    w-full py-4 rounded-xl font-semibold text-lg
                    flex items-center justify-center gap-3
                    transition-all duration-200
                    ${!krsFile || isGenerating
                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25'
                    }
                `}
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

            {/* Progress Section */}
            <AnimatePresence>
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white/5 rounded-xl border border-white/10 p-6"
                    >
                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-white/60">{currentStep}</span>
                                <span className="text-purple-400 font-medium">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>

                        {/* Pipeline Steps */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {PIPELINE_STEPS.map((step) => {
                                const status = getStepStatus(step.id);
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.id}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg
                                            ${status === 'complete' ? 'bg-green-500/10 text-green-400' : ''}
                                            ${status === 'active' ? 'bg-purple-500/20 text-purple-400' : ''}
                                            ${status === 'pending' ? 'bg-white/5 text-white/30' : ''}
                                        `}
                                    >
                                        {status === 'complete' ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : status === 'active' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                        <span className="text-sm truncate">{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium">Błąd generowania</p>
                            <p className="text-red-300/70 text-sm mt-1">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result Section */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-green-500/10 border border-green-500/30 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <div>
                                <p className="text-green-400 font-semibold">Memorandum wygenerowane!</p>
                                {result.company && (
                                    <p className="text-green-300/70 text-sm">
                                        {result.company.nazwa} (KRS: {result.company.krs})
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                            <span>📄 {result.sectionsCount} sekcji</span>
                        </div>

                        <div className="flex gap-3">
                            {result.pdfBase64 && (
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Pobierz PDF
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
