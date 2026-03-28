import http from "node:http";
import { RequestValidationError, runPrompt } from "./mind-session.mjs";
import { findNewStars } from "./star-poller.mjs";
import { processRepo } from "./spec-runner.mjs";

export function createServer({ env = process.env, runner } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, {
          status: "ok",
          service: "macgyver-mind-host",
          port: Number(env.PORT ?? 3000),
        });
      }

      if (req.method === "POST" && url.pathname === "/v1/responses") {
        const body = await readJson(req);
        const response = await runPrompt(body, env, runner);
        return sendJson(res, 200, response);
      }

      if (req.method === "POST" && url.pathname === "/jobs/check-stars") {
        handleCheckStars(env).catch((error) => {
          process.stderr.write(`[macgyver] check-stars error: ${error.message}\n`);
        });
        return sendJson(res, 200, { status: "accepted" });
      }

      return sendJson(res, 404, {
        error: "not_found",
        message: `No route for ${req.method} ${url.pathname}`,
      });
    } catch (error) {
      const statusCode = error instanceof RequestValidationError ? 400 : 500;
      return sendJson(res, statusCode, {
        error: statusCode === 400 ? "bad_request" : "internal_error",
        message: error?.message ?? "Unexpected request failure",
      });
    }
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new RequestValidationError(`Invalid JSON request body: ${error.message}`);
  }
}

async function handleCheckStars(env) {
  const token = env.COPILOT_GITHUB_TOKEN ?? env.GITHUB_TOKEN ?? env.GH_TOKEN;
  if (!token) {
    process.stderr.write("[macgyver] no token available, skipping star check\n");
    return;
  }

  const newStars = await findNewStars(token);
  if (newStars.length === 0) {
    return;
  }

  process.stdout.write(`[macgyver] found ${newStars.length} new star(s)\n`);

  for (const repo of newStars) {
    try {
      await processRepo(repo, env);
    } catch (error) {
      process.stderr.write(`[macgyver] failed to process ${repo.full_name}: ${error.message}\n`);
    }
  }
}
