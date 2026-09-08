import type { KeyboardEvent } from "react";

/**
 * Chat composers send only from their Send button. Keep Enter available for
 * native multiline editing while preventing parent keyboard shortcuts from
 * treating it as a submit action.
 */
export function handleSendButtonOnlyComposerKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
): void {
  if (event.key === "Enter") {
    event.stopPropagation();
  }
}