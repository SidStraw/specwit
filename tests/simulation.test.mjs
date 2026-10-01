import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../website/simulation.js';

test('config probes reveal a hardcoded value but cannot overclaim a matching probe', () => {
  for (const value of [1, 3, 7]) {
    const buggy = simulate({ scenario: 'config', value });
    assert.equal(buggy.verdict, value === 7 ? 'PASS' : 'FAIL');
    assert.equal(buggy.acceptance, value === 7 ? 'ELIGIBLE' : 'BLOCKED');
    assert.equal(simulate({ scenario: 'config', implementation: 'fixed', value }).verdict, 'PASS');
  }
});
test('pending guard sends exactly one request during repeated activation', () => {
  for (const value of [2, 3, 5]) {
    const buggy = simulate({ scenario: 'pending', value });
    assert.equal(buggy.verdict, 'FAIL');
    assert.equal(buggy.observations[1][1], `${value} 次`);
    const fixed = simulate({ scenario: 'pending', implementation: 'fixed', value });
    assert.equal(fixed.verdict, 'PASS');
    assert.equal(fixed.observations[1][1], '1 次');
  }
});
test('historical PASS remains PASS but stale evidence blocks acceptance', () => {
  for (const value of [1, 2, 3]) {
    const stale = simulate({ scenario: 'stale', value });
    assert.equal(stale.verdict, 'PASS');
    assert.equal(stale.validity, value === 1 ? 'CURRENT' : 'STALE');
    assert.equal(stale.acceptance, value === 1 ? 'ELIGIBLE' : 'BLOCKED');
    assert.equal(simulate({ scenario: 'stale', value, implementation: 'fixed' }).validity, 'CURRENT');
  }
});
test('an interrupted observer cannot produce an eligible result in any scenario', () => {
  for (const scenario of ['config', 'pending', 'stale']) {
    for (const implementation of ['buggy', 'fixed']) {
      const result = simulate({ scenario, implementation, value: 3, environment: 'interrupted' });
      assert.equal(result.verdict, 'INCONCLUSIVE');
      assert.equal(result.acceptance, 'BLOCKED');
      assert.equal(result.validity, 'INVALID');
    }
  }
});
test('reject unsupported fixtures instead of fabricating evidence', () => {
  assert.throws(() => simulate({ scenario: 'config', value: '<script>' }));
  assert.throws(() => simulate({ scenario: 'other', value: 1 }));
  assert.throws(() => simulate({ scenario: 'pending', value: 2, implementation: 'unknown' }));
  assert.throws(() => simulate({ scenario: 'pending', value: 2, environment: 'unknown' }));
});
