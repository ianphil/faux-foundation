# AI Notes — Log

## 2026-03-30
- easy-auth: App registration `d8b8b4e9-71d5-4fb8-a178-c54b7f43cb93` ("Faux Chat") has no service principal in the tenant — `az ad sp show` fails. Enterprise App assignment (Option B) won't work without one.
- easy-auth: For personal MS accounts (`@outlook.com`), Option A (`allowedPrincipals` in Bicep) is more reliable than Option B (Enterprise App user assignment) for restricting access.
- easy-auth: `signInAudience` is `AzureADandPersonalMicrosoftAccount` with `/common/v2.0` issuer — multi-tenant by design.
- azd: `azd env set` doesn't auto-map env vars to Bicep params. Must use `azd env config set infra.parameters.<paramName>` for new params.
- infra: Ian's Entra object ID is `c9f3cf5c-93b3-4fce-96db-aceeea666766` (ian.philpot@outlook.com).
