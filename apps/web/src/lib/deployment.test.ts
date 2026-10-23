import { describe, expect, it } from "vitest";
import { apiProxyOrigin } from "./deployment";
describe("Vercel upstream configuration", () => {
  it("uses the local API during local development", () => {
    expect(apiProxyOrigin({})).toBe("http://127.0.0.1:4000");
  });
  it("requires an explicit hosted API for Vercel", () => {
    expect(() => apiProxyOrigin({ VERCEL: "1" })).toThrow("Set API_PROXY_URL");
    for (const origin of [
      "http://api.example.test",
      "https://localhost",
      "https://127.0.0.1",
    ]) {
      expect(() =>
        apiProxyOrigin({ VERCEL: "1", API_PROXY_URL: origin }),
      ).toThrow("hosted HTTPS");
    }
  });
  it("accepts a fixed HTTPS origin and strips its trailing slash", () => {
    expect(
      apiProxyOrigin({
        VERCEL: "1",
        API_PROXY_URL: "https://finovaiq-api.example.test/",
      }),
    ).toBe("https://finovaiq-api.example.test");
  });
  it("rejects credentials, paths, and non-HTTP destinations", () => {
    for (const origin of [
      "https://name:password@example.test",
      "https://example.test/api",
      "https://example.test/?url=other",
      "file:///tmp",
    ]) {
      expect(() => apiProxyOrigin({ API_PROXY_URL: origin })).toThrow();
    }
  });
});
