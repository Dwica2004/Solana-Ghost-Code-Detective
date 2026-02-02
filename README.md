# 🔍 Solana Ghost-Code Detective

> **Automated Ghost-Account & Shadow-State Scanner for Solana Programs**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Solana](https://img.shields.io/badge/Solana-Web3.js-purple)](https://solana.com/)

🌐 **Live Demo**: [https://dist-icgq9bb7p-dwicas-projects.vercel.app](https://dist-icgq9bb7p-dwicas-projects.vercel.app)

A production-ready security auditing tool that performs on-chain state forensics for Solana programs by detecting abandoned, orphaned, dormant, or authority-risk accounts that are invisible in traditional source-code audits.

![Security Terminal Dark Theme](https://img.shields.io/badge/Theme-Security_Terminal-black)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
  - [CLI Mode](#cli-mode)
  - [Web UI Mode](#web-ui-mode)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Use Cases](#-use-cases)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

### The Problem

Solana programs frequently leave behind:
- **Orphaned PDA accounts** - Program Derived Addresses no longer reachable
- **Dormant state accounts** - Accounts untouched after program upgrades  
- **Legacy authority accounts** - Accounts with outdated signer/authority privileges
- **Rent-locked SOL** - Recoverable SOL in unused accounts

Traditional security audits miss these because they focus on live logic, not persistent on-chain state.

### The Solution

**Ghost-Code Detective** fills this critical gap by:
- 🔍 Scanning all accounts owned by a program
- 👻 Detecting ghost accounts using multi-factor risk analysis
- 🔐 Mapping authority and privilege relationships
- 💰 Calculating recoverable rent from dormant accounts
- 📊 Visualizing account relationships in interactive graphs
- 📄 Generating audit-grade reports (JSON + Markdown)

### Who Is This For?

✅ Professional security auditors (Zellic, Hacken, Certora-level)  
✅ Protocol teams preparing for audits  
✅ Solana ecosystem security standards  
✅ Solana Audit Subsidy Program submissions  

---

## ✨ Features

### 1. **Program Account Scanner**
- Fetches all accounts owned by a Program ID
- Identifies PDAs using seed derivation heuristics
- Detects related accounts via authority, ownership, and write access
- Builds complete account relationship graph

### 2. **Ghost Account Detection**

Flags suspicious accounts based on:

| Risk Indicator | Description |
|---------------|-------------|
| ⚠️ **Inactivity** | No write activity for configurable slot threshold |
| ⚠️ **Orphaned PDA** | PDA exists with no reachable instruction path |
| ⚠️ **Authority Mismatch** | Authority exists but no longer referenced |
| ⚠️ **Rent Recoverable** | Dormant accounts with recoverable SOL |

Each flagged account includes:
- Detection reason
- Confidence score (0-100)
- Risk level (Low/Medium/High/Critical)

### 3. **Authority & Privilege Tracker**

For every discovered account:
- Tracks owner program
- Detects `is_signer` and `is_writable` privileges
- Traces authority chains
- Identifies legacy or dangling authorities

### 4. **Rent Recovery Calculator**
- Calculates rent-exempt balance per account
- Estimates recoverable SOL
- Aggregates total recoverable value

### 5. **Interactive Graph Visualization**

- **Center node**: Program ID (diamond shape)
- **Nodes**: Accounts / PDAs (sized by risk)
- **Edges**: Authority, ownership, derivation relationships
- **Color coding**:
  - 🟢 Green: Active accounts
  - 🟡 Yellow: Medium risk
  - 🟠 Orange: High risk  
  - 🔴 Red: Critical risk
- **Interactions**: Hover for metadata, click for detailed reports
- **Filters**: By risk level, authority type, inactivity

### 6. **Dual Interface Modes**

#### CLI Mode
```bash
ghost-scan scan \
  --program <PROGRAM_ID> \
  --rpc <RPC_URL> \
  --inactive-slots 500000 \
  --output ./report.json
```

#### Web UI Mode
- Local web server with interactive visualization
- Drag-and-drop file loading
- Real-time graph exploration
- Dark-mode security terminal aesthetic

---

## ⚡ Quick Start

### Prerequisites

```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Installation (30 seconds)

```bash
# Clone the repository (if from git)
# cd into the project directory

# Install dependencies
npm install

# Install Web UI dependencies
cd web-ui
npm install
cd ..

# Build the project
npm run build
```

### Try the Example (1 minute)

#### Start the Web UI

```bash
npm run serve
```

This will:
- Build the backend
- Start the dev server on http://localhost:3000
- Open automatically in your browser

#### Load Example Data

1. Open http://localhost:3000 in your browser
2. Drag and drop: `reports/test-scan-simple.json`
3. Explore:
   - Dashboard with statistics
   - Interactive graph visualization
   - Top high-risk accounts
   - Click nodes to inspect details

---

## 📦 Installation

### System Requirements

- Node.js 18 or higher
- npm 8 or higher
- Solana RPC endpoint (mainnet, devnet, or custom)

### Step-by-Step Setup

```bash
# 1. Install backend dependencies
npm install

# 2. Install Web UI dependencies
cd web-ui
npm install
cd ..

# 3. Build TypeScript to JavaScript
npm run build

# 4. Verify installation
node dist/cli/index.js --version
```

### Using Private RPC (Recommended for Mainnet)

Edit `config.json`:
```json
{
  "defaultRpcEndpoint": "https://your-private-rpc.com"
}
```

---

## 🚀 Usage

### CLI Mode

#### Scan a Program

```bash
npm run scan -- \
  --program <PROGRAM_ID> \
  --rpc <RPC_URL> \
  --inactive-slots 500000 \
  --output ./reports/scan.json
```

**Example: Scan Token Program**
```bash
npm run scan -- \
  --program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA \
  --rpc https://api.mainnet-beta.solana.com \
  --inactive-slots 500000 \
  --output ./reports/token-scan.json \
  --format markdown
```

#### Generate Audit Report

```bash
npm run report -- \
  --input ./reports/scan.json \
  --format markdown \
  --output ./reports/audit.md \
  --min-risk High
```

**Output formats:**
- `json` - Machine-readable, full scan data
- `markdown` - Audit-grade formatted report

#### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--program` | Program ID to scan | Required |
| `--rpc` | RPC endpoint URL | Required |
| `--inactive-slots` | Inactivity threshold in slots | `500000` |
| `--output` | Output file path | Auto-generated |
| `--format` | Output format (json/markdown) | `json` |
| `--min-risk` | Minimum risk level for report | `Low` |

### Web UI Mode

#### Start the Server

```bash
npm run serve
```

Access at: **http://localhost:3000**

#### Features

1. **File Upload**: Drag & drop JSON scan results
2. **Dashboard**: 
   - Total accounts
   - Active vs dormant breakdown
   - High-risk account count
   - Total recoverable SOL
3. **Interactive Graph**:
   - Force-directed physics layout
   - Color-coded risk levels
   - Hover for metadata tooltips
   - Click nodes for detailed inspection
   - Filter: "All Accounts" vs "High-Risk Only"
4. **Node Inspector Panel**:
   - Full account details
   - Risk indicators
   - Confidence scores
   - Recoverable SOL estimates

---

## ⚙️ Configuration

Edit `config.json` to customize behavior:

### Inactivity Threshold

```json
{
  "inactivityThreshold": {
    "slots": 500000,
    "description": "Accounts inactive for this many slots are flagged as dormant"
  }
}
```

**Slot-to-time conversion (approximate):**
- 100,000 slots ≈ 1.8 days
- 500,000 slots ≈ 9 days
- 1,000,000 slots ≈ 18 days

### Risk Scoring Weights

```json
{
  "riskScoring": {
    "weights": {
      "inactivity": 0.3,
      "authorityMismatch": 0.25,
      "orphanedPda": 0.25,
      "rentRecoverable": 0.2
    },
    "thresholds": {
      "low": 25,
      "medium": 50,
      "high": 75,
      "critical": 90
    }
  }
}
```

### RPC Settings

```json
{
  "scanning": {
    "maxAccountsPerBatch": 100,
    "rpcTimeout": 30000,
    "retryAttempts": 3,
    "delayBetweenBatches": 1000
  }
}
```

**Adjust for rate limiting:**
- Increase `delayBetweenBatches` (e.g., 2000ms)
- Decrease `maxAccountsPerBatch` (e.g., 50)

### Visualization Settings

```json
{
  "visualization": {
    "maxNodesInGraph": 1000,
    "enableClustering": true,
    "layout": "force-directed"
  }
}
```

---

## 📁 Project Structure

```
/ghost-code-detective
├── cli/                      # CLI entrypoint and commands
│   ├── index.ts              # Main CLI program
│   └── commands/
│       ├── scan.ts           # Scan command implementation
│       └── report.ts         # Report generation command
│
├── scanner/                  # Core scanning logic
│   ├── types.ts              # TypeScript type definitions
│   ├── rpc-client.ts         # Solana RPC client wrapper
│   ├── pda-detector.ts       # PDA identification
│   └── scanner.ts            # Main scanner orchestrator
│
├── analysis/                 # Risk analysis algorithms
│   ├── ghost-detector.ts     # Ghost account detection engine
│   └── authority-tracker.ts  # Authority relationship mapping
│
├── visualization/            # Graph and report generation
│   ├── graph-builder.ts      # Account relationship graph builder
│   └── report-generator.ts   # JSON/Markdown report exporter
│
├── web-ui/                   # React-based Web UI
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # React entry point
│   └── index.html            # HTML template
│
├── reports/                  # Generated scan outputs
│   ├── example-scan-result.json
│   └── test-scan-simple.json
│
├── config.json               # Application configuration
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
└── LICENSE                   # MIT license
```

---

## 💼 Use Cases

### 1. Pre-Audit Check

```bash
# Scan your program before sending to auditors
npm run scan -- \
  --program YOUR_PROGRAM_ID \
  --rpc YOUR_RPC \
  --format markdown \
  --output ./audit-prep.md

# Review the report
# Fix high-risk items
# Re-scan and verify
```

### 2. Rent Recovery

```bash
# Scan for dormant accounts
npm run scan -- \
  --program YOUR_PROGRAM_ID \
  --rpc YOUR_RPC \
  --inactive-slots 1000000 \
  --output ./rent-recovery.json

# Review accounts with recoverable SOL
# Close accounts and recover rent
```

### 3. Regular Security Monitoring

```bash
# Weekly scan script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
npm run scan -- \
  --program YOUR_PROGRAM_ID \
  --rpc YOUR_RPC \
  --output "./reports/scan-$DATE.json"
```

### 4. CI/CD Integration

Add to your deployment pipeline:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]

jobs:
  ghost-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Ghost-Code Detective
        run: npm install && npm run build
      
      - name: Run Security Scan
        run: |
          npm run scan -- \
            --program ${{ secrets.PROGRAM_ID }} \
            --rpc ${{ secrets.RPC_URL }} \
            --output ./scan-result.json
      
      - name: Upload Scan Results
        uses: actions/upload-artifact@v3
        with:
          name: security-scan
          path: scan-result.json
```

---

## 🐛 Troubleshooting

### Issue: "RPC rate limited"

**Symptoms**: Scan fails with rate limit errors

**Solution**: Use a private RPC or adjust settings in `config.json`:

```json
{
  "scanning": {
    "delayBetweenBatches": 2000,
    "maxAccountsPerBatch": 50
  }
}
```

### Issue: "Module not found"

**Symptoms**: Import errors when running CLI

**Solution**: Rebuild the project:

```bash
npm install
npm run build
```

### Issue: "Web UI not loading"

**Symptoms**: Blank page or build errors

**Solution**: Install UI dependencies and rebuild:

```bash
cd web-ui
npm install
npm run dev
```

### Issue: Build fails with TypeScript errors

**Symptoms**: `tsc` compilation errors

**Solution**: Clear build cache and reinstall:

```bash
rm -rf dist node_modules
npm install
npm run build
```

### Issue: "Invalid scan result format"

**Symptoms**: File upload rejected in Web UI

**Solution**: Ensure JSON has required fields:
- `programId`
- `summary` (with `activeAccounts`, not `activAccounts`)
- `accounts` (array)
- `graph` (with `nodes` and `edges`)

Use `test-scan-simple.json` as reference.

---

## 🤝 Contributing

Contributions welcome! This is a security-critical tool, so all PRs must include:

- ✅ Tests for new detection logic
- ✅ Documentation updates
- ✅ Example scan results
- ✅ Type safety (TypeScript)

### Adding New Risk Indicators

1. Add indicator type to `scanner/types.ts`
2. Implement detection in `analysis/ghost-detector.ts`
3. Add weight to `config.json`
4. Update documentation

### Development Workflow

```bash
# Watch mode for TypeScript
npm run dev

# Run Web UI in dev mode
cd web-ui
npm run dev
```

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 🏆 Quality Standards

This tool is built to:

✅ **Auditor-Grade** - Ready for professional security audits  
✅ **Production-Ready** - Error handling, retry logic, rate limiting  
✅ **Extensible** - Clear architecture for adding features  
✅ **Well-Documented** - Comprehensive guides and examples  
✅ **Professional Design** - Premium dark-mode security UI  

---

**Built with precision for the Solana security community** 🛡️

*For questions or support, please open an issue on GitHub.*
