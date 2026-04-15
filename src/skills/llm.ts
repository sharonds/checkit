/**
 * Unified LLM client that supports Anthropic SDK (MiniMax, Anthropic) and
 * OpenAI-compatible SDK (OpenRouter).
 *
 * Skills call `llm.call(prompt, maxTokens)` — the SDK difference is hidden.
 *
 * Priority (auto-detect): MiniMax -> Anthropic -> OpenRouter
 * Explicit: set `llmProvider` in config to override.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Config } from "../config.ts";

export const MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Standard model for quality tasks (fact-check, tone, legal) */
export const LLM_MODEL = {
  minimax: "MiniMax-M2.7",
  anthropic: "claude-haiku-4-5-20251001",
  openrouter: "anthropic/claude-3.5-haiku",
} as const;

export type LlmProvider = "minimax" | "anthropic" | "openrouter";

export interface LlmClient {
  provider: LlmProvider;
  model: string;
  /** Send a prompt and get text back. Handles SDK differences internally. */
  call: (prompt: string, maxTokens?: number) => Promise<string>;
}

function createAnthropicCaller(client: Anthropic, model: string): LlmClient["call"] {
  return async (prompt: string, maxTokens = 1024) => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return getTextBlock(response.content);
  };
}

function createOpenAICaller(client: OpenAI, model: string): LlmClient["call"] {
  return async (prompt: string, maxTokens = 1024) => {
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  };
}

/**
 * Returns a configured LLM client.
 * Explicit `llmProvider` in config takes priority, then auto-detect by key presence.
 * Returns null when no usable key is configured.
 */
export function getLlmClient(config: Config): LlmClient | null {
  // Explicit provider preference
  if (config.llmProvider === "openrouter" && config.openrouterApiKey) {
    const client = new OpenAI({ apiKey: config.openrouterApiKey, baseURL: OPENROUTER_BASE_URL });
    return { provider: "openrouter", model: LLM_MODEL.openrouter, call: createOpenAICaller(client, LLM_MODEL.openrouter) };
  }
  if (config.llmProvider === "anthropic" && config.anthropicApiKey) {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    return { provider: "anthropic", model: LLM_MODEL.anthropic, call: createAnthropicCaller(client, LLM_MODEL.anthropic) };
  }
  if (config.llmProvider === "minimax" && config.minimaxApiKey) {
    const client = new Anthropic({ apiKey: config.minimaxApiKey, baseURL: MINIMAX_BASE_URL });
    return { provider: "minimax", model: LLM_MODEL.minimax, call: createAnthropicCaller(client, LLM_MODEL.minimax) };
  }

  // Auto-detect: MiniMax -> Anthropic -> OpenRouter
  if (config.minimaxApiKey) {
    const client = new Anthropic({ apiKey: config.minimaxApiKey, baseURL: MINIMAX_BASE_URL });
    return { provider: "minimax", model: LLM_MODEL.minimax, call: createAnthropicCaller(client, LLM_MODEL.minimax) };
  }
  if (config.anthropicApiKey) {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    return { provider: "anthropic", model: LLM_MODEL.anthropic, call: createAnthropicCaller(client, LLM_MODEL.anthropic) };
  }
  if (config.openrouterApiKey) {
    const client = new OpenAI({ apiKey: config.openrouterApiKey, baseURL: OPENROUTER_BASE_URL });
    return { provider: "openrouter", model: LLM_MODEL.openrouter, call: createOpenAICaller(client, LLM_MODEL.openrouter) };
  }

  return null;
}

/**
 * Extracts the text content from an Anthropic response, skipping any "thinking" blocks.
 * MiniMax-M2.7 always emits a thinking block first; Anthropic models do not.
 */
export function getTextBlock(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}

/**
 * Parses a JSON response that may be wrapped in a markdown code fence.
 * MiniMax-M2.7 sometimes wraps JSON in ```json ... ``` blocks.
 * Throws SyntaxError if the cleaned string is not valid JSON.
 */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
}
