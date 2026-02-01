'use client';

// =============================================
// StochFin: App Layout with Navigation
// =============================================

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Home,
    FolderOpen,
    Settings,
    PlayCircle,
    History,
    Bell,
    User,
    ChevronDown
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/models', label: 'Modele', icon: FolderOpen },
    { href: '/simulations', label: 'Symulacje', icon: PlayCircle },
    { href: '/backtesting', label: 'Backtesting', icon: History },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[hsl(var(--surface-0))]">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[hsl(var(--surface-0)/0.9)] border-b border-[hsl(var(--border-subtle))]">
                <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold">StochFin</span>
                    </Link>

                    {/* Main Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-[hsl(var(--color-primary)/0.15)] text-[hsl(var(--color-primary-light))]'
                                            : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </button>

                        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                MK
                            </div>
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1600px] mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
