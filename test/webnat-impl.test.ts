import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserGlobals } from './helpers/install-dom';
import { WebnatImpl } from '../src/webnat/webnat-impl';
import { Message, Raw } from '../src/webnat/message';

describe('WebnatImpl (jsdom / browser-like)', () => {
  let restore: () => void;

  before(() => {
    restore = installBrowserGlobals();
  });

  after(() => {
    restore();
  });

  it('uses Android JSON bridge: open on load, close on pagehide', () => {
    const native: string[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(s);
        },
      };

    const impl = new WebnatImpl();
    assert.equal(native.length >= 1, true);
    const first = JSON.parse(native[0]!) as { from: string; open?: unknown };
    assert.ok(first.open);

    window.dispatchEvent(new Event('pagehide'));

    const parsed = native.slice(1).map((s) => JSON.parse(s) as { close?: unknown; from: string });
    const selfClose = parsed.find((m) => m.close && m.from === first.from);
    assert.ok(selfClose, 'expected close for main connection after pagehide');
  });

  it('receive routes Native → Web raw when to matches connection id', () => {
    const native: string[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(s);
        },
      };

    const impl = new WebnatImpl();
    const selfId = (JSON.parse(native[0]!) as { from: string }).from;

    let got: unknown;
    impl.onRaw((p) => {
      got = p;
    });

    impl.receive(new Message(Message.NATIVE_UUID, selfId, undefined, undefined, new Raw({ x: 1 })));
    assert.deepEqual(got, { x: 1 });
  });

  it('receive ignores wrong magic', () => {
    const native: string[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(s);
        },
      };

    const impl = new WebnatImpl();
    const selfId = (JSON.parse(native[0]!) as { from: string }).from;

    let n = 0;
    impl.onRaw(() => {
      n++;
    });

    const good = new Message(Message.NATIVE_UUID, selfId, undefined, undefined, new Raw(1));
    impl.receive({ ...good, magic: 'NOT_WEBNAT' } as Message);
    assert.equal(n, 0);
  });

  it('proxies close when transmit postMessage throws', () => {
    const native: unknown[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(JSON.parse(s));
        },
      };

    const impl = new WebnatImpl();

    const iframeId = 'iframe-conn-1';
    const openData = {
      from: iframeId,
      to: Message.NATIVE_UUID,
      magic: Message.MAGIC,
      open: { param: {} },
    };
    const badSource = {
      postMessage() {
        throw new Error('iframe gone');
      },
    };
    window.dispatchEvent(
      new MessageEvent('message', {
        data: openData,
        source: badSource as unknown as Window,
      })
    );

    impl.receive(
      new Message(Message.NATIVE_UUID, iframeId, undefined, undefined, new Raw({ relay: true }))
    );

    assert.ok(
      native.some(
        (m: any) => m.close && m.from === iframeId
      ),
      'expected synthetic close for unreachable iframe'
    );
  });

  it('uses iOS object bridge when webkit handler is present', () => {
    const objects: unknown[] = [];
    const win = window as unknown as {
      webkit?: { messageHandlers?: { __native_webnat__?: { postMessage: (o: unknown) => void } } };
    };
    win.webkit = {
      messageHandlers: {
        __native_webnat__: {
          postMessage(o: unknown) {
            objects.push(o);
          },
        },
      },
    };

    const impl = new WebnatImpl();
    assert.equal(objects.length >= 1, true);
    assert.equal(typeof objects[0], 'object');
    assert.ok((objects[0] as any).open);

    window.dispatchEvent(new Event('pagehide'));
  });
});
