---

# Product Specification: Showboat

*Inferred from source review of `simonw/showboat`. Statements reflect observed behavior; they are not claims made by the original authors.*

---

## 1. Problem Statement

Automated agents and developers need a way to document their work that is simultaneously human-readable and machine-verifiable. Conventional documentation quickly drifts from reality: outputs are pasted manually, become stale, and cannot be independently confirmed. Showboat solves this by making the document itself executable — every code sample in a Showboat document can be re-run, and its output compared against what was originally recorded. The document is both the demonstration and the proof.

---

## 2. Actors & Goals

### Agent (primary author)
An automated process (LLM agent, CI script, or interactive shell session) that builds a demonstration document step by step. The agent wants to:
- Record work incrementally as it proceeds
- Capture outputs without manual transcription
- Undo mistakes without starting over
- Emit a finished document that a human can read and a machine can verify

### Human Reviewer
A developer, stakeholder, or evaluator reading the finished document. They want to:
- Understand what the agent did and why
- Trust that recorded outputs are accurate
- Re-run any step independently to confirm results

### Operator / Deployer
A person or system that configures the tool's environment. They want to:
- Optionally stream document-building events to a remote viewer in real time
- Install the tool without friction across platforms
- Produce versioned, identifiable documents

### Verifier
An automated process (CI, another agent) that confirms a previously recorded document is still accurate. They want to:
- Detect output drift from environmental or code changes
- Generate a corrected document when outputs have changed legitimately
- Receive a clear, structured diff of what changed

---

## 3. Operator Value

- **Agent accountability:** Documents built by Showboat prove that outputs shown actually occurred during execution, not after the fact.
- **Drift detection:** Any document can be re-verified at any time; stale outputs are surfaced automatically.
- **Round-trippability:** Any document can be deconstructed back into the exact sequence of commands that produced it, enabling replay, audit, or migration.
- **Real-time visibility:** Operators can observe an agent's work as it happens by configuring a remote endpoint — no custom integration required.
- **Format longevity:** The document format is plain Markdown, readable without Showboat tooling.

---

## 4. Core Capabilities

### 4.1 Document Initialization
The system allows an author to create a new, empty demonstration document with a title, a machine-readable identity, and a creation timestamp. Each document receives a unique identifier that persists for its lifetime.

### 4.2 Prose Annotation
The system allows an author to append free-form explanatory text to a document at any point. Text can be supplied inline or piped from another process.

### 4.3 Code Execution and Output Capture
The system can execute a snippet of code in a named interpreter, capture the combined standard output and error, and append both the source code and its output to the document as a matched pair. The caller receives the captured output and the original exit code, allowing the author to react to failures.

### 4.4 Image Attachment
The system can attach an image file to a document. The image is copied into the document's directory under a generated filename that encodes a date, and a Markdown image reference is appended to the document.

### 4.5 Entry Removal
The system allows an author to remove the most recently appended entry from a document. When the last entry is a code-output pair, both parts are removed together, keeping the document internally consistent.

### 4.6 Output Verification
The system can re-execute all code blocks in an existing document and compare the new outputs against the stored ones. It reports which blocks differ and, optionally, writes a corrected copy of the document.

### 4.7 Command Extraction
The system can read an existing document and emit the sequence of commands that would reproduce it from scratch. The emitted commands are safe to use directly in a shell script.

### 4.8 Real-Time Remote Streaming
The system can forward each document-building operation to a configured remote endpoint as it occurs, enabling live observation of an agent's work.

---

## 5. Observable Behaviors

### Document initialization
- **Trigger:** Author runs the initialize command with a file path and title.
- **Response:** A new Markdown file appears at the given path containing the title, a UTC timestamp, and a document identifier embedded as an HTML comment.
- **Failure:** If the file already exists, the command exits with a non-zero code and no file is modified.

### Prose annotation
- **Trigger:** Author runs the note command with optional text; if text is omitted, input is read from stdin.
- **Response:** The document file grows by one prose block; the command exits zero.
- **Failure:** If the file does not exist, the command exits non-zero with a descriptive message.

### Code execution and capture
- **Trigger:** Author runs the execute command with a language name and optional code; code may be supplied via stdin.
- **Response:** The code runs in the configured working directory. The document gains a paired code block and output block. Captured output is printed to the caller's stdout. The command exits with the same code as the executed snippet.
- **Failure (execution error):** If the interpreter cannot be found or launched, the command exits non-zero and no block is appended.
- **Non-zero snippet exit:** A snippet that exits non-zero is not treated as an error — output is still captured and appended, and the exit code is forwarded to the caller.

### Image attachment
- **Trigger:** Author runs the image command with a file path or a Markdown image reference.
- **Response:** The image is copied to the document's directory under a generated filename. The document gains an image block referencing the copy.
- **Failure:** If the source file is missing, is a directory, or has an unrecognized format, the command exits non-zero with a descriptive message and no file is modified.

### Entry removal
- **Trigger:** Author runs the pop command on a document.
- **Response:** The last logical entry (single block, or code-output pair) is removed from the document.
- **Failure:** If the document contains only its title block, the command exits non-zero. If the document is empty, the command exits non-zero.

### Output verification
- **Trigger:** Verifier runs the verify command on a document, optionally with an output path.
- **Response (all match):** The command exits zero with no output.
- **Response (mismatches found):** The command exits non-zero and prints, for each differing block, the stored output and the newly produced output.
- **Optional corrected copy:** If an output path is given, a new document is written with all outputs updated to match the current run. The original is not modified.
- **Failure:** If any block cannot be executed, the command exits non-zero with a description of which block failed.

