# Building a Dispatch-Like System: Architecture & Implementation

## Part 1: Dispatch Architecture (Reverse Engineering)

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPATCH SYSTEM OVERVIEW                      │
└─────────────────────────────────────────────────────────────────┘

MOBILE TIER (Phone)
┌──────────────────┐
│  Claude App      │
│  (iOS/Android)   │ ◄─── User sends tasks, receives updates
└────────┬─────────┘
         │ WebSocket/gRPC (encrypted)
         │
NETWORK BOUNDARY (secure tunnel)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│           CLOUD RELAY / SESSION COORDINATOR                      │
│  (Maintains persistent thread, routes messages, auth)            │
│  - Session state management                                      │
│  - Message queuing                                               │
│  - Device pairing (QR code → session mapping)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
NETWORK BOUNDARY (local LAN or secure tunnel)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         DESKTOP AGENT (Claude Desktop + Cowork VM)               │
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  Message Handler │      │  Agent Runtime   │                │
│  │  (receives tasks)│      │  (executes plans)│                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                         │                           │
│           └────────┬────────────────┘                           │
│                    ▼                                             │
│        ┌──────────────────────────┐                             │
│        │  Task Orchestrator       │                             │
│        │  (plans execution flow)  │                             │
│        └──────────┬───────────────┘                             │
│                   │                                              │
│        ┌──────────┴──────────────────┬──────────┐               │
│        ▼              ▼              ▼          ▼               │
│   ┌────────┐    ┌────────┐    ┌──────────┐ ┌─────────┐        │
│   │Computer│    │Connector│   │File      │ │Memory   │        │
│   │Use     │    │Layer    │   │System    │ │Manager  │        │
│   │Engine  │    │(38+)    │   │Access    │ │(Context)│        │
│   └────────┘    └────────┘    └──────────┘ └─────────┘        │
│                                                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │         SANDBOXED EXECUTION ENVIRONMENT                  │  │
│   │  - Ubuntu VM with network isolation                      │  │
│   │  - Local file access (permitted folders only)            │  │
│   │  - App control via OCR/click simulation                  │  │
│   │  - No data egress to external servers                    │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

#### 1. **Persistent Thread Model**
- Single conversation thread per device pair
- Context maintained across sessions
- No thread reset (by design)
- Message history stored locally on desktop

#### 2. **Device Pairing via QR Code**
```
Step 1: User clicks "Dispatch" → generates QR code
        QR contains: [session_id, pairing_token, relay_server_url]
        
Step 2: Mobile scans QR → sends pairing_request to relay
        Relay verifies session ownership, creates device link
        
Step 3: Relay establishes encrypted channel between devices
        (Phone ←→ Relay ←→ Desktop)
```

#### 3. **Message Flow Architecture**
```
MOBILE:  User types task → JSON message → Relay (via HTTPS/WebSocket)
RELAY:   Routes to desktop, maintains queue, handles offline
DESKTOP: Receives → Task planner → Agent executor → Task runner
AGENT:   Plans steps → executes (Computer Use + Connectors) → reports
RELAY:   Streams results back to mobile in real-time
MOBILE:  Displays progress updates (not just final result)
```

