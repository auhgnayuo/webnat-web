import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WebnatError, WebnatErrorCode } from '../src/webnat/error';

describe('WebnatError', () => {
  it('from returns null for null/undefined', () => {
    assert.equal(WebnatError.from(null), null);
    assert.equal(WebnatError.from(undefined), null);
  });

  it('from reads numeric code and string message', () => {
    const e = WebnatError.from({ code: WebnatErrorCode.TIMEOUT, message: 'slow' });
    assert.ok(e);
    assert.equal(e!.code, WebnatErrorCode.TIMEOUT);
    assert.equal(e!.message, 'slow');
  });

  it('from parses string code to number', () => {
    const e = WebnatError.from({ code: '-1001', message: 'x' });
    assert.ok(e);
    assert.equal(e!.code, WebnatErrorCode.TIMEOUT);
  });

  it('from uses UNKNOWN when code missing', () => {
    const e = WebnatError.from({ message: 'oops' });
    assert.ok(e);
    assert.equal(e!.code, WebnatErrorCode.UNKNOWN);
  });

  it('from stringifies non-string message', () => {
    const e = WebnatError.from({ code: 1, message: 42 });
    assert.ok(e);
    assert.equal(e!.message, '42');
  });

  it('from wraps non-object as UNKNOWN', () => {
    const e = WebnatError.from('boom');
    assert.ok(e);
    assert.equal(e!.code, WebnatErrorCode.UNKNOWN);
    assert.match(e!.message, /boom/);
  });
});
