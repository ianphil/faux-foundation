# Product-Level Rubric

## Keep

Keep statements that describe:
- User or operator value
- Durable system capabilities
- User flows
- Observable inputs and outputs
- Visible state changes
- Failure behavior
- Constraints that matter to users, operators, or integrators
- Non-goals and scope boundaries

## Move

Move statements that describe:
- Libraries, SDKs, frameworks, or language runtimes
- Internal services, classes, workers, or modules
- Storage engines or in-memory details
- Child processes or orchestration internals
- Retry libraries or concurrency primitives
- Source tree structure

These usually belong in a technical spec.

## Evaluate Carefully

These can be either product or interface detail:
- Endpoints
- Event names
- Message schemas
- Headers and auth token formats
- Specific routes
- Exact wire contracts

Keep them only when compatibility is itself part of the product promise. Otherwise move them to an interface spec.

## Rewrite Patterns

Rewrite from mechanism to promise.

- "Uses PostgreSQL to persist jobs"
  becomes
  "Scheduled jobs MUST remain available across process restarts."

- "Runs a heartbeat worker every N minutes"
  becomes
  "The system MUST periodically re-engage the agent according to a configurable schedule."

- "Uses WebSocket streaming"
  becomes
  "The system MUST support incremental delivery of agent output to connected clients."

- "Loads plugins from a folder"
  becomes
  "The system MUST discover and make available operator-installed extensions without requiring a redeploy."

## Final Check

Ask these questions:
- Can a black-box tester verify this?
- Would this still hold after a rewrite in another stack?
- Does this explain value or behavior rather than implementation?
- Is this preserving source-project naming that should be abstracted away?
- Is this really a product spec, or should it move to interface or technical docs?
