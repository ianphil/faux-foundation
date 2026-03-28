import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DAPR_PORT = process.env.DAPR_HTTP_PORT ?? "3500";
const DAPR_STATE_URL = `http://127.0.0.1:${DAPR_PORT}/v1.0/state/statestore`;
const STATE_KEY = "known-stars";

export async function fetchStarredRepos(token) {
  const res = await fetch("https://api.github.com/user/starred?sort=created&direction=desc&per_page=30", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getKnownStars() {
  try {
    const res = await fetch(`${DAPR_STATE_URL}/${STATE_KEY}`);
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set(data);
  } catch {
    return new Set();
  }
}

export async function saveKnownStars(stars) {
  await fetch(DAPR_STATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ key: STATE_KEY, value: [...stars] }]),
  });
}

export async function findNewStars(token) {
  const [starred, known] = await Promise.all([fetchStarredRepos(token), getKnownStars()]);

  const newStars = starred.filter((repo) => !known.has(repo.full_name));

  if (newStars.length > 0) {
    const updated = new Set(known);
    for (const repo of starred) {
      updated.add(repo.full_name);
    }
    await saveKnownStars(updated);
  }

  return newStars;
}

export function cloneRepo(cloneUrl, token) {
  const dir = mkdtempSync(join(tmpdir(), "macgyver-"));
  const authedUrl = cloneUrl.replace("https://", `https://x-access-token:${token}@`);

  execFileSync("git", ["clone", "--depth", "1", authedUrl, dir], {
    stdio: "pipe",
    timeout: 120_000,
  });

  return dir;
}

export function cleanupClone(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}
