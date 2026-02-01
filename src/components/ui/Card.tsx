'use client';

// =============================================
// StochFin UI: Card Component
// Glassmorphic card with variants
// =============================================

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'glow' | 'risk';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
    className,
    variant = 'default',
    riskLevel,
    padding = 'md',
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                'card rounded-xl border transition-all duration-200',
                // Padding
                padding === 'none' && 'p-0',
                padding === 'sm' && 'p-3',
                padding === 'md' && 'p-4 md:p-6',
                padding === 'lg' && 'p-6 md:p-8',
                // Variants
                variant === 'default' && 'bg-[hsl(var(--glass-bg))] border-[hsl(var(--glass-border))] backdrop-blur-md',
                variant === 'elevated' && 'bg-[hsl(var(--glass-bg))] border-[hsl(var(--glass-border))] backdrop-blur-md shadow-lg',
                variant === 'glow' && 'bg-[hsl(var(--glass-bg))] border-[hsl(var(--color-primary)/0.3)] backdrop-blur-md shadow-[0_0_20px_hsl(var(--color-primary)/0.15)]',
                // Risk variants
                variant === 'risk' && riskLevel === 'low' && 'bg-green-500/5 border-green-500/20',
                variant === 'risk' && riskLevel === 'medium' && 'bg-amber-500/5 border-amber-500/20',
                variant === 'risk' && riskLevel === 'high' && 'bg-orange-500/5 border-orange-500/20',
                variant === 'risk' && riskLevel === 'critical' && 'bg-red-500/5 border-red-500/20',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// Card Header
export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex items-center justify-between gap-4 mb-4', className)}
            {...props}
        >
            {children}
        </div>
    );
}

// Card Title
export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn('text-lg font-semibold text-[hsl(var(--text-primary))]', className)}
            {...props}
        >
            {children}
        </h3>
    );
}

// Card Description
export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn('text-sm text-[hsl(var(--text-secondary))]', className)}
            {...props}
        >
            {children}
        </p>
    );
}

// Card Content
export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('', className)} {...props}>
            {children}
        </div>
    );
}

// Card Footer
export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex items-center gap-4 mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]', className)}
            {...props}
        >
            {children}
        </div>
    );
}
