/**
 * Report Generator
 * Creates JSON and Markdown audit reports
 */

import fs from 'fs/promises';
import path from 'path';
import { ScanResult, ReportConfig, RiskLevel } from '../scanner/types.js';
import chalk from 'chalk';

export class ReportGenerator {
    /**
     * Generate report in specified format
     */
    async generateReport(scanResult: ScanResult, config: ReportConfig): Promise<string> {
        console.log(chalk.blue(`📄 Generating ${config.format.toUpperCase()} report...`));

        let content: string;
        let extension: string;

        if (config.format === 'json') {
            content = this.generateJSON(scanResult, config);
            extension = 'json';
        } else if (config.format === 'markdown') {
            content = this.generateMarkdown(scanResult, config);
            extension = 'md';
        } else {
            throw new Error(`Unsupported format: ${config.format}`);
        }

        // Determine output path
        const outputPath = config.outputPath ||
            `./reports/ghost-scan-${Date.now()}.${extension}`;

        // Ensure directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Write report
        await fs.writeFile(outputPath, content, 'utf-8');

        console.log(chalk.green(`✓ Report saved to: ${outputPath}`));

        return outputPath;
    }

    /**
     * Generate JSON report
     */
    private generateJSON(scanResult: ScanResult, config: ReportConfig): string {
        // Filter by minimum risk level if specified
        let filteredAccounts = scanResult.accounts;

        if (config.minimumRiskLevel) {
            const riskOrder: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
            const minIndex = riskOrder.indexOf(config.minimumRiskLevel);

            filteredAccounts = scanResult.accounts.filter(account => {
                const accountIndex = riskOrder.indexOf(account.riskLevel);
                return accountIndex >= minIndex;
            });
        }

        const filtered = {
            ...scanResult,
            accounts: filteredAccounts,
        };

        return JSON.stringify(filtered, null, 2);
    }

    /**
     * Generate Markdown audit report
     */
    private generateMarkdown(scanResult: ScanResult, config: ReportConfig): string {
        const lines: string[] = [];

        // Header
        lines.push('# 🔍 Solana Ghost-Code Detective');
        lines.push('## Security Audit Report');
        lines.push('');
        lines.push('---');
        lines.push('');

        // Metadata
        lines.push('### Scan Metadata');
        lines.push('');
        lines.push(`- **Program ID**: \`${scanResult.programId}\``);
        lines.push(`- **RPC Endpoint**: \`${scanResult.rpcEndpoint}\``);
        lines.push(`- **Scan Timestamp**: ${new Date(scanResult.scanTimestamp).toISOString()}`);
        lines.push(`- **Current Slot**: ${scanResult.currentSlot.toLocaleString()}`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Executive Summary
        lines.push('### 📊 Executive Summary');
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        lines.push(`| Total Accounts | ${scanResult.summary.totalAccounts} |`);
        lines.push(`| Active Accounts | ${scanResult.summary.activeAccounts} |`);
        lines.push(`| Dormant Accounts | ${scanResult.summary.dormantAccounts} |`);
        lines.push(`| High-Risk Accounts | ${scanResult.summary.highRiskAccounts} |`);
        lines.push(`| **Total Recoverable SOL** | **${scanResult.summary.totalRecoverableSOL.toFixed(4)} SOL** |`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Critical Findings
        const criticalAccounts = scanResult.accounts.filter(a => a.riskLevel === 'Critical');
        if (criticalAccounts.length > 0) {
            lines.push('### 🚨 Critical Findings');
            lines.push('');
            lines.push(`Found **${criticalAccounts.length}** accounts with critical risk level.`);
            lines.push('');

            criticalAccounts.forEach((account, idx) => {
                lines.push(`#### ${idx + 1}. \`${account.pubkey}\``);
                lines.push('');
                lines.push(`- **Risk Level**: ${account.riskLevel}`);
                lines.push(`- **Confidence Score**: ${account.confidenceScore}/100`);
                lines.push(`- **Recoverable SOL**: ${account.estimatedRecoverableSOL.toFixed(4)} SOL`);
                lines.push('');
                lines.push('**Risk Indicators**:');
                account.indicators.forEach(indicator => {
                    lines.push(`- ${this.getRiskIcon(indicator.type)} **${indicator.type}**: ${indicator.reason}`);
                });
                lines.push('');
            });

            lines.push('---');
            lines.push('');
        }

        // High-Risk Findings
        const highRiskAccounts = scanResult.accounts.filter(a => a.riskLevel === 'High');
        if (highRiskAccounts.length > 0) {
            lines.push('### ⚠️ High-Risk Findings');
            lines.push('');
            lines.push(`Found **${highRiskAccounts.length}** accounts with high risk level.`);
            lines.push('');

            lines.push('| Account | Confidence | Recoverable SOL | Key Indicators |');
            lines.push('|---------|------------|-----------------|----------------|');

            highRiskAccounts.forEach(account => {
                const indicators = account.indicators.map(i => i.type).join(', ');
                lines.push(`| \`${this.truncate(account.pubkey, 16)}\` | ${account.confidenceScore}/100 | ${account.estimatedRecoverableSOL.toFixed(4)} | ${indicators} |`);
            });

            lines.push('');
            lines.push('---');
            lines.push('');
        }

        // Authority Analysis
        lines.push('### 🔐 Authority Analysis');
        lines.push('');
        lines.push(`Total authority relationships tracked: **${scanResult.authorities.length}**`);
        lines.push('');

        const inactiveAuthorities = scanResult.authorities.filter(a => !a.isActive);
        if (inactiveAuthorities.length > 0) {
            lines.push(`⚠️ Found **${inactiveAuthorities.length}** inactive/legacy authority relationships.`);
            lines.push('');
        }

        lines.push('---');
        lines.push('');

        // Recommendations
        lines.push('### 💡 Recommendations');
        lines.push('');
        lines.push('1. **Review High-Risk Accounts**: Investigate accounts flagged as High or Critical risk.');
        lines.push('2. **Close Dormant Accounts**: Consider closing accounts with no recent activity to recover rent.');
        lines.push('3. **Audit Authority Chains**: Review and update authority relationships to remove legacy permissions.');
        lines.push('4. **Update Program Logic**: Ensure current program version correctly references all active accounts.');
        lines.push('');
        lines.push('---');
        lines.push('');

        // Footer
        lines.push('*Report generated by Solana Ghost-Code Detective*');
        lines.push('*For security auditing purposes only*');

        return lines.join('\n');
    }

    /**
     * Helper: Get emoji icon for risk indicator type
     */
    private getRiskIcon(type: string): string {
        switch (type) {
            case 'inactivity': return '💤';
            case 'authority_mismatch': return '🔓';
            case 'orphaned_pda': return '👻';
            case 'rent_recoverable': return '💰';
            case 'legacy_authority': return '⏳';
            default: return '⚠️';
        }
    }

    /**
     * Helper: Truncate string
     */
    private truncate(str: string, length: number): string {
        if (str.length <= length) return str;
        return `${str.slice(0, length - 3)}...`;
    }
}
