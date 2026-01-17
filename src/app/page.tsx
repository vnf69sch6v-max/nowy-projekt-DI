import { GeneratorForm } from '@/components/GeneratorForm';
import { FileText, Shield, Zap, Brain, ArrowRight, Github } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Auto-Memorandum</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm">
                Funkcje
              </a>
              <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">
                Jak to działa
              </a>
              <a
                href="https://github.com/vnf69sch6v-max/nowy-projekt-DI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background decorations */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Powered by Gemini AI
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Generuj <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Memorandum</span>
              <br />w kilka sekund
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Automatyczna analiza danych z KRS, sprawozdań finansowych oraz czynników ryzyka.
              Wygeneruj profesjonalny dokument ofertowy jednym kliknięciem.
            </p>
          </div>

          {/* Generator Form */}
          <GeneratorForm />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Dlaczego Auto-Memorandum?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Kompleksowe rozwiązanie LegalTech łączące dane publiczne z analizą AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FileText,
                title: 'Dane z KRS',
                description: 'Automatyczne pobieranie danych rejestrowych z publicznego API Ministerstwa Sprawiedliwości.',
              },
              {
                icon: Brain,
                title: 'Analiza AI',
                description: 'Gemini Flash 2.0 analizuje dane finansowe i generuje sekcję czynników ryzyka.',
              },
              {
                icon: Zap,
                title: 'Błyskawiczna generacja',
                description: 'Gotowy dokument Word w kilka sekund zamiast godzin ręcznej pracy.',
              },
              {
                icon: Shield,
                title: 'Zgodność prawna',
                description: 'Struktura dokumentu zgodna z wymogami polskiego prawa rynków kapitałowych.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass-card p-6 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Jak to działa?
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {[
              { step: '1', title: 'Podaj NIP/KRS', desc: 'Wprowadź numer identyfikacyjny spółki' },
              { step: '2', title: 'Pobieranie danych', desc: 'System pobiera dane z KRS i generuje finanse' },
              { step: '3', title: 'Analiza AI', desc: 'Gemini analizuje ryzyka i tworzy podsumowanie' },
              { step: '4', title: 'Pobierz dokument', desc: 'Otrzymujesz gotowy plik .docx' },
            ].map(({ step, title, desc }, index) => (
              <div key={step} className="flex items-center gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-3">
                    {step}
                  </div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm max-w-[150px]">{desc}</p>
                </div>
                {index < 3 && (
                  <ArrowRight className="w-6 h-6 text-slate-600 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-400 text-sm">Auto-Memorandum © 2026</span>
          </div>

          <p className="text-slate-500 text-xs text-center sm:text-right max-w-md">
            Dokument ma charakter informacyjny. Przed podjęciem decyzji inwestycyjnych
            zaleca się konsultację z doradcą prawnym i finansowym.
          </p>
        </div>
      </footer>
    </div>
  );
}
