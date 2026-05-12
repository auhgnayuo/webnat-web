import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BroadcastWebnat } from '../src/webnat/broadcast-webnat';
import { Message, type Param } from '../src/webnat/message';

describe('BroadcastWebnat', () => {
  it('broadcast sends message with name and param', () => {
    const sent: Message[] = [];
    const b = new BroadcastWebnat('conn', (m) => sent.push(m));
    b.broadcast('evt', { x: 1 });
    assert.equal(sent.length, 1);
    assert.ok(sent[0].broadcast);
    assert.equal(sent[0].broadcast!.name, 'evt');
    assert.deepEqual(sent[0].broadcast!.param, { x: 1 });
  });

  it('receive dispatches to all subscribers of that name', () => {
    const b = new BroadcastWebnat('c', () => {});
    const hits: Param[] = [];
    const b1 = (p: unknown) => hits.push(p as Param);
    const b2 = (p: unknown) => hits.push(p as Param);
    b.on('x', b1);
    b.on('x', b2);
    b.receive(Message.broadcast('native', 'x', { v: 2 }));
    assert.deepEqual(hits, [{ v: 2 }, { v: 2 }]);
  });

  it('off removes one listener and deletes name when last removed', () => {
    const b = new BroadcastWebnat('c', () => {});
    const fn = () => {};
    b.on('e', fn);
    b.off('e', fn);
    let n = 0;
    b.on('e', () => {
      n++;
    });
    b.receive(Message.broadcast('native', 'e', null));
    assert.equal(n, 1);
  });

  it('listen yields params and unregisters on break', async () => {
    const b = new BroadcastWebnat('c', () => {});
    async function consume() {
      for await (const p of b.listen('stream')) {
        assert.deepEqual(p, 1);
        break;
      }
    }
    const done = consume();
    b.receive(Message.broadcast('native', 'stream', 1));
    await done;

    let n = 0;
    b.on('stream', () => {
      n++;
    });
    b.receive(Message.broadcast('native', 'stream', 2));
    assert.equal(n, 1);
  });

  it('receive throws when broadcast name is not a non-empty string', () => {
    const b = new BroadcastWebnat('c', () => {});
    const bad = {
      from: 'n',
      to: 'c',
      magic: Message.MAGIC,
      broadcast: { name: '', param: null },
    } as unknown as Message;
    assert.throws(() => b.receive(bad), /Invalid broadcast name/);
  });
});
