import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RawWebnat } from '../src/webnat/raw-webnat';
import { Message } from '../src/webnat/message';

describe('RawWebnat', () => {
  it('sends raw message with correct from and param', () => {
    const sent: Message[] = [];
    const raw = new RawWebnat('conn-a', (m) => sent.push(m));
    raw.raw({ kind: 'ping' });
    assert.equal(sent.length, 1);
    assert.ok(sent[0].raw);
    assert.equal(sent[0].from, 'conn-a');
    assert.deepEqual(sent[0].raw!.param, { kind: 'ping' });
  });

  it('dedupes on() for the same listener reference', () => {
    const raw = new RawWebnat('c', () => {});
    let count = 0;
    const fn = () => {
      count++;
    };
    raw.on(fn);
    raw.on(fn);
    raw.receive(Message.raw('native', 'x'));
    assert.equal(count, 1);
  });

  it('receive invokes all listeners with snapshot isolation', () => {
    const log: string[] = [];
    const raw = new RawWebnat('c', () => {});
    raw.on(() => log.push('a'));
    raw.on(() => {
      log.push('b');
    });
    raw.receive(Message.raw('native', { n: 1 }));
    assert.deepEqual(log, ['a', 'b']);
  });

  it('off removes listener', () => {
    let n = 0;
    const raw = new RawWebnat('c', () => {});
    const fn = () => {
      n++;
    };
    raw.on(fn);
    raw.off(fn);
    raw.receive(Message.raw('native', 1));
    assert.equal(n, 0);
  });

  it('receive ignores non-raw messages', () => {
    let n = 0;
    const raw = new RawWebnat('c', () => {});
    raw.on(() => {
      n++;
    });
    raw.receive(Message.broadcast('native', 'e', null));
    assert.equal(n, 0);
  });
});
