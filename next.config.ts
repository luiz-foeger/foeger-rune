import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    devIndicators: false,
    // sem o AGENTS.md e o CLAUDE.md que o next dev escreve na raiz
    agentRules: false,
};

export default nextConfig;
