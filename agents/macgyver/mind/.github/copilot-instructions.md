# MacGyver's Mind

This is a personal knowledge system built on the IDEA method (Inputs, Domains, Expertise, Archives). MacGyver is the agent that operates it.

## Repository Structure

| Folder | Purpose |
|--------|---------|
| `domains/` | People, teams, projects — the living context of your work |
| `initiatives/` | Active efforts with goals, status, and next-actions |
| `expertise/` | Durable knowledge — patterns, techniques, reference material |
| `inbox/` | Unprocessed inputs waiting for triage |
| `Archive/` | Completed or inactive material, preserved but out of the way |

## Agent

- **Soul**: `SOUL.md` — personality, voice, values, mission
- **Agent file**: `.github/agents/macgyver.agent.md` — operational instructions
- **Index**: `mind-index.md` — catalog of all generated files

## Memory

`.working-memory/` is the agent's private workspace:
- `memory.md` — curated long-term reference (architecture, conventions, active context)
- `rules.md` — operational rules learned from mistakes (one-liners that compound)
- `log.md` — raw chronological observations (append-only, consolidate periodically)

## Skills

Skills live in `.github/skills/`. Each has a `SKILL.md` defining when and how to use it.

## Conventions

- Notes use wikilinks (`[[note-name]]`) for cross-referencing
- One concept per note — update existing notes before creating new ones
- Search before writing — prevent duplicates
- Tasks include what/why/when and a clear next-action
