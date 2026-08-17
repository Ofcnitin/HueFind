import assert from "node:assert/strict";

function normalizeHex(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toUpperCase()}`;
}

function hexToRgb(hex) {
  const clean = hex.slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function colorDistance(a, b) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return Math.sqrt(
    ((ar.r - br.r) ** 2) +
    ((ar.g - br.g) ** 2) +
    ((ar.b - br.b) ** 2)
  );
}

assert.equal(normalizeHex("#8b5cf6"), "#8B5CF6");
assert.equal(normalizeHex("FFFFFF"), "#FFFFFF");
assert.equal(normalizeHex("#fff"), null);
assert.equal(normalizeHex("hello"), null);
assert.ok(colorDistance("#FFFFFF", "#FFFFFF") === 0);
assert.ok(colorDistance("#FFFFFF", "#000000") > colorDistance("#FFFFFF", "#EEEEEE"));

console.log("HueFind core checks passed.");
