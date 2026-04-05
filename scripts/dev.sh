#!/usr/bin/env bash
# scripts/dev.sh — Start the Faux Foundation dev loop
# Usage: ./scripts/dev.sh          (process mode — daily driver)
#        ./scripts/dev.sh --kind   (Kind cluster — container validation)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

KIND=false
[[ "${1:-}" == "--kind" ]] && KIND=true

# Load azd env vars into the current process
echo -e "\033[36mLoading azd environment...\033[0m"
while IFS='=' read -r name value; do
    value="${value%\"}"
    value="${value#\"}"
    export "$name=$value"
done < <(azd env get-values)
echo -e "\033[32mEnvironment loaded.\033[0m"

# Resolve ${VAR} placeholders in dapr.yaml with actual env values
resolve_vars() {
    local content
    content=$(<dapr.yaml)
    while [[ "$content" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)\} ]]; do
        local var="${BASH_REMATCH[1]}"
        local val="${!var:-\$\{$var\}}"
        content="${content//\$\{$var\}/$val}"
    done
    printf '%s' "$content"
}

resolved="$(resolve_vars)"

if $KIND; then
    # Clean stale deploy manifests so Dapr regenerates with new env values
    find . -type d -name ".dapr" -exec sh -c '
        deploy="$1/deploy"
        [ -d "$deploy" ] && rm -rf "$deploy"
    ' _ {} \;
    ext_deploy="$(cd ../copilot-llm-svc && pwd)/.dapr/deploy"
    [ -d "$ext_deploy" ] && rm -rf "$ext_deploy"

    # Write resolved config to temp file
    tmp_yaml="$(mktemp /tmp/dapr-resolved-XXXXXX.yaml)"
    printf '%s' "$resolved" > "$tmp_yaml"

    cleanup() {
        [[ -n "${port_forward_pid:-}" ]] && kill "$port_forward_pid" 2>/dev/null || true
        rm -f "$tmp_yaml"
    }
    trap cleanup EXIT

    echo -e "\033[33mStarting in Kind mode (container validation)...\033[0m"
    dapr run -k --run-file "$tmp_yaml" &
    dapr_pid=$!

    echo -e "\033[36mWaiting for pods...\033[0m"
    kubectl wait --for=condition=ready pod -l app=chat --timeout=120s --context kind-faux-foundation 2>/dev/null

    echo -e "\033[32mChat available at http://localhost:8080\033[0m"
    kubectl port-forward svc/chat 8080:80 --context kind-faux-foundation &
    port_forward_pid=$!

    wait "$dapr_pid"
else
    echo -e "\033[33mStarting in process mode (fast iteration)...\033[0m"
    echo -e "\033[32mChat available at http://localhost:8080\033[0m"
    printf '%s' "$resolved" | dapr run --run-file -
fi
