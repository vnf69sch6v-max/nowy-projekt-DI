'use client';

import { useState, useEffect, useCallback } from 'react';
import { KRSCompany, FinancialData } from '@/types';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    companyName: string;
    companyKrs: string;
    content: string;
    company: KRSCompany;
    financials: FinancialData[];
}

const STORAGE_KEY = 'auto-memorandum-history';
const MAX_ENTRIES = 10;

export function useHistory() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    // Load from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }, []);

    // Save entry
    const saveEntry = useCallback((
        content: string,
        company: KRSCompany,
        financials: FinancialData[]
    ) => {
        const entry: HistoryEntry = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            companyName: company.nazwa || 'Nieznana spółka',
            companyKrs: company.krs || '',
            content,
            company,
            financials,
        };

        setHistory(prev => {
            const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save history:', e);
            }
            return updated;
        });

        return entry.id;
    }, []);

    // Delete entry
    const deleteEntry = useCallback((id: string) => {
        setHistory(prev => {
            const updated = prev.filter(e => e.id !== id);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save history:', e);
            }
            return updated;
        });
    }, []);

    // Clear all
    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear history:', e);
        }
    }, []);

    // Get entry
    const getEntry = useCallback((id: string) => {
        return history.find(e => e.id === id);
    }, [history]);

    return {
        history,
        saveEntry,
        deleteEntry,
        clearHistory,
        getEntry,
    };
}
