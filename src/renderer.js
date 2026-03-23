// src/renderer.js 373 line version is the correct one
(() => {
  'use strict';

  if (typeof document === 'undefined') {
    console.error('[renderer.js] document is not defined. This file must run in a renderer window.');
    return;
  }

  const searchBox = document.getElementById('main-input');
  const messageDisplay = document.getElementById('message');
  const torrentUl = document.getElementById('torrent-list');
  const videoContainer = document.getElementById('video-container');
  const playerEl = document.getElementById('player');

  let plyrInstance = null;
  let pendingTorrents = null;
  let renderScheduled = false;

  const BYTE_GB = 1073741824;
  const BYTE_MB = 1048576;
  const BYTE_KB = 1024;

  function formatDataSize(bytes) {
    const n = Number(bytes) || 0;
    if (n >= BYTE_GB) return (n / BYTE_GB).toFixed(2) + ' GiB';
    if (n >= BYTE_MB) return (n / BYTE_MB).toFixed(2) + ' MiB';
    if (n >= BYTE_KB) return (n / BYTE_KB).toFixed(2) + ' KiB';
    return n + ' B';
  }

  function calculateTimeRemaining(ms) {
    if (ms === undefined || ms === null || ms === Infinity) return '---';
    const m = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.floor(m / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function safeId(infoHash) {
    return 'info-hash-' + encodeURIComponent(String(infoHash || ''));
  }

  function safeText(v) {
    return String(v === undefined || v === null ? '' : v);
  }

  function getPlyrInstance() {
    if (plyrInstance) return plyrInstance;
    if (typeof Plyr === 'undefined') {
      console.error('[Plyr] library not found. Ensure plyr.polyfilled.js is loaded.');
      return null;
    }
    plyrInstance = new Plyr(playerEl, {
      controls: ['play-large','play','progress','current-time','mute','volume','captions','settings','pip','fullscreen'],
      settings: ['quality','speed'],
      tooltips: { controls: true, seek: true },
      displayDuration: true
    });
    window.addEventListener('beforeunload', () => {
      try { plyrInstance.destroy(); } catch (e) {}
      plyrInstance = null;
    });
    return plyrInstance;
  }

  function showPlayOverlay() {
    if (document.getElementById('plyr-play-overlay')) return;
    const overlay = document.createElement('button');
    overlay.id = 'plyr-play-overlay';
    overlay.className = 'plyr-play-overlay';
    overlay.setAttribute('aria-label', 'Start playback');
    overlay.textContent = 'Play';
    overlay.onclick = () => {
      const p = getPlyrInstance();
      if (!p) return;
      p.play().catch(e => console.error('[Plyr] Play failed:', e));
      overlay.remove();
    };
    videoContainer.appendChild(overlay);
  }

  function startStream(streamUrl, mimeType) {
    if (!streamUrl) return;
    videoContainer.classList.remove('hidden');
    videoContainer.setAttribute('aria-hidden', 'false');
    const player = getPlyrInstance();
    if (!player) return;
    player.source = { type: 'video', sources: [{ src: streamUrl, type: mimeType || 'video/mp4' }] };
    player.play().catch(err => {
      console.warn('[MediaEngine] Autoplay blocked or failed:', err);
      showPlayOverlay();
    });
  }

  function scheduleRender(torrents) {
    pendingTorrents = torrents;
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderTorrents(pendingTorrents || []);
      pendingTorrents = null;
    });
  }

  function renderTorrents(activeTorrents) {
    if (!Array.isArray(activeTorrents) || activeTorrents.length === 0) {
      if (torrentUl) torrentUl.innerHTML = '';
      if (messageDisplay) {
        messageDisplay.classList.remove('hidden');
        messageDisplay.setAttribute('aria-hidden', 'false');
        messageDisplay.textContent = 'Zero active peers. Dispatch a magnet URI to begin.';
      }
      return;
    }

    if (messageDisplay) {
      messageDisplay.classList.add('hidden');
      messageDisplay.setAttribute('aria-hidden', 'true');
    }

    const existingMap = new Map();
    torrentUl.querySelectorAll('li').forEach(li => {
      const key = li.dataset.infoHash;
      if (key) existingMap.set(key, li);
    });

    const fragment = document.createDocumentFragment();

    activeTorrents.forEach(torrentData => {
      const infoHash = String(torrentData.infoHash || '');
      const id = safeId(infoHash);
      let li = existingMap.get(infoHash);

      if (!li) {
        li = document.createElement('li');
        li.id = id;
        li.dataset.infoHash = infoHash;
        li.classList.add('card','torrent','downloading');
        li.setAttribute('role','listitem');
        li.setAttribute('tabindex','0');

        const info = document.createElement('div');
        info.className = 'torrent-info';

        const name = document.createElement('span');
        name.className = 'torrent-name';
        name.textContent = torrentData.name || 'Resolving Metadata Pool...';

        const meta = document.createElement('span');
        meta.className = 'torrent-meta';
        meta.textContent = 'Handshaking with DHT...';

        const pbg = document.createElement('div');
        pbg.className = 'progress-bar-bg';
        const pfill = document.createElement('div');
        pfill.className = 'progress-bar-fill';
        pfill.style.width = '0%';
        pbg.appendChild(pfill);

        info.appendChild(name);
        info.appendChild(meta);
        info.appendChild(pbg);
        li.appendChild(info);

        li.oncontextmenu = (ev) => {
          ev.preventDefault();
          li.classList.add('selected');
          if (window.api && typeof window.api.showTorrentOptions === 'function') {
            window.api.showTorrentOptions(torrentData, { x: ev.clientX, y: ev.clientY });
          }
        };

        li.ondblclick = () => {
          if (window.api && typeof window.api.openTorrent === 'function') {
            window.api.openTorrent(torrentData);
          }
        };

        li.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            if (window.api && typeof window.api.openTorrent === 'function') {
              window.api.openTorrent(torrentData);
            }
          }
          if (ev.key === 'ContextMenu') {
            ev.preventDefault();
            li.classList.add('selected');
            if (window.api && typeof window.api.showTorrentOptions === 'function') {
              const rect = li.getBoundingClientRect();
              window.api.showTorrentOptions(torrentData, { x: rect.left + 10, y: rect.top + 10 });
            }
          }
        });

        fragment.appendChild(li);
        existingMap.set(infoHash, li);
      }

      const nameEl = li.querySelector('.torrent-name');
      const metaEl = li.querySelector('.torrent-meta');
      const pBar = li.querySelector('.progress-bar-fill');

      if (torrentData.name && nameEl && nameEl.textContent === 'Resolving Metadata Pool...') {
        nameEl.textContent = torrentData.name;
      }

      const progress = Math.max(0, Math.min(1, Number(torrentData.progress) || 0));
      const completionRatio = (progress * 100).toFixed(1);
      if (pBar) pBar.style.width = `${completionRatio}%`;

      // --- SHIELD LOGIC ADDED HERE ---
      const hasMetadata = torrentData.name && Number(torrentData.length) > 0;
      li.classList.remove('error', 'downloaded', 'stopped', 'downloading');

      // Only show errors IF metadata is resolved. Otherwise, swallow early tracker timeouts.
      if (torrentData.error && hasMetadata) {
        li.classList.add('error');
        if (metaEl) metaEl.textContent = `Fatal Error: ${safeText(torrentData.error)}`;
        
      } else if (torrentData.done) {
        li.classList.add('downloaded');
        if (metaEl) metaEl.textContent = `Status: Seed Complete | Payload: ${formatDataSize(Number(torrentData.length) || 0)}\n(Double-click to Play/Open | Right-click for Options)`;
        
      } else if (torrentData.paused) {
        li.classList.add('stopped');
        if (metaEl) metaEl.textContent = `Status: Inactive | Progress: ${completionRatio}%`;
        
      } else {
        li.classList.add('downloading');
        
        if (!hasMetadata) {
          // If app.js sends an error early, we ignore it and keep the user calm
          if (metaEl) metaEl.textContent = 'Handshaking with DHT... (Establishing connections)';
        } else {
          const speed = Number(torrentData.downloadSpeed) || 0;
          const timeRem = torrentData.timeRemaining;
          const timeRemMs = (typeof timeRem === 'number' && timeRem > 1000) ? timeRem : (typeof timeRem === 'number' ? timeRem * 1000 : undefined);
          if (metaEl) metaEl.textContent = `DL: ${formatDataSize(speed)}/s | Progress: ${completionRatio}% | ETR: ${calculateTimeRemaining(timeRemMs)}`;
        }
      }
      // --- END SHIELD LOGIC ---
    });

    if (fragment.childNodes.length) torrentUl.prepend(fragment);
  }

  function executeListFilter(query) {
    const q = String(query || '').toLowerCase();
    torrentUl.querySelectorAll('li').forEach(li => {
      const name = (li.querySelector('.torrent-name')?.textContent || '').toLowerCase();
      li.classList.toggle('hidden', !name.includes(q));
    });
  }

  function processInput(forceSubmit = false) {
    const raw = (searchBox && searchBox.value || '').trim();
    if (!raw) { executeListFilter(''); return; }
    if (forceSubmit) {
      if (raw.length < 10) { executeListFilter(raw); return; }
      if (window.api && typeof window.api.addTorrent === 'function') window.api.addTorrent(raw);
      if (searchBox) { searchBox.value = ''; searchBox.blur(); }
      executeListFilter('');
    } else {
      executeListFilter(raw);
    }
  }

  function pasteFromClipboard() {
    if (!window.api || typeof window.api.readClipboard !== 'function') return;
    try {
      const text = (window.api.readClipboard() || '').trim();
      if (text && searchBox) {
        searchBox.value = text;
        processInput(false);
      }
    } catch (err) {
      console.error('[Clipboard] read failed', err);
    }
  }

  // UI wiring
  const btnAppOptions = document.getElementById('app-options-btn');
  const btnOpenDownloads = document.getElementById('open-downloads');
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  if (btnAppOptions) {
    btnAppOptions.addEventListener('click', (ev) => {
      const rect = ev.currentTarget.getBoundingClientRect();
      if (window.api && typeof window.api.showAppOptions === 'function') {
        window.api.showAppOptions({ x: rect.x, y: rect.y });
      }
    });
  }
  if (btnOpenDownloads) btnOpenDownloads.addEventListener('click', () => window.api && window.api.openDownloadsFolder && window.api.openDownloadsFolder());
  if (btnMinimize) btnMinimize.addEventListener('click', () => window.api && window.api.minimize && window.api.minimize());
  if (btnMaximize) btnMaximize.addEventListener('click', () => window.api && window.api.maximize && window.api.maximize());
  if (btnClose) btnClose.addEventListener('click', () => window.api && window.api.closeWindow && window.api.closeWindow());

  if (searchBox) {
    searchBox.addEventListener('input', () => processInput(false));
    searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); processInput(true); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteFromClipboard(); }
    });
    searchBox.addEventListener('contextmenu', (e) => { e.preventDefault(); pasteFromClipboard(); });
  }

  if (window.api && typeof window.api.onPlatform === 'function') {
    window.api.onPlatform(({ osPlatform, isDarkMode }) => {
      document.body.classList.toggle('dark', !!isDarkMode);
      if (osPlatform) document.body.classList.add(osPlatform);
      document.body.classList.remove('hidden');
    });
  }

  if (window.api && typeof window.api.onStartPlyrStream === 'function') {
    window.api.onStartPlyrStream(({ streamUrl, mimeType }) => {
      try { startStream(streamUrl, mimeType); } catch (err) { console.error('[Renderer] start-plyr-stream error', err); }
    });
  }

  if (window.api && typeof window.api.onUpdateTorrents === 'function') {
    window.api.onUpdateTorrents((activeTorrents) => {
      if (!Array.isArray(activeTorrents)) return;
      scheduleRender(activeTorrents);
    });
  }

  if (window.api && typeof window.api.onRemoveTorrent === 'function') {
    window.api.onRemoveTorrent((infoHash) => {
      try {
        const node = document.querySelector(`[data-info-hash="${infoHash}"]`);
        if (node) node.remove();
      } catch (err) { console.error('[Renderer] remove-torrent error', err); }
    });
  }

  if (window.api && typeof window.api.onOptionsClosed === 'function') {
    window.api.onOptionsClosed(() => document.querySelectorAll('li.selected').forEach(n => n.classList.remove('selected')));
  }

  if (window.api && typeof window.api.onAddingTorrent === 'function') {
    window.api.onAddingTorrent(() => {
      if (messageDisplay) {
        messageDisplay.classList.remove('hidden');
        messageDisplay.textContent = 'Connecting to peer swarm... Accessing piece map.';
      }
    });
  }

  if (messageDisplay) messageDisplay.setAttribute('aria-live', 'polite');
  window.addEventListener('load', () => { try { if (searchBox) searchBox.focus(); } catch (e) {} });

  window.addEventListener('beforeunload', () => {
    try { const overlay = document.getElementById('plyr-play-overlay'); if (overlay) overlay.remove(); } catch (e) {}
  });

  // dev helpers
  if (location && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.__heapseed_debug = {
      renderNow: () => { try { if (pendingTorrents) renderTorrents(pendingTorrents); } catch (e) { console.error(e); } },
      getPlyr: () => plyrInstance
    };
  }

})();