const fs = require('fs');
const path = require('path');

exports.default = async (context) => {
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