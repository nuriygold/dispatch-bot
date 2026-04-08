# Revised Build Scope: Paperclip.ing + Festival + Azure AI

## Part 0: The Context Shift

You're not building a simple remote-control agent. You're building a **zero-human company scale orchestration system** with:

```
PAPERCLIP.ING
├── Open-source orchestration platform
├── Designed for autonomous agent systems
├── Multi-agent coordination
├── Context persistence across tasks
├── Phase/sequence/task hierarchy
└── Perfect for: complex workflows, autonomous execution

FESTIVAL
├── Planning layer (not just execution)
├── Multi-project campaign management
├── Maintains "the thread" (context coherence)
├── Sequences and dependencies
├── Prevents context loss
└── Solves: fragmentation, planning failures

AZURE AI (not Anthropic)
├── Multiple model options per use case
├── Enterprise-grade scaling
├── Better cost for high-volume
├── Specialized models for specialized tasks
└── Regional deployment options

```

This is **fundamentally different** from a Dispatch clone. This is building an **autonomous orchestration engine**.

---

## Part 1: Understanding Dispatch's Known Issues

### 1.1 The Three Fatal Flaws of Dispatch

```
ISSUE #1: SLOWNESS
├── Root Causes:
│   ├── Streaming responses (real-time updates = latency)
│   ├── Mobile bottleneck (phone bandwidth, parsing JSON)
│   ├── Single-threaded task execution
│   ├── No task parallelization
│   └── Round-trip to relay server (100-500ms added per message)
│
├── Symptoms:
│   ├── User sees "loading..." for 10-30 seconds per task
│   ├── Multi-step tasks take minutes
│   ├── Browser automation timeouts
│   └── Users give up, go back to manual work
│
├── Our Solution:
│   ├── Festival planning layer (plan everything upfront)
│   ├── Task batching (group related subtasks)
│   ├── Async/parallel execution (not sequential)
│   ├── Background processing (don't wait for results)
│   ├── Webhook responses (don't rely on polling)
│   └── Expected improvement: 3-5x faster

ISSUE #2: MEMORY LOSS / CONTEXT FRAGMENTATION
├── Root Causes:
│   ├── Persistent thread ≠ persistent memory
│   ├── Each task starts fresh (limited context window)
│   ├── Long conversations truncate history
│   ├── No semantic search over past tasks
│   ├── Claude doesn't "remember" decisions
│   ├── No cross-task state machine
│   └── Multi-agent tasks have no shared context
│
├── Symptoms:
│   ├── "I already told you this an hour ago" moments
│   ├── Agent repeats failed approaches
│   ├── Task results ignored in next task
│   ├── Multi-step workflows diverge
│   └── User must re-brief agent constantly
│
├── Our Solution:
│   ├── Festival maintains persistent state tree
│   ├── Every task outcome stored (not just last message)
│   ├── Semantic embeddings of all decisions
│   ├── Task DAG (directed acyclic graph) tracks dependencies
│   ├── Context synthesis before each task (not truncation)
│   ├── Agent can query: "what did we learn about X?"
│   └── Expected improvement: 10x better consistency

ISSUE #3: PLANNING FAILURES / DEAD-END TASKS
├── Root Causes:
│   ├── Agent plans reactively (step-by-step only)
│   ├── No upfront goal decomposition
│   ├── Claude can't backtrack (commits to wrong paths)
│   ├── No alternative planning if first attempt fails
│   ├── Tool failures cascade
│   ├── No task prioritization
│   └── Agent doesn't know "this is impossible"
│
├── Symptoms:
│   ├── Task hangs (agent in retry loop)
│   ├── "Tries same thing 5 times, fails 5 times"
│   ├── Dead-end branches (agent goes wrong direction)
│   ├── No graceful degradation
│   ├── User can't interrupt or redirect
│   └── 30 minutes wasted on impossible task
│
├── Our Solution:
│   ├── Festival pre-plans entire workflow (upfront DAG)
│   ├── Multiple execution strategies (Plan A/B/C)
│   ├── Cost-benefit analysis before execution
│   ├── Hard constraints (deadlines, budgets)
│   ├── Failure thresholds (auto-abort after 3 failures)
│   ├── Alternative paths (branch on failure)
│   ├── Graceful degradation (partial success ok)
│   └── Expected improvement: 5-10x fewer dead ends
```

### 1.2 How Paperclip.ing + Festival Solve These

```
ARCHITECTURE THAT FIXES DISPATCH:

┌─────────────────────────────────────────────────────────┐
│                    FESTIVAL PLANNING LAYER              │
│                                                          │
│  Input: "Analyze all our GitHub repos for security"    │
│         ↓                                                │
│  Plan:  ┌─ Task 1: List repos (sequential)             │
│         ├─ Task 2-N: Analyze each (parallel)           │
│         ├─ Task N+1: Aggregate results                 │
│         ├─ Task N+2: Generate report                   │
│         │                                               │
│         └─ Constraints:                                 │
│            ├─ Max 30min runtime                        │
│            ├─ Parallel limit: 5 concurrent             │
│            ├─ Retry limit: 2 per task                  │
│            └─ Partial results acceptable               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                PAPERCLIP.ING ORCHESTRATOR               │
│                                                          │
│  Executes: Task DAG in parallel (not sequential)       │
│  Manages: State, context, dependencies                 │
│  Monitors: Progress, failures, timeouts                │
│  Distributes: Tasks to appropriate agents              │
│  Coordinates: Tool calls + MCP servers                 │
│                                                          │
│  Persistent Store: Task outcomes, decisions, learnings │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  AGENT EXECUTION LAYER                  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Agent A  │  │ Agent B  │  │ Agent C  │            │
│  │(code)    │  │(analysis)│  │(planning)│            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │                    │
│       └─────────────┴─────────────┘                    │
│              (shared context)                          │
│                                                          │
│  All agents see: decisions from other agents          │
│  All agents access: centralized memory                │
│  All agents query: "what happened in Task X?"         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 MCP TOOL EXECUTION                      │
│                                                          │
│  Parallelized tool calls (not sequential)             │
│  Timeouts enforced globally (not per-tool)            │
│  Results cached (avoid re-running)                    │
│  Cost-aware execution (cheaper models for cheap tasks)│
└─────────────────────────────────────────────────────────┘

KEY DIFFERENCE FROM DISPATCH:
├── Dispatch: Sequential (Task 1 → 2 → 3)
├── Ours: Parallel DAG execution (Tasks can run together)
│
├── Dispatch: Chatbot model (push-pull updates)
├── Ours: Campaign orchestrator (complete upfront planning)
│
├── Dispatch: Single agent (Claude only)
├── Ours: Multi-agent (different models for different tasks)
│
├── Dispatch: Memory = conversation history
├── Ours: Memory = persistent task graph + learnings
│
└── Result: 5-10x faster, 10x better context, 5x fewer dead-ends
```

---

## Part 2: Azure AI Models - The Right Tool for Each Job

### 2.1 Azure AI Model Portfolio (March 2026)

