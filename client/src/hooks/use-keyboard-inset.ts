import { useEffect, useState } from "react";

export function calculateKeyboardInset(
  layoutViewportHeight: number,
  visualViewportHeight: number,
  threshold = 80,
  visualViewportOffsetTop = 0,
): number {
  const normalizedOffsetTop = Number.isFinite(visualViewportOffsetTop)
    ? Math.max(0, visualViewportOffsetTop)
    : 0;
  const viewportLoss = Math.max(0, layoutViewportHeight - visualViewportHeight);
  if (viewportLoss <= threshold) return 0;

  const bottomOcclusion = Math.max(0, viewportLoss - normalizedOffsetTop);
  // Keep a non-zero "keyboard open" signal when iOS pans the visual viewport
  // by the full occluded height. Consumers such as BottomNav use > 0 to hide,
  // while padding consumers receive only a harmless 1px in this state.
  return Math.max(1, bottomOcclusion);
}

// Shared keyboard-inset detection for mobile typing surfaces.
//
// When the on-screen keyboard opens, iOS Safari/PWA does NOT shrink the layout
// viewport (100dvh ignores the keyboard) — it shrinks only the visualViewport
// and tries to scroll/pan the page so the focused input is visible, which
// slides the header away and leaves the fixed bottom nav floating mid-screen.
// The proven fix (from the ticket-detail page) is to measure how much of the
// layout viewport the keyboard covers via visualViewport and pad the chat
// container by that amount, so the composer sits directly above the keyboard
// while the page itself never scrolls.
//
// The measurement uses the visual viewport's bottom edge:
// window.innerHeight - (vv.height + vv.offsetTop). iOS can pan the visual
// viewport down while focusing an input; counting that top displacement as
// keyboard coverage over-pads the layout and leaves a large blank gap above
// the keyboard. We still actively un-pan the document when an inset is
// detected, then the staged measurements below refine the settled value.
//
// A threshold (default 80px) filters out browser-chrome jitter so only a real
// keyboard registers. On Android Chrome with `interactive-widget=
// resizes-content` the layout viewport itself resizes, so innerHeight and
// vv.height shrink together and this hook correctly reports 0 — no double
// compensation.
export function useKeyboardInset(threshold = 80): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let frame: number | null = null;

    const measure = () => {
      const keyboard = calculateKeyboardInset(
        window.innerHeight,
        vv.height,
        threshold,
        vv.offsetTop,
      );
      setInset(keyboard);
      // iOS panned the visual viewport (or scrolled the document) to chase the
      // focused input; undo it so fixed elements line up with the padded
      // layout instead of drifting mid-screen.
      if (keyboard > 0 && (vv.offsetTop > 0 || window.scrollY > 0)) {
        window.scrollTo(0, 0);
      }
    };

    // iOS can report several intermediate visualViewport sizes while opening
    // the keyboard/accessory bar, and occasionally focus happens before the
    // first viewport event. Sample now, on the next paint, and after the two
    // common settling windows so the final keyboard height always wins.
    const onChange = () => {
      measure();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });
      for (const delay of [80, 250]) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          measure();
        }, delay);
        timers.add(timer);
      }
    };

    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    window.addEventListener("resize", onChange);
    document.addEventListener("focusin", onChange);
    document.addEventListener("focusout", onChange);
    // Rotation changes window.innerHeight without always firing a vv resize
    // first; re-measure so a stale inset can't survive an orientation change.
    window.addEventListener("orientationchange", onChange);
    onChange();
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      document.removeEventListener("focusin", onChange);
      document.removeEventListener("focusout", onChange);
      window.removeEventListener("orientationchange", onChange);
      if (frame !== null) cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [threshold]);

  return inset;
}
