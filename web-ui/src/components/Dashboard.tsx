import type { ScanResult } from '../App'
import './Dashboard.css'

interface DashboardProps {
    scanResult: ScanResult;
    onReset: () => void;
}

export default function Dashboard({ scanResult, onReset }: DashboardProps) {
    const { summary, programId, scanTimestamp, currentSlot } = scanResult

    const getRiskBadge = (level: string) => {
        const classMap: Record<string, string> = {
            'Low': 'badge-success',
            'Medium': 'badge-warning',
            'High': 'badge-error',
            'Critical': 'badge-critical'
        }
        return `badge ${classMap[level] || 'badge-success'}`
    }

    const topRiskAccounts = scanResult.accounts
        .filter(a => a.riskLevel === 'Critical' || a.riskLevel === 'High')
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 5)

    return (
        <div className="dashboard">
            {/* Metadata */}
            <div className="dashboard-header card-elevated">
                <div className="header-content">
                    <div>
                        <h2>Scan Results</h2>
                        <div className="metadata">
                            <div className="metadata-item">
                                <span className="label">Program ID:</span>
                                <code className="value">{programId}</code>
                            </div>
                            <div className="metadata-item">
                                <span className="label">Scanned:</span>
                                <span className="value">{new Date(scanTimestamp).toLocaleString()}</span>
                            </div>
                            <div className="metadata-item">
                                <span className="label">Slot:</span>
                                <span className="value">{currentSlot.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-secondary" onClick={onReset}>
                        Load New Scan
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Accounts</div>
                        <div className="stat-value">{summary.totalAccounts}</div>
                    </div>
                </div>

                <div className="stat-card card stat-success">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">Active Accounts</div>
                        <div className="stat-value">{summary.activAccounts}</div>
                    </div>
                </div>

                <div className="stat-card card stat-warning">
                    <div className="stat-icon">💤</div>
                    <div className="stat-content">
                        <div className="stat-label">Dormant Accounts</div>
                        <div className="stat-value">{summary.dormantAccounts}</div>
                    </div>
                </div>

                <div className="stat-card card stat-error">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-content">
                        <div className="stat-label">High-Risk Accounts</div>
                        <div className="stat-value">{summary.highRiskAccounts}</div>
                    </div>
                </div>

                <div className="stat-card card stat-primary">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">Recoverable SOL</div>
                        <div className="stat-value">{summary.totalRecoverableSOL.toFixed(4)}</div>
                    </div>
                </div>
            </div>

            {/* Top Risk Accounts */}
            {topRiskAccounts.length > 0 && (
                <div className="risk-accounts-section card-elevated">
                    <h3>🚨 Top High-Risk Accounts</h3>
                    <div className="risk-accounts-list">
                        {topRiskAccounts.map((account, idx) => (
                            <div key={account.pubkey} className="risk-account-item">
                                <div className="account-header">
                                    <div className="account-rank">#{idx + 1}</div>
                                    <code className="account-pubkey">{account.pubkey}</code>
                                    <span className={getRiskBadge(account.riskLevel)}>
                                        {account.riskLevel}
                                    </span>
                                </div>

                                <div className="account-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Confidence:</span>
                                        <span className="detail-value">{account.confidenceScore}/100</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Recoverable:</span>
                                        <span className="detail-value">{account.estimatedRecoverableSOL.toFixed(4)} SOL</span>
                                    </div>
                                </div>

                                <div className="account-indicators">
                                    {account.indicators.map((indicator, i) => (
                                        <div key={i} className="indicator-tag">
                                            {indicator.type.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
