/**
 * Scan command implementation
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ProgramScanner } from '../../scanner/scanner.js';
import { GhostDetector } from '../../analysis/ghost-detector.js';
import { AuthorityTracker } from '../../analysis/authority-tracker.js';
import { GraphBuilder } from '../../visualization/graph-builder.js';
import { ReportGenerator } from '../../visualization/report-generator.js';
import { ScanConfig, ScanResult } from '../../scanner/types.js';

interface ScanOptions {
    program: string;
    rpc: string;
    inactiveSlots: string;
    output?: string;
    format?: string;
}

export async function scanCommand(options: ScanOptions) {
    const spinner = ora('Initializing scan...').start();

    try {
        // Load configuration
        const configPath = path.join(process.cwd(), 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);

        // Build scan configuration
        const scanConfig: ScanConfig = {
            programId: options.program,
            rpcEndpoint: options.rpc,
            inactiveSlots: parseInt(options.inactiveSlots, 10),
            outputPath: options.output,
        };

        spinner.text = 'Validating configuration...';
        console.log();
        console.log(chalk.blue('📋 Scan Configuration:'));
        console.log(chalk.gray(`  Program ID: ${scanConfig.programId}`));
        console.log(chalk.gray(`  RPC Endpoint: ${scanConfig.rpcEndpoint}`));
        console.log(chalk.gray(`  Inactivity Threshold: ${scanConfig.inactiveSlots.toLocaleString()} slots`));
        console.log();

        // Step 1: Initialize scanner
        spinner.text = 'Initializing program scanner...';
        const scanner = new ProgramScanner(scanConfig, config.scanning);

        // Step 2: Scan program accounts
        spinner.text = 'Scanning program accounts...';
        const { accounts, currentSlot, activities } = await scanner.scan();

        // Enrich accounts with activity data
        const enrichedAccounts = scanner.enrichAccountsWithActivity(accounts, activities);

        // Step 3: Run ghost detection
        spinner.text = 'Analyzing for ghost accounts...';
        const ghostDetector = new GhostDetector(
            currentSlot,
            scanConfig.inactiveSlots,
            config.riskScoring.weights,
            config.riskScoring.thresholds
        );

        const minRentExemption = 890880; // Approximate minimum rent for small accounts
        const riskProfiles = ghostDetector.analyzeAccounts(enrichedAccounts, minRentExemption);

        // Step 4: Track authorities
        spinner.text = 'Mapping authority relationships...';
        const authorityTracker = new AuthorityTracker(scanConfig.programId);
        const authorities = authorityTracker.buildAuthorityRelationships(enrichedAccounts);

        // Step 5: Build graph
        spinner.text = 'Building relationship graph...';
        const graphBuilder = new GraphBuilder(scanConfig.programId, currentSlot);
        const graph = graphBuilder.buildGraph(enrichedAccounts, riskProfiles, authorities);

        // Filter for visualization
        const filteredGraph = graphBuilder.filterGraphForVisualization(
            graph,
            config.visualization.maxNodesInGraph
        );

        // Step 6: Generate summary
        const summary = GhostDetector.generateSummary(riskProfiles);

        // Build final scan result
        const scanResult: ScanResult = {
            programId: scanConfig.programId,
            scanTimestamp: Date.now(),
            currentSlot,
            rpcEndpoint: scanConfig.rpcEndpoint,
            summary,
            accounts: riskProfiles,
            graph: filteredGraph,
            authorities,
        };

        spinner.succeed(chalk.green('✓ Scan complete!'));
        console.log();

        // Display summary
        displaySummary(scanResult);

        // Step 7: Save results
        const outputFormat = (options.format || 'json') as 'json' | 'markdown';
        const reportGenerator = new ReportGenerator();

        await reportGenerator.generateReport(scanResult, {
            inputPath: '', // Not used for direct scan
            format: outputFormat,
            outputPath: options.output,
        });

        console.log();
        console.log(chalk.green('🎉 Scan and report generation complete!'));

    } catch (error) {
        spinner.fail(chalk.red('✗ Scan failed'));
        console.error(chalk.red('Error:'), error);
        process.exit(1);
    }
}

/**
 * Display scan summary to console
 */
function displaySummary(result: ScanResult) {
    console.log(chalk.cyan.bold('═══════════════════════════════════════════'));
    console.log(chalk.cyan.bold('  SCAN SUMMARY'));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════'));
    console.log();

    const { summary } = result;

    console.log(chalk.white('📊 Account Statistics:'));
    console.log(chalk.gray(`  Total Accounts:       ${summary.totalAccounts}`));
    console.log(chalk.green(`  Active Accounts:      ${summary.activeAccounts}`));
    console.log(chalk.yellow(`  Dormant Accounts:     ${summary.dormantAccounts}`));
    console.log(chalk.red(`  High-Risk Accounts:   ${summary.highRiskAccounts}`));
    console.log();

    console.log(chalk.white('💰 Financial Impact:'));
    console.log(chalk.yellow(`  Total Recoverable:    ${summary.totalRecoverableSOL.toFixed(4)} SOL`));
    console.log();

    // Top risk accounts
    const topRisks = result.accounts
        .filter(a => a.riskLevel === 'Critical' || a.riskLevel === 'High')
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 5);

    if (topRisks.length > 0) {
        console.log(chalk.red.bold('🚨 Top High-Risk Accounts:'));
        topRisks.forEach((account, idx) => {
            console.log(chalk.gray(`  ${idx + 1}. ${account.pubkey}`));
            console.log(chalk.gray(`     Risk: ${account.riskLevel} (${account.confidenceScore}/100)`));
            console.log(chalk.gray(`     Recoverable: ${account.estimatedRecoverableSOL.toFixed(4)} SOL`));
        });
        console.log();
    }

    console.log(chalk.cyan.bold('═══════════════════════════════════════════'));
}
