const { app, BrowserWindow, clipboard, Menu, nativeTheme, dialog, ipcMain, Notification, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
const os = require('os')
const path = require('path')
const soundPlay = require('sound-play')
const http = require('http') // Native HTTP module added here
const VERSION_CODE = 11;

const sintel = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'
const sampleItems = [sintel]

const build_date = '2024.12.14'

// Global State Registry
let webTorrentClient, moveToTrash
let mainWindow
let interval
let deepLinkUrl
let settings

// Single-instance lock
if (app.requestSingleInstanceLock()) {
    app.on('second-instance', (e, argv, workingDir, data) => {
        let url = argv.pop()
        if (app.isReady() && webTorrentClient && url) {
            webTorrentClient.add(url, { path: settings['download_path'] })
        } else {
            deepLinkUrl = url
        }
    })
} else {
    app.quit()
}

/**
 * APP INITIALIZATION
 * Uses dynamic ESM imports for WebTorrent (2.x+ compatibility) and trash.
 */
app.whenReady().then(() => Promise.all([import('webtorrent'), import('trash')])).then(([WebTorrent, trash]) => {
    // ENGINE INITIALIZATION - optimized DHT/Tracker settings
    webTorrentClient = new WebTorrent.default({
        maxConns: 55,
        dht: true,
        lsd: true,
        utp: true
    })
    webTorrentClient.on('torrent', onTorrent)
    webTorrentClient.on('error', onError)
    moveToTrash = trash.default

    // Load or initialize settings
    if (fs.existsSync(path.join(app.getPath('userData'), 'Settings.json'))) {
        settings = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'Settings.json')))
    } else {
        settings = {
            'appearance': 'system',
            'download_path': path.join(app.getPath('downloads'), 'Heapseed'),
            'last_cfu': 0,
            'new_version': {
                vc: VERSION_CODE,
                vn: app.getVersion()
            },
            'on_torrent_done': 'mag_sound',
        }
    }

    // Ensure download directory exists
    if (fs.existsSync(settings['download_path']) === false) {
        fs.mkdirSync(settings['download_path'])
    }

    // Restore session from History.json
    if (fs.existsSync(path.join(app.getPath('userData'), 'History.json'))) {
        let torrentJson = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'History.json')))
        let joinPath = path.join
        torrentJson.forEach(({ magnetURI, name, path, paused }) => {
            let torrent = webTorrentClient.add(magnetURI, { path: path }, (torrent) => {
                torrent.source = 'history'
                if (paused) torrent.pause()
            })
            if (fs.existsSync(joinPath(path, name)) === false) {
                torrent.error = '123'
                torrent.pause()
            }
        })
        if (deepLinkUrl) {
            webTorrentClient.add(deepLinkUrl, { path: settings['download_path'] })
            deepLinkUrl = undefined
        }
    }

    createAppMenu()
    createMainWindow()

    if (app.isDefaultProtocolClient('magnet') === false && app.isPackaged) {
        app.setAsDefaultProtocolClient('magnet')
    }
    autoUpdater.checkForUpdatesAndNotify()
})

app.on('open-url', (e, url) => {
    if (app.isReady()) {
        webTorrentClient.add(url, { path: settings['download_path'] })
    } else {
        deepLinkUrl = url
    }
})

app.on('window-all-closed', () => {
    finish()
})

nativeTheme.addListener('updated', (e) => {
    if (nativeTheme.themeSource === 'system') {
        mainWindow.webContents.send('platform', process.platform, nativeTheme.shouldUseDarkColors)
    }
})

/**
 * WINDOW LIFECYCLE
 */
function createMainWindow() {
    nativeTheme.themeSource = settings['appearance'] || 'system'
    let platform = process.platform
    let dark = nativeTheme.shouldUseDarkColors

    mainWindow = new BrowserWindow({
        backgroundColor: dark ? '#202020' : '#FFFFFF',
        height: 600,
        width: 800,
        minWidth: 800,
        minHeight: 600,
        autoHideMenuBar: true,
        frame: platform === 'linux',
        titleBarStyle: platform === 'linux' ? 'default' : (platform === 'darwin' ? 'hiddenInset' : 'hidden'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: true
        }
    })

    if (platform === 'darwin') {
        mainWindow.setWindowButtonPosition({ x: 12, y: 16 })
    }
    
    if (os.platform() === 'darwin' && platform !== 'darwin') {
        mainWindow.setWindowButtonVisibility(platform === 'linux')
    }

    mainWindow.loadFile('src/view/index.html')

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('platform', platform, dark)
        if (interval === undefined) interval = setInterval(updateTorrents, 3000)
    })

