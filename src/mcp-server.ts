import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runCheckHeadless } from "./checker.ts";
import { openDb, queryRecent, getContext, listContexts, insertContext, updateContext } from "./db.ts";
import { readConfig, writeConfig } from "./config.ts";

export function getToolDefinitions() {
  return [
    {
      name: "check_article",
      description: "Run quality checks (plagiarism, AI detection, SEO, fact-check, tone, legal) on article text",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "The article text to check" },
          source: { type: "string", description: "Source label (filename or URL)" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags for the check" },
        },
        required: ["text"],
      },
    },
    {
      name: "list_reports",
      description: "List recent article check reports",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: { type: "number", description: "Max reports to return (default 20)" },
        },
      },
    },
    {
      name: "get_report",
      description: "Get a specific check report by ID",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Check ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "upload_context",
      description: "Upload a context document (tone guide, brief, legal policy, style guide)",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: { type: "string", description: "Context type: tone-guide, legal-policy, brief, style-guide, custom" },
          name: { type: "string", description: "Display name" },
          content: { type: "string", description: "The context content (markdown)" },
        },
        required: ["type", "content"],
      },
    },
    {
      name: "list_contexts",
      description: "List all saved context documents",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "get_skills",
      description: "List all available skills with their enabled status",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "toggle_skill",
      description: "Enable or disable a skill",
      inputSchema: {
        type: "object" as const,
        properties: {
          skillId: { type: "string", description: "Skill ID (e.g., 'seo', 'factCheck')" },
          enabled: { type: "boolean", description: "Whether to enable the skill" },
        },
        required: ["skillId", "enabled"],
      },
    },
  ];
}

async function handleToolCall(name: string, args: Record<string, unknown>) {
  const db = openDb();

  switch (name) {
    case "check_article": {
      const text = args.text as string;
      const source = (args.source as string) ?? "mcp-check";
      const result = await runCheckHeadless(source, { text });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "list_reports": {
      const limit = (args.limit as number) ?? 20;
      const checks = queryRecent(db, limit);
      return { content: [{ type: "text", text: JSON.stringify(checks, null, 2) }] };
    }
    case "get_report": {
      const id = args.id as number;
      const checks = queryRecent(db, 100);
      const check = checks.find(c => c.id === id);
      if (!check) return { content: [{ type: "text", text: `Report ${id} not found` }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(check, null, 2) }] };
    }
    case "upload_context": {
      const type = args.type as string;
      const ctxName = (args.name as string) ?? type;
      const content = args.content as string;
      const existing = getContext(db, type);
      if (existing) {
        updateContext(db, type, { name: ctxName, content });
      } else {
        insertContext(db, { type, name: ctxName, content });
      }
      return { content: [{ type: "text", text: `Context '${type}' saved (${content.length} chars)` }] };
    }
    case "list_contexts": {
      const contexts = listContexts(db);
      return { content: [{ type: "text", text: JSON.stringify(contexts, null, 2) }] };
    }
    case "get_skills": {
      const config = readConfig();
      const skills = Object.entries(config.skills).map(([id, enabled]) => ({ id, enabled }));
      return { content: [{ type: "text", text: JSON.stringify(skills, null, 2) }] };
    }
    case "toggle_skill": {
      const config = readConfig();
      const skillId = args.skillId as string;
      const enabled = args.enabled as boolean;
      const skills = { ...config.skills, [skillId]: enabled };
      writeConfig({ skills });
      return { content: [{ type: "text", text: `Skill '${skillId}' ${enabled ? "enabled" : "disabled"}` }] };
    }
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
}

export async function startMcpServer() {
  const server = new Server(
    { name: "article-checker", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
