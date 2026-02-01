// =============================================
// EventProb Engine - Single Event API Route
// GET: Get event details, PUT: Update, DELETE: Remove
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { runEventSimulation, runEventSimulationWithComparison, type EventDefinition, type EventVariable } from '@/lib/engine';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/events/[id] - Get single event with full details
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        const { data: event, error } = await supabase
            .from('events')
            .select(`
                *,
                event_variables (*),
                copula_specifications (*),
                bayesian_versions (*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Sort versions by date
        if (event.bayesian_versions) {
            event.bayesian_versions.sort((a: any, b: any) =>
                new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
            );
        }

        return NextResponse.json({ event });
    } catch (error) {
        console.error('Event GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/events/[id] - Update event (and optionally re-run simulation)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = createServerClient();
        const body = await req.json();

        // Get existing event
        const { data: existing, error: fetchError } = await supabase
            .from('events')
            .select(`
                *,
                event_variables (*),
                copula_specifications (*)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Update event metadata if provided
        if (body.name || body.description) {
            await supabase
                .from('events')
                .update({
                    name: body.name || existing.name,
                    description: body.description || existing.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
        }

        // Re-run simulation if requested
        if (body.recompute) {
            const variables: EventVariable[] = existing.event_variables.map((v: any) => ({
                name: v.variable_name,
                label: v.variable_label || v.variable_name,
                sde_model: v.sde_model,
                parameters: v.sde_parameters,
                initial_value: v.initial_value,
                data_frequency: v.data_frequency
            }));

            const copulaSpec = existing.copula_specifications?.[0];
            const result = runEventSimulationWithComparison(
                existing.definition_json as EventDefinition,
                variables,
                {
                    n_scenarios: body.n_scenarios || 10000,
                    horizon_months: existing.horizon_months,
                    dt_months: 1,
                    discretization: 'milstein',
                    use_copula_noise: !!copulaSpec,
                    copula_config: copulaSpec ? {
                        type: copulaSpec.copula_family,
                        ...copulaSpec.parameters
                    } : undefined
                }
            );

            // Update probability
            await supabase
                .from('events')
                .update({
                    current_probability: result.probability.mean,
                    current_ci_lower: result.probability.ci_90[0],
                    current_ci_upper: result.probability.ci_90[1],
                    last_computed_at: new Date().toISOString()
                })
                .eq('id', id);

            // Create new version
            const latestVersion = existing.bayesian_versions?.[0];
            const versionNum = latestVersion
                ? `v${(parseFloat(latestVersion.version_number.replace('v', '')) + 0.1).toFixed(1)}`
                : 'v1.0';

            await supabase
                .from('bayesian_versions')
                .insert({
                    event_id: id,
                    version_number: versionNum,
                    parent_version_id: latestVersion?.id || null,
                    prior_state: {},
                    posterior_state: {},
                    probability_estimate: {
                        mean: result.probability.mean,
                        ci_90: result.probability.ci_90
                    },
                    n_simulations: result.n_scenarios,
                    copula_used: copulaSpec?.copula_family || 'independent',
                    model_comparison: result.model_comparison,
                    notes: body.notes || 'Aktualizacja symulacji'
                });

            return NextResponse.json({
                event: { ...existing, current_probability: result.probability.mean },
                simulation: result,
                new_version: versionNum
            });
        }

        // Return updated event
        const { data: updated } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        return NextResponse.json({ event: updated });
    } catch (error) {
        console.error('Event PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/events/[id] - Soft delete (mark inactive)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        // Soft delete
        const { error } = await supabase
            .from('events')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Event DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
