import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatNumber, formatShortDate } from "@/lib/format";

describe("format helpers", () => {
  it("formats dates in a fixed UTC locale", () => {
    expect(
      formatDateTime("2024-02-03T05:06:00Z")
    ).toBe("February 3, 2024 at 05:06 AM UTC");
    expect(
      formatDateTime("2024-02-03 05:06:00")
    ).toBe("February 3, 2024 at 05:06 AM UTC");
    expect(formatShortDate("2024-02-03T05:06:00Z")).toBe("Feb 3, 2024");
    expect(
      formatDate("2024-02-03T05:06:00Z", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    ).toBe("Sat, Feb 3");
  });

  it("formats numbers with a fixed grouping style", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("returns a fallback for invalid date input instead of throwing or garbage", () => {
    expect(() => formatShortDate("unknown")).not.toThrow();
    expect(formatShortDate("unknown")).toBe("");
    expect(() => formatDateTime("not-a-date")).not.toThrow();
    expect(formatDateTime("not-a-date")).toBe("");
  });
});
