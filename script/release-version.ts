import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const VERSION_FILE = "shared/version.ts";
const VERSION_DECLARATION =
  /export const APP_VERSION = "([^"]+)";/g;
const SEMANTIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;
const FOCUSED_TESTS = [
  "test/release-version.test.ts",
  "test/changelog-rollover.test.ts",
  "test/version-badge.test.ts",
];

export function isValidAppVersion(version: string): boolean {
  return SEMANTIC_VERSION.test(version);
}

export function updateVersionSource(source: string, targetVersion: string): string {
  if (!isValidAppVersion(targetVersion)) {
    throw new Error(
      `"${targetVersion}" is not a valid semantic version (expected X.Y or X.Y.Z with no leading zeroes).`,
    );
  }

  const matches = [...source.matchAll(VERSION_DECLARATION)];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one APP_VERSION declaration in ${VERSION_FILE}; found ${matches.length}.`,
    );
  }

  const currentVersion = matches[0][1];
  if (currentVersion === targetVersion) {
    throw new Error(`APP_VERSION is already ${targetVersion}; choose a new version.`);
  }

  return source.replace(
    `export const APP_VERSION = "${currentVersion}";`,
    `export const APP_VERSION = "${targetVersion}";`,
  );
}

export function releaseVersion(targetVersion: string): void {
  const originalSource = readFileSync(VERSION_FILE, "utf8");
  const updatedSource = updateVersionSource(originalSource, targetVersion);

  writeFileSync(VERSION_FILE, updatedSource);
  console.log(`Updated APP_VERSION to ${targetVersion}. Running focused release checks...`);

  const result = spawnSync(
    "npm",
    ["test", "--", ...FOCUSED_TESTS],
    { stdio: "inherit" },
  );

  if (result.error || result.status !== 0) {
    writeFileSync(VERSION_FILE, originalSource);
    const detail = result.error?.message ?? `tests exited with status ${result.status}`;
    throw new Error(`Release checks failed (${detail}); restored the previous APP_VERSION.`);
  }

  console.log(`
Release code checks passed.

Next step: restart the application separately. On startup, the rolling changelog
will be stamped as v${targetVersion} and left awaiting publish.

This command did not change npm package metadata, publish release notes, restart,
deploy, or otherwise release the application. Those actions remain explicit.
`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    throw new Error("Usage: npm run release:version -- <target-version>");
  }
  releaseVersion(args[0]);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}