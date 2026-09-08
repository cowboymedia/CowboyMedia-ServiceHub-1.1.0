import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "client/src/pages/community-chat-page.tsx"),
  "utf8",
);

function composerKeyHandler(): string {
  const textareaStart = source.indexOf("<Textarea", source.indexOf('data-testid="button-attach-community-image"'));
  const handlerStart = source.indexOf("onKeyDown={(e) => {", textareaStart);
  const handlerEnd = source.indexOf("\n              }}", handlerStart);

  assert.notEqual(textareaStart, -1, "community message textarea should exist");
  assert.notEqual(handlerStart, -1, "community message textarea should keep its key handler");
  assert.notEqual(handlerEnd, -1, "community message key handler should be readable");

  return source.slice(handlerStart, handlerEnd);
}

test("community chat sends only from the Send button", () => {
  const handler = composerKeyHandler();
  const sendButtonStart = source.indexOf(
    "<Button",
    source.indexOf('data-testid="input-community-message"'),
  );
  const sendButtonEnd = source.indexOf("</Button>", sendButtonStart);
  const sendButton = source.slice(sendButtonStart, sendButtonEnd);

  assert.doesNotMatch(
    handler,
    /handleSend\s*\(/,
    "Enter in the textarea must not submit the message",
  );
  assert.match(sendButton, /onClick=\{handleSend\}/);
  assert.match(sendButton, /data-testid="button-send-community-message"/);
});

test("community chat keeps Enter and Tab navigation for mention suggestions", () => {
  const handler = composerKeyHandler();

  assert.match(handler, /e\.key === "Enter" \|\| e\.key === "Tab"/);
  assert.match(handler, /e\.preventDefault\(\);\s*insertMention\(shown\[mentionIndex\]\.username\);\s*return;/);
});