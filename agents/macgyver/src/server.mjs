import http from "node:http";
import { RequestValidationError, runPrompt } from "./mind-session.mjs";

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
