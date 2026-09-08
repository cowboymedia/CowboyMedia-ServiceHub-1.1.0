import { useEffect, useState } from "react";

export function calculateKeyboardInset(
  layoutViewportHeight: number,
  visualViewportHeight: number,
  threshold = 80,
): number {
  const keyboard = Math.max(0, layoutViewportHeight - visualViewportHeight);
  return keyboard > threshold ? keyboard : 0;
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
// The measurement: window.innerHeight - vv.height is the keyboard height
// (plus any browser chrome). Crucially, vv.offsetTop must NOT be subtracted
// from the detection: when iOS *pans* the visual viewport down to reveal the
// focused input, offsetTop grows by roughly the keyboard height and would
// cancel the measurement to ~0 — the exact moment compensation is needed most
// (nav floats mid-screen, no padding applied). Instead, when a keyboard is
// detected while iOS has panned/scrolled, we actively un-pan via
// window.scrollTo(0, 0) so the layout snaps back and the padding does its job.
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
      const keyboard = calculateKeyboardInset(window.innerHeight, vv.height, threshold);
      const open = keyboard > 0;
      setInset(keyboard);
      // iOS panned the visual viewport (or scrolled the document) to chase the
      // focused input; undo it so fixed elements line up with the padded
      // layout instead of drifting mid-screen.
      if (open && (vv.offsetTop > 0 || window.scrollY > 0)) {
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
