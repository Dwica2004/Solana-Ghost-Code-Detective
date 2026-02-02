#!/usr/bin/env node

/**
 * CLI Entry Point for Ghost-Code Detective
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { scanCommand } from './commands/scan.js';
import { reportCommand } from './commands/report.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
);

const program = new Command();

// Configure CLI
program
    .name('ghost-scan')
    .description('🔍 Solana Ghost-Code Detective - Automated Ghost-Account & Shadow-State Scanner')
    .version(packageJson.version);

// Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔍  Solana Ghost-Code Detective                        ║
║                                                           ║
║   Automated Ghost-Account & Shadow-State Scanner         ║
║   For Professional Security Audits                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

// Scan command
program
    .command('scan')
    .description('Scan a Solana program for ghost accounts')
    .requiredOption('--program <programId>', 'Program ID to scan')
    .requiredOption('--rpc <rpcUrl>', 'RPC endpoint URL')
    .option('--inactive-slots <number>', 'Inactivity threshold in slots', '500000')
    .option('--output <path>', 'Output path for scan results')
    .option('--format <type>', 'Output format (json|markdown)', 'json')
    .action(scanCommand);

// Report command
program
    .command('report')
    .description('Generate audit report from scan results')
    .requiredOption('--input <path>', 'Input scan results JSON file')
    .option('--format <type>', 'Report format (json|markdown)', 'markdown')
    .option('--output <path>', 'Output path for report')
    .option('--min-risk <level>', 'Minimum risk level to include (Low|Medium|High|Critical)', 'Low')
    .action(reportCommand);

// Parse arguments
program.parse();
