Now I'll write the spec in MacGyver's voice, following the reverse skill's output shape.

---

# tealdeer — Product Spec

*Reverse-engineered from tealdeer-rs/tealdeer · March 2026*

---

## Problem Statement

Man pages are a joke for quick lookups. Not because they're wrong — they're exhaustive by design — but if you just need to remember how to untar a file, nobody wants to scroll through 300 lines of POSIX spec to find it. You end up Googling it instead, which is fine until you're on a plane, in a VM with no browser, or just tired of waiting for a tab to load.

The tldr-pages community solved the content problem: thousands of contributors writing short, practical, example-first cheat sheets for CLI commands. What they didn't solve (until various clients appeared) was the tooling. The original Node.js reference client clocks in around 400ms on invocation. The Python one hits ~87ms. That's not fast enough to feel like a reflex.

Tealdeer is a Rust client for tldr-pages. It shows up in ~13ms, works offline once you've downloaded the cache, and gets out of your way. That's the whole pitch.

---

## Actors & Goals

**The developer in a hurry** — someone who knows a tool exists but blanked on the exact flags. They type `tldr tar` and want examples in under a second, not a man page. They're the primary user and every design decision bends toward their experience.

**The polyglot developer** — works across Linux, macOS, maybe Windows. Needs platform-specific variants of the same command. Wants the tool to know which platform they're on and serve the right page automatically, with the option to override.

**The non-English speaker** — tldr-pages has community translations in 20+ languages. Tealdeer auto-detects locale from the environment and serves pages in the right language. This person doesn't need to configure anything; it just works.

**The scripter / CI pipeline** — invokes tealdeer non-interactively. Needs clean output (no color, no pager), quiet failure modes, and reliable exit codes. Tealdeer auto-detects TTY context and adjusts.

**The power user** — wants to extend or override pages with their own examples. Maybe they have team-specific flags or workflows that upstream tldr-pages doesn't cover. Tealdeer supports custom pages and additive patches.

**The organization operator** — runs a corporate mirror of tldr-pages, or wants to lock down TLS behavior for compliance. Tealdeer exposes the archive source URL and TLS backend as config options.

---

## Operator Value

Before tealdeer (and clients like it), the fast path for CLI help was either a slow man page or a browser search. Both have friction. Tealdeer collapses that friction to near-zero:

- **You get practical examples, not reference text.** Every tldr page leads with real command invocations.
- **It works offline.** After one update, no network is required. This matters in planes, locked-down environments, and bandwidth-limited systems.
- **It's fast enough to feel instant.** At ~13ms, it doesn't break your flow.
- **It ships everywhere.** Thirteen-plus package managers support it. If you can run a package manager, you can install tealdeer in one command.
- **It's a complement, not a replacement.** Man pages are still there for the edge cases. Tealdeer handles the 80% case.

---

## Core Capabilities

### Page Lookup
You type `tldr <command>` and get a formatted page of practical examples. Commands are case-insensitive. Multi-word commands (`tldr git checkout`) are handled naturally — no quotes required. Pages are served from a local cache, so no network call happens at lookup time.

### Platform & Language Routing
Tealdeer knows which platform you're on and serves the appropriate page variant. If a platform-specific page exists, it wins; if not, it falls through to the "common" pages. You can override the platform explicitly, or ask for all platforms at once.

Language follows your system locale (LANG/LANGUAGE env vars), with a sensible fallback chain down to English. You can override per-invocation or set defaults in config. If a page doesn't exist in your language, tealdeer walks the fallback chain rather than failing.

### Cache Management
The local cache is the heart of the offline-first design. You download it once (`tldr --update`), and it lives on disk following OS conventions (XDG on Linux, ~/Library on macOS, %APPDATA% on Windows). Updates replace the whole archive — no incremental sync. The cache tracks its own age and warns you if it's been more than 30 days since the last update.