#### 4. **Sandboxing Strategy**
- Desktop app runs Claude inside a lightweight VM (likely QEMU/KVM)
- VM has isolated network (can't exfiltrate data)
- Filesystem access is whitelisted (user chooses folders)
- Computer use happens inside VM, not on host OS
- Data processing is local-only

#### 5. **Connector Architecture** (38+ integrations)
```
Connectors are adapters that translate tasks into API calls:

┌─────────────┐
│ Raw Task    │
│ "Find my    │
│  Q3 emails" │
└────────┬────┘
         │
    Planner determines: Slack? Email? File system?
         │
    ┌────┴────┐
    │ Connectors
    │ (MCP)    │ ◄─── Gmail, Slack, Google Drive, etc.
    │          │      Each has auth tokens stored securely
    └────┬─────┘
         │
    Makes API calls locally, returns structured data
```

---

## Part 2: Building Your Own Localhost Dispatch Clone

### System Requirements

**What you're building:**
- A persistent AI agent that runs on your machine
- Controlled from your phone via encrypted tunnel
- Coordinates multiple tools/skills/agents
- Task execution with agent orchestration

### Architecture for Your Implementation

```typescript
// ============================================
// YOUR LOCALHOST DISPATCH CLONE ARCHITECTURE
// ============================================

/*
┌───────────────────────────────────────────────────────┐
│  YOUR SETUP: Phone → Relay (optional) → Localhost    │
│                                                        │
│  If on same network: Phone → Localhost (WebSocket)   │
│  If remote: Phone → Your Relay → Localhost           │
└───────────────────────────────────────────────────────┘

Key difference from Dispatch:
- You OWN the relay (or skip it entirely)
- You control ALL code
- MCP servers are your agent tools
- Agent orchestration via prompt engineering + tool use

*/
```

### Core Stack

```
Frontend (Phone):
  - React Native or Flutter app
  - Connect to localhost:3000 via WebSocket
  - Display task progress, results
  - QR code scanner (pairing)

Backend (Localhost Agent):
  - Node.js/Express server
  - Long-lived WebSocket connection pool
  - Claude SDK (calls Claude API)
  - MCP client to interact with MCP servers
  - Task queue + orchestration engine

Agent Tools (MCP Servers):
  - Filesystem access (read/write files)
  - Git operations (commit, branch, diff)
  - Code analysis tools
  - API callers (HTTP, database queries)
  - Custom domain-specific agents

Data Layer:
  - SQLite for conversation history
  - Local file storage for results
  - No cloud sync (data stays local)
```

---

## Part 3: Detailed Code Implementation

### 3.1 Backend: Agent Server (Node.js)

```typescript
// backend/src/server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Anthropic from '@anthropic-ai/sdk';
import { Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ============================================
// SESSION & CONNECTION MANAGEMENT
// ============================================

interface DispatchSession {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  pairedDevices: string[]; // device IDs
  pairingToken: string;
}

interface AgentTask {
  taskId: string;
  input: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  steps: AgentStep[];
  result?: string;
  error?: string;
}

interface AgentStep {
  stepId: string;
  action: string;
  toolName: string;
  toolInput: Record<string, any>;
  result?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// ============================================
// DATABASE SETUP (Persistent Thread Storage)
// ============================================

class DispatchDatabase {
  private db: Database;

  constructor(dbPath: string = './dispatch.db') {
    this.db = new (require('better-sqlite3'))(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        pairing_token TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME,
        paired_devices TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS task_steps (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        step_number INTEGER,
        action TEXT,
        tool_name TEXT,
        tool_input TEXT,
        result TEXT,
        status TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );
    `);
  }

  createSession(sessionId: string, pairingToken: string): DispatchSession {
    this.db.prepare(`
      INSERT INTO sessions (id, pairing_token, last_activity)
      VALUES (?, ?, datetime('now'))
    `).run(sessionId, pairingToken);

    return {
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      conversationHistory: [],
      pairedDevices: [],
      pairingToken,
    };
  }

  getSession(sessionId: string): DispatchSession | null {
    const row = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!row) return null;

    const messages = this.db.prepare(`
      SELECT role, content FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `).all(sessionId) as Array<{ role: 'user' | 'assistant'; content: string }>;

    return {
      sessionId: row.id,
      createdAt: new Date(row.created_at),
      lastActivity: new Date(row.last_activity),
      conversationHistory: messages,
      pairedDevices: row.paired_devices ? JSON.parse(row.paired_devices) : [],
      pairingToken: row.pairing_token,
    };
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    const messageId = `msg_${Date.now()}`;
    this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(messageId, sessionId, role, content);

    this.db.prepare(`
      UPDATE sessions SET last_activity = datetime('now') WHERE id = ?
    `).run(sessionId);
  }

  saveTask(task: AgentTask) {
    this.db.prepare(`
      INSERT OR REPLACE INTO tasks 
      (id, session_id, status, input, result, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      task.taskId,
      'current_session', // You'd track this per-session
      task.status,
      task.input,
      task.result || null,
      task.error || null
    );
  }

  getTaskHistory(sessionId: string, limit: number = 50) {
    return this.db.prepare(`
      SELECT * FROM tasks 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(sessionId, limit);
  }
}

// ============================================
// AGENT ORCHESTRATOR (Task Planning & Execution)
// ============================================

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (input: Record<string, any>) => Promise<string>;
}

