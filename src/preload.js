// src/preload.js
const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- SEARCH ENGINE SUPPORT ---
  // We use invoke here because searching is an asynchronous request-response pattern
  searchTorrents: (query, category) => ipcRenderer.invoke('search-torrents', query, category),

  // --- EXISTING METHODS ---
  addTorrent: (uri) => ipcRenderer.send('add-torrent', uri),
  openDownloadsFolder: () => ipcRenderer.send('open-downloads-folder'),
  minimize: () => ipcRenderer.send('minimize:main-window'),
  maximize: () => ipcRenderer.send('maximize:main-window'),
  closeWindow: () => ipcRenderer.send('close:main-window'),
  showAppOptions: (coords) => ipcRenderer.send('show-app-options', coords),
  showTorrentOptions: (torrentData, coords) => ipcRenderer.send('show-torrent-options', torrentData, coords),
  openTorrent: (torrentData) => ipcRenderer.send('open-torrent', torrentData),
  setAppearance: (appearance) => ipcRenderer.send('set-appearance', appearance),
  
  readClipboard: () => {
    try { return clipboard.readText(); } catch (e) { return ''; }
  },

  // --- EVENT LISTENERS ---
  onPlatform: (cb) => ipcRenderer.on('platform', (e, osPlatform, isDarkMode, appearance) => cb({ osPlatform, isDarkMode, appearance })),
  onStartPlyrStream: (cb) => ipcRenderer.on('start-plyr-stream', (e, streamUrl, mimeType) => cb({ streamUrl, mimeType })),
  onUpdateTorrents: (cb) => ipcRenderer.on('update-torrents', (e, data) => cb(data)),
  onRemoveTorrent: (cb) => ipcRenderer.on('remove-torrent', (e, infoHash) => cb(infoHash)),
  onAddingTorrent: (cb) => ipcRenderer.on('adding-torrent', cb),
  onOptionsClosed: (cb) => ipcRenderer.on('options-menu-closed', cb),
  onTorrentError: (cb) => ipcRenderer.on('torrent-error', (e, infoHash, error) => cb({ infoHash, error })),
  onPauseTorrent: (cb) => ipcRenderer.on('pause-torrent', (e, infoHash) => cb(infoHash)),
  onResumeTorrent: (cb) => ipcRenderer.on('resume-torrent', (e, infoHash) => cb(infoHash)),
  onTorrentDone: (cb) => ipcRenderer.on('torrent-done', (e, infoHash, length) => cb({ infoHash, length }))
});
