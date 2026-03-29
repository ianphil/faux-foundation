Now I have everything I need. Let me write the spec.

---

# Faux Foundation — Product Spec

*Reverse-engineered by MacGyver · ianphil/faux-foundation*

---

## Problem Statement

Starring a GitHub repo is the cheapest possible signal of "this is interesting." But cheap signals have a problem: they don't compound. You star something, forget about it, and three months later you're vaguely aware you saw something like this before but can't find it and can't remember what made it worth your attention.

Faux Foundation turns that passive gesture into active knowledge. Star a repo, and a few minutes later a structured product spec appears in your mind — written in plain language, committed to version control, and published to a searchable website. Stars become durable understanding instead of a pile of bookmarks you'll never revisit.

---

## Actors & Goals

**The Operator** — the person who runs the system. They want their GitHub stars to become organized knowledge without doing anything beyond the starring itself. They configure it once (a token, a poll interval) and let it run. Their only ongoing action is starring repos.

**MacGyver (the agent)** — the autonomous AI that does the actual work. It wakes up on a schedule, checks for new stars, clones repos, reads them thoroughly, and writes specs in its own voice. It has a personality (practical, warm, curious), a memory (persisted across sessions in a working-memory folder), and a mission (every spec it writes makes the mind smarter). Think of it less like a script and more like a tireless research assistant who never sleeps and finds something interesting in every codebase.

**GitHub** — plays two roles. It's both the source of truth (stars live here, repos live here) and the output destination (specs get committed back to the mind repo, and the CI pipeline publishes them to GitHub Pages). GitHub is the environment, not just an API.

**Visitors to the spec site** — anyone who reads the published specs. They get a clean, searchable website of product-level analyses organized by owner/repo. Light and dark mode. No login required.

---

## Operator Value

The system makes one specific thing possible that wasn't before: **continuous, autonomous research from passive signals.**

You don't write prompts. You don't schedule analysis jobs. You don't paste URLs anywhere. You star a repo — something you were going to do anyway — and the analysis happens on its own, commits to a repo you control, and appears on a website you can share.

Over time, the mind accumulates a growing library of product-level specs for every project you found interesting enough to star. That library gets better the longer the system runs, because each spec sits alongside every other spec MacGyver has written — building context, recognizing patterns, improving at the craft.

---

## Core Capabilities

**Star detection.** The system continuously monitors a GitHub account's starred repositories. On first run, it records the existing stars without analyzing them — you don't get flooded with specs for every repo you've ever starred. Only new stars trigger analysis. Once a repo is processed, it isn't processed again even if the star persists.

**Autonomous repo analysis.** When a new star is detected, the system clones the repo and has MacGyver read it — README, code, tests, docs, CI config, the whole thing. The result is a structured product-level spec: what the software does, who uses it, what its capabilities are, and what it deliberately doesn't do. The analysis is written in MacGyver's voice — conversational, opinionated, genuinely curious. Not a template dump.

**Knowledge persistence.** Each spec is saved to the mind repo at `expertise/{owner}/{repo}.md` and immediately committed and pushed. The spec exists in version control and survives anything that might happen to the running agent. The mind grows in place — you can read specs in your editor, search them with git grep, or treat them like any other markdown library.

**Published spec site.** Every time a spec is committed, the CI pipeline runs and rebuilds a static website listing all analyzed repos. Each spec gets its own page. The index shows all analyzed repos with their first paragraph as a summary, sorted alphabetically. Supports light and dark mode. Deploys automatically to GitHub Pages — no manual publishing step.

**Agent identity and memory.** MacGyver isn't a stateless function. It has a soul (`SOUL.md` — personality, values, voice), operating instructions (the agent file), and working memory (files it writes to across sessions). The memory includes curated long-term notes, rules learned from past mistakes, and a chronological log. This is what makes the writing feel like someone rather than something.

---

## Observable Behaviors

**New star detected:**
- *Trigger:* A repo appears in the starred list that wasn't there on the previous poll.
- *Response:* The system logs that it found new stars and begins processing each one sequentially. The operator sees log lines in the container output.
- *Persistent effect:* A spec file appears in `expertise/{owner}/{repo}.md`, committed and pushed to the mind repo. The known-stars state file is updated.
- *Failure:* If cloning fails, the spec isn't written and the error is logged. The state is still updated so the repo isn't re-attempted on the next cycle indefinitely. If the AI call fails or times out, the error is logged and the spec isn't committed.

**First run / seeding:**
- *Trigger:* The system starts with no known-stars file.
- *Response:* It fetches all current starred repos, records them as "known," and logs the count.
- *Persistent effect:* The known-stars file is written. No specs are generated.
- *Failure:* If the GitHub API call fails, the agent logs the error and tries again on the next poll interval.

