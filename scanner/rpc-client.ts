/**
 * RPC Client for fetching Solana program accounts
 */

import { Connection, PublicKey, GetProgramAccountsConfig, AccountInfo as SolanaAccountInfo } from '@solana/web3.js';
import { AccountInfo, ScannerConfig } from './types.js';
import chalk from 'chalk';

export class SolanaRPCClient {
    private connection: Connection;
    private config: ScannerConfig;

    constructor(rpcEndpoint: string, config: ScannerConfig) {
        this.connection = new Connection(rpcEndpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: config.rpcTimeout,
        });
        this.config = config;
    }

    /**
     * Fetch all accounts owned by a program
     */
    async getProgramAccounts(programId: PublicKey): Promise<AccountInfo[]> {
        console.log(chalk.blue('📡 Fetching program accounts...'));

        try {
            const accounts = await this.connection.getProgramAccounts(programId, {
                commitment: 'confirmed',
            });

            console.log(chalk.green(`✓ Found ${accounts.length} accounts`));

            return accounts.map(({ pubkey, account }) => ({
                pubkey: pubkey.toString(),
                owner: account.owner.toString(),
                lamports: account.lamports,
                data: account.data,
                executable: account.executable,
                rentEpoch: account.rentEpoch ?? 0,
            }));
        } catch (error) {
            console.error(chalk.red('✗ Failed to fetch program accounts:'), error);
            throw error;
        }
    }

    /**
     * Fetch detailed account information with retry logic
     */
    async getAccountInfo(pubkey: PublicKey, retries = 0): Promise<AccountInfo | null> {
        try {
            const account = await this.connection.getAccountInfo(pubkey, 'confirmed');

            if (!account) {
                return null;
            }

            return {
                pubkey: pubkey.toString(),
                owner: account.owner.toString(),
                lamports: account.lamports,
                data: account.data,
                executable: account.executable,
                rentEpoch: account.rentEpoch ?? 0,
            };
        } catch (error) {
            if (retries < this.config.retryAttempts) {
                console.log(chalk.yellow(`⚠ Retry ${retries + 1}/${this.config.retryAttempts} for ${pubkey.toString()}`));
                await this.delay(this.config.delayBetweenBatches);
                return this.getAccountInfo(pubkey, retries + 1);
            }
            console.error(chalk.red(`✗ Failed to fetch account ${pubkey.toString()}:`), error);
            return null;
        }
    }

    /**
     * Get current slot for activity tracking
     */
    async getCurrentSlot(): Promise<number> {
        try {
            const slot = await this.connection.getSlot('confirmed');
            console.log(chalk.blue(`📊 Current slot: ${slot}`));
            return slot;
        } catch (error) {
            console.error(chalk.red('✗ Failed to fetch current slot:'), error);
            throw error;
        }
    }

    /**
     * Fetch account activity (last write slot)
     * This is a heuristic - we check recent signatures
     */
    async getAccountLastActivity(pubkey: PublicKey): Promise<number | undefined> {
        try {
            const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 1 });

            if (signatures.length === 0) {
                return undefined;
            }

            return signatures[0].slot;
        } catch (error) {
            // Silent fail - this is optional metadata
            return undefined;
        }
    }

    /**
     * Batch fetch account activities with rate limiting
     */
    async batchGetAccountActivities(pubkeys: PublicKey[]): Promise<Map<string, number | undefined>> {
        console.log(chalk.blue(`🔄 Fetching activity data for ${pubkeys.length} accounts...`));

        const activities = new Map<string, number | undefined>();
        const batches = this.createBatches(pubkeys, this.config.maxAccountsPerBatch);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(chalk.gray(`  Processing batch ${i + 1}/${batches.length}...`));

            const batchResults = await Promise.all(
                batch.map(async (pubkey) => ({
                    pubkey: pubkey.toString(),
                    activity: await this.getAccountLastActivity(pubkey),
                }))
            );

            batchResults.forEach(({ pubkey, activity }) => {
                activities.set(pubkey, activity);
            });

            // Rate limiting between batches
            if (i < batches.length - 1) {
                await this.delay(this.config.delayBetweenBatches);
            }
        }

        console.log(chalk.green('✓ Activity data fetched'));
        return activities;
    }

    /**
     * Get minimum rent-exempt balance for an account
     */
    async getMinimumBalanceForRentExemption(dataLength: number): Promise<number> {
        return this.connection.getMinimumBalanceForRentExemption(dataLength);
    }

    /**
     * Helper: Create batches from array
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Helper: Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
