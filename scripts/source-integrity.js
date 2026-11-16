const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createGunzip } = require('node:zlib');
const tar = require('tar-stream');

// Gitiles regenerates tar timestamps for each request. Hash sorted source entries
// (path, type, permissions, link target, SHA-256 of contents), excluding timestamps
// and ownership. This format is pinned by source.treeSha256 in the codec manifest.
async function sourceTreeSha256(archive) {
  const extract = tar.extract();
  const records = new Map();
  extract.on('entry', (header, stream, next) => {
    stream.on('error', (error) => extract.destroy(error));
    const name = path.posix.normalize(header.name).replace(/\/$/, '');
    if (!name || name === '.' || name.startsWith('/') || name.includes('\\') ||
        /^[a-zA-Z]:/.test(name) || name.split('/').includes('..')) {
      return next(new Error(`Invalid FFmpeg source archive path: ${header.name}`));
    }
    if (!['file', 'directory', 'symlink', 'link'].includes(header.type) || records.has(name)) {
      return next(new Error(`Invalid or duplicate FFmpeg source entry: ${name}`));
    }
    // Reserve the path before processing the body so duplicates cannot replace it.
    records.set(name, null);
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      records.set(name, [name, header.type, header.mode & 0o7777, header.linkname || '', hash.digest('hex')]);
      next();
    });
  });
  const input = Buffer.isBuffer(archive) ? Readable.from([archive]) : fs.createReadStream(archive);
  await pipeline(input, createGunzip(), extract);
  const entries = [...records.keys()].sort().map((name) => records.get(name));
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

async function verifySourceArchive(archive, expected) {
  const actual = await sourceTreeSha256(archive);
  if (actual !== expected) {
    throw new Error(`FFmpeg source content checksum mismatch: expected ${expected}, received ${actual}`);
  }
}

module.exports = { sourceTreeSha256, verifySourceArchive };
