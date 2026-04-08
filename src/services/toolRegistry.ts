// Tool registry with capability metadata and availability filtering
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  capabilities: {
    requires_internet?: boolean;
    requires_token?: boolean;
    requires_browser?: boolean;
  };
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'fs_read',
    description: 'Read file contents (path relative to workspace root)',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    capabilities: {},
  },
  {
    name: 'fs_write',
    description: 'Write content to a file (relative to workspace root)',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content'],
    },
    capabilities: {},
  },
  {
    name: 'fs_list',
    description: 'List files in a directory (relative to workspace root)',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    capabilities: {},
  },
  {
    name: 'http_get',
    description: 'HTTP GET with optional headers',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        headers: { type: 'object' },
      },
      required: ['url'],
    },
    capabilities: { requires_internet: true },
  },
  {
    name: 'http_fetch_html',
    description: 'Fetch HTML/text from a URL',
    input_schema: { type: 'object', properties: { url: { type: 'string' }, headers: { type: 'object' } }, required: ['url'] },
    capabilities: { requires_internet: true },
  },
  {
    name: 'git_status',
    description: 'Git status porcelain',
    input_schema: { type: 'object', properties: {} },
    capabilities: {},
  },
  {
    name: 'git_diff',
    description: 'Git diff for repo or file',
    input_schema: { type: 'object', properties: { file: { type: 'string' } } },
    capabilities: {},
  },
  {
    name: 'git_commit',
    description: 'Create commit (stages all changes)',
    input_schema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
    capabilities: {},
  },
  {
    name: 'code_analysis_summary',
    description: 'Code stats via local AST/analysis server',
    input_schema: { type: 'object', properties: { path: { type: 'string' } } },
    capabilities: {},
  },
  {
    name: 'apify_actor_run',
    description: 'Run an Apify actor by ID with input body',
    input_schema: {
      type: 'object',
      properties: { actorId: { type: 'string' }, inputBody: { type: 'object' } },
      required: ['actorId'],
    },
    capabilities: { requires_internet: true, requires_token: true },
  },
  {
    name: 'browser_screenshot',
    description: 'Navigate and capture screenshot (base64)',
    input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    capabilities: { requires_browser: true, requires_internet: true },
  },
  {
    name: 'browser_click',
    description: 'Navigate and click selector',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' }, selector: { type: 'string' } },
      required: ['url', 'selector'],
    },
    capabilities: { requires_browser: true, requires_internet: true },
  },
  {
    name: 'browser_fill',
    description: 'Navigate, fill selector, optional submit',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        selector: { type: 'string' },
        value: { type: 'string' },
        submitSelector: { type: 'string' },
      },
      required: ['url', 'selector', 'value'],
    },
    capabilities: { requires_browser: true, requires_internet: true },
  },
];

export function availableTools(opts: {
  hasInternet: boolean;
  hasBrowser: boolean;
  hasApifyToken: boolean;
  allowlist: string[];
  denylist: string[];
}): ToolDefinition[] {
  return TOOLS.filter((tool) => {
    if (opts.denylist.length && opts.denylist.includes(tool.name)) return false;
    if (opts.allowlist.length && !opts.allowlist.includes(tool.name)) return false;
    const caps = tool.capabilities || {};
    if (caps.requires_internet && !opts.hasInternet) return false;
    if (caps.requires_browser && !opts.hasBrowser) return false;
    if (caps.requires_token && tool.name.startsWith('apify_') && !opts.hasApifyToken) return false;
    return true;
  });
}
