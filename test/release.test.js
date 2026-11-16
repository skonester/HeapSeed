const test = require('node:test');
const assert = require('node:assert/strict');
const { releaseTag, releaseType } = require('../scripts/prepare-release');

test('an existing published release receives assets using its published release type', () => {
  assert.equal(releaseType({ draft: false, prerelease: false }), 'release');
});

test('a new or existing draft release remains a draft', () => {
  assert.equal(releaseType(null), 'draft');
  assert.equal(releaseType({ draft: true, prerelease: false }), 'draft');
});

test('an existing prerelease keeps its prerelease status', () => {
  assert.equal(releaseType({ draft: false, prerelease: true }), 'prerelease');
});

test('release tags must match the app version while manual branch builds use its version', () => {
  assert.equal(releaseTag('1.2.4', 'refs/tags/v1.2.4'), 'v1.2.4');
  assert.equal(releaseTag('1.2.4', 'refs/heads/main'), 'v1.2.4');
  assert.throws(() => releaseTag('1.2.4', 'refs/tags/v1.2.3'), /does not match/);
});
