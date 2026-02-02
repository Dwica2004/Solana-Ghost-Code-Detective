/**
 * Ghost Account Detection Engine
 * Identifies orphaned, dormant, and high-risk accounts
 */

import { PDAccountInfo, RiskLevel, RiskIndicator, AccountRiskProfile } from '../scanner/types.js';
import chalk from 'chalk';

interface RiskScoringWeights {
    inactivity: number;
    authorityMismatch: number;
    orphanedPda: number;
    rentRecoverable: number;
}

interface RiskThresholds {
    low: number;
    medium: number;
    high: number;
    critical: number;
}

export class GhostDetector {
    private currentSlot: number;
    private inactiveSlotThreshold: number;
    private weights: RiskScoringWeights;
    private thresholds: RiskThresholds;

    constructor(
        currentSlot: number,
        inactiveSlotThreshold: number,
        weights: RiskScoringWeights,
        thresholds: RiskThresholds
    ) {
        this.currentSlot = currentSlot;
        this.inactiveSlotThreshold = inactiveSlotThreshold;
        this.weights = weights;
        this.thresholds = thresholds;
    }

    /**
     * Analyze all accounts and generate risk profiles
     */
    analyzeAccounts(
        accounts: Array<PDAccountInfo & { lastWriteSlot?: number }>,
        minRentExemptBalance: number
    ): AccountRiskProfile[] {
        console.log(chalk.blue('🕵️  Detecting ghost accounts...'));

        const profiles = accounts.map(account =>
            this.generateRiskProfile(account, minRentExemptBalance)
        );

        const ghostCount = profiles.filter(p =>
            p.riskLevel === 'High' || p.riskLevel === 'Critical'
        ).length;

        console.log(chalk.yellow(`⚠️  Found ${ghostCount} high-risk ghost accounts`));

        return profiles;
    }

    /**
     * Generate comprehensive risk profile for a single account
     */
    private generateRiskProfile(
        account: PDAccountInfo & { lastWriteSlot?: number },
        minRentExemptBalance: number
    ): AccountRiskProfile {
        const indicators: RiskIndicator[] = [];
        let totalWeight = 0;

        // 1. Check for inactivity
        const inactivityIndicator = this.checkInactivity(account);
        if (inactivityIndicator) {
            indicators.push(inactivityIndicator);
            totalWeight += inactivityIndicator.weight;
        }

        // 2. Check for orphaned PDA
        const orphanedPDAIndicator = this.checkOrphanedPDA(account);
        if (orphanedPDAIndicator) {
            indicators.push(orphanedPDAIndicator);
            totalWeight += orphanedPDAIndicator.weight;
        }

        // 3. Check rent recoverability
        const rentIndicator = this.checkRentRecoverable(account, minRentExemptBalance);
        if (rentIndicator) {
            indicators.push(rentIndicator);
            totalWeight += rentIndicator.weight;
        }

        // 4. Calculate confidence score (0-100)
        const confidenceScore = Math.min(100, totalWeight);

        // 5. Determine risk level
        const riskLevel = this.determineRiskLevel(confidenceScore);

        // 6. Estimate recoverable SOL
        const estimatedRecoverableSOL = this.calculateRecoverableSOL(
            account,
            minRentExemptBalance,
            riskLevel
        );

        return {
            pubkey: account.pubkey,
            riskLevel,
            confidenceScore,
            indicators,
            estimatedRecoverableSOL,
        };
    }

    /**
     * Check if account is inactive
     */
    private checkInactivity(
        account: PDAccountInfo & { lastWriteSlot?: number }
    ): RiskIndicator | null {
        if (!account.lastWriteSlot) {
            // No activity found - maximum inactivity risk
            return {
                type: 'inactivity',
                reason: 'No write activity detected in recent history',
                weight: this.weights.inactivity * 100,
            };
        }

        const inactiveSince = this.currentSlot - account.lastWriteSlot;

        if (inactiveSince > this.inactiveSlotThreshold) {
            const daysInactive = Math.floor((inactiveSince * 0.4) / 86400); // ~0.4s per slot

            return {
                type: 'inactivity',
                reason: `No write activity for ${inactiveSince.toLocaleString()} slots (~${daysInactive} days)`,
                weight: this.weights.inactivity * 100,
            };
        }

        return null;
    }

    /**
     * Check if PDA is orphaned (not reachable via common patterns)
     */
    private checkOrphanedPDA(account: PDAccountInfo): RiskIndicator | null {
        if (!account.isPDA) {
            return null;
        }

        // If we couldn't derive the PDA with common seeds, it may be orphaned
        if (!account.seeds || account.seeds.length === 0) {
            return {
                type: 'orphaned_pda',
                reason: 'PDA detected but derivation path unknown - potentially orphaned',
                weight: this.weights.orphanedPda * 100,
            };
        }

        return null;
    }

    /**
     * Check if account has recoverable rent
     */
    private checkRentRecoverable(
        account: PDAccountInfo,
        minRentExemptBalance: number
    ): RiskIndicator | null {
        const recoverableAmount = account.lamports - minRentExemptBalance;

        if (recoverableAmount > 0) {
            const recoverableSOL = recoverableAmount / 1e9;

            return {
                type: 'rent_recoverable',
                reason: `${recoverableSOL.toFixed(4)} SOL potentially recoverable`,
                weight: this.weights.rentRecoverable * Math.min(100, recoverableSOL * 10),
            };
        }

        return null;
    }

    /**
     * Determine risk level based on confidence score
     */
    private determineRiskLevel(confidenceScore: number): RiskLevel {
        if (confidenceScore >= this.thresholds.critical) {
            return 'Critical';
        } else if (confidenceScore >= this.thresholds.high) {
            return 'High';
        } else if (confidenceScore >= this.thresholds.medium) {
            return 'Medium';
        } else {
            return 'Low';
        }
    }

    /**
     * Calculate recoverable SOL amount
     */
    private calculateRecoverableSOL(
        account: PDAccountInfo,
        minRentExemptBalance: number,
        riskLevel: RiskLevel
    ): number {
        // Only high-risk dormant accounts are considered recoverable
        if (riskLevel === 'High' || riskLevel === 'Critical') {
            const recoverableAmount = Math.max(0, account.lamports - minRentExemptBalance);
            return recoverableAmount / 1e9; // Convert lamports to SOL
        }

        return 0;
    }

    /**
     * Generate summary statistics
     */
    static generateSummary(profiles: AccountRiskProfile[]): {
        totalAccounts: number;
        activeAccounts: number;
        dormantAccounts: number;
        highRiskAccounts: number;
        totalRecoverableSOL: number;
    } {
        const totalAccounts = profiles.length;
        const activeAccounts = profiles.filter(p => p.riskLevel === 'Low').length;
        const dormantAccounts = profiles.filter(p =>
            p.indicators.some(i => i.type === 'inactivity')
        ).length;
        const highRiskAccounts = profiles.filter(p =>
            p.riskLevel === 'High' || p.riskLevel === 'Critical'
        ).length;
        const totalRecoverableSOL = profiles.reduce(
            (sum, p) => sum + p.estimatedRecoverableSOL,
            0
        );

        return {
            totalAccounts,
            activeAccounts,
            dormantAccounts,
            highRiskAccounts,
            totalRecoverableSOL,
        };
    }
}