```
AZURE AI OFFERING STRUCTURE:

┌──────────────────────────────────────────────────────────┐
│           AZURE AI FOUNDRY                              │
│  (Central hub for all AI model access)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ GPT-4o (multimodal, reasoning) - Latest             │
│  ✓ GPT-4 Turbo (128K context, cheaper)                │
│  ✓ GPT-4 (original, proven)                            │
│  ✓ GPT-3.5 Turbo (fast, cheap)                         │
│  ✓ O1 (reasoning, complex logic) - NEW                 │
│  ✓ O1-mini (reasoning, faster) - NEW                   │
│  ✓ Llama 2 / 3 (open, competitive)                     │
│  ✓ Mistral (efficient, fast)                           │
│  ✓ Custom models (fine-tuning available)               │
│                                                          │
│  All accessible via:                                    │
│  ├── Azure OpenAI API (easiest)                        │
│  ├── Azure AI Services (lower-level)                   │
│  ├── Model Catalog (browse/deploy)                     │
│  └── Azure ML (training/fine-tuning)                   │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Model Selection by Task (RECOMMENDED)

```
┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 1: PLANNING & DECOMPOSITION                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-4o ⭐ PRIMARY                               │
│ ├── Why: Excellent at breaking down complex goals     │
│ ├── Use: Festival planning layer                       │
│ ├── Input: High-level request                          │
│ ├── Output: Task DAG + dependencies                    │
│ ├── Context: 128K tokens (huge history)               │
│ ├── Speed: ~2-4 seconds per plan                      │
│ ├── Cost: $15/M input, $75/M output tokens            │
│ │   ├─ 1 plan = ~1500 tokens = $0.03-0.05           │
│ │   ├─ 100 plans/day = $3-5/day = $100-150/mo        │
│ │   └─ Negligible cost                                │
│ └── Recommendation: Use for every multi-step task      │
│                                                          │
│ Backup: O1-mini (if GPT-4o unavailable)               │
│ ├── Better reasoning for tricky decompositions       │
│ ├── Slower (5-10s) but more thorough                 │
│ └── More expensive, use sparingly                     │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 2: EXECUTION & TOOL USE                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-4 Turbo ⭐ PRIMARY                          │
│ ├── Why: Perfect balance of speed/cost for tool use   │
│ ├── Use: Agent execution loop (agentic)               │
│ ├── Input: Task + context + tools                     │
│ ├── Output: Tool calls + reasoning                    │
│ ├── Context: 128K tokens (full conversation history) │
│ ├── Speed: 1-3 seconds per response                  │
│ ├── Cost: $10/M input, $30/M output tokens           │
│ │   ├─ 1 execution = ~500 tokens = $0.01            │
│ │   ├─ 1000 executions/day = $10/day = $300/mo      │
│ │   └─ Most expensive part of operation              │
│ └── Recommendation: This is your workhorse            │
│                                                          │
│ Optimization: Use GPT-3.5 Turbo for simple tasks    │
│ ├── 10x cheaper ($0.5/M input, $1.5/M output)       │
│ ├── Good for: straightforward tool calls            │
│ ├── Skip reasoning, just execute                    │
│ └── Strategy: Route by task complexity              │
│                                                          │
│ Alternative: Llama 3 (if cost critical)             │
│ ├── Open-source, cheap                              │
│ ├── Slower but acceptable                           │
│ └── Good for: non-critical background tasks         │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 3: CODE ANALYSIS & GENERATION                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-4o ⭐ PRIMARY                              │
│ ├── Why: Best for code understanding                  │
│ ├── Use: Code review, refactoring suggestions        │
│ ├── Input: Code files + requirements                 │
│ ├── Output: Analysis + improved code                 │
│ ├── Speed: 2-5 seconds                              │
│ ├── Cost: Same as planning                           │
│ └── Recommendation: Use for quality code work         │
│                                                          │
│ Alternative: Codestral (Mistral's code model)       │
│ ├── Specialized for code generation                 │
│ ├── Faster than GPT-4o for pure code                │
│ ├── Cheaper: $0.27/M input, $0.81/M output         │
│ └── Good for: bug fixes, refactoring                │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 4: DATA EXTRACTION & SUMMARIZATION            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-3.5 Turbo ⭐ PRIMARY (cost)                │
│ ├── Why: Cheap, fast, good enough for structured work│
│ ├── Use: Parse logs, extract info, summarize         │
│ ├── Input: Text/JSON data                            │
│ ├── Output: Structured data                          │
│ ├── Speed: <1 second                                 │
│ ├── Cost: 10x cheaper than GPT-4                     │
│ └── Recommendation: Use for high-volume tasks        │
│                                                          │
│ Alternative: Llama 3 (if even cheaper needed)       │
│ ├── Open-source, minimal cost                        │
│ ├── Good enough for straightforward extraction       │
│ └── Use for: logs, CSV parsing, basic summaries     │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 5: VISION / IMAGE ANALYSIS                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-4o (vision) ⭐ ONLY CHOICE                 │
│ ├── Why: Only Azure model with good vision support   │
│ ├── Use: Screenshot analysis, document processing    │
│ ├── Input: Images + prompts                          │
│ ├── Output: Analysis, extracted text                 │
│ ├── Speed: 2-4 seconds                              │
│ ├── Cost: Same as standard GPT-4o                    │
│ └── Recommendation: Use for browser automation step   │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TASK TYPE 6: CONTEXT SYNTHESIS & MEMORY QUERY          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Model: GPT-4 Turbo ⭐ PRIMARY                         │
│ ├── Why: 128K context = can see entire project       │
│ ├── Use: "What did we learn about X?"               │
│ ├── Input: Full task history + question              │
│ ├── Output: Synthesized answer                       │
│ ├── Speed: 2-3 seconds                              │
│ ├── Cost: Normal (not expensive)                     │
│ └── Recommendation: Run before each big task         │
│                                                          │
│ Trick: Use embeddings + semantic search first      │
│ ├── Query past decisions (fast + cheap)             │
│ ├── Pass only relevant context to GPT-4             │
│ └── 10x cheaper than full history rewrite           │
│                                                          │
└──────────────────────────────────────────────────────────┘

RECOMMENDED MODEL ALLOCATION MATRIX:
┌──────────────────────┬──────────────┬────────────┬──────┐
│ Task                 │ Model        │ Cost/task  │ %Use │
├──────────────────────┼──────────────┼────────────┼──────┤
│ Planning (Festival)  │ GPT-4o       │ $0.05      │ 5%   │
│ Execution (main)     │ GPT-4 Turbo  │ $0.01      │ 60%  │
│ Data extraction      │ GPT-3.5      │ $0.001     │ 20%  │
│ Code analysis        │ GPT-4o       │ $0.05      │ 10%  │
│ Vision               │ GPT-4o       │ $0.05      │ 5%   │
└──────────────────────┴──────────────┴────────────┴──────┘

MONTHLY COST ESTIMATE (1000 tasks/month):
├── 50 planning tasks (GPT-4o): 50 × $0.05 = $2.50
├── 600 execution tasks (GPT-4T): 600 × $0.01 = $6
├── 200 extraction (GPT-3.5): 200 × $0.001 = $0.20
├── 100 code tasks (GPT-4o): 100 × $0.05 = $5
├── 50 vision tasks (GPT-4o): 50 × $0.05 = $2.50
├── Azure infrastructure: $20-50
└── TOTAL: $35-65/month (versus $50-200 with single model)

This is CHEAPER than Dispatch while being vastly more capable.
```

### 2.3 Azure AI Cost Optimization Strategies

```
STRATEGY 1: DYNAMIC MODEL ROUTING
┌────────────────────────────────────────┐
│ Task Router Logic                      │
├────────────────────────────────────────┤
│                                        │
│ if (task.complexity === 'simple') {   │
│   use GPT-3.5 Turbo // 10x cheaper    │
│ } else if (task.complexity === 'code') {
│   use GPT-4o // best for code         │
│ } else if (task.hasVision) {          │
│   use GPT-4o // only option           │
│ } else {                              │
│   use GPT-4 Turbo // default          │
│ }                                      │
│                                        │
└────────────────────────────────────────┘

SAVINGS: 30-40% by avoiding over-spec'ing


STRATEGY 2: BATCH API (Asynchronous)
├── Use Case: Planning, non-urgent analysis
├── Discount: 50% off token costs
├── Latency: 5-30 minutes (okay for batch)
├── Implementation:
│   ├── Queue planning requests
│   ├── Submit as batch via Azure Batch API
│   ├── Process results asynchronously
│   └── Webhook callback to Paperclip.ing
└── Savings: 50% of planning costs


STRATEGY 3: CONTEXT COMPRESSION
├── Problem: Longer context = higher cost
├── Solution: Only pass relevant context
├── Implementation:
│   ├── Use embeddings to find relevant past tasks
│   ├── Summarize old conversations
│   ├── Pass only essential context
│   └── Cite source for traceability
└── Savings: 30-50% of execution costs


STRATEGY 4: CACHING (Preview Feature)
├── Feature: Prompt caching in Azure AI
├── How it works:
│   ├── System prompt cached (reused 100x)
│   ├── Only new inputs billed fully
│   ├── Cached content billed at 10% of normal
│   └── Perfect for MCP tool definitions
├── Setup: Cache tool schemas + system instructions
└── Savings: 20-30% once warmed up


STRATEGY 5: FINE-TUNING (If Needed)
├── Use Case: Very specialized tasks
├── Example: Your specific code style, domain
├── Cost: $3/M tokens training, then cheaper inference
├── Break-even: ~50,000 tasks with specialized fine-tune
└── Savings: Not needed for MVP, revisit at scale


STRATEGY 6: REGIONAL DEPLOYMENT
├── Azure regions have different latency/cost
├── Deploy close to users for speed
├── Some regions slightly cheaper
├── East US: standard pricing
├── UK South: often cheaper for EU users
├── Japan East: cheaper for Asia-Pacific
└── Optimization: Multi-region for geo-distributed agents


TOTAL COST OPTIMIZATION:
├── Base cost (single model): ~$100-200/month
├── With dynamic routing: ~$60-80/month (-40%)
├── + Batch API: ~$30-50/month (-50% of planning)
├── + Context compression: ~$25-40/month (-30%)
├── + Caching: ~$20-30/month (-20%)
└── Result: 4-5x cheaper with same capability
```

---

## Part 3: Paperclip.ing + Festival Architecture

### 3.1 System Design

```
COMPLETE ARCHITECTURE:

┌─────────────────────────────────────────────────────────────┐
│                  MOBILE CLIENT (React Native)               │
│                                                              │
│  ├── QR pairing with Paperclip.ing server                  │
│  ├── Real-time campaign progress display                    │
│  ├── Task submission interface                              │
│  ├── Persistent state (asyncstorage)                        │
│  └── WebSocket connection to orchestrator                   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS + WebSocket
                 │
┌─────────────────────────────────────────────────────────────┐
│              PAPERCLIP.ING ORCHESTRATION LAYER              │
│                                                              │
│  ├── Session management (device pairing)                    │
│  ├── Task queue + priority scheduling                       │
│  ├── Persistent context store (all task outcomes)           │
│  ├── State machine (tracks campaign progress)               │
│  ├── Agent lifecycle management                             │
│  ├── Tool/MCP server registry                               │
│  ├── Cost tracking + budget enforcement                     │
│  ├── Error recovery + retry logic                           │
│  └── Webhook coordination                                   │
│                                                              │
│  Built with:                                                │
│  ├── Node.js (orchestration core)                           │
│  ├── PostgreSQL (persistent state)                          │
│  ├── Redis (task queue + cache)                             │
│  ├── EventEmitter (internal messaging)                      │
│  └── Bull (job queue library)                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─────────────────────┬──────────────────┐
                 ▼                     ▼                  ▼
┌──────────────────────────┐  ┌──────────────────┐  ┌────────────┐
│    FESTIVAL PLANNING     │  │  AGENT EXECUTOR  │  │ MCP TOOL   │
│    LAYER                 │  │  LAYER           │  │ SERVERS    │
│                          │  │                  │  │            │
│ ├─ Goal decomposition    │  │ ├─ Task routing  │  │ ├─ File FS │
│ ├─ DAG generation        │  │ ├─ Context syn  │  │ ├─ Git     │
│ ├─ Constraint planning   │  │ ├─ Tool call    │  │ ├─ HTTP    │
│ ├─ Cost estimation       │  │ ├─ Result parse │  │ ├─ Code    │
│ ├─ Alt strategy gen      │  │ ├─ Error handle │  │ ├─ Browser │
│ └─ Backtrack logic       │  │ └─ State update │  │ ├─ Apify   │
│                          │  │                  │  │ └─ Azure   │
│ Models: GPT-4o (planning)│  │ Models: GPT-4T  │  │ Services  │
│                          │  │                  │  │            │
└──────────────┬───────────┘  └────────┬─────────┘  └─────┬──────┘
               │                       │                   │
               └───────────────────────┴───────────────────┘
                         (shared context bus)

KEY DIFFERENCES FROM DISPATCH:

1. PLANNING LAYER (Festival)
   ├── Dispatch: Reactive planning (step-by-step)
   ├── Ours: Upfront planning (full DAG)
   └── Impact: No dead-ends, clear exit points

2. EXECUTION MODEL
   ├── Dispatch: Sequential (task 1, then 2, then 3)
   ├── Ours: Parallel (independent tasks run together)
   └── Impact: 3-5x faster completion

3. CONTEXT MANAGEMENT
   ├── Dispatch: Conversation history (loses info)
   ├── Ours: Task graph + learnings (persistent)
   └── Impact: Agents make better decisions

4. FAILURE HANDLING
   ├── Dispatch: Retry same approach until timeout
   ├── Ours: Alternatives planned upfront
   └── Impact: 5x fewer wasted tasks

5. COST CONTROL
   ├── Dispatch: Single model for all tasks
   ├── Ours: Right model for each task
   └── Impact: 4-5x cheaper operations
```

### 3.2 Data Model & Context Store

```
PAPERCLIP.ING DATABASE SCHEMA (PostgreSQL):

TABLE: campaigns (high-level work units)
├── id (UUID)
├── user_id (who initiated)
├── title (what are we doing?)
├── status (planning, executing, completed, failed)
├── created_at, updated_at
├── cost_budget (max $ to spend)
├── time_budget (max minutes to run)
├── metadata (JSON: goals, constraints, etc)
└── indexes: user_id, status, created_at

TABLE: tasks (individual executable units)
├── id (UUID)
├── campaign_id (FK)
├── parent_task_id (if part of sequence)
├── title (what is this task?)
├── description (how to do it)
├── status (planned, queued, running, done, failed)
├── priority (1-10, higher = sooner)
├── estimated_cost (tokens/$$)
├── estimated_duration (seconds)
├── actual_cost, actual_duration
├── assigned_agent (which model will execute)
├── tool_requirements (["fs_read", "http_get", ...])
├── dependencies (other task IDs that must complete first)
├── created_at, updated_at
├── started_at, completed_at
└── indexes: campaign_id, status, priority, assigned_agent

TABLE: task_results (outcomes + context)
├── id (UUID)
├── task_id (FK)
├── success (boolean)
├── output (text result)
├── error_message (if failed)
├── tokens_used (input, output, total)
├── cost (USD)
├── duration (ms)
├── tool_calls (JSON: [{name, args, result}, ...])
├── decision_points (["chose option A over B", ...])
├── learnings (["X is better than Y", ...])
└── created_at

TABLE: context_embeddings (for semantic search)
├── id (UUID)
├── task_id (FK)
├── embedding_vector (1536 dimensions, from Azure)
├── text_snippet (what was this about?)
├── relevance_type ("decision", "learning", "failed_approach", ...)
└── created_at

TABLE: agent_states (persistent agent memory)
├── id (UUID)
├── campaign_id (FK)
├── agent_type (which model: "GPT-4T", "GPT-4o", ...)
├── last_context (most recent relevant tasks)
├── decisions_made (key decisions so far)
├── learnings (what have we learned?)
├── available_tools (which MCPs can this agent call?)
├── execution_count (how many tasks completed)
├── error_count (how many failed)
└── updated_at

TABLE: tool_outcomes_cache (avoid re-running tools)
├── id (UUID)
├── tool_name (e.g., "fs_read")
├── input_hash (SHA256 of input)
├── output (cached result)
├── cost (how much it cost)
├── cached_at
├── ttl (time to live, seconds)
└── hit_count (how many times used)

MEMORY ACCESS PATTERNS:

Query 1: "What did we learn about API authentication?"
├── SELECT * FROM context_embeddings
├── WHERE relevance_type = "learning"
├── ORDER BY similarity TO "API authentication"
├── LIMIT 5
└── Return: ["OAuth is finicky", "Bearer tokens better", ...]

Query 2: "Show me past attempts at this task"
├── SELECT * FROM task_results
├── WHERE task_title LIKE "%web scraping%"
├── AND campaign_id = :id
├── ORDER BY created_at DESC
└── Return: Previous approaches + outcomes

Query 3: "What's the current context for Agent X?"
├── SELECT last_context, decisions_made, learnings
├── FROM agent_states
├── WHERE agent_type = "GPT-4T"
├── AND campaign_id = :id
└── Return: Synthesized memory for agent

Result: Agents never start from scratch.
They query the context store before each task.
```

### 3.3 Execution Flow Example

```
USER REQUEST: "Audit all our GitHub repos for security issues"

┌─ STEP 1: FESTIVAL PLANNING (30 seconds)
├─ Input goes to GPT-4o with planning prompt:
│  "Break down this GitHub security audit into steps.
│   Consider: repos to scan, tools needed, parallelization,
│   failure modes, estimated time/cost."
│
├─ Output DAG:
│  ┌──────────────────────────────────────────┐
│  │  Task 1: List repos (sequential)         │
│  └────────────┬─────────────────────────────┘
│               │
│      ┌────────┴────────┬─────────┬─────────┐
│      ▼                 ▼         ▼         ▼
│  ┌────────┐      ┌────────┐  ┌─────────┐┌─────────┐
│  │Task 2a │      │Task 2b │  │Task 2c  ││Task 2d  │
│  │Scan    │      │Scan    │  │Scan     ││Scan     │
│  │repo1   │      │repo2   │  │repo3    ││repo4    │
│  └────┬───┘      └────┬───┘  └──┬──────┘└─┬───────┘
│       │               │         │        │
│       └───────────────┴─────────┴────────┘
│               │
│       ┌───────▼─────────┐
│       │Task 3: Aggregate│
│       └───────┬─────────┘
│               │
│       ┌───────▼──────────┐
│       │Task 4: Generate  │
│       │Report            │
│       └──────────────────┘
│
├─ Constraints detected:
│  ├─ Total budget: $1.00 (max)
│  ├─ Time budget: 10 minutes
│  ├─ Parallel limit: 4 concurrent scans
│  ├─ Retry limit: 2 per task
│  └─ Partial results acceptable (if some repos fail)
│
└─ Plan stored in Paperclip.ing

┌─ STEP 2: AGENT EXECUTION (Parallel)
├─ Task 1: List repos
│  ├─ Agent: GPT-4T
│  ├─ Tools: [GitHub API]
│  ├─ Context: "This is a security audit campaign"
│  ├─ Result: [repo1, repo2, repo3, repo4]
│  ├─ Cost: $0.003
│  └─ Stored in context_embeddings
│
├─ Tasks 2a-2d: Scan repos (PARALLEL)
│  ├─ Agent: GPT-4o (for code analysis)
│  ├─ Tools: [GitHub API, Code Analysis MCP]
│  ├─ Context: "Security audit, focus on: hardcoded secrets,
│  │           SQL injection, unsafe dependencies"
│  ├─ Each task runs in separate thread
│  ├─ Results cached in tool_outcomes_cache
│  │  (if same repo queried twice, use cache)
│  ├─ Cost: 4 × $0.05 = $0.20
│  │
│  └─ If one fails:
│     ├─ Retry once (2 attempts total)
│     ├─ If still fails, mark as "partial"
│     ├─ Continue with others (don't block)
│     └─ Report it in final output
│
├─ Task 3: Aggregate results
│  ├─ Agent: GPT-3.5T (cheap, just combining)
│  ├─ Context: Previous task results
│  ├─ Query: "What are the common patterns?"
│  ├─ Result: ["Pattern A: 5 repos affected", ...]
│  └─ Cost: $0.005
│
├─ Task 4: Generate report
│  ├─ Agent: GPT-4o (good formatting)
│  ├─ Context: All previous results
│  ├─ Tools: [File write MCP]
│  ├─ Result: Markdown report saved to disk
│  └─ Cost: $0.02
│
├─ Total Cost: $0.228 (well under $1.00 budget)
├─ Total Time: 45 seconds (beats 10 min budget)
└─ Execution Status: COMPLETED SUCCESSFULLY

┌─ STEP 3: CONTEXT STORAGE
├─ Store each task result:
│  ├─ task_results table
│  ├─ Create embeddings for later queries
│  └─ Update agent_states with learnings
│
├─ Learning extraction (by GPT-3.5, cheap):
│  ├─ "GitHub repos lack secret scanning"
│  ├─ "Dependency vulnerabilities in Node projects"
│  ├─ "SQL injection risk in User.find()"
│  └── Stored for future reference
│
├─ Queries this enables:
│  ├─ "Have we seen this error before?"
│  ├─ "What did we learn about dependency scanning?"
│  ├─ "Did we try this approach on another campaign?"
│  └─ Agent can answer without re-computing
│
└─ Next campaign benefits from these learnings

COMPARISON TO DISPATCH:

Dispatch:
├─ Total time: 5-10 minutes (sequential scanning)
├─ Cost: $0.50-2.00 (using single expensive model)
├─ Failure: If one repo scan times out, all fail
├─ Memory: Conversation history only
└─ Next time: Starts completely fresh

Ours (Paperclip + Festival):
├─ Total time: 45 seconds (parallel + planning)
├─ Cost: $0.23 (right model for each task)
├─ Failure: One repo fails, others continue
├─ Memory: Full task graph + learnings
└─ Next time: Uses cached repo metadata + past patterns
```

---

## Part 4: Special Measures to Prevent Dispatch Issues

### 4.1 Preventing Slowness

```
ISSUE: Dispatch is slow (5-30s per task)

ROOT CAUSES IN DISPATCH:
├── Streaming responses to mobile (JSON parsing overhead)
├── Round-trip to relay server (100-500ms extra)
├── Single-threaded execution
├── Sequential tool calls (wait for each result)
├── No planning upfront (reactive steps)
└── Mobile polling for updates (connection churn)

OUR SOLUTIONS:

SOLUTION 1: Parallel Execution (Not Sequential)
├── Dispatch: Task 1 → wait → Task 2 → wait → Task 3
│   Time: 3s + 3s + 3s = 9 seconds
│
├── Ours: Task 1 + Task 2 + Task 3 (together)
│   Time: 3 seconds (3x faster)
│
├── Implementation:
│   ├── Festival generates DAG (knows dependencies)
│   ├── Paperclip.ing executes tasks in parallel
│   ├── Redis queue manages task batches
│   ├── Promise.all() for parallel execution
│   └── Collect results when all complete
│
└── Code example:
    const tasks = [task1, task2, task3, task4];
    const results = await Promise.all(
      tasks.map(t => executeTask(t))
    );

SOLUTION 2: Upfront Planning (No Re-planning)
├── Dispatch: Agent decides step 1 → decides step 2 → ...
│   Each decision requires Claude API call
│   Time: 3s × N steps = 3N seconds
│
├── Ours: Plan all steps upfront, then execute
│   Single planning call (~2s), then N execution calls
│   Time: 2s + (3s × N) = much faster per execution
│
├── Festival planning output is reusable:
│   ├── First execution: 2s plan + 3N execute
│   ├── Retry/variations: reuse 2s plan, new executions
│   └── Different parameters: same plan, swap inputs
│
└── Result: Planning amortized over task family

SOLUTION 3: Webhook-Based Callbacks (Not Polling)
├── Dispatch: Mobile polls server "Is my task done?" every 1s
│   Connections churn, battery drain
│
├── Ours: Paperclip.ing pushes updates to mobile
│   ├── Task completes
│   ├── Server sends webhook: POST /callback
│   ├── Mobile receives update immediately
│   └── Connection stays idle (power efficient)
│
├── Implementation:
│   ├── Mobile registers callback URL during pairing
│   ├── Each task completion triggers webhook
│   ├── Mobile updates UI in real-time
│   ├── Exponential backoff if callback fails
│   └── Fallback: polling if webhook unreliable
│
└── Tool: Use ngrok for local testing, Vercel Functions for production

SOLUTION 4: Caching Tool Results
├── Dispatch: Every tool call runs fresh
│   ├── Query GitHub API = 1 second
│   ├── Same query again = 1 second
│   ├── Waste: 2 seconds
│
├── Ours: Tool outcomes cached
│   ├── First call: 1 second + store result
│   ├── Same call: 10ms from cache
│   ├── Savings: 0.99 seconds
│
├── Smart cache:
│   ├── File reads: cache for 5 minutes
│   ├── API calls: cache for 1 hour
│   ├── Database queries: cache by hash
│   ├── Input hash prevents collisions
│   └── TTL prevents stale data
│
├── Storage: tool_outcomes_cache table
│   ├── Index by tool_name + input_hash
│   ├── Lookup: O(1) hash table
│   └── Miss rate: <5% after warmup
│
└── Savings: 20-30% faster on repeat work

SOLUTION 5: Model Router (Use Fast Models When Possible)
├── Dispatch: Always uses one model (slow for simple tasks)
│
├── Ours: Route by task complexity
│   ├── Simple extraction: GPT-3.5 Turbo (1s)
│   ├── Complex reasoning: GPT-4o (3s)
│   ├── Savings: 2s per simple task
│
├── Heuristics:
│   ├── <500 token input → GPT-3.5
│   ├── Structured output → GPT-3.5
│   ├── Tool count <3 → GPT-3.5
│   ├── Otherwise → GPT-4T
│
└── Result: 20-30% faster average latency

SOLUTION 6: Streaming Only When Needed
├── Dispatch: Streams every response (adds latency)
│
├── Ours: Async execution
│   ├── Task queued immediately (instant feedback)
│   ├── Background execution (no waiting)
│   ├── Callback when done (user notified)
│   ├── Mobile doesn't block
│   └── User can use phone while working
│
└── Result: Perceived latency: 0s (queue is instant)

TOTAL SPEEDUP:
├── Parallel execution: 3-5x faster
├── Cached tools: 20-30% faster
├── Model routing: 20-30% faster
├── Webhooks vs polling: Perceived instant
├── Upfront planning: Amortized cost
│
└── NET RESULT: 5-10x faster than Dispatch
```

### 4.2 Preventing Memory Loss

```
ISSUE: Dispatch forgets context (agents repeat mistakes)

ROOT CAUSES IN DISPATCH:
├── Persistent thread ≠ persistent memory
├── No structured task outcome storage
├── Conversation history truncation
├── No semantic indexing of decisions
├── Agents can't query "what did we learn?"
├── Multi-agent tasks have no shared context
└── No state machine tracking progress

OUR SOLUTIONS:

SOLUTION 1: Task Graph (Not Just Conversation)
├── Dispatch: Message history only
│   ├── "We tried X, got error Y"
│   ├── Agent reads: "...error Y..."
│   ├── Agent doesn't understand context
│   └── May try X again
│
├── Ours: Structured task graph
│   ├── task_results table stores:
│   │   ├─ Input
│   │   ├─ Output
│   │   ├─ Tools used
│   │   ├─ Decisions made
│   │   ├─ Why it succeeded/failed
│   │   ├─ Cost + duration
│   │   └─ Learnings extracted
│   │
│   ├── Agent queries this before acting
│   ├── Sees: "We tried X on 3 repos, failed on 2"
│   ├── Knows: Use alternative on those 2 repos
│   └── Result: Smarter decisions
│
└── Data model: task_results + task_dependencies

SOLUTION 2: Semantic Embeddings for Memory Search
├── Problem: Text search "security" → false positives
│
├── Solution: Semantic search
│   ├── Every task outcome gets vector embedding
│   ├── Store in context_embeddings table
│   ├── Query: "Things about dependency vulnerabilities"
│   ├── Find: Similar past tasks (high relevance)
│   ├── Return: Top 3-5 most relevant
│   └── Cost: Free (embeddings pre-computed)
│
├── Implementation:
│   ├── On task completion:
│   │   ├─ Create summary of learnings
│   │   ├─ Generate embedding (Azure Embeddings API)
│   │   ├─ Store vector + text + metadata
│   │   └─ Cost: ~$0.0001 per embedding
│   │
│   ├── On new task:
│   │   ├─ Query embeddings: "similar past tasks?"
│   │   ├─ Vector similarity (cosine distance)
│   │   ├─ Retrieve top 5 (in <10ms)
│   │   ├─ Pass to agent as context
│   │   └─ Agent says "We did this before, here's what happened"
│   │
│   └── Result: No repeated mistakes
│
└── Tools: pgvector extension (PostgreSQL) + Azure Embeddings API

SOLUTION 3: Agent State Machine
├── Each agent has persistent state:
│   ├── agent_states table
│   ├── Tracked per campaign
│   ├── Fields:
│   │   ├─ last_context (most recent relevant info)
│   │   ├─ decisions_made (key choices)
│   │   ├─ learnings (what we learned)
│   │   ├─ available_tools
│   │   ├─ execution_count
│   │   ├─ error_count
│   │   └─ specialization (if multi-agent)
│   │
│   └── Before each task:
│       ├─ Load agent state
│       ├─ Synthesize context from last 3 tasks
│       ├─ Pass to agent prompt
│       ├─ Agent says "I remember X, here's my plan"
│       └─ Agent makes informed decisions
│
└── Result: Agents are stateful, not stateless

SOLUTION 4: Context Synthesis (Not Truncation)
├── Dispatch: Long history → truncate
│   ├── Keep last 10 messages only
│   ├── Lose information
│   ├── Agent lacks context
│   └── Makes worse decisions
│
├── Ours: Synthesis
│   ├── Query task_results: "Summarize campaign so far"
│   ├── Select: 5-10 most relevant tasks
│   ├── Generate: "Here's what happened" summary
│   ├── Cost: $0.005 (cheap)
│   ├── Pass to agent: summarized context
│   └── Agent: Full picture without token bloat
│
├── Example synthesis:
│   "In this campaign:
│    - We analyzed 4 repos (Repo1 succeeded, Repo2 failed)
│    - Root cause: Repo2 uses old Node version
│    - Solution: Upgrade Node, re-run scan
│    - Cost so far: $0.15 / Budget: $1.00
│    - Learnings: GitHub Enterprise requires special auth"
│
└── Result: Rich context, efficient tokens

SOLUTION 5: Learnings Extraction
├── After each task, run learning extraction (cheap):
│   ├── Model: GPT-3.5T ($0.001 cost)
│   ├── Prompt: "What did we learn from this task?"
│   ├── Extract:
│   │   ├─ "API X is rate-limited at 100req/min"
│   │   ├─ "Approach Y doesn't work for case Z"
│   │   ├─ "Tool A is better than Tool B for task C"
│   │   └─ "This repo pattern indicates X problem"
│   │
│   ├── Store: context_embeddings.relevance_type = "learning"
│   ├── Embed: Create vector for semantic search
│   └── Reuse: Future agents query learnings
│
├── Example query:
│   "Agent, have we learned anything about rate limits?"
│   → Returns: ["API X has 100req/min limit", ...]
│   → Agent plans accordingly
│
└── Result: Institutional knowledge grows

SOLUTION 6: Cross-Agent Context Sharing
├── Dispatch: Single agent (no sharing)
│
├── Ours: Multiple agents see each other's work
│   ├── Agent A completes task (stores result)
│   ├── Agent B sees agent A's output
│   ├── Agent B: "I'll use A's result as input"
│   ├── Agents coordinate without conversation
│   └── Result: Efficient handoffs
│
├── Implementation:
│   ├── When task X completes:
│   │   ├─ Write to task_results
│   │   ├─ Update campaign context
│   │   └─ Trigger dependent tasks
│   │
│   ├── When task Y starts:
│   │   ├─ Load context from completed task X
│   │   ├─ Agent Y: "Using results from task X..."
│   │   └─ Continue seamlessly
│   │
│   └── No explicit messaging needed
│
└── Result: Multi-agent choreography without overhead

PREVENTION CHECKLIST:

❌ Dispatch's approach:
├─ Conversation history only
├─ Truncated on length
├─ No structured outcomes
├─ No semantic search
├─ Single agent
└─ Repeated mistakes

✅ Our approach:
├─ Task graph (structured)
├─ Semantic embeddings
├─ Learnings extracted
├─ Context synthesis
├─ Multi-agent aware
├─ Query past decisions
├─ Agent state tracked
└─ Learnings reused
```

### 4.3 Preventing Planning Failures

```
ISSUE: Dispatch gets stuck in dead-ends (agent in retry loop)

ROOT CAUSES IN DISPATCH:
├── Step-by-step planning only (reactive)
├── No backtracking when wrong path chosen
├── No alternative strategies planned upfront
├── Timeouts are hard (agent doesn't know it's coming)
├── Can't distinguish "slow" from "broken"
├── No graceful partial completion
├── Tool failures cascade (no workarounds)
└── Agent commits to first approach forever

OUR SOLUTIONS:

SOLUTION 1: Upfront Multi-Path Planning (Festival)
├── Dispatch: Tries one approach until timeout
│   Time: 0-30 minutes wasted
│
├── Ours: Plan A, B, C upfront
│   ├── Festival planning generates multiple strategies:
│   │   ├─ Plan A (preferred, fastest)
│   │   ├─ Plan B (if Plan A fails)
│   │   ├─ Plan C (if Plans A+B fail)
│   │   └─ Plan D (minimal success)
│   │
│   ├── Each plan includes:
│   │   ├─ Task DAG
│   │   ├─ Estimated cost
│   │   ├─ Estimated time
│   │   ├─ Prerequisites
│   │   ├─ Failure modes
│   │   └─ Exit criteria
│   │
│   ├── Example for "scrape website":
│   │   ├─ Plan A: Use Apify Web Scraper (fastest)
│   │   ├─ Plan B: Custom Puppeteer script (flexible)
│   │   ├─ Plan C: Parse static HTML (simplest)
│   │   └─ Plan D: Manual data entry (fallback)
│   │
│   └── Cost: $0.05 to generate all plans
│
├── Execution:
│   ├── Start Plan A
│   ├── If fails (timeout or error):
│   │   ├─ Abort Plan A
│   │   ├─ Switch to Plan B
│   │   ├─ Reuse relevant sub-tasks
│   │   └─ Continue from there
│   │
│   ├── If Plan B fails:
│   │   ├─ Switch to Plan C
│   │   └─ Continue
│   │
│   └── If all plans fail:
│       ├─ Return partial results
│       ├─ Report which plans failed
│       └─ Mark for human review
│
└── Result: Always forward progress, never stuck

SOLUTION 2: Cost-Benefit Analysis Upfront
├── Before executing any plan:
│   ├── Estimate tokens needed
│   ├── Calculate USD cost
│   ├── Compare to budget
│   ├── Estimate wall-clock time
│   ├── Compare to deadline
│   └── Check: Is this worth doing?
│
├── Example decision:
│   "To scrape 10,000 products:
│    - Plan A cost: $5.00
│    - Plan B cost: $2.00
│    - Plan C cost: $0.50
│    - Accuracy tradeoff: A=95%, B=85%, C=70%
│    - Budget: $1.00
│    - Recommendation: Use Plan B (fits budget, good quality)"
│
├── If cost exceeds budget:
│   ├── Offer alternatives
│   ├── Suggest smaller scope
│   ├── Or ask: "Continue anyway?"
│   └── Prevent surprise overspend
│
└── Code:
    const planCosts = await estimatePlanCosts([planA, planB, planC]);
    const selectedPlan = choosePlan(planCosts, budget);

SOLUTION 3: Hard Constraints & Deadlines
├── Set limits upfront:
│   ├── Max cost: $1.00
│   ├── Max time: 10 minutes
│   ├── Max retries: 2 per task
│   ├── Min success rate: 70% (accept partial)
│   └── Max parallel: 5 concurrent tasks
│
├── Enforcement:
│   ├── Cost tracker: live update
│   ├── Time tracker: countdown visible
│   ├── If approaching limit → inform agent
│   ├── On limit hit → force completion
│   └── Return best partial result
│
├── Example:
│   "Budget: $1.00, Used: $0.80, Remaining: $0.20
│    Time: 10 min deadline, Elapsed: 8 min, Remaining: 2 min
│    Recommendation: Complete current tasks,
│                   skip low-priority tasks,
│                   return results now"
│
└── Prevent: runaway costs + timeouts

SOLUTION 4: Failure Detection & Branching
├── Detect failures early:
│   ├── Tool timeout: 30s default per tool
│   ├── Error pattern: same error 2x = likely permanent
│   ├── Slow task: no progress in 60s = check status
│   ├── Low success rate: 5 attempts, all failed = abort
│   └── Budget exceeded: hard stop
│
├── On failure detection:
│   ├── Step 1: Log failure (store in task_results)
│   ├── Step 2: Extract learnings ("This approach fails")
│   ├── Step 3: Branch to Plan B
│   ├── Step 4: Skip failed task's dependents
│   ├── Step 5: Execute Plan B tasks
│   └── Step 6: Report what happened
│
├── Example flow:
│   Plan A Task 1: Get list of repos
│   → Success, proceed
│
│   Plan A Task 2a: Scan repo1
│   → Timeout after 30s
│   → Failure detected
│   → Log: "repo1 scan timeout"
│   → Branch to Plan B
│
│   Plan B Task 2a_alt: Use simpler scanner on repo1
│   → Succeeds in 10s
│   → Continue with repo2, repo3
│
│   Result: No dead-end, task completes
│
└── Result: Resilient to failures

SOLUTION 5: Graceful Partial Completion
├── Dispatch: All-or-nothing (task fails if any part fails)
│
├── Ours: Partial success is ok
│   ├── Goal: Analyze 10 repos
│   ├── Result: Analyzed 7, 3 timed out
│   ├── Status: "PARTIAL_SUCCESS"
│   ├── Report: Full results on 7, explanation of 3
│   ├── User: Can decide to retry or accept result
│   └── Agent: Can work with what we have
│
├── Set minimum success threshold:
│   ├── "At least 70% of repos must be scanned"
│   ├── If we hit 7/10 = 70% → Accept
│   ├── If we hit 6/10 = 60% → Not acceptable, retry
│   └── Prevents: False successes/failures
│
└── Result: Pragmatic execution, no perfectionism

SOLUTION 6: User-Facing Transparency
├── Show planning to user:
│   ├── "I've planned 3 strategies"
│   ├── Show: Plan A (estimated 2 min, $0.50)
│   ├── Show: Plan B (estimated 5 min, $0.20)
│   ├── Show: Plan C (estimated 10 min, $0.05)
│   ├── Ask: "Which would you prefer?"
│   └── Respect: User choice
│
├── Show progress:
│   ├── "Running Plan A... 3/10 repos done (30%)"
│   ├── "Cost so far: $0.15 / Budget: $1.00"
│   ├── "Time so far: 2 min / Deadline: 10 min"
│   ├── "Plan A looking good, proceed?"
│   └── Or: "Plan A will exceed budget, switch to Plan B?"
│
├── Show failures:
│   ├── "Repo1 scan failed (timeout)"
│   ├── "Switching to Plan B (simpler scanner)"
│   ├── "Repo1 via Plan B: success"
│   └── "Continuing with remaining repos"
│
└── Result: User informed, never surprised

PREVENTION CHECKLIST:

❌ Dispatch's approach:
├─ One plan, react to failures
├─ No upfront cost analysis
├─ Timeouts = task fail
├─ All-or-nothing completion
├─ Retry same approach forever
├─ Hidden failures
└─ User discovers problems too late

✅ Our approach:
├─ Multi-path planning upfront
├─ Cost/benefit analysis
├─ Hard constraints enforced
├─ Graceful partial success
├─ Branch on failure
├─ Learnings stored
├─ Transparent progress
├─ User in control
└─ Prevention > recovery
```

---

## Part 5: Azure Model Selection Summary

### 5.1 Quick Reference Table

```
┌─────────────────────┬─────────────┬──────────────┬──────────┬────────┐
│ Task Category       │ Azure Model │ Cost/Call    │ Speed    │ Context│
├─────────────────────┼─────────────┼──────────────┼──────────┼────────┤
│ Planning (Festival) │ GPT-4o      │ $0.03-0.05   │ 2-4s     │ 128K   │
│ Main Execution      │ GPT-4 Turbo │ $0.01-0.02   │ 1-3s     │ 128K   │
│ Code Analysis       │ GPT-4o      │ $0.03-0.05   │ 2-5s     │ 128K   │
│ Data Extraction     │ GPT-3.5 Turbo│$0.001       │ <1s      │ 4K     │
│ Vision/Screenshots  │ GPT-4o      │ $0.03-0.05   │ 2-4s     │ 128K   │
│ Context Synthesis   │ GPT-4 Turbo │ $0.01-0.02   │ 2-3s     │ 128K   │
│ Learning Extract    │ GPT-3.5 Turbo│$0.001       │ <1s      │ 4K     │
│ Low-priority bg     │ Llama 3     │ $0.0001      │ 5s       │ 4K     │
└─────────────────────┴─────────────┴──────────────┴──────────┴────────┘

DEPLOYMENT RECOMMENDATION:

                            AZURE OPENAI SERVICE
                                   │
                    ┌──────────────┬┴────────────┬──────────────┐
                    │              │             │              │
                ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
                │ GPT-4o  │  │GPT-4T    │  │GPT-3.5T │  │ Llama 3  │
                │Planning │  │Execution │  │DataOps  │  │Optional  │
                │Vision   │  │Code Anal │  │Summaries│  │Background│
                │DAO Gen  │  │Synthesis │  │Learning │  │          │
                └─────────┘  └──────────┘  └─────────┘  └──────────┘
                     │             │            │            │
                     └─────────────┼────────────┴────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            ┌───────▼────────┐          ┌────────▼──────┐
            │  PAPERCLIP.ING │          │  FESTIVAL     │
            │  ORCHESTRATOR  │◄────────►│  PLANNER      │
            └───────┬────────┘          └───────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼──┐  ┌────▼───┐  ┌───▼──┐
    │  MCP │  │ CONTEXT│  │ TOOL │
    │TOOLS │  │ STORE  │  │CACHE │
    └──────┘  └────────┘  └──────┘

COST PROJECTION (1000 tasks/month):
├── Planning (50 tasks @ $0.05): $2.50
├── Execution (600 tasks @ $0.01): $6.00
├── Data ops (200 tasks @ $0.001): $0.20
├── Code (100 tasks @ $0.05): $5.00
├── Vision (50 tasks @ $0.05): $2.50
├── Azure infrastructure: $20-50
├── MCP/Tools (Apify, etc): $10-30
└── TOTAL: $45-96/month (vs $50-200 Dispatch)

ROI: Break-even in Month 1, cumulative savings $600+/year
```

---

## Part 6: Implementation Roadmap

```
REVISED TIMELINE (Paperclip.ing + Festival + Azure)

PHASE 0: ARCHITECTURE & SETUP (Weeks 1-2)
├─ Week 1:
│  ├─ Set up Paperclip.ing (orchestration core)
│  ├─ PostgreSQL + Redis setup
│  ├─ Azure AI Foundry authentication
│  ├─ Festival planning framework (scaffold)
│  └─ DevOps (Docker, CI/CD)
│
├─ Week 2:
│  ├─ Paperclip.ing integration
│  ├─ Festival planning engine (MVP)
│  ├─ Task DAG executor
│  ├─ Context store schema
│  └─ Mobile pairing flow
│
└─ Effort: 80 hours

PHASE 1: CORE ORCHESTRATION (Weeks 3-5)
├─ Week 3:
│  ├─ Agent lifecycle management
│  ├─ Task queuing + scheduling
│  ├─ Azure model router
│  └─ Error recovery
│
├─ Week 4:
│  ├─ Parallel execution (Promise.all)
│  ├─ Tool caching
│  ├─ Cost tracking
│  └─ Budget enforcement
│
├─ Week 5:
│  ├─ Multi-agent coordination
│  ├─ Context synthesis
│  ├─ Learning extraction
│  └─ Integration testing
│
└─ Effort: 120 hours

PHASE 2: FESTIVAL PLANNING (Weeks 6-8)
├─ Week 6:
│  ├─ Multi-path planning (A/B/C strategies)
│  ├─ Cost estimation
│  ├─ Time estimation
│  └─ DAG generation
│
├─ Week 7:
│  ├─ Failure branching logic
│  ├─ Graceful partial completion
│  ├─ Backtracking support
│  └─ Constraint enforcement
│
├─ Week 8:
│  ├─ User-facing plan UI
│  ├─ Transparency features
│  ├─ Mid-execution adjustments
│  └─ Plan replay/variation
│
└─ Effort: 100 hours

PHASE 3: MCP TOOLS & INTEGRATION (Weeks 9-11)
├─ Week 9:
│  ├─ Filesystem MCP
│  ├─ Git MCP
│  ├─ HTTP MCP
│  └─ Caching layer
│
├─ Week 10:
│  ├─ Code Analysis MCP
│  ├─ Apify integration (key!)
│  ├─ Browser automation
│  └─ Azure Services MCP
│
├─ Week 11:
│  ├─ Tool outcome caching
│  ├─ Timeout enforcement
│  ├─ Error handling per tool
│  └─ Integration testing
│
└─ Effort: 100 hours

PHASE 4: MOBILE FRONTEND (Weeks 12-13)
├─ Week 12:
│  ├─ QR pairing (same as before)
│  ├─ Campaign creation UI
│  ├─ Plan visualization
│  └─ Progress tracking
│
├─ Week 13:
│  ├─ Real-time updates (webhooks)
│  ├─ Cost/time display
│  ├─ Mid-execution control
│  └─ Result export
│
└─ Effort: 70 hours

PHASE 5: TESTING & OPTIMIZATION (Weeks 14-16)
├─ Week 14:
│  ├─ Load testing
│  ├─ Parallel execution stress test
│  ├─ Cost tracking validation
│  └─ Azure model routing test
│
├─ Week 15:
│  ├─ Failure scenario testing
│  ├─ Context memory tests
│  ├─ Cache effectiveness
│  └─ Security audit
│
├─ Week 16:
│  ├─ Documentation
│  ├─ Deployment guide
│  ├─ Operational runbook
│  └─ Release prep
│
└─ Effort: 80 hours

TOTAL MVP: ~550 hours (14 weeks solo, 7 weeks 2 people)

COMPARISON:
├── Dispatch clone: 12-16 weeks
├── Paperclip + Festival: 14 weeks
├── Delta: +2 weeks (for planning layer)
├── But: 5-10x better results
└── ROI: Breaks even in Month 2
```

---

## Part 7: Key Differences Summary

```
DISPATCH                          VS    PAPERCLIP + FESTIVAL + AZURE

Slowness:
├── Sequential execution          └── Parallel execution (3-5x faster)
├── Reactive planning             └── Upfront planning
├── Polling updates               └── Webhook callbacks
├── Single model                  └── Model router by task
└── No caching                    └── Smart caching

Memory Loss:
├── Conversation history only     └── Task graph + learnings
├── Truncation on long talks      └── Semantic synthesis
├── No semantic search            └── Full embedding search
├── Single agent                  └── Multi-agent with shared context
└── No learnings stored           └── Learning extraction

Planning Failures:
├── One plan, retry same          └── Multi-path planning (A/B/C)
├── No cost analysis              └── Upfront cost/benefit
├── All-or-nothing                └── Graceful partial success
├── No branching on failure       └── Automatic branch to Plan B
└── User discovers failures       └── Proactive failure prevention

Cost:
├── Single expensive model        └── Right model per task (4-5x cheaper)
├── No cost tracking             └── Real-time cost display
├── Budget overruns possible     └── Hard budget limits
└── Retry = repeat costs          └── Caching prevents repeats

Complexity:
├── User vs machine interface    └── Semi-autonomous orchestration
├── Real-time updates only       └── Full campaign lifecycle
├── No planning transparency     └── User sees and controls plans
└── Limited multi-task support   └── Native parallel workflows
```

---

## Part 8: Next Steps

1. **Evaluate Paperclip.ing** (3 days)
   - Review documentation
   - Run examples
   - Assess integration effort
   - Estimate learning curve

2. **Prototype Festival Planning Layer** (1 week)
   - Test GPT-4o plan generation
   - Build DAG executor
   - Validate parallel execution

3. **Set Up Azure AI Foundry** (2 days)
   - Create account
   - Test model routing
   - Validate cost estimates
   - Set up billing alerts

4. **Build Paperclip.ing + Festival Integration** (1-2 weeks)
   - Connect orchestrator to planner
   - Implement context store
   - Test multi-agent coordination

5. **Deploy MVP** (Follow timeline above)

**Cost to build: ~$2-5K (mostly your time, minimal cloud costs)**
**Cost to run: ~$45-100/month (Azure API usage)**
**Time to ROI: 2-3 months (depending on task volume)**

This is not a Dispatch clone.
This is a next-generation orchestration system.
```
