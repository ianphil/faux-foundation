import { createServer } from "./server.mjs";
import { shutdownCopilotClient } from "./mind-session.mjs";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer();

server.listen(port, host, () => {
  process.stdout.write(`macgyver host listening on http://${host}:${port}\n`);
});

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
