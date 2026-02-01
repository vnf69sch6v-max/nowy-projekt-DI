'use client';

import { useState, useEffect } from 'react';
import { agentMeta, getAgentCounts } from '@/lib/agents';

// =============================================
// Types
// =============================================

interface AgentExecution {
    id: string;
    agent_id: string;
    agent_name: string;
    status: 'running' | 'success' | 'failed';
    duration_ms: number;
    timestamp: Date;
    trigger: string;
}

interface AgentStatus {
    id: string;
    name: string;
    category: string;
    icon: string;
    color: string;
    lastRun: Date | null;
    runsToday: number;
    avgDuration: number;
    status: 'idle' | 'running' | 'error';
}

// =============================================
// Mock Data
// =============================================

const mockExecutions: AgentExecution[] = [
    { id: '1', agent_id: 'agent-var-calculator', agent_name: 'VaR Calculator', status: 'success', duration_ms: 1234, timestamp: new Date(), trigger: 'cron' },
    { id: '2', agent_id: 'agent-early-warning', agent_name: 'Early Warning', status: 'success', duration_ms: 856, timestamp: new Date(Date.now() - 300000), trigger: 'cron' },
    { id: '3', agent_id: 'agent-anomaly-detector', agent_name: 'Anomaly Detector', status: 'running', duration_ms: 0, timestamp: new Date(), trigger: 'data_event' },
    { id: '4', agent_id: 'agent-nl-summarizer', agent_name: 'NL Summarizer', status: 'success', duration_ms: 2341, timestamp: new Date(Date.now() - 600000), trigger: 'user_action' },
    { id: '5', agent_id: 'agent-stress-tester', agent_name: 'Stress Tester', status: 'failed', duration_ms: 5000, timestamp: new Date(Date.now() - 1200000), trigger: 'cron' },
];

// =============================================
// Agent Monitor Page
// =============================================

