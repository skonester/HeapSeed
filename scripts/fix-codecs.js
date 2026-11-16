const fs = require('node:fs');
const path = require('node:path');
const { Arch } = require('builder-util');
const { installLibrary, prepareSource } = require('./codecs');

exports.default = async (context) => {
  const version = context.packager.info.framework.version;
  const codec = installLibrary(context.electronPlatformName, Arch[context.arch], version, context.appOutDir);
  const notices = path.join(context.appOutDir, 'resources', 'ffmpeg');
  fs.mkdirSync(notices, { recursive: true });
  fs.copyFileSync(path.join(path.dirname(codec.file), 'COPYING.GPLv2'), path.join(notices, 'COPYING.GPLv2'));
  fs.copyFileSync(path.join(context.packager.projectDir, 'build-assets', 'ffmpeg', 'manifest.json'), path.join(notices, 'manifest.json'));
  fs.copyFileSync(path.join(context.packager.projectDir, 'scripts', 'build-gpl-ffmpeg.sh'), path.join(notices, 'build-gpl-ffmpeg.sh'));
  fs.copyFileSync(path.join(context.packager.projectDir, 'build-assets', 'ffmpeg', 'NOTICE.txt'), path.join(notices, 'NOTICE.txt'));
  fs.copyFileSync(await prepareSource(), path.join(notices, 'source.tar.gz'));
  console.log(`Installed verified GPL FFmpeg (${codec.target}) for Electron ${version}`);
};
