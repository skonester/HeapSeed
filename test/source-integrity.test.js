const test = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const tar = require('tar-stream');
const { sourceTreeSha256, verifySourceArchive } = require('../scripts/source-integrity');

async function archive(entries, { timestamp = 0, uid = 0, level = 6 } = {}) {
  const pack = tar.pack();
  const chunks = [];
  const collected = (async () => { for await (const chunk of pack) chunks.push(chunk); })();
  for (const entry of entries) {
    await new Promise((resolve, reject) => pack.entry({
      mode: 0o644, mtime: new Date(timestamp), uid, gid: uid, ...entry.header
    }, entry.body || '', (error) => error ? reject(error) : resolve()));
  }
  pack.finalize();
  await collected;
  return gzipSync(Buffer.concat(chunks), { level });
}

const files = [
  { header: { name: 'configure', mode: 0o755 }, body: '#!/bin/sh\necho configure\n' },
  { header: { name: 'libavcodec/source.c' }, body: 'int decoder = 1;\n' }
];

test('regenerated tar timestamps, ownership, ordering and compression preserve source integrity', async () => {
  const original = await archive(files);
  const regenerated = await archive([...files].reverse(), { timestamp: 1794812141306, uid: 123, level: 9 });
  assert.notEqual(createHash('sha256').update(original).digest('hex'), createHash('sha256').update(regenerated).digest('hex'));
  await verifySourceArchive(regenerated, await sourceTreeSha256(original));
});

test('changed file contents are rejected', async () => {
  const expected = await sourceTreeSha256(await archive(files));
  const changed = await archive([files[0], { ...files[1], body: 'int decoder = 2;\n' }]);
  await assert.rejects(verifySourceArchive(changed, expected), /content checksum mismatch/);
});

test('changed executable permissions are rejected', async () => {
  const expected = await sourceTreeSha256(await archive(files));
  const changed = await archive([{ ...files[0], header: { name: 'configure', mode: 0o644 } }, files[1]]);
  await assert.rejects(verifySourceArchive(changed, expected), /content checksum mismatch/);
});

test('missing source files are rejected', async () => {
  const expected = await sourceTreeSha256(await archive(files));
  await assert.rejects(verifySourceArchive(await archive([files[0]]), expected), /content checksum mismatch/);
});

test('duplicate archive paths cannot replace a verified source file', async () => {
  await assert.rejects(sourceTreeSha256(await archive([files[0], files[0]])), /duplicate FFmpeg source entry/);
});

test('malformed gzip and incomplete tar archives are rejected', async () => {
  await assert.rejects(sourceTreeSha256(Buffer.from('not a gzip archive')));
  const valid = await archive(files);
  await assert.rejects(sourceTreeSha256(valid.subarray(0, valid.length - 8)));
});
