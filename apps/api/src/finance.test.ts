import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { minor, money, position, monthRange, categorize } from "./finance";
describe("Exact financial arithmetic", () => {
  it("parses decimals without binary floating point", () => {
    expect(minor("0.10") + minor("0.20")).toBe(30n);
    expect(minor("999999999999.99")).toBe(99999999999999n);
    expect(money(-105n)).toBe("-1.05");
  });
  it("rejects invalid precision and exponents", () => {
    for (const value of ["1.001", "1e4", "-1", "NaN", ""])
      expect(() => minor(value)).toThrow();
  });
  it("weights cost including fees and realizes sales proportionately", () => {
    const trade = (kind: string, q: string, price: string, fees = "0") => ({
      kind,
      quantity: new Prisma.Decimal(q),
      price: minor(price),
      fees: minor(fees),
    });
    expect(
      position([
        trade("BUY", "10", "100", "10"),
        trade("BUY", "10", "200", "10"),
        trade("SELL", "5", "200", "5"),
        trade("DIVIDEND", "1", "30", "2"),
      ]),
    ).toEqual({
      quantity: "15.00000000",
      cost: 226500n,
      realized: 24000n,
      dividends: 2800n,
    });
  });
  it("rejects overselling", () =>
    expect(() =>
      position([
        {
          kind: "SELL",
          quantity: new Prisma.Decimal(1),
          price: 100n,
          fees: 0n,
        },
      ]),
    ).toThrow("Insufficient holdings"));
  it("supports fractional holdings without losing precision", () =>
    expect(
      position([
        {
          kind: "BUY",
          quantity: new Prisma.Decimal("0.00000001"),
          price: 100000000n,
          fees: 0n,
        },
      ]).cost,
    ).toBe(1n));
  it("rolls December into next year", () =>
    expect(monthRange("2026-12").lt.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    ));
  it("applies explainable merchant rules", () => {
    expect(categorize("Swiggy")).toBe("food-dining");
    expect(categorize("Unrecognized shop")).toBe("other");
  });
});
