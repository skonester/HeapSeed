const fs = require('fs');
const path = require('path');

exports.default = async (context) => {
  if (context.electronPlatformName === 'win32') {
    const source = path.join(context.packager.projectDir, 'node_modules', 'electron', 'dist', 'ffmpeg.dll');
    const target = path.join(context.appOutDir, 'ffmpeg.dll');

    if (!fs.existsSync(target) && fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log('\n[AGENT]: ffmpeg.dll restored into Windows app output.\n');
    }

    if (!fs.existsSync(target)) {
      throw new Error(`ffmpeg.dll missing from Windows app output: ${target}`);
    }

    return;
  }

  // Agent Check: Abort if not building for Linux
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const source = path.join(context.packager.projectDir, 'build-assets', 'libffmpeg.so');
  const target = path.join(context.appOutDir, 'libffmpeg.so');

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log('\n[AGENT]: Proprietary codec injected into Linux build.\n');
  }
};
