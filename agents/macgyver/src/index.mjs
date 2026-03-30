import { execFileSync } from "node:child_process";
import { createServer } from "./server.mjs";
import { shutdownCopilotClient } from "./mind-session.mjs";
import { findNewStars } from "./star-poller.mjs";
import { processRepo } from "./spec-runner.mjs";

bootstrapMind();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const pollInterval = parsePollInterval(process.env.POLL_INTERVAL ?? "30s");

const server = createServer();

server.listen(port, host, () => {
  process.stdout.write(`macgyver host listening on http://${host}:${port}\n`);
  process.stdout.write(`[macgyver] star poller starting (every ${pollInterval / 1000}s)\n`);
  setInterval(checkStars, pollInterval);
});

function bootstrapMind() {
  if (process.env.MIND_ROOT) {
    process.stdout.write(`[macgyver] using pre-configured mind at ${process.env.MIND_ROOT}\n`);
    return;
  }

  const repo = process.env.MIND_REPO ?? "ianphil/macgyver";
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN required for mind clone");

  const repoDir = "/mind";
  const url = `https://x-access-token:${token}@github.com/${repo}.git`;

  process.stdout.write(`[macgyver] cloning mind from ${repo}\n`);
  execFileSync("git", ["clone", "--depth", "1", url, repoDir], { stdio: "pipe", timeout: 60_000 });
  execFileSync("git", ["config", "user.name", "MacGyver"], { cwd: repoDir });
  execFileSync("git", ["config", "user.email", "macgyver@faux-foundation.dev"], { cwd: repoDir });

  process.env.MIND_ROOT = repoDir;
  process.stdout.write(`[macgyver] mind loaded at ${process.env.MIND_ROOT}\n`);
}

let checking = false;

async function checkStars() {
  if (checking) return;
  checking = true;

  try {
    const token = process.env.COPILOT_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) return;

    const newStars = await findNewStars(token, process.env);
    if (newStars.length === 0) return;

    process.stdout.write(`[macgyver] found ${newStars.length} new star(s)\n`);

    for (const repo of newStars) {
      try {
        await processRepo(repo, process.env);
      } catch (error) {
        process.stderr.write(`[macgyver] failed to process ${repo.full_name}: ${error.message}\n`);
      }
    }
  } catch (error) {
    process.stderr.write(`[macgyver] check-stars error: ${error.message}\n`);
  } finally {
    checking = false;
  }
}

function parsePollInterval(value) {
  const match = value.match(/^(\d+)(s|m|ms)?$/);
  if (!match) return 30_000;
  const num = Number(match[1]);
  const unit = match[2] ?? "s";
  if (unit === "ms") return num;
  if (unit === "m") return num * 60_000;
  return num * 1000;
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await shutdownCopilotClient();
    process.stdout.write(`macgyver host stopped (${signal})\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`macgyver host failed to stop cleanly (${signal}): ${error.message}\n`);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
