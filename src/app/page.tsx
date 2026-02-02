'use client';

// =============================================
// StochFin Main Dashboard (Premium Design)
// =============================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { FanChart } from '@/components/charts/FanChart';
import { CorrelationHeatmap } from '@/components/charts/HeatMap';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Activity,
  Zap,
  Target,
  Calculator,
  Clock,
  CheckCircle2,
  Loader2,
  Plus,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface SimulationSummary {
  id: string;
  model_name: string;
  status: string;
  n_simulations: number;
  created_at: string;
  compute_time_seconds: number | null;
}

interface ModelSummary {
  id: string;
  name: string;
  entity_name?: string;
  variable_count: number;
  created_at: string;
}

// Demo data
const DEMO_FAN_CHART_DATA = [
  { date: '2026-01', p10: 850000, p25: 920000, p50: 1000000, p75: 1080000, p90: 1150000 },
  { date: '2026-04', p10: 820000, p25: 900000, p50: 1020000, p75: 1100000, p90: 1200000 },
  { date: '2026-07', p10: 780000, p25: 880000, p50: 1050000, p75: 1150000, p90: 1280000 },
  { date: '2027-01', p10: 700000, p25: 850000, p50: 1100000, p75: 1250000, p90: 1400000 },
  { date: '2027-07', p10: 600000, p25: 800000, p50: 1150000, p75: 1350000, p90: 1550000 },
  { date: '2028-01', p10: 500000, p25: 750000, p50: 1200000, p75: 1450000, p90: 1700000 },
];

const DEMO_CORRELATION_VARS = ['REV', 'COGS', 'OPEX', 'INT', 'GDP'];
const DEMO_CORRELATION_MATRIX = [
  [1.00, 0.85, 0.40, 0.10, 0.65],
  [0.85, 1.00, 0.30, 0.05, 0.55],
  [0.40, 0.30, 1.00, 0.15, 0.25],
  [0.10, 0.05, 0.15, 1.00, -0.20],
  [0.65, 0.55, 0.25, -0.20, 1.00],
];

