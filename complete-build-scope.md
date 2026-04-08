# Complete Build Scope: Dispatch-Like System from Soup to Nuts

## Executive Summary

**Project Goal**: Build a self-hosted persistent AI agent system controllable from mobile, with multi-agent orchestration and extensible tool ecosystem.

**Estimated Timeline**: 12-16 weeks (MVP) to 24-32 weeks (production-ready)
**Team Size**: 1-2 engineers (solo possible for MVP)
**Total Cost**: $2K-8K first year (mostly cloud/MCP services)

---

## Part 1: Complete Technology Stack

### 1.1 Frontend: Mobile Application

```
TIER 1: PROVEN FRAMEWORKS
├── React Native (Expo) ⭐ RECOMMENDED
│   ├── Best for: Rapid iOS/Android dev
│   ├── Ecosystem: 10k+ packages
│   ├── Learning: 2-3 weeks
│   ├── Tools:
│   │   ├── Expo (manage builds without native code)
│   │   ├── React Navigation (routing)
│   │   ├── Redux/Zustand (state management)
│   │   └── react-native-camera (QR scanning)
│   └── Cost: Free (open source)
│
├── Flutter (Dart)
│   ├── Best for: High performance, pixel-perfect UI
│   ├── Ecosystem: Mature, growing
│   ├── Learning: 3-4 weeks
│   ├── Performance: Faster than RN for complex UIs
│   └── Cost: Free (open source)
│
└── Native (Swift + Kotlin)
    ├── Best for: Maximum control, native UX
    ├── Learning: 4-6 weeks per platform
    ├── Ecosystem: Massive
    └── Drawback: Maintain two codebases

→ RECOMMENDATION: React Native (Expo)
  Reason: 1 codebase, fast iteration, sufficient performance for task dispatch

SUPPORTING LIBRARIES
├── @react-navigation/native (routing)
├── zustand (state: smaller, simpler than Redux)
├── react-native-camera (QR scanner)
├── axios (HTTP client)
├── ws (WebSocket client)
├── expo-async-storage (local persistence)
└── react-native-mmkv (fast encrypted storage)

UI COMPONENT LIBRARIES
├── React Native Paper (Material Design) ⭐
├── NativeBase
└── Tamagui (new, very fast)

TESTING
├── Jest (unit tests)
├── Detox (E2E testing for RN)
└── Vitest (faster alternative to Jest)

DEPLOYMENT
├── Expo Cloud Build (managed iOS/Android builds)
├── Apple Developer Account ($99/year)
├── Google Play Developer Account ($25 one-time)
└── Firebase Cloud Messaging (push notifications)

ESTIMATED EFFORT: 3-5 weeks for MVP
```

### 1.2 Backend: Agent Server

```
CORE RUNTIME
├── Node.js ⭐ RECOMMENDED
│   ├── Version: 20+ LTS
│   ├── Why: JS ecosystem, Anthropic SDK native, fast enough
│   ├── Deployment: pm2, systemd, Docker
│   └── Cost: Free
│
├── Python (FastAPI)
│   ├── Why: Better for ML, more MCP libraries
│   ├── Drawback: Slower for concurrent WebSocket
│   └── Cost: Free
│
└── Go (Fiber/Gin)
    ├── Why: Fastest, best concurrency
    ├── Drawback: Smaller Anthropic ecosystem
    └── Cost: Free

→ RECOMMENDATION: Node.js
  Reason: Anthropic SDK native, JSON everywhere, perfect for this use case

RUNTIME DEPENDENCIES
├── express (HTTP server) ⭐
├── ws (WebSocket server)
├── @anthropic-ai/sdk (Claude API)
├── better-sqlite3 (embedded database)
├── dotenv (config management)
├── pino (logging)
├── joi (input validation)
├── uuid (ID generation)
├── axios (HTTP client for tools)
└── node-cron (scheduled tasks)

STATE & DATA PERSISTENCE
├── better-sqlite3 (local database) ⭐
│   ├── Why: Fast, ACID, embedded, no server
│   ├── Good for: <100GB data
│   └── Backup: Simple file copy
│
├── PostgreSQL (if scaling beyond single machine)
│   ├── Connection pooling: pgbouncer or pg
│   └── Cost: $15-50/month on cloud
│
├── Redis (task queue, session cache)
│   ├── Good for: High-frequency updates
│   ├── Bull (job queue library)
│   └── Cost: $10-30/month managed
│
└── LevelDB (alternative embedded)
    └── Smaller memory footprint

→ RECOMMENDATION: better-sqlite3 (MVP) → PostgreSQL (scale)

QUEUING & ASYNC JOBS
├── Bull (Redis-backed job queue) ⭐
│   ├── Why: Simple, persistent, good monitoring
│   ├── Integrates with: Express easily
│   └── Cost: Embedded Redis ($0-15/mo)
│
├── RabbitMQ
│   ├── Why: Powerful, complex
│   ├── Good for: Multiple services
│   └── Cost: $20-100/mo managed
│
└── AWS SQS
    ├── Good for: Serverless
    └── Cost: Pay per message

→ RECOMMENDATION: Bull + Redis (simple, proven)

TESTING FRAMEWORK
├── Jest (unit + integration)
├── supertest (HTTP testing)
├── @types/jest (TypeScript)
├── ts-jest (TypeScript support)
├── Mock Service Worker (HTTP mocking)
└── Testcontainers (PostgreSQL/Redis in tests)

MONITORING & LOGGING
├── Pino (fast JSON logging)
├── Winston (alternative, heavier)
├── Sentry (error tracking) - Free tier available
├── Prometheus (metrics)
└── Grafana (visualization)

ESTIMATED EFFORT: 4-6 weeks for MVP (core orchestration)
```

### 1.3 Agent Orchestration Layer

