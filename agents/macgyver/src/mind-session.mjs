import { promises as fs } from "node:fs";
import path from "node:path";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const MIND_FILENAMES = ["SOUL.md", ".working-memory/memory.md", ".working-memory/rules.md", ".working-memory/log.md"];
const DEFAULT_RESPONSE_TIMEOUT_MS = 120000;

let sharedCopilotClient = null;

export class RequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export async function resolveMindRoot(request = {}, env = process.env) {
  const { candidate, source } = resolveMindRootCandidate(request, env);
  const root = path.resolve(candidate);

  let stat;
  try {
    stat = await fs.stat(root);
  } catch (error) {
    if (error?.code === "ENOENT" && source === "request") {
      throw new RequestValidationError(`Mind root does not exist: ${root}`);
    }

    throw error;
  }

  if (!stat.isDirectory()) {
    if (source === "request") {
      throw new RequestValidationError(`Mind root is not a directory: ${root}`);
    }

    throw new Error(`Mind root is not a directory: ${root}`);
  }

  return root;
}

export async function loadMindSnapshot(root) {
  const entries = await Promise.all(
    MIND_FILENAMES.map(async (filename) => {
      const filePath = path.join(root, filename);

      try {
        const content = await fs.readFile(filePath, "utf8");
        return { filename, filePath, exists: true, content };
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        return { filename, filePath, exists: false, content: null };
      }
    }),
  );

  const soul = entries.find((entry) => entry.filename === "SOUL.md") ?? null;

  return {
    root,
    soul: soul?.content ?? null,
    files: entries,
  };
}

export function buildCopilotClientOptions(env = process.env) {
  const cliUrl = normalizeText(env.COPILOT_CLI_URL ?? env.CLI_URL);
  if (cliUrl) {
    return { cliUrl };
  }

  const cliPath = normalizeText(env.COPILOT_CLI_PATH);
  const githubToken = normalizeText(env.COPILOT_GITHUB_TOKEN ?? env.GITHUB_TOKEN ?? env.GH_TOKEN);
  const useLoggedInUser = parseBooleanEnv(env.COPILOT_USE_LOGGED_IN_USER);

  return removeUndefined({
    cliPath,
    githubToken,
    useLoggedInUser,
  });
}

export function createCopilotClient(env = process.env) {
  return new CopilotClient(buildCopilotClientOptions(env));
}

export function getCopilotClient(env = process.env) {
  if (!sharedCopilotClient) {
    sharedCopilotClient = createCopilotClient(env);
  }

  return sharedCopilotClient;
}

export async function shutdownCopilotClient() {
  if (!sharedCopilotClient) {
    return;
  }

  const client = sharedCopilotClient;
  sharedCopilotClient = null;

  const stopErrors = await client.stop();
  if (stopErrors.length > 0) {
    throw new AggregateError(stopErrors, "Copilot client shutdown failed");
  }
}

export function createCopilotAgentRunner({
  env = process.env,
  clientFactory = getCopilotClient,
  permissionHandler = approveAll,
} = {}) {
  return async function runAgentSession({ request, mind }) {
    const prompt = resolvePrompt(request);
    const model = resolveModel(request, env);
    const timeoutMs = resolveTimeoutMs(request, env);
    const sessionId = resolveSessionId(request);
    const client = await clientFactory(env);
    const session = await openSession({
      client,
      mindRoot: mind.root,
      sessionId,
      model,
      permissionHandler,
    });

    let assistantMessage;
    let requestError;

    try {
      assistantMessage = await session.sendAndWait({ prompt }, timeoutMs);
    } catch (error) {
      requestError = error;
    }

    try {
      await session.disconnect();
    } catch (disconnectError) {
      if (requestError) {
        throw new AggregateError([requestError, disconnectError], "Copilot request failed and session disconnect failed");
      }

      throw disconnectError;
    }

    if (requestError) {
      throw requestError;
    }

    if (!assistantMessage) {
      throw new Error("Copilot session completed without an assistant message.");
    }

    return createResponseEnvelope({
      request,
      mind,
      sessionId: session.sessionId,
      assistantMessage,
      model,
    });
  };
}

export function createDefaultAgentRunner(options) {
  return createCopilotAgentRunner(options);
}

export async function runPrompt(request, env = process.env, runner = createCopilotAgentRunner({ env })) {
  const root = await resolveMindRoot(request, env);
  const mind = await loadMindSnapshot(root);
  return runner({ request, mind });
}

