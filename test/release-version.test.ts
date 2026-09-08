import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isValidAppVersion,
  updateVersionSource,
} from "../script/release-version";

const source = [
  'export const APP_VERSION = "9.2";',
  "",
  "export function untouched() { return true; }",
  "",
].join("\n");

test("accepts the project's X.Y versions and full X.Y.Z semantic versions", () => {
  assert.equal(isValidAppVersion("10.0"), true);
  assert.equal(isValidAppVersion("10.0.1"), true);
  assert.equal(isValidAppVersion("0.1.0"), true);
});

test("rejects malformed, decorated, and leading-zero versions", () => {
  for (const version of ["", "v10.0", "10", "10.0.0.0", "01.2", "1.02", "1.2-beta"]) {
    assert.equal(isValidAppVersion(version), false, version);
  }
});

test("updates only the central APP_VERSION declaration", () => {
  const updated = updateVersionSource(source, "9.3");
  assert.equal(
    updated,
    source.replace(
      'export const APP_VERSION = "9.2";',
      'export const APP_VERSION = "9.3";',
    ),
  );
});

test("rejects an unchanged version", () => {
  assert.throws(
    () => updateVersionSource(source, "9.2"),
    /already 9\.2/,
  );
});

test("refuses to edit an ambiguous or missing declaration", () => {
  assert.throws(() => updateVersionSource("", "9.3"), /found 0/);
  assert.throws(
    () => updateVersionSource(`${source}${source}`, "9.3"),
    /found 2/,
  );
});

test("release command is code-only and never invokes publish, deploy, or restart", () => {
  const commandSource = readFileSync(
    new URL("../script/release-version.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(commandSource, /npm",\s*\["(?:publish|deploy|start|restart)/);
  assert.doesNotMatch(commandSource, /package-lock\.json/);
});