```
ORCHESTRATION FRAMEWORKS

OPTION A: Manual with Claude SDK ⭐ RECOMMENDED
├── What: Build your own agentic loop (as shown in Part 3 above)
├── Pros:
│   ├── Maximum control
│   ├── No external dependencies
│   ├── Clear data flow
│   └── Easy to debug
├── Cons: More boilerplate
├── Effort: 2-3 weeks
├── Cost: Free
│
├── Libraries:
│   ├── @anthropic-ai/sdk (tool_use support)
│   ├── zod (schema validation for tools)
│   └── tsx (TypeScript runner)
│
└── Example patterns:
    ├── Agentic loop (while loop with tool_use)
    ├── Streaming responses
    ├── Tool validation/error handling

OPTION B: Paper Clip (AgentFramework)
├── What: Lightweight agent framework for TypeScript
├── Pros:
│   ├── Built for Claude
│   ├── Handles tool_use loop automatically
│   ├── Good debugging UI
│   └── Built-in memory management
├── Cons:
│   ├── Smaller community than others
│   ├── Less mature for production
│   └── Vendor lock-in (Anthropic-specific)
├── Cost: Free
├── Effort: 1-2 weeks (if adopting)
├── GitHub: github.com/anthropics/paper-clip
│
└── When to use: Medium complexity, want framework handling loop

OPTION C: CREO (Autonomous Agent Framework)
├── What: Multi-agent orchestration framework
├── Pros:
│   ├── Agent-to-agent communication
│   ├── Group chat patterns
│   ├── Hierarchical task decomposition
│   └── Built on langchain
├── Cons:
│   ├── More heavyweight
│   ├── Steeper learning curve
│   └── Overkill for single-user dispatch
├── Cost: Free (open source)
├── Effort: 3-4 weeks to integrate
├── GitHub: github.com/microsoft/creo
│
└── When to use: Need multi-agent teams, complex choreography

OPTION D: LangChain / LangGraph
├── What: Framework for building agentic systems
├── Pros:
│   ├── Huge ecosystem (200+ integrations)
│   ├── Memory, prompting, RAG built-in
│   ├── Good documentation
│   └── Works with any LLM
├── Cons:
│   ├── Python-first (though JS SDK exists)
│   ├── Heavy dependencies
│   ├── Can be over-engineered for simple tasks
│   └── Slower than hand-rolled
├── Cost: Free (open source)
├── When to use: Complex workflows, need RAG, multiple LLMs

OPTION E: AutoGen (Microsoft)
├── What: Multi-agent conversation framework
├── Pros:
│   ├── Conversation-based agent design
│   ├── Built-in role specialization
│   ├── Excellent for team coordination
│   └── Python (solid)
├── Cons:
│   ├── Python-only
│   ├── Slower execution
│   └── Heavy for simple dispatch
├── Cost: Free (open source)
├── When to use: Team-based multi-agent systems

RECOMMENDATION MATRIX:
┌────────────────────┬────────────────┬──────────┬────────────┐
│ Scenario           │ Best Choice    │ Effort   │ Risk Level │
├────────────────────┼────────────────┼──────────┼────────────┤
│ Simple dispatch    │ Manual loop    │ 2-3 wks  │ LOW        │
│ + streaming        │ (your code)    │          │            │
├────────────────────┼────────────────┼──────────┼────────────┤
│ Medium complex     │ Paper Clip     │ 1-2 wks  │ LOW-MED    │
│ single user        │ (if released)  │          │            │
├────────────────────┼────────────────┼──────────┼────────────┤
│ Team coordination  │ CREO           │ 3-4 wks  │ MEDIUM     │
│ + agent-to-agent   │ or AutoGen     │          │            │
├────────────────────┼────────────────┼──────────┼────────────┤
│ Complex workflows  │ LangGraph      │ 2-3 wks  │ MEDIUM     │
│ + RAG + memory     │ (if Python)    │          │            │
└────────────────────┴────────────────┴──────────┴────────────┘

→ STRONG RECOMMENDATION: Manual loop (your code) + optional Paper Clip layer
  Reason: 
  - You get the code and understand it
  - Paper Clip (if/when released) wraps your orchestration
  - Avoids framework bloat
  - Easy to add multi-agent support later
```

### 1.4 MCP (Model Context Protocol) Tools

```
MCP PROTOCOL SUPPORT
├── Spec: https://modelcontextprotocol.io
├── Transport: stdio, SSE (server-sent events), WebSocket
├── Implementations:
│   ├── Node.js SDK (TypeScript) ⭐
│   ├── Python SDK (Python)
│   ├── Go SDK (Go)
│   ├── Rust SDK (Rust)
│   └── Ruby SDK (Ruby)
└── Cost: Free (open spec)

APIFY AS MCP SERVER ⭐ EXCELLENT CHOICE
├── What: Web scraping/automation platform
├── MCP Integration:
│   ├── Apify SDK supports tool definitions
│   ├── Can wrap as MCP server
│   ├── Expose actors as tools
│   └── Perfect for web data extraction
│
├── Actors (pre-built tools):
│   ├── Web Scraper
│   ├── Link Checker
│   ├── Screenshot Taker
│   ├── Proxy Scraper
│   ├── YouTube Scraper
│   ├── Google Search Results
│   ├── Bing Search Results
│   └── 1000+ more from community
│
├── Pricing:
│   ├── Free tier: 100 compute units/month
│   ├── Paid: $0.25 per 1000 compute units
│   ├── Team plan: $20/month base
│   └── For Dispatch: ~$10-50/month if heavy use
│
├── Integration:
│   ├── REST API (call actors from Node)
│   ├── Node.js SDK (@apify/client)
│   ├── Easy to wrap as MCP tool
│   └── Great for: web scraping, data extraction
│
└── VERDICT: YES, excellent for web-based tasks
    │ Pairs well with: Code analysis, data collection
    │ Alternative: Puppeteer/Playwright (if self-hosted)
    └── Effort to integrate: 2-3 days

BUILT-IN MCP TOOLS (Self-Hosted)

1. FILESYSTEM (Essential)
   ├── fs_read (read file)
   ├── fs_write (write file)
   ├── fs_list (list directory)
   ├── fs_delete (delete file)
   ├── fs_search (find files by pattern)
   └── Effort: 1-2 days (with sandboxing)

2. CODE ANALYSIS (Recommended)
   ├── ast_parse (parse JavaScript/TypeScript)
   ├── find_vulnerabilities (security check)
   ├── estimate_complexity (cyclomatic complexity)
   ├── suggest_refactor (improvement suggestions)
   │
   ├── Libraries:
   │   ├── @babel/parser (JS/TS AST)
   │   ├── ts-morph (TypeScript analysis)
   │   ├── sonarjs (code smell detection)
   │   ├── eslint-config (linting)
   │   └── code-complexity (metrics)
   │
   └── Effort: 3-5 days

3. GIT OPERATIONS (Essential)
   ├── git_status (current state)
   ├── git_diff (file changes)
   ├── git_commit (create commit)
   ├── git_branch (branch operations)
   ├── git_log (history)
   ├── git_merge (merge branches)
   │
   ├── Libraries:
   │   ├── isomorphic-git (JS git, no system dependency)
   │   ├── simple-git (wrapper around system git)
   │   └── nodegit (native bindings)
   │
   └── Effort: 2-3 days

4. DATABASE QUERY (Optional)
   ├── query_sql (execute SQL)
   ├── schema_inspect (table structure)
   ├── data_export (CSV export)
   │
   ├── Supports:
   │   ├── SQLite (embedded)
   │   ├── PostgreSQL (client lib)
   │   ├── MySQL (client lib)
   │   └── MongoDB (driver)
   │
   └── Effort: 1-2 days per DB type

5. HTTP/API CALLS (Essential)
   ├── http_get
   ├── http_post
   ├── http_put
   ├── http_delete
   ├── http_with_auth (bearer, basic, API key)
   │
   ├── Libraries:
   │   ├── axios (most popular)
   │   ├── node-fetch (lightweight)
   │   └── undici (native, fastest)
   │
   └── Effort: 1 day

6. SHELL EXECUTION (Advanced)
   ├── exec_command (run shell commands)
   ├── exec_npm (run npm/yarn/pnpm)
   ├── exec_docker (Docker operations)
   │
   ├── ⚠️ SECURITY RISK - Whitelist allowed commands
   ├── Libraries:
   │   ├── child_process (Node.js built-in)
   │   ├── execa (better error handling)
   │   └── listr2 (progress tracking)
   │
   └── Effort: 1-2 days (+ hardening)

7. BROWSER AUTOMATION (Optional)
   ├── browser_navigate (open URL)
   ├── browser_screenshot (capture screen)
   ├── browser_click (simulate click)
   ├── browser_fill_form (type + submit)
   │
   ├── Libraries:
   │   ├── Puppeteer (Chrome/Chromium) ⭐
   │   ├── Playwright (multi-browser)
   │   └── Cypress (higher-level)
   │
   ├── Hardware: RAM intensive (300MB+ per instance)
   └── Effort: 3-5 days

8. AI/ML INFERENCE (Optional)
   ├── image_captioning (describe image)
   ├── text_embedding (vector embedding)
   ├── speech_to_text (transcribe audio)
   ├── text_classification (categorize)
   │
   ├── Options:
   │   ├── OpenAI API (easy, not local)
   │   ├── Ollama (local LLM, 8GB+ GPU)
   │   ├── ONNX Runtime (fast inference)
   │   ├── Transformers.js (in-process)
   │   └── Hugging Face Inference API
   │
   └── Effort: 2-3 days

EXTERNAL MCP TOOLS (Already Built)

GitHub MCP Server
├── What: Read GitHub repos, issues, PRs
├── Link: https://github.com/modelcontextprotocol/servers
├── Cost: Free (rate limited)
└── Effort: 1 day to integrate

Google Drive MCP Server
├── What: List, read, write Google Drive files
├── Link: MCP Servers collection
├── Auth: OAuth 2.0 needed
└── Effort: 1 day

Slack MCP Server
├── What: Read/send messages, list channels
├── Auth: Bot token
├── Cost: Free
└── Effort: 1 day

Linear MCP Server
├── What: Issue tracking integration
├── Cost: Free (Linear API)
└── Effort: 1 day

Brave Search MCP Server
├── What: Web search (no tracking)
├── Cost: Free tier available
├── Effort: 1 day

RECOMMENDED MCP STACK FOR MVP:
┌─────────────────────┬─────────────┬────────┐
│ MCP Server          │ Purpose     │ Effort │
├─────────────────────┼─────────────┼────────┤
│ Filesystem (yours)  │ File ops    │ 2 days │
│ Git (yours)         │ Git ops     │ 2 days │
│ HTTP (yours)        │ API calls   │ 1 day  │
│ Code Analysis       │ Code review │ 3 days │
│ Apify (external)    │ Web scrape  │ 1 day  │
│ GitHub (external)   │ Repo access │ 1 day  │
│ Brave Search        │ Web search  │ 1 day  │
└─────────────────────┴─────────────┴────────┘

Total MCP build: ~2 weeks
```