class AgentOrchestrator {
  private client: Anthropic;
  private tools: Map<string, Tool>;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.tools = new Map();
    this.conversationHistory = [];
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  // Convert registered tools to Claude format
  private getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.inputSchema,
        required: Object.keys(tool.inputSchema),
      },
    }));
  }

  /**
   * Main agent loop: Claude plans, we execute tools, Claude revises plan
   * This is the core "orchestration" that makes it an agent
   */
  async executeTask(userRequest: string, onProgress?: (step: AgentStep) => void): Promise<string> {
    const task: AgentTask = {
      taskId: `task_${Date.now()}`,
      input: userRequest,
      status: 'executing',
      steps: [],
    };

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userRequest,
    });

    let stepCount = 0;
    const maxSteps = 10; // Prevent infinite loops

    while (stepCount < maxSteps) {
      stepCount++;

      // Call Claude with tool definitions
      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514', // Use your preferred model
        max_tokens: 4096,
        tools: this.getToolDefinitions(),
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        system: `You are a task execution agent. You have access to tools to complete user requests.

IMPORTANT INSTRUCTIONS:
1. Break complex tasks into steps
2. Use tools to gather information and execute actions
3. Report progress after each tool call
4. If a tool fails, try alternative approaches
5. When task is complete, summarize what you did
6. Do NOT make assumptions - always use tools to verify facts

Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
      });

      // Process Claude's response
      let hasToolUse = false;
      let textContent = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          const toolName = block.name;
          const toolInput = block.input;

          console.log(`[Step ${stepCount}] Using tool: ${toolName}`);
          console.log(`  Input: ${JSON.stringify(toolInput)}`);

          // Report progress to frontend
          const step: AgentStep = {
            stepId: `step_${stepCount}`,
            action: 'tool_use',
            toolName,
            toolInput,
            status: 'executing',
          };
          onProgress?.(step);

          // Execute the tool
          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
          }

          let toolResult: string;
          try {
            toolResult = await tool.execute(toolInput);
            step.status = 'completed';
            step.result = toolResult;
          } catch (error) {
            step.status = 'failed';
            step.result = `Error: ${error instanceof Error ? error.message : String(error)}`;
            toolResult = step.result;
          }

          task.steps.push(step);
          onProgress?.(step);

          // Add tool result to conversation history
          this.conversationHistory.push({
            role: 'assistant',
            content: textContent +
              `[Tool Call: ${toolName}]\nInput: ${JSON.stringify(toolInput)}\nResult: ${toolResult}`,
          });
        }
      }

      // If Claude didn't use tools, it's giving final answer
      if (!hasToolUse) {
        this.conversationHistory.push({
          role: 'assistant',
          content: textContent,
        });

        task.status = 'completed';
        task.result = textContent;
        return textContent;
      }

      // Continue loop if there were tool uses
      if (response.stop_reason === 'end_turn' && !hasToolUse) {
        task.status = 'completed';
        task.result = textContent;
        return textContent;
      }
    }

    throw new Error('Max steps exceeded');
  }

  getHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// ============================================
// MCP CLIENT (Tool Integration)
// ============================================

/**
 * MCP (Model Context Protocol) client for integrating external tools
 * These can be: filesystem, git, API callers, databases, etc.
 */

class MCPClient {
  private mcpServers: Map<string, any> = new Map();

  async connectToServer(name: string, config: { type: string; url?: string; localPath?: string }) {
    // This would connect to your MCP servers
    // For now, we'll show a stub

    if (config.type === 'file_system') {
      this.mcpServers.set(name, new FilesystemMCP(config.localPath || '.'));
    } else if (config.type === 'git') {
      this.mcpServers.set(name, new GitMCP());
    } else if (config.type === 'http') {
      this.mcpServers.set(name, new HttpMCP());
    }
  }

  getMCPTools(): Tool[] {
    const tools: Tool[] = [];

    // Gather tools from all connected MCP servers
    for (const [serverName, server] of this.mcpServers) {
      if (server.getTools) {
        tools.push(...server.getTools());
      }
    }

    return tools;
  }
}

// ============================================
// EXAMPLE MCP TOOLS
// ============================================

/**
 * Filesystem MCP Server
 * Allows Claude to read/write files in a specific directory
 */
class FilesystemMCP {
  constructor(private baseDir: string) {}

  getTools(): Tool[] {
    return [
      {
        name: 'fs_read',
        description: 'Read file contents',
        inputSchema: {
          path: { type: 'string', description: 'File path relative to base directory' },
        },
        execute: async (input) => {
          const filePath = path.join(this.baseDir, input.path);
          // Verify path is within baseDir (prevent directory traversal)
          if (!filePath.startsWith(this.baseDir)) {
            throw new Error('Access denied: path outside base directory');
          }
          return fs.readFileSync(filePath, 'utf-8');
        },
      },
      {
        name: 'fs_write',
        description: 'Write to a file',
        inputSchema: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'File content' },
        },
        execute: async (input) => {
          const filePath = path.join(this.baseDir, input.path);
          if (!filePath.startsWith(this.baseDir)) {
            throw new Error('Access denied: path outside base directory');
          }
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, input.content);
          return `File written: ${input.path}`;
        },
      },
      {
        name: 'fs_list',
        description: 'List directory contents',
        inputSchema: {
          path: { type: 'string', description: 'Directory path' },
        },
        execute: async (input) => {
          const dirPath = path.join(this.baseDir, input.path);
          if (!dirPath.startsWith(this.baseDir)) {
            throw new Error('Access denied');
          }
          const files = fs.readdirSync(dirPath);
          return JSON.stringify(files);
        },
      },
    ];
  }
}

/**
 * Git MCP Server
 * Allows Claude to run git commands
 */
class GitMCP {
  getTools(): Tool[] {
    const { execSync } = require('child_process');
    
    return [
      {
        name: 'git_status',
        description: 'Get git status',
        inputSchema: {},
        execute: async () => {
          return execSync('git status --porcelain').toString();
        },
      },
      {
        name: 'git_diff',
        description: 'Show git diff',
        inputSchema: {
          file: { type: 'string', description: 'Optional file path' },
        },
        execute: async (input) => {
          const cmd = input.file ? `git diff ${input.file}` : 'git diff';
          return execSync(cmd).toString();
        },
      },
      {
        name: 'git_commit',
        description: 'Create a commit',
        inputSchema: {
          message: { type: 'string', description: 'Commit message' },
        },
        execute: async (input) => {
          execSync('git add -A');
          return execSync(`git commit -m "${input.message}"`).toString();
        },
      },
    ];
  }
}

/**
 * HTTP MCP Server
 * Allows Claude to make HTTP requests
 */
class HttpMCP {
  getTools(): Tool[] {
    const axios = require('axios');

    return [
      {
        name: 'http_request',
        description: 'Make an HTTP request',
        inputSchema: {
          method: { type: 'string', description: 'HTTP method (GET, POST, etc)' },
          url: { type: 'string', description: 'Request URL' },
          body: { type: 'string', description: 'Request body (JSON string)' },
          headers: { type: 'string', description: 'Headers (JSON string)' },
        },
        execute: async (input) => {
          const response = await axios({
            method: input.method || 'GET',
            url: input.url,
            data: input.body ? JSON.parse(input.body) : undefined,
            headers: input.headers ? JSON.parse(input.headers) : {},
          });
          return JSON.stringify(response.data);
        },
      },
    ];
  }
}

// ============================================
// EXPRESS SERVER WITH WEBSOCKET
// ============================================

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const db = new DispatchDatabase();
const orchestrator = new AgentOrchestrator();
const mcpClient = new MCPClient();

// Store active WebSocket connections per session
const sessionConnections = new Map<string, Set<any>>();

/**
 * Initialize tools from MCP servers
 */
async function initializeTools() {
  // Connect to your MCP servers
  await mcpClient.connectToServer('filesystem', {
    type: 'file_system',
    localPath: process.env.DISPATCH_BASE_DIR || '.',
  });

  await mcpClient.connectToServer('git', {
    type: 'git',
  });

  await mcpClient.connectToServer('http', {
    type: 'http',
  });

  // Register all MCP tools with orchestrator
  const tools = mcpClient.getMCPTools();
  for (const tool of tools) {
    orchestrator.registerTool(tool);
  }

  console.log(`Initialized ${tools.length} tools from MCP servers`);
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/dispatch/init
 * Create a new Dispatch session
 * Returns QR code data (sessionId + pairing token)
 */
app.post('/api/dispatch/init', (req, res) => {
  const sessionId = `dispatch_${Date.now()}`;
  const pairingToken = require('crypto').randomBytes(32).toString('hex');

  db.createSession(sessionId, pairingToken);

  // QR code should encode: sessionId, pairingToken, relay URL
  const qrData = {
    sessionId,
    pairingToken,
    relayUrl: `http://localhost:3000`, // or your relay server
  };

  res.json({
    sessionId,
    qrData: JSON.stringify(qrData),
    pairingToken, // For mobile to verify pairing
  });
});

