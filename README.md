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

## Agents

| Agent | Persona | Job |
|-------|---------|-----|
| **MacGyver** | Angus MacGyver (1985) — practical, warm, takes things apart | Reverse-specs starred GitHub repos |

## License

MIT
