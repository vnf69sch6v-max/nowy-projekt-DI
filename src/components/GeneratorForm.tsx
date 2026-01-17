'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, AlertCircle, Loader2, Building2, Search, Sparkles } from 'lucide-react';

export function GeneratorForm() {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [progress, setProgress] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const cleanId = identifier.replace(/\D/g, '');

        if (cleanId.length < 9) {
            setError('Wprowadź prawidłowy numer NIP (10 cyfr) lub KRS (10 cyfr)');
            setLoading(false);
            return;
        }

        try {
            setProgress('Pobieranie danych z KRS...');
            await new Promise(r => setTimeout(r, 500));

            setProgress('Analiza finansowa AI...');

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [cleanId.length === 10 ? 'nip' : 'krs']: cleanId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Błąd generowania dokumentu');
            }

            setProgress('Generowanie dokumentu Word...');

            // Pobierz plik
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            const filename = filenameMatch?.[1] || `Memorandum_${cleanId}.docx`;

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSuccess(true);
            setProgress('');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl mx-auto"
        >
            <form onSubmit={handleSubmit} className="relative">
                {/* Glassmorphism card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                    {/* Content */}
                    <div className="relative p-8 md:p-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4"
                            >
                                <FileText className="w-8 h-8 text-white" />
                            </motion.div>

                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                Generator Memorandum
                            </h2>
                            <p className="text-slate-400 text-sm md:text-base">
                                Automatyczna analiza spółki i generowanie dokumentu ofertowego
                            </p>
                        </div>

                        {/* Input */}
                        <div className="relative mb-6">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Building2 className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => {
                                    setIdentifier(e.target.value);
                                    setError(null);
                                    setSuccess(false);
                                }}
                                placeholder="Wprowadź NIP lub KRS spółki..."
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-lg"
                                disabled={loading}
                            />
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Success message */}
                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3"
                                >
                                    <Download className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-emerald-300 text-sm font-medium">Dokument wygenerowany!</p>
                                        <p className="text-emerald-400/70 text-xs mt-1">Pobieranie powinno rozpocząć się automatycznie.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Progress */}
                        <AnimatePresence>
                            {loading && progress && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-4 flex items-center gap-3 text-blue-300"
                                >
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">{progress}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit button */}
                        <motion.button
                            type="submit"
                            disabled={loading || !identifier.trim()}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25"
                        >
                            {loading ? (
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
                        </motion.button>

                        {/* Features */}
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                {[
                                    { icon: Search, label: 'Dane KRS' },
                                    { icon: Sparkles, label: 'Analiza AI' },
                                    { icon: FileText, label: 'Dokument Word' },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <span className="text-xs text-slate-500">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Example NIP hint */}
            <p className="text-center text-slate-500 text-xs mt-6">
                Przykładowe NIP-y: 5213534885 (Allegro), 5260300291 (PKN Orlen), 5272526848 (CD Projekt)
            </p>
        </motion.div>
    );
}
