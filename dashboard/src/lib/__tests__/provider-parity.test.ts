import { describe, expect, test } from "vitest";
import { PROVIDER_REGISTRY as dashboardRegistry } from "../providers";
import { PROVIDER_REGISTRY as coreRegistry } from "../../../../src/providers/registry";

function providerIdsBySkill(
  registry: Partial<Record<string, Array<{ id: string }>>>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(registry).map(([skillId, providers]) => [
      skillId,
      (providers ?? []).map((provider) => provider.id),
    ]),
  );
}

describe("dashboard provider registry parity", () => {
  test("matches the core provider IDs and ordering for each skill", () => {
    expect(providerIdsBySkill(dashboardRegistry)).toEqual(providerIdsBySkill(coreRegistry));
  });
});
