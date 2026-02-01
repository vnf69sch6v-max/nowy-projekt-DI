// =============================================
// Agent 20: PDF Report Builder
// Generates comprehensive PDF reports
// =============================================

import { BaseAgent } from '../core/base-agent';
import {
    AgentId,
    AgentCategory,
    AgentContext,
    TriggerType,
    RiskMetrics,
    Alert
} from '../core/types';

// =============================================
// Input/Output Types
// =============================================

export interface PDFReportBuilderInput {
    report_type: ReportType;
    title: string;
    sections: ReportSection[];
    metadata?: ReportMetadata;
    styling?: ReportStyling;
}

export type ReportType = 'risk_report' | 'simulation_report' | 'backtest_report' | 'executive_summary' | 'regulatory_report';

export interface ReportSection {
    title: string;
    content: SectionContent;
    order: number;
}

export interface SectionContent {
    type: 'text' | 'table' | 'chart' | 'metrics' | 'alerts';
    text?: string;
    table?: TableData;
    chart?: ChartData;
    metrics?: MetricsData;
    alerts?: Alert[];
}

export interface TableData {
    headers: string[];
    rows: (string | number)[][];
    footer_row?: (string | number)[];
}

export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'scatter';
    title: string;
    labels: string[];
    datasets: { label: string; data: number[] }[];
}

export interface MetricsData {
    items: { label: string; value: string | number; change?: number; unit?: string }[];
}

export interface ReportMetadata {
    author?: string;
    date?: Date;
    version?: string;
    confidential?: boolean;
    distribution?: string[];
}

export interface ReportStyling {
    primary_color?: string;
    logo_path?: string;
    font_family?: string;
}

export interface PDFReportBuilderOutput {
    html_content: string;
    table_of_contents: TOCItem[];
    page_count: number;
    metadata: GeneratedMetadata;
}

export interface TOCItem {
    title: string;
    page: number;
    level: number;
}

export interface GeneratedMetadata {
    generated_at: Date;
    word_count: number;
    sections_count: number;
    charts_count: number;
    tables_count: number;
}

// =============================================
// Agent Implementation
// =============================================

export class PDFReportBuilderAgent extends BaseAgent<PDFReportBuilderInput, PDFReportBuilderOutput> {
    readonly id: AgentId = 'agent-pdf-builder';
    readonly name = 'PDF Report Builder';
    readonly category: AgentCategory = 'reports';
    readonly description = 'Generuje kompleksowe raporty PDF';
    readonly triggers: TriggerType[] = ['user_action', 'cron'];

    protected async run(
        input: PDFReportBuilderInput,
        context: AgentContext
    ): Promise<PDFReportBuilderOutput> {
        const { title, sections, report_type } = input;
        const metadata = input.metadata || {};
        const styling = input.styling || {};

        context.log(`[${this.id}] Building ${report_type} report: "${title}"`);

        // Sort sections by order
        const sortedSections = [...sections].sort((a, b) => a.order - b.order);

        // Generate HTML content
        const html_content = this.generateHTML(title, sortedSections, metadata, styling, report_type);

        // Generate table of contents
        const table_of_contents = this.generateTOC(sortedSections);

        // Count elements
        let charts_count = 0;
        let tables_count = 0;
        let word_count = 0;

        for (const section of sections) {
            if (section.content.type === 'chart') charts_count++;
            if (section.content.type === 'table') tables_count++;
            if (section.content.text) {
                word_count += section.content.text.split(/\s+/).length;
            }
        }

        // Estimate pages (rough: ~500 words per page + tables/charts)
        const page_count = Math.ceil((word_count / 500) + (charts_count + tables_count) * 0.5) + 2;

        return {
            html_content,
            table_of_contents,
            page_count,
            metadata: {
                generated_at: new Date(),
                word_count,
                sections_count: sections.length,
                charts_count,
                tables_count
            }
        };
    }

    // =============================================
    // HTML Generation
    // =============================================

    private generateHTML(
        title: string,
        sections: ReportSection[],
        metadata: ReportMetadata,
        styling: ReportStyling,
        reportType: ReportType
    ): string {
        const primaryColor = styling.primary_color || '#1a365d';
        const fontFamily = styling.font_family || "'Inter', sans-serif";
        const date = metadata.date ? metadata.date.toLocaleDateString('pl-PL') : new Date().toLocaleDateString('pl-PL');

        return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: ${primaryColor};
            --text: #1a202c;
            --text-muted: #718096;
            --border: #e2e8f0;
            --bg-light: #f7fafc;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${fontFamily};
            font-size: 11pt;
            line-height: 1.6;
            color: var(--text);
            background: white;
        }
        
        @page {
            size: A4;
            margin: 2cm;
        }
        
