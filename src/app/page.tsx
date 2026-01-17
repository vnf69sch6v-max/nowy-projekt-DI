import StreamingGenerator from '@/components/StreamingGenerator';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 py-12 px-4 transition-colors">
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <StreamingGenerator />
      </div>
    </main>
  );
}
