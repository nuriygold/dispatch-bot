# Dispatch-Orchestrator (local-first, Azure LLM)

## Tooling model
- Azure OpenAI is the only LLM provider (configure in `.env`).
- Tools are local-first. Cloud tools (Apify) are optional and only exposed when credentials/env allow.
- Tool exposure is dynamic:
  - `OFFLINE_MODE=1` hides internet-requiring tools.
  - `APIFY_TOKEN` missing hides Apify.
  - `TOOL_ALLOWLIST` / `TOOL_DENYLIST` override visibility.

## Key env flags
- `WORKSPACE_ROOT` – filesystem/git scope.
- `DISPATCH_API_TOKEN` – optional bearer token / `x-dispatch-token` required for app and control routes.
- `DISPATCH_ADMIN_TOKEN` – optional separate token for `/admin/*` routes; falls back to `DISPATCH_API_TOKEN`.
- `HTTP_ALLOWLIST` – comma-separated URL prefixes for http tools.
- `HTTP_MAX_BYTES` – cap for http tool responses (bytes).
- `APIFY_TOKEN`, `APIFY_ACTOR_ALLOWLIST` – enable Apify tool.
- `TOOL_TIMEOUT_MS` – child tool process timeout (ms).
- `TOOL_ALLOWLIST`, `TOOL_DENYLIST`, `OFFLINE_MODE` – tool selection controls.
- `AZURE_DEPLOYMENT_EMBEDDINGS` – optional dedicated embeddings deployment; defaults to `AZURE_DEPLOYMENT_GPT35` if omitted.

## Running
1) Install local services if needed:
   `brew install postgresql@16 redis`
   `brew services start postgresql@16`
   `brew services start redis`
2) `npm install` (then `npx playwright install chromium`).
3) `cp .env.example .env` and fill Azure creds, Azure deployment names, and any auth/tool settings.
4) `npm run migrate`
5) `npm run dev`

## Checks
- `npm run build` verifies the TypeScript backend.
- `npm run lint` runs ESLint over backend TypeScript.
- `npm run test:integration` runs the backend integration suite with mocked infrastructure boundaries.
- `npm run smoke` runs an end-to-end check against a running orchestrator at `SMOKE_BASE_URL` (default `http://localhost:3000`): health, campaign creation, plan generation, approval, WebSocket progress, and memory query.

## Mobile
1) `cd mobile`
2) `npm install`
3) `npm run start`
4) Pair manually with the orchestrator URL plus optional API token, or scan a QR payload like `{"baseUrl":"http://HOST:3000","wsUrl":"ws://HOST:3000/ws","token":"dev-token"}`.

## Notes
- Tools run as child processes under `packages/tools/` with allowlists/timeouts.
- Planner/executor receive the live tool list, so prompts won’t assume unavailable tools.
