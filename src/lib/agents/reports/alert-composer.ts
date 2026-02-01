// @ts-nocheck
// =============================================
// Agent 19: Alert Composer
// Formats and routes alerts to various channels
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    Alert
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface AlertComposerInput {
    alerts: Alert[];
    channels: AlertChannel[];
    user_preferences?: UserAlertPreferences;
}

export type AlertChannel = 'email' | 'slack' | 'push' | 'sms' | 'webhook';

export interface UserAlertPreferences {
    email?: string;
    slack_webhook?: string;
    push_enabled?: boolean;
    quiet_hours?: { start: number; end: number }; // 0-23
    min_severity?: 'info' | 'warning' | 'critical';
}

export interface AlertComposerOutput {
    formatted_alerts: FormattedAlert[];
    sent_to: { channel: AlertChannel; count: number }[];
    suppressed: number;
    summary: string;
}

export interface FormattedAlert {
    original_id: string;
    channel: AlertChannel;
    subject: string;
    body: string;
    html_body?: string;
    metadata: Record<string, unknown>;
    sent: boolean;
    error?: string;
}

// =============================================
// Agent Implementation
// =============================================

export class AlertComposerAgent extends BaseAgent<AlertComposerInput, AlertComposerOutput> {
    readonly id: AgentId = 'agent-alert-composer';
    readonly name = 'Alert Composer';
    readonly category: AgentCategory = 'reports';
    readonly description = 'Formatuje i wysyła alerty różnymi kanałami';
    readonly triggers: TriggerType[] = ['data_event', 'threshold_alert'];

    protected async run(
        input: AlertComposerInput,
        context: AgentContext
    ): Promise<AlertComposerOutput> {
        const { alerts, channels } = input;
        const preferences = input.user_preferences || {};

        context.log(`[${this.id}] Processing ${alerts.length} alerts for ${channels.length} channels`);

        // Deduplicate alerts
        const uniqueAlerts = this.deduplicateAlerts(alerts);

        // Filter by severity
        const minSeverity = preferences.min_severity || 'info';
        const filteredAlerts = this.filterBySeverity(uniqueAlerts, minSeverity);
        const suppressed = uniqueAlerts.length - filteredAlerts.length;

        // Check quiet hours
        const now = new Date();
        const currentHour = now.getHours();
        const inQuietHours = preferences.quiet_hours &&
            currentHour >= preferences.quiet_hours.start &&
            currentHour < preferences.quiet_hours.end;

        // Format and "send" alerts
        const formatted_alerts: FormattedAlert[] = [];
        const sentCounts: Map<AlertChannel, number> = new Map();

        for (const alert of filteredAlerts) {
            for (const channel of channels) {
                // Skip non-critical during quiet hours
                if (inQuietHours && alert.severity !== 'critical') {
                    continue;
                }

                const formatted = await this.formatAlert(alert, channel, context);
                formatted_alerts.push(formatted);

                if (formatted.sent) {
                    sentCounts.set(channel, (sentCounts.get(channel) || 0) + 1);
                }
            }
        }

        const sent_to = channels.map(channel => ({
            channel,
            count: sentCounts.get(channel) || 0
        }));

        const summary = this.generateSummary(filteredAlerts, sent_to);

        return {
            formatted_alerts,
            sent_to,
            suppressed,
            summary
        };
    }

    // =============================================
    // Alert Formatting by Channel
    // =============================================

    private async formatAlert(
        alert: Alert,
        channel: AlertChannel,
        context: AgentContext
    ): Promise<FormattedAlert> {
        let subject: string;
        let body: string;
        let html_body: string | undefined;

        switch (channel) {
            case 'email':
                ({ subject, body, html_body } = this.formatForEmail(alert));
                break;
            case 'slack':
                ({ subject, body } = this.formatForSlack(alert));
                break;
            case 'push':
                ({ subject, body } = this.formatForPush(alert));
                break;
            case 'sms':
                ({ subject, body } = this.formatForSMS(alert));
                break;
            case 'webhook':
                ({ subject, body } = this.formatForWebhook(alert));
                break;
            default:
                subject = alert.title;
                body = alert.message;
        }

        // Enhance with Gemini if critical
        if (alert.severity === 'critical' && context.gemini) {
            try {
                const { text } = await this.callGemini(
                    `Dodaj kontekst do tego alertu krytycznego (max 2 zdania):
                    Tytuł: ${alert.title}
                    Wiadomość: ${alert.message}
                    
                    Co może oznaczać ten alert? Jakie natychmiastowe działania są zalecane?`,
                    context
                );
                body = `${body}\n\n📋 Kontekst: ${text}`;
            } catch (e) {
                context.log(`[${this.id}] Gemini enhancement failed: ${e}`, 'warn');
            }
        }

        return {
            original_id: alert.id,
            channel,
            subject,
            body,
            html_body,
            metadata: {
                severity: alert.severity,
                agent_id: alert.agent_id,
                timestamp: alert.created_at
            },
            sent: true // Simulated - in production would actually send
        };
    }

