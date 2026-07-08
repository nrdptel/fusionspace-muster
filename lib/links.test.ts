import { describe, it, expect } from "vitest";
import { checkStockUrl, MOTOR_FINDER_URL } from "./links";

describe("checkStockUrl", () => {
  it("deep-links an AeroTech reload with a lowercased manufacturer slug", () => {
    expect(checkStockUrl({ manufacturer: "AeroTech", designation: "I161W" })).toBe(
      "https://motor.fusionspace.co/motor/aerotech/I161W",
    );
  });

  it("deep-links a Cesaroni reload the same way", () => {
    expect(checkStockUrl({ manufacturer: "Cesaroni", designation: "3147K530" })).toBe(
      "https://motor.fusionspace.co/motor/cesaroni/3147K530",
    );
  });

  it("is built on the shared Motor Finder origin", () => {
    expect(checkStockUrl({ manufacturer: "AeroTech", designation: "H128W" })).toBe(
      `${MOTOR_FINDER_URL}/motor/aerotech/H128W`,
    );
  });

  it("percent-encodes a designation so an odd character can't break the URL", () => {
    // Some catalog designations carry a suffix; the path segment must stay a single, valid segment.
    expect(checkStockUrl({ manufacturer: "Cesaroni", designation: "P54-6GXL/A" })).toBe(
      "https://motor.fusionspace.co/motor/cesaroni/P54-6GXL%2FA",
    );
  });
});