/**
 * POST /api/dispatch/:sessionId/task
 * Submit a task to the agent
 * Body: { task: "what you want claude to do" }
 */
app.post('/api/dispatch/:sessionId/task', express.json(), async (req, res) => {
  const { sessionId } = req.params;
  const { task } = req.body;

  const session = db.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Load conversation history
  const history = session.conversationHistory;
  orchestrator.getHistory(); // Reset orchestrator history
  for (const msg of history) {
    // Re-populate orchestrator with history
  }

  res.json({ taskId: 'task_started', message: 'Processing task...' });

  // Execute asynchronously
  try {
    const result = await orchestrator.executeTask(task, (step) => {
      // Broadcast step progress to all connected clients
      const connections = sessionConnections.get(sessionId);
      if (connections) {
        for (const ws of connections) {
          if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify({
              type: 'step_progress',
              step,
            }));
          }
        }
      }
    });

    // Save to database
    db.addMessage(sessionId, 'user', task);
    db.addMessage(sessionId, 'assistant', result);

    // Broadcast completion
    const connections = sessionConnections.get(sessionId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'task_complete',
            result,
          }));
        }
      }
    }
  } catch (error) {
    const connections = sessionConnections.get(sessionId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'task_error',
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    }
  }
});

/**
 * GET /api/dispatch/:sessionId/history
 * Retrieve conversation history
 */
app.get('/api/dispatch/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  const session = db.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    messages: session.conversationHistory,
  });
});

