import express from "express";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const app = express();
app.use(express.json());

const MAX_OUTPUT = 50_000;
const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 120_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});
turndown.remove(["script", "style", "meta", "link", "noscript"]);

// ── Health ──
app.get("/health", (_req, res) => res.send("ok"));

// ── Web Fetch ──
app.post("/tools/web-fetch", async (req, res) => {
  const { url, format = "markdown", timeout } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  console.log(`[web-fetch] ${format} ${url}`);

  try {
    const ms = Math.min((timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT);

    let acceptHeader;
    switch (format) {
      case "text":
        acceptHeader = "text/plain;q=1.0, text/html;q=0.8, */*;q=0.1";
        break;
      case "html":
        acceptHeader = "text/html;q=1.0, */*;q=0.1";
        break;
      default:
        acceptHeader =
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    }

    const headers = {
      "User-Agent": BROWSER_UA,
      Accept: acceptHeader,
      "Accept-Language": "en-US,en;q=0.9",
    };

    let response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(ms),
    });

    // Cloudflare bot detection retry with honest UA
    if (
      response.status === 403 &&
      response.headers.get("cf-mitigated") === "challenge"
    ) {
      response = await fetch(url, {
        headers: { ...headers, "User-Agent": "faux-tools/1.0" },
        signal: AbortSignal.timeout(ms),
      });
    }

    if (!response.ok) {
      return res.json({
        content: `Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`,
        url,
        status: response.status,
      });
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return res.json({ content: "Response too large (>5MB)", url, error: "too_large" });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("html");

    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_SIZE) {
      return res.json({ content: "Response too large (>5MB)", url, error: "too_large" });
    }

    // Non-HTML: return raw text
    if (!isHtml) {
      return res.json({
        content: raw.slice(0, MAX_OUTPUT),
        url,
        status: response.status,
        contentType,
      });
    }

    // HTML handling by format
    if (format === "html") {
      return res.json({
        content: raw.slice(0, MAX_OUTPUT),
        url,
        status: response.status,
      });
    }

    if (format === "text") {
      // Readability for clean article text
      const { document } = parseHTML(raw);
      const article = new Readability(document).parse();
      const text = (article?.textContent ?? document.body?.textContent ?? "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return res.json({
        title: article?.title,
        content: text.slice(0, MAX_OUTPUT),
        url,
        status: response.status,
        excerpt: article?.excerpt,
      });
    }

    // Default: markdown via Turndown
    const markdown = turndown.turndown(raw);
    return res.json({
      content: markdown.slice(0, MAX_OUTPUT),
      url,
      status: response.status,
    });
  } catch (err) {
    console.error(`[web-fetch] Error: ${err.message}`);
    return res.json({
      content: `Error fetching ${url}: ${err.message}`,
      url,
      error: err.message,
    });
  }
});

// ── Web Search (Brave) ──
app.post("/tools/web-search", async (req, res) => {
  const { query, count = 5, freshness } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "BRAVE_API_KEY not configured" });
  }

  console.log(`[web-search] "${query}" (count=${count})`);

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
    });
    if (freshness) params.set("freshness", freshness);

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brave Search error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const results = (data.web?.results ?? []).map((r) => ({
      name: r.title,
      url: r.url,
      snippet: r.description,
      age: r.age,
    }));

    return res.json({
      query,
      results,
      totalEstimatedMatches: data.web?.totalEstimatedMatches ?? results.length,
    });
  } catch (err) {
    console.error(`[web-search] Error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT ?? "3100", 10);
app.listen(PORT, () => console.log(`Tool service listening on :${PORT}`));
