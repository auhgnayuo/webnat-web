import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Param,
  Message,
  Open,
  Close,
  Raw,
  Broadcast,
  Invoke,
  Reply,
  Notify,
  Abort,
} from '../src/webnat/message';

describe('Param', () => {
  describe('type definition', () => {
    it('should accept string', () => {
      const param: Param = 'hello';
      assert.strictEqual(param, 'hello');
    });

    it('should accept number', () => {
      const param: Param = 123;
      assert.strictEqual(param, 123);
    });

    it('should accept boolean', () => {
      const param: Param = true;
      assert.strictEqual(param, true);
    });

    it('should accept null', () => {
      const param: Param = null;
      assert.strictEqual(param, null);
    });

    it('should accept array', () => {
      const param: Param = [1, 2, 3];
      assert.deepStrictEqual(param, [1, 2, 3]);
    });

    it('should accept object', () => {
      const param: Param = { key: 'value', num: 123 };
      assert.deepStrictEqual(param, { key: 'value', num: 123 });
    });

    it('should accept nested structures', () => {
      const param: Param = {
        nested: {
          array: [1, 2, 3],
          value: 'test',
        },
      };
      assert.deepStrictEqual(param, {
        nested: {
          array: [1, 2, 3],
          value: 'test',
        },
      });
    });

    it('should accept array with objects', () => {
      const param: Param = [{ id: 1 }, { id: 2 }];
      assert.deepStrictEqual(param, [{ id: 1 }, { id: 2 }]);
    });
  });
});

describe('Open', () => {
  it('should create open message without param', () => {
    const open = new Open();
    assert.strictEqual(open.param, undefined);
  });

  it('should create open message with param', () => {
    const param = { origin: 'https://example.com', isMainframe: true };
    const open = new Open(param);
    assert.deepStrictEqual(open.param, param);
  });
});

describe('Close', () => {
  it('should create close message without param', () => {
    const close = new Close();
    assert.strictEqual(close.param, undefined);
  });

  it('should create close message with param', () => {
    const param = { reason: 'user_close' };
    const close = new Close(param);
    assert.deepStrictEqual(close.param, param);
  });
});

describe('Raw', () => {
  it('should create raw message without param', () => {
    const raw = new Raw();
    assert.strictEqual(raw.param, undefined);
  });

  it('should create raw message with string param', () => {
    const param = 'raw data';
    const raw = new Raw(param);
    assert.strictEqual(raw.param, param);
  });

  it('should create raw message with object param', () => {
    const param = { key: 'value' };
    const raw = new Raw(param);
    assert.deepStrictEqual(raw.param, param);
  });
});

describe('Broadcast', () => {
  it('should create broadcast message with name only', () => {
    const broadcast = new Broadcast('eventName');
    assert.strictEqual(broadcast.name, 'eventName');
    assert.strictEqual(broadcast.param, undefined);
  });

  it('should create broadcast message with name and param', () => {
    const name = 'eventName';
    const param = { data: 'test' };
    const broadcast = new Broadcast(name, param);
    assert.strictEqual(broadcast.name, name);
    assert.deepStrictEqual(broadcast.param, param);
  });
});

describe('Invoke', () => {
  it('should create invoke message with required fields', () => {
    const id = 'call-id-123';
    const method = 'testMethod';
    const invoke = new Invoke(id, method);
    assert.strictEqual(invoke.id, id);
    assert.strictEqual(invoke.method, method);
    assert.strictEqual(invoke.param, undefined);
  });

  it('should create invoke message with param', () => {
    const id = 'call-id-123';
    const method = 'testMethod';
    const param = { arg1: 'value1' };
    const invoke = new Invoke(id, method, param);
    assert.strictEqual(invoke.id, id);
    assert.strictEqual(invoke.method, method);
    assert.deepStrictEqual(invoke.param, param);
  });
});