mainWindow.on('close', (e) => {
        let okayToClose = true
        for (let torrent of webTorrentClient.torrents) {
            if (torrent.done === false && torrent.name && fs.existsSync(path.join(torrent.path, torrent.name))) {
                okayToClose = false
                break
            }
        }
        if (okayToClose === false) {
            let response = dialog.showMessageBoxSync(mainWindow, {
                message: 'Some downloads are not finished',
                detail: 'Are you sure want to quit HeapSeed?',
                buttons: ['Cancel', 'Minimize', 'Quit'],
                noLink: true
            })
            switch (response) {
                case 0:
                    e.preventDefault()
                    break
                case 1:
                    e.preventDefault()
                    mainWindow.minimize()
                    break
            }
        }
        if (interval) clearInterval(interval)
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
}

/** =========================================================
 * IPC EVENTS
 * =========================================================
 */

ipcMain.on('add-torrent', (e, torrentId) => {
    try {
        console.log('[IPC] Adding:', torrentId)
        if (!webTorrentClient) return

        const existing = webTorrentClient.get(torrentId)
        if (existing) {
            console.warn('[Engine] Torrent already active.')
            return
        }

        const torrent = webTorrentClient.add(torrentId, { path: settings['download_path'] })

        torrent.on('metadata', () => {
            console.log('[Engine] Metadata Resolved:', torrent.name)
            onTorrent(torrent)
        })

        torrent.on('error', (err) => {
            console.error('[Torrent Error]:', err.message)
            if (mainWindow) {
                mainWindow.webContents.send('torrent-error', torrent.infoHash, err.message)
            }
        })

        mainWindow.webContents.send('adding-torrent')
    } catch (err) {
        console.error('[IPC Failure] add-torrent:', err)
    }
})

ipcMain.on('open-torrent', async (e, frontendData) => {
    try {
        const { magnetURI, url: fallbackUrl, infoHash } = frontendData;
        const url = magnetURI || fallbackUrl;
        
        let activeTorrent = infoHash ? await webTorrentClient.get(infoHash) : null;

        if (!activeTorrent && url) {
            console.log('[Streaming] Adding:', url);
            activeTorrent = webTorrentClient.add(url, { path: settings['download_path'] });
        }

        if (!activeTorrent) {
            dialog.showErrorBox('Error', 'No torrent.');
            return;
        }

        const startStreamingProcess = () => {
            if (!activeTorrent.files?.length) {
                dialog.showErrorBox('Error', 'No files.');
                return;
            }
            
            const videoFile = activeTorrent.files.reduce((p, c) => p.length > c.length ? p : c);
            
            let mime = 'video/mp4';
            const ext = path.extname(videoFile.name).toLowerCase();
            if (ext === '.mkv') mime = 'video/x-matroska';
            if (ext === '.webm') mime = 'video/webm';

            if (!activeTorrent.server) {
                activeTorrent.server = http.createServer((req, res) => {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
                    
                    const range = req.headers.range;
                    
                    if (!range) {
                        res.writeHead(200, {
                            'Content-Length': videoFile.length,
                            'Content-Type': mime
                        });
                        videoFile.createReadStream().pipe(res);
                        return;
                    }

                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : videoFile.length - 1;
                    const chunksize = (end - start) + 1;

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${videoFile.length}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': mime
                    });
                    
                    videoFile.createReadStream({ start, end }).pipe(res);
                });

                // Intercept the torrent's destroy method to shut down the server safely
                const originalDestroy = activeTorrent.destroy;
                activeTorrent.destroy = function() {
                    if (activeTorrent.server) {
                        activeTorrent.server.close(() => console.log('[Streaming] Server safely closed.'));
                        activeTorrent.server = null;
                    }
                    originalDestroy.apply(this, arguments);
                };

                activeTorrent.server.listen(0, () => {
                    const port = activeTorrent.server.address().port;
                    const streamUrl = `http://localhost:${port}/`;
                    console.log('[Streaming] LIVE:', streamUrl);
                    mainWindow.webContents.send('start-plyr-stream', streamUrl, mime);
                });
            } else {
                const port = activeTorrent.server.address().port;
                mainWindow.webContents.send('start-plyr-stream', `http://localhost:${port}/`, mime);
            }
        };

        if (activeTorrent.ready) {
            startStreamingProcess();
        } else {
            activeTorrent.once('metadata', startStreamingProcess);
        }
    } catch (err) {
        console.error('[open-torrent]:', err);
    }
})


