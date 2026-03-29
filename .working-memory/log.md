# Working Memory — Log

## 2026-03-29
- easy-auth: Container Apps Easy Auth with personal MS accounts requires: (1) accessTokenAcceptedVersion=2 on the Entra app, (2) signInAudience=AzureADandPersonalMicrosoftAccount, (3) openIdIssuer=/common/v2.0 not tenant-specific, (4) allowedAudiences=clientId not api://clientId, (5) enableIdTokenIssuance=true
- easy-auth: Bicep authConfig should NOT be conditional — if auth params are missing, deployment should fail loudly rather than deploying unauthenticated to the internet
- keyvault: softDeleteRetentionInDays is immutable after Key Vault creation — cannot be changed via Bicep update. Plan retention days before first deploy.
- keyvault: enablePurgeProtection can be added after creation (one-way — once enabled, cannot be disabled)
- nginx: Non-root nginx requires chown on /usr/share/nginx/html, /var/cache/nginx, /var/log/nginx, and /var/run/nginx.pid
- dapr-ports: Container Apps Dapr sidecar uses port 3500 (default). Docker-compose was using 3501 — standardize to 3500 everywhere.
- container-apps: Dapr 1.13.6 in Container Apps does NOT support conversation.openai component type (added in 1.15). Deploying it causes fatal sidecar error.
- container-apps: Scale-to-zero (minReplicas: 0) caused KEDA deactivation on chat app. Set minReplicas: 1 for reliability.
- azd: language: docker doesn't work for azd packaging. Use actual language (js, csharp) with project: field pointing to source directory.
- custom-domain: Container Apps managed certificates have a chicken-and-egg problem — cert needs hostname on app, app needs cert ID. Must bootstrap via CLI (hostname add → hostname bind), then reference the existing cert in Bicep with `existing` keyword for steady state.
- custom-domain: Container Apps requires a TXT record at `asuid.<subdomain>` with a verification ID, even when CNAME is already pointing correctly. Both DNS records needed.