    private formatForEmail(alert: Alert): { subject: string; body: string; html_body: string } {
        const severityEmoji = this.getSeverityEmoji(alert.severity);
        const severityColor = this.getSeverityColor(alert.severity);

        return {
            subject: `${severityEmoji} [StochFin] ${alert.title}`,
            body: `
${alert.title}

${alert.message}

Severity: ${alert.severity.toUpperCase()}
Agent: ${alert.agent_id}
Time: ${alert.created_at.toISOString()}

---
This alert was generated by StochFin AI Agent System
            `.trim(),
            html_body: `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .alert-box { padding: 20px; border-radius: 8px; border-left: 4px solid ${severityColor}; background: #f8f9fa; }
  .severity { color: ${severityColor}; font-weight: bold; text-transform: uppercase; }
</style></head>
<body>
  <div class="alert-box">
    <h2>${severityEmoji} ${alert.title}</h2>
    <p>${alert.message}</p>
    <p class="severity">Severity: ${alert.severity}</p>
    <p><small>Agent: ${alert.agent_id} | ${alert.created_at.toISOString()}</small></p>
  </div>
</body>
</html>
            `.trim()
        };
    }

    private formatForSlack(alert: Alert): { subject: string; body: string } {
        const emoji = this.getSeverityEmoji(alert.severity);

        return {
            subject: `${emoji} ${alert.title}`,
            body: JSON.stringify({
                blocks: [
                    {
                        type: 'header',
                        text: { type: 'plain_text', text: `${emoji} ${alert.title}` }
                    },
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: alert.message }
                    },
                    {
                        type: 'context',
                        elements: [
                            { type: 'mrkdwn', text: `*Severity:* ${alert.severity}` },
                            { type: 'mrkdwn', text: `*Agent:* ${alert.agent_id}` }
                        ]
                    }
                ]
            })
        };
    }

    private formatForPush(alert: Alert): { subject: string; body: string } {
        return {
            subject: `${this.getSeverityEmoji(alert.severity)} ${alert.title}`,
            body: alert.message.slice(0, 100) + (alert.message.length > 100 ? '...' : '')
        };
    }

    private formatForSMS(alert: Alert): { subject: string; body: string } {
        return {
            subject: 'StochFin Alert',
            body: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`.slice(0, 160)
        };
    }

    private formatForWebhook(alert: Alert): { subject: string; body: string } {
        return {
            subject: alert.title,
            body: JSON.stringify({
                id: alert.id,
                title: alert.title,
                message: alert.message,
                severity: alert.severity,
                agent_id: alert.agent_id,
                data: alert.data,
                created_at: alert.created_at.toISOString()
            })
        };
    }

    // =============================================
    // Helpers
    // =============================================

    private deduplicateAlerts(alerts: Alert[]): Alert[] {
        const seen = new Set<string>();
        return alerts.filter(alert => {
            const key = `${alert.title}-${alert.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    private filterBySeverity(alerts: Alert[], minSeverity: string): Alert[] {
        const severityOrder = { info: 0, warning: 1, critical: 2 };
        const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] || 0;

        return alerts.filter(a =>
            severityOrder[a.severity as keyof typeof severityOrder] >= minLevel
        );
    }

    private getSeverityEmoji(severity: string): string {
        switch (severity) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    private getSeverityColor(severity: string): string {
        switch (severity) {
            case 'critical': return '#dc3545';
            case 'warning': return '#ffc107';
            default: return '#17a2b8';
        }
    }

    private generateSummary(
        alerts: Alert[],
        sent_to: { channel: AlertChannel; count: number }[]
    ): string {
        const critical = alerts.filter(a => a.severity === 'critical').length;
        const warning = alerts.filter(a => a.severity === 'warning').length;
        const channels = sent_to.filter(s => s.count > 0).map(s => s.channel).join(', ');

        return `Wysłano ${alerts.length} alertów (${critical} krytycznych, ${warning} ostrzeżeń) przez: ${channels || 'brak kanałów'}`;
    }
}

export const alertComposerAgent = new AlertComposerAgent();
