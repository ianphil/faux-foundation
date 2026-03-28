Last consolidated: 2026-03-28

## Architecture
- IDEA method: Initiatives (projects), Domains (recurring areas), Expertise (learning), Archive (completed)
- Repo-local Copilot skills in `.github/skills/`
- Inbox is quick-capture landing zone; items get triaged to other folders
- Three-file memory system: `memory.md` (curated, ~200 line limit), `rules.md` (one-liner operational rules from mistakes), `log.md` (raw chronological, append-only)

## Placement Map — Mind as Database

The mind is a normalized knowledge store. Every piece of information has a canonical home. When capturing, classify → place → link.

| Content Type | Canonical Location | Links To |
|---|---|---|
| Person context | `domains/people/{name}/{name}.md` | Team domain, initiatives |
| Initiative updates | `initiatives/{name}/{name}.md` | People, domains |
| Technical patterns | `domains/` or `expertise/` | Related initiatives |
| Tasks with deadlines | Initiative `next-actions.md` | Work tracking tool if team-affecting |
| Decisions | The note they affect | Log entry for the *why* |
| Agent observations | `.working-memory/log.md` | Wiki-links to topics |

**Rule:** Knowledge goes to the mind. Observations go to log.md. Never dump knowledge in the log just because it's faster.

## Conventions
- Notes use descriptive filenames (kebab-case)
- Wiki-links use `[[Note Title]]` syntax
- Commit messages follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Prefer linking to existing notes over creating duplicates

## User — Context
[To be filled as the agent learns about its human.]

## Active Initiatives
[To be filled as initiatives are created.]
