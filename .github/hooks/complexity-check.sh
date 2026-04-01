#!/bin/bash

# Orchestrator Task Complexity Checker
# Analyzes incoming tasks to determine if they require Orchestrator coordination

# Read the task description from stdin
TASK_DESCRIPTION=$(cat)

# Complexity scoring thresholds
COMPLEXITY_THRESHOLD=3
MULTI_LAYER_THRESHOLD=2
MULTI_AGENT_THRESHOLD=2

# Keywords that indicate complexity
COMPLEXITY_KEYWORDS=(
    "build" "implement" "create" "develop" "add" "feature" "flow" "system"
    "integration" "api" "database" "frontend" "backend" "ui" "auth"
    "payment" "kyc" "trading" "position" "margin" "leverage" "instrument"
    "multi" "cross" "across" "between" "and" "or"
)

# Keywords indicating multiple layers
LAYER_KEYWORDS=(
    "frontend" "backend" "api" "database" "ui" "client" "server"
    "react" "next" "express" "prisma" "postgres" "redis"
)

# Keywords indicating multiple agents
AGENT_KEYWORDS=(
    "security" "test" "documentation" "performance" "deploy"
    "auth" "validation" "audit" "monitoring" "logging"
)

# Score complexity
complexity_score=0

# Convert task description to lowercase for case-insensitive matching
task_lower=$(echo "$TASK_DESCRIPTION" | tr '[:upper:]' '[:lower:]')

# Check for complexity keywords (word boundary, case-insensitive)
for keyword in "${COMPLEXITY_KEYWORDS[@]}"; do
    keyword_lower=$(echo "$keyword" | tr '[:upper:]' '[:lower:]')
    if [[ "$task_lower" =~ \\b$keyword_lower\\b ]]; then
        complexity_score=$((complexity_score + 1))
    fi
done

# Check for multiple layers (word boundary, case-insensitive)
layer_count=0
for keyword in "${LAYER_KEYWORDS[@]}"; do
    keyword_lower=$(echo "$keyword" | tr '[:upper:]' '[:lower:]')
    if [[ "$task_lower" =~ \\b$keyword_lower\\b ]]; then
        layer_count=$((layer_count + 1))
    fi
done

# Check for multiple agents (word boundary, case-insensitive)
agent_count=0
for keyword in "${AGENT_KEYWORDS[@]}"; do
    keyword_lower=$(echo "$keyword" | tr '[:upper:]' '[:lower:]')
    if [[ "$task_lower" =~ \\b$keyword_lower\\b ]]; then
        agent_count=$((agent_count + 1))
    fi
done

# Determine if task is complex
is_complex=false
requires_orchestrator=false

if [ $complexity_score -ge $COMPLEXITY_THRESHOLD ]; then
    is_complex=true
fi

if [ $layer_count -ge $MULTI_LAYER_THRESHOLD ] || [ $agent_count -ge $MULTI_AGENT_THRESHOLD ]; then
    requires_orchestrator=true
fi

# Escape JSON string values
escape_json_string() {
  local string="$1"
  string="${string//\\/\\\\}"  # Escape backslashes
  string="${string//\"}\\\"}"  # Escape quotes
  string="${string//$'\n'/\\n}"   # Escape newlines
  echo "\"$string\""
}

# Output JSON result
recommendation=$([ "$requires_orchestrator" = true ] && echo '"use_orchestrator"' || echo '"direct_agent"')
cat << EOF
{
  "task_description": $(escape_json_string "$TASK_DESCRIPTION"),
  "complexity_score": $complexity_score,
  "layer_count": $layer_count,
  "agent_count": $agent_count,
  "is_complex": $is_complex,
  "requires_orchestrator": $requires_orchestrator,
  "recommendation": $recommendation
}
EOF

