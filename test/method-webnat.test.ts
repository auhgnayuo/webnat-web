import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Message } from '../src/webnat/message';
import { MethodWebnat } from '../src/webnat/method-webnat';
import { WebnatErrorCode } from '../src/webnat/error';

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
});
