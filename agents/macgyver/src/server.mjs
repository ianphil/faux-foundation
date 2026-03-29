import http from "node:http";

export function createServer({ env = process.env } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, { status: "ok" });
      }

      return sendJson(res, 404, {
        error: "not_found",
        message: `No route for ${req.method} ${url.pathname}`,
      });
    } catch {
      return sendJson(res, 500, {
        error: "internal_error",
        message: "Unexpected request failure",
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
