const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkedLibrary, installLibrary, sha256 } = require('../scripts/codecs');
const manifest = require('../build-assets/ffmpeg/manifest.json');

test('both platform libraries replace an existing Electron codec library', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-codecs-'));
  try {
    for (const platform of ['win32', 'linux']) {
      const codec = checkedLibrary(platform, 'x64', manifest.electron);
      const target = path.join(out, codec.entry.file);
      fs.writeFileSync(target, 'original Electron library');
      installLibrary(platform, 'x64', manifest.electron, out);
      assert.equal(sha256(target), codec.entry.sha256);
      assert.notEqual(fs.readFileSync(target, 'utf8'), 'original Electron library');
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('an Electron upgrade cannot silently reuse incompatible codecs', () => {
  assert.throws(() => checkedLibrary('win32', 'x64', '46.0.0'), /Rebuild and validate/);
});

test('an unsupported architecture cannot fall back to stock codecs', () => {
  assert.throws(() => checkedLibrary('linux', 'arm64', manifest.electron), /No verified GPL FFmpeg/);
});
