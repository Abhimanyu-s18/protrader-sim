#!/bin/bash    done < "$file"
}
# ProTraderSim GitHub Secrets Setup Helper Script
# Usage: bash setup-github-secrets.sh
# Requires: GitHub CLI (gh) installed and authenticated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REPO="${REPO:-krishan/protrader-sim}"
SECRETS_FILE="${SECRETS_FILE:-.github/secrets.env}"

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}✗ GitHub CLI not found. Install from: https://cli.github.com${NC}"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}✗ Not authenticated with GitHub. Run: gh auth login${NC}"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}✗ OpenSSL not found. Install from: https://www.openssl.org${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# List current secrets
list_secrets() {
    echo -e "${BLUE}📋 Current GitHub Secrets:${NC}"
    gh secret list --repo "$REPO" || echo "No secrets found"
}

# Generate JWT key pair
generate_jwt_keys() {
    echo -e "${BLUE}🔐 Generating JWT RSA key pair...${NC}"
    
    local jwt_dir="/tmp/jwt-keys-$"
    mkdir -p "$jwt_dir"
    
    # Cleanup trap to ensure directory removal on any exit
    trap "cd / && rm -rf \"$jwt_dir\"" EXIT INT TERM
    
    # Generate private key
    openssl genpkey -algorithm RSA -out "$jwt_dir/jwt-private.pem" -pkeyopt rsa_keygen_bits:2048
    echo -e "${GREEN}✓ Private key generated${NC}"
    
    # Extract public key
    openssl rsa -pubout -in "$jwt_dir/jwt-private.pem" -out "$jwt_dir/jwt-public.pem"
    echo -e "${GREEN}✓ Public key generated${NC}"
    
    # Format with escaped newlines
    local private_key=$(sed ':a;N;$!ba;s/\n/\\n/g' "$jwt_dir/jwt-private.pem")
    local public_key=$(sed ':a;N;$!ba;s/\n/\\n/g' "$jwt_dir/jwt-public.pem")
    
    # Display formatted keys
    echo -e "${YELLOW}⚠️  Copy these values to GitHub Secrets:${NC}"
    echo ""
    echo "JWT_PRIVATE_KEY_TEST:"
    echo "$private_key"
    echo ""
    echo "JWT_PUBLIC_KEY_TEST:"
    echo "$public_key"
    echo ""
    
    echo -e "${GREEN}✓ JWT keys generated and displayed above${NC}"
}

# Set a single secret
set_secret() {
    local secret_name="$1"
    local secret_value="$2"
    
    if [ -z "$secret_name" ] || [ -z "$secret_value" ]; then
        echo -e "${RED}✗ Secret name and value required${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📝 Setting secret: $secret_name${NC}"
    
    echo -n "$secret_value" | gh secret set "$secret_name" --repo "$REPO"
    
    echo -e "${GREEN}✓ Secret set: $secret_name${NC}"
}

