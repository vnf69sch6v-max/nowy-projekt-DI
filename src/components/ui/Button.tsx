'use client';

// =============================================
// StochFin UI: Button Component
// =============================================

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-0))] disabled:opacity-50 disabled:cursor-not-allowed',
                // Sizes
                size === 'sm' && 'h-8 px-3 text-xs rounded-md',
                size === 'md' && 'h-10 px-4 text-sm rounded-lg',
                size === 'lg' && 'h-12 px-6 text-base rounded-lg',
                size === 'icon' && 'h-10 w-10 rounded-lg',
                // Variants
                variant === 'primary' && 'bg-[hsl(var(--color-primary))] text-white hover:bg-[hsl(var(--color-primary-light))] active:scale-[0.98]',
                variant === 'secondary' && 'bg-[hsl(var(--surface-3))] text-[hsl(var(--text-primary))] border border-[hsl(var(--border-default))] hover:bg-[hsl(var(--surface-4))]',
                variant === 'danger' && 'bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25',
                variant === 'ghost' && 'bg-transparent text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                leftIcon
            )}
            {children}
            {!loading && rightIcon}
        </button>
    );
}
