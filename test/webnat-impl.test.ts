import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserGlobals } from './helpers/install-dom';
import { WebnatImpl } from '../src/webnat/webnat-impl';
import { WebnatError, WebnatErrorCode } from '../src/webnat/error';
import { Invoke, Message, Raw } from '../src/webnat/message';

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

  it('method() rejects at once with SERIALIZATION_FAILED when the parameter cannot be serialized (JSON bridge)', async () => {
    const native: string[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(s);
        },
      };

    const impl = new WebnatImpl();
    await assert.rejects(
      impl.method({ method: 'x', param: 10n as never }, { timeout: 1000 }),
      (error: { code?: number }) => error.code === WebnatErrorCode.SERIALIZATION_FAILED
    );
    assert.equal(
      native.some((s) => (JSON.parse(s) as { invoke?: unknown }).invoke !== undefined),
      false,
      'an unserializable call is not sent'
    );

    window.dispatchEvent(new Event('pagehide'));
  });

  it('answers a handler that throws (synchronously or not) or returns an unserializable result with an error reply', async () => {
    const native: string[] = [];
    (window as unknown as { __native_webnat__: { postMessage: (s: string) => void } }).__native_webnat__ =
      {
        postMessage(s: string) {
          native.push(s);
        },
      };

    const impl = new WebnatImpl();
    const selfId = (JSON.parse(native[0]!) as { from: string }).from;
    impl.onMethod('throws-sync', (() => {
      throw new Error('boom');
    }) as never);
    impl.onMethod('throws-webnat-error', (() => {
      throw new WebnatError(123, 'denied');
    }) as never);
    impl.onMethod('big', async () => 10n as never);
    for (const [id, method] of [['call-1', 'throws-sync'], ['call-2', 'throws-webnat-error'], ['call-3', 'big']]) {
      impl.receive(new Message(Message.NATIVE_UUID, selfId, undefined, undefined, undefined, undefined, new Invoke(id!, method!)));
    }
    await new Promise((resolve) => setTimeout(resolve, 10));

    const replies = native
      .map((s) => JSON.parse(s) as { reply?: { id: string; result?: unknown; error?: { code: number; message: string } } })
      .filter((m) => m.reply)
      .map((m) => m.reply!);
    const errorOf = (id: string) => replies.find((r) => r.id === id)?.error;
    assert.deepEqual(errorOf('call-1'), { code: WebnatErrorCode.UNKNOWN, message: 'boom' });
    assert.deepEqual(errorOf('call-2'), { code: 123, message: 'denied' });
    assert.equal(errorOf('call-3')?.code, WebnatErrorCode.SERIALIZATION_FAILED);
    assert.equal(replies.find((r) => r.id === 'call-3')?.result, undefined);

    window.dispatchEvent(new Event('pagehide'));
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

  it('maps a DataCloneError of the iOS bridge to SERIALIZATION_FAILED and leaves other bridge errors alone', async () => {
    const win = window as unknown as {
      webkit?: { messageHandlers?: { __native_webnat__?: { postMessage: (o: unknown) => void } } };
    };
    let failure: Error | undefined;
    win.webkit = {
      messageHandlers: {
        __native_webnat__: {
          postMessage(o: unknown) {
            if (failure && (o as { invoke?: unknown }).invoke) {
              throw failure;
            }
          },
        },
      },
    };
    try {
      const impl = new WebnatImpl();
      failure = new DOMException('could not be cloned', 'DataCloneError');
      await assert.rejects(
        impl.method({ method: 'x' }, { timeout: 1000 }),
        (error: { code?: number }) => error.code === WebnatErrorCode.SERIALIZATION_FAILED
      );
      failure = new Error('bridge went away');
      await assert.rejects(
        impl.method({ method: 'x' }, { timeout: 1000 }),
        (error: Error) => error.message === 'bridge went away'
      );
      window.dispatchEvent(new Event('pagehide'));
    } finally {
      delete win.webkit;
    }
  });
});