---

## Part 2: Hardware & Infrastructure Requirements

### 2.1 Desktop/Laptop (Agent Server Host)

```
MINIMUM (MVP)
├── CPU: 2 cores @ 2.5GHz (can handle 2-3 concurrent Claude calls)
├── RAM: 4GB (2GB for Node, 2GB for VM/browser)
├── Storage: 20GB SSD
├── Network: 10Mbps stable connection
│
├── Examples:
│   ├── MacBook Air M1/M2 (2020+)
│   ├── Lenovo ThinkPad (Intel i5, 2018+)
│   ├── Framework Laptop
│   ├── Raspberry Pi 4 (8GB RAM variant)
│   └── AWS EC2 t3.small ($0.02/hour)
│
└── Estimated Monthly Cost: $0 (use your machine)

RECOMMENDED (Production)
├── CPU: 4+ cores @ 3GHz (handle 5-10 concurrent tasks)
├── RAM: 16GB
│   ├── 4GB for Node.js process
│   ├── 6GB for browser automation (if needed)
│   ├── 4GB for other tools
│   └── 2GB buffer
├── Storage: 100GB SSD (SQLite database growth)
├── Network: 50Mbps+ stable (for streaming responses)
├── Optional: Docker support (for tool isolation)
│
├── Examples:
│   ├── MacBook Pro 14" M3/M4 (2023+)
│   ├── Dell Precision Laptop
│   ├── Ubuntu Desktop (custom build)
│   └── AWS EC2 t3.medium ($0.04/hour)
│
└── Estimated Monthly Cost: $0 (personal machine) or $25-50 (cloud)

PREMIUM (Heavy Load)
├── CPU: 8+ cores @ 3.5GHz
├── RAM: 32GB
│   ├── 4GB Node.js
│   ├── 8GB browser instances (multiple concurrent)
│   ├── 8GB Postgres/Redis
│   ├── 8GB other tools/buffer
├── Storage: 500GB SSD
├── GPU: Optional (for local LLM inference, not needed for Claude API)
│
├── Examples:
│   ├── MacBook Pro 16" M3 Max
│   ├── ASUS ProArt laptop
│   ├── Dell XPS 15/17
│   ├── AWS EC2 c5.xlarge ($0.17/hour)
│   └── Self-hosted server (£500-1500)
│
└── Estimated Monthly Cost: $100-200+ (cloud) or one-time £500-1500

MOBILE DEVICE (Phone)
├── iOS: iPhone 11+ (2019+) - 64GB minimum
│   └── Cost: $300-800
├── Android: Snapdragon 855+ (2018+) - 4GB RAM minimum
│   └── Cost: $200-600
│
└── No cloud costs (local, peer connection)

NETWORK REQUIREMENTS
├── WiFi for local access (same network)
├── Internet for cloud relay (if remote)
├── VPN tunnel (if going through relay, optional)
├── SSL/TLS certificate (if self-hosted relay)
└── Cost: Included in ISP bill ($30-100/mo)

OPTIONAL: RELAY SERVER (for remote access)
├── VPS Requirements:
│   ├── CPU: 2 cores (handles routing only, not execution)
│   ├── RAM: 1GB (connection pooling)
│   ├── Storage: 10GB
│   ├── Bandwidth: 1TB/month
│   └── Location: Geographically close to users
│
├── Providers (recommended):
│   ├── Linode ($5-10/month) ⭐
│   ├── DigitalOcean ($5-12/month)
│   ├── Vultr ($2.50-5/month)
│   ├── AWS EC2 t3.nano ($0.006/hour = ~$4/mo)
│   └── Hetzner (€2.50-5/month)
│
└── Cost: $5-10/month for relay-only

DOCKER CONTAINERS (for tool isolation)
├── Overhead: ~100MB per running container
├── Orchestration: Docker Compose (single machine)
├── For multi-machine: Kubernetes (overkill for MVP)
└── Cost: Free (open source)

SUMMARY TABLE:
┌──────────────┬──────────┬──────────┬─────────────────┐
│ Scenario     │ Hardware │ Monthly  │ Feasible?       │
├──────────────┼──────────┼──────────┼─────────────────┤
│ Solo, local  │ $0       │ $0-30    │ YES, ideal MVP  │
├──────────────┼──────────┼──────────┼─────────────────┤
│ Production   │ $50-200  │ $25-100  │ YES, excellent  │
├──────────────┼──────────┼──────────┼─────────────────┤
│ Multi-user   │ $200-500 │ $100-300 │ YES, scale up   │
└──────────────┴──────────┴──────────┴─────────────────┘
```

