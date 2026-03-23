// src/preload.js
const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('api', {
  addTorrent: (uri) => ipcRenderer.send('add-torrent', uri),
  openDownloadsFolder: () => ipcRenderer.send('open-downloads-folder'),
  minimize: () => ipcRenderer.send('minimize:main-window'),
  maximize: () => ipcRenderer.send('maximize:main-window'),
  closeWindow: () => ipcRenderer.send('close:main-window'),
  showAppOptions: (coords) => ipcRenderer.send('show-app-options', coords),
  showTorrentOptions: (torrentData, coords) => ipcRenderer.send('show-torrent-options', torrentData, coords),
  openTorrent: (torrentData) => ipcRenderer.send('open-torrent', torrentData),
  readClipboard: () => {
    try { return clipboard.readText(); } catch (e) { return ''; }
  },
  onPlatform: (cb) => ipcRenderer.on('platform', (e, osPlatform, isDarkMode) => cb({ osPlatform, isDarkMode })),
  onStartPlyrStream: (cb) => ipcRenderer.on('start-plyr-stream', (e, streamUrl, mimeType) => cb({ streamUrl, mimeType })),
  onUpdateTorrents: (cb) => ipcRenderer.on('update-torrents', (e, data) => cb(data)),
  onRemoveTorrent: (cb) => ipcRenderer.on('remove-torrent', (e, infoHash) => cb(infoHash)),
  onAddingTorrent: (cb) => ipcRenderer.on('adding-torrent', cb),
  onOptionsClosed: (cb) => ipcRenderer.on('options-menu-closed', cb)
});
