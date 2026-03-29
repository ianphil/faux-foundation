import express from "express";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.send("ok"));

app.post("/tools/web-fetch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  console.log(`[web-fetch] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FauxBot/1.0; +https://chat.ianp.io)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.json({
        content: `Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`,
        url,
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";

    // Non-HTML: return raw text (truncated)
    if (!contentType.includes("html")) {
      const text = await response.text();
      return res.json({
        content: text.slice(0, 20000),
        url,
        status: response.status,
        contentType,
      });
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    const reader = new Readability(document);
    const article = reader.parse();

    if (article) {
      // Convert to clean text — strip HTML tags from textContent
      const content = article.textContent
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 20000);

      return res.json({
        title: article.title,
        content,
        url,
        status: response.status,
        excerpt: article.excerpt,
      });
    }

    // Fallback: grab body text directly
    const fallback =
      document.body?.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "";
    return res.json({
      content: fallback.slice(0, 20000),
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

const PORT = parseInt(process.env.PORT ?? "3100", 10);
app.listen(PORT, () => console.log(`Tool service listening on :${PORT}`));
