import { describe, expect, it } from "vitest";
import { formatMoney, rupees } from "./api";
describe("Financial display", () => {
  it("formats paise as INR", () =>
    expect(formatMoney("123456")).toContain("1,234.56"));
  it("keeps input conversion exact for large amounts", () =>
    expect(rupees("99999999999999")).toBe("999999999999.99"));
});
