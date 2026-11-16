const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifySourceArchive } = require('./source-integrity');

const projectDir = path.resolve(__dirname, '..');
const codecDir = path.join(projectDir, 'build-assets', 'ffmpeg');
const manifest = () => JSON.parse(fs.readFileSync(path.join(codecDir, 'manifest.json'), 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function checkedLibrary(platform, arch, electronVersion) {
  const config = manifest();
  if (electronVersion !== config.electron) {
    throw new Error(`GPL FFmpeg targets Electron ${config.electron}; requested ${electronVersion}. Rebuild and validate the codecs before upgrading Electron.`);
  }
  if (sha256(path.join(__dirname, 'build-gpl-ffmpeg.sh')) !== config.recipeSha256) {
    throw new Error('GPL FFmpeg build recipe changed; update and validate the codec manifest.');
  }
  const target = `${platform}-${arch}`;
  const entry = config.targets[target];
  if (!entry) throw new Error(`No verified GPL FFmpeg build for ${target}`);
  const file = path.join(codecDir, target, entry.file);
  if (!fs.existsSync(file) || sha256(file) !== entry.sha256) {
    throw new Error(`Missing or modified GPL FFmpeg library: ${file}`);
  }
  return { config, entry, file, target };
}

async function prepareSource({ cacheDir = path.join(projectDir, '.cache', 'ffmpeg'), request = fetch } = {}) {
  const config = manifest();
  const file = path.join(cacheDir, 'source.tar.gz');
  if (fs.existsSync(file)) {
    try {
      await verifySourceArchive(file, config.source.treeSha256);
      return file;
    } catch {
      console.warn('Cached FFmpeg source failed verification; downloading the pinned revision again.');
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const response = await request(config.source.url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`FFmpeg source download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await verifySourceArchive(bytes, config.source.treeSha256);
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return file;
}

function installLibrary(platform, arch, electronVersion, destination) {
  const checked = checkedLibrary(platform, arch, electronVersion);
  const target = path.join(destination, checked.entry.file);
  fs.copyFileSync(checked.file, target);
  if (sha256(target) !== checked.entry.sha256) throw new Error(`GPL FFmpeg copy failed: ${target}`);
  return checked;
}

async function prepare() {
  const config = manifest();
  const electronVersion = require('../package.json').devDependencies.electron;
  for (const target of Object.keys(config.targets)) {
    const [platform, arch] = target.split('-');
    checkedLibrary(platform, arch, electronVersion);
  }
  await prepareSource();
  console.log(`Verified GPL FFmpeg for Electron ${config.electron}: ${Object.keys(config.targets).join(', ')}`);
}

module.exports = { checkedLibrary, installLibrary, prepareSource, prepare, sha256 };
if (require.main === module) prepare().catch((error) => { console.error(error.message); process.exitCode = 1; });
