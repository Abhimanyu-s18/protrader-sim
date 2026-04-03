---
name: web-design-guidelines
description: >-
  Review UI code for Web Interface Guidelines compliance. Use when asked to
  "review my UI", "check accessibility", "audit design", "review UX", or "check
  my site against best practices".
metadata:
  author: vercel
  version: 1.0.0
  argument-hint: <file-or-pattern>
  category: development
  source:
    repository: 'https://github.com/vercel-labs/agent-skills'
    path: skills/web-design-guidelines
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the rules. The fetched content contains all guidelines and output format instructions.

### Resilience Strategy

The hard-coded URL above (`/main/command.md`) creates a single point of failure. Implement the following resilience patterns:

1. **Use Versioned URLs**: Prefer stable release tags over the `main` branch:
   - Example: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/v1.2.0/command.md`
   - Check GitHub releases periodically and update the version tag

2. **Add Retry and Timeout Behavior**:
   - Implement exponential backoff (3 retries with 2s, 4s, 8s delays)
   - Set a fetch timeout of 5-10 seconds
   - Log each retry attempt with timestamp and error reason

3. **Validate and Fallback**:
   - After fetching, validate the content (check for expected sections like `## Rules` or guideline markers)
   - If validation fails, fall back to an embedded/local copy stored in the skill directory (e.g., `guidelines-fallback.md`)
   - If fetch fails after all retries, use the fallback copy automatically

4. **Clear Error Logging**:
   - Log: `[fetch-error] Failed to fetch guidelines after 3 retries. Using embedded fallback. Error: {reason}`
   - Log: `[fetch-success] Guidelines loaded from {url} (version: {tag})`
   - Log: `[fetch-timeout] Timeout after Xs. Attempting fallback...`

Maintain an embedded copy of the guidelines in the skill directory as a safety net for network failures or upstream unavailability.

## Usage

When a user provides a file or pattern argument:

1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
