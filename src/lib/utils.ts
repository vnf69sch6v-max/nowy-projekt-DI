// =============================================
// StochFin UI: Utility Functions
// =============================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format number with thousand separators and decimal places
 */
export function formatNumber(
    value: number,
    options: {
        decimals?: number;
        currency?: string;
        compact?: boolean;
        sign?: boolean;
    } = {}
): string {
    const { decimals = 2, currency, compact = false, sign = false } = options;

    if (compact && Math.abs(value) >= 1000000) {
        const millions = value / 1000000;
        const formatted = millions.toLocaleString('pl-PL', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
        return `${sign && value > 0 ? '+' : ''}${formatted}M${currency ? ` ${currency}` : ''}`;
    }

    if (compact && Math.abs(value) >= 1000) {
        const thousands = value / 1000;
        const formatted = thousands.toLocaleString('pl-PL', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
        return `${sign && value > 0 ? '+' : ''}${formatted}k${currency ? ` ${currency}` : ''}`;
    }

    const formatted = value.toLocaleString('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    return `${sign && value > 0 ? '+' : ''}${formatted}${currency ? ` ${currency}` : ''}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
    const formatted = (value * 100).toLocaleString('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return `${formatted}%`;
}

/**
 * Format probability (always as percentage)
 */
export function formatProbability(probability: number): string {
    if (probability < 0.01) {
        return '<1%';
    }
    if (probability > 0.99) {
        return '>99%';
    }
    return formatPercent(probability, 0);
}

/**
 * Get risk level based on probability
 */
export function getRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability < 0.05) return 'low';
    if (probability < 0.15) return 'medium';
    if (probability < 0.30) return 'high';
    return 'critical';
}

/**
 * Get risk color class
 */
export function getRiskColorClass(level: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (level) {
        case 'low': return 'text-green-500';
        case 'medium': return 'text-amber-500';
        case 'high': return 'text-orange-500';
        case 'critical': return 'text-red-500';
    }
}

/**
 * Get risk background class
 */
export function getRiskBgClass(level: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (level) {
        case 'low': return 'bg-green-500/15 border-green-500/30';
        case 'medium': return 'bg-amber-500/15 border-amber-500/30';
        case 'high': return 'bg-orange-500/15 border-orange-500/30';
        case 'critical': return 'bg-red-500/15 border-red-500/30';
    }
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'long') {
        return d.toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    return d.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit'
    });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
