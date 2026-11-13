import test from 'node:test';
import assert from 'node:assert/strict';
import {total} from './checkout.mjs';

test('returns the price of a valid single item', () => {
  assert.equal(total({price: 12.5}), 12.5);
});
test('preserves a zero-price item', () => {
  assert.equal(total({price: 0}), 0);
});