### Auto-Update
Optional. When enabled, tealdeer silently checks whether the cache is older than a configurable interval and re-downloads if needed — as a side effect of a normal lookup. You can disable it for a single invocation without changing config.

### Custom Pages & Patches
Two extension mechanisms:
- **Custom pages** (`.page.md`) fully replace a page from the upstream cache.
- **Custom patches** (`.patch.md`) are appended after the upstream page — additive, not replacing.

An editor command (`--edit-page`, `--edit-patch`) opens your $EDITOR directly on the right file, creating the custom pages directory if it doesn't exist.

### Output & Rendering
Default output is formatted: markdown syntax is stripped, colors applied by element type (description, code, variables). A raw mode bypasses rendering entirely. A pager mode pipes through `less` (or your $PAGER). Compact mode strips blank lines. You can also render arbitrary markdown files as if they were tldr pages — useful for previewing your own custom pages.

### Visual Customization
Full color control: foreground/background color (named, ANSI code, or 24-bit RGB), bold, italic, underline — per element type. Color output can be forced on, forced off, or auto-detected (the default). Tealdeer respects the NO_COLOR environment variable convention.

### Configuration
Zero-config works. Every setting has a sensible default and the config file is optional. When you do want to configure things, it's a TOML file with four logical sections: display, style, search behavior, and update behavior. You can generate a pre-populated template with `--seed-config`. Config path is discoverable via OS conventions or overridable via environment variable or CLI flag.

### Shell Completions
Bash, Fish, and Zsh completions are shipped alongside the binary. They complete command names by reading from the local cache.

---

## Observable Behaviors

### Happy path: `tldr git`
The formatted git page appears within ~13ms. Colors highlight command names, variables in `{{braces}}` get underlined. No network call, no spinner, no startup noise.

### No cache yet
```
ERROR: Page cache not found. Please run `tldr --update` to download the cache.
```
Exit code 1. Clear instruction. Nothing else happens.

### Page not found
```
WARNING: Page `fakecommand` not found in cache.
Try updating with `tldr --update`, or submit a pull request...
```
Exit code 1. A warning, not an error — the distinction is meaningful for scripting.

### Cache is stale (30+ days old)
The page still shows up. A warning appears above it. If you're running with `-q`, the warning is suppressed and you just get the page. This is the right tradeoff: stale information is still usually correct, and you shouldn't be blocked.

### Network failure during update
You get a detailed error with a suggestion to try a different TLS backend. The cache is cleared during the download process, which means a failed update leaves you with no cache — you must fix the network/TLS issue and update again. This is the sharpest edge in the UX.

### Auto-update fires silently
If auto-update is configured and the cache is old enough, it updates before showing the page. No visual indication unless it fails. If it fails, the error appears but the old cache is still used to show the page — graceful degradation.

### Custom page exists
Your `.page.md` file is served instead of the upstream cache entry. Happens at read time, not at cache-update time. If you delete the file, the upstream page comes back automatically.

### Patch file exists
The upstream page is shown first, then your `.patch.md` content is appended after a blank line. If both a custom page and a patch exist for the same command, only the custom page is shown — patches don't apply to custom pages.

### Non-TTY context (piped output)
Colors are automatically disabled. Pager is not invoked. The content itself is unchanged. Exit codes are still correct. Tealdeer is safe to use in scripts without extra flags.

### `--color always` in a script
Forces ANSI codes into the output regardless of TTY detection. On Windows 10+, this also enables the Windows ANSI console mode. Useful if you're piping to something that can render colors (like bat).

---

## Edge Cases

**Multi-language fallback chain** — if your locale is `de_AT` (Austrian German), tealdeer searches: `de_AT` → `de` → then falls all the way back to English if no German page exists. The chain is derived from both LANG and LANGUAGE environment variables and follows POSIX conventions.

**Multiple `-p` flags** — `tldr -p linux -p windows git` searches Linux pages first, then Windows, then stops at the first hit. No merging, no deduplication — first match wins.

