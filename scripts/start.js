const path = require('node:path');
const { spawn } = require('node:child_process');
const { installLibrary } = require('./codecs');

const electron = require('electron');
installLibrary(process.platform, process.arch, require('electron/package.json').version, path.dirname(electron));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env, windowsHide: true });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
