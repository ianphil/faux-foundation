Here is the complete product specification:

---

# Product Specification: `just`

> Inferred from source review, documentation, tests, and CI configuration of [casey/just](https://github.com/casey/just). Statements reflect observed behavior and public documentation, not author claims.

---

## 1. Problem Statement

Developers on any project accumulate a collection of commands they run repeatedly: building, testing, linting, deploying, seeding databases, resetting environments. These commands are long, easy to mistype, and differ between team members because they live in personal notes, shell history, or READMEs that quickly go stale.

`make` is the traditional solution, but it was designed as a build system, not a command runner. Using it for general task automation forces developers to work around its file-timestamp model, `.PHONY` declarations, tab-only indentation, and unintuitive variable scoping.

`just` solves this by providing a dedicated command runner: a single, portable tool that reads a `justfile` in the project directory, validates the task graph before running anything, and executes named recipes reliably from any subdirectory. It makes project-level commands first-class, reproducible, and discoverable.

---

## 2. Actors and Their Goals

### Developer (primary user)
- Wants to run project commands by short name without memorizing long invocations.
- Wants to discover what commands are available in an unfamiliar project.
- Wants commands to fail loudly and clearly when something goes wrong.
- Wants to pass arguments to commands without editing files.

### Team Lead / Project Maintainer
- Wants all team members to run the same commands in the same way.
- Wants to encode project conventions (build order, required env vars, confirmation gates) in a checked-in file.
- Wants to compose complex workflows from simpler named steps.

### CI/CD System (automation actor)
- Needs to invoke named tasks from scripts or pipeline definitions.
- Needs predictable exit codes and stderr output for build observability.
- Needs environment variable passthrough so secrets injected into the environment reach recipe commands.

### Integrator (shell/editor tooling)
- Needs shell completion scripts to surface available recipes.
- Needs a machine-readable recipe listing (JSON dump) to drive UI or tooling.
- Needs stable CLI flags for scripted invocation.

---

## 3. Operator Value

| Without `just` | With `just` |
|---|---|
| Commands live in personal notes or READMEs and drift | Commands are versioned in the project repo alongside code |
| Developers must remember long, fragile shell invocations | Short recipe names invoke complex commands reliably |
| Errors discovered mid-execution after partial side effects | Recipe graph validated before any command runs |
| Onboarding requires reading prose docs to find commands | `just --list` reveals all available commands instantly |
| make workarounds required for non-build tasks | A purpose-built runner with no build-system impedance |
| Platform differences cause silent breakage | Cross-platform recipe syntax with explicit OS conditions |

---

## 4. Core Capabilities

### 4.1 Recipe Definition and Execution
The system allows a developer to define named recipes in a `justfile` and invoke them by name from the command line. A recipe is a named, ordered sequence of shell commands. Recipes may depend on other recipes. The system executes the full dependency graph in declaration order, deduplicating recipes that appear multiple times.

### 4.2 Parameterized Recipes
Recipes accept named parameters with optional defaults. Parameters may be required or variadic (accepting one or more, or zero or more values). Arguments are passed positionally on the command line after the recipe name. The system makes parameters available as interpolations within recipe commands and, optionally, as environment variables.

### 4.3 Variables and Expressions
The justfile supports named variables whose values are string literals, shell command outputs (evaluated at load time via backtick expressions), or computed expressions using built-in functions. Variables may be exported to the shell environment of all recipe commands. Variable values can be overridden at invocation time via CLI flags or environment variables.

### 4.4 Pre-execution Validation
Before running any commands, the system validates the full recipe graph: it detects undefined recipes, circular dependencies, missing required parameters, and unknown identifiers. If validation fails, no commands run. This prevents partial execution side effects from misconfigured justfiles.

### 4.5 Recipe Discovery and Listing
The system can list all available (non-private) recipes with their parameters and doc comments. Recipes can be grouped and filtered. The listing can be rendered as human-readable text or as structured JSON for tooling consumption. Private recipes (prefixed with `_` or marked with an attribute) are hidden from listings by default.

### 4.6 Multi-Recipe Invocation
A developer can invoke multiple recipes in a single `just` command. Each is executed in the order specified. Recipes are deduplicated across the full invocation: the same recipe with the same arguments runs only once.

### 4.7 Cross-Platform Execution
The system operates on Linux, macOS, Windows, and BSD platforms. Recipes can be conditioned on the operating system via attributes, so a single justfile can encode platform-specific variants of a command. The path-join operator always uses forward slashes regardless of host platform.

### 4.8 Modular Justfiles
A justfile can include other justfile modules by name. Each module has its own isolated namespace for variables and recipes. Recipes from modules are invoked using a `module::recipe` path syntax. Modules may be optional (no error if the file is absent).

### 4.9 Shell and Environment Configuration
The system supports configuring the shell used to execute recipes (interpreter and flags). It can automatically load a `.env` file and inject its contents as environment variables before recipe execution. The search path for the `.env` file is configurable.

### 4.10 Interactive and Scripted Modes
The system provides an interactive recipe chooser (backed by a configurable fuzzy-finder) for exploratory use. Recipes can require confirmation before executing, with a customizable prompt. Dry-run mode prints all commands that would execute without running them.

### 4.11 Formatting and Editing
The system can reformat a justfile to canonical style in place, or verify that an existing file is already canonically formatted (for use in CI). It can open the justfile in the user's configured editor. It can initialize a new justfile with a starter template.

### 4.12 Shell Completion
The system can emit completion scripts for common shells, enabling tab-completion of recipe names and flags in the developer's terminal.

### 4.13 Built-in Function Library
The system provides a library of pure functions available in justfile expressions, covering: string manipulation, path decomposition, environment inspection, hashing, UUID generation, date/time formatting, OS detection, filesystem queries, and terminal color/style sequences.

### 4.14 Hierarchical Justfile Search
When invoked from a subdirectory, the system ascends the directory tree to find the nearest justfile, allowing recipes to be run from anywhere within a project. The search can be bounded to prevent ascending above a specified ceiling directory.

### 4.15 Global Justfile
A developer can maintain a personal justfile at a fixed location and invoke it from anywhere using a flag, providing a personal command library independent of any project.

---

## 5. Observable Behaviors

### Recipe Execution
- Invoking `just <recipe>` runs all dependencies of that recipe first, then the recipe itself.
- Each command within a recipe is echoed to stderr before execution (unless suppressed).
- A non-zero exit from any command halts the recipe and all dependent recipes unless the ignore-error sigil is applied to that command.
- When multiple recipes are specified on the command line, they run left to right.

### Argument Handling
- Arguments following the recipe name are bound to the recipe's parameters in order.
- If a required parameter has no corresponding argument and no default, the system reports an error before execution.
- Variadic parameters consume all remaining arguments.
- Overrides supplied via `--set VAR VALUE` or `VAR=value` before `just` take precedence over justfile variable defaults.

### Output Streams
- Command echo (the command text itself) goes to stderr.
- Recipe command output is passed through unmodified.
- Error messages from `just` itself go to stderr.

### Exit Codes
- `0` when all requested recipes complete successfully.
- Non-zero when any recipe command fails, a recipe is undefined, parsing fails, or a required input is missing.
- The specific exit code propagates from the failing command where applicable.

### Dependency Deduplication
- If recipe A and recipe B both depend on recipe C, and both A and B are requested, C runs exactly once.
- Deduplication is keyed on recipe name and argument values; the same recipe with different arguments is treated as distinct.

### Dry Run
- `just --dry-run <recipe>` prints every command that would execute, including those in dependencies, without running any of them.

### Listing
- `just --list` prints all non-private recipes, their parameters, and any doc comment. Output is alphabetically sorted by default.
- `just --list --unsorted` preserves source order.
- `just --json` produces a machine-readable JSON representation of the justfile structure.

### Justfile Location
- The system searches the current directory and all parent directories for a file named `justfile`, `Justfile`, or `.justfile`.
- If `--justfile` is specified, that exact file is used and no search is performed.
- If no justfile is found, the system reports an error and exits non-zero.

### Default Recipe
- Invoking `just` with no recipe name runs the first recipe in the justfile, or the recipe explicitly marked as default.
- If the justfile has no recipes, the system lists available recipes instead.

### Confirmation Gate
- A recipe marked to require confirmation presents a prompt to the user before running. If the user does not confirm (or `--yes` is not passed), the recipe does not run.

### Dotenv Loading
- When configured, the system loads environment variable definitions from a `.env` file before executing any recipes.
- Variables already set in the environment take precedence over `.env` values (configurable).

### Module Invocation
- Recipes in modules are addressed as `module::recipe` or `just module recipe` on the command line.
- Module-local variables and settings are isolated; they do not affect the root justfile or other modules.

### Formatting Check
- `just --fmt --check` exits `0` if the justfile is already canonically formatted, `1` if it would be changed by formatting.

---

## 6. Edge Cases and Failure Behavior

- **Circular dependencies**: Detected before execution begins. The system reports the cycle and exits non-zero without running any commands.
- **Undefined recipe in dependency**: Caught at validation time, not at runtime. No commands execute.
- **Backtick evaluation failure**: If a backtick expression in a variable returns non-zero, the system halts and reports the failure. With lazy evaluation enabled, unused variables are not evaluated and cannot cause failures.
- **Missing `.env` file**: When dotenv loading is enabled without an explicit path, a missing `.env` is silently ignored. With an explicit path configured, a missing file is an error.
- **Variadic parameter arity**: `+` variadic requires at least one argument; `*` allows zero. Passing zero arguments to a `+` variadic is an error reported before execution.
- **OS-conditioned recipes with no match**: If no variant of an OS-conditioned recipe matches the current platform, the recipe is treated as absent.
- **Parallel dependencies and failure**: If one dependency in a parallel dependency group fails, the system waits for all parallel dependencies to finish before reporting the overall failure.
- **Signal interruption**: When the user interrupts execution, the system terminates cleanly and exits non-zero.
- **Duplicate recipe definitions**: By default, duplicate recipe names are an error. With the appropriate setting, the later definition wins silently.
- **Double-brace escaping**: To emit a literal `{{` in recipe output, use `{{{{`. A single `{{` always begins an interpolation.
- **Windows without a Unix shell**: Recipes requiring a Unix shell fail if no compatible shell is available. PowerShell must be explicitly configured as the shell to run natively on Windows.
- **`--working-directory` without `--justfile`**: The working directory flag requires an explicit justfile path and cannot be combined with automatic discovery.

---

## 7. Non-Functional Constraints

- **Startup latency**: The tool is invoked for every command run. Justfile parsing and validation must complete fast enough to not be perceptible as a delay in normal use.
- **Backward compatibility**: The justfile format and CLI flag surface are stable across versions. Incompatible behavior changes require explicit opt-in in the justfile. No breaking major version release is planned.
- **Platform parity**: Core functionality — recipe execution, variable evaluation, built-in functions — must work on Linux, macOS, and Windows. Platform-specific gaps are documented, not silently divergent.
- **Error clarity**: Error messages must identify the justfile location, the relevant line, and a description sufficient to fix the problem without reading the tool's source code.
- **Single-binary distribution**: Developers using `just` do not need to install a language runtime or SDK. The tool ships as a self-contained executable.
- **Encoding**: Justfiles must be UTF-8. CRLF line endings are accepted and normalized transparently.
- **Library stability**: When consumed as a library by other Rust programs, the public API carries limited stability guarantees, distinct from the CLI and justfile format contracts.

---

## 8. Non-Goals

- **Build system**: `just` does not track file modification times, perform incremental compilation, or implement pattern rules. It does not replace `make`, `cmake`, `ninja`, or similar tools for compiled artifacts.
- **Dependency installation**: `just` does not download, install, or manage software packages. Recipes may invoke package managers, but `just` provides no dependency resolution.
- **Remote recipe libraries**: There is no built-in registry or fetch mechanism. All recipes must exist in local justfiles on the invoking machine.
- **Persistent state between runs**: `just` maintains no run database, result cache, or artifact store. Each invocation is stateless with respect to prior runs.
- **File watching**: `just` does not monitor the filesystem for changes and re-run recipes automatically.
- **Process supervision**: `just` runs recipes and exits. It does not manage long-running services, provide restart semantics, or act as a daemon supervisor.
- **Security sandboxing**: Recipes execute with the full privileges of the invoking user. `just` applies no capability restrictions or secret masking beyond what the configured shell provides.
- **Cross-machine execution**: `just` has no SSH, container, or remote execution model. All commands run on the local machine.
- **Make compatibility**: `just` does not parse or execute Makefiles and does not aim to be a drop-in replacement for `make`.

---

## 9. Suspected Implementation Leakage

The following observations describe internal mechanisms rather than product-level promises. They belong in a technical or interface spec, not a product spec:

- **Rust as implementation language** and the defined MSRV (1.85.0): Implementation detail. The product promise is "single-binary, no runtime required."
- **Recursive descent / LL(k) parser**: Internal design choice. The product promise is "justfile syntax is fully validated before any command runs."
- **`src/` module decomposition** (lexer, parser, compiler, evaluator, executor): Directory structure. Not a product capability.
- **`clap` for CLI argument parsing**: Library choice. The product promise is "the CLI accepts the documented flags and subcommands."
- **`fzf` as the default chooser binary**: A configurable default, not a product-level promise. The product promise is "an interactive recipe chooser is available and the backend program is configurable."
- **`mdbook` for documentation generation**: Operational/toolchain detail.
- **`setsid` / process group management**: Signal-handling mechanism. The product promise is "when interrupted, the tool exits cleanly and non-zero."
- **`strftime` delegation in `datetime()`**: That the format string follows `strftime` conventions is an interface contract (part of the function signature). That it delegates to a C library is implementation leakage.
- **`sha256` and `blake3` as built-in function names**: These algorithm names are part of the public API surface and belong in an interface spec. The choice to implement them in Rust (vs. shelling out) is implementation leakage.
- **CRLF normalization as a parser step**: Internal. The product promise is "justfiles with CRLF line endings are accepted."
- **`mdbook` translations (EN/ZH)**: Operational toolchain detail for documentation, not a product capability of `just` itself.