ipcMain.on('show-app-options', (e, point) => {
    createAppOptionsMenu(point)
})

ipcMain.on('show-torrent-options', (e, torrent, point) => {
    createTorrentOptionsMenu(torrent, point)
})

ipcMain.on('file-dropped', (e, files) => {
    if (files.length === 0) return
    for (let f of files) {
        webTorrentClient.add(f, { path: settings['download_path'] })
    }
    mainWindow.webContents.send('adding-torrent')
})

ipcMain.on('open-downloads-folder', (e) => {
    if (fs.existsSync(settings['download_path']) === false) {
        fs.mkdirSync(settings['download_path'])
    }
    shell.openPath(settings['download_path'])
})

ipcMain.on('minimize:main-window', () => mainWindow.minimize())

ipcMain.on('maximize:main-window', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
})

ipcMain.on('unmaximize:main-window', () => mainWindow.unmaximize())

ipcMain.on('close:main-window', () => mainWindow.close())

/** End of IPC events */

/**
 * STATE SERIALIZATION & CLEANUP
 */
function finish() {
    let torrents = webTorrentClient.torrents.map((torrent) => ({
        name: torrent.name,
        infoHash: torrent.infoHash,
        magnetURI: torrent.magnetURI,
        paused: torrent.paused,
        done: torrent.done,
        path: torrent.path
    }))
    settings['appearance'] = nativeTheme.themeSource
    fs.writeFileSync(path.join(app.getPath('userData'), 'History.json'), JSON.stringify(torrents))
    fs.writeFileSync(path.join(app.getPath('userData'), 'Settings.json'), JSON.stringify(settings))
    webTorrentClient.destroy((error) => app.quit())
}

