/**
 * Report command implementation
 */

import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { ReportGenerator } from '../../visualization/report-generator.js';
import { ScanResult, RiskLevel } from '../../scanner/types.js';

interface ReportOptions {
    input: string;
    format?: string;
    output?: string;
    minRisk?: string;
}

export async function reportCommand(options: ReportOptions) {
    const spinner = ora('Loading scan results...').start();

    try {
        // Load scan results
        const scanData = await fs.readFile(options.input, 'utf-8');
        const scanResult: ScanResult = JSON.parse(scanData);

        spinner.text = 'Generating report...';

        // Validate risk level
        const validRiskLevels: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
        const minimumRiskLevel = (options.minRisk as RiskLevel) || 'Low';

        if (!validRiskLevels.includes(minimumRiskLevel)) {
            throw new Error(`Invalid risk level: ${options.minRisk}`);
        }

        // Generate report
        const reportGenerator = new ReportGenerator();
        const outputPath = await reportGenerator.generateReport(scanResult, {
            inputPath: options.input,
            format: (options.format as 'json' | 'markdown') || 'markdown',
            outputPath: options.output,
            minimumRiskLevel,
        });

        spinner.succeed(chalk.green('✓ Report generated successfully!'));
        console.log();
        console.log(chalk.cyan(`📄 Report saved to: ${outputPath}`));

    } catch (error) {
        spinner.fail(chalk.red('✗ Report generation failed'));
        console.error(chalk.red('Error:'), error);
        process.exit(1);
    }
}