### 2.2 Cloud Services & Third-Party APIs

```
ESSENTIAL SERVICES (Required)

Anthropic Claude API
├── Model: Claude Opus 4 or Sonnet 4
├── Pricing:
│   ├── Opus: $15 per M input, $75 per M output tokens
│   ├── Sonnet: $3 per M input, $15 per M output tokens
│   └── Haiku: $0.80 per M input, $4 per M output tokens
├── For Dispatch:
│   ├── Light use (10-20 tasks/day): $5-20/month
│   ├── Medium use (50-100 tasks/day): $20-50/month
│   ├── Heavy use (200+ tasks/day): $100-500/month
├── Usage Tiers:
│   ├── Free tier: Limited, rate-capped
│   ├── Usage-based: Pay for what you use
│   └── Batch API: 50% discount for async tasks
└── Cost: $20-100/month (typical)

RECOMMENDED STACK

1. APIFY (Web Scraping MCP) - Optional but great
   ├── Pricing:
   │   ├── Free: 100 compute units/month
   │   ├── Per-use: $0.25 per 1000 units
   │   └── Team: $20-100/month (includes credits)
   ├── Use case: Extract data from websites
   └── Cost: $0-30/month (if used)

2. GITHUB API (if integrating repos)
   ├── Pricing: Free for public, $4-21/month for private
   ├── Rate limits: 5,000 requests/hour
   └── Cost: $0-20/month (if needed)

3. SLACK API (if integrating with Slack)
   ├── Pricing: Free (basic bot permissions)
   ├── Cost: $0 (unless using Enterprise Grid)

4. GOOGLE DRIVE API (if accessing Google Drive)
   ├── Pricing: Free (rate limited)
   ├── Cost: $0

5. OPENAI EMBEDDINGS (optional, for semantic search)
   ├── Pricing: $0.02 per 1M tokens
   ├── Use case: Vector embeddings for memory search
   └── Cost: $5-20/month (if using heavily)

OPTIONAL SERVICES

Sentry (Error Tracking)
├── Free tier: 5,000 errors/month
├── Pricing: $29/month (pay-as-you-go)
└── Cost: $0-30/month

Firebase/Pusher (Push Notifications)
├── Firebase: Free up to 125K daily active users
├── Pusher: $49/month for 100M messages
└── Cost: $0-50/month

Vercel (For Optional Web Dashboard)
├── Pricing: $20/month (Hobby tier)
├── Cost: $20/month (if building web UI)

AWS Services (if cloud-based)
├── EC2: $5-30/month (server)
├── RDS: $15-50/month (if using managed Postgres)
├── S3: $1-5/month (if storing large files)
└── Total: $20-100/month (if cloud-hosted)

MONITORING & OBSERVABILITY

Datadog
├── Pricing: $15-30/month minimum
├── Cost: $20-50/month

New Relic
├── Pricing: Free tier + $100/month paid
├── Cost: $0-100/month

Self-Hosted (Prometheus + Grafana)
├── Cost: $0 (open source, runs on your machine)
└── Effort: 2-3 days setup

TOTAL MONTHLY COST ESTIMATE:

MVP Setup (Solo, Local):
├── Claude API: $20-50
├── Optional: Apify ($10)
├── Internet: $0 (included in home ISP)
└── TOTAL: $20-50/month

Production Setup (Self-Hosted):
├── Claude API: $50-150
├── Relay Server: $5-10
├── Apify: $10-20
├── Sentry: $0-30
├── Postgres/Redis (managed): $20-50
└── TOTAL: $85-260/month

Enterprise Setup (Multi-User, Cloud):
├── Claude API: $200-500
├── AWS/Cloud Hosting: $100-300
├── Managed DB: $50-200
├── Monitoring: $50-100
├── Apify + integrations: $50-100
└── TOTAL: $450-1200/month
```

---

## Part 3: Complete Development Timeline

### 3.1 Phased Breakdown

