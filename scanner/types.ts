/**
 * Core type definitions for the Solana Ghost-Code Detective
 */

import { PublicKey } from '@solana/web3.js';

export interface ScanConfig {
    programId: string;
    rpcEndpoint: string;
    inactiveSlots: number;
    outputPath?: string;
}

export interface AccountInfo {
    pubkey: string;
    owner: string;
    lamports: number;
    data: Buffer;
    executable: boolean;
    rentEpoch: number;
    lastWriteSlot?: number;
}

export interface PDAccountInfo extends AccountInfo {
    isPDA: boolean;
    seeds?: string[];
    bump?: number;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RiskIndicator {
    type: 'inactivity' | 'authority_mismatch' | 'orphaned_pda' | 'rent_recoverable' | 'legacy_authority';
    reason: string;
    weight: number;
}

export interface AccountRiskProfile {
    pubkey: string;
    riskLevel: RiskLevel;
    confidenceScore: number; // 0-100
    indicators: RiskIndicator[];
    estimatedRecoverableSOL: number;
}

export interface AuthorityRelationship {
    account: string;
    authority: string;
    privilege: 'signer' | 'writable' | 'owner';
    isActive: boolean;
}

export interface AccountGraphNode {
    id: string;
    pubkey: string;
    type: 'program' | 'pda' | 'account';
    riskProfile?: AccountRiskProfile;
    metadata: {
        lamports: number;
        owner: string;
        lastActivity?: number;
        isPDA: boolean;
    };
}

export interface AccountGraphEdge {
    source: string;
    target: string;
    relationship: 'owns' | 'authority' | 'derived_from' | 'writes_to';
    isActive: boolean;
}

export interface AccountGraph {
    nodes: AccountGraphNode[];
    edges: AccountGraphEdge[];
    programId: string;
    scanTimestamp: number;
    currentSlot: number;
}

export interface ScanResult {
    programId: string;
    scanTimestamp: number;
    currentSlot: number;
    rpcEndpoint: string;
    summary: {
        totalAccounts: number;
        activeAccounts: number;
        dormantAccounts: number;
        highRiskAccounts: number;
        totalRecoverableSOL: number;
    };
    accounts: AccountRiskProfile[];
    graph: AccountGraph;
    authorities: AuthorityRelationship[];
}

export interface ReportConfig {
    inputPath: string;
    format: 'json' | 'markdown';
    outputPath?: string;
    minimumRiskLevel?: RiskLevel;
}

export interface ScannerConfig {
    maxAccountsPerBatch: number;
    rpcTimeout: number;
    retryAttempts: number;
    delayBetweenBatches: number;
}
