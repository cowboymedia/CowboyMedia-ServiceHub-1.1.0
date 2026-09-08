---
name: iOS keyboard-inset detection vs viewport pan
description: Measure iOS keyboard occlusion from the visual viewport bottom edge and un-pan the document
---

**Rule:** Detect keyboard opening from `window.innerHeight - visualViewport.height`, then derive padding from the visual viewport bottom edge by subtracting `offsetTop`. If iOS pan consumes the full padding inset, retain a minimal nonzero open signal. Re-measure across viewport settling and un-pan with `window.scrollTo(0, 0)`.

**Why:** iOS resizes and pans the visual viewport in stages. Ignoring a retained positive `offsetTop` counts top displacement as keyboard coverage, over-padding the layout and leaving the composer floating far above the keyboard.

**How to apply:** Keep one shared detector for all typing surfaces. Threshold raw viewport loss, use bottom-edge occlusion for padding, clamp to a 1px open sentinel after full pan, snap open, re-pin local scroll, and retain the close transition. Android `interactive-widget=resizes-content` stays safe because both heights shrink together.
