import { after, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Focused regression coverage for the mobile admin chat container. The shared
// keyboard hook is exercised through the real AdminChatTab so positive iPhone
// visualViewport offsets cannot silently reintroduce composer overlap or a
// large blank gap.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/admin",
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
  "MessageEvent", "NodeFilter", "DOMException", "MutationObserver", "FormData",
] as const) {
  if (w[key] !== undefined) g[key] = w[key];
}

const rafImpl: typeof requestAnimationFrame = (callback) =>
  setTimeout(() => callback(Date.now()), 0) as unknown as number;
const cafImpl: typeof cancelAnimationFrame = (id) =>
  clearTimeout(id as unknown as NodeJS.Timeout);
g.requestAnimationFrame = rafImpl;
g.cancelAnimationFrame = cafImpl;
w.requestAnimationFrame = rafImpl;
w.cancelAnimationFrame = cafImpl;

class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
g.ResizeObserver = ResizeObserverStub;
w.ResizeObserver = ResizeObserverStub;

class DOMRectStub implements DOMRect {
  x = 0; y = 0; width = 0; height = 0;
  top = 0; right = 0; bottom = 0; left = 0;
  toJSON(): unknown { return this; }
}
g.DOMRect = DOMRectStub;
w.DOMRect = DOMRectStub;

const elementPrototype = window.HTMLElement.prototype as unknown as {
  hasPointerCapture?: () => boolean;
  setPointerCapture?: () => void;
  releasePointerCapture?: () => void;
  scrollIntoView?: () => void;
  getBoundingClientRect: () => DOMRect;
};
elementPrototype.hasPointerCapture ??= () => false;
elementPrototype.setPointerCapture ??= () => {};
elementPrototype.releasePointerCapture ??= () => {};
elementPrototype.scrollIntoView ??= () => {};
elementPrototype.getBoundingClientRect = () => new DOMRectStub();

const matchMediaImpl = (query: string) => ({
  matches: true,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() { return false; },
});
g.matchMedia = matchMediaImpl;
w.matchMedia = matchMediaImpl;
w.scrollTo = () => {};

Object.defineProperty(window, "innerWidth", {
  value: 390,
  configurable: true,
  writable: true,
});
Object.defineProperty(window, "innerHeight", {
  value: 800,
  configurable: true,
  writable: true,
});

type ViewportListener = () => void;
const viewportListeners = new Map<string, Set<ViewportListener>>();
const visualViewportStub = {
  height: 800,
  offsetTop: 0,
  addEventListener(type: string, listener: ViewportListener) {
    if (!viewportListeners.has(type)) viewportListeners.set(type, new Set());
    viewportListeners.get(type)!.add(listener);
  },
  removeEventListener(type: string, listener: ViewportListener) {
    viewportListeners.get(type)?.delete(listener);
  },
};
Object.defineProperty(window, "visualViewport", {
  value: visualViewportStub,
  configurable: true,
});

class WebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = WebSocketStub.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send(): void {}
  close(): void { this.readyState = WebSocketStub.CLOSED; }
  addEventListener(): void {}
  removeEventListener(): void {}
}
g.WebSocket = WebSocketStub as unknown as typeof WebSocket;
w.WebSocket = WebSocketStub as unknown as typeof WebSocket;
g.IS_REACT_ACT_ENVIRONMENT = true;

const ADMIN_USER = {
  id: "admin-1",
  role: "master_admin",
  fullName: "Avery Admin",
  username: "avery",
  email: "avery@example.com",
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

const realFetch = globalThis.fetch;
g.fetch = async (input: unknown): Promise<Response> => {
  const url = typeof input === "string"
    ? input
    : String((input as { url?: string }).url ?? input);
  const pathname = url.split("?")[0];
  if (pathname === "/api/auth/me") return jsonResponse(ADMIN_USER);
  if (pathname === "/api/admin/my-permissions") return jsonResponse({ permissions: [] });
  if (pathname === "/api/admin/chat/threads") return jsonResponse([]);
  if (pathname === "/api/admin/chat/users") return jsonResponse([]);
  if (pathname === "/api/admin/chat/unread-threads") return jsonResponse([]);
  if (pathname === "/api/admin/chat/threads/thread-1/messages") return jsonResponse([]);
  return jsonResponse({});
};

after(() => {
  g.fetch = realFetch;
  try { window.close(); } catch {}
});

const React = await import("react");
g.React = React;
w.React = React;
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { getQueryFn } = await import("../client/src/lib/queryClient");
const { AuthProvider } = await import("../client/src/lib/auth");
const { GlobalSocketProvider } = await import("../client/src/contexts/global-socket-context");
const { AdminChatTab } = await import("../client/src/pages/admin-portal");

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function setViewport(
  layoutHeight: number,
  visualHeight: number,
  offsetTop: number,
  event: "resize" | "orientationchange" = "resize",
): Promise<void> {
  Object.defineProperty(window, "innerHeight", {
    value: layoutHeight,
    configurable: true,
    writable: true,
  });
  visualViewportStub.height = visualHeight;
  visualViewportStub.offsetTop = offsetTop;
  await act(async () => {
    if (event === "resize") {
      for (const listener of viewportListeners.get("resize") ?? []) listener();
    } else {
      window.dispatchEvent(new window.Event("orientationchange"));
    }
  });
  await flush();
}

function chatContainer(): HTMLElement {
  const container = window.document.querySelector<HTMLElement>(
    '[data-testid="admin-chat-container"]',
  );
  assert.ok(container, "mobile admin chat rendered");
  return container;
}

function serializedHeight(inset: number): string {
  const scratch = window.document.createElement("div");
  scratch.style.height = `calc(100dvh - 12rem - ${inset}px)`;
  return scratch.style.height;
}

test("mobile admin chat height follows iPhone keyboard pan and restores after close or rotation", async () => {
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "returnNull" }),
        retry: false,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        gcTime: 0,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  queryClient.setQueryData(["/api/auth/me"], ADMIN_USER);

  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            GlobalSocketProvider,
            {
              userId: ADMIN_USER.id,
              children: React.createElement(AdminChatTab, {
                initialThreadId: "thread-1",
              }),
            },
          ),
        ),
      ),
    );
  });
  await flush();

  try {
    assert.equal(
      chatContainer().style.height,
      serializedHeight(0),
      "closed keyboard keeps the normal mobile chat height",
    );

    await setViewport(800, 480, 140);
    assert.equal(
      chatContainer().style.height,
      serializedHeight(180),
      "partial pan subtracts only the 180px bottom occlusion",
    );

    await setViewport(800, 480, 320);
    assert.equal(
      chatContainer().style.height,
      serializedHeight(1),
      "full pan retains only the 1px keyboard-open signal without a large gap",
    );

    await setViewport(800, 800, 0);
    assert.equal(
      chatContainer().style.height,
      serializedHeight(0),
      "keyboard close restores the normal height",
    );

    await setViewport(800, 480, 140);
    await setViewport(700, 700, 0, "orientationchange");
    assert.equal(
      chatContainer().style.height,
      serializedHeight(0),
      "rotation-like viewport changes clear the stale keyboard inset",
    );
  } finally {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  }
});