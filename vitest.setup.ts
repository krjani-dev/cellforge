import '@testing-library/jest-dom/vitest';

// react-window 2 uses ResizeObserver to measure its host container. jsdom
// doesn't ship it; provide a no-op shim so component tests can render.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
