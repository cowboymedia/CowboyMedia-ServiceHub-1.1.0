import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findHardcodedVersionLabels,
  findHardcodedVersionLabelsInCode,
  validateVersionLabels,
} from "../script/validate-version-labels";

test("release version surfaces use APP_VERSION", async () => {
  assert.deepEqual(await validateVersionLabels(), []);
});

test("conflicting active release labels are detected", () => {
  assert.deepEqual(
    findHardcodedVersionLabelsInCode(
      'const badge = "Version 9.3"; const short = <span>v9.3</span>;',
      "sample.tsx",
    ),
    ["Version 9.3", "v9.3"],
  );
});

test("unrelated prices and sample numbers are allowed", () => {
  assert.deepEqual(
    findHardcodedVersionLabels('const monthlyPrice = "$9.20"; const sample = 9.2;'),
    [],
  );
  assert.deepEqual(
    findHardcodedVersionLabelsInCode("// Tailwind v3.4\nconst price = '$9.20';", "sample.ts"),
    [],
  );
});