```
PHASE 1: FOUNDATION (Weeks 1-3) - MVP Core
┌─────────────────────────────────────────────┐
│ Week 1: Project Setup & Authentication      │
├─────────────────────────────────────────────┤
│ ✓ Node.js server scaffolding (Express)      │
│ ✓ React Native app setup (Expo)             │
│ ✓ Database schema (SQLite)                  │
│ ✓ Environment config                        │
│ ✓ Logging setup (Pino)                      │
│ ✓ Claude API integration                    │
│                                             │
│ Effort: 40 hours (5 days)                  │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 2: Session Management & Pairing       │
├─────────────────────────────────────────────┤
│ ✓ QR code generation + scanning            │
│ ✓ Session persistence (thread storage)     │
│ ✓ Device pairing logic                     │
│ ✓ WebSocket connection pool                │
│ ✓ Message routing                          │
│ ✓ Auth token management                    │
│ ✓ Conversation history retrieval           │
│                                             │
│ Effort: 45 hours (5-6 days)                │
│ Risk: Low-Medium (WebSocket complexity)    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 3: Core Agent Loop                    │
├─────────────────────────────────────────────┤
│ ✓ AgentOrchestrator class                  │
│ ✓ Tool registration system                 │
│ ✓ Tool execution loop (agentic)            │
│ ✓ Error handling + retries                 │
│ ✓ Token limit enforcement                  │
│ ✓ Streaming response handling              │
│ ✓ Step progress tracking                   │
│                                             │
│ Effort: 50 hours (6 days)                  │
│ Risk: Medium (Claude API behavior)         │
└─────────────────────────────────────────────┘

PHASE 1 TOTAL: ~135 hours (3 weeks, 1 person)


PHASE 2: ESSENTIAL MCP TOOLS (Weeks 4-6)
┌─────────────────────────────────────────────┐
│ Week 4: Filesystem + Git MCP                │
├─────────────────────────────────────────────┤
│ ✓ Filesystem MCP (read/write/list/delete)  │
│   - Path validation (no directory traversal)│
│   - Permission checking                    │
│   - Large file handling                    │
│                                             │
│ ✓ Git MCP (status/diff/commit/branch)      │
│   - Using simple-git library               │
│   - Output parsing                         │
│   - Error handling                         │
│                                             │
│ Effort: 40 hours                           │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 5: HTTP + Code Analysis MCP           │
├─────────────────────────────────────────────┤
│ ✓ HTTP MCP (GET/POST/PUT/DELETE/Auth)      │
│   - Request timeout handling               │
│   - Header/body manipulation               │
│   - Response parsing                       │
│                                             │
│ ✓ Code Analysis MCP                        │
│   - AST parsing (@babel/parser)            │
│   - Complexity metrics                     │
│   - Vulnerability detection (basic)        │
│                                             │
│ Effort: 45 hours                           │
│ Risk: Medium (security review needed)      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 6: Apify Integration + Browser Auto   │
├─────────────────────────────────────────────┤
│ ✓ Apify MCP wrapper                        │
│   - Call Apify actors                      │
│   - Handle results                         │
│   - Token credit tracking                  │
│                                             │
│ ✓ Browser Automation MCP (Puppeteer)       │
│   - Launch browser (pooling)               │
│   - Navigation/clicking/typing             │
│   - Screenshot capture                     │
│   - Form filling                           │
│                                             │
│ Effort: 50 hours                           │
│ Risk: Medium-High (resource intensive)     │
└─────────────────────────────────────────────┘

PHASE 2 TOTAL: ~135 hours (3 weeks)


PHASE 3: MOBILE FRONTEND (Weeks 7-9)
┌─────────────────────────────────────────────┐
│ Week 7: UI Scaffolding                     │
├─────────────────────────────────────────────┤
│ ✓ Navigation structure                     │
│ ✓ QR Scanner screen                        │
│ ✓ Task input screen                        │
│ ✓ Chat history display                     │
│ ✓ Basic styling (React Native Paper)       │
│                                             │
│ Effort: 35 hours                           │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 8: Connection & Data Flow              │
├─────────────────────────────────────────────┤
│ ✓ WebSocket client (ws library)            │
│ ✓ HTTP client (axios)                      │
│ ✓ AsyncStorage (session persistence)       │
│ ✓ State management (Zustand)               │
│ ✓ Error handling / reconnection logic      │
│ ✓ Real-time step progress display          │
│                                             │
│ Effort: 40 hours                           │
│ Risk: Medium (async flows)                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 9: Polish + Testing                   │
├─────────────────────────────────────────────┤
│ ✓ E2E testing (Detox)                      │
│ ✓ Error message improvements               │
│ ✓ Loading states                           │
│ ✓ Offline handling                         │
│ ✓ Performance optimization                 │
│ ✓ iOS/Android specific handling            │
│                                             │
│ Effort: 35 hours                           │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

PHASE 3 TOTAL: ~110 hours (2.5-3 weeks)


PHASE 4: ADVANCED FEATURES (Weeks 10-12)
┌─────────────────────────────────────────────┐
│ Week 10: Multi-Agent & Memory              │
├─────────────────────────────────────────────┤
│ ✓ Conversation summarization               │
│ ✓ Semantic search over history            │
│ ✓ Task templates                           │
│ ✓ Recurring/scheduled tasks                │
│                                             │
│ Effort: 40 hours                           │
│ Risk: Medium                                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 11: Monitoring & Debugging            │
├─────────────────────────────────────────────┤
│ ✓ Logging improvements                     │
│ ✓ Sentry integration                       │
│ ✓ Metrics/Prometheus setup                 │
│ ✓ Debug dashboard                          │
│ ✓ Cost tracking (token usage)              │
│                                             │
│ Effort: 35 hours                           │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Week 12: Deployment & Documentation       │
├─────────────────────────────────────────────┤
│ ✓ Docker containerization                  │
│ ✓ Deployment guide (self-hosted)           │
│ ✓ Cloud deployment (optional)              │
│ ✓ API documentation                        │
│ ✓ Architecture diagrams                    │
│ ✓ Security hardening review                │
│                                             │
│ Effort: 40 hours                           │
│ Risk: Low                                   │
└─────────────────────────────────────────────┘

PHASE 4 TOTAL: ~115 hours (3 weeks)


MVP TOTAL: ~495 hours (~3 months, 1 developer)
                or ~8 weeks (2 developers)

OPTIONAL PHASE 5: PRODUCTION HARDENING (4+ weeks)
├── Load testing
├── Security penetration testing
├── Multi-user testing
├── Performance optimization
├── Backup/recovery procedures
├── SLA setup
└── Operations runbook

TOTAL PRODUCTION-READY: 6-8 months (1 person) or 4-5 months (2 people)
```

### 3.2 Detailed Sprint Breakdown for MVP

```
SPRINT 1 (Week 1)
═══════════════════════════════════════════════════════════
Story 1.1: Backend Scaffolding (20 hours)
├── Express app setup
├── TypeScript configuration
├── Environment management
├── Logging with Pino
├── Database schema (SQLite)
└── Tests: basic server health

Story 1.2: Frontend Scaffolding (15 hours)
├── Expo initialization
├── React Navigation setup
├── Project structure
├── Testing framework (Jest)
└── Tests: app launches

Story 1.3: Claude API Integration (5 hours)
├── API key configuration
├── Basic message send/receive
└── Tests: API connectivity

SPRINT 2 (Week 2)
═══════════════════════════════════════════════════════════
Story 2.1: Session Management (25 hours)
├── Session creation
├── Session persistence (DB)
├── Pairing token generation
├── Device pairing validation
└── Tests: session lifecycle

Story 2.2: QR Code Implementation (15 hours)
├── QR generation (backend)
├── QR scanning (frontend)
├── Pairing flow
└── Tests: QR pairing end-to-end

Story 2.3: WebSocket Connection (5 hours)
├── WS server (backend)
├── WS client (frontend)
└── Connection pooling

SPRINT 3 (Week 3)
═══════════════════════════════════════════════════════════
Story 3.1: Agent Orchestrator (30 hours)
├── Tool registration
├── Agentic loop
├── Tool execution
├── Error handling
└── Tests: agent loop with mock tools

Story 3.2: Message Flow (10 hours)
├── User → Task → Claude
├── Claude → Tools → Results
├── Results → Mobile display
└── Tests: full task flow

SPRINT 4-6 (Weeks 4-6): MCP Implementations
═══════════════════════════════════════════════════════════
Each MCP = 2-3 day task:

Week 4:
├── Filesystem MCP (3 days)
└── Git MCP (2 days)

Week 5:
├── HTTP MCP (2 days)
├── Code Analysis MCP (3 days)
└── Testing (1 day)

Week 6:
├── Apify Integration (2 days)
├── Browser Auto (3 days)
└── Integration testing (1 day)

SPRINT 7-9 (Weeks 7-9): Mobile Frontend
═══════════════════════════════════════════════════════════
Week 7: UI Components
├── Screens scaffolding
├── Component library setup
└── Styling

Week 8: State & Connection
├── Redux/Zustand setup
├── API client
├── WebSocket client
└── Error handling

Week 9: Polish & Testing
├── E2E tests
├── UX improvements
├── Performance
└── Release prep
```

---

## Part 4: Risk Assessment & Mitigation

