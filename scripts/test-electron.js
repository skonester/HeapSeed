const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const tests = fs.readdirSync('test').filter((file) => file.endsWith('.test.js')).map((file) => `test/${file}`);
const result = spawnSync(require('electron'), ['--test', ...tests], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', windowsHide: true, timeout: 60000
});
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