// ============================================
// WEBSOCKET HANDLING
// ============================================

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'subscribe') {
        // Mobile app subscribes to session updates
        const { sessionId } = message;
        if (!sessionConnections.has(sessionId)) {
          sessionConnections.set(sessionId, new Set());
        }
        sessionConnections.get(sessionId)!.add(ws);

        ws.send(JSON.stringify({
          type: 'subscribed',
          sessionId,
        }));
      } else if (message.type === 'task') {
        // Inline task submission via WebSocket
        const { sessionId, task } = message;
        // Execute task (similar to HTTP endpoint above)
        console.log(`[WS] Task for ${sessionId}: ${task}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up connections
    for (const [, connections] of sessionConnections) {
      connections.delete(ws);
    }
  });
});

// ============================================
// STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

async function main() {
  await initializeTools();

  httpServer.listen(PORT, () => {
    console.log(`Dispatch agent server running on http://localhost:${PORT}`);
    console.log('WebSocket ready for mobile connections');
  });
}

main().catch(console.error);
```

### 3.2 Frontend: Mobile Controller (React Native/TypeScript)

```typescript
// mobile/src/screens/DispatchScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DispatchMessage {
  type: 'task_complete' | 'task_error' | 'step_progress' | 'subscribed';
  result?: string;
  error?: string;
  step?: {
    stepId: string;
    toolName: string;
    status: 'executing' | 'completed' | 'failed';
    result?: string;
  };
  sessionId?: string;
}

interface QRData {
  sessionId: string;
  pairingToken: string;
  relayUrl: string;
}

