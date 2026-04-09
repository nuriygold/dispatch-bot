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
- `DISPATCH_API_TOKEN` – bearer token / `x-dispatch-token` for app routes and WebSocket access.
- `DISPATCH_ADMIN_TOKEN` – separate token for `/admin/*` and `/campaigns/:id/pause|resume`, `/tasks/:id/cancel`.
- `HTTP_ALLOWLIST` – comma-separated URL prefixes for http tools.
- `HTTP_MAX_BYTES` – cap for http tool responses (bytes).
- `APIFY_TOKEN`, `APIFY_ACTOR_ALLOWLIST` – enable Apify tool.
- `TOOL_TIMEOUT_MS` – child tool process timeout (ms).
- `TOOL_ALLOWLIST`, `TOOL_DENYLIST`, `OFFLINE_MODE` – tool selection controls.
- `EXECUTION_REQUEUE_DELAY_MS`, `WS_PROGRESS_INTERVAL_MS`, `QUEUE_STUCK_THRESHOLD_MS` – queue retry cadence, live progress interval, and stuck-job threshold for observability.
- `AZURE_DEPLOYMENT_EMBEDDINGS` – optional dedicated embeddings deployment; defaults to `AZURE_DEPLOYMENT_GPT35` if omitted.

## Running
1) Install local services if needed:
   `brew install postgresql@16 redis`
   `brew services start postgresql@16`
   `brew services start redis`
2) `npm install` (then `npx playwright install chromium`).
3) `cp .env.example .env` and fill Azure creds, Azure deployment names, and replace the default dev tokens before any shared or production deployment.
4) `npm run migrate`
5) `npm run dev`

## Checks
- `npm run build` verifies the TypeScript backend.
- `npm run lint` runs ESLint over backend TypeScript.
- `npm run test:integration` runs the backend integration suite with mocked infrastructure boundaries.
- `npm run azure:preflight` validates the configured Azure endpoint, API key, chat deployments, and embeddings deployment before a full smoke.
- `npm run smoke` runs an end-to-end check against a running orchestrator at `SMOKE_BASE_URL` (default `http://localhost:3000`): health, campaign creation, plan generation, approval, WebSocket progress, and memory query.
  Pause/resume/cancel now require the admin token, so set `SMOKE_API_TOKEN` to `DISPATCH_ADMIN_TOKEN` when you want the full protected smoke path.

## Azure Validation Flow
1) Set real values in `.env` for:
   `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_DEPLOYMENT_GPT4O`, `AZURE_DEPLOYMENT_GPT4T`, `AZURE_DEPLOYMENT_GPT35`, and `AZURE_DEPLOYMENT_EMBEDDINGS`.
2) If Azure requires newer API versions in your region, override:
   `AZURE_OPENAI_API_VERSION_CHAT` and `AZURE_OPENAI_API_VERSION_EMBEDDINGS`.
3) Run `npm run azure:preflight`.
   This checks that each configured deployment answers the exact API this app uses: chat completions for planning/execution/extraction and embeddings for memory.
4) Start the app with `npm run dev`.
5) Run the live smoke with `npm run smoke`.
   For protected environments, set `SMOKE_API_TOKEN` to an admin-capable token first.

## Live Failure Triage
- Chat failures now include the model kind, deployment name, and API version in the thrown error.
- Embedding failures now include the deployment name and API version in the thrown error.
- Planner schema failures include the first part of the raw model response so response-shape drift is visible immediately.

## Mobile
1) `cd mobile`
2) `npm install`
3) `npm run start`
4) Pair manually with the orchestrator URL plus API token, or scan a QR payload like `{"baseUrl":"http://HOST:3000","wsUrl":"ws://HOST:3000/ws","token":"dev-token"}`.
5) Expect plan generation and execution to take longer on Azure than local mocks; the mobile client now shows loading and reconnect states instead of assuming failure immediately.

## Notes
- Tools run as child processes under `packages/tools/` with allowlists/timeouts.
- Planner/executor receive the live tool list, so prompts won’t assume unavailable tools.
- `/admin/health` now reports queued/running/failed task counts, stuck-running task count, and failed executions over the last 24 hours.
