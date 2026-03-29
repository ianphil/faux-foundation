import { execFileSync } from "node:child_process";
import path from "node:path";
import { runPrompt } from "./mind-session.mjs";
import { cloneRepo, cleanupClone } from "./star-poller.mjs";

export async function processRepo(repo, env = process.env) {
  const owner = path.basename(repo.owner?.login ?? repo.full_name.split("/")[0]);
  const name = path.basename(repo.name ?? repo.full_name.split("/")[1]);
  const fullName = `${owner}/${name}`;
  const mindRoot = env.MIND_ROOT ?? path.resolve("../mind");

  process.stdout.write(`[macgyver] analyzing ${fullName}\n`);

  const token = env.COPILOT_GITHUB_TOKEN ?? env.GITHUB_TOKEN ?? env.GH_TOKEN;
  if (!token) {
    throw new Error("No GitHub token available for cloning");
  }

  const cloneDir = cloneRepo(repo.clone_url, token);

  try {
    const prompt = buildPrompt(fullName, cloneDir);
    const response = await runPrompt({ input: prompt }, env);

    const specText = response?.output_text ?? response?.output?.[0]?.content?.[0]?.text;
    if (!specText) {
      throw new Error(`No output from Copilot SDK for ${fullName}`);
    }

    const specPath = path.join(mindRoot, "expertise", owner);
    execFileSync("mkdir", ["-p", specPath]);

    const specFile = path.join(specPath, `${name}.md`);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(specFile, specText, "utf8");

    process.stdout.write(`[macgyver] spec written: expertise/${owner}/${name}.md\n`);

    commitSpec(mindRoot, fullName);
  } finally {
    cleanupClone(cloneDir);
  }
}

function buildPrompt(fullName, cloneDir) {
  return [
    `Hey Mac — new repo just came in. ${fullName} is cloned at ${cloneDir}.`,
    "",
    "Use the reverse skill to analyze it. Read the code, docs, tests, README, CI config —",
    "the whole thing. Then write the spec in your voice, the way you'd explain it to a friend.",
    "",
    "Return the markdown spec content and nothing else.",
  ].join("\n");
}

function commitSpec(mindRoot, fullName) {
  const opts = { cwd: mindRoot, stdio: "pipe", timeout: 30_000 };

  try {
    execFileSync("git", ["add", "expertise/", ".working-memory/known-stars.json"], opts);
    execFileSync("git", ["commit", "-m", `feat: reverse-spec ${fullName}`], opts);
    execFileSync("git", ["push"], { ...opts, timeout: 60_000 });
    process.stdout.write(`[macgyver] committed and pushed spec for ${fullName}\n`);
  } catch (error) {
    process.stderr.write(`[macgyver] git commit/push failed for ${fullName}: ${error.message}\n`);
  }
}