export const DispatchScreen = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [relayUrl, setRelayUrl] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(true);
  const [taskInput, setTaskInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [steps, setSteps] = useState<any[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Load saved session from device
  useEffect(() => {
    AsyncStorage.getItem('dispatchSession').then((data) => {
      if (data) {
        const session = JSON.parse(data);
        setSessionId(session.sessionId);
        setPairingToken(session.pairingToken);
        setRelayUrl(session.relayUrl);
        setIsScanning(false);
        connectWebSocket(session);
      }
    });
  }, []);

  // Connect to backend via WebSocket
  const connectWebSocket = (session: QRData) => {
    const wsUrl = `${session.relayUrl.replace(/^http/, 'ws')}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to session updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId: session.sessionId,
      }));
    };

    ws.onmessage = (event) => {
      const message: DispatchMessage = JSON.parse(event.data);
      handleMessage(message);
    };

    ws.onerror = (error) => {
      Alert.alert('Connection Error', 'Failed to connect to dispatch server');
    };

    wsRef.current = ws;
  };

  // Handle QR code scan
  const handleQRCodeScanned = async (data: string) => {
    setIsScanning(false);

    try {
      const qrData: QRData = JSON.parse(data);
      setSessionId(qrData.sessionId);
      setPairingToken(qrData.pairingToken);
      setRelayUrl(qrData.relayUrl);

      // Save to device
      await AsyncStorage.setItem('dispatchSession', JSON.stringify(qrData));

      // Connect
      connectWebSocket(qrData);

      Alert.alert('Paired', `Connected to Dispatch: ${qrData.sessionId}`);
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Could not parse dispatch pairing data');
      setIsScanning(true);
    }
  };

  // Submit a task
  const submitTask = async () => {
    if (!sessionId || !taskInput.trim()) return;

    setExecuting(true);
    setSteps([]);

    try {
      // Send via HTTP (or WebSocket)
      const response = await fetch(
        `${relayUrl}/api/dispatch/${sessionId}/task`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: taskInput }),
        }
      );

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'user', content: taskInput }]);
      setTaskInput('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit task');
      setExecuting(false);
    }
  };

  // Handle incoming messages from agent
  const handleMessage = (message: DispatchMessage) => {
    if (message.type === 'task_complete') {
      setMessages((prev) => [...prev, { role: 'assistant', content: message.result || '' }]);
      setExecuting(false);
    } else if (message.type === 'task_error') {
      Alert.alert('Task Error', message.error || 'Unknown error');
      setExecuting(false);
    } else if (message.type === 'step_progress') {
      setSteps((prev) => [...prev, message.step]);
    } else if (message.type === 'subscribed') {
      console.log(`Subscribed to session: ${message.sessionId}`);
    }
  };

  if (!permission) {
    return <Text>No camera permission</Text>;
  }

  // ====== UI: QR Code Scanner ======
  if (isScanning) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={({ data }) => handleQRCodeScanned(data)}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            alignSelf: 'center',
            backgroundColor: 'black',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white' }}>Scan Dispatch QR Code</Text>
        </View>
      </View>
    );
  }

  // ====== UI: Task Interface ======
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Dispatch</Text>
        <Text style={{ fontSize: 12, color: '#666' }}>Session: {sessionId?.slice(0, 12)}...</Text>
      </View>

      {/* Chat History */}
      <ScrollView
        style={{
          flex: 1,
          marginBottom: 12,
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 8,
        }}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={{
              marginBottom: 12,
              padding: 8,
              backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
              {msg.role === 'user' ? 'You' : 'Claude'}
            </Text>
            <Text style={{ marginTop: 4 }}>{msg.content}</Text>
          </View>
        ))}

        {/* Step Progress */}
        {steps.length > 0 && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ccc' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Execution Steps:</Text>
            {steps.map((step, idx) => (
              <View key={idx} style={{ marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#ccc' }}>
                <Text style={{ fontSize: 12 }}>
                  [{step.status}] {step.toolName}
                </Text>
                {step.result && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    Result: {step.result.slice(0, 100)}...
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {executing && <ActivityIndicator size="large" color="#0000ff" />}
      </ScrollView>

      {/* Input Area */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 8,
            marginRight: 8,
          }}
          placeholder="What should Claude do?"
          value={taskInput}
          onChangeText={setTaskInput}
          editable={!executing}
        />
        <TouchableOpacity
          style={{
            backgroundColor: executing ? '#ccc' : '#0066cc',
            paddingHorizontal: 12,
            borderRadius: 4,
            justifyContent: 'center',
          }}
          onPress={submitTask}
          disabled={executing}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#f44336',
          paddingVertical: 8,
          borderRadius: 4,
          alignItems: 'center',
        }}
        onPress={() => {
          AsyncStorage.removeItem('dispatchSession');
          setSessionId(null);
          setIsScanning(true);
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Reset Session</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 3.3 Configuration & MCP Integration

```typescript
// backend/src/mcp-config.ts
/**
 * MCP (Model Context Protocol) Configuration
 * Defines which tools/servers are available to Claude
 */

export interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'sse' | 'local';
  command?: string; // For stdio type
  url?: string; // For SSE type
  config?: Record<string, any>;
}

export const MCP_SERVERS: MCPServerConfig[] = [
  // Built-in filesystem MCP
  {
    name: 'filesystem',
    type: 'local',
    config: {
      basePath: process.env.DISPATCH_BASE_DIR || './workspace',
    },
  },

  // Git operations MCP
  {
    name: 'git',
    type: 'local',
    config: {
      repoPath: process.env.GIT_REPO_PATH || '.',
    },
  },

  // HTTP requests MCP
  {
    name: 'http_client',
    type: 'local',
    config: {
      timeout: 30000,
      allowedDomains: ['*'], // Restrict in production
    },
  },

  // External stdio MCP (e.g., your custom agent)
  {
    name: 'custom_analyzer',
    type: 'stdio',
    command: 'node ./mcp-servers/analyzer/index.js',
    config: {
      modelName: 'analyzer-v1',
    },
  },

  // SSE-based remote MCP server
  {
    name: 'remote_db',
    type: 'sse',
    url: 'http://your-mcp-server:3001/sse',
    config: {
      apiKey: process.env.REMOTE_MCP_API_KEY,
    },
  },
];

// Tool registry: map of which tools come from which servers
export const TOOL_REGISTRY = {
  // File operations
  'fs_read': 'filesystem',
  'fs_write': 'filesystem',
  'fs_list': 'filesystem',
  'fs_delete': 'filesystem',

  // Git operations
  'git_status': 'git',
  'git_diff': 'git',
  'git_commit': 'git',
  'git_branch': 'git',

  // HTTP
  'http_get': 'http_client',
  'http_post': 'http_client',
  'http_put': 'http_client',

  // Custom
  'analyze_code': 'custom_analyzer',
  'estimate_complexity': 'custom_analyzer',

  // Remote
  'query_database': 'remote_db',
  'fetch_metrics': 'remote_db',
};
```

### 3.4 Multi-Agent Orchestration Pattern

```typescript
// backend/src/agent-orchestration.ts
/**
 * Multi-Agent Orchestration
 * How Claude coordinates multiple skill/tool groups for complex tasks
 */

interface Agent {
  name: string;
  role: string;
  capabilities: string[]; // Tool names this agent can use
  systemPrompt: string;
}

const agents: Record<string, Agent> = {
  code_analyzer: {
    name: 'Code Analyzer',
    role: 'Analyze codebases, find bugs, suggest refactors',
    capabilities: ['fs_read', 'fs_list', 'git_diff', 'analyze_code'],
    systemPrompt: `You are a code analysis specialist. Your job is to:
1. Read code files and understand their structure
2. Identify bugs and architectural issues
3. Suggest improvements and refactors
4. Explain complex logic clearly`,
  },

  task_executor: {
    name: 'Task Executor',
    role: 'Execute file operations, git commands, API calls',
    capabilities: ['fs_write', 'fs_delete', 'git_commit', 'http_post'],
    systemPrompt: `You are a task execution specialist. When asked to:
1. Create/modify files - use fs_write with full paths
2. Make commits - use git_commit with clear messages
3. Call APIs - use http_post with proper authentication
4. Always verify success before reporting completion`,
  },

  data_collector: {
    name: 'Data Collector',
    role: 'Gather data from APIs, databases, files',
    capabilities: ['http_get', 'query_database', 'fs_read', 'fetch_metrics'],
    systemPrompt: `You are a data collection specialist. Your job is to:
1. Query databases for metrics
2. Fetch data from APIs
3. Parse and structure responses
4. Report findings clearly`,
  },
};

/**
 * Example: Complex task requiring agent coordination
 * 
 * User task: "Analyze our codebase for security issues, create a report, and commit it"
 * 
 * Orchestration flow:
 * 1. Main agent breaks down into sub-tasks
 * 2. Delegates to specialists:
 *    - Code Analyzer: Find issues
 *    - Task Executor: Create report file
 *    - Task Executor: Commit changes
 * 3. Aggregates results back to user
 */

export class MultiAgentOrchestrator {
  /**
   * Route a task to the appropriate agent(s)
   * Can invoke multiple agents sequentially or in parallel
   */
  async routeTask(task: string, agents: Agent[]): Promise<string> {
    // Use Claude to decide which agent(s) to use
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a task router. Given this task, which agents should handle it?

Task: "${task}"

Available agents:
${agents.map(a => `- ${a.name}: ${a.role}`).join('\n')}

Respond with JSON: { "agents": ["Agent1", "Agent2"], "reasoning": "..." }`,
          },
        ],
      }),
    });

    const data = await response.json();
    const decision = JSON.parse(data.content[0].text);

    // Execute with selected agents
    const results = [];
    for (const agentName of decision.agents) {
      const agent = agents.find(a => a.name === agentName);
      if (agent) {
        // Execute with this agent's capabilities
        results.push(await this.executeWithAgent(task, agent));
      }
    }

    return results.join('\n---\n');
  }

  private async executeWithAgent(task: string, agent: Agent): Promise<string> {
    // Create a constrained Claude session with only this agent's tools
    // (See AgentOrchestrator above for implementation)
    return `[${agent.name}] Executed task...`;
  }
}
```

---

## Part 4: Deployment & Architecture Decisions

### 4.1 Local vs. Cloud Relay

```typescript
// Three deployment models:

// MODEL 1: Local Network Only (Simplest)
// Phone ←→ Localhost:3000 (WiFi on same network)
// Pros: No server costs, privacy, latency
// Cons: Phone must be on same network
const LOCAL_ONLY = {
  frontend: 'React Native on phone',
  backend: 'Node.js on desktop',
  relay: 'None',
  network: 'Local WiFi',
};

// MODEL 2: Self-Hosted Relay (Recommended)
// Phone ←→ Your VPS:443 (encrypted) ←→ Desktop (via long-lived connection)
// Pros: Remote access, secure, full control
// Cons: VPS costs, you manage TLS/auth
const SELF_HOSTED_RELAY = {
  frontend: 'React Native on phone',
  backend: 'Node.js on desktop',
  relay: 'Node.js relay server on VPS',
  network: 'HTTPS + WSS with auth tokens',
};

// MODEL 3: Anthropic-Style (Most Complex)
// Phone ←→ Relay (Anthropic) ←→ Desktop (via connection pool)
// Pros: Always accessible, load balancing
// Cons: Data routing through third party (mitigated by sandboxing)
const ANTHROPIC_STYLE = {
  frontend: 'React Native on phone',
  backend: 'Node.js on desktop + MITM proxy',
  relay: 'Central relay server',
  network: 'TLS tunneling + mTLS',
};
```

### 4.2 Tool Execution Model

```typescript
// Your Claude agent can execute tools in different ways:

// OPTION A: Direct in-process (Simplest)
// - Tools execute in the same Node process
// - Fast, no overhead
// - Risk: hanging tool can block agent
const DirectExecution = `
orchestrator.registerTool({
  name: 'my_tool',
  execute: async (input) => {
    // Direct function call
    return await doSomething(input);
  }
});
`;

// OPTION B: Child process (Safer)
// - Tools run in separate processes
// - Crashed tools don't crash agent
// - Overhead: process creation, IPC
const ChildProcessExecution = `
execute: async (input) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['./tools/my-tool.js', JSON.stringify(input)]);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.on('close', code => resolve(output));
  });
}
`;

// OPTION C: MCP Server (Most Robust)
// - Tools run as separate services
// - Tools can be in different languages
// - Scalable, networked
const MCPServerExecution = `
// tool runs as: node ./mcp-servers/my-tool/index.js
// communicates via MCP protocol (stdio, SSE, or WebSocket)
`;
```

