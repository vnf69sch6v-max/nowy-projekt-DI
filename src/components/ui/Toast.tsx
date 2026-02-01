'use client';

// =============================================
// StochFin — Toast Notification System
// =============================================

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// =============================================
// Types
// =============================================

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

// =============================================
// Context
// =============================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// =============================================
// Toast Component
// =============================================

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const config = {
        success: {
            icon: '✓',
            borderColor: '#10B981',
            bgColor: 'rgba(16,185,129,0.1)',
            textColor: '#10B981'
        },
        warning: {
            icon: '⚠️',
            borderColor: '#F59E0B',
            bgColor: 'rgba(245,158,11,0.1)',
            textColor: '#F59E0B'
        },
        error: {
            icon: '✗',
            borderColor: '#EF4444',
            bgColor: 'rgba(239,68,68,0.1)',
            textColor: '#EF4444'
        },
        info: {
            icon: 'ℹ',
            borderColor: '#38BDF8',
            bgColor: 'rgba(56,189,248,0.1)',
            textColor: '#38BDF8'
        }
    };

    const c = config[toast.type];

    return (
        <div
            className="bg-[#0A0E17] rounded-lg p-4 shadow-xl border border-white/10 animate-slide-in min-w-[320px] max-w-md"
            style={{
                borderLeftWidth: '3px',
                borderLeftColor: c.borderColor,
                animation: 'slideIn 0.3s ease-out'
            }}
        >
            <div className="flex items-start gap-3">
                <span
                    className="text-lg flex-shrink-0 mt-0.5"
                    style={{ color: c.textColor }}
                >
                    {c.icon}
                </span>
                <div className="flex-1">
                    <div className="font-medium text-white text-sm">{toast.title}</div>
                    {toast.message && (
                        <div className="text-gray-400 text-xs mt-0.5">{toast.message}</div>
                    )}
                </div>
                <button
                    onClick={onRemove}
                    className="text-gray-500 hover:text-white text-sm"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

// =============================================
// Toast Provider
// =============================================

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2);
        const newToast = { ...toast, id };

        setToasts(prev => {
            // Max 3 visible
            const updated = [...prev, newToast].slice(-3);
            return updated;
        });

        // Auto-dismiss
        const duration = toast.duration || (toast.type === 'error' ? 0 : toast.type === 'warning' ? 8000 : 4000);
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Animation Styles */}
            <style jsx global>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

// =============================================
// Helper Hooks
// =============================================

export function useToastHelpers() {
    const { addToast } = useToast();

    return {
        success: (title: string, message?: string) =>
            addToast({ type: 'success', title, message }),
        warning: (title: string, message?: string) =>
            addToast({ type: 'warning', title, message }),
        error: (title: string, message?: string) =>
            addToast({ type: 'error', title, message }),
        info: (title: string, message?: string) =>
            addToast({ type: 'info', title, message })
    };
}
