// Runs the real application with an isolated profile and a synthetic clipboard.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (!process.versions.electron) {
  const { installLibrary } = require('./codecs');
  const binary = require('electron');
  installLibrary(process.platform, process.arch, require('electron/package.json').version, path.dirname(binary));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.HEAPSEED_SMOKE_APP = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  env.HEAPSEED_SMOKE_MEDIA = path.resolve(process.argv[3] || path.join(__dirname, '..', 'test', 'fixtures', 'codec-smoke.mp4'));
  const runtimeArgs = process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox', '--ozone-platform=x11'] : [];
  const result = spawnSync(binary, [...runtimeArgs, __filename], {
    env, stdio: 'inherit', windowsHide: true, timeout: 45000
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) console.error({ exitCode: result.status, signal: result.signal });
  process.exitCode = result.status ?? 1;
} else {
  const { app, clipboard } = require('electron');
  const appPath = process.env.HEAPSEED_SMOKE_APP || path.resolve(__dirname, '..');
  const mediaFile = process.env.HEAPSEED_SMOKE_MEDIA;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-smoke-'));
  app.setPath('userData', profile);
  app.setAppPath(appPath);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-background-media-suspend');
  if (process.platform === 'linux' && process.getuid?.() === 0) app.commandLine.appendSwitch('no-sandbox');
  fs.writeFileSync(path.join(profile, 'Settings.json'), JSON.stringify({
    auto_update: false, launch_at_login: false, close_to_tray: false,
    download_path: path.join(profile, 'downloads')
  }));
  const magnet = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10';
  clipboard.readText = async () => { await new Promise(resolve => setTimeout(resolve, 100)); return magnet; };
  const errors = [];
  const timer = setTimeout(() => { console.error('Application smoke test timed out', errors); app.exit(1); }, 30000);
  process.on('unhandledRejection', (error) => errors.push(String(error)));
  app.on('browser-window-created', (_event, win) => {
    win.webContents.setBackgroundThrottling(false);
    win.hide();
    win.on('show', () => win.hide());
    win.webContents.on('preload-error', (_e, _file, error) => errors.push(String(error)));
    win.webContents.on('render-process-gone', (_e, detail) => errors.push(`Renderer exited: ${detail.reason}`));
    win.webContents.on('console-message', (details) => {
      if (details.level === 'error') errors.push(details.message);
    });
    win.webContents.once('did-finish-load', async () => {
      try {
        for (const [name, exported] of [['node-datachannel', 'PeerConnection'], ['utp-native', 'createServer'], ['bufferutil', 'mask']]) {
          if (typeof require(path.join(appPath, 'node_modules', name))[exported] !== 'function') {
            throw new Error(`Packaged native dependency failed: ${name}`);
          }
        }
        const result = await win.webContents.executeJavaScript(`(async () => {
          const waitFor = async (fn) => {
            for (let i = 0; i < 100; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 25)); }
            throw new Error('Renderer condition timed out');
          };
          if (!document.querySelector('.app-shell')) throw new Error('App did not render');
          if (await window.api.readClipboard() !== ${JSON.stringify(magnet)}) throw new Error('Clipboard IPC failed');
          document.querySelector('[aria-label="Add Transfer"]').click();
          await waitFor(() => document.querySelector('dialog[open] textarea'));
          let input = document.querySelector('dialog[open] textarea');
          input.value = 'typed while waiting'; input.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 200));
          if (input.value !== 'typed while waiting') throw new Error('Late auto-fill overwrote typed content');
          document.querySelector('dialog[open] [aria-label="Close dialog"]').click();
          await waitFor(() => !document.querySelector('dialog[open]'));
          document.querySelector('[aria-label="Add Transfer"]').click();
          await waitFor(() => document.querySelector('textarea')?.value === ${JSON.stringify(magnet)});
          input = document.querySelector('textarea');
          input.value = 'typed content'; input.dispatchEvent(new Event('input', { bubbles: true }));
          [...document.querySelectorAll('button')].find(b => b.textContent.includes('Paste from Clipboard')).click();
          await waitFor(() => input.value === ${JSON.stringify(magnet)});
          return { title: document.title, clipboard: 'passed', modal: 'passed', native: 'passed' };
        })()`);
        if (mediaFile) {
          const media = fs.readFileSync(mediaFile).toString('base64');
          result.playback = await win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            const timeout = setTimeout(() => reject(new Error('H.264/AAC decode timed out')), 15000);
            video.onerror = () => { clearTimeout(timeout); reject(new Error('Media error ' + video.error?.code + ': ' + video.error?.message)); };
            video.onended = () => { clearTimeout(timeout); resolve({ width: video.videoWidth, height: video.videoHeight, time: video.currentTime }); };
            const bytes = Uint8Array.from(atob('${media}'), c => c.charCodeAt(0));
            video.src = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
            document.body.append(video);
            video.play().catch(reject);
          }).catch(error => ({ error: String(error), message: error?.message, code: error?.code }))`);
          if (result.playback.error) throw new Error(JSON.stringify(result.playback));
          if (result.playback.width !== 160 || result.playback.time < 0.5) throw new Error('H.264 decode produced no video');
        }
        if (errors.length) throw new Error(errors.join('\n'));
        clearTimeout(timer);
        console.log(JSON.stringify({ platform: process.platform, electron: process.versions.electron, appPath, ...result }));
        win.close();
      } catch (error) {
        clearTimeout(timer);
        console.error(error?.stack || error?.message || String(error));
        app.exit(1);
      }
    });
  });
  require(path.join(appPath, 'boot.js'));
}
