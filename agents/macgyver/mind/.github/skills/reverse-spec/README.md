# Reverse

`reverse` is a Codex skill for reverse-engineering software into product-level specifications.

It is designed for cases where you want to study an OSS project, internal system, API, or product artifact in terms of:
- operator value
- user value
- system capabilities
- observable behavior
- constraints
- non-goals

The goal is to describe what the software does and why it matters without collapsing into implementation details.

## Files

- `SKILL.md`: The actual skill instructions and workflow.
- `agents/openai.yaml`: UI metadata for the skill name, description, and default prompt.
- `references/prompts.md`: Reusable prompt pack for different reverse-engineering stages.
- `references/rubric.md`: Rubric for spotting implementation leakage and rewriting drafts at the product layer.

## How To Use

Invoke the skill explicitly in a Codex prompt:

```text
Use $reverse to analyze this repo as a product, not an implementation.
Produce:
1. problem statement
2. actors and goals
3. operator value
4. core capabilities
5. observable behaviors
6. edge cases
7. implementation leakage
```

You can also ask for narrower outputs:

```text
Use $reverse to extract the operator value and observable behaviors of this system.
```

```text
Use $reverse to convert these notes into a product spec and flag implementation leakage.
```

## Recommended Workflow

1. Start with product framing.
2. Extract actors and jobs-to-be-done.
3. Group capabilities by outcome.
4. Describe only black-box behavior.
5. Convert observations into testable requirements.
6. Run a leakage review and move technical details out of the product spec.

## Prompt Sequence

The usual sequence is:

1. `Product Lens`
2. `Capability Extraction`
3. `Observable Behavior`
4. `Requirement Conversion`
5. `Leakage Review`

These prompts live in `references/prompts.md`.

## What Good Output Looks Like

A good reverse-engineered product spec:
- survives a rewrite in another stack
- can be verified by black-box testing
- explains user or operator value
- avoids naming libraries, frameworks, classes, or internal workers unless they are part of the external contract

## Reversed Specs

- [Claude Subconscious](https://gist.github.com/ianphil/550d53d7715568c14b2cd617c086c581) — Persistent background agent that gives Claude Code long-term memory via Letta. Observes sessions, reads codebases, whispers guidance back. (2026-03-28)

## Notes

The skill root is `~/src/reverse`, not a nested directory. Treat this folder itself as the skill.
