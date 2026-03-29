import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import path from "node:path";

const STATE_FILE = "known-stars.json";

function statePath(env) {
  const mindRoot = env.MIND_ROOT ?? path.resolve("../mind");
  const dir = join(mindRoot, ".working-memory");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, STATE_FILE);
}

export async function fetchStarredRepos(token) {
  const all = [];
  let url = "https://api.github.com/user/starred?per_page=100";

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const batch = await res.json();
    all.push(...batch);

    const link = res.headers.get("link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    url = match ? match[1] : null;
  }

  return all;
}

function loadState(env) {
  const file = statePath(env);
  if (!existsSync(file)) return { seeded: false, known: [] };
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { seeded: false, known: [] };
  }
}

function saveState(env, state) {
  writeFileSync(statePath(env), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function findNewStars(token, env = process.env) {
  const state = loadState(env);

  if (!state.seeded) {
    const starred = await fetchStarredRepos(token);
    const names = starred.map((r) => r.full_name);
    saveState(env, { seeded: true, known: names });
    process.stdout.write(`[macgyver] seeded ${names.length} existing stars — only new stars will trigger analysis\n`);
    return [];
  }

  const starred = await fetchStarredRepos(token);
  const knownSet = new Set(state.known);
  const newStars = starred.filter((repo) => !knownSet.has(repo.full_name));

  if (newStars.length > 0) {
    for (const repo of starred) {
      knownSet.add(repo.full_name);
    }
    saveState(env, { seeded: true, known: [...knownSet] });
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
