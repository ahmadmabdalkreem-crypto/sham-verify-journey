import { describe, expect, it } from "vitest";
import { maskPhone } from "./mask-phone";

describe("maskPhone", () => {
  it("shows only the last 3 digits", () => {
    expect(maskPhone("+963 991 234 567")).toBe("***567");
  });
  it("returns empty when no phone", () => {
    expect(maskPhone(null)).toBe("");
    expect(maskPhone("+963 ")).toBe("");
  });
});
