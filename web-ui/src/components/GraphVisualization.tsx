import { useEffect, useRef, useState } from 'react'
import { Network } from 'vis-network'
import './GraphVisualization.css'

interface GraphProps {
    graph: {
        nodes: Array<{
            id: string;
            pubkey: string;
            type: string;
            riskProfile?: {
                riskLevel: string;
                confidenceScore: number;
                estimatedRecoverableSOL: number;
            };
            metadata: {
                lamports: number;
                owner: string;
                lastActivity?: number;
                isPDA: boolean;
            };
        }>;
        edges: Array<{
            source: string;
            target: string;
            relationship: string;
            isActive: boolean;
        }>;
    };
}

export default function GraphVisualization({ graph }: GraphProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const networkRef = useRef<Network | null>(null)
    const [selectedNode, setSelectedNode] = useState<any>(null)
    const [filter, setFilter] = useState<'all' | 'high-risk'>('all')

    useEffect(() => {
        if (!containerRef.current) return

        const getRiskColor = (riskLevel?: string) => {
            switch (riskLevel) {
                case 'Critical': return '#dc2626'
                case 'High': return '#ea580c'
                case 'Medium': return '#eab308'
                case 'Low': return '#22c55e'
                default: return '#6b7280'
            }
        }

        const getNodeSize = (node: any) => {
            if (node.type === 'program') return 30
            const confidence = node.riskProfile?.confidenceScore || 0
            return 10 + (confidence / 100) * 20
        }

        const truncatePubkey = (pubkey: string) => {
            if (pubkey.length <= 16) return pubkey
            return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`
        }

        // Filter nodes based on selection
        let filteredNodes = graph.nodes
        if (filter === 'high-risk') {
            filteredNodes = graph.nodes.filter(node =>
                node.type === 'program' ||
                node.riskProfile?.riskLevel === 'High' ||
                node.riskProfile?.riskLevel === 'Critical'
            )
        }

        const nodeIds = new Set(filteredNodes.map(n => n.id))
        const filteredEdges = graph.edges.filter(e =>
            nodeIds.has(e.source) && nodeIds.has(e.target)
        )

        // Prepare data for vis-network
        const nodes = filteredNodes.map(node => ({
            id: node.id,
            label: truncatePubkey(node.pubkey),
            title: `${node.pubkey}\nType: ${node.type}\nRisk: ${node.riskProfile?.riskLevel || 'N/A'}`,
            color: {
                background: getRiskColor(node.riskProfile?.riskLevel),
                border: node.type === 'program' ? '#3b82f6' : getRiskColor(node.riskProfile?.riskLevel),
                highlight: {
                    background: getRiskColor(node.riskProfile?.riskLevel),
                    border: '#60a5fa'
                }
            },
            size: getNodeSize(node),
            shape: node.type === 'program' ? 'diamond' : 'dot',
            font: {
                color: '#f8fafc',
                size: 12,
                face: 'Inter'
            },
            borderWidth: node.type === 'program' ? 3 : 2,
            shadow: node.type === 'program' || node.riskProfile?.riskLevel === 'Critical',
            data: node // Store full node data
        }))

        const edges = filteredEdges.map(edge => ({
            from: edge.source,
            to: edge.target,
            label: edge.relationship.replace(/_/g, ' '),
            color: edge.isActive ? '#888' : '#ff6b6b',
            dashes: !edge.isActive,
            arrows: 'to',
            font: {
                color: '#94a3b8',
                size: 10,
                align: 'middle'
            },
            smooth: {
                type: 'continuous'
            }
        }))

        // Create network
        const data = { nodes, edges }
        const options = {
            nodes: {
                borderWidthSelected: 3
            },
            edges: {
                width: 1.5,
                selectionWidth: 3
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -50000,
                    centralGravity: 0.3,
                    springLength: 150,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.5
                },
                stabilization: {
                    iterations: 150,
                    fit: true
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 100,
                zoomView: true,
                dragView: true
            },
            layout: {
                improvedLayout: true
            }
        }

        networkRef.current = new Network(containerRef.current, data, options)

        // Handle node selection
        networkRef.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0]
                const node = filteredNodes.find(n => n.id === nodeId)
                setSelectedNode(node)
            } else {
                setSelectedNode(null)
            }
        })

        return () => {
            networkRef.current?.destroy()
        }
    }, [graph, filter])

    return (
        <div className="graph-visualization">
            <div className="graph-header card">
                <div className="graph-title">
                    <h3>📊 Account Relationship Graph</h3>
                    <p className="graph-subtitle">
                        Hover over nodes for details • Click to inspect • Drag to explore
                    </p>
                </div>

                <div className="graph-controls">
                    <button
                        className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('all')}
                    >
                        All Accounts
                    </button>
                    <button
                        className={`btn ${filter === 'high-risk' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('high-risk')}
                    >
                        High-Risk Only
                    </button>
                </div>
            </div>

            <div className="graph-content">
                <div className="graph-container card-elevated" ref={containerRef} />

                {selectedNode && (
                    <div className="node-inspector card-elevated fade-in">
                        <h4>🔍 Account Details</h4>

                        <div className="inspector-section">
                            <div className="inspector-label">Address</div>
                            <code className="inspector-value">{selectedNode.pubkey}</code>
                        </div>

                        <div className="inspector-section">
                            <div className="inspector-label">Type</div>
                            <div className="inspector-value">
                                {selectedNode.type} {selectedNode.metadata.isPDA && '(PDA)'}
                            </div>
                        </div>

                        {selectedNode.riskProfile && (
                            <>
                                <div className="inspector-section">
                                    <div className="inspector-label">Risk Level</div>
                                    <span className={`badge badge-${selectedNode.riskProfile.riskLevel.toLowerCase()}`}>
                                        {selectedNode.riskProfile.riskLevel}
                                    </span>
                                </div>

                                <div className="inspector-section">
                                    <div className="inspector-label">Confidence Score</div>
                                    <div className="inspector-value">
                                        {selectedNode.riskProfile.confidenceScore}/100
                                    </div>
                                </div>

                                <div className="inspector-section">
                                    <div className="inspector-label">Recoverable SOL</div>
                                    <div className="inspector-value">
                                        {selectedNode.riskProfile.estimatedRecoverableSOL.toFixed(4)} SOL
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="inspector-section">
                            <div className="inspector-label">Balance</div>
                            <div className="inspector-value">
                                {(selectedNode.metadata.lamports / 1e9).toFixed(9)} SOL
                            </div>
                        </div>

                        <button className="btn btn-secondary" onClick={() => setSelectedNode(null)}>
                            Close
                        </button>
                    </div>
                )}
            </div>

            <div className="graph-legend card">
                <h4>Legend</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#6b7280' }}></div>
                        <span>Program</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#22c55e' }}></div>
                        <span>Low Risk</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#eab308' }}></div>
                        <span>Medium Risk</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#ea580c' }}></div>
                        <span>High Risk</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#dc2626' }}></div>
                        <span>Critical Risk</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