function createAppearanceMenu() {
    return [
        { label: 'System', value: 'system' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
    ].map(({ label, value }) => ({
        label: label,
        type: 'radio',
        checked: settings['appearance'] === value,
        click: (item) => {
            nativeTheme.themeSource = value
            settings['appearance'] = value
            item.checked = true
            mainWindow.webContents.send('platform', process.platform, nativeTheme.shouldUseDarkColors)
        }
    }))
}

function createOnTorrentDoneMenu() {
    return [
        { label: 'Do nothing', value: 'nothing' },
        { label: 'Play Mag sound', value: 'mag_sound' },
        { label: 'Show notification with Mag sound', value: 'mag_notification' },
        { label: 'Show notification with System sound', value: 'system_notification' },
        { label: 'Show Silent notification', value: 'silent_notification' },
    ].map(({ label, value }) => ({
        label: label,
        type: 'radio',
        checked: settings['on_torrent_done'] === value,
        click: (item) => {
            settings['on_torrent_done'] = value
            item.checked = true
            if (value.indexOf('mag') > -1) soundPlay.play(path.join(__dirname, 'assets', 'done.wav'))
        }
    }))
}

function createAppMenu() {
    const template = [
        {
            label: 'HeapSeed',
            submenu: [
                { label: 'About HeapSeed', click: showAboutDialog },
                { type: 'separator' },
                { label: 'Appearance', submenu: createAppearanceMenu() },
                { label: 'On Torrent done', submenu: createOnTorrentDoneMenu() },
                { label: 'Set Download folder', click: setDownloadFolder },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                {
                    label: 'Quit HeapSeed',
                    accelerator: 'Cmd+q',
                    click: () => BrowserWindow.getAllWindows().forEach((window) => window.close())
                }
            ]
        },
        {
            label: 'File',
            submenu: [
                { label: 'Add from Torrent file', click: addTorrentFromFile },
                { type: 'separator' },
                { label: 'Start all transfers', click: startAllTransfers },
                { label: 'Stop all transfers', click: stopAllTransfers },
                { type: 'separator' },
                {
                    label: 'Delete all inactive transfers',
                    click: () => {
                        webTorrentClient.torrents.forEach((torrent) => {
                            if (torrent.paused || torrent.done) {
                                const infoHash = torrent.infoHash;
                                torrent.destroy(() => {
                                    if (mainWindow) mainWindow.webContents.send('remove-torrent', infoHash);
                                });
                            }
                        });
                    }
                }
            ]
        },
        { role: 'editMenu' },
        { role: 'viewMenu', visible: !app.isPackaged },
        { role: 'windowMenu' }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createAppOptionsMenu(point) {
    let menu = Menu.buildFromTemplate([
        { label: 'Add from Torrent file', click: addTorrentFromFile },
        { type: 'separator' },
        { label: 'Start all transfers', click: startAllTransfers },
        { label: 'Stop all transfers', click: stopAllTransfers },
        { type: 'separator' },
        {
            label: 'Delete all inactive transfers',
            click: () => {
                webTorrentClient.torrents.forEach((torrent) => {
                    if (torrent.paused || torrent.done) {
                        torrent.destroy(() => mainWindow.webContents.send('remove-torrent', torrent.infoHash))
                    }
                })
            }
        },
        { type: 'separator' },
        { label: 'Appearance', submenu: createAppearanceMenu() },
        { label: 'On Torrent done', submenu: createOnTorrentDoneMenu() },
        { label: 'Set Download folder', click: setDownloadFolder },
        { type: 'separator' },
        { label: 'About HeapSeed', click: showAboutDialog }
    ])
    menu.popup(point)
}

function createTorrentOptionsMenu({ infoHash }, point) {
    webTorrentClient.get(infoHash).then((torrent) => {
        let torrentPath = path.join(torrent.path, torrent.name)
        let doesTorrentExist = fs.existsSync(torrentPath)
        let menu = Menu.buildFromTemplate(
        torrent !== null ? [
            {
                label: doesTorrentExist ? 'Show in ' + (process.platform === 'darwin' ? 'Finder' : 'Files') : 'Restart torrent',
                click: () => {
                    if (doesTorrentExist) {
                        shell.showItemInFolder(torrentPath)
                    } else {
                        let magnetURI = torrent.magnetURI
                        torrent.destroy()
                        mainWindow.webContents.send('remove-torrent', torrent.infoHash)
                        webTorrentClient.add(magnetURI, { path: settings['download_path'] })
                    }
                }
            },
            { type: 'separator' },
            {
                label: torrent.paused ? 'Resume transfer' : 'Pause transfer',
                enabled: doesTorrentExist,
                click: () => {
                    if (torrent.paused) {
                        torrent.resume()
                        mainWindow.webContents.send('resume-torrent', torrent.infoHash)
                    } else {
                        torrent.pause()
                        mainWindow.webContents.send('pause-torrent', torrent.infoHash)
                    }
                }
            },
            {
                label: 'Remove torrent',
                click: () => torrent.destroy(() => mainWindow.webContents.send('remove-torrent', torrent.infoHash))
            },
            {
                label: 'Move to ' + (process.platform === 'win32' ? 'Recycle Bin' : 'Trash'),
                click: () => {
                    torrent.destroy(() => {
                        let p = path.join(torrent.path, torrent.name)
                        if (fs.existsSync(p)) moveToTrash(p)
                        mainWindow.webContents.send('remove-torrent', torrent.infoHash)
                    })
                }
            },
            {
                label: 'Delete permanently',
                click: () => {
                    torrent.destroy(() => {
                        let p = path.join(torrent.path, torrent.name)
                        if (fs.existsSync(p)) fs.rmSync(p, { recursive: true })
                        mainWindow.webContents.send('remove-torrent', torrent.infoHash)
                    })
                }
            },
            { type: 'separator' },
            {
                label: 'Copy Magnet URL',
                click: () => clipboard.writeText(torrent.magnetURI)
            },
            {
                label: 'Copy Info Hash',
                click: () => clipboard.writeText(torrent.infoHash)
            }
        ] : [
            { label: 'Delete torrent', click: () => console.log('Delete from list') }
        ])
        menu.popup(point)
        menu.on('menu-will-close', (e) => mainWindow.webContents.send('options-menu-closed'))
    })
}

function showAboutDialog(menuItem, browserWindow, event) {
    dialog.showMessageBox({
        message: 'HeapSeed',
        detail: 'Version ' + app.getVersion() + ' (' + build_date + ')\nDeveloped by Skonester',
        buttons: ['OK & Close', 'HeapSeed Git'],
        defaultId: 0,
    }).then(({ response }) => { if (response === 1) shell.openExternal('https://github.com/skonester') })
}

function addTorrentFromFile(menuItem, browserWindow, event) {
    dialog.showOpenDialog({
        defaultPath: app.getPath('downloads'),
        filters: [{ name: 'torrent', extensions: ['torrent'] }]
    }).then(({ canceled, filePaths }) => {
        if (canceled || filePaths.length === 0) return
        webTorrentClient.add(filePaths[0], { path: settings['download_path'] })
    })
}

function setDownloadFolder(menuItem, browserWindow, event) {
    dialog.showOpenDialog(browserWindow, {
        defaultPath: settings['download_path'],
        properties: ['createDirectory', 'openDirectory']
    }).then(({ canceled, filePaths }) => {
        if (canceled || filePaths.length === 0) return
        settings['download_path'] = filePaths[0]
    })
}

function startAllTransfers(menuItem, browserWindow, event) {
    webTorrentClient.torrents.forEach((torrent) => {
        if (Boolean(torrent.name) === false) return
        if (fs.existsSync(path.join(torrent.path, torrent.name)) === false) {
            let magnetURI = torrent.magnetURI
            torrent.destroy()
            webTorrentClient.add(magnetURI, { path: settings['download_path'] })
        } else if (torrent.paused) {
            torrent.resume()
        }
    })
}

function stopAllTransfers(menuItem, browserWindow, event) {
    webTorrentClient.torrents.forEach((torrent) => torrent.pause())
}

function deleteAllTransfers(menuItem, browserWindow, event) {
    dialog.showMessageBox(browserWindow, {
        message: 'Delete all current transfers?',
        buttons: ['Delete all transfers and keep files', 'Delete all transfers and delete files', 'Cancel'],
        defaultId: 2,
        noLink: true,
        type: 'question',
    }).then(({ response }) => {
        if (response === 2) return
        webTorrentClient.torrents.forEach((torrent) => {
            let infoHash = torrent.infoHash
            let torrentPath = path.join(torrent.path, torrent.name)
            torrent.destroy(() => {
                mainWindow.webContents.send('remove-torrent', infoHash)
                if (response === 1) fs.rmSync(torrentPath, { recursive: true })
            })
        })
    })
}

function updateTorrents() {
    let torrents = webTorrentClient.torrents.map((torrent) => ({
        name: torrent.name, infoHash: torrent.infoHash, magnetURI: torrent.magnetURI,
        timeRemaining: torrent.timeRemaining, received: torrent.received, downloaded: torrent.downloaded, uploaded: torrent.uploaded,
        downloadSpeed: torrent.downloadSpeed, uploadSpeed: torrent.uploadSpeed, progress: torrent.progress, path: torrent.path,
        ready: torrent.ready, paused: torrent.paused, done: torrent.done, length: torrent.length, source: torrent.source || 'session',
        numPeers: torrent.numPeers,
        // FIX: Safely check if torrent.name exists before joining path to prevent crash
        error: (torrent.name && !fs.existsSync(path.join(torrent.path, torrent.name))) ? `Target folder/file does not exist` : undefined
    }))
    mainWindow.webContents.send('update-torrents', torrents || [])
}

function onTorrent(torrent) {
    if (torrent.source === 'history') return
    torrent.on('done', () => {
        let s = settings['on_torrent_done']
        if (s === 'nothing') return
        if (s.startsWith('mag')) soundPlay.play(path.join(__dirname, 'assets', 'done.wav'))
        if (s.endsWith('_notification')) {
            new Notification({
                title: `${torrent.name} has been downloaded`,
                silent: s !== 'system_notification'
            }).show()
        }
        mainWindow.webContents.send('torrent-done', torrent.infoHash, torrent.length)
    })
}

function onError(error) {
    dialog.showErrorBox('Error', 'An error occurred.\n' + error)
}

function checkForUpdate(now) {
    if (app.isPackaged === false) return
    if (now < 1693501200000) return

    const lastUpdate = settings['last_cfu']
    const newVersion = settings['new_version']
    if (newVersion.vc > VERSION_CODE) {
        showUpdateDialog(newVersion)
    } else if (now - lastUpdate > 86400000 * 7) {
        fetch('https://yuhapps.dev/api/mtr/cfu').then((res) => res.json())
        .then((newVersion) => {
            settings['last_cfu'] = now
            if (newVersion.vc > VERSION_CODE) {
                showUpdateDialog(newVersion)
            }
        }).catch((error) => console.log(error))
    }
}

function showUpdateDialog(newVersion) {
    dialog.showMessageBox({
        message: 'Update available',
        detail: 'There is a new update for HeapSeed (' + newVersion.vn + '). Download it now?',
        buttons: ['Download now', 'Maybe later']
    }).then(({ response }) => {
        settings['new_version'] = newVersion
        if (response === 0) shell.openExternal('https://github.com')
    })
}