/**
 * 为 Node 测试环境安装浏览器全局变量（jsdom），便于测试依赖 `window` / `document` 的模块。
 * 与真实浏览器行为一致，仅用于单测；库本身仍面向浏览器运行。
 */
import { JSDOM } from 'jsdom';

export function installBrowserGlobals(options?: { userAgent?: string }): () => void {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://example.com/app',
    pretendToBeVisual: true,
  });
  const w = dom.window as unknown as Window & typeof globalThis;

  const prev: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (!(key in globalThis)) {
      prev[key] = Symbol.for('webnat-test-missing');
    } else {
      prev[key] = (globalThis as unknown as Record<string, unknown>)[key];
    }
    (globalThis as unknown as Record<string, unknown>)[key] = value;
  };

  set('window', w);
  set('self', w);
  set('document', w.document);
  set('navigator', w.navigator);
  set('location', w.location);
  set('MessageEvent', w.MessageEvent);
  set('Event', w.Event);
  set('HTMLElement', w.HTMLElement);

  const ua =
    options?.userAgent ??
    'Mozilla/5.0 (WebnatTest) AppleWebKit/537.36 Webnat/1.0.4 jsdom';
  Object.defineProperty(w.navigator, 'userAgent', {
    value: ua,
    configurable: true,
    writable: true,
  });

  const nodeCrypto = globalThis.crypto;
  if (nodeCrypto) {
    Object.defineProperty(w, 'crypto', {
      value: nodeCrypto,
      configurable: true,
      writable: true,
    });
  }

  return () => {
    for (const [key, value] of Object.entries(prev)) {
      if (value === Symbol.for('webnat-test-missing')) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        (globalThis as unknown as Record<string, unknown>)[key] = value;
      }
    }
  };
}
