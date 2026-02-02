'use client';

// =============================================
// StochFin — Premium Fintech Landing Page
// =============================================

import { useEffect, useState } from 'react';
import Link from 'next/link';

// =============================================
// Animated Gradient Mesh Background
// =============================================

function GradientMeshBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Deep base */}
            <div className="absolute inset-0 bg-[#06090F]" />

            {/* Gradient orbs */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
                style={{
                    background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
                    top: '-200px',
                    right: '-100px',
                    animation: 'float1 20s ease-in-out infinite'
                }}
            />
            <div
                className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
                style={{
                    background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)',
                    bottom: '-150px',
                    left: '-100px',
                    animation: 'float2 25s ease-in-out infinite'
                }}
            />
            <div
                className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
                style={{
                    background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
                    top: '40%',
                    left: '30%',
                    animation: 'float3 30s ease-in-out infinite'
                }}
            />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Particle constellation */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full opacity-30"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            {/* Styles */}
            <style jsx>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0); }
                    33% { transform: translate(30px, -30px); }
                    66% { transform: translate(-20px, 20px); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0); }
                    33% { transform: translate(-40px, 20px); }
                    66% { transform: translate(30px, -30px); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(50px, 30px); }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.5); }
                }
            `}</style>
        </div>
    );
}

// =============================================
// Feature Pills
// =============================================

function FeaturePill({ icon, label }: { icon: string; label: string }) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 hover:bg-white/10 transition-colors">
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

// =============================================
// Glowing CTA Button
// =============================================

function GlowingButton({
    children,
    href
}: {
    children: React.ReactNode;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="relative group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl text-lg font-semibold text-white overflow-hidden transition-all hover:scale-105"
        >
            {/* Glow effect */}
            <div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 blur-lg opacity-50 group-hover:opacity-75 transition-opacity"
                style={{ transform: 'translateY(50%)' }}
            />

            {/* Content */}
            <span className="relative z-10">{children}</span>
            <span className="relative z-10">→</span>
        </Link>
    );
}

// =============================================
// Main Landing Page
// =============================================

export default function LandingPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen text-white overflow-hidden">
            <GradientMeshBackground />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-8 py-6">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">📊</span>
                    <span className="font-mono text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        StochFin
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/valuation/dcf" className="text-gray-400 hover:text-white transition-colors">
                        Wycena
                    </Link>
                    <Link href="/valuation/health" className="text-gray-400 hover:text-white transition-colors">
                        Health Check
                    </Link>
                    <Link href="/models" className="text-gray-400 hover:text-white transition-colors">
                        Modele
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
                <div
                    className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm mb-8">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        Probabilistyczna wycena DCF
                    </div>

                    {/* Headline */}
                    <h1 className="text-6xl md:text-7xl font-bold font-mono leading-tight mb-6">
                        <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                            Wycena spółek
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            Monte Carlo
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Profesjonalne narzędzie do wyceny metodą DCF z prawdziwymi danymi giełdowymi.
                        10 000 scenariuszy probabilistycznych w sekundach.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col items-center gap-6 mb-16">
                        <GlowingButton href="/valuation/load">
                            Rozpocznij analizę
                        </GlowingButton>

                        <span className="text-sm text-gray-500">
                            Bezpłatne API • Dane z FMP & Alpha Vantage
                        </span>
                    </div>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap justify-center gap-3">
                        <FeaturePill icon="📊" label="Health Check" />
                        <FeaturePill icon="💰" label="DCF Monte Carlo" />
                        <FeaturePill icon="📈" label="Comparables" />
                        <FeaturePill icon="🔥" label="Sensitivity" />
                        <FeaturePill icon="💎" label="Dywidendy" />
                        <FeaturePill icon="🎯" label="Peer Benchmark" />
                    </div>
                </div>

                {/* Stats */}
                <div
                    className={`grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-24 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    <div className="text-center">
                        <div className="text-4xl font-mono font-bold text-emerald-400">10K+</div>
                        <div className="text-gray-500 text-sm mt-1">Symulacji MC</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-mono font-bold text-cyan-400">6</div>
                        <div className="text-gray-500 text-sm mt-1">Modułów analizy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-mono font-bold text-blue-400">Real</div>
                        <div className="text-gray-500 text-sm mt-1">Dane giełdowe</div>
                    </div>
                </div>
            </main>

            {/* Demo Preview (optional - could add screenshot here) */}
            <div className="relative z-10 max-w-5xl mx-auto px-8 pb-20">
                <div
                    className={`bg-[#0A0E17]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-3 h-3 bg-rose-500 rounded-full" />
                        <div className="w-3 h-3 bg-amber-500 rounded-full" />
                        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                        <span className="ml-4 text-gray-500 text-sm font-mono">StochFin — DCF Dashboard</span>
                    </div>

                    {/* Mini mock dashboard */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Revenue', value: '$391.0B', color: 'text-white' },
                            { label: 'DCF Value', value: '$195.4', color: 'text-emerald-400' },
                            { label: 'Market Price', value: '$185.2', color: 'text-gray-400' },
                            { label: 'Upside', value: '+5.5%', color: 'text-emerald-400' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[#111827] rounded-lg p-4">
                                <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                                <div className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Mock histogram */}
                    <div className="h-40 bg-[#111827] rounded-lg flex items-end gap-1 px-8 pb-4">
                        {[15, 25, 40, 60, 80, 100, 85, 65, 45, 30, 20, 12, 8].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 text-center text-gray-600 text-sm">
                <p>StochFin — Premium Fintech Valuation Platform</p>
            </footer>
        </div>
    );
}