        .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
        }
        
        .cover-title {
            font-size: 28pt;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 20px;
        }
        
        .cover-subtitle {
            font-size: 14pt;
            color: var(--text-muted);
            margin-bottom: 40px;
        }
        
        .cover-meta {
            font-size: 10pt;
            color: var(--text-muted);
        }
        
        ${metadata.confidential ? `
        .confidential-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #c53030;
            color: white;
            padding: 5px 15px;
            font-size: 9pt;
            font-weight: 600;
            border-radius: 4px;
        }
        ` : ''}
        
        .toc {
            page-break-after: always;
        }
        
        .toc h2 {
            font-size: 18pt;
            color: var(--primary);
            margin-bottom: 20px;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 10px;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted var(--border);
        }
        
        .toc-item.level-1 {
            font-weight: 600;
        }
        
        .toc-item.level-2 {
            padding-left: 20px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 16pt;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--border);
        }
        
        .section-content {
            margin-bottom: 15px;
        }
        
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }
        
        th {
            background: var(--primary);
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 8px 10px;
            border-bottom: 1px solid var(--border);
        }
        
        tr:nth-child(even) {
            background: var(--bg-light);
        }
        
        tr.footer-row {
            background: var(--bg-light);
            font-weight: 600;
        }
        
        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
        }
        
        .metric-card {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 18pt;
            font-weight: 700;
            color: var(--primary);
        }
        
        .metric-label {
            font-size: 9pt;
            color: var(--text-muted);
            margin-top: 5px;
        }
        
        .metric-change {
            font-size: 9pt;
            margin-top: 5px;
        }
        
        .metric-change.positive { color: #2f855a; }
        .metric-change.negative { color: #c53030; }
        
        /* Alerts */
        .alert {
            padding: 12px 15px;
            border-radius: 6px;
            margin: 10px 0;
            border-left: 4px solid;
        }
        
        .alert.critical {
            background: #fed7d7;
            border-color: #c53030;
        }
        
        .alert.warning {
            background: #fefcbf;
            border-color: #d69e2e;
        }
        
        .alert.info {
            background: #bee3f8;
            border-color: #3182ce;
        }
        
        .alert-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        /* Footer */
        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 20px;
            font-size: 8pt;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
        }
        
        @media print {
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${metadata.confidential ? '<div class="confidential-badge">POUFNE</div>' : ''}
    
    <!-- Cover Page -->
    <div class="cover-page">
        <div class="cover-title">${this.escapeHtml(title)}</div>
        <div class="cover-subtitle">${this.getReportTypeLabel(reportType)}</div>
        <div class="cover-meta">
            <p>Data: ${date}</p>
            ${metadata.author ? `<p>Autor: ${this.escapeHtml(metadata.author)}</p>` : ''}
            ${metadata.version ? `<p>Wersja: ${metadata.version}</p>` : ''}
        </div>
    </div>
    
    <!-- Table of Contents -->
    <div class="toc">
        <h2>Spis treści</h2>
        ${sections.map((s, i) => `
            <div class="toc-item level-1">
                <span>${i + 1}. ${this.escapeHtml(s.title)}</span>
                <span>${i + 3}</span>
            </div>
        `).join('')}
    </div>
    
    <!-- Content -->
    ${sections.map((section, i) => this.renderSection(section, i + 1)).join('\n')}
    
    <div class="page-footer">
        <span>StochFin Report</span>
        <span>${date}</span>
    </div>
</body>
</html>`;
    }

    // =============================================
    // Section Rendering
    // =============================================

    private renderSection(section: ReportSection, num: number): string {
        let contentHtml = '';

        switch (section.content.type) {
            case 'text':
                contentHtml = section.content.text
                    ? section.content.text.split('\n').map(p => `<p>${this.escapeHtml(p)}</p>`).join('')
                    : '';
                break;

            case 'table':
                contentHtml = section.content.table
                    ? this.renderTable(section.content.table)
                    : '';
                break;

            case 'metrics':
                contentHtml = section.content.metrics
                    ? this.renderMetrics(section.content.metrics)
                    : '';
                break;

            case 'alerts':
                contentHtml = section.content.alerts
                    ? this.renderAlerts(section.content.alerts)
                    : '';
                break;

            default:
                contentHtml = `<p>[${section.content.type} placeholder]</p>`;
        }

        return `
<div class="section">
    <h2 class="section-title">${num}. ${this.escapeHtml(section.title)}</h2>
    <div class="section-content">
        ${contentHtml}
    </div>
</div>`;
    }

    private renderTable(table: TableData): string {
        return `
<table>
    <thead>
        <tr>${table.headers.map(h => `<th>${this.escapeHtml(String(h))}</th>`).join('')}</tr>
    </thead>
    <tbody>
        ${table.rows.map(row => `
            <tr>${row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}</tr>
        `).join('')}
        ${table.footer_row ? `
            <tr class="footer-row">${table.footer_row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}</tr>
        ` : ''}
    </tbody>
</table>`;
    }

    private renderMetrics(metrics: MetricsData): string {
        return `
<div class="metrics-grid">
    ${metrics.items.map(item => `
        <div class="metric-card">
            <div class="metric-value">${item.value}${item.unit ? ` ${item.unit}` : ''}</div>
            <div class="metric-label">${this.escapeHtml(item.label)}</div>
            ${item.change !== undefined ? `
                <div class="metric-change ${item.change >= 0 ? 'positive' : 'negative'}">
                    ${item.change >= 0 ? '↑' : '↓'} ${Math.abs(item.change).toFixed(1)}%
                </div>
            ` : ''}
        </div>
    `).join('')}
</div>`;
    }

    private renderAlerts(alerts: Alert[]): string {
        return alerts.map(alert => `
<div class="alert ${alert.severity}">
    <div class="alert-title">${this.escapeHtml(alert.title)}</div>
    <div class="alert-message">${this.escapeHtml(alert.message)}</div>
</div>
        `).join('');
    }

    // =============================================
    // Helpers
    // =============================================

    private generateTOC(sections: ReportSection[]): TOCItem[] {
        return sections.map((section, i) => ({
            title: section.title,
            page: i + 3,
            level: 1
        }));
    }

    private getReportTypeLabel(type: ReportType): string {
        const labels: Record<ReportType, string> = {
            'risk_report': 'Raport Ryzyka',
            'simulation_report': 'Raport Symulacji Monte Carlo',
            'backtest_report': 'Raport Backtestu',
            'executive_summary': 'Podsumowanie dla Zarządu',
            'regulatory_report': 'Raport Regulacyjny'
        };
        return labels[type] || 'Raport';
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

export const pdfReportBuilderAgent = new PDFReportBuilderAgent();
