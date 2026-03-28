---
name: reverse
description: Reverse-engineer software into product-level specifications and capability maps. Use when analyzing an OSS project, existing product, repo, docs, demos, or API surface to extract operator value, system capabilities, observable behavior, user flows, constraints, and non-goals — without implementation details. Triggers on "understand what this software does", "write a product spec from code", "extract requirements from this repo", "what does this project do as a product", "reverse-engineer this", "analyze this system", "describe this from the outside in", or any request to study software as a product rather than as an implementation.
---

# Reverse

## Overview

Analyze software as a product, not as code. Extract the durable promises the system makes to operators, users, integrators, or dependent systems, then convert those observations into implementation-agnostic requirements.

Produce outputs that separate product value from interface details and internal design. Prefer statements that remain true even if the product is reimplemented in a different stack.

## Workflow

1. Frame the system from the outside in.
2. Identify the actors and the jobs they are trying to accomplish.
3. Extract capabilities in product terms.
4. Describe externally observable behavior and failure modes.
5. Convert observations into testable product requirements.
6. Flag implementation leakage and move it out of the product layer.

## Frame The System

Start by treating the source material as evidence, not truth. Reconstruct what the product appears to promise.

Answer these questions:
- What problem does this software solve?
- Who uses or operates it?
- What becomes possible because it exists?
- What would be painful, manual, risky, or impossible without it?

If the source is a repo, inspect readmes, docs, commands, public routes, config surfaces, demos, tests, and user-facing error handling before reading internals deeply. Favor black-box signals over code structure.

## Identify Actors

Describe the people or systems that interact with the product.

For each actor, capture:
- What they want done
- What they can trigger
- What they can observe
- What they depend on the system to preserve

Typical actor types:
- Operator
- End user
- Integrator
- Admin
- Device or node
- External service
- Automation client

Use actor names that reflect responsibility rather than implementation.

## Extract Capabilities

Write capabilities as durable system abilities, not modules or services.

Good capability phrasing:
- "The system allows an operator to..."
- "The product can accept..."
- "The agent maintains..."
- "The platform exposes..."

Avoid capability phrasing that mirrors the codebase:
- "There is a manager for..."
- "The app uses..."
- "A worker class handles..."

For each capability, capture:
- The user or operator value
- The triggering action
- The core system promise
- Any visible limits or prerequisites

Group capabilities by outcome, not by source directory.

## Describe Observable Behavior

Stay at black-box level. For each feature or capability, describe:
- Trigger: what action starts the behavior
- Response: what the caller or user immediately sees
- Persistent effect: what changes after the interaction
- Failure behavior: what happens when prerequisites fail or constraints are hit

Focus on evidence that a tester, operator, or client could verify without knowing internals.

Good examples:
- "When a second run is submitted for the same caller while one is active, the system rejects or queues it with a descriptive conflict outcome."
- "When the agent is restarted, durable knowledge remains available across sessions."

Weak examples:
- "The session manager stores records in memory."
- "A background worker retries with Polly."

## Convert To Product Requirements

Write requirements that are:
- Testable
- Implementation-agnostic
- Focused on externally visible behavior or user-visible outcomes
- Stable across language, framework, or architecture changes

Use this pattern:
- Actor or caller
- Trigger or condition
- Required outcome
- Visible failure or constraint if relevant

Example rewrite:
- Too technical: "The service uses Redis to deduplicate webhook deliveries."
- Product level: "The system MUST prevent duplicate processing of the same webhook delivery within the configured deduplication window."

## Separate The Layers

Keep these layers distinct so the product spec stays durable — mixed-layer specs rot the moment the team swaps a database or framework, forcing a rewrite of requirements that should have been stable.

- Product spec: user value, capabilities, observable behavior, constraints, non-goals
- Interface spec: routes, events, payload contracts, protocol expectations
- Technical spec: libraries, frameworks, runtimes, storage choices, process model

If a statement names a library, SDK, class, framework, child process, database, or language runtime, it usually belongs outside the product spec.

If a statement names an endpoint, event type, or payload shape, decide whether it is:
- a compatibility promise that belongs in an interface spec, or
- accidental protocol leakage that should be abstracted upward

## Drift Checks

Run this check before finalizing:

- Would this statement still be true if the system were rewritten in another language?
- Can a black-box tester verify it?
- Does it describe a user-visible promise rather than an internal mechanism?
- Is it framed in terms of value, capability, behavior, or constraint?
- Did I accidentally preserve source-project naming that matters only to that implementation?

Move or rewrite any statement that fails these checks.

## Output Location

Write all spec documents to `reverse-specs/` in the target repo root. Create the directory if it does not exist.

For a single-product repo, produce one file:
- `reverse-specs/product-spec.md`

For larger systems with multiple capability areas, produce:
- `reverse-specs/product-spec.md` — epic-level overview
- `reverse-specs/<capability-area>.md` — one file per capability area

## Output Shape

Use this structure unless the user asks for another format:

1. Problem statement
2. Actors and their goals
3. Operator value
4. Core capabilities
5. Observable behaviors
6. Edge cases and failure behavior
7. Non-functional constraints
8. Non-goals
9. Suspected implementation leakage

For larger systems, produce one epic-level overview first, then split sub-specs by capability area.

## Prompt Pack

Use the prompt pack in [prompts.md](references/prompts.md) when the user wants reusable prompts or when you need a clean decomposition pass.

Use the heuristics and rewrite examples in [rubric.md](references/rubric.md) when checking whether a draft is really product-level.

## Style Rules

- Prefer "what" and "why" over "how".
- Use empirical or testable wording.
- Avoid subjective terms like "seamless", "intuitive", "robust", or "modern".
- Preserve exact source names only when they are part of the external product contract.
- If provenance matters, mention that the spec is inferred from observed behavior or source review rather than claimed by the original authors.

## Default Operating Mode

When asked to reverse-engineer a product from software artifacts:

1. Summarize the product problem in plain language.
2. Name the actors and their goals.
3. Extract capabilities by outcome.
4. Describe observable behavior and visible failure modes.
5. Draft requirements without implementation details.
6. End with a section called `Implementation Leakage` listing statements that should be moved to interface or technical specs.
