// @ts-nocheck
// =============================================
// EventProb Engine - Events API Route
// GET: List events, POST: Create event
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { runEventSimulation, type EventDefinition, type EventVariable } from '@/lib/engine';

// Types for API
export interface EventInput {
    name: string;
    description?: string;
    event_type: 'threshold_breach' | 'compound' | 'conditional' | 'sequence' | 'at_least_k';
    definition_json: EventDefinition;
    variables: Omit<EventVariableInput, 'event_id'>[];
    copula?: {
        family: string;
        parameters: Record<string, number>;
    };
    horizon_months: number;
}

export interface EventVariableInput {
    variable_name: string;
    variable_label?: string;
    sde_model: 'gbm' | 'ornstein_uhlenbeck' | 'heston' | 'merton_jump' | 'deterministic';
    sde_parameters: Record<string, number>;
    initial_value: number;
    data_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

// GET /api/events - List all events for user
export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();

        // Get user from session (simplified - in production use proper auth)
        const { data: { user } } = await supabase.auth.getUser();

        // For now, if no user, return all events (dev mode)
        const query = supabase
            .from('events')
            .select(`
                id,
                name,
                description,
                event_type,
                definition_json,
                horizon_months,
                current_probability,
                current_ci_lower,
                current_ci_upper,
                last_computed_at,
                is_active,
                created_at,
                updated_at,
                event_variables (
                    id,
                    variable_name,
                    variable_label,
                    sde_model,
                    sde_parameters,
                    initial_value,
                    data_frequency
                ),
                copula_specifications (
                    id,
                    copula_family,
                    parameters,
                    tail_dependence
                ),
                bayesian_versions (
                    id,
                    version_number,
                    probability_estimate,
                    computed_at,
                    notes
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        const { data: events, error } = await query;

        if (error) {
            console.error('Events fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to API response format
        const transformedEvents = events?.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            event_type: event.event_type,
            probability: event.current_probability || 0,
            ci_lower: event.current_ci_lower || 0,
            ci_upper: event.current_ci_upper || 0,
            copula: event.copula_specifications?.[0]?.copula_family
                ? `${event.copula_specifications[0].copula_family} θ=${event.copula_specifications[0].parameters?.theta || 0}`
                : null,
            lambda_lower: event.copula_specifications?.[0]?.tail_dependence?.lambda_lower || null,
            last_updated: event.last_computed_at || event.created_at,
            version: event.bayesian_versions?.[0]?.version_number || 'v1.0',
            variables: event.event_variables,
            definition: event.definition_json
        })) || [];

        return NextResponse.json({ events: transformedEvents });
    } catch (error) {
        console.error('Events API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/events - Create new event
export async function POST(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const body: EventInput = await req.json();

        // Validate required fields
        if (!body.name || !body.event_type || !body.definition_json || !body.variables?.length) {
            return NextResponse.json(
                { error: 'Missing required fields: name, event_type, definition_json, variables' },
                { status: 400 }
            );
        }

        // Get user (optional for dev)
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Insert event
        const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert({
                user_id: user?.id || null,
                name: body.name,
                description: body.description,
                event_type: body.event_type,
                definition_json: body.definition_json,
                horizon_months: body.horizon_months || 12,
                is_active: true
            })
            .select()
            .single();

        if (eventError) {
            console.error('Event insert error:', eventError);
            return NextResponse.json({ error: eventError.message }, { status: 500 });
        }

        // 2. Insert variables
        const variablesData = body.variables.map(v => ({
            event_id: newEvent.id,
            variable_name: v.variable_name,
            variable_label: v.variable_label,
            sde_model: v.sde_model,
            sde_parameters: v.sde_parameters,
            initial_value: v.initial_value,
            data_frequency: v.data_frequency || 'monthly'
        }));

        const { error: varsError } = await supabase
            .from('event_variables')
            .insert(variablesData);

        if (varsError) {
            console.error('Variables insert error:', varsError);
            // Cleanup: delete event
            await supabase.from('events').delete().eq('id', newEvent.id);
            return NextResponse.json({ error: varsError.message }, { status: 500 });
        }

        // 3. Insert copula if provided
        if (body.copula) {
            const { error: copulaError } = await supabase
                .from('copula_specifications')
                .insert({
                    event_id: newEvent.id,
                    copula_family: body.copula.family,
                    parameters: body.copula.parameters,
                    estimation_method: 'manual'
                });

            if (copulaError) {
                console.error('Copula insert error:', copulaError);
            }
        }

        // 4. Run initial simulation
        const variables: EventVariable[] = body.variables.map(v => ({
            name: v.variable_name,
            label: v.variable_label || v.variable_name,
            sde_model: v.sde_model,
            parameters: v.sde_parameters,
            initial_value: v.initial_value,
            data_frequency: v.data_frequency || 'monthly'
        }));

        const result = runEventSimulation(
            body.definition_json,
            variables,
            {
                n_scenarios: 10000,
                horizon_months: body.horizon_months || 12,
                dt_months: 1,
                discretization: 'milstein',
                use_copula_noise: !!body.copula,
                copula_config: body.copula ? {
                    type: body.copula.family as any,
                    ...body.copula.parameters
                } : undefined
            }
        );

        // 5. Update event with probability results
        await supabase
            .from('events')
            .update({
                current_probability: result.probability.mean,
                current_ci_lower: result.probability.ci_90[0],
                current_ci_upper: result.probability.ci_90[1],
                last_computed_at: new Date().toISOString()
            })
            .eq('id', newEvent.id);

        // 6. Create initial Bayesian version
        await supabase
            .from('bayesian_versions')
            .insert({
                event_id: newEvent.id,
                version_number: 'v1.0',
                prior_state: {},
                posterior_state: {},
                probability_estimate: {
                    mean: result.probability.mean,
                    ci_90: result.probability.ci_90,
                    p5: result.probability.ci_90[0],
                    p95: result.probability.ci_90[1]
                },
                n_simulations: result.n_scenarios,
                copula_used: body.copula?.family || 'independent',
                model_comparison: result.model_comparison,
                notes: 'Inicjalna wersja'
            });

        return NextResponse.json({
            event: {
                id: newEvent.id,
                name: newEvent.name,
                description: newEvent.description,
                event_type: newEvent.event_type,
                probability: result.probability.mean,
                ci_lower: result.probability.ci_90[0],
                ci_upper: result.probability.ci_90[1],
                copula: body.copula?.family || null,
                version: 'v1.0'
            },
            simulation: result
        }, { status: 201 });

    } catch (error) {
        console.error('Events POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
