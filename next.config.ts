import type { NextConfig } from 'next';

// agentRules: false stops `next dev` appending its agent instructions to CLAUDE.md.
const config: NextConfig = { agentRules: false };

export default config;
