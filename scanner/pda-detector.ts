/**
 * PDA (Program Derived Address) Detection and Analysis
 */

import { PublicKey } from '@solana/web3.js';
import { AccountInfo, PDAccountInfo } from './types.js';
import chalk from 'chalk';

export class PDADetector {
    private programId: PublicKey;

    constructor(programId: PublicKey) {
        this.programId = programId;
    }

    /**
     * Analyze an account to determine if it's a PDA
     * Uses heuristics since we don't have access to seeds
     */
    async analyzePDA(account: AccountInfo): Promise<PDAccountInfo> {
        const pubkey = new PublicKey(account.pubkey);

        // Check if account is on the ed25519 curve
        // PDAs are NOT on the curve
        const isPDA = !PublicKey.isOnCurve(pubkey.toBytes());

        // Try to find common PDA patterns
        let seeds: string[] | undefined;
        let bump: number | undefined;

        if (isPDA) {
            // Attempt to derive common seed patterns
            const derivationResult = await this.attemptCommonDerivations(pubkey);
            if (derivationResult) {
                seeds = derivationResult.seeds;
                bump = derivationResult.bump;
            }
        }

        return {
            ...account,
            isPDA,
            seeds,
            bump,
        };
    }

    /**
     * Batch analyze accounts for PDA properties
     */
    async batchAnalyzePDAs(accounts: AccountInfo[]): Promise<PDAccountInfo[]> {
        console.log(chalk.blue(`🔍 Analyzing ${accounts.length} accounts for PDA patterns...`));

        const pdAccounts = await Promise.all(
            accounts.map(account => this.analyzePDA(account))
        );

        const pdaCount = pdAccounts.filter(acc => acc.isPDA).length;
        console.log(chalk.green(`✓ Identified ${pdaCount} PDAs`));

        return pdAccounts;
    }

    /**
     * Attempt to derive PDA using common seed patterns
     * Returns seeds and bump if successful
     */
    private async attemptCommonDerivations(
        targetPubkey: PublicKey
    ): Promise<{ seeds: string[]; bump: number } | null> {
        // Common seed patterns in Solana programs
        const commonSeeds = [
            ['metadata'],
            ['vault'],
            ['pool'],
            ['authority'],
            ['state'],
            ['config'],
            ['escrow'],
            ['mint'],
            ['token'],
            ['user'],
            ['account'],
            ['data'],
        ];

        // Try each pattern
        for (const seedPattern of commonSeeds) {
            for (let bump = 255; bump >= 0; bump--) {
                try {
                    const seeds = seedPattern.map(s => Buffer.from(s));
                    seeds.push(Buffer.from([bump]));

                    const [derivedPubkey] = await PublicKey.findProgramAddress(
                        seeds.map(s => s),
                        this.programId
                    );

                    if (derivedPubkey.equals(targetPubkey)) {
                        return {
                            seeds: seedPattern,
                            bump,
                        };
                    }
                } catch (error) {
                    // Continue trying
                }
            }
        }

        return null;
    }

    /**
     * Determine if a PDA is reachable based on common patterns
     * This is a heuristic - in production, would analyze program instructions
     */
    isLikelyReachable(pdAccount: PDAccountInfo): boolean {
        // If we successfully derived the PDA with common seeds, likely reachable
        if (pdAccount.seeds && pdAccount.seeds.length > 0) {
            return true;
        }

        // If it's a PDA but we couldn't derive it, potentially orphaned
        if (pdAccount.isPDA && !pdAccount.seeds) {
            return false;
        }

        // Non-PDAs are assumed reachable
        return true;
    }

    /**
     * Calculate PDA derivation path depth
     * Used for risk scoring - deeper = potentially more orphaned
     */
    getDerivationDepth(pdAccount: PDAccountInfo): number {
        if (!pdAccount.isPDA || !pdAccount.seeds) {
            return 0;
        }

        return pdAccount.seeds.length;
    }
}
