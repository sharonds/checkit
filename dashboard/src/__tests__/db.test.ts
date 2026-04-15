import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getRecentChecks,
  getCheckById,
  getTotalStats,
  getAllTags,
  addTagsToCheck,
  getTagsForCheck,
  searchChecks,
  getContexts,
  getContextByType,
  upsertContext,
  deleteContextByType,
  getDb,
  closeDb,
} from "../lib/db";
import { sql } from "drizzle-orm";

beforeEach(() => {
  process.env.ARTICLE_CHECKER_DB = ":memory:";
  // Create the checks table in memory (since CLI won't have created it)
  const db = getDb();
  db.run(sql`CREATE TABLE IF NOT EXISTS checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    results_json TEXT NOT NULL DEFAULT '[]',
    total_cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
});

afterEach(() => {
  closeDb();
  delete process.env.ARTICLE_CHECKER_DB;
});

describe("getRecentChecks", () => {
  it("returns empty array for empty DB", () => {
    expect(getRecentChecks(5)).toEqual([]);
  });

  it("returns inserted checks in reverse order", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, results_json, total_cost) VALUES ('a.md', 100, '[]', 0.01)`
    );
    db.run(
      sql`INSERT INTO checks (source, word_count, results_json, total_cost) VALUES ('b.md', 200, '[]', 0.02)`
    );
    const checks = getRecentChecks(10);
    expect(checks).toHaveLength(2);
    expect(checks[0].source).toBe("b.md"); // most recent first
  });
});

describe("getCheckById", () => {
  it("returns null for non-existent id", () => {
    expect(getCheckById(999)).toBeNull();
  });

  it("returns the correct check", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, results_json, total_cost) VALUES ('test.md', 100, '[]', 0.05)`
    );
    const check = getCheckById(1);
    expect(check).not.toBeNull();
    expect(check!.source).toBe("test.md");
  });
});

describe("getTotalStats", () => {
  it("returns zeros for empty DB", () => {
    const stats = getTotalStats();
    expect(stats.totalChecks).toBe(0);
    expect(stats.totalCost).toBe(0);
  });

  it("aggregates correctly", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('a.md', 100, 0.05)`
    );
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('b.md', 200, 0.10)`
    );
    const stats = getTotalStats();
    expect(stats.totalChecks).toBe(2);
    expect(stats.totalCost).toBeCloseTo(0.15);
  });
});

describe("tags", () => {
  it("adds and retrieves tags", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('test.md', 100, 0)`
    );
    addTagsToCheck(1, ["blog", "seo", "q2"]);
    const t = getTagsForCheck(1);
    expect(t).toEqual(["blog", "q2", "seo"]); // sorted
  });

  it("getAllTags returns tags with counts", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('a.md', 100, 0)`
    );
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('b.md', 200, 0)`
    );
    addTagsToCheck(1, ["blog"]);
    addTagsToCheck(2, ["blog", "seo"]);
    const all = getAllTags();
    expect(all.find((t) => t.name === "blog")?.count).toBe(2);
    expect(all.find((t) => t.name === "seo")?.count).toBe(1);
  });
});

describe("searchChecks", () => {
  it("finds checks by source keyword", () => {
    const db = getDb();
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('vitamin-d-article.md', 500, 0)`
    );
    db.run(
      sql`INSERT INTO checks (source, word_count, total_cost) VALUES ('react-hooks-guide.md', 300, 0)`
    );
    const results = searchChecks("vitamin");
    expect(results).toHaveLength(1);
    expect(results[0].source).toContain("vitamin");
  });

  it("returns empty for no matches", () => {
    const results = searchChecks("nonexistent");
    expect(results).toEqual([]);
  });
});

describe("contexts (Drizzle)", () => {
  it("upserts and retrieves a context", () => {
    upsertContext("tone-guide", "Brand Voice", "Be warm");
    const ctx = getContextByType("tone-guide");
    expect(ctx).not.toBeNull();
    expect(ctx!.name).toBe("Brand Voice");
    expect(ctx!.content).toBe("Be warm");
  });

  it("updates existing context on upsert", () => {
    upsertContext("tone-guide", "TG", "first");
    upsertContext("tone-guide", "TG Updated", "second");
    const ctx = getContextByType("tone-guide");
    expect(ctx!.name).toBe("TG Updated");
    expect(ctx!.content).toBe("second");
  });

  it("lists all contexts", () => {
    upsertContext("tone-guide", "TG", "...");
    upsertContext("brief", "BR", "...");
    const all = getContexts();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("returns null for non-existent type", () => {
    const ctx = getContextByType("nonexistent");
    expect(ctx).toBeNull();
  });

  it("deletes a context by type", () => {
    upsertContext("tone-guide", "TG", "content");
    deleteContextByType("tone-guide");
    const ctx = getContextByType("tone-guide");
    expect(ctx).toBeNull();
  });
});
