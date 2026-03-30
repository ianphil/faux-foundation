# The Faux Foundation

A fake foundation staffed by artificial agents doing real work.

Named after MacGyver's Phoenix Foundation — except *faux*, because the agents aren't real people, but the knowledge they produce is.

## What It Does

Star a repo on GitHub. A few minutes later, MacGyver — the first agent — notices, clones it, reverse-engineers the codebase, and commits a structured product-level spec. Stars become knowledge. The mind grows by paying attention.

## Architecture

Dapr-powered monorepo. Each agent gets a mind (genesis-style) and handlers. One `docker compose up` runs everything.

```
agents/macgyver/mind/    → Genesis mind (SOUL.md, expertise/, skills)
agents/macgyver/src/     → Job handler, clone+invoke, auto-commit
platform/                → Shared Dapr config (state, secrets, components)
```

## Stack

- **Runtime:** Node.js + [Copilot SDK](https://github.com/github/copilot-sdk) + bundled CLI (adapted from [skeleton](https://github.com/ianphil/skeleton))
- **Scheduling:** Dapr Jobs API — `@every 30s` poll, configurable via `POLL_INTERVAL`
- **Trigger:** Poll `GET /user/starred?sort=created` (GitHub App as graduation path)
- **Spec format:** Product-level reverse specs via [reverse](https://github.com/ianphil/reverse) skill

## Apps

| App | Path | Description |
|-----|------|-------------|
| **Chat** | `apps/chat/` | React + Vite chat UI served via nginx |
| **Tools** | `apps/tools/` | Tool service for agentic `web_fetch` and other capabilities |

## External Dependencies

| Dependency | Local Path | Repo |
|-----------|------------|------|
| **copilot-llm-svc** | `../copilot-llm-svc` | [copilot-llm-svc](https://github.com/ianphil_microsoft/copilot-llm-svc) |

Referenced by both `docker-compose.dev.yml` (build context) and `azure.yaml` (azd service).

## Local Development

Base compose (`docker-compose.yml`) runs macgyver + Dapr sidecar. The dev overlay (`docker-compose.dev.yml`) adds llm-proxy, chat, tool-service, and their Dapr sidecars.

```bash
# Run everything locally
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

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