# Set multiple secrets from file
set_secrets_from_file() {
    local file="${1:-.github/secrets.env}"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ Secrets file not found: $file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📂 Reading secrets from: $file${NC}"
    
    # Skip comments and empty lines
    while IFS= read -r line; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        
        # Split on first '=' only
        name="${line%%=*}"
        value="${line#*=}"
        
        # Remove leading/trailing whitespace from name
        name=$(echo "$name" | xargs)
        
        # Skip if name is empty
        [[ -z "$name" ]] && continue
        
        # Skip if value is a token reference (will be prompted for)
        if [[ "$value" == "ASK" ]] || [[ -z "$value" ]]; then
            echo -e "${YELLOW}⚠️  Skipping $name (no value in file)${NC}"
            continue
        fi
        
        set_secret "$name" "$value"
    done < "$file"


# Interactive secret setup
interactive_setup() {
    echo -e "${BLUE}🎯 Starting Interactive Setup${NC}"
    echo ""
    
    # Hints for each secret
    declare -A hints=(
        [TURBO_TOKEN]="Get from https://vercel.com/account/tokens"
        [TURBO_TEAM]="Get from https://vercel.com/teams"
        [DATABASE_URL]="Get from Supabase/RDS dashboard"
        [DIRECT_URL]="Get from Supabase/RDS dashboard"
        [JWT_PRIVATE_KEY_TEST]="Run 'bash $0 --generate-jwt' to create"
        [JWT_PUBLIC_KEY_TEST]="Run 'bash $0 --generate-jwt' to create"
        [NEXT_PUBLIC_API_URL]="e.g. https://api-staging.railway.app"
        [NEXT_PUBLIC_WS_URL]="e.g. wss://api-staging.railway.app"
        [RAILWAY_TOKEN]="Get from https://railway.app/account/tokens"
        [STAGING_API_URL]="e.g. https://api-staging.railway.app/health"
        [AWS_ACCESS_KEY_ID]="Get from AWS IAM console"
        [AWS_SECRET_ACCESS_KEY]="Get from AWS IAM console"
        [PROD_API_URL]="e.g. https://api.protrader-sim.com/health"
        [VERCEL_TOKEN]="Get from https://vercel.com/account/tokens"
        [VERCEL_ORG_ID]="Get from https://vercel.com/account/settings"
        [VERCEL_PROJECT_ID_WEB]="Run 'cd apps/web && vercel link' to get"
        [VERCEL_PROJECT_ID_AUTH]="Run 'cd apps/auth && vercel link' to get"
        [VERCEL_PROJECT_ID_PLATFORM]="Run 'cd apps/platform && vercel link' to get"
        [VERCEL_PROJECT_ID_ADMIN]="Run 'cd apps/admin && vercel link' to get"
        [VERCEL_PROJECT_ID_IB_PORTAL]="Run 'cd apps/ib-portal && vercel link' to get"
    )
    
    for name in "${expected_secrets[@]}"; do
        echo -e "${YELLOW}$name${NC}"
        echo "  Hint: ${hints[$name]}"
        
        read -rsp "  Enter value (or skip): " value
        echo ""  # Add newline after silent input
        
        if [ -n "$value" ]; then
            set_secret "$name" "$value"
        else
            echo -e "${YELLOW}  ⊘ Skipped${NC}"
        fi
        
        echo ""
    done
}

# Delete a secret
delete_secret() {
    local secret_name="$1"
    
    if [ -z "$secret_name" ]; then
        echo -e "${RED}✗ Secret name required${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠️  About to delete: $secret_name${NC}"
    read -rp "  Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        gh secret delete "$secret_name" --repo "$REPO"
        echo -e "${GREEN}✓ Secret deleted: $secret_name${NC}"
    else
        echo -e "${YELLOW}  Cancelled${NC}"
    fi
}

# Define expected secrets (shared across script)
expected_secrets=(
    "TURBO_TOKEN"
    "TURBO_TEAM"
    "DATABASE_URL"
    "DIRECT_URL"
    "JWT_PRIVATE_KEY_TEST"
    "JWT_PUBLIC_KEY_TEST"
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_WS_URL"
    "RAILWAY_TOKEN"
    "STAGING_API_URL"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "PROD_API_URL"
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID_WEB"
    "VERCEL_PROJECT_ID_AUTH"
    "VERCEL_PROJECT_ID_PLATFORM"
    "VERCEL_PROJECT_ID_ADMIN"
    "VERCEL_PROJECT_ID_IB_PORTAL"
)

# Verify secrets
verify_secrets() {
    echo -e "${BLUE}✓ Current secrets in GitHub:${NC}"
    
    local count=0
    
    local secrets_list=$(gh secret list --repo "$REPO" --json name -q ".[].name")
    
    for secret in "${expected_secrets[@]}"; do
        if echo "$secrets_list" | grep -qx "$secret"; then
            echo -e "  ${GREEN}✓${NC} $secret"
            ((count++))
        else
            echo -e "  ${RED}✗${NC} $secret (MISSING)"
        fi
    done
    
    
    local total=${#expected_secrets[@]}
    echo ""
    echo -e "${BLUE}Status: $count/$total secrets configured${NC}"
    
    if [ "$count" -eq "$total" ]; then
        echo -e "${GREEN}✓ All secrets configured!${NC}"
    else
        echo -e "${YELLOW}⚠️  $(($total - count)) secrets still needed${NC}"
    fi
}

# Display help
show_help() {
  local total_expected="${#expected_secrets[@]}"
  cat << EOF
${BLUE}ProTraderSim GitHub Secrets Manager${NC}

Usage: bash $0 [COMMAND] [OPTIONS]

Commands:
  ${GREEN}--list${NC}              List current secrets
  ${GREEN}--set${NC} NAME VALUE    Add or update a secret
  ${GREEN}--delete${NC} NAME       Delete a secret
  ${GREEN}--interactive${NC}       Interactive setup wizard (prompts for each secret)
  ${GREEN}--verify${NC}            Show which secrets are configured (${total_expected} total)
  ${GREEN}--generate-jwt${NC}      Generate JWT RSA key pair
  ${GREEN}--from-file${NC} FILE   Load secrets from file (default: .github/secrets.env)
  ${GREEN}--help${NC}              Show this help message

Environment Variables:
  REPO                Repository (default: krishan/protrader-sim)
  SECRETS_FILE        Secrets file (default: .github/secrets.env)

Examples:
  # List all secrets
  bash $0 --list

  # Set a single secret
  bash $0 --set TURBO_TOKEN "vercel_..."

  # Generate JWT keys
  bash $0 --generate-jwt

  # Interactive mode
  bash $0 --interactive

  # Load from file
  bash $0 --from-file /path/to/secrets.env

  # Verify setup
  bash $0 --verify

EOF
}

# Main script
main() {
    check_prerequisites
    
    case "${1:---help}" in
        --list)
            list_secrets
            ;;
        --set)
            if [ -z "$2" ] || [ -z "$3" ]; then
                echo -e "${RED}✗ Usage: $0 --set NAME VALUE${NC}"
                exit 1
            fi
            set_secret "$2" "$3"
            ;;
        --delete)
            if [ -z "$2" ]; then
                echo -e "${RED}✗ Usage: $0 --delete NAME${NC}"
                exit 1
            fi
            delete_secret "$2"
            ;;
        --interactive)
            interactive_setup
            ;;
        --verify)
            verify_secrets
            ;;
        --generate-jwt)
            generate_jwt_keys
            ;;
        --from-file)
            if [ -z "$2" ]; then
                SECRETS_FILE=".github/secrets.env"
            else
                SECRETS_FILE="$2"
            fi
            set_secrets_from_file "$SECRETS_FILE"
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}✗ Unknown command: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
