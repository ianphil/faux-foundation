import { createServer } from "./server.mjs";
import { shutdownCopilotClient } from "./mind-session.mjs";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const pollInterval = process.env.POLL_INTERVAL ?? "30s";
const daprPort = process.env.DAPR_HTTP_PORT ?? "3500";

const server = createServer();

server.listen(port, host, () => {
  process.stdout.write(`macgyver host listening on http://${host}:${port}\n`);
  registerDaprJob();
});

let shuttingDown = false;

async function registerDaprJob(retries = 10) {
  const url = `http://127.0.0.1:${daprPort}/v1.0-alpha1/jobs/check-stars`;
  const body = JSON.stringify({ schedule: `@every ${pollInterval}` });

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        process.stdout.write(`[macgyver] registered check-stars job (@every ${pollInterval})\n`);
        return;
      }

      process.stderr.write(`[macgyver] job registration returned ${res.status}, retry ${i + 1}/${retries}\n`);
    } catch {
      if (i === 0) {
        process.stdout.write(`[macgyver] waiting for Dapr sidecar...\n`);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  process.stderr.write(`[macgyver] could not register check-stars job after ${retries} attempts — running without scheduler\n`);
}

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