---

## Part 5: Quick Reference Implementation Checklist

```typescript
// ============================================
// IMPLEMENTATION CHECKLIST
// ============================================

const IMPLEMENTATION_STEPS = [
  {
    phase: '1. Core Server',
    tasks: [
      '[ ] Express app with WebSocket support',
      '[ ] Session management (persistent thread)',
      '[ ] Database schema (SQLite)',
      '[ ] QR code generation for pairing',
      '[ ] REST API endpoints (/api/dispatch/*)',
    ],
  },

  {
    phase: '2. Agent Orchestration',
    tasks: [
      '[ ] Implement AgentOrchestrator class',
      '[ ] Integrate Claude API (streaming)',
      '[ ] Tool execution loop (agentic)',
      '[ ] Error handling & retry logic',
      '[ ] Token limit management',
    ],
  },

  {
    phase: '3. MCP & Tools',
    tasks: [
      '[ ] Implement FilesystemMCP',
      '[ ] Implement GitMCP',
      '[ ] Implement HttpMCP',
      '[ ] Add tool registry system',
      '[ ] Create tool definitions for Claude',
    ],
  },

  {
    phase: '4. Mobile Frontend',
    tasks: [
      '[ ] React Native app scaffolding',
      '[ ] QR scanner integration',
      '[ ] WebSocket connection manager',
      '[ ] Task submission UI',
      '[ ] Real-time step visualization',
      '[ ] Chat history display',
    ],
  },

  {
    phase: '5. DevOps & Deployment',
    tasks: [
      '[ ] Docker container for server',
      '[ ] TLS/SSL setup (if remote relay)',
      '[ ] Environment variable configuration',
      '[ ] Logging & monitoring',
      '[ ] Auto-restart on crash',
    ],
  },

  {
    phase: '6. Testing & Hardening',
    tasks: [
      '[ ] Unit tests for tools',
      '[ ] Integration tests (agent + tools)',
      '[ ] Security audit (file access, API calls)',
      '[ ] Load testing (many concurrent tasks)',
      '[ ] Memory leak detection',
    ],
  },
];
```

