# Working Memory — Log

## 2026-03-30
- infra: Bing Search API is fully retired — `Microsoft.Bing/accounts` creation returns `ApiSetDisabledForCreation`. Cannot provision new resources.
- infra: Brave Search API is the replacement. Free tier gives $5/month credits. Endpoint: `GET https://api.search.brave.com/res/v1/web/search`, auth via `X-Subscription-Token` header.
- infra: Brave response shape differs from Bing — results under `data.web.results[]` with fields `title`, `url`, `description`, `age` (vs Bing's `webPages.value[]` with `name`, `snippet`, `dateLastCrawled`).
- chat: Tool routing pattern in Chat.tsx uses `tc.name.replace(/_/g, "-")` to map tool names (e.g. `web_search` → `web-search`) to Dapr service invocation paths.