### Command extraction
- **Trigger:** Author runs the extract command on a document, optionally with a substitute filename.
- **Response:** A sequence of shell-safe commands is printed to stdout. Running those commands in order would recreate the document. Output blocks are omitted (they are generated by re-running the commands).
- **Failure:** If the file does not exist or cannot be parsed, the command exits non-zero.

### Remote streaming
- **Trigger:** Any document-building command runs while the remote URL variable is set.
- **Response:** The command posts the operation's details to the configured URL. If the post fails, a warning is printed to stderr; the main command still exits as normal.
- **No configuration:** If the remote URL variable is absent or empty, no network activity occurs.

---

## 6. Edge Cases and Failure Behavior

- **Pop on title-only document:** Rejected; the title block cannot be removed.
- **Verification of a document with no code blocks:** Exits zero with no output (nothing to verify).
- **Code snippet that exits non-zero:** Output is captured and appended; the non-zero code is forwarded to the caller, allowing the author to decide whether to pop and retry.
- **Image with embedded Markdown reference syntax:** Alt text from the reference is preserved in the appended image block.
- **Image with plain path:** Alt text is derived from the generated filename.
- **Verify with `--output` when all outputs match:** The corrected copy is still written (it will be identical to the original).
- **Remote POST timeout:** After 10 seconds without a response, the post is abandoned and a warning is emitted; the command continues normally.
- **Stdin-sourced code or notes:** Functionally identical to inline argument; enables pipeline composition.
- **Fence length in output:** When a code block's output itself contains triple-backtick sequences, the surrounding fence is lengthened automatically to avoid ambiguity.
- **Single-command version query:** Printing the version does not require or modify any document file.

---

## 7. Non-Functional Constraints

- **Format durability:** Documents are plain Markdown; they remain readable without Showboat tooling.
- **Exit code fidelity:** The exit code of an executed snippet is always forwarded unmodified to the caller.
- **Remote errors are non-fatal:** Remote streaming failures must never prevent a document operation from completing.
- **Working directory control:** All code execution runs in a configurable directory; the default is the process's current directory.
- **Image format restriction:** Only PNG, JPEG, GIF, and SVG images may be attached.
- **Shell-safe extraction output:** Emitted commands from extract must be safe to embed directly in a shell script without further escaping.
- **Document identity stability:** A document's identifier, once assigned at initialization, is immutable.
- **Timestamp precision:** Document timestamps are recorded in UTC with full RFC 3339 precision.
- **Cross-platform availability:** The tool is distributed as pre-compiled binaries for macOS, Linux, and Windows (both x86-64 and ARM64) and as a Python installable package.

---

## 8. Non-Goals

- **Showboat is not a notebook runtime.** It does not manage sessions, kernel state, or variable persistence between code blocks. Each block is an independent invocation.
- **Showboat is not a diff or version-control tool.** It detects output drift but does not track document history or provide merge capabilities.
- **Showboat is not a test framework.** Verification checks whether outputs match; it does not support assertions, expectations, or structured test results.
- **Showboat is not a remote collaboration platform.** The remote streaming feature delivers events one-way to a configured endpoint; it provides no viewer, authentication scheme, or storage beyond what the receiver implements.
- **Showboat does not manage interpreter environments.** It delegates code execution to whatever interpreters are present on the system; it does not install, sandbox, or version-manage them.
- **Showboat does not render or display documents.** It produces and parses Markdown but relies on external tools (editors, browsers, GitHub) for display.
- **Showboat does not support structured output.** All code output is captured as plain text; structured formats (JSON, tables) are the author's responsibility to produce within their code.

---

## 9. Suspected Implementation Leakage

The following observations describe internal mechanisms rather than product-level promises. They should be moved to a technical or interface specification if further detail is needed:

- **`-c` flag convention:** Code is passed to interpreters via the `-c` flag (`bash -c "..."`, `python3 -c "..."`). This is an execution contract that may not generalize to all language runtimes.
- **UUID v4 for document identity:** The choice of UUID v4 is an implementation detail; the product promise is only that each document has a unique, stable, embeddable identifier.
- **HTML comment as identity carrier:** Embedding the document ID as `<!-- showboat-id: UUID -->` is a specific encoding choice. The product promise is that the identity persists in the document; the encoding format is a protocol detail.
- **Image filename scheme (`<8-char-uuid>-<YYYY-MM-DD>.<ext>`):** The specific format is an implementation choice. The product promise is that filenames are unique, non-colliding, and carry a date.
- **Remote POST field names and content types:** The specific field names (`uuid`, `command`, `input`, `output`, `language`, `markdown`, `image`, `filename`, `alt`) and content types (`application/x-www-form-urlencoded`, `multipart/form-data`) belong in an interface specification, not a product spec.
- **`go:embed` for help text:** An internal packaging mechanism; irrelevant to product behavior.
- **`ldflags` version injection:** A build-time mechanism; the product promise is simply that a version string is available and appears in documents.
- **Go standard library and `github.com/google/uuid` dependency:** Implementation choices that belong in a technical specification.
- **`SHOWBOAT_REMOTE_URL` environment variable name:** The specific variable name is a configuration interface detail, not a product-level promise; the product promise is that remote streaming is opt-in via environment configuration.