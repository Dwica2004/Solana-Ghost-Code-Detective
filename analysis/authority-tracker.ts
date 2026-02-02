/**
 * Authority & Privilege Tracker
 * Analyzes account ownership and permission chains
 */

import { PublicKey } from '@solana/web3.js';
import { PDAccountInfo, AuthorityRelationship } from '../scanner/types.js';
import chalk from 'chalk';

export class AuthorityTracker {
    private programId: string;

    constructor(programId: string) {
        this.programId = programId;
    }

    /**
     * Build authority relationship graph
     */
    buildAuthorityRelationships(accounts: PDAccountInfo[]): AuthorityRelationship[] {
        console.log(chalk.blue('🔐 Mapping authority relationships...'));

        const relationships: AuthorityRelationship[] = [];

        accounts.forEach(account => {
            // Owner relationship
            if (account.owner !== account.pubkey) {
                relationships.push({
                    account: account.pubkey,
                    authority: account.owner,
                    privilege: 'owner',
                    isActive: true, // Ownership is always active
                });
            }

            // For PDAs, add derivation relationship
            if (account.isPDA && account.seeds) {
                relationships.push({
                    account: account.pubkey,
                    authority: this.programId,
                    privilege: 'signer',
                    isActive: true, // PDAs can always sign for their program
                });
            }
        });

        console.log(chalk.green(`✓ Mapped ${relationships.length} authority relationships`));

        return relationships;
    }

    /**
     * Detect legacy or dangling authorities
     * Authorities that exist but may no longer be referenced
     */
    detectLegacyAuthorities(
        relationships: AuthorityRelationship[],
        accounts: PDAccountInfo[]
    ): AuthorityRelationship[] {
        const accountPubkeys = new Set(accounts.map(a => a.pubkey));

        // Find authorities that point to non-existent accounts
        const legacyAuthorities = relationships.filter(rel => {
            // If the authority is not in our account set and not the program itself
            return !accountPubkeys.has(rel.authority) && rel.authority !== this.programId;
        });

        if (legacyAuthorities.length > 0) {
            console.log(chalk.yellow(`⚠️  Found ${legacyAuthorities.length} legacy authority references`));
        }

        return legacyAuthorities;
    }

    /**
     * Generate authority risk summary per account
     */
    generateAuthorityRiskSummary(
        account: PDAccountInfo,
        relationships: AuthorityRelationship[]
    ): {
        hasLegacyAuthority: boolean;
        authorityCount: number;
        privileges: string[];
    } {
        const accountRelationships = relationships.filter(
            rel => rel.account === account.pubkey
        );

        const hasLegacyAuthority = accountRelationships.some(rel => !rel.isActive);
        const authorityCount = accountRelationships.length;
        const privileges = Array.from(new Set(accountRelationships.map(rel => rel.privilege)));

        return {
            hasLegacyAuthority,
            authorityCount,
            privileges,
        };
    }

    /**
     * Build authority chains (multi-level ownership tracking)
     */
    buildAuthorityChains(
        startAccount: string,
        relationships: AuthorityRelationship[],
        maxDepth: number = 5
    ): string[][] {
        const chains: string[][] = [];

        const buildChain = (current: string, chain: string[], depth: number) => {
            if (depth >= maxDepth) {
                chains.push(chain);
                return;
            }

            const authorities = relationships.filter(
                rel => rel.account === current && rel.privilege === 'owner'
            );

            if (authorities.length === 0) {
                chains.push(chain);
                return;
            }

            authorities.forEach(auth => {
                if (!chain.includes(auth.authority)) {
                    buildChain(auth.authority, [...chain, auth.authority], depth + 1);
                }
            });
        };

        buildChain(startAccount, [startAccount], 0);

        return chains;
    }
}
