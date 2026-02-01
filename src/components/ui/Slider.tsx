'use client';

// =============================================
// StochFin UI: Slider Component
// For correlation inputs and other ranges
// =============================================

import React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    showValue?: boolean;
    formatValue?: (value: number) => string;
    colorMode?: 'default' | 'correlation';
    disabled?: boolean;
    className?: string;
}

export function Slider({
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    label,
    showValue = true,
    formatValue = (v) => v.toFixed(2),
    colorMode = 'default',
    disabled = false,
    className
}: SliderProps) {
    // Calculate percentage for gradient
    const percent = ((value - min) / (max - min)) * 100;

    // Gradient for correlation mode (-1 to 1)
    const getBackgroundStyle = () => {
        if (colorMode === 'correlation') {
            // Red on left (-1), gray in middle (0), green on right (+1)
            const midPoint = ((0 - min) / (max - min)) * 100;
            return {
                background: `linear-gradient(to right, 
          hsl(0, 84%, 60%) 0%, 
          hsl(215, 20%, 35%) ${midPoint}%, 
          hsl(142, 76%, 36%) 100%)`
            };
        }

        // Default: filled from left
        return {
            background: `linear-gradient(to right, 
        hsl(220, 90%, 56%) ${percent}%, 
        hsl(215, 28%, 23%) ${percent}%)`
        };
    };

    return (
        <div className={cn('w-full', className)}>
            {(label || showValue) && (
                <div className="flex items-center justify-between mb-2">
                    {label && (
                        <label className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-secondary))]">
                            {label}
                        </label>
                    )}
                    {showValue && (
                        <span className={cn(
                            'text-sm font-mono font-medium',
                            colorMode === 'correlation' && value < 0 && 'text-red-400',
                            colorMode === 'correlation' && value > 0 && 'text-green-400',
                            colorMode === 'correlation' && value === 0 && 'text-[hsl(var(--text-secondary))]',
                            colorMode !== 'correlation' && 'text-[hsl(var(--text-primary))]'
                        )}>
                            {formatValue(value)}
                        </span>
                    )}
                </div>
            )}

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                className={cn(
                    'w-full h-1.5 rounded-full appearance-none cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-0))]',
                    disabled && 'opacity-50 cursor-not-allowed',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:h-4',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-white',
                    '[&::-webkit-slider-thumb]:shadow-md',
                    '[&::-webkit-slider-thumb]:cursor-grab',
                    '[&::-webkit-slider-thumb]:transition-transform',
                    '[&::-webkit-slider-thumb]:hover:scale-110',
                    '[&::-webkit-slider-thumb]:active:cursor-grabbing'
                )}
                style={getBackgroundStyle()}
            />

            {colorMode === 'correlation' && (
                <div className="flex justify-between mt-1 text-[10px] text-[hsl(var(--text-muted))]">
                    <span>−1</span>
                    <span>0</span>
                    <span>+1</span>
                </div>
            )}
        </div>
    );
}
