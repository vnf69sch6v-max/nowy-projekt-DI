import DocumentGeneratorForm from '@/components/DocumentGeneratorForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12 px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <DocumentGeneratorForm />

        {/* Features */}
        <div className="max-w-2xl mx-auto mt-12 grid grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm text-white/60">Wgraj odpis KRS</p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl mb-2">🤖</div>
            <p className="text-sm text-white/60">AI analizuje dokumenty</p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl mb-2">📝</div>
            <p className="text-sm text-white/60">Pobierz memorandum</p>
          </div>
        </div>

        {/* Regulation info */}
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-sm font-medium text-white/80 mb-3">Struktura zgodna z rozporządzeniem (Dz.U. 2020.1053)</h3>
          <ul className="text-xs text-white/50 space-y-1.5">
            <li>§7 → Wstęp</li>
            <li>§9 → Czynniki ryzyka</li>
            <li>§10 → Osoby odpowiedzialne</li>
            <li>§11-12 → Dane o emisji lub sprzedaży</li>
            <li>§13-14 → Dane o emitencie</li>
            <li>§15 → Sprawozdania finansowe</li>
            <li>§16 → Załączniki</li>
          </ul>
        </div>

        {/* Footer */}
        <footer className="max-w-2xl mx-auto mt-12 text-center text-xs text-white/30">
          <p>Auto-Memorandum • Powered by Gemini AI</p>
          <p className="mt-1">Dokument generowany automatycznie. Zalecana weryfikacja przez radcę prawnego.</p>
        </footer>
      </div>
    </main>
  );
}
