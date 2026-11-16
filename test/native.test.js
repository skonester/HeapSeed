const test = require('node:test');
const assert = require('node:assert/strict');

// Packaging keeps the modules' Node-API prebuilds; exercise their actual loaders
// under both system Node and Electron's bundled Node with test:electron.
test('native WebTorrent dependencies load on this runtime', () => {
  assert.equal(typeof require('node-datachannel').PeerConnection, 'function');
  assert.equal(typeof require('utp-native').createServer, 'function');
  assert.equal(typeof require('bufferutil').mask, 'function');
});
