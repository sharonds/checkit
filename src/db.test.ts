import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  createSchema,
  insertCheck,
  queryRecent,
  openDb,
  insertContext,
  getContext,
  listContexts,
  updateContext,
  deleteContext,
  loadAllContexts,
  getCheckArticleText,
  getActiveAuditForParent,
  getAuditsForParent,
  insertDeepAudit,
} from "./db.ts";

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  createSchema(db);
});

afterEach(() => {
  db.close();
});

describe("openDb", () => {
  test("creates parent directory if missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "checkapp-db-test-"));
    const nested = join(tmp, "nested", "dir", "history.db");
    const db = openDb(nested);
    expect(existsSync(nested)).toBe(true);
    db.close();
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe("insertCheck", () => {
  test("inserts a record and returns the id", () => {
    const id = insertCheck(db, {
      source: "./article.md",
      wordCount: 800,
      results: [{ skillId: "seo", name: "SEO", score: 80, verdict: "pass", summary: "ok", findings: [], costUsd: 0 }],
      totalCostUsd: 0.18,
    });
    expect(id).toBeGreaterThan(0);
  });

  test("persists article text for report-backed deep audits", () => {
    const id = insertCheck(db, {
      source: "./article.md",
      wordCount: 5,
      results: [],
      totalCostUsd: 0,
      articleText: "Stored article text",
    });

    expect(getCheckArticleText(db, id)).toBe("Stored article text");
    expect(queryRecent(db, 1)[0]?.articleText).toBe("Stored article text");
  });
});

describe("createSchema", () => {
  test("adds article_text to legacy checks tables", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.run(`
      CREATE TABLE checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        results_json TEXT NOT NULL DEFAULT '[]',
        total_cost REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    createSchema(legacyDb);

    const columns = legacyDb
      .query<{ name: string }, []>("PRAGMA table_info(checks)")
      .all()
      .map((column) => column.name);

    expect(columns).toContain("article_text");
    legacyDb.close();
  });
});

describe("queryRecent", () => {
  test("returns most recent checks in descending order", () => {
    insertCheck(db, { source: "a.md", wordCount: 100, results: [], totalCostUsd: 0 });
    insertCheck(db, { source: "b.md", wordCount: 200, results: [], totalCostUsd: 0 });
    const rows = queryRecent(db, 10);
    expect(rows[0].source).toBe("b.md");
    expect(rows[1].source).toBe("a.md");
  });

  test("respects the limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      insertCheck(db, { source: `${i}.md`, wordCount: 100, results: [], totalCostUsd: 0 });
    }
    expect(queryRecent(db, 3)).toHaveLength(3);
  });
});

describe("contexts", () => {
  test("inserts and retrieves a context", () => {
    const db = openDb(":memory:");
    insertContext(db, { type: "tone-guide", name: "Brand Voice", content: "Write in second person" });
    const ctx = getContext(db, "tone-guide");
    expect(ctx).not.toBeNull();
    expect(ctx!.name).toBe("Brand Voice");
    expect(ctx!.content).toContain("second person");
  });

  test("lists all contexts", () => {
    const db = openDb(":memory:");
    insertContext(db, { type: "tone-guide", name: "Brand Voice", content: "..." });
    insertContext(db, { type: "brief", name: "Q2 Launch", content: "500 words" });
    expect(listContexts(db)).toHaveLength(2);
  });

  test("updates a context", () => {
    const db = openDb(":memory:");
    insertContext(db, { type: "tone-guide", name: "Brand Voice", content: "v1" });
    updateContext(db, "tone-guide", { content: "v2 updated" });
    expect(getContext(db, "tone-guide")!.content).toBe("v2 updated");
  });

  test("deletes a context", () => {
    const db = openDb(":memory:");
    insertContext(db, { type: "brief", name: "Q2", content: "..." });
    deleteContext(db, "brief");
    expect(getContext(db, "brief")).toBeNull();
  });

  test("returns null for missing type", () => {
    const db = openDb(":memory:");
    expect(getContext(db, "nonexistent")).toBeNull();
  });

  test("loadAllContexts returns a map", () => {
    const db = openDb(":memory:");
    insertContext(db, { type: "tone-guide", name: "TG", content: "be warm" });
    insertContext(db, { type: "brief", name: "BR", content: "500 words" });
    const map = loadAllContexts(db);
    expect(map["tone-guide"]).toBe("be warm");
    expect(map["brief"]).toBe("500 words");
  });
});

describe("deep_audits", () => {
  test("returns the active audit for a parent and ignores terminal audits", () => {
    insertDeepAudit(db, {
      parentType: "content_hash",
      parentKey: "hash-1",
      requestedBy: "mcp",
      startedAt: 100,
    });
    const activeId = insertDeepAudit(db, {
      parentType: "content_hash",
      parentKey: "hash-1",
      requestedBy: "dashboard",
      startedAt: 200,
    });
    db.run(
      "UPDATE deep_audits SET interaction_id = ?, status = 'in_progress' WHERE id = ?",
      ["int-active", activeId],
    );
    const completedId = insertDeepAudit(db, {
      parentType: "content_hash",
      parentKey: "hash-1",
      requestedBy: "cli",
      startedAt: 300,
    });
    db.run(
      "UPDATE deep_audits SET interaction_id = ?, status = 'completed', completed_at = ? WHERE id = ?",
      ["int-completed", 400, completedId],
    );

    const active = getActiveAuditForParent(db, "content_hash", "hash-1");

    expect(active).not.toBeNull();
    expect(active?.interactionId).toBe("int-active");
    expect(active?.status).toBe("in_progress");
    expect(getAuditsForParent(db, "content_hash", "hash-1")).toHaveLength(3);
  });
});