export default function StochFinDashboard() {
  const [recentSimulations, setRecentSimulations] = useState<SimulationSummary[]>([]);
  const [recentModels, setRecentModels] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ simulations: 0, models: 0, variables: 0 });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch simulations
        const simRes = await fetch('/api/simulations?limit=5');
        const simJson = await simRes.json();
        if (simJson.data) {
          setRecentSimulations(simJson.data.slice(0, 5));
          setStats(prev => ({ ...prev, simulations: simJson.data.length }));
        }

        // Fetch models
        const modRes = await fetch('/api/models?limit=5');
        const modJson = await modRes.json();
        if (modJson.data) {
          setRecentModels(modJson.data.slice(0, 5));
          setStats(prev => ({ ...prev, models: modJson.data.length }));
        }
      } catch {
        console.error('Error fetching dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--surface-0))] text-[hsl(var(--text-primary))]">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[hsl(var(--surface-0)/0.8)] border-b border-[hsl(var(--border-subtle))]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                StochFin
              </h1>
              <p className="text-xs text-[hsl(var(--text-muted))]">
                Probabilistic Financial Modeling
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 p-1 bg-[hsl(var(--surface-1))] rounded-xl">
            {[
              { href: '/', label: 'Dashboard', active: true },
              { href: '/valuation/load', label: 'Wycena' },
              { href: '/models', label: 'Modele' },
              { href: '/simulations', label: 'Symulacje' },
              { href: '/events', label: 'EventProb' },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <button className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                  item.active
                    ? 'bg-[hsl(var(--accent-primary))] text-white shadow-lg shadow-[hsl(var(--accent-primary))]/25'
                    : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
                )}>
                  {item.label}
                </button>
              </Link>
            ))}
          </nav>

          <Link href="/models/new">
            <Button
              className="bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90 shadow-lg shadow-[hsl(var(--accent-primary))]/25"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nowy model
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Modele',
              value: stats.models,
              icon: <Calculator className="w-5 h-5" />,
              color: 'blue',
              href: '/models'
            },
            {
              label: 'Symulacje',
              value: stats.simulations,
              icon: <Activity className="w-5 h-5" />,
              color: 'violet',
              href: '/simulations'
            },
            {
              label: 'Zmienne stochastyczne',
              value: '4',
              icon: <Zap className="w-5 h-5" />,
              color: 'emerald',
              suffix: 'procesów'
            },
            {
              label: 'Dokładność',
              value: '99.2%',
              icon: <Target className="w-5 h-5" />,
              color: 'amber',
              change: '+2.4%'
            },
          ].map((stat, index) => (
            <div
              key={index}
              className={cn(
                'relative overflow-hidden rounded-2xl p-5 border transition-all hover:scale-[1.02] group cursor-pointer',
                'bg-gradient-to-br',
                stat.color === 'blue' && 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40',
                stat.color === 'violet' && 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
                stat.color === 'emerald' && 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
                stat.color === 'amber' && 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                stat.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                stat.color === 'violet' && 'bg-violet-500/20 text-violet-400',
                stat.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                stat.color === 'amber' && 'bg-amber-500/20 text-amber-400'
              )}>
                {stat.icon}
              </div>
              <p className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-medium">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                {stat.suffix && (
                  <span className="text-sm text-[hsl(var(--text-muted))]">{stat.suffix}</span>
                )}
                {stat.change && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </span>
                )}
              </div>
              {stat.href && (
                <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-[hsl(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fan Chart */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle>Projekcja Cash Flow</CardTitle>
                  <p className="text-sm text-[hsl(var(--text-muted))]">Monte Carlo 10,000 ścieżek</p>
                </div>
              </div>
              <RiskBadge level="medium" label="P(CF<0) = 12%" showIcon={false} size="sm" />
            </CardHeader>
            <CardContent className="pt-4">
              <FanChart data={DEMO_FAN_CHART_DATA} unit="PLN" height={320} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card className="overflow-hidden bg-gradient-to-br from-[hsl(var(--accent-primary))]/10 to-violet-500/10 border-[hsl(var(--accent-primary))]/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--accent-primary))] to-violet-500 flex items-center justify-center shadow-lg shadow-[hsl(var(--accent-primary))]/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Szybka symulacja</h3>
                    <p className="text-xs text-[hsl(var(--text-muted))]">AI znajdzie optymalne parametry</p>
                  </div>
                </div>
                <Link href="/models/new">
                  <Button className="w-full bg-gradient-to-r from-[hsl(var(--accent-primary))] to-violet-500 hover:opacity-90" leftIcon={<Play className="w-4 h-4" />}>
                    Rozpocznij
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Valuation CTA */}
            <Card className="overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Wycena spółki</h3>
                    <p className="text-xs text-[hsl(var(--text-muted))]">DCF, Football Field, Risk</p>
                  </div>
                </div>
                <Link href="/valuation/load">
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90" leftIcon={<BarChart3 className="w-4 h-4" />}>
                    Otwórz Wycenę
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Correlation Matrix */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Macierz korelacji</CardTitle>
              </CardHeader>
              <CardContent>
                <CorrelationHeatmap variables={DEMO_CORRELATION_VARS} matrix={DEMO_CORRELATION_MATRIX} cellSize={36} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Models */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-blue-400" />
                </div>
                <CardTitle>Ostatnie modele</CardTitle>
              </div>
              <Link href="/models">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Wszystkie
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent-primary))]" />
                </div>
              ) : recentModels.length > 0 ? (
                <div className="divide-y divide-[hsl(var(--border-subtle))]">
                  {recentModels.map((model) => (
                    <Link key={model.id} href={`/models/${model.id}`}>
                      <div className="px-5 py-4 hover:bg-[hsl(var(--surface-1))] transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium group-hover:text-[hsl(var(--accent-primary))] transition-colors">
                              {model.name}
                            </p>
                            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                              {model.variable_count || 0} zmiennych
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[hsl(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calculator className="w-10 h-10 text-[hsl(var(--text-muted))] mb-3" />
                  <p className="text-[hsl(var(--text-muted))]">Brak modeli</p>
                  <Link href="/models/new" className="mt-2">
                    <Button variant="secondary" size="sm">
                      Utwórz pierwszy model
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Simulations */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[hsl(var(--border-subtle))]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-400" />
                </div>
                <CardTitle>Ostatnie symulacje</CardTitle>
              </div>
              <Link href="/simulations">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Wszystkie
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent-primary))]" />
                </div>
              ) : recentSimulations.length > 0 ? (
                <div className="divide-y divide-[hsl(var(--border-subtle))]">
                  {recentSimulations.map((sim) => (
                    <Link key={sim.id} href={`/simulations/${sim.id}`}>
                      <div className="px-5 py-4 hover:bg-[hsl(var(--surface-1))] transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center',
                              sim.status === 'completed' && 'bg-emerald-500/20',
                              sim.status === 'pending' && 'bg-amber-500/20',
                              sim.status === 'running' && 'bg-blue-500/20',
                              sim.status === 'failed' && 'bg-red-500/20'
                            )}>
                              {sim.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              {sim.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                              {sim.status === 'running' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                              {sim.status === 'failed' && <TrendingDown className="w-4 h-4 text-red-400" />}
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-[hsl(var(--accent-primary))] transition-colors">
                                {sim.model_name || `Symulacja ${sim.id.slice(0, 8)}`}
                              </p>
                              <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                                {formatNumber(sim.n_simulations, { compact: true })} iteracji
                                {sim.compute_time_seconds && ` • ${sim.compute_time_seconds}s`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              'text-xs font-medium px-2 py-1 rounded-full',
                              sim.status === 'completed' && 'bg-emerald-500/15 text-emerald-400',
                              sim.status === 'pending' && 'bg-amber-500/15 text-amber-400',
                              sim.status === 'running' && 'bg-blue-500/15 text-blue-400',
                              sim.status === 'failed' && 'bg-red-500/15 text-red-400'
                            )}>
                              {sim.status === 'completed' && 'Ukończona'}
                              {sim.status === 'pending' && 'Oczekująca'}
                              {sim.status === 'running' && 'W toku'}
                              {sim.status === 'failed' && 'Błąd'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-10 h-10 text-[hsl(var(--text-muted))] mb-3" />
                  <p className="text-[hsl(var(--text-muted))]">Brak symulacji</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border-subtle))] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[hsl(var(--text-muted))]">
                StochFin Engine v1.0
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-[hsl(var(--text-muted))]">
              <span>Monte Carlo • GBM • Ornstein-Uhlenbeck • Cholesky</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