describe('Reply', () => {
  it('should create reply message with result', () => {
    const id = 'call-id-123';
    const result = { success: true, data: 'result' };
    const reply = new Reply(id, result);
    assert.strictEqual(reply.id, id);
    assert.deepStrictEqual(reply.result, result);
    assert.strictEqual(reply.error, undefined);
  });

  it('should create reply message with error', () => {
    const id = 'call-id-123';
    const error = { code: -1, message: 'Error occurred' };
    const reply = new Reply(id, undefined, error);
    assert.strictEqual(reply.id, id);
    assert.strictEqual(reply.result, undefined);
    assert.deepStrictEqual(reply.error, error);
  });

  it('should create reply message with both result and error (should be handled by caller)', () => {
    const id = 'call-id-123';
    const result = { data: 'result' };
    const error = { code: -1, message: 'Error' };
    const reply = new Reply(id, result, error);
    assert.strictEqual(reply.id, id);
    assert.deepStrictEqual(reply.result, result);
    assert.deepStrictEqual(reply.error, error);
  });
});

describe('Notify', () => {
  it('should create notify message with id only', () => {
    const id = 'notify-id-123';
    const notify = new Notify(id);
    assert.strictEqual(notify.id, id);
    assert.strictEqual(notify.param, undefined);
  });

  it('should create notify message with id and param', () => {
    const id = 'notify-id-123';
    const param = { type: 'info', message: 'Notification' };
    const notify = new Notify(id, param);
    assert.strictEqual(notify.id, id);
    assert.deepStrictEqual(notify.param, param);
  });
});

describe('Abort', () => {
  it('should create abort message', () => {
    const id = 'abort-id-123';
    const abort = new Abort(id);
    assert.strictEqual(abort.id, id);
  });
});

