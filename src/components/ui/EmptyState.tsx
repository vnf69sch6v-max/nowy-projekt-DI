'use client';

// =============================================
// EmptyState Component
// Reusable empty state for screens without data
// =============================================

import React from 'react';

interface EmptyStateProps {
    message: string;
    description?: string;
    ctaText?: string;
    onCta?: () => void;
    icon?: string;
}

export default function EmptyState({
    message,
    description,
    ctaText,
    onCta,
    icon = '📭'
}: EmptyStateProps) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-10">
            {/* Icon */}
            <div className="text-6xl opacity-30 mb-4">
                {icon}
            </div>

            {/* Message */}
            <div className="text-lg text-gray-400 mb-2">
                {message}
            </div>

            {/* Description */}
            {description && (
                <div className="text-sm text-gray-500 max-w-md mb-6">
                    {description}
                </div>
            )}

            {/* CTA Button */}
            {ctaText && onCta && (
                <button
                    onClick={onCta}
                    className="
                        px-6 py-3 rounded-lg
                        bg-transparent
                        border border-white/10
                        text-emerald-400
                        font-semibold text-sm
                        transition-all duration-200
                        hover:border-emerald-500/30 hover:bg-emerald-500/5
                    "
                >
                    {ctaText}
                </button>
            )}
        </div>
    );
}