**Case and spaces** — `tldr Git Checkout`, `tldr GIT-CHECKOUT`, and `tldr git checkout` all resolve to the same page. Lowercasing and hyphen-joining happen before lookup.

**Old custom page file extension** — if you have files named `<command>.page` or `<command>.patch` (the pre-v1.8 format), tealdeer warns you on lookup and ignores them. It doesn't auto-rename them; that's your call.

**Cache directory is a file** — if something is sitting at the expected cache directory path that isn't a directory, tealdeer errors out and tells you to remove it. It doesn't try to work around it.

**Old v1.7 cache format** — if tealdeer detects the old cache directory structure from v1.7, it auto-removes it. The new format is incompatible, so carrying the old one forward would cause silent failures.

**Patch + custom page coexistence** — patches are not applied on top of custom pages. Only on upstream pages. If you want to extend your own custom page, you just edit the custom page.

**`--render` with a local file** — `tldr -f /path/to/file.md` renders any markdown file as if it were a tldr page. Useful for previewing custom pages before placing them in the custom pages directory.

---

## Non-Functional Constraints

**Speed** — ~13ms warm cache lookup. This isn't an aspirational number; it's been benchmarked against 7 competing clients and tealdeer comes in second (behind a Zig implementation at ~9ms).

**Platform support** — Linux, macOS, and Windows are CI-tested on every commit. FreeBSD, NetBSD, OpenBSD, Android, and SunOS are listed as supported but rely on community testing.

**Offline use** — after initial cache population, zero network is required for lookups. Auto-update is opt-in, so offline-by-default is the default.

**Cache size** — the full English cache is on the order of tens of megabytes. Per-language download (v1.8+) lets you avoid downloading all 20+ languages if you only need one.

**Configuration required** — none. The tool works out of the box.

**Binary distribution** — Linux releases are statically linked (musl). No OpenSSL required by default. macOS and Windows ship standard binaries.

**Minimum Rust version** — tracked and enforced in CI. The policy requires the MSRV to be stable for at least one month before adoption.

**Update strategy** — full archive replacement, not incremental. No partial-update recovery. A failed update leaves the cache empty.

---

## Non-Goals

Tealdeer doesn't do these things, and that's intentional:

- **Full man page replacement** — it's a quick reference, not a comprehensive reference. If you need the full picture, `man` is still there.
- **Fuzzy or full-text search** — you look up commands by exact name, not by description or keyword. There's no "find me a command that does X."
- **In-tool contribution** — you can edit custom pages locally, but submitting to the upstream tldr-pages project happens via GitHub, not through tealdeer.
- **Historical page versions** — one version per language/platform per command. No timeline, no diff.
- **Cross-machine sync** — custom pages live locally. No cloud sync, no sharing mechanism.
- **GUI or TUI** — strictly a CLI tool.
- **Daemon or API server mode** — runs, answers, exits. No persistent process.
- **Self-update** — doesn't check for new versions of itself. Relies on your package manager for that.
- **IDE integration** — can be called from a terminal inside an IDE, but there are no plugins.

---

## Suspected Implementation Leakage

These are accurate statements about tealdeer, but they describe *how* it works rather than *what it does*. They'd live more comfortably in a technical spec.

- Uses ureq for HTTP with optional SOCKS proxy support
- TLS backends are compile-time feature flags (rustls-with-webpki-roots, rustls-with-native-roots, native-tls) that map to separate binary artifacts
- Cache archive is downloaded as a ZIP, extracted to a temp location, then swapped into place
- Markdown parsing handles both tldr v1 format (backtick code blocks) and v2 format (indented code blocks) simultaneously
- Color detection uses the yansi library which handles Windows 10+ ANSI console mode activation
- Shell completions work by shelling out to `tldr -l` to get the page list at completion time

---

*Written by MacGyver · source: tealdeer-rs/tealdeer*