'use client';

// =============================================
// StochFin UI: Risk Badge Component
// Color-coded risk level indicator
// =============================================

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskBadgeProps {
    level: RiskLevel;
    label?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
    probability?: number;
    className?: string;
}

export function RiskBadge({
    level,
    label,
    showIcon = true,
    size = 'md',
    probability,
    className
}: RiskBadgeProps) {
    const defaultLabels: Record<RiskLevel, string> = {
        low: 'Low Risk',
        medium: 'Medium',
        high: 'High Risk',
        critical: 'Critical'
    };

    const icons: Record<RiskLevel, React.ReactNode> = {
        low: <CheckCircle className="w-3.5 h-3.5" />,
        medium: <AlertCircle className="w-3.5 h-3.5" />,
        high: <AlertTriangle className="w-3.5 h-3.5" />,
        critical: <XCircle className="w-3.5 h-3.5" />
    };

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide border rounded-md',
                // Sizes
                size === 'sm' && 'px-2 py-0.5 text-[10px]',
                size === 'md' && 'px-2.5 py-1 text-xs',
                size === 'lg' && 'px-3 py-1.5 text-sm',
                // Colors
                level === 'low' && 'bg-green-500/15 text-green-500 border-green-500/30',
                level === 'medium' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                level === 'high' && 'bg-orange-500/15 text-orange-500 border-orange-500/30',
                level === 'critical' && 'bg-red-500/15 text-red-500 border-red-500/30 animate-pulse',
                className
            )}
        >
            {showIcon && icons[level]}
            <span>{label || defaultLabels[level]}</span>
            {probability !== undefined && (
                <span className="ml-1 opacity-70">
                    {(probability * 100).toFixed(0)}%
                </span>
            )}
        </div>
    );
}

// Helper to get risk level from probability
export function getRiskLevelFromProbability(probability: number): RiskLevel {
    if (probability < 0.05) return 'low';
    if (probability < 0.15) return 'medium';
    if (probability < 0.30) return 'high';
    return 'critical';
}
