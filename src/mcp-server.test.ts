import { describe, it, expect } from "bun:test";
import { getToolDefinitions } from "./mcp-server.ts";

describe("MCP tool definitions", () => {
  it("defines check_article tool", () => {
    const tools = getToolDefinitions();
    const check = tools.find(t => t.name === "check_article");
    expect(check).toBeDefined();
    expect(check!.inputSchema.properties).toHaveProperty("text");
  });
  it("defines upload_context tool", () => {
    const tools = getToolDefinitions();
    expect(tools.find(t => t.name === "upload_context")).toBeDefined();
  });
  it("defines list_reports tool", () => {
    const tools = getToolDefinitions();
    expect(tools.find(t => t.name === "list_reports")).toBeDefined();
  });
  it("has 7 tools", () => {
    expect(getToolDefinitions()).toHaveLength(7);
  });
  it("all tools have name and description", () => {
    for (const tool of getToolDefinitions()) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});
