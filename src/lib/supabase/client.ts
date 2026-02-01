// =============================================
// StochFin Supabase Client
// Browser and server-side Supabase clients
// =============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================
// Browser Client (singleton)
// =============================================

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client for browser/client-side usage
 * Uses singleton pattern to avoid multiple client instances
 */
export function getSupabaseClient(): SupabaseClient<Database> {
    if (typeof window === 'undefined') {
        throw new Error('getSupabaseClient should only be called on the client side');
    }

    if (!browserClient) {
        browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }

    return browserClient;
}

// =============================================
// Server Client (for API routes & SSR)
// =============================================

/**
 * Create Supabase client for server-side usage
 * Creates a new instance each time for isolation
 */
export function createServerClient(): SupabaseClient<Database> {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}

// =============================================
// Service Role Client (admin operations)
// =============================================

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create Supabase client with service role (admin) privileges
 * USE WITH CAUTION - bypasses RLS
 */
export function createAdminClient(): SupabaseClient<Database> {
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}

// =============================================
// Typed Query Helpers
// =============================================

/**
 * Get supabase client with typed schema access
 */
export function useSupabase() {
    const client = getSupabaseClient();

    return {
        client,

        // Core tables (in public schema)
        entities: () => client.from('entities'),
        variables: () => client.from('variable_definitions'),
        facts: () => client.from('historical_facts'),

        // Models tables
        models: () => client.from('forecast_models'),
        assumptions: () => client.from('variable_assumptions'),
        correlations: () => client.from('correlation_matrices'),
        covenants: () => client.from('covenants'),

        // Simulations tables
        simulations: () => client.from('simulation_runs'),
        results: () => client.from('aggregated_results'),

        // Audit tables
        changes: () => client.from('assumption_changes'),
        snapshots: () => client.from('model_snapshots'),
        notifications: () => client.from('user_notifications')
    };
}

// =============================================
// Real-time Subscriptions
// =============================================

export type SimulationStatusCallback = (status: string, progress?: number) => void;

/**
 * Subscribe to simulation status updates
 */
export function subscribeToSimulation(
    simulationId: string,
    callback: SimulationStatusCallback
): () => void {
    const client = getSupabaseClient();

    const channel = client
        .channel(`simulation:${simulationId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'simulations',
                table: 'simulation_runs',
                filter: `id=eq.${simulationId}`
            },
            (payload) => {
                const status = payload.new.status as string;
                callback(status);
            }
        )
        .subscribe();

    // Return unsubscribe function
    return () => {
        client.removeChannel(channel);
    };
}