export default function AgentMonitorPage() {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [executions, setExecutions] = useState<AgentExecution[]>(mockExecutions);
    const [isLive, setIsLive] = useState(true);
    const counts = getAgentCounts();

    // Simulate live updates
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            // Simulate random agent activity
            const randomAgent = agentMeta[Math.floor(Math.random() * agentMeta.length)];
            const newExecution: AgentExecution = {
                id: crypto.randomUUID(),
                agent_id: randomAgent.id,
                agent_name: randomAgent.name,
                status: Math.random() > 0.1 ? 'success' : 'failed',
                duration_ms: Math.floor(Math.random() * 3000) + 500,
                timestamp: new Date(),
                trigger: ['cron', 'user_action', 'data_event'][Math.floor(Math.random() * 3)]
            };
            setExecutions(prev => [newExecution, ...prev.slice(0, 19)]);
        }, 8000);
        return () => clearInterval(interval);
    }, [isLive]);

    const filteredAgents = activeCategory
        ? agentMeta.filter(a => a.category === activeCategory)
        : agentMeta;

    const categories = [
        { id: 'data', name: 'Data', icon: '📊', color: '#3b82f6', count: counts.data },
        { id: 'models', name: 'Models', icon: '🧮', color: '#8b5cf6', count: counts.models },
        { id: 'risk', name: 'Risk', icon: '📉', color: '#ef4444', count: counts.risk },
        { id: 'reports', name: 'Reports', icon: '📄', color: '#22c55e', count: counts.reports },
    ];

    return (
        <div className="agent-monitor">
            {/* Header */}
            <header className="monitor-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="logo">
                            <span className="logo-icon">🤖</span>
                            <h1>Agent Monitor</h1>
                        </div>
                        <span className="badge">{counts.total} AI Agents</span>
                    </div>
                    <div className="header-right">
                        <button
                            className={`live-toggle ${isLive ? 'active' : ''}`}
                            onClick={() => setIsLive(!isLive)}
                        >
                            <span className="pulse"></span>
                            {isLive ? 'LIVE' : 'PAUSED'}
                        </button>
                        <div className="time">{new Date().toLocaleTimeString('pl-PL')}</div>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <section className="stats-grid">
                <div className="stat-card gradient-blue">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <div className="stat-value">{executions.filter(e => e.status === 'running').length}</div>
                        <div className="stat-label">Running Now</div>
                    </div>
                </div>
                <div className="stat-card gradient-green">
                    <div className="stat-icon">✓</div>
                    <div className="stat-content">
                        <div className="stat-value">{executions.filter(e => e.status === 'success').length}</div>
                        <div className="stat-label">Successful</div>
                    </div>
                </div>
                <div className="stat-card gradient-red">
                    <div className="stat-icon">✕</div>
                    <div className="stat-content">
                        <div className="stat-value">{executions.filter(e => e.status === 'failed').length}</div>
                        <div className="stat-label">Failed</div>
                    </div>
                </div>
                <div className="stat-card gradient-purple">
                    <div className="stat-icon">⏱</div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {Math.round(executions.filter(e => e.status === 'success').reduce((sum, e) => sum + e.duration_ms, 0) / Math.max(1, executions.filter(e => e.status === 'success').length))}ms
                        </div>
                        <div className="stat-label">Avg Duration</div>
                    </div>
                </div>
            </section>

            {/* Category Tabs */}
            <section className="category-tabs">
                <button
                    className={`category-tab ${activeCategory === null ? 'active' : ''}`}
                    onClick={() => setActiveCategory(null)}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{ '--cat-color': cat.color } as React.CSSProperties}
                    >
                        <span className="cat-icon">{cat.icon}</span>
                        {cat.name}
                        <span className="cat-count">{cat.count}</span>
                    </button>
                ))}
            </section>

            {/* Main Content */}
            <div className="main-content">
                {/* Agent Grid */}
                <section className="agent-grid">
                    {filteredAgents.map((agent, index) => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            executions={executions.filter(e => e.agent_id === agent.id)}
                            delay={index * 50}
                        />
                    ))}
                </section>

                {/* Activity Feed */}
                <section className="activity-feed">
                    <div className="feed-header">
                        <h2>Activity Feed</h2>
                        <span className="feed-count">{executions.length} events</span>
                    </div>
                    <div className="feed-list">
                        {executions.slice(0, 10).map((execution, index) => (
                            <div
                                key={execution.id}
                                className={`feed-item ${execution.status}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="feed-status">
                                    {execution.status === 'running' && <span className="spinner"></span>}
                                    {execution.status === 'success' && <span className="check">✓</span>}
                                    {execution.status === 'failed' && <span className="cross">✕</span>}
                                </div>
                                <div className="feed-content">
                                    <div className="feed-agent">{execution.agent_name}</div>
                                    <div className="feed-meta">
                                        <span className="feed-trigger">{execution.trigger}</span>
                                        <span className="feed-time">{formatTime(execution.timestamp)}</span>
                                    </div>
                                </div>
                                <div className="feed-duration">
                                    {execution.status !== 'running' && `${execution.duration_ms}ms`}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <style jsx>{`
                .agent-monitor {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%);
                    color: #e4e4e7;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                /* Header */
                .monitor-header {
                    background: rgba(15, 15, 20, 0.8);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }

                .header-content {
                    max-width: 1600px;
                    margin: 0 auto;
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .logo-icon {
                    font-size: 28px;
                    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
                }

                .logo h1 {
                    font-size: 20px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .badge {
                    background: rgba(139, 92, 246, 0.2);
                    color: #a78bfa;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .live-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 20px;
                    color: #22c55e;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .live-toggle.active .pulse {
                    width: 8px;
                    height: 8px;
                    background: #22c55e;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }

                .time {
                    font-size: 14px;
                    color: #71717a;
                    font-variant-numeric: tabular-nums;
                }

                /* Stats Grid */
                .stats-grid {
                    max-width: 1600px;
                    margin: 24px auto;
                    padding: 0 24px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                }

                .gradient-blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); }
                .gradient-green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%); }
                .gradient-red { background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%); }
                .gradient-purple { background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%); }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                }

                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    font-variant-numeric: tabular-nums;
                }

                .stat-label {
                    font-size: 13px;
                    color: #71717a;
                }

                /* Category Tabs */
                .category-tabs {
                    max-width: 1600px;
                    margin: 0 auto;
                    padding: 0 24px 24px;
                    display: flex;
                    gap: 8px;
                }

                .category-tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    color: #a1a1aa;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .category-tab:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.15);
                }

                .category-tab.active {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--cat-color, #3b82f6);
                    color: #fff;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
                }

                .cat-icon {
                    font-size: 16px;
                }

                .cat-count {
                    margin-left: 4px;
                    padding: 2px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    font-size: 11px;
                }

                /* Main Content */
                .main-content {
                    max-width: 1600px;
                    margin: 0 auto;
                    padding: 0 24px 40px;
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 24px;
                }

                /* Agent Grid */
                .agent-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }

                /* Activity Feed */
                .activity-feed {
                    background: rgba(15, 15, 20, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 20px;
                    height: fit-content;
                    position: sticky;
                    top: 100px;
                }

                .feed-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .feed-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                }

                .feed-count {
                    font-size: 12px;
                    color: #71717a;
                }

                .feed-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .feed-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 12px;
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .feed-status {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    font-size: 14px;
                }

                .feed-item.success .feed-status {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                }

                .feed-item.failed .feed-status {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .feed-item.running .feed-status {
                    background: rgba(59, 130, 246, 0.15);
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(59, 130, 246, 0.3);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .feed-content {
                    flex: 1;
                    min-width: 0;
                }

                .feed-agent {
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .feed-meta {
                    display: flex;
                    gap: 8px;
                    font-size: 11px;
                    color: #71717a;
                    margin-top: 2px;
                }

                .feed-trigger {
                    padding: 1px 6px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }

                .feed-duration {
                    font-size: 12px;
                    color: #71717a;
                    font-variant-numeric: tabular-nums;
                }

                @media (max-width: 1200px) {
                    .main-content {
                        grid-template-columns: 1fr;
                    }
                    .activity-feed {
                        position: static;
                    }
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                    .category-tabs {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
}

// =============================================
// Agent Card Component
// =============================================

function AgentCard({
    agent,
    executions,
    delay
}: {
    agent: typeof agentMeta[0];
    executions: AgentExecution[];
    delay: number;
}) {
    const lastExecution = executions[0];
    const isRunning = executions.some(e => e.status === 'running');
    const successRate = executions.length > 0
        ? Math.round(executions.filter(e => e.status === 'success').length / executions.length * 100)
        : 100;

    return (
        <div
            className="agent-card"
            style={{
                animationDelay: `${delay}ms`,
                '--agent-color': agent.color
            } as React.CSSProperties}
        >
            <div className="agent-header">
                <div className="agent-icon">{agent.icon}</div>
                <div className="agent-status">
                    {isRunning ? (
                        <span className="status-running"><span className="dot"></span>Running</span>
                    ) : (
                        <span className="status-idle">Idle</span>
                    )}
                </div>
            </div>
            <div className="agent-name">{agent.name}</div>
            <div className="agent-category">{agent.category}</div>
            <div className="agent-stats">
                <div className="agent-stat">
                    <span className="stat-val">{executions.length}</span>
                    <span className="stat-lbl">Runs</span>
                </div>
                <div className="agent-stat">
                    <span className="stat-val">{successRate}%</span>
                    <span className="stat-lbl">Success</span>
                </div>
            </div>
            {lastExecution && (
                <div className="agent-last-run">
                    Last: {formatTime(lastExecution.timestamp)}
                </div>
            )}

            <style jsx>{`
                .agent-card {
                    background: rgba(20, 20, 28, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 20px;
                    transition: all 0.3s ease;
                    animation: cardIn 0.4s ease-out backwards;
                    cursor: pointer;
                }

                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .agent-card:hover {
                    border-color: var(--agent-color);
                    transform: translateY(-4px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3),
                                0 0 30px rgba(59, 130, 246, 0.1);
                }

                .agent-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .agent-icon {
                    font-size: 28px;
                    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
                }

                .agent-status {
                    font-size: 11px;
                    font-weight: 500;
                }

                .status-running {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #22c55e;
                }

                .status-running .dot {
                    width: 6px;
                    height: 6px;
                    background: #22c55e;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }

                .status-idle {
                    color: #71717a;
                }

                .agent-name {
                    font-size: 15px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .agent-category {
                    font-size: 12px;
                    color: var(--agent-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 16px;
                }

                .agent-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 12px;
                }

                .agent-stat {
                    display: flex;
                    flex-direction: column;
                }

                .stat-val {
                    font-size: 18px;
                    font-weight: 600;
                    font-variant-numeric: tabular-nums;
                }

                .stat-lbl {
                    font-size: 11px;
                    color: #71717a;
                }

                .agent-last-run {
                    font-size: 11px;
                    color: #52525b;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
            `}</style>
        </div>
    );
}

// =============================================
// Helper Functions
// =============================================

function formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('pl-PL');
}
