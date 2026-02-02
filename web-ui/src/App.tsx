import { useState } from 'react'
import Header from './components/Header'
import FileUploader from './components/FileUploader'
import Dashboard from './components/Dashboard'
import GraphVisualization from './components/GraphVisualization'
import './App.css'

export interface ScanResult {
    programId: string;
    scanTimestamp: number;
    currentSlot: number;
    rpcEndpoint: string;
    summary: {
        totalAccounts: number;
        activAccounts: number;
        dormantAccounts: number;
        highRiskAccounts: number;
        totalRecoverableSOL: number;
    };
    accounts: Array<{
        pubkey: string;
        riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
        confidenceScore: number;
        indicators: Array<{
            type: string;
            reason: string;
            weight: number;
        }>;
        estimatedRecoverableSOL: number;
    }>;
    graph: {
        nodes: Array<{
            id: string;
            pubkey: string;
            type: string;
            riskProfile?: any;
            metadata: any;
        }>;
        edges: Array<{
            source: string;
            target: string;
            relationship: string;
            isActive: boolean;
        }>;
    };
    authorities: any[];
}

function App() {
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);

    const handleFileLoad = (result: ScanResult) => {
        setScanResult(result);
    };

    const handleReset = () => {
        setScanResult(null);
    };

    return (
        <div className="app">
            <Header />

            <main className="main-content">
                {!scanResult ? (
                    <div className="container">
                        <div className="welcome-section">
                            <div className="welcome-content fade-in">
                                <h2>🔍 Automated Ghost-Account Scanner</h2>
                                <p className="subtitle">
                                    Load a scan result to visualize orphaned accounts, dormant state,
                                    and authority risks in your Solana program.
                                </p>

                                <div className="features-grid">
                                    <div className="feature-card card">
                                        <div className="feature-icon">👻</div>
                                        <h3>Ghost Detection</h3>
                                        <p>Identify orphaned PDAs and dormant accounts</p>
                                    </div>

                                    <div className="feature-card card">
                                        <div className="feature-icon">🔐</div>
                                        <h3>Authority Tracking</h3>
                                        <p>Map ownership and privilege relationships</p>
                                    </div>

                                    <div className="feature-card card">
                                        <div className="feature-icon">💰</div>
                                        <h3>Rent Recovery</h3>
                                        <p>Calculate recoverable SOL from unused accounts</p>
                                    </div>

                                    <div className="feature-card card">
                                        <div className="feature-icon">📊</div>
                                        <h3>Graph Visualization</h3>
                                        <p>Interactive relationship mapping</p>
                                    </div>
                                </div>

                                <FileUploader onFileLoad={handleFileLoad} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="results-view">
                        <Dashboard scanResult={scanResult} onReset={handleReset} />
                        <GraphVisualization graph={scanResult.graph} />
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
