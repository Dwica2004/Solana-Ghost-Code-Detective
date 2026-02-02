/**
 * Core scanner orchestration
 * Coordinates RPC fetching, PDA detection, and data enrichment
 */

import { PublicKey } from '@solana/web3.js';
import { SolanaRPCClient } from './rpc-client.js';
import { PDADetector } from './pda-detector.js';
import { AccountInfo, PDAccountInfo, ScanConfig, ScannerConfig } from './types.js';
import chalk from 'chalk';
import ora from 'ora';

export class ProgramScanner {
    private rpcClient: SolanaRPCClient;
    private pdaDetector: PDADetector;
    private config: ScanConfig;
    private scannerConfig: ScannerConfig;

    constructor(config: ScanConfig, scannerConfig: ScannerConfig) {
        this.config = config;
        this.scannerConfig = scannerConfig;
        this.rpcClient = new SolanaRPCClient(config.rpcEndpoint, scannerConfig);
        this.pdaDetector = new PDADetector(new PublicKey(config.programId));
    }

    /**
     * Execute full program scan
     */
    async scan(): Promise<{
        accounts: PDAccountInfo[];
        currentSlot: number;
        activities: Map<string, number | undefined>;
    }> {
        const spinner = ora('Starting program scan...').start();

        try {
            // Step 1: Get current slot
            spinner.text = 'Fetching current slot...';
            const currentSlot = await this.rpcClient.getCurrentSlot();

            // Step 2: Fetch all program accounts
            spinner.text = 'Fetching program accounts...';
            const programId = new PublicKey(this.config.programId);
            const rawAccounts = await this.rpcClient.getProgramAccounts(programId);

            // Step 3: Analyze PDAs
            spinner.text = 'Analyzing PDA patterns...';
            const accounts = await this.pdaDetector.batchAnalyzePDAs(rawAccounts);

            // Step 4: Fetch account activities
            spinner.text = 'Tracking account activity...';
            const pubkeys = accounts.map(acc => new PublicKey(acc.pubkey));
            const activities = await this.rpcClient.batchGetAccountActivities(pubkeys);

            spinner.succeed(chalk.green(`✓ Scan complete: ${accounts.length} accounts analyzed`));

            return {
                accounts,
                currentSlot,
                activities,
            };
        } catch (error) {
            spinner.fail(chalk.red('✗ Scan failed'));
            throw error;
        }
    }

    /**
     * Get enriched account data with activity information
     */
    enrichAccountsWithActivity(
        accounts: PDAccountInfo[],
        activities: Map<string, number | undefined>
    ): Array<PDAccountInfo & { lastWriteSlot?: number }> {
        return accounts.map(account => ({
            ...account,
            lastWriteSlot: activities.get(account.pubkey),
        }));
    }
}
