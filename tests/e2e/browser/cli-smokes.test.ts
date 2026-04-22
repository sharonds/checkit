import { describe, it, expect } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { allocateTempPaths } from "../helpers/temp-paths.ts";

// CLI smoke tests (Task 12). Each spawns `bun src/index.tsx <article.md>` with
// CHECKAPP_E2E=1 and the temp paths, then asserts the CLI exits successfully
// and the output reflects the expected tier.
//
// These live in the "browser" lane because they also exercise the full
// orchestration path (not browser-specific but slow-ish), kept out of the
// fast unit suite.

const ARTICLE = "Coffee contains caffeine, a stimulant that can improve alertness. The human heart pumps blood throughout the body.";

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(opts: {
  scenario: string;
  configContents: Record<string, unknown>;
  extraArgs?: string[];
}): Promise<CliResult> {
  const temp = allocateTempPaths();
  temp.initDbSchema();
  temp.writeConfig(opts.configContents);
  const articlePath = join(temp.dir, "article.md");
  writeFileSync(articlePath, ARTICLE);

  try {
    const proc = Bun.spawn(
      ["bun", "src/index.tsx", articlePath, ...(opts.extraArgs ?? [])],
      {
        env: {
          ...process.env,
          CHECKAPP_E2E: "1",
          CHECKAPP_E2E_SCENARIO: opts.scenario,
          CHECKAPP_CONFIG_PATH: temp.configPath,
          CHECKAPP_DB_PATH: temp.dbPath,
          CHECKAPP_ALLOW_LIVE_PROVIDERS: "0",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    return { stdout, stderr, exitCode: proc.exitCode ?? -1 };
  } finally {
    temp.cleanup();
  }
}

describe("CLI mocked smokes", () => {
  it(
    "basic tier: CLI runs a check using fixture provider data",
    async () => {
      const result = await runCli({
        scenario: "basic-happy",
        configContents: {
          factCheckTier: "basic",
          factCheckTierFlag: false,
          providers: { "fact-check": { provider: "exa-search", apiKey: "dummy" } },
          minimaxApiKey: "dummy",
          exaApiKey: "dummy",
          skills: { factCheck: true, plagiarism: false, aiDetection: false, seo: false },
        },
      });
      expect(result.exitCode).toBe(0);
      // The CLI prints skill results; we just need to see the fact-check skill
      // ran and didn't hit any assertMocksOnly guard.
      expect(result.stdout + result.stderr).not.toMatch(/live provider call/i);
      expect(result.stdout).toMatch(/Fact Check/i);
    },
    60_000,
  );

  it(
    "standard tier: CLI with flag on routes to grounded skill via fixture",
    async () => {
      const result = await runCli({
        scenario: "standard-happy",
        configContents: {
          factCheckTier: "standard",
          factCheckTierFlag: true,
          providers: { "fact-check": { provider: "gemini-grounded", apiKey: "dummy" } },
          geminiApiKey: "dummy",
          llmProvider: "gemini",
          skills: { factCheck: true, plagiarism: false, aiDetection: false, seo: false },
        },
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout + result.stderr).not.toMatch(/live provider call/i);
      expect(result.stdout).toMatch(/Fact Check/i);
    },
    60_000,
  );

  it(
    "--estimate-cost prints per-tier estimates without any provider call",
    async () => {
      const result = await runCli({
        scenario: "basic-happy",
        configContents: {
          skills: { factCheck: true, seo: true },
        },
        extraArgs: ["--estimate-cost"],
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Fact-check tier pricing/);
      expect(result.stdout).toMatch(/Basic\s+\$/);
      expect(result.stdout).toMatch(/Standard\s+\$/);
      expect(result.stdout).toMatch(/Deep Audit\s+\$/);
    },
    30_000,
  );
});