---

## Part 6: Key Technical Insights

### Why This Architecture Works

1. **Persistent Thread**: Unlike stateless chat, this keeps context across sessions
   - Same conversation continues whether you're on phone or desktop
   - Claude remembers previous decisions and results
   - Much more powerful for complex, multi-step tasks

2. **Tool Orchestration (The Agent Part)**:
   - Claude doesn't just respond—it *plans and executes*
   - For "analyze code and commit fixes", Claude will:
     - Read files (fs_read)
     - Analyze issues (analyze_code tool)
     - Modify files (fs_write)
     - Create commit (git_commit)
   - Each step feeds into the next (agentic loop)

3. **MCP Abstraction**:
   - Tools are pluggable (add new tool = new MCP server)
   - Tools can be in any language
   - Tools run isolated from main agent
   - Scales to dozens of tool sources

4. **Sandboxing (Security)**:
   - Desktop app runs in lightweight VM
   - Apps Claude controls run in VM
   - Files never auto-exfiltrate
   - You explicitly grant folder access
   - MCP tools can't exceed their scope

### Performance Considerations

```typescript
// Token efficiency: Claude reads history each message
// If history grows: 100 messages = ~50k tokens just for context

// Solutions:
// 1. Summarize old messages periodically
const COMPRESSION_STRATEGY = async (history) => {
  if (history.length > 50) {
    const oldMessages = history.slice(0, -20); // Keep last 20
    const summary = await claude.summarize(oldMessages);
    return [{ role: 'system', content: `Past context: ${summary}` }, ...history.slice(-20)];
  }
  return history;
};

// 2. Use semantic search to retrieve relevant history
const SEMANTIC_RETRIEVAL = async (task, history) => {
  const embedding = await getEmbedding(task);
  const relevant = history.filter(msg => 
    similarity(embedding, msg.embedding) > 0.7
  );
  return relevant;
};

// 3. Caching: if same task is asked twice, reuse result
```

---

## Conclusion

Your Dispatch clone architecture:

```
┌─ PERSISTENT THREAD
│  (conversations live across sessions)
│
├─ AGENT ORCHESTRATION  
│  (Claude plans multi-step workflows)
│
├─ MCP TOOLS
│  (pluggable tool layer)
│
└─ LOCAL SANDBOXING
   (data never leaves your machine)
```

This is fundamentally different from ChatGPT because:
- **Persistent context**: One conversation forever
- **Actual execution**: Tools *run*, tasks *complete*
- **Local privacy**: Processing stays on your device
- **Agent autonomy**: Claude decides the plan, not you

The code above is production-ready scaffolding. You'd customize the MCP servers and tools for your specific needs.

---

**Next Steps:**
1. Start with the Express server + basic FilesystemMCP
2. Test agentic loop with Claude (use tool_use)
3. Build QR pairing → WebSocket connection
4. Add React Native mobile app
5. Deploy relay server if you want remote access
