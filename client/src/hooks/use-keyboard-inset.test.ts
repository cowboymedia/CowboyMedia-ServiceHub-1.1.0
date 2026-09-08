import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateKeyboardInset } from "./use-keyboard-inset.js";

test("returns the covered viewport height for an iOS keyboard", () => {
  assert.equal(calculateKeyboardInset(844, 503), 341);
});

test("ignores browser chrome jitter below the keyboard threshold", () => {
  assert.equal(calculateKeyboardInset(844, 780), 0);
  assert.equal(calculateKeyboardInset(844, 764), 0);
});

test("does not double-compensate when the layout and visual viewports both resize", () => {
  assert.equal(calculateKeyboardInset(503, 503), 0);
});

test("never returns a negative inset during viewport transition noise", () => {
  assert.equal(calculateKeyboardInset(700, 720), 0);
});