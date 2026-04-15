import { describe, it, expect } from "bun:test";
import { detectLanguage, isRtl } from "./language.ts";

describe("detectLanguage", () => {
  it("detects English", () => {
    expect(detectLanguage("Apple cider vinegar has been used for centuries")).toBe("en");
  });
  it("detects Hebrew", () => {
    expect(detectLanguage("ויטמין D הוא קבוצה של חמש תרכובות מסיסות בשמן")).toBe("he");
  });
  it("detects Arabic", () => {
    expect(detectLanguage("فيتامين د هو مجموعة من المركبات القابلة للذوبان في الدهون")).toBe("ar");
  });
  it("returns en for numbers only", () => {
    expect(detectLanguage("123 456 789")).toBe("en");
  });
  it("detects by character majority", () => {
    expect(detectLanguage("Hello שלום world כי רוב הטקסט בעברית")).toBe("he");
  });
  it("detects Chinese", () => {
    expect(detectLanguage("维生素D是一组脂溶性化合物")).toBe("zh");
  });
  it("detects Japanese (hiragana)", () => {
    expect(detectLanguage("ビタミンDは脂溶性のビタミンです")).toBe("ja");
  });
  it("detects Korean", () => {
    expect(detectLanguage("비타민D는 지용성 비타민입니다")).toBe("ko");
  });
});

describe("isRtl", () => {
  it("Hebrew is RTL", () => { expect(isRtl("he")).toBe(true); });
  it("Arabic is RTL", () => { expect(isRtl("ar")).toBe(true); });
  it("English is not RTL", () => { expect(isRtl("en")).toBe(false); });
});
