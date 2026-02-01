'use client';

// =============================================
// StochFin UI: Input Component
// Form input with label and error states
// =============================================

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    help?: string;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, help, leftAddon, rightAddon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftAddon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]">
                            {leftAddon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full h-10 px-3.5 bg-[hsl(var(--surface-2))] border rounded-lg text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] transition-colors',
                            'focus:outline-none focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.15)]',
                            error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                : 'border-[hsl(var(--border-default))]',
                            leftAddon && 'pl-10',
                            rightAddon && 'pr-10',
                            className
                        )}
                        {...props}
                    />
                    {rightAddon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]">
                            {rightAddon}
                        </div>
                    )}
                </div>
                {help && !error && (
                    <p className="mt-1 text-xs text-[hsl(var(--text-muted))]">{help}</p>
                )}
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

// Number Input with formatting
export interface NumberInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    suffix,
    ...props
}: NumberInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') {
            onChange(undefined);
            return;
        }

        let num = parseFloat(raw);
        if (isNaN(num)) return;

        if (min !== undefined && num < min) num = min;
        if (max !== undefined && num > max) num = max;

        onChange(num);
    };

    return (
        <Input
            type="number"
            value={value ?? ''}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            rightAddon={suffix && <span className="text-xs">{suffix}</span>}
            {...props}
        />
    );
}