```
CRITICAL RISKS

1. Claude API Rate Limits / Costs
   ├── Risk: Rapid token consumption = high bill
   ├── Impact: Budget overrun (could be $100+/month)
   ├── Probability: MEDIUM (if heavy testing)
   ├── Mitigation:
   │   ├── Set Claude rate limits in code
   │   ├── Token counting before API calls
   │   ├── Use Haiku for testing (cheaper)
   │   ├── Monitor spending with alerts
   │   └── Batch API for non-urgent tasks
   └── Estimated Impact: $0-50 extra/month

2. Tool Execution Hangs (Infinite Loops)
   ├── Risk: Browser automation / long-running ops hang forever
   ├── Impact: Task never completes, resources leak
   ├── Probability: HIGH (inevitable)
   ├── Mitigation:
   │   ├── Timeouts on ALL tools (30s default)
   │   ├── Worker processes with kill switches
   │   ├── Resource monitoring
   │   └── Circuit breakers
   └── Implementation: 2-3 days hardening

3. Security: Code Injection via Claude Tools
   ├── Risk: Claude could call `rm -rf /` if shell exec allowed
   ├── Impact: Data loss
   ├── Probability: LOW (Claude is safe) but CRITICAL if happens
   ├── Mitigation:
   │   ├── Whitelist allowed commands
   │   ├── Run in containers/VMs
   │   ├── No root execution
   │   ├── Regular security audit
   │   └── Prompt injection testing
   └── Implementation: Require from day 1

4. WebSocket Disconnections / Reconnection Loop
   ├── Risk: Connection drops, floods server with reconnects
   ├── Impact: Resource exhaustion
   ├── Probability: MEDIUM (if network unstable)
   ├── Mitigation:
   │   ├── Exponential backoff (1s, 2s, 4s, 8s...)
   │   ├── Max connection pool limits
   │   ├── Connection health checks
   │   └── Graceful degradation
   └── Implementation: Built into ws library

5. Mobile App Store Rejection (iOS)
   ├── Risk: App rejected for privacy/functionality reasons
   ├── Impact: Delayed release (2-4 weeks)
   ├── Probability: LOW-MEDIUM
   ├── Mitigation:
   │   ├── Privacy policy in place
   │   ├── Transparent data handling
   │   ├── No malicious APIs
   │   └── Beta test via TestFlight first
   └── Cost: $99/year Apple developer

MEDIUM RISKS

6. Browser Automation Memory Leaks
   ├── Risk: Puppeteer instances don't clean up
   ├── Impact: RAM exhaustion, crashes
   ├── Probability: MEDIUM
   └── Mitigation:
       ├── Browser pooling with limits
       ├── Regular page cleanup
       ├── Memory monitoring
       └── Restart cycle (24hr)

7. Database Corruption (SQLite)
   ├── Risk: Concurrent writes cause corruption
   ├── Impact: Data loss
   ├── Probability: LOW (better-sqlite3 handles locks)
   └── Mitigation:
       ├── WAL mode enabled
       ├── Regular backups
       ├── Integrity checks
       └── Upgrade to Postgres if scaling

8. MCP Tool Compatibility
   ├── Risk: External MCP servers change API
   ├── Impact: Tools break
   ├── Probability: LOW
   └── Mitigation:
       ├── Version pinning
       ├── Fallback behaviors
       ├── API contract tests
       └── Community monitoring

LOW RISKS

9. GPU Requirement Confusion
   ├── Risk: User thinks GPU needed (it's not for Claude API)
   ├── Impact: Unnecessary hardware purchase
   ├── Probability: MEDIUM
   └── Mitigation:
       ├── Clear documentation
       ├── "CPU-only" badge in README
       └── Cost calculator

MITIGATION BUDGET
├── Testing infrastructure: 1 week
├── Security hardening: 1-2 weeks
├── Monitoring/alerting: 3-4 days
├── Documentation: 1 week
└── Total: ~4 weeks extra for "robustness"
```

---

## Part 5: Complete Resource Checklist

### 5.1 Tools & Services (Verified Working)

```
FRONTEND STACK
✓ React Native (Expo) - Mobile framework
✓ TypeScript - Type safety
✓ React Navigation - Routing
✓ Zustand - State management
✓ Axios - HTTP client
✓ ws - WebSocket client
✓ expo-camera - QR scanning
✓ React Native Paper - UI components
✓ Jest - Testing
✓ Detox - E2E testing

BACKEND STACK
✓ Node.js 20+ - Runtime
✓ Express - HTTP framework
✓ ws - WebSocket server
✓ @anthropic-ai/sdk - Claude API
✓ better-sqlite3 - Database
✓ Pino - Logging
✓ Joi - Validation
✓ axios - HTTP client
✓ simple-git - Git operations
✓ isomorphic-git - Alternative git (pure JS)
✓ @babel/parser - Code parsing
✓ ts-morph - TypeScript analysis
✓ puppeteer - Browser automation
✓ @apify/client - Apify integration
✓ jwt-simple - Token auth
✓ redis - Cache (optional)
✓ bull - Job queue (optional)

MCP & TOOL SERVERS
✓ @modelcontextprotocol/sdk - MCP SDK
✓ execa - Process execution
✓ child_process - Built-in process runner
✓ dotenv - Config management

TESTING & QA
✓ Jest - Unit testing
✓ Supertest - HTTP testing
✓ ts-jest - TypeScript support
✓ Mock Service Worker - HTTP mocking
✓ Vitest - Alternative test runner
✓ Detox - React Native E2E

DEPLOYMENT
✓ Docker - Containerization
✓ docker-compose - Multi-container
✓ pm2 - Node.js process manager
✓ systemd - Service management
✓ nginx - Reverse proxy
✓ Certbot - SSL certificates

MONITORING
✓ Pino - Application logging
✓ Sentry - Error tracking
✓ Prometheus - Metrics collection
✓ Grafana - Visualization
✓ New Relic - Alternative APM

EXTERNAL SERVICES (Paid)
✓ Anthropic Claude API - LLM
✓ Apify - Web scraping/automation
✓ GitHub API - Repository access
✓ Slack API - Chat integration
✓ Google Drive API - File access

INFRASTRUCTURE
✓ Linode / DigitalOcean - VPS hosting
✓ AWS EC2 - Cloud server
✓ GitHub - Source control
✓ Docker Hub - Image registry
✓ Vercel - Optional web dashboard

DOCUMENTATION & GUIDES
✓ MCP Spec - https://modelcontextprotocol.io
✓ Anthropic Docs - https://docs.anthropic.com
✓ Node.js Best Practices
✓ WebSocket Guide - MDN Web Docs
✓ React Native Docs
✓ Expo Documentation
```

### 5.2 Learning Resources & Estimates

```
PREREQUISITE KNOWLEDGE
├── JavaScript/TypeScript: 40-60 hours
├── React basics: 20-30 hours
├── Node.js basics: 20-30 hours
├── WebSocket fundamentals: 5-10 hours
└── Total: ~85-130 hours (if starting fresh)

IF YOU ALREADY KNOW:
├── JavaScript: -30 hours
├── React: -20 hours
├── Node.js: -20 hours
└── Subtract accordingly

FOCUSED LEARNING (For This Project)
├── React Native (Expo): 20-30 hours
├── Express.js: 10-15 hours
├── SQLite / better-sqlite3: 5-10 hours
├── WebSocket with ws: 5 hours
├── MCP Protocol: 5-10 hours
├── Claude API / tool_use: 10-15 hours
├── Puppeteer: 10-15 hours (if using browser auto)
└── Total learning: ~80-110 hours (3-4 weeks part-time)

RECOMMENDED LEARNING PATH:
Week 1: React Native + Expo
├── Official Expo tutorial
├── Build simple counter app
└── Hands-on: QR scanner demo

Week 2: Express + WebSocket
├── Express fundamentals
├── ws library deep-dive
└── Hands-on: Echo server with client

Week 3: Claude API + Tool Use
├── Official Claude docs
├── Tool use examples
└── Hands-on: Simple agent with 2-3 tools

Week 4: Integration
├── Connect frontend ↔ backend
├── Connect agent ↔ tools
└── Build full MVP flow
```