async function openSession({ client, mindRoot, sessionId, model, permissionHandler }) {
  const baseConfig = removeUndefined({
    model,
    onPermissionRequest: permissionHandler,
    workingDirectory: mindRoot,
  });

  if (!sessionId) {
    return client.createSession({
      clientName: "macgyver-mind-host",
      ...baseConfig,
    });
  }

  try {
    return await client.resumeSession(sessionId, baseConfig);
  } catch (error) {
    if (!isSessionNotFoundError(error, sessionId)) {
      throw error;
    }

    return client.createSession({
      clientName: "macgyver-mind-host",
      sessionId,
      ...baseConfig,
    });
  }
}

function createResponseEnvelope({ request, mind, sessionId, assistantMessage, model }) {
  const responseId = normalizeText(request?.id) ?? assistantMessage.data.messageId;
  const outputText = assistantMessage.data.content;
  const createdAt = toUnixTimestamp(assistantMessage.timestamp);

  return {
    id: responseId,
    object: "response",
    created_at: createdAt,
    status: "completed",
    model: model ?? null,
    session_id: sessionId,
    mind: {
      root: mind.root,
      hasSoul: Boolean(mind.soul),
      files: mind.files.map(({ filename, exists }) => ({ filename, exists })),
    },
    output: [
      {
        type: "message",
        id: assistantMessage.data.messageId,
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: outputText,
          },
        ],
      },
    ],
    output_text: outputText,
  };
}

function resolveMindRootCandidate(request, env) {
  const envCandidate = normalizeText(env.MIND_ROOT);
  const lockMindRoot = parseBooleanEnv(env.LOCK_MIND_ROOT) === true;

  if (lockMindRoot) {
    if (!envCandidate) {
      throw new Error("LOCK_MIND_ROOT requires MIND_ROOT to be set.");
    }

    return { candidate: envCandidate, source: "env" };
  }

  const requestCandidate = normalizeText(
    request?.options?.cwd ?? request?.mind?.cwd ?? request?.cwd ?? request?.mindPath,
  );
  if (requestCandidate) {
    return { candidate: requestCandidate, source: "request" };
  }

  if (envCandidate) {
    return { candidate: envCandidate, source: "env" };
  }

  return { candidate: process.cwd(), source: "default" };
}

function resolvePrompt(request) {
  const prompt = normalizeInput(request?.input ?? request?.prompt ?? request?.message);
  if (!prompt) {
    throw new RequestValidationError("Request input is required.");
  }

  return prompt;
}

function resolveModel(request, env) {
  return normalizeText(request?.model ?? env.COPILOT_MODEL);
}

function resolveSessionId(request) {
  return normalizeText(
    request?.sessionId ??
      request?.session_id ??
      request?.session?.id ??
      request?.options?.sessionId ??
      request?.options?.session_id,
  );
}

function resolveTimeoutMs(request, env) {
  const candidate = request?.timeout_ms ?? request?.timeoutMs ?? env.COPILOT_RESPONSE_TIMEOUT_MS;
  if (candidate === undefined || candidate === null || candidate === "") {
    return DEFAULT_RESPONSE_TIMEOUT_MS;
  }

  const timeoutMs = Number(candidate);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RequestValidationError(`Invalid timeout value: ${candidate}`);
  }

  return timeoutMs;
}

function normalizeInput(input) {
  if (typeof input === "string") {
    return input.trim();
  }

  if (Array.isArray(input)) {
    return input.map(normalizeInputPart).filter(Boolean).join("\n").trim();
  }

  if (input && typeof input === "object") {
    const content = input.content ?? input.text ?? input.input_text ?? input.prompt;
    return normalizeInput(content);
  }

  return "";
}

function normalizeInputPart(part) {
  if (typeof part === "string") {
    return part;
  }

  if (!part || typeof part !== "object") {
    return "";
  }

  if (typeof part.text === "string") {
    return part.text;
  }

  if (typeof part.input_text === "string") {
    return part.input_text;
  }

  if (Array.isArray(part.content)) {
    return part.content.map(normalizeInputPart).filter(Boolean).join("\n");
  }

  if (typeof part.content === "string") {
    return part.content;
  }

  return "";
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseBooleanEnv(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return undefined;
}

function removeUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function isSessionNotFoundError(error, sessionId) {
  return error instanceof Error && error.message === `Session not found: ${sessionId}`;
}

function toUnixTimestamp(timestamp) {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return Math.floor(Date.now() / 1000);
  }

  return Math.floor(parsed / 1000);
}
