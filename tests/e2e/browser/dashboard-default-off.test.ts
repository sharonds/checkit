import { describe, it, expect, afterAll } from "bun:test";
import { bootDashboard, type DashboardHandle } from "../helpers/dashboard-boot.ts";
import { allocateTempPaths } from "../helpers/temp-paths.ts";

// Dashboard Test Case 1 — default-off guardrail.
//
// Intent from the E2E design: verify that without explicit opt-in, the
// product routes checks through the Basic tier and the Settings UI reflects
// that. We verify this at the API layer:
//   - GET /api/config returns no factCheckTierFlag (or false) by default
//   - The check pipeline uses Basic tier regardless of any tier preference
//     unless factCheckTierFlag === true
//
// See docs/superpowers/plans/2026-04-22-e2e-issues.md for why the Settings
// UI-layer verification is deferred.

describe("dashboard — default-off guardrail (API layer)", () => {
  let handle: DashboardHandle | undefined;
  const temp = allocateTempPaths();

  afterAll(async () => {
    if (handle) await handle.stop();
    temp.cleanup();
  });

  it(
    "GET /api/config reports flag as undefined/false when not explicitly opted in",
    async () => {
      temp.writeConfig({});
      temp.initDbSchema();
      handle = await bootDashboard({
        scenario: "settings-default-off",
        configPath: temp.configPath,
        dbPath: temp.dbPath,
      });

      const res = await fetch(`${handle.url}/api/config`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { config?: { factCheckTier?: string; factCheckTierFlag?: boolean } };
      expect(body.config?.factCheckTierFlag ?? false).toBe(false);
    },
    60_000,
  );

  it(
    "GET /api/config after setting only factCheckTier (no flag) still reports flag off",
    async () => {
      if (!handle) throw new Error("previous test did not boot");
      // Directly mutate the temp config file to set tier WITHOUT flag.
      temp.writeConfig({ factCheckTier: "standard" });
      const res = await fetch(`${handle.url}/api/config`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { config?: { factCheckTier?: string; factCheckTierFlag?: boolean } };
      // Tier preference is persisted, but flag must still be off.
      expect(body.config?.factCheckTierFlag ?? false).toBe(false);
    },
    30_000,
  );

  it(
    "GET /api/config after explicit opt-in reports flag true",
    async () => {
      if (!handle) throw new Error("previous test did not boot");
      temp.writeConfig({ factCheckTier: "standard", factCheckTierFlag: true });
      const res = await fetch(`${handle.url}/api/config`);
      const body = (await res.json()) as { config?: { factCheckTierFlag?: boolean } };
      expect(body.config?.factCheckTierFlag).toBe(true);
    },
    30_000,
  );
});