---

## Part 6: Deployment Scenarios

### 6.1 Local Network MVP (Simplest)

```
SETUP:
┌─────────────────────────────┐
│  Desktop (MacBook/Linux)    │
│  ├── Node.js server (3000)  │
│  ├── SQLite DB              │
│  └── MCP Tools              │
└──────────────┬──────────────┘
               │ WiFi (same network)
               ▼
┌─────────────────────────────┐
│  Mobile Phone               │
│  ├── React Native App       │
│  └── Connect to localhost   │
└─────────────────────────────┘

INSTRUCTIONS:
1. Start server: npm run dev
2. QR code appears on desktop
3. Scan QR with phone
4. Start using Dispatch

PROS:
✓ No cloud setup
✓ No relay server costs
✓ Fast local LAN speeds
✓ Zero infrastructure

CONS:
✗ Phone must be on same WiFi
✗ No remote access
✗ Desktop must be on

ESTIMATED SETUP TIME: 1-2 hours
```

### 6.2 Self-Hosted with Relay (Recommended)

```
SETUP:
┌──────────────────────────────────────────────┐
│  Your VPS ($5-10/month)                      │
│  ├── Node.js relay server (3001)             │
│  ├── HTTPS + WSS                             │
│  └── Auth tokens                             │
└──────────────┬───────────────────────────────┘
               │ HTTPS/WSS (internet)
        ┌──────┴─────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│  Desktop     │   │  Mobile          │
│  (your home) │   │  (anywhere)      │
└──────────────┘   └──────────────────┘

SETUP STEPS:
1. Provision VPS (Linode/DigitalOcean)
2. Install Node.js + Docker
3. Deploy relay server
4. Configure SSL (Certbot)
5. Update desktop client to use relay URL
6. Test connection

ESTIMATED SETUP TIME: 4-6 hours
MONTHLY COST: $5-10 (VPS) + Claude API costs

PROS:
✓ Remote access from anywhere
✓ Phone on any network
✓ Relay handles routing
✓ Scalable

CONS:
✗ VPS costs ($5-10/month)
✗ SSL/TLS setup required
✗ Relay latency (100-500ms)
✗ Need to manage VPS

ARCHITECTURE:
Phone ─(HTTPS)─> Relay ─(mTLS)─> Desktop
                  │
                  ├─ Maintains connection pool
                  ├─ Routes messages
                  ├─ Auth & validation
                  └─ No data processing
```

### 6.3 Cloud-Hosted Agent (AWS/Digital Ocean)

```
SETUP:
┌──────────────────────────────────────────┐
│  AWS EC2 Instance ($25-50/month)         │
│  ├── Full agent server                   │
│  ├── PostgreSQL database                 │
│  ├── Redis cache                         │
│  └── Monitoring                          │
└──────────────┬───────────────────────────┘
               │ HTTPS/WSS
        ┌──────┴─────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│  Web UI      │   │  Mobile App      │
│  (Vercel)    │   │  (Expo)          │
└──────────────┘   └──────────────────┘

ADDITIONAL SERVICES:
├── RDS PostgreSQL ($15-50/month)
├── Elasticache Redis ($10-30/month)
├── S3 for file storage ($1-5/month)
├── CloudWatch monitoring ($0-20/month)
└── Total: $50-150/month

PROS:
✓ Highly scalable
✓ Professional monitoring
✓ Auto-backups
✓ Multi-region possible

CONS:
✗ Higher cost ($50-150/month)
✗ More complex setup
✗ Requires DevOps knowledge
✗ "Always on" costs

BEST FOR: Production, multi-user, commercial use
```

---

## Part 7: Cost Breakdown Summary

```
HARDWARE COSTS (One-Time)
┌────────────────────────────────────────┐
│ Personal Machine (for agent server)    │
├────────────────────────────────────────┤
│ Use existing laptop: $0                │
│ Buy new machine: $800-2000             │
│ Average: $0 (reuse existing)           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Mobile Device (for client)             │
├────────────────────────────────────────┤
│ Use existing phone: $0                 │
│ Buy new phone: $300-800                │
│ Average: $0 (reuse existing)           │
└────────────────────────────────────────┘

MONTHLY OPERATIONAL COSTS (MVP)
┌────────────────────────────────────────┐
│ Claude API Usage                       │
├────────────────────────────────────────┤
│ Light (10 tasks/day): $10-30/month     │
│ Medium (50 tasks/day): $30-100/month   │
│ Heavy (200+ tasks/day): $100-500/month │
│ Average: $50/month                     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Optional Third-Party Services          │
├────────────────────────────────────────┤
│ Apify (web scraping): $0-30/month      │
│ Sentry (monitoring): $0-30/month       │
│ Relay VPS: $5-10/month                 │
│ Average: $15/month                     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Connectivity                           │
├────────────────────────────────────────┤
│ Home Internet: Included (~$50/mo)      │
│ Mobile data: Included (~$50/mo)        │
│ SSL certificates: Free (Certbot)       │
│ Average: $0 (already paying)           │
└────────────────────────────────────────┘

MONTHLY MVP TOTAL: $50-75
MONTHLY PRODUCTION: $100-200
MONTHLY ENTERPRISE: $500-1000+

ANNUAL BREAKDOWN (First Year)
┌───────────────────────────────────────┐
│ MVP Setup                             │
├───────────────────────────────────────┤
│ Hardware: $0 (reuse)                  │
│ Development: $0 (your time)           │
│ Monthly operations: $50-75 × 12       │
│ Developer accounts: $100 (iOS + Android)│
│ Total Year 1: $700-1000               │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Production Setup                      │
├───────────────────────────────────────┤
│ Hardware: $0-2000                     │
│ Development: $0 (your time)           │
│ Monthly operations: $100-200 × 12     │
│ Developer accounts: $100              │
│ Domain: $10-15/year                   │
│ SSL & security: $0 (free)             │
│ Total Year 1: $1310-2530              │
└───────────────────────────────────────┘

ROI CALCULATION:
If each agent saves you 5 hours/week:
├── 5 hours × $50/hr (your rate) = $250/week
├── $250/week × 50 weeks/year = $12,500/year saved
├── Cost: ~$1000/year
└── ROI: 1150% (break-even in 2-3 weeks)

If you're a developer making $100/hr:
├── Payback period: 1 week
└── Year 1 net savings: ~$11,500
```

---

## Part 8: Final Recommendations

### 8.1 Recommended Stack (FINAL)

