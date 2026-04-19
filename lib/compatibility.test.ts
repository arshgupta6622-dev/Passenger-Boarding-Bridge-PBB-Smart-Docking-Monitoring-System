import { describe, it, expect } from "vitest";
import { canAssign, scoreGate } from "./compatibility";
import type { Gate } from "./types";

const narrowGate: Gate = {
  id: "g1", name: "G1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true,
};
const wideGate: Gate = {
  id: "g2", name: "G2", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true,
};
const remoteStand: Gate = {
  id: "g3", name: "G3", compatibleTypes: ["narrow", "regional"], hasJetBridge: false,
};

describe("canAssign", () => {
  it("allows narrow-body on narrow-capable gate", () => {
    expect(canAssign("narrow", narrowGate)).toBe(true);
  });
  it("rejects wide-body on narrow-only gate", () => {
    expect(canAssign("wide", narrowGate)).toBe(false);
  });
  it("allows wide-body on wide-capable gate", () => {
    expect(canAssign("wide", wideGate)).toBe(true);
  });
});

describe("scoreGate", () => {
  it("prefers jet-bridge gate for wide-body", () => {
    expect(scoreGate("wide", wideGate)).toBeGreaterThan(scoreGate("wide", remoteStand));
  });
  it("prefers jet-bridge gate for narrow-body", () => {
    expect(scoreGate("narrow", narrowGate)).toBeGreaterThan(scoreGate("narrow", remoteStand));
  });
});
