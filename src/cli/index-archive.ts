import { readdirSync, readFileSync, statSync } from "fs";
import { createHash } from "crypto";
import { homedir } from "os";
import { join } from "path";
import { readConfig, type Config } from "../config.ts";
import { embed, vectorizeUpsert } from "../providers/vectorize.ts";

/** Default archive path derived from $HOME or os.homedir(). */
export function resolveArchivePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.HOME ?? homedir(), ".checkapp", "archive");
}

/** Hash-based Vectorize ID — content-independent, stable across runs. */
function vectorIdFromFile(filePath: string): string {
  return createHash("sha256").update(filePath).digest("hex").slice(0, 32);
}

export interface IndexArchiveOpts {
  env?: NodeJS.ProcessEnv;
  configOverride?: Config;
}

/**
 * Ingest a directory of .md articles into Cloudflare Vectorize.
 * Each file becomes one vector with metadata { title, publishedAt, snippet }.
 *
 * Dimensions: 768 (text-embedding-3-small truncated). User's Vectorize index
 * must be provisioned with `dimensions=768 metric=cosine`. The pre-flight log
 * surfaces this so first-run users don't trip on a dimension mismatch.
 *
 * Accepts either a positional `(dir, configOverride)` form (legacy CLI
 * callers) or an `(opts: { env, configOverride })` form (B2.5 tests). When no
 * dir is given, falls back to `resolveArchivePath(env)`.
 */
export async function indexArchive(dir: string, configOverride?: Config): Promise<void>;
export async function indexArchive(opts: IndexArchiveOpts): Promise<void>;
export async function indexArchive(
  arg1: string | IndexArchiveOpts,
  arg2?: Config,
): Promise<void> {
  const isOptsForm = typeof arg1 !== "string";
  const env: NodeJS.ProcessEnv = isOptsForm ? (arg1.env ?? process.env) : process.env;
  const configOverride: Config | undefined = isOptsForm ? arg1.configOverride : arg2;
  const dir: string = isOptsForm ? resolveArchivePath(env) : arg1;

  const missingEnv = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"].filter((k) => !env[k]);
  if (missingEnv.length && isOptsForm) {
    throw new Error(`Missing env vars: ${missingEnv.join(", ")}`);
  }

  const config = configOverride ?? readConfig();
  const pc = config.providers?.["self-plagiarism"];
  if (!pc?.apiKey || !pc.extra?.accountId) {
    throw new Error(
      "self-plagiarism provider not configured. Add providers['self-plagiarism'] " +
      "= { provider: 'cloudflare-vectorize', apiKey: '<token>', extra: { accountId: '<id>', indexName: 'articles' } } " +
      "to your ~/.checkapp/config.json."
    );
  }
  if (!config.openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY required for embeddings. Add it to your .env or config.");
  }

  const indexName = pc.extra.indexName ?? "articles";
  const files = readdirSync(dir).filter(f => f.endsWith(".md"));
  if (files.length === 0) {
    console.log(`No .md files found in ${dir}`);
    return;
  }

  console.log(`Embedding ${files.length} article(s) at 768 dimensions...`);
  console.log(`(If this is your first run, your Vectorize index must be created with matching dims:)`);
  console.log(`  wrangler vectorize create ${indexName} --dimensions=768 --metric=cosine\n`);

  const batch: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }> = [];
  for (const file of files) {
    const full = join(dir, file);
    const content = readFileSync(full, "utf-8");
    const stat = statSync(full);
    const vec = await embed(content, config.openrouterApiKey);
    batch.push({
      id: vectorIdFromFile(full),
      values: vec,
      metadata: {
        title: file,
        publishedAt: stat.mtime.toISOString(),
        snippet: content.slice(0, 200),
      },
    });
    console.log(`  embedded ${file} (${vec.length} dims)`);
  }

  // Cloudflare Vectorize v2 caps upsert at 1000 vectors/request + body-size limit.
  // 500 keeps us well under both with headroom for metadata payloads.
  const UPSERT_BATCH_SIZE = 500;
  console.log(`Upserting ${batch.length} vector(s) to index '${indexName}' in chunks of ${UPSERT_BATCH_SIZE}...`);
  for (let i = 0; i < batch.length; i += UPSERT_BATCH_SIZE) {
    const chunk = batch.slice(i, i + UPSERT_BATCH_SIZE);
    await vectorizeUpsert({
      accountId: pc.extra.accountId,
      indexName,
      apiKey: pc.apiKey,
      vectors: chunk,
    });
    console.log(`  upserted ${i + chunk.length}/${batch.length}`);
  }
  console.log(`Indexed ${batch.length} article(s). Ready for self-plagiarism checks.`);
}
