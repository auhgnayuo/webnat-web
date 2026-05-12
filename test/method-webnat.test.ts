import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Message } from '../src/webnat/message';
import { MethodWebnat } from '../src/webnat/method-webnat';
import { WebnatError, WebnatErrorCode } from '../src/webnat/error';

describe('MethodWebnat', () => {
  it('resolves with reply result', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));

    const promise = rpc.method({ method: 'sum', param: { a: 1, b: 2 } });
    const invokeMessage = sent.find((m) => m.invoke);
    assert.ok(invokeMessage?.invoke);

    const id = invokeMessage!.invoke!.id;
    await rpc.receive(Message.reply('self', id, { value: 3 }));

    const result = await promise;
    assert.deepEqual(result, { value: 3 });
  });

  it('rejects with timeout and emits abort', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));

    const promise = rpc.method({ method: 'slow' }, { timeout: 10 });
    await assert.rejects(promise, (err: any) => err?.code === WebnatErrorCode.TIMEOUT);

    const hasAbort = sent.some((m) => m.abort);
    assert.equal(hasAbort, true);
  });

  it('supports cancel via AbortSignal', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));
    const controller = new AbortController();

    const promise = rpc.method({ method: 'cancelMe' }, { signal: controller.signal });
    controller.abort();

    await assert.rejects(promise, (err: any) => err?.code === WebnatErrorCode.CANCELLED);
    const hasAbort = sent.some((m) => m.abort);
    assert.equal(hasAbort, true);
  });

  it('forwards notify messages to callback', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));
    let notified: any = null;

    const promise = rpc.method(
      { method: 'notifyMe' },
      {
        onNotification: (param) => {
          notified = param;
        },
      }
    );

    const invokeMessage = sent.find((m) => m.invoke);
    assert.ok(invokeMessage?.invoke);
    const id = invokeMessage!.invoke!.id;

    await rpc.receive(Message.notify('self', id, { progress: 50 }));
    await rpc.receive(Message.reply('self', id, { ok: true }));
    await promise;

    assert.deepEqual(notified, { progress: 50 });
  });

  it('returns unimplemented error when method not registered', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));

    await rpc.receive(Message.invoke('self', 'rid-1', 'missingMethod', null));

    const reply = sent.find((m) => m.reply?.id === 'rid-1');
    assert.ok(reply?.reply);
    assert.equal((reply!.reply!.error as any)?.code, WebnatErrorCode.UNIMPLEMENTED);
  });

  it('rejects immediately when signal is already aborted', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('self', (message: Message) => sent.push(message));
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      rpc.method({ method: 'x' }, { signal: controller.signal }),
      (err: any) => err?.code === WebnatErrorCode.CANCELLED
    );

    // 不应发出任何 invoke / abort 消息：调用在最早期就被拒绝
    assert.equal(sent.length, 0);
  });

  it('invoke: registered listener result becomes reply', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    rpc.on('add', async (param) => ({ sum: (param as { a: number }).a + (param as { b: number }).b }));
    await rpc.receive(Message.invoke('conn', 'rid-9', 'add', { a: 2, b: 3 }));
    const reply = sent.find((m) => m.reply?.id === 'rid-9');
    assert.deepEqual(reply?.reply?.result, { sum: 5 });
  });

  it('invoke: listener rejection produces error reply', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    rpc.on('bad', async () => {
      throw new Error('nope');
    });
    await rpc.receive(Message.invoke('conn', 'rid-e', 'bad', null));
    const reply = sent.find((m) => m.reply?.id === 'rid-e');
    assert.ok(reply?.reply?.error);
  });

  it('invoke: notify from listener emits notify messages', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    rpc.on('work', async (_p, _s, notify) => {
      notify({ step: 1 });
      return { done: true };
    });
    await rpc.receive(Message.invoke('conn', 'rid-n', 'work', null));
    const notifies = sent.filter((m) => m.notify?.id === 'rid-n');
    assert.equal(notifies.length, 1);
    assert.deepEqual(notifies[0].notify!.param, { step: 1 });
  });

  it('invoke: abort cancels in-flight listener', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    rpc.on('block', async (_p, signal) => {
      await new Promise<null>((_, reject) => {
        if (signal.aborted) {
          reject(WebnatError.cancelled());
          return;
        }
        signal.addEventListener('abort', () => reject(WebnatError.cancelled()), { once: true });
      });
      return null;
    });
    const p = rpc.receive(Message.invoke('conn', 'rid-a', 'block', null));
    await rpc.receive(Message.abort('conn', 'rid-a'));
    await p;
    const reply = sent.find((m) => m.reply?.id === 'rid-a');
    assert.ok(reply?.reply?.error);
    assert.equal((reply!.reply!.error as { code: number }).code, WebnatErrorCode.CANCELLED);
  });

  it('receive throws on invalid invoke id', async () => {
    const rpc = new MethodWebnat('conn', () => {});
    await assert.rejects(
      rpc.receive(Message.invoke('conn', '', 'm', null)),
      /call ID must be string/
    );
  });

  it('unload rejects pending outbound method calls', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    const pending = rpc.method({ method: 'never' }, { timeout: 60_000 });
    rpc.unload();
    await assert.rejects(pending, (err: any) => err?.code === WebnatErrorCode.CLOSED);
    assert.ok(sent.some((m) => m.invoke));
  });

  it('off removes handler only when reference matches', async () => {
    const sent: Message[] = [];
    const rpc = new MethodWebnat('conn', (m) => sent.push(m));
    const h = async () => ({ ok: true });
    rpc.on('x', h);
    rpc.off('x', async () => ({ ok: false }));
    await rpc.receive(Message.invoke('conn', 'i-off', 'x', null));
    const reply = sent.find((m) => m.reply?.id === 'i-off');
    assert.deepEqual(reply?.reply?.result, { ok: true });
  });
});
