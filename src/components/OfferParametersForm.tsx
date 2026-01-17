'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';

export interface OfferParameters {
    seriaAkcji: string;
    liczbaAkcji: number | null;
    wartoscNominalna: number | null;
    cenaEmisyjna: number | null;
    celeEmisji: string;
    terminSubskrypcji: string;
    miejsceZapisow: string;
    minimalnaLiczbaAkcji: number | null;
    firmaInwestycyjna: string;
    dataWaznosci: string;
}

interface Props {
    onChange: (params: OfferParameters) => void;
}

export default function OfferParametersForm({ onChange }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [params, setParams] = useState<OfferParameters>({
        seriaAkcji: '',
        liczbaAkcji: null,
        wartoscNominalna: null,
        cenaEmisyjna: null,
        celeEmisji: '',
        terminSubskrypcji: '',
        miejsceZapisow: '',
        minimalnaLiczbaAkcji: null,
        firmaInwestycyjna: '',
        dataWaznosci: '',
    });

    const handleChange = (field: keyof OfferParameters, value: string | number | null) => {
        const newParams = { ...params, [field]: value };
        setParams(newParams);
        onChange(newParams);
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-pink-400" />
                    <span className="text-white/80 font-medium">Parametry oferty (opcjonalne)</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                    <p className="text-white/50 text-xs mb-3">
                        Uzupełnij te pola aby AI wstawiło konkretne dane zamiast [DO UZUPEŁNIENIA]
                    </p>

                    {/* Seria i liczba akcji */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Seria akcji</label>
                            <input
                                type="text"
                                placeholder="np. B, C, D"
                                value={params.seriaAkcji}
                                onChange={(e) => handleChange('seriaAkcji', e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Liczba akcji</label>
                            <input
                                type="number"
                                placeholder="np. 100000"
                                value={params.liczbaAkcji || ''}
                                onChange={(e) => handleChange('liczbaAkcji', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                    </div>

                    {/* Wartość nominalna i cena emisyjna */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Wartość nominalna (PLN)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="np. 0.10"
                                value={params.wartoscNominalna || ''}
                                onChange={(e) => handleChange('wartoscNominalna', e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Cena emisyjna (PLN)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="np. 5.00"
                                value={params.cenaEmisyjna || ''}
                                onChange={(e) => handleChange('cenaEmisyjna', e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                    </div>

                    {/* Cele emisji */}
                    <div>
                        <label className="text-white/60 text-xs mb-1 block">Cele emisji</label>
                        <textarea
                            placeholder="np. Rozwój działalności operacyjnej, inwestycje w infrastrukturę IT, kapitał obrotowy"
                            value={params.celeEmisji}
                            onChange={(e) => handleChange('celeEmisji', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
                        />
                    </div>

                    {/* Termin i miejsce */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Termin subskrypcji</label>
                            <input
                                type="text"
                                placeholder="np. 01.02.2026 - 28.02.2026"
                                value={params.terminSubskrypcji}
                                onChange={(e) => handleChange('terminSubskrypcji', e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs mb-1 block">Minimalna liczba akcji</label>
                            <input
                                type="number"
                                placeholder="np. 100"
                                value={params.minimalnaLiczbaAkcji || ''}
                                onChange={(e) => handleChange('minimalnaLiczbaAkcji', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                            />
                        </div>
                    </div>

                    {/* Miejsce zapisów */}
                    <div>
                        <label className="text-white/60 text-xs mb-1 block">Miejsce składania zapisów</label>
                        <input
                            type="text"
                            placeholder="np. Siedziba Spółki, ul. Piotrkowska 295/7, Łódź"
                            value={params.miejsceZapisow}
                            onChange={(e) => handleChange('miejsceZapisow', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                        />
                    </div>

                    {/* Firma inwestycyjna */}
                    <div>
                        <label className="text-white/60 text-xs mb-1 block">Firma inwestycyjna (jeśli dotyczy)</label>
                        <input
                            type="text"
                            placeholder="np. Dom Maklerski XYZ S.A."
                            value={params.firmaInwestycyjna}
                            onChange={(e) => handleChange('firmaInwestycyjna', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                        />
                    </div>

                    {/* Data ważności */}
                    <div>
                        <label className="text-white/60 text-xs mb-1 block">Data ważności memorandum</label>
                        <input
                            type="date"
                            value={params.dataWaznosci}
                            onChange={(e) => handleChange('dataWaznosci', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500/50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
