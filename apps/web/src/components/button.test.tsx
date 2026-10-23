// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./ui/button";
afterEach(cleanup);
describe("Accessible action button", () => {
  it("exposes its name, invokes the action, and honors disabled", () => {
    let clicks = 0;
    const { rerender } = render(
      <Button onClick={() => clicks++}>Save account</Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save account" }));
    expect(clicks).toBe(1);
    rerender(
      <Button disabled onClick={() => clicks++}>
        Save account
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save account" }));
    expect(clicks).toBe(1);
  });
});