describe('Message', () => {
  const validUUID = 'd3d72b08-091a-40d2-883f-8450979fb9e1';
  const nativeUUID = Message.NATIVE_UUID;

  describe('constructor', () => {
    it('should create message with open', () => {
      const open = new Open({ origin: 'https://example.com' });
      const message = new Message(validUUID, nativeUUID, open);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.open, open);
      assert.strictEqual(message.close, undefined);
      assert.strictEqual(message.raw, undefined);
      assert.strictEqual(message.broadcast, undefined);
      assert.strictEqual(message.invoke, undefined);
      assert.strictEqual(message.reply, undefined);
      assert.strictEqual(message.notify, undefined);
      assert.strictEqual(message.abort, undefined);
    });

    it('should create message with close', () => {
      const close = new Close();
      const message = new Message(validUUID, nativeUUID, undefined, close);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.close, close);
      assert.strictEqual(message.open, undefined);
    });

    it('should create message with raw', () => {
      const raw = new Raw('test data');
      const message = new Message(validUUID, nativeUUID, undefined, undefined, raw);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.raw, raw);
    });

    it('should create message with broadcast', () => {
      const broadcast = new Broadcast('eventName', { data: 'test' });
      const message = new Message(validUUID, nativeUUID, undefined, undefined, undefined, broadcast);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.broadcast, broadcast);
    });

    it('should create message with invoke', () => {
      const invoke = new Invoke('id-123', 'method', { arg: 'value' });
      const message = new Message(validUUID, nativeUUID, undefined, undefined, undefined, undefined, invoke);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.invoke, invoke);
    });

    it('should create message with reply', () => {
      const reply = new Reply('id-123', { result: 'success' });
      const message = new Message(validUUID, nativeUUID, undefined, undefined, undefined, undefined, undefined, reply);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.reply, reply);
    });

    it('should create message with notify', () => {
      const notify = new Notify('id-123', { type: 'info' });
      const message = new Message(validUUID, nativeUUID, undefined, undefined, undefined, undefined, undefined, undefined, notify);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.notify, notify);
    });

    it('should create message with abort', () => {
      const abort = new Abort('id-123');
      const message = new Message(validUUID, nativeUUID, undefined, undefined, undefined, undefined, undefined, undefined, undefined, abort);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.deepStrictEqual(message.abort, abort);
    });
  });

  describe('static factory methods', () => {
    it('should create open message', () => {
      const param = { origin: 'https://example.com', isMainframe: true };
      const message = Message.open(validUUID, param);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.open, undefined);
      assert.deepStrictEqual(message.open?.param, param);
      assert.strictEqual(message.close, undefined);
      assert.strictEqual(message.raw, undefined);
    });

    it('should create open message without param', () => {
      const message = Message.open(validUUID);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.open, undefined);
      assert.strictEqual(message.open?.param, undefined);
    });

    it('should create close message', () => {
      const message = Message.close(validUUID);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.close, undefined);
      assert.strictEqual(message.close?.param, undefined);
      assert.strictEqual(message.open, undefined);
    });

    it('should create close message with param', () => {
      const param = { reason: 'user_close' };
      const message = Message.close(validUUID, param);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.close, undefined);
      assert.deepStrictEqual(message.close?.param, param);
    });

    it('should create raw message', () => {
      const rawData = 'raw data';
      const message = Message.raw(validUUID, rawData);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.raw, undefined);
      assert.strictEqual(message.raw?.param, rawData);
    });

    it('should create raw message with object', () => {
      const rawData = { key: 'value' };
      const message = Message.raw(validUUID, rawData);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.raw, undefined);
      assert.deepStrictEqual(message.raw?.param, rawData);
    });

    it('should create raw message without param', () => {
      const message = Message.raw(validUUID);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.raw, undefined);
      assert.strictEqual(message.raw?.param, undefined);
    });

    it('should create broadcast message', () => {
      const name = 'eventName';
      const param = { data: 'test' };
      const message = Message.broadcast(validUUID, name, param);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.broadcast, undefined);
      assert.strictEqual(message.broadcast?.name, name);
      assert.deepStrictEqual(message.broadcast?.param, param);
    });

    it('should create broadcast message without param', () => {
      const name = 'eventName';
      const message = Message.broadcast(validUUID, name);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.broadcast, undefined);
      assert.strictEqual(message.broadcast?.name, name);
      assert.strictEqual(message.broadcast?.param, undefined);
    });

    it('should create invoke message', () => {
      const id = 'call-id-123';
      const method = 'testMethod';
      const param = { arg1: 'value1' };
      const message = Message.invoke(validUUID, id, method, param);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.invoke, undefined);
      assert.strictEqual(message.invoke?.id, id);
      assert.strictEqual(message.invoke?.method, method);
      assert.deepStrictEqual(message.invoke?.param, param);
    });

    it('should create invoke message without param', () => {
      const id = 'call-id-123';
      const method = 'testMethod';
      const message = Message.invoke(validUUID, id, method);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.invoke, undefined);
      assert.strictEqual(message.invoke?.id, id);
      assert.strictEqual(message.invoke?.method, method);
      assert.strictEqual(message.invoke?.param, undefined);
    });

    it('should create reply message with result', () => {
      const id = 'call-id-123';
      const result = { success: true, data: 'result' };
      const message = Message.reply(validUUID, id, result);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.reply, undefined);
      assert.strictEqual(message.reply?.id, id);
      assert.deepStrictEqual(message.reply?.result, result);
      assert.strictEqual(message.reply?.error, undefined);
    });

    it('should create reply message with error', () => {
      const id = 'call-id-123';
      const error = { code: -1, message: 'Error occurred' };
      const message = Message.reply(validUUID, id, undefined, error);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.reply, undefined);
      assert.strictEqual(message.reply?.id, id);
      assert.strictEqual(message.reply?.result, undefined);
      assert.deepStrictEqual(message.reply?.error, error);
    });

    it('should create notify message', () => {
      const id = 'notify-id-123';
      const param = { type: 'info', message: 'Notification' };
      const message = Message.notify(validUUID, id, param);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.notify, undefined);
      assert.strictEqual(message.notify?.id, id);
      assert.deepStrictEqual(message.notify?.param, param);
    });

    it('should create notify message without param', () => {
      const id = 'notify-id-123';
      const message = Message.notify(validUUID, id);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.notify, undefined);
      assert.strictEqual(message.notify?.id, id);
      assert.strictEqual(message.notify?.param, undefined);
    });

    it('should create abort message', () => {
      const id = 'abort-id-123';
      const message = Message.abort(validUUID, id);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, nativeUUID);
      assert.notStrictEqual(message.abort, undefined);
      assert.strictEqual(message.abort?.id, id);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize and deserialize open message', () => {
      const original = Message.open(validUUID, { origin: 'https://example.com' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.open, undefined);
      assert.deepStrictEqual(parsed.open?.param, original.open?.param);
    });

    it('should serialize and deserialize close message', () => {
      const original = Message.close(validUUID, { reason: 'test' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.close, undefined);
      assert.deepStrictEqual(parsed.close?.param, original.close?.param);
    });

    it('should serialize and deserialize raw message', () => {
      const original = Message.raw(validUUID, { key: 'value' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.raw, undefined);
      assert.deepStrictEqual(parsed.raw?.param, original.raw?.param);
    });

    it('should serialize and deserialize broadcast message', () => {
      const original = Message.broadcast(validUUID, 'eventName', { data: 'test' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.broadcast, undefined);
      assert.strictEqual(parsed.broadcast?.name, original.broadcast?.name);
      assert.deepStrictEqual(parsed.broadcast?.param, original.broadcast?.param);
    });

    it('should serialize and deserialize invoke message', () => {
      const original = Message.invoke(validUUID, 'id-123', 'method', { arg: 'value' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.invoke, undefined);
      assert.strictEqual(parsed.invoke?.id, original.invoke?.id);
      assert.strictEqual(parsed.invoke?.method, original.invoke?.method);
      assert.deepStrictEqual(parsed.invoke?.param, original.invoke?.param);
    });

    it('should serialize and deserialize reply message with result', () => {
      const original = Message.reply(validUUID, 'id-123', { success: true });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.reply, undefined);
      assert.strictEqual(parsed.reply?.id, original.reply?.id);
      assert.deepStrictEqual(parsed.reply?.result, original.reply?.result);
      assert.strictEqual(parsed.reply?.error, undefined);
    });

    it('should serialize and deserialize reply message with error', () => {
      const original = Message.reply(validUUID, 'id-123', undefined, { code: -1, message: 'Error' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.reply, undefined);
      assert.strictEqual(parsed.reply?.id, original.reply?.id);
      assert.strictEqual(parsed.reply?.result, undefined);
      assert.deepStrictEqual(parsed.reply?.error, original.reply?.error);
    });

    it('should serialize and deserialize notify message', () => {
      const original = Message.notify(validUUID, 'id-123', { type: 'info' });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.notify, undefined);
      assert.strictEqual(parsed.notify?.id, original.notify?.id);
      assert.deepStrictEqual(parsed.notify?.param, original.notify?.param);
    });

    it('should serialize and deserialize abort message', () => {
      const original = Message.abort(validUUID, 'id-123');
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.from, original.from);
      assert.strictEqual(parsed.to, original.to);
      assert.notStrictEqual(parsed.abort, undefined);
      assert.strictEqual(parsed.abort?.id, original.abort?.id);
    });

    it('should handle round-trip serialization for all message types', () => {
      const messages = [
        Message.open(validUUID, { origin: 'https://example.com' }),
        Message.close(validUUID),
        Message.raw(validUUID, 'test'),
        Message.broadcast(validUUID, 'event', { data: 'test' }),
        Message.invoke(validUUID, 'id', 'method', { arg: 'value' }),
        Message.reply(validUUID, 'id', { result: 'success' }),
        Message.reply(validUUID, 'id', undefined, { code: -1, message: 'error' }),
        Message.notify(validUUID, 'id', { type: 'info' }),
        Message.abort(validUUID, 'id'),
      ];

      for (const original of messages) {
        const json = JSON.stringify(original);
        const parsed = JSON.parse(json) as Message;
        assert.strictEqual(parsed.from, original.from);
        assert.strictEqual(parsed.to, original.to);
        if (original.open) assert.notStrictEqual(parsed.open, undefined);
        if (original.close) assert.notStrictEqual(parsed.close, undefined);
        if (original.raw) assert.notStrictEqual(parsed.raw, undefined);
        if (original.broadcast) assert.notStrictEqual(parsed.broadcast, undefined);
        if (original.invoke) assert.notStrictEqual(parsed.invoke, undefined);
        if (original.reply) assert.notStrictEqual(parsed.reply, undefined);
        if (original.notify) assert.notStrictEqual(parsed.notify, undefined);
        if (original.abort) assert.notStrictEqual(parsed.abort, undefined);
      }
    });
  });

  describe('constants', () => {
    it('should have correct NATIVE_UUID', () => {
      assert.strictEqual(Message.NATIVE_UUID, '00000000-0000-0000-0000-000000000000');
    });
  });

  describe('message type exclusivity', () => {
    it('should only have one message type at a time', () => {
      const openMessage = Message.open(validUUID);
      assert.notStrictEqual(openMessage.open, undefined);
      assert.strictEqual(openMessage.close, undefined);
      assert.strictEqual(openMessage.raw, undefined);
      assert.strictEqual(openMessage.broadcast, undefined);
      assert.strictEqual(openMessage.invoke, undefined);
      assert.strictEqual(openMessage.reply, undefined);
      assert.strictEqual(openMessage.notify, undefined);
      assert.strictEqual(openMessage.abort, undefined);
    });

    it('should handle complex param values', () => {
      const complexParam: Param = {
        nested: {
          array: [1, 2, 3],
          value: 'test',
          bool: true,
          nullValue: null,
        },
      };
      const message = Message.raw(validUUID, complexParam);
      assert.deepStrictEqual(message.raw?.param, complexParam);
    });
  });

  describe('magic field', () => {
    it('should have correct MAGIC constant', () => {
      assert.strictEqual(Message.MAGIC, 'WEBNAT');
    });

    it('should set magic field on construction', () => {
      const message = Message.open(validUUID);
      assert.strictEqual(message.magic, 'WEBNAT');
    });

    it('should include magic field in all factory methods', () => {
      const messages = [
        Message.open(validUUID),
        Message.close(validUUID),
        Message.raw(validUUID, 'test'),
        Message.broadcast(validUUID, 'event'),
        Message.invoke(validUUID, 'id', 'method'),
        Message.reply(validUUID, 'id', { result: 'ok' }),
        Message.notify(validUUID, 'id'),
        Message.abort(validUUID, 'id'),
      ];
      for (const message of messages) {
        assert.strictEqual(message.magic, Message.MAGIC);
      }
    });

    it('should preserve magic field in JSON serialization', () => {
      const original = Message.open(validUUID);
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.strictEqual(parsed.magic, 'WEBNAT');
    });
  });

  describe('custom to field', () => {
    it('should allow custom to value in constructor', () => {
      const customTo = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const raw = new Raw('test');
      const message = new Message(validUUID, customTo, undefined, undefined, raw);
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, customTo);
      assert.deepStrictEqual(message.raw, raw);
    });

    it('should allow same from and to', () => {
      const message = new Message(validUUID, validUUID, new Open());
      assert.strictEqual(message.from, validUUID);
      assert.strictEqual(message.to, validUUID);
    });
  });

  describe('empty string edge cases', () => {
    it('should handle empty string broadcast name', () => {
      const broadcast = new Broadcast('');
      assert.strictEqual(broadcast.name, '');
      assert.strictEqual(broadcast.param, undefined);
    });

    it('should handle empty string invoke id and method', () => {
      const invoke = new Invoke('', '');
      assert.strictEqual(invoke.id, '');
      assert.strictEqual(invoke.method, '');
    });

    it('should handle empty string reply id', () => {
      const reply = new Reply('');
      assert.strictEqual(reply.id, '');
      assert.strictEqual(reply.result, undefined);
      assert.strictEqual(reply.error, undefined);
    });

    it('should handle empty string notify id', () => {
      const notify = new Notify('');
      assert.strictEqual(notify.id, '');
      assert.strictEqual(notify.param, undefined);
    });

    it('should handle empty string abort id', () => {
      const abort = new Abort('');
      assert.strictEqual(abort.id, '');
    });

    it('should handle empty string from and to in Message', () => {
      const message = new Message('', '', new Open());
      assert.strictEqual(message.from, '');
      assert.strictEqual(message.to, '');
    });
  });

  describe('reply without result and error', () => {
    it('should create reply with neither result nor error', () => {
      const reply = new Reply('id-123');
      assert.strictEqual(reply.id, 'id-123');
      assert.strictEqual(reply.result, undefined);
      assert.strictEqual(reply.error, undefined);
    });

    it('should create reply message via factory with neither result nor error', () => {
      const message = Message.reply(validUUID, 'id-123');
      assert.notStrictEqual(message.reply, undefined);
      assert.strictEqual(message.reply?.id, 'id-123');
      assert.strictEqual(message.reply?.result, undefined);
      assert.strictEqual(message.reply?.error, undefined);
    });

    it('should serialize reply with neither result nor error', () => {
      const original = Message.reply(validUUID, 'id-123');
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as Message;
      assert.notStrictEqual(parsed.reply, undefined);
      assert.strictEqual(parsed.reply?.id, 'id-123');
      assert.strictEqual(parsed.reply?.result, undefined);
      assert.strictEqual(parsed.reply?.error, undefined);
    });
  });
});
