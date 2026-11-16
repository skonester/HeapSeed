const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');

function releaseTag(version, ref = '') {
  const tag = `v${version}`;
  if (ref.startsWith('refs/tags/') && ref.slice('refs/tags/'.length) !== tag) {
    throw new Error(`Release tag ${ref} does not match package.json version ${version}`);
  }
  return tag;
}

function releaseType(release) {
  if (!release || release.draft) return 'draft';
  return release.prerelease ? 'prerelease' : 'release';
}

async function prepareRelease(env = process.env, request = fetch) {
  const tag = releaseTag(pkg.version, env.GITHUB_REF);
  const repository = env.GITHUB_REPOSITORY;
  if (!repository || !env.GITHUB_TOKEN) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
  const response = await request(`https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Cannot check release ${tag}: GitHub returned HTTP ${response.status}`);
  }
  const type = releaseType(response.status === 404 ? null : await response.json());
  const publishers = [].concat(pkg.build.publish).map((publisher) => ({ ...publisher, releaseType: type }));
  const output = path.resolve(__dirname, '..', '.cache', 'release-config.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ ...pkg.build, publish: publishers }, null, 2) + '\n');
  console.log(`Prepared ${tag}: publish as ${type}${response.status === 404 ? ' (new release)' : ' (existing release)'}`);
  return output;
}

module.exports = { releaseTag, releaseType, prepareRelease };
if (require.main === module) prepareRelease().catch((error) => { console.error(error.message); process.exitCode = 1; });
