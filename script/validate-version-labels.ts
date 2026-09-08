import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ACTIVE_DIRS = ["client/src", "server"];
const HISTORICAL_UI = new Set([
  "client/src/components/welcome-v7-dialog.tsx",
]);

const VERSION_LABEL_PATTERNS = [
  /\bVersion\s+(\d+\.\d+(?:\.\d+)*)\b/g,
  /\bv(\d+\.\d+(?:\.\d+)*)\b/g,
  /\bversion\s*[:=]\s*["'](\d+\.\d+(?:\.\d+)*)["']/g,
];

export function findHardcodedVersionLabels(source: string): string[] {
  const matches = new Set<string>();
  for (const pattern of VERSION_LABEL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) matches.add(match[0]);
  }
  return [...matches];
}

export function findHardcodedVersionLabelsInCode(source: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    false,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const matches = new Set<string>();
  function visit(node: ts.Node): void {
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
      for (const label of findHardcodedVersionLabels(node.text)) matches.add(label);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return [...matches];
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [fullPath] : [];
  }));
  return files.flat();
}

function requirePattern(source: string, pattern: RegExp, message: string, failures: string[]): void {
  if (!pattern.test(source)) failures.push(message);
}

export async function validateVersionLabels(root = ROOT): Promise<string[]> {
  const failures: string[] = [];
  const versionSource = await readFile(path.join(root, "shared/version.ts"), "utf8");
  const versionMatch = versionSource.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  if (!versionMatch) return ["shared/version.ts must export a string APP_VERSION"];
  const appVersion = versionMatch[1];

  for (const relativeDir of ACTIVE_DIRS) {
    for (const fullPath of await sourceFiles(path.join(root, relativeDir))) {
      const relativePath = path.relative(root, fullPath).replaceAll(path.sep, "/");
      if (HISTORICAL_UI.has(relativePath)) continue;
      const source = await readFile(fullPath, "utf8");
      for (const label of findHardcodedVersionLabelsInCode(source, relativePath)) {
        failures.push(`${relativePath}: hardcoded release label "${label}"; use APP_VERSION`);
      }
    }
  }

  const badge = await readFile(path.join(root, "client/src/components/version-badge.tsx"), "utf8");
  requirePattern(badge, /import\s*\{[^}]*\bAPP_VERSION\b[^}]*\}\s*from\s*["']@shared\/version["']/, "version badge must import APP_VERSION", failures);
  requirePattern(badge, /versionAnchor\(APP_VERSION\)/, "version badge link must derive from APP_VERSION", failures);
  requirePattern(badge, /aria-label=\{`Version \$\{APP_VERSION\}/, "version badge aria-label must derive from APP_VERSION", failures);
  requirePattern(badge, />\s*v\{APP_VERSION\}/, "version badge text must derive from APP_VERSION", failures);

  const index = await readFile(path.join(root, "server/index.ts"), "utf8");
  requirePattern(index, /app\.get\(["']\/api\/health["'][\s\S]*?version:\s*APP_VERSION/, "/api/health version must derive from APP_VERSION", failures);

  const routes = await readFile(path.join(root, "server/routes.ts"), "utf8");
  requirePattern(routes, /getChangelogEntry\(APP_VERSION\)/, "pending-publish API must select APP_VERSION", failures);
  requirePattern(routes, /version\s*!==\s*APP_VERSION/, "publish API must gate against APP_VERSION", failures);
  requirePattern(routes, /current version \(\$\{APP_VERSION\}\)/, "publish API error must derive from APP_VERSION", failures);

  if (failures.length === 0) {
    console.log(`Version-label validation passed (APP_VERSION ${appVersion}).`);
  }
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = await validateVersionLabels();
  if (failures.length > 0) {
    console.error("Version-label validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}