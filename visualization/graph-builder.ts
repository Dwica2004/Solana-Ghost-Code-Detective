/**
 * Account Graph Builder
 * Constructs relationship graphs for visualization
 */

import {
    PDAccountInfo,
    AccountRiskProfile,
    AuthorityRelationship,
    AccountGraph,
    AccountGraphNode,
    AccountGraphEdge
} from '../scanner/types.js';
import chalk from 'chalk';

export class GraphBuilder {
    private programId: string;
    private currentSlot: number;

    constructor(programId: string, currentSlot: number) {
        this.programId = programId;
        this.currentSlot = currentSlot;
    }

    /**
     * Build complete account relationship graph
     */
    buildGraph(
        accounts: Array<PDAccountInfo & { lastWriteSlot?: number }>,
        riskProfiles: AccountRiskProfile[],
        authorities: AuthorityRelationship[]
    ): AccountGraph {
        console.log(chalk.blue('📊 Building account relationship graph...'));

        // Create nodes
        const nodes = this.buildNodes(accounts, riskProfiles);

        // Create edges
        const edges = this.buildEdges(accounts, authorities);

        console.log(chalk.green(`✓ Graph built: ${nodes.length} nodes, ${edges.length} edges`));

        return {
            nodes,
            edges,
            programId: this.programId,
            scanTimestamp: Date.now(),
            currentSlot: this.currentSlot,
        };
    }

    /**
     * Build graph nodes from accounts
     */
    private buildNodes(
        accounts: Array<PDAccountInfo & { lastWriteSlot?: number }>,
        riskProfiles: AccountRiskProfile[]
    ): AccountGraphNode[] {
        const riskMap = new Map(riskProfiles.map(p => [p.pubkey, p]));

        // Add program node
        const programNode: AccountGraphNode = {
            id: this.programId,
            pubkey: this.programId,
            type: 'program',
            metadata: {
                lamports: 0,
                owner: 'BPFLoaderUpgradeab1e11111111111111111111111',
                isPDA: false,
            },
        };

        // Add account nodes
        const accountNodes: AccountGraphNode[] = accounts.map(account => ({
            id: account.pubkey,
            pubkey: account.pubkey,
            type: account.isPDA ? 'pda' : 'account',
            riskProfile: riskMap.get(account.pubkey),
            metadata: {
                lamports: account.lamports,
                owner: account.owner,
                lastActivity: account.lastWriteSlot,
                isPDA: account.isPDA,
            },
        }));

        return [programNode, ...accountNodes];
    }

    /**
     * Build graph edges from relationships
     */
    private buildEdges(
        accounts: PDAccountInfo[],
        authorities: AuthorityRelationship[]
    ): AccountGraphEdge[] {
        const edges: AccountGraphEdge[] = [];

        // Add ownership edges
        accounts.forEach(account => {
            if (account.owner === this.programId) {
                edges.push({
                    source: this.programId,
                    target: account.pubkey,
                    relationship: 'owns',
                    isActive: true,
                });
            }
        });

        // Add PDA derivation edges
        accounts.forEach(account => {
            if (account.isPDA && account.seeds) {
                edges.push({
                    source: this.programId,
                    target: account.pubkey,
                    relationship: 'derived_from',
                    isActive: true,
                });
            }
        });

        // Add authority edges
        authorities.forEach(auth => {
            if (auth.privilege === 'owner' && auth.authority !== this.programId) {
                edges.push({
                    source: auth.authority,
                    target: auth.account,
                    relationship: 'authority',
                    isActive: auth.isActive,
                });
            }
        });

        return edges;
    }

    /**
     * Filter graph for visualization (limit node count)
     */
    filterGraphForVisualization(
        graph: AccountGraph,
        maxNodes: number = 1000,
        prioritizeHighRisk: boolean = true
    ): AccountGraph {
        if (graph.nodes.length <= maxNodes) {
            return graph;
        }

        console.log(chalk.yellow(`⚠️  Limiting graph to ${maxNodes} nodes for visualization`));

        // Always include program node
        const programNode = graph.nodes.find(n => n.type === 'program')!;

        // Sort other nodes by risk
        let otherNodes = graph.nodes.filter(n => n.type !== 'program');

        if (prioritizeHighRisk) {
            otherNodes = otherNodes.sort((a, b) => {
                const scoreA = a.riskProfile?.confidenceScore || 0;
                const scoreB = b.riskProfile?.confidenceScore || 0;
                return scoreB - scoreA;
            });
        }

        // Take top N nodes
        const selectedNodes = [programNode, ...otherNodes.slice(0, maxNodes - 1)];
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

        // Filter edges to only include selected nodes
        const selectedEdges = graph.edges.filter(
            e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        return {
            ...graph,
            nodes: selectedNodes,
            edges: selectedEdges,
        };
    }

    /**
     * Export graph to D3/Vis.js compatible format
     */
    exportForVisualization(graph: AccountGraph): {
        nodes: Array<{
            id: string;
            label: string;
            group: string;
            risk: string;
            lamports: number;
            color: string;
            size: number;
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
            color: string;
            dashes: boolean;
        }>;
    } {
        const nodes = graph.nodes.map(node => ({
            id: node.id,
            label: this.truncatePubkey(node.pubkey),
            group: node.type,
            risk: node.riskProfile?.riskLevel || 'Low',
            lamports: node.metadata.lamports,
            color: this.getRiskColor(node.riskProfile?.riskLevel),
            size: this.getNodeSize(node),
        }));

        const edges = graph.edges.map(edge => ({
            from: edge.source,
            to: edge.target,
            label: edge.relationship,
            color: edge.isActive ? '#888' : '#ff6b6b',
            dashes: !edge.isActive,
        }));

        return { nodes, edges };
    }

    /**
     * Helper: Truncate pubkey for display
     */
    private truncatePubkey(pubkey: string): string {
        if (pubkey.length <= 16) return pubkey;
        return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
    }

    /**
     * Helper: Get color based on risk level
     */
    private getRiskColor(riskLevel?: string): string {
        switch (riskLevel) {
            case 'Critical': return '#dc2626';
            case 'High': return '#ea580c';
            case 'Medium': return '#eab308';
            case 'Low': return '#22c55e';
            default: return '#6b7280';
        }
    }

    /**
     * Helper: Get node size based on importance
     */
    private getNodeSize(node: AccountGraphNode): number {
        if (node.type === 'program') return 30;

        const confidence = node.riskProfile?.confidenceScore || 0;
        return 10 + (confidence / 100) * 20; // 10-30 range
    }
}