**Concurrent stars:**
- *Trigger:* Multiple repos are starred between poll intervals.
- *Response:* All new repos are processed, one at a time, in the order they appear from the API.
- *Persistent effect:* One spec per repo, all committed and pushed.

**Health check:**
- *Trigger:* An HTTP GET to `/health`.
- *Response:* `{"status": "ok"}` with a 200 status code.
- *Persistent effect:* None. This is a liveness probe, not a control surface.

**CI publishing:**
- *Trigger:* A commit lands on the `master` branch that touches a spec file under `expertise/` or the build script.
- *Response:* The pipeline converts all specs from markdown to HTML and generates an index page.
- *Persistent effect:* The GitHub Pages site is updated with all specs. New specs appear publicly within a minute or two of being committed.

---

## Edge Cases

**The agent starts fresh on every boot.** The mind repo is cloned at startup (unless a pre-configured mind root is pointed at). If the mind repo clone fails, the process throws immediately — it won't limp along without a mind.

**Concurrent polls are blocked.** If a poll cycle takes longer than the poll interval (say, because a repo is large and the AI is slow), the next poll is skipped entirely until the current one finishes. You won't get parallel analyses piling up.

**Known-stars state lives in the mind repo.** If the agent restarts and has a fresh clone, it re-reads the state file from the repo. That means it won't re-analyze repos that were already processed in a previous run — as long as the state was committed. If the state write fails before commit, it's possible for a repo to get analyzed twice.

**The AI timeout is configurable.** Default is 2 minutes locally, bumped to 10 minutes in the Azure deployment config. Large repos can take a while. If it times out, the spec isn't written and the error is logged — no partial specs get committed.

**The spec format is MacGyver's call.** The analysis prompt gives the AI the reverse-spec skill and tells it to write in MacGyver's voice. There's no post-processing or schema validation. The output is whatever MacGyver writes. That's a feature and a constraint simultaneously — the quality is as good as the AI prompt, and there's no structured data to query.

---

## Non-Functional Constraints

- **Poll latency:** New stars are detected within one poll interval (default 30 seconds). The spec appears in the repo after analysis completes, which varies by repo size and AI response time — typically a few minutes end to end.
- **Single instance:** The system runs as one container with one agent. There's no horizontal scaling. Sequential processing is by design.
- **Requires a GitHub token:** No token, no operation. The token is used for reading starred repos, cloning private repos, and pushing specs back to the mind repo.
- **Requires Copilot access:** The AI analysis goes through the GitHub Copilot SDK. The operator needs a GitHub account with Copilot access. No Copilot, no specs.
- **Deployable locally or on Azure:** Docker Compose for local runs, Azure Container Apps via the Azure Developer CLI for cloud deployment. The cloud config uses Azure Container Registry to store the image.
- **State is in-memory by default:** The Dapr state store component used in docker-compose is in-memory only. Restarting the Dapr sidecar clears it. However, the known-stars file in the mind repo serves as the durable state, so this is more of a runtime cache constraint than a data loss risk.

---

## Non-Goals

**This is not a code review tool.** It produces product-level specs — what the software does and who it's for — not assessments of code quality, security posture, or implementation decisions.

**This is not a chat interface.** There's no way to ask MacGyver questions, request a specific analysis, or interact with it in real time. The only input it accepts is GitHub stars.

**This is not multi-user.** One GitHub account, one agent, one mind. The concept of multiple operators sharing a single instance isn't addressed.

**It does not analyze repos that were starred before deployment.** The seeding behavior on first run exists specifically to skip your existing star history. If you want specs for old stars, you'd have to trigger them manually — which the system doesn't provide a mechanism for.

**It does not monitor for un-starring.** If you remove a star, the spec stays. There's no cleanup mechanism.

**It does not produce structured data.** The output is markdown. There's no database, no API, no queryable output. What you get is a git repo full of well-written markdown files and a static website on top of them.

---

## What's Interesting Under the Hood

*(Things worth noting even if they're a bit implementation-adjacent)*

The agent has a genuine identity — `SOUL.md` is a real character document, not a system prompt template. It defines who MacGyver is, not just what he does. The operating instructions are kept separate from the soul, and the soul explicitly wins in cases of conflict. That's a thoughtful design choice about how to build an agent with consistent voice.

The mind repo is both the agent's home and its output. The agent clones its own source repo on boot, reads its personality from that clone, writes specs back into it, and pushes. The system literally grows itself. There's something neat about that loop.

The "seeding" behavior on first run is the right call. Without it, every existing star would trigger analysis on first deploy. With it, the system cleanly defines "new" as "new since I started watching" — a sensible contract.

The published site rebuilds on every push to `expertise/` — meaning every spec commit automatically triggers a publish. No manual deploy step, no separate publication workflow. Stars in, specs out, site updated. The whole pipeline is fully automatic once you configure and start it.

---

*Spec written by MacGyver — practical, hands-on, finds something interesting in every codebase.*