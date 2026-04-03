# MCP Server Authentication Setup

This document describes the authentication configuration for MCP servers, particularly the Cloudflare SSE observability endpoint.

## Cloudflare SSE Endpoint

The Cloudflare MCP server connects to `https://observability.mcp.cloudflare.com/sse` and requires authentication via a bearer token.

### Configuration

The configuration in `.kilocode/mcp.json` requires the `CF_BEARER_TOKEN` environment variable:

```json
"cloudflare": {
  "command": "npx",
  "args": [
    "mcp-remote",
    "https://observability.mcp.cloudflare.com/sse"
  ],
  "env": {
    "CF_BEARER_TOKEN": "${CF_BEARER_TOKEN}"
  }
}
```

The token is **not hardcoded** — it must be provided via environment variable for security.

### Setting Up Authentication

1. **Obtain a Cloudflare API Token**:
   - Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to: **Account › API Tokens**
   - Select an existing token or create a new one with appropriate scopes
   - Copy your API token

2. **Export the Environment Variable**:

   ```bash
   export CF_BEARER_TOKEN="<your-cloudflare-api-token>"
   ```

3. **Verify the Variable is Set**:

   ```bash
   echo $CF_BEARER_TOKEN  # Should print your token
   ```

4. **Validate MCP Environment** (before starting servers):

   ```bash
   node .kilocode/validate-mcp-env.js
   ```

   This script checks that all required environment variables are set and provides setup instructions if any are missing.

### Required Actions

- **DO**: Export `CF_BEARER_TOKEN` before starting MCP servers
- **DO**: Run `validate-mcp-env.js` to verify setup
- **DON'T**: Commit `CF_BEARER_TOKEN` to version control
- **DON'T**: Hardcode tokens in `.kilocode/mcp.json`

### Troubleshooting

**Error: "CF_BEARER_TOKEN is not set"**

- Ensure you have exported the environment variable
- Check that you're in the same shell session where you ran `export`
- Use `env | grep CF_` to verify the variable exists

**Error: "Authentication failed to Cloudflare endpoint"**

- Verify the token has not expired or been revoked
- Check that the token has the correct scopes for the observability API
- Generate a new token from the Cloudflare Dashboard

**Error: "Connection refused" or "Cannot reach observability.mcp.cloudflare.com"**

- Verify your network connection can reach Cloudflare endpoints
- Check firewall and proxy settings
- Ensure the URL `https://observability.mcp.cloudflare.com/sse` is accessible

### Environment Variable Validation

The `.kilocode/validate-mcp-env.js` script performs fail-fast validation:

- **Runs before MCP servers start**
- **Checks that `CF_BEARER_TOKEN` is set**
- **Provides detailed setup instructions if missing**
- **Exits with status 1 if validation fails** (prevents silent authentication failures)

To manually run the validator:

```bash
node .kilocode/validate-mcp-env.js
```

Expected output on success:

```
✅ All required MCP environment variables are set
```

Expected output on failure:

```
❌ MCP Server Startup Failed: Missing required environment variables

The following environment variables must be set:
  - CF_BEARER_TOKEN: Cloudflare API bearer token for observability.mcp.cloudflare.com/sse

Setup Instructions:
  1. Export the required environment variables:
     export CF_BEARER_TOKEN="<your-cloudflare-bearer-token>"
  ...
```
