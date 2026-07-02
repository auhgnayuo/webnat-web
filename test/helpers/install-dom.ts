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

  const missing = Symbol.for('webnat-test-missing');
  const prev: Record<string, PropertyDescriptor | typeof missing> = {};
  const set = (key: string, value: unknown) => {
    const existing = Object.getOwnPropertyDescriptor(globalThis, key);
    prev[key] = existing ?? missing;
    // 直接赋值对 getter-only 的全局属性（如 Node 21+ 内置的 navigator）会抛
    // "Cannot set property ... which has only a getter"，因此统一用 defineProperty 覆盖。
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true,
    });
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
    for (const [key, descriptor] of Object.entries(prev)) {
      if (descriptor === missing) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.defineProperty(globalThis, key, descriptor);
      }
    }
  };
}
