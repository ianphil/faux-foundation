# The Faux Foundation

A fake foundation staffed by artificial agents doing real work.

Named after MacGyver's Phoenix Foundation — except *faux*, because the agents aren't real people, but the knowledge they produce is.

## What It Does

Star a repo on GitHub. A few minutes later, MacGyver — the first agent — notices, clones it, reverse-engineers the codebase, and commits a structured product-level spec. Stars become knowledge. The mind grows by paying attention.

## Architecture

Dapr-powered monorepo. Each agent gets a mind (genesis-style) and handlers. `dapr.yaml` defines all apps — one file, three execution tiers.

```
agents/macgyver/mind/    → Genesis mind (SOUL.md, expertise/, skills)
agents/macgyver/src/     → Job handler, clone+invoke, auto-commit
apps/chat/               → React + Vite chat UI (nginx in production)
apps/tools/              → Tool service (web_fetch, search)
platform/components/     → Shared Dapr components (state, LLM conversation)
scripts/                 → dev.ps1 (launcher), kind-load.ps1 (image builder)
```

## Stack

- **Runtime:** Node.js + [Copilot SDK](https://github.com/github/copilot-sdk) + bundled CLI (adapted from [skeleton](https://github.com/ianphil/skeleton))
- **Orchestration:** [Dapr](https://dapr.io/) Multi-App Run — sidecars, service invocation, state, pub/sub
- **Scheduling:** Dapr Jobs API — `@every 30s` poll, configurable via `POLL_INTERVAL`
- **Trigger:** Poll `GET /user/starred?sort=created` (GitHub App as graduation path)
- **Spec format:** Product-level reverse specs via [reverse](https://github.com/ianphil/reverse) skill

## Apps

| App | Path | Port | Description |
|-----|------|------|-------------|
| **MacGyver** | `agents/macgyver/src/` | 3000 | Star poller + reverse-spec agent |
| **Chat** | `apps/chat/` | 8080 | React + Vite chat UI (nginx in container) |
| **Tools** | `apps/tools/` | 3100 | Tool service — web_fetch, Brave search |
| **LLM Proxy** | `../copilot-llm-svc` | 5100 | Copilot SDK proxy (.NET, external repo) |

## External Dependencies

| Dependency | Local Path | Repo |
|-----------|------------|------|
| **copilot-llm-svc** | `../copilot-llm-svc` | [copilot-llm-svc](https://github.com/ianphil_microsoft/copilot-llm-svc) |

Referenced by `dapr.yaml` (relative path) and `azure.yaml` (azd service).

## Local Development

Three-tier dev loop — one `dapr.yaml`, three execution modes:

| Tier | Command | What It Does | When to Use |
|------|---------|--------------|-------------|
| **Dev** | `.\scripts\dev.ps1` | Processes + auto-sidecars | Daily coding, fast iteration (~3s startup) |
| **Validate** | `.\scripts\dev.ps1 -Kind` | Kind cluster, real containers + K8s | Pre-deploy smoke test, Dockerfile validation |
| **Deploy** | `azd up` | Azure Container Apps | Production |

### Prerequisites

- **Dapr CLI** — `winget install Dapr.CLI` then `dapr init`
- **Kind** — `winget install Kubernetes.kind` then `kind create cluster --name faux-foundation` and `dapr init -k`
- **Node.js** and **.NET SDK** on host (for process mode)
- **Docker Desktop** running (for Kind mode)
- **azd** environment configured with `GITHUB_TOKEN`, `COPILOT_TOKEN`, `BRAVE_API_KEY`

### Quick Start

```powershell
# Process mode — runs apps as native processes with Dapr sidecars
.\scripts\dev.ps1

# Kind mode — runs apps as containers in a local K8s cluster
.\scripts\kind-load.ps1          # build images + load into Kind (first time / after changes)
.\scripts\dev.ps1 -Kind          # deploy to Kind with port-forward to localhost:8080
```

`dev.ps1` automatically loads secrets from `azd env get-values` and injects them into `dapr.yaml` at runtime.

## Deployment

Azure Container Apps via `azd`. Three services: `macgyver`, `llm-proxy`, `chat`.

```bash
azd env list                      # show environments (default: dev)
azd deploy                        # deploy all services
azd deploy llm-proxy chat         # deploy specific services
```

Infrastructure is defined in `infra/` (Bicep). Use `azd up` only when infra changes are needed.

## Agents

| Agent | Persona | Job |
|-------|---------|-----|
| **MacGyver** | Angus MacGyver (1985) — practical, warm, takes things apart | Reverse-specs starred GitHub repos |

## License

MIT
