#!/usr/bin/env node

/**
 * MCP Environment Variable Validator
 * 
 * Validates that all required environment variables for MCP servers are set.
 * This script should be run before starting any MCP servers to fail fast with
 * clear errors if required credentials are missing.
 * 
 * Required environment variables:
 * - CF_BEARER_TOKEN: Cloudflare API bearer token for the SSE observability endpoint
 */

const requiredEnvVars = {
  CF_BEARER_TOKEN: 'Cloudflare API bearer token for observability.mcp.cloudflare.com/sse'
}

const missingVars = []

for (const [varName, description] of Object.entries(requiredEnvVars)) {
  if (!process.env[varName]) {
    missingVars.push(`  - ${varName}: ${description}`)
  }
}

if (missingVars.length > 0) {
  console.error('❌ MCP Server Startup Failed: Missing required environment variables')
  console.error('')
  console.error('The following environment variables must be set:')
  console.error(missingVars.join('\n'))
  console.error('')
  console.error('Setup Instructions:')
  console.error('  1. Export the required environment variables:')
  console.error('     export CF_BEARER_TOKEN="<your-cloudflare-bearer-token>"')
  console.error('  2. Verify they are set: env | grep CF_')
  console.error('  3. Restart your MCP server connection')
  console.error('')
  console.error('To obtain CF_BEARER_TOKEN:')
  console.error('  - Log in to Cloudflare Dashboard')
  console.error('  - Navigate to Account › API Tokens')
  console.error('  - Create or use an existing API token with appropriate scopes')
  console.error('')
  process.exit(1)
}

console.log('✅ All required MCP environment variables are set')
process.exit(0)
