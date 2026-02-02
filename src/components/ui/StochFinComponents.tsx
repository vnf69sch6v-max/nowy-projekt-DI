'use client';

// =============================================
// StochFin — Shared UI Components
// Glassmorphism design system
// =============================================

import { ReactNode, CSSProperties } from 'react';

// =============================================
// GlassCard
// =============================================

interface GlassCardProps {
    children: ReactNode;
    style?: CSSProperties;
    glowColor?: string;
}

export function GlassCard({ children, style, glowColor }: GlassCardProps) {
    return (
        <div
            style={{
                background: 'var(--bg-card, rgba(17, 24, 39, 0.7))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: glowColor
                    ? `0 0 40px ${glowColor}22, inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// =============================================
// MetricCard
// =============================================

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    style?: CSSProperties;
}

export function MetricCard({ label, value, subValue, color, trend, style }: MetricCardProps) {
    return (
        <div
            style={{
                padding: '16px',
                background: 'var(--bg-elevated, #1a2332)',
                borderRadius: '8px',
                ...style,
            }}
        >
            <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--text-muted, #64748b)',
                marginBottom: '4px'
            }}>
                {label}
            </div>
            <div style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 'bold',
                color: color || 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }}>
                {trend && (
                    <span style={{ color: trend === 'up' ? '#10b981' : trend === 'down' ? '#f43f5e' : 'inherit' }}>
                        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
                    </span>
                )}
                {value}
            </div>
            {subValue && (
                <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted, #64748b)',
                    marginTop: '2px'
                }}>
                    {subValue}
                </div>
            )}
        </div>
    );
}

// =============================================
// FeatureIcon
// =============================================

interface FeatureIconProps {
    emoji: string;
    size?: number;
}

export function FeatureIcon({ emoji, size = 16 }: FeatureIconProps) {
    return (
        <span style={{ fontSize: `${size}px` }}>
            {emoji}
        </span>
    );
}
