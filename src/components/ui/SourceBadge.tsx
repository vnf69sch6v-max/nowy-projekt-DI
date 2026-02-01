// =============================================
// Source Badge Component
// Shows data source: API, PDF, Excel, Manual
// =============================================

import { DataSourceType } from '@/types/valuation';

interface SourceBadgeProps {
    type: DataSourceType;
    source?: string;
    compact?: boolean;
}

const BADGE_CONFIG = {
    api: {
        icon: '🌐',
        label: 'API',
        bg: 'rgba(56, 189, 248, 0.1)',
        border: 'rgba(56, 189, 248, 0.2)',
        color: '#38BDF8'
    },
    pdf: {
        icon: '📄',
        label: 'PDF',
        bg: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.2)',
        color: '#8B5CF6'
    },
    excel: {
        icon: '📊',
        label: 'Excel',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.2)',
        color: '#10B981'
    },
    manual: {
        icon: '✏️',
        label: 'Ręcznie',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.2)',
        color: '#F59E0B'
    }
};

export function SourceBadge({ type, source, compact = false }: SourceBadgeProps) {
    const config = BADGE_CONFIG[type] || BADGE_CONFIG.manual;

    if (compact) {
        return (
            <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                style={{
                    backgroundColor: config.bg,
                    border: `1px solid ${config.border}`,
                    color: config.color
                }}
                title={source}
            >
                <span>{config.icon}</span>
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded font-sans"
            style={{
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                color: '#9CA3AF'
            }}
        >
            <span>{config.icon}</span>
            <span>{source || config.label}</span>
        </span>
    );
}

// Empty state component
export function EmptyDataState({ label = 'Wgraj PDF lub podaj ręcznie' }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-gray-500 text-2xl">—</span>
            <span className="text-gray-500 text-[11px]">{label}</span>
        </div>
    );
}

// Formatted value with source
interface ValueWithSourceProps {
    value: number | null | undefined;
    source?: DataSourceType;
    sourceName?: string;
    format?: 'currency' | 'percent' | 'multiple' | 'number';
    currency?: string;
    unit?: string;
    showChange?: number | null;
}

export function ValueWithSource({
    value,
    source,
    sourceName,
    format = 'number',
    currency = 'USD',
    unit = '',
    showChange
}: ValueWithSourceProps) {
    if (value === null || value === undefined) {
        return <EmptyDataState />;
    }

    let formattedValue: string;

    switch (format) {
        case 'currency':
            if (Math.abs(value) >= 1e12) {
                formattedValue = `${currency === 'USD' ? '$' : ''}${(value / 1e12).toFixed(2)}T`;
            } else if (Math.abs(value) >= 1e9) {
                formattedValue = `${currency === 'USD' ? '$' : ''}${(value / 1e9).toFixed(1)}B`;
            } else if (Math.abs(value) >= 1e6) {
                formattedValue = `${currency === 'USD' ? '$' : ''}${(value / 1e6).toFixed(1)}M`;
            } else {
                formattedValue = `${currency === 'USD' ? '$' : ''}${value.toLocaleString()}`;
            }
            break;
        case 'percent':
            formattedValue = `${(value * 100).toFixed(1)}%`;
            break;
        case 'multiple':
            formattedValue = `${value.toFixed(1)}x`;
            break;
        default:
            formattedValue = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    return (
        <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-white">
                {formattedValue}
                {unit && <span className="text-gray-500 text-xs ml-1">{unit}</span>}
            </span>
            {showChange !== null && showChange !== undefined && (
                <span className={`text-xs ${showChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {showChange >= 0 ? '↑' : '↓'} {showChange >= 0 ? '+' : ''}{(showChange * 100).toFixed(1)}%
                </span>
            )}
            {source && (
                <SourceBadge type={source} source={sourceName} compact />
            )}
        </div>
    );
}