```
FRONTEND
├── React Native (Expo) ✓ FINAL
├── TypeScript ✓
├── Zustand (state) ✓
├── Axios (HTTP) ✓
└── React Native Paper (UI) ✓

BACKEND
├── Node.js ✓ FINAL
├── Express ✓
├── better-sqlite3 ✓
├── ws (WebSocket) ✓
└── TypeScript ✓

AGENT ORCHESTRATION
├── Manual agentic loop (your code) ✓ FINAL
├── Claude SDK ✓
├── Zod (validation) ✓
└── Later: Paper Clip (when available) ✓

MCP TOOLS (Built-in)
├── Filesystem MCP ✓
├── Git MCP ✓
├── HTTP MCP ✓
├── Code Analysis ✓
└── Browser Auto (Puppeteer) ✓

EXTERNAL MCP
├── Apify ✓✓✓ (HIGHLY RECOMMENDED)
├── GitHub API ✓
├── Slack API ✓
└── Google Drive API ✓

DEPLOYMENT
├── Local network (MVP) ✓
├── Relay VPS (production) ✓
├── Docker ✓
└── pm2 (process manager) ✓

MONITORING
├── Pino (logging) ✓
├── Sentry (optional) ✓
└── Prometheus (optional) ✓

TOTAL STACK COST: $0 (open source) + $50-200/month (APIs)
```

### 8.2 Question Answers

```
Q: "Would Apify be great for MCP?"
A: YES, absolutely ✓✓✓
   ├── Apify excels at web scraping
   ├── 1000+ pre-built actors
   ├── Easy to wrap as MCP server
   ├── Perfect for: Data extraction, automation
   ├── Cost: $0-30/month for light use
   ├── Alternative: Puppeteer (if self-hosting)
   └── Recommendation: Use BOTH
       ├── Apify for complex web tasks
       └── Puppeteer for simple automation

Q: "Would Paper Clip or CREO be for managing agents?"
A: NEITHER, use manual loop (your code)
   ├── Paper Clip: Not yet released, wait and see
   ├── CREO: Overkill for single-user dispatch
   ├── LangGraph: Overkill unless Python-based
   ├── AutoGen: Overkill unless multi-agent teams
   │
   ├── Better approach:
   │   ├── Build your own orchestration (2-3 weeks)
   │   ├── Easy to understand and modify
   │   ├── Later wrap with Paper Clip if needed
   │   └── Add multi-agent support incrementally
   │
   └── IF later you need multi-agent:
       ├── Add CREO layer on top
       ├── Or implement agent-to-agent messaging
       └── Timeline: Month 6+

Q: "What hardware requirements?"
A: MINIMAL for MVP
   ├── CPU: 2+ cores (what you have now)
   ├── RAM: 4GB (your laptop has this)
   ├── Storage: 20GB free (you have this)
   ├── Network: 10Mbps (home WiFi is fine)
   ├── NO GPU needed (Claude API is cloud)
   │
   └── Recommended upgrade (if heavy use):
       ├── CPU: 4+ cores
       ├── RAM: 16GB
       ├── Storage: 100GB SSD
       └── Cost: Minimal if you have decent laptop

Q: "What's the timeline?"
A: 12-16 weeks for MVP
   ├── Week 1-3: Foundation (500 hours = 13 weeks 1 person)
   ├── Week 4-6: MCP Tools (500 hours)
   ├── Week 7-9: Mobile Frontend (500 hours)
   ├── Week 10-12: Advanced + Deploy (500 hours)
   │
   ├── If 2 people: 6-8 weeks
   ├── If 1 person: 12-16 weeks (part-time friendly)
   └── If 2 people full-time: 4-5 weeks

Q: "Total cost to build?"
A: ~$1000-3000
   ├── Hardware: $0 (reuse)
   ├── Development: Your time (already counted)
   ├── First year operations: $600-2400
   ├── Developer accounts: $100
   └── Total: $700-2500

Q: "Is this production-ready?"
A: MVP will be feature-complete in 12 weeks
   ├── Not battle-tested yet
   ├── Needs hardening for heavy load
   ├── Add 4-6 weeks for:
   │   ├── Load testing
   │   ├── Security audit
   │   ├── Recovery procedures
   │   ├── Monitoring setup
   │   └── Documentation
   │
   └── Timeline to prod: 16-22 weeks total
```

---

## Part 9: Execution Checklist (START HERE)

```
WEEK 0: PLANNING & SETUP (Before coding)
☐ Read this entire document (3 hours)
☐ Set up development environment
  ☐ Node.js 20+ installed
  ☐ npm/yarn set up
  ☐ Git configured
  ☐ IDE set up (VS Code recommended)
  ☐ Expo CLI installed
☐ Create GitHub repository
☐ Get Anthropic API key
☐ Plan your MCP tools (which ones do you need?)
☐ Estimate your budget
☐ Create 12-week timeline on calendar
  ↓
PHASE 1 (WEEKS 1-3): Foundation
☐ Week 1
  ☐ Express server with logging
  ☐ SQLite database schema
  ☐ React Native Expo app
  ☐ Claude API integration
☐ Week 2
  ☐ QR code generation/scanning
  ☐ Session persistence
  ☐ WebSocket setup
  ☐ Device pairing logic
☐ Week 3
  ☐ AgentOrchestrator class
  ☐ Tool registration system
  ☐ Agentic loop implementation
  ↓
PHASE 2 (WEEKS 4-6): MCP Tools
☐ Week 4
  ☐ Filesystem MCP
  ☐ Git MCP
  ☐ Unit tests
☐ Week 5
  ☐ HTTP MCP
  ☐ Code Analysis MCP
  ☐ Integration tests
☐ Week 6
  ☐ Apify integration
  ☐ Browser automation (Puppeteer)
  ☐ E2E tests
  ↓
PHASE 3 (WEEKS 7-9): Mobile UI
☐ Week 7
  ☐ UI screens
  ☐ Component styling
  ☐ Navigation
☐ Week 8
  ☐ WebSocket client
  ☐ State management
  ☐ Real-time updates
☐ Week 9
  ☐ Testing & polish
  ☐ iOS/Android specific fixes
  ↓
PHASE 4 (WEEKS 10-12): Advanced + Deployment
☐ Week 10
  ☐ Conversation summarization
  ☐ Memory management
  ☐ Scheduled tasks
☐ Week 11
  ☐ Monitoring setup (Pino, Sentry)
  ☐ Logging
  ☐ Cost tracking
☐ Week 12
  ☐ Docker containerization
  ☐ Deployment guide
  ☐ Documentation
  ☐ Security review
  ↓
POST MVP (OPTIONAL)
☐ Load testing
☐ Multi-user testing
☐ Performance optimization
☐ Production hardening
```

---

## Conclusion

**Your Dispatch Clone Build Path:**

1. **Stack**: Node.js + React Native + manual agentic loop
2. **MCP**: Apify (external) + 3-4 custom tools
3. **Timeline**: 12-16 weeks (solo), 6-8 weeks (2 people)
4. **Cost**: $0-3000 first year (mostly Claude API)
5. **Hardware**: Use what you have (no GPU needed)

**Next Steps:**
1. Fork/clone the code from Part 3 above
2. Follow the execution checklist
3. Build Phase 1 (foundation) in weeks 1-3
4. Iterate and gather feedback
5. Scale from there

**Key Insight:** Build the agentic loop yourself first, then layer frameworks on top later. You'll understand the system better and maintain full control.
