import { test, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/tickets/ticket-1",
});
const { window } = dom;
type GlobalShim = Record<string, unknown>;
const g = globalThis as unknown as GlobalShim;
const w = window as unknown as GlobalShim;
g.window = window;
g.document = window.document;
g.navigator = window.navigator;
g.getComputedStyle = window.getComputedStyle.bind(window);

for (const key of [
  "HTMLElement", "HTMLTextAreaElement", "HTMLInputElement", "HTMLButtonElement",
  "HTMLSelectElement", "HTMLAnchorElement", "HTMLDivElement", "Element", "Node",
  "Document", "DocumentFragment", "ShadowRoot", "Event", "CustomEvent",
  "MouseEvent", "PointerEvent", "FocusEvent", "KeyboardEvent", "InputEvent",
  "MessageEvent", "NodeFilter", "DOMException", "MutationObserver",
] as const) {
  if (w[key] !== undefined) g[key] = w[key];
}

const rafImpl: typeof requestAnimationFrame = (cb) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
const cafImpl: typeof cancelAnimationFrame = (id) =>
  clearTimeout(id as unknown as NodeJS.Timeout);
g.requestAnimationFrame = rafImpl;
g.cancelAnimationFrame = cafImpl;
w.requestAnimationFrame = rafImpl;
w.cancelAnimationFrame = cafImpl;
window.scrollTo = () => {};

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
g.ResizeObserver = ResizeObserverStub;
w.ResizeObserver = ResizeObserverStub;

const proto = window.HTMLElement.prototype as HTMLElement & {
  scrollIntoView?: () => void;
  hasPointerCapture?: () => boolean;
  setPointerCapture?: () => void;
  releasePointerCapture?: () => void;
};
proto.scrollIntoView ??= () => {};
proto.hasPointerCapture ??= () => false;
proto.setPointerCapture ??= () => {};
proto.releasePointerCapture ??= () => {};

const matchMediaImpl = (query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  dispatchEvent() { return false; },
});
g.matchMedia = matchMediaImpl;
w.matchMedia = matchMediaImpl;

Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });
type VvListener = () => void;
const vvListeners = new Map<string, Set<VvListener>>();
const visualViewportStub = {
  height: 800,
  offsetTop: 0,
  addEventListener(type: string, cb: VvListener) {
    if (!vvListeners.has(type)) vvListeners.set(type, new Set());
    vvListeners.get(type)!.add(cb);
  },
  removeEventListener(type: string, cb: VvListener) {
    vvListeners.get(type)?.delete(cb);
  },
};
Object.defineProperty(window, "visualViewport", { value: visualViewportStub, configurable: true });
const fireViewportResize = () => {
  for (const cb of vvListeners.get("resize") ?? []) cb();
};

class WebSocketStub {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  readyState = 0;
  onopen = null; onmessage = null; onclose = null; onerror = null;
  send(): void {}
  close(): void { this.readyState = 3; }
  addEventListener(): void {}
  removeEventListener(): void {}
}
g.WebSocket = WebSocketStub;
w.WebSocket = WebSocketStub;
g.IS_REACT_ACT_ENVIRONMENT = true;

const USER = {
  id: "cust-1", role: "customer", fullName: "Casey Customer",
  username: "casey", email: "casey@example.com",
};
const TICKET = {
  id: "ticket-1", subject: "Keyboard spacing", description: "Please help",
  serviceId: null, categoryId: null, status: "open", priority: "medium",
  customerId: "cust-1", claimedBy: null, imageUrl: null, resolutionNote: null,
  closedBy: null, createdAt: "2026-09-08T00:00:00.000Z", closedAt: null,
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}
const realFetch = globalThis.fetch;
g.fetch = async (input: unknown): Promise<Response> => {
  const path = (typeof input === "string" ? input : String((input as { url?: string }).url ?? input)).split("?")[0];
  if (path === "/api/auth/me") return jsonResponse(USER);
  if (path === "/api/admin/my-permissions") return jsonResponse({ permissions: [] });
  if (path === "/api/tickets/ticket-1") return jsonResponse(TICKET);
  if (path === "/api/tickets/ticket-1/messages") return jsonResponse([]);
  if (path === "/api/services" || path === "/api/ticket-categories") return jsonResponse([]);
  if (path === "/api/business-hours/status") return jsonResponse({ isOpen: true });
  return jsonResponse({});
};

const React = await import("react");
g.React = React;
w.React = React;
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { getQueryFn } = await import("../client/src/lib/queryClient");
const { AuthProvider } = await import("../client/src/lib/auth");
const { Router, Route } = await import("wouter");
const { memoryLocation } = await import("wouter/memory-location");
const TicketDetail = (await import("../client/src/pages/ticket-detail")).default;

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await act(async () => { await new Promise<void>((resolve) => setTimeout(resolve, 0)); });
  }
}

test("ticket-detail composer tracks panned iPhone keyboard through delayed resize and close", async () => {
  visualViewportStub.height = 800;
  visualViewportStub.offsetTop = 0;
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { queryFn: getQueryFn({ on401: "returnNull" }), retry: false, refetchInterval: false, staleTime: Infinity, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const { hook } = memoryLocation({ path: "/tickets/ticket-1" });
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(AuthProvider, null,
          React.createElement(Router, {
            hook,
            children: React.createElement(Route, { path: "/tickets/:id", component: TicketDetail }),
          }),
        ),
      ),
    );
  });
  await flush();

  try {
    const view = container.querySelector<HTMLElement>('[data-testid="ticket-detail-view"]');
    assert.ok(view, "ticket detail rendered");
    assert.equal(view.style.paddingBottom, "", "jsdom drops the unsupported CSS env() closed-state value");

    visualViewportStub.height = 480;
    visualViewportStub.offsetTop = 140;
    await act(async () => fireViewportResize());
    await flush();
    assert.equal(view.style.paddingBottom, "180px", "uses bottom-edge occlusion instead of raw 320px loss");

    visualViewportStub.height = 450;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await flush();
    assert.equal(view.style.paddingBottom, "210px", "delayed resize settles to the latest bottom edge");

    visualViewportStub.height = 800;
    visualViewportStub.offsetTop = 0;
    await act(async () => fireViewportResize());
    await flush();
    // jsdom rejects CSS env() assignments and leaves the previous valid inline
    // padding serialized. The transition branch still proves the rendered
    // component returned to keyboardInset=0 (real browsers accept env()).
    assert.equal(view.style.transition, "padding-bottom 150ms ease-out", "keyboard-open state clears on close");
  } finally {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
  }
});

after(() => {
  g.fetch = realFetch;
  window.close();
});