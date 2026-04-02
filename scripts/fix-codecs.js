const fs = require('fs');
const path = require('path');

exports.default = async (context) => {
  // Path to the verified file you just found
  const source = path.join(context.packager.projectDir, 'build-assets', 'libffmpeg.so');
  // Destination inside the Linux build
  const target = path.join(context.appOutDir, 'libffmpeg.so');

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log('\n[AGENT]: Proprietary codec injected into Linux build.\n');
  }
};