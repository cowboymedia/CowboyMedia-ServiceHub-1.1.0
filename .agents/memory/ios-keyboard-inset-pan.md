---
name: iOS keyboard-inset detection vs viewport pan
description: Why keyboard detection must ignore visualViewport.offsetTop and un-pan with scrollTo(0,0)
---

**Rule:** Detect the on-screen keyboard as `window.innerHeight - visualViewport.height` only. Never subtract `visualViewport.offsetTop`. Re-measure on focus plus immediate/next-frame/delayed viewport settling, and un-pan with `window.scrollTo(0, 0)` when open.

**Why:** iOS pans the visual viewport down (offsetTop grows by ~the keyboard height) to chase the focused input. It can also open the keyboard and predictive/accessory bar in several viewport stages, sometimes focusing before the first resize event. A single measurement can therefore leave the composer hidden.

**How to apply:** Keep one shared detector for all typing surfaces. Consumers should snap to the open inset (not animate underneath the keyboard), re-pin their local scroll pane after inset changes, and retain the normal close transition. Android `interactive-widget=resizes-content` is safe because both heights shrink together.
