const { app, BrowserWindow, clipboard, Menu, nativeTheme, dialog, ipcMain, Notification, shell } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const soundPlay = require('sound-play')
const http = require('http') // Native HTTP module added here
const axios = require('axios'); // You might need to run: npm install axios
const { DEFAULT_SETTINGS, mergeSettings, readJson, writeJsonAtomic, limitToRate, uploadRate } = require('./settings')
const { trashTorrentFiles } = require('./removal')
const { parseLaunchArgs } = require('./launchArgs')
const { defaultSelection, normalizeSelection, isPartial, selectionProgress } = require('./selection')
const { pauseTorrent, resumeTorrent } = require('./pause')
const tray = require('./tray')
const association = require('./association')

const sintel = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'
const sampleItems = [sintel]

const build_date = '2026.5.19'

// Hardened Process Guard
process.on('unhandledRejection', (reason) => console.log('[System] Swallowed Unhandled Rejection:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('[System] Swallowed Uncaught Exception:', err?.message || err));

// Global State Registry
let webTorrentClient, moveToTrash, autoUpdater
let mainWindow
let interval
let settings
let isQuitting = false
let isFinishing = false
// The renderer has loaded and registered its listeners (isLoading() can still be true inside did-finish-load)
let rendererReady = false
let activity = { anyActiveDownload: false, anySeeding: false }
// Torrents opened from the command line or a link before the engine is ready
let pendingLaunch = parseLaunchArgs(process.argv)
// Started by the login item: stay in the tray, no window
const startHidden = process.argv.includes('--hidden')

function isInfoHash(value) {
    return typeof value === 'string' && /^[a-fA-F0-9]{40}$/.test(value.trim())
}

function isMagnetURI(value) {
    return typeof value === 'string' && value.trim().startsWith('magnet:?xt=urn:btih:')
}

function isHttpTorrentURL(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) && value.toLowerCase().includes('.torrent')
}

function getValidTorrentIdentifier(value) {
    if (Buffer.isBuffer(value)) return value.length > 0 ? value : null
    if (isMagnetURI(value) || isInfoHash(value) || isHttpTorrentURL(value)) return value.trim()
    return null
}

function decodeSavedTorrentFile(value) {
    if (typeof value !== 'string' || value.length === 0) return null
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null

    try {
        const buffer = Buffer.from(value, 'base64')
        return buffer.length > 0 ? buffer : null
    } catch (err) {
        return null
    }
}

function getHistoryAddPayload(entry) {
    const torrentFile = decodeSavedTorrentFile(entry?.torrentFileBase64)
    if (torrentFile) return torrentFile
    return getValidTorrentIdentifier(entry?.magnetURI) || getValidTorrentIdentifier(entry?.infoHash)
}

const userFile = (name) => path.join(app.getPath('userData'), name)

/** Torrent ids from the OS (argv, links): add now, or queue until the engine is ready. */
function openLaunchInputs(inputs) {
    if (!inputs.length) return
    if (app.isReady() && webTorrentClient && settings) inputs.forEach((id) => addTorrent(id))
    else pendingLaunch.push(...inputs)
}

// Single-instance lock
if (app.requestSingleInstanceLock()) {
    app.on('second-instance', (e, argv, workingDir, data) => {
        openLaunchInputs(parseLaunchArgs(argv, workingDir))
        if (app.isReady() && settings && !argv.includes('--hidden')) showMainWindow()
    })
} else {
    app.quit()
}

/**
 * APP INITIALIZATION
 * Uses dynamic ESM imports for WebTorrent (2.x+ compatibility) and trash.
 */
app.whenReady().then(() => Promise.all([import('webtorrent'), import('trash')])).then(([WebTorrent, trash]) => {
    try {
        autoUpdater = require('electron-updater').autoUpdater
    } catch (err) {
        console.log('[Updater] Disabled:', err?.message || err)
    }

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

    // Load settings; unknown keys (such as the old custom update check's) are dropped
    settings = mergeSettings(
        { ...DEFAULT_SETTINGS, download_path: path.join(app.getPath('downloads'), 'HeapSeed') },
        readJson(userFile('Settings.json'), {})
    )

    // Ensure download directory exists
    if (fs.existsSync(settings['download_path']) === false) {
        fs.mkdirSync(settings['download_path'], { recursive: true })
    }

    applySettings()
    createAppMenu()
    syncTray()
    if (!(startHidden && tray.hasTray())) createMainWindow()

    // Restore session from History.json
    {
        let torrentJson = readJson(userFile('History.json'), [])
        let joinPath = path.join
        if (!Array.isArray(torrentJson)) torrentJson = []
        torrentJson.forEach((entry) => {
            try {
                const { name, path: downloadPath, paused } = entry
                const addPayload = getHistoryAddPayload(entry)
                const targetPath = typeof downloadPath === 'string' && downloadPath.length ? downloadPath : settings['download_path']
                if (!addPayload) {
                    console.log('[History] Skipping invalid saved torrent:', entry?.name || entry?.infoHash || 'unknown')
                    return
                }
                const savedSelection = Array.isArray(entry.selected) ? entry.selected : null
                const pickPending = entry.pickPending === true
                let torrent = webTorrentClient.add(addPayload, { path: targetPath, deselect: Boolean(savedSelection || pickPending) }, (torrent) => {
                    torrent.source = 'history'
                    if (paused) pauseTorrent(torrent)
                })
                torrent._heapAutoPaused = entry.autoPaused === true
                // `downloaded` reads 0 until existing data is verified; keep the saved answer meanwhile
                torrent._heapHasData = entry.hasData !== false
                if (savedSelection || pickPending) {
                    torrent._heapPickPending = pickPending
                    whenMetadata(torrent, () => {
                        if (pickPending) sendPickFiles(torrent, true)
                        else applySelection(torrent, savedSelection, { persist: false })
                    })
                }

                torrent.on('error', (err) => {
                    console.error('[History Torrent Error]:', err.message);
                    torrent.error = err.message || 'Torrent error';
                    pauseTorrent(torrent);
                    if (mainWindow) {
                        mainWindow.webContents.send('torrent-error', torrent.infoHash, err.message);
                    }
                });

                // Entries saved before nothing was written (hasData === false) have no folder yet
                if (name && entry.hasData !== false && fs.existsSync(joinPath(targetPath, name)) === false) {
                    torrent.error = 'Target folder/file does not exist'
                    pauseTorrent(torrent)
                }
            } catch (err) {
                console.log('[History] Skipping saved torrent:', err?.message || err)
            }
        })
        const queued = pendingLaunch
        pendingLaunch = []
        queued.forEach((id) => addTorrent(id))
    }

    interval = setInterval(updateTorrents, 3000)

    // Windows gets the full .torrent + magnet registration from the Settings button;
    // this keeps magnet links working out of the box. `--` blocks switch injection from links.
    const protocolArgs = process.platform === 'win32' ? [association.launcherPath(), ['--']] : []
    if (app.isPackaged && app.isDefaultProtocolClient('magnet', ...protocolArgs) === false) {
        app.setAsDefaultProtocolClient('magnet', ...protocolArgs)
    }
    if (app.isPackaged && autoUpdater && settings['auto_update']) {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => console.log('[Updater] Check failed:', err?.message || err))
    }
})

app.on('open-url', (e, url) => {
    e.preventDefault()
    const addPayload = getValidTorrentIdentifier(url)
    if (addPayload) openLaunchInputs([addPayload])
})

// macOS: a .torrent file opened from Finder
app.on('open-file', (e, filePath) => {
    e.preventDefault()
    openLaunchInputs(parseLaunchArgs(['', filePath]))
})

app.on('window-all-closed', () => {
    // With close-to-tray the app keeps seeding from the tray until "Quit" is chosen
    if (!isQuitting && settings?.['close_to_tray'] && tray.hasTray()) return
    finish()
})

app.on('activate', () => {
    if (settings && BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

nativeTheme.addListener('updated', (e) => {
    if (nativeTheme.themeSource === 'system') {
        mainWindow?.webContents.send('platform', process.platform, nativeTheme.shouldUseDarkColors, nativeTheme.themeSource)
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
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    if (platform === 'darwin') {
        mainWindow.setWindowButtonPosition({ x: 12, y: 16 })
    }
    
    if (os.platform() === 'darwin' && platform !== 'darwin') {
        mainWindow.setWindowButtonVisibility(platform === 'linux')
    }

    mainWindow.loadFile('src/view/index.html')

    rendererReady = false
    mainWindow.webContents.on('did-finish-load', () => {
        rendererReady = true
        mainWindow.webContents.send('platform', platform, dark, nativeTheme.themeSource)
        updateTorrents()
        // File choices asked for while the window was closed (tray, login start)
        webTorrentClient?.torrents.forEach((torrent) => {
            if (torrent._heapPickPending && torrent.files?.length) sendPickFiles(torrent, true)
        })
    })

    mainWindow.on('close', (e) => {
        // Closing to the tray is not quitting, so unfinished downloads keep going
        const willQuit = isQuitting || !(settings['close_to_tray'] && tray.hasTray())
        let okayToClose = true
        for (let torrent of (willQuit ? webTorrentClient?.torrents || [] : [])) {
            if (!isComplete(torrent) && torrent.name && fs.existsSync(path.join(torrent.path, torrent.name))) {
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
                    isQuitting = false
                    break
                case 1:
                    e.preventDefault()
                    isQuitting = false
                    mainWindow.minimize()
                    break
            }
        }
    })

    // Closing really closes the window (tray mode included), so its renderer memory is released
    mainWindow.on('closed', () => {
        mainWindow = null
        rendererReady = false
    })
}

function showMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createMainWindow()
        return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
}

/** Send to the renderer only while a window is open; in the tray there is nobody to tell. */
function sendToWindow(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
}

/** Quit for real (tray "Quit", menu "Quit"), even when close-to-tray is on. */
function quitApp() {
    isQuitting = true
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
    else finish()
}

/** =========================================================
 * SETTINGS
 * =========================================================
 */

function updateSettings(patch) {
    const previous = settings
    const next = mergeSettings(settings, patch)
    if (next['download_path'] !== previous['download_path']) fs.mkdirSync(next['download_path'], { recursive: true })
    settings = next
    applySettings(previous)
    persistSession()
    createAppMenu()
    sendToWindow('settings', settings)
    return settings
}

/** Apply what changed to the running app; with no `previous`, apply everything (startup). */
function applySettings(previous = {}) {
    if (settings['appearance'] !== previous['appearance']) {
        nativeTheme.themeSource = settings['appearance']
        sendToWindow('platform', process.platform, nativeTheme.shouldUseDarkColors, nativeTheme.themeSource)
    }
    applyThrottle()
    if (settings['launch_at_login'] !== previous['launch_at_login']) applyLoginItem()
    if (settings['close_to_tray'] !== previous['close_to_tray'] && previous['close_to_tray'] !== undefined) syncTray()
    if (settings['seed_after_done'] !== previous['seed_after_done'] && previous['seed_after_done'] !== undefined) {
        for (const torrent of webTorrentClient?.torrents || []) {
            if (settings['seed_after_done'] && torrent._heapAutoPaused) resumeTorrent(torrent)
            else enforceSeeding(torrent)
        }
    }
}

function applyThrottle() {
    if (!webTorrentClient) return
    webTorrentClient.throttleDownload(limitToRate(settings['down_limit_kb']))
    webTorrentClient.throttleUpload(uploadRate(settings, activity))
}

function applyLoginItem() {
    if (!app.isPackaged || !['win32', 'darwin'].includes(process.platform)) return
    app.setLoginItemSettings({ openAtLogin: settings['launch_at_login'], path: association.launcherPath(), args: ['--hidden'] })
}

/** The tray exists while close-to-tray is on, or when started hidden (it is then the only way in). */
function syncTray() {
    if (settings['close_to_tray'] || startHidden) {
        tray.createTray({
            iconPath: path.join(__dirname, 'view', 'icon.png'),
            onShow: showMainWindow,
            onResumeAll: startAllTransfers,
            onPauseAll: stopAllTransfers,
            onQuit: quitApp
        })
    } else {
        tray.destroyTray()
    }
}

ipcMain.handle('settings:get', () => ({
    settings,
    platform: process.platform,
    canSetDefault: process.platform === 'win32',
    canLaunchAtLogin: app.isPackaged && ['win32', 'darwin'].includes(process.platform)
}))

ipcMain.handle('settings:set', (e, patch) => updateSettings(patch))

ipcMain.handle('settings:pick-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        defaultPath: settings['download_path'],
        properties: ['createDirectory', 'openDirectory']
    })
    return canceled || filePaths.length === 0 ? null : filePaths[0]
})

ipcMain.handle('handler:register', () => association.registerAsHandler())

/** =========================================================
 * ADDING TORRENTS & CHOOSING FILES
 * =========================================================
 */

const findTorrent = (infoHash) => webTorrentClient?.torrents.find((t) => t.infoHash === infoHash)

/** Run `fn` once the torrent knows its files (now, or on its 'metadata' event). */
function whenMetadata(torrent, fn) {
    if (torrent.store && torrent.files?.length) fn()
    else torrent.once('metadata', fn)
}

/**
 * Add a torrent to the download folder. With `pick`, it starts with nothing selected and the
 * renderer is asked which files to download once the file list is known.
 */
function addTorrent(torrentId, { pick = true } = {}) {
    const torrent = webTorrentClient.add(torrentId, { path: settings['download_path'], deselect: pick })
    if (pick) {
        torrent._heapPickPending = true
        whenMetadata(torrent, () => {
            if (torrent.files.length <= 1) applySelection(torrent, null) // nothing to choose
            else sendPickFiles(torrent, true)
        })
    }
    return torrent
}

/** Ask the renderer which files to download. `initial` means the torrent waits on the answer. */
function sendPickFiles(torrent, initial) {
    if (torrent.destroyed || !torrent.files?.length) return
    const files = torrent.files.map((f) => ({ path: f.path, length: f.length }))
    const selected = normalizeSelection(torrent._heapSelected, files.length) ||
        (initial ? defaultSelection(files) : files.map(() => true))
    const payload = { infoHash: torrent.infoHash, name: torrent.name, files, selected, initial }
    if (!mainWindow || mainWindow.isDestroyed()) {
        if (!startHidden || !initial) showMainWindow() // did-finish-load sends pending choices
        return
    }
    if (rendererReady) sendToWindow('pick-files', payload)
}

/** Download only the chosen files; `null` (or an unusable choice) downloads everything. */
function applySelection(torrent, selected, { persist = true } = {}) {
    if (torrent.destroyed || !torrent.files?.length) return
    const clean = normalizeSelection(selected, torrent.files.length)
    torrent._heapPickPending = false
    torrent._heapSelected = isPartial(clean) ? clean : null
    const last = torrent.pieces.length - 1
    if (last >= 0) torrent.deselect(0, last)
    if (torrent._heapSelected) torrent.files.forEach((file, i) => { if (clean[i]) file.select() })
    else if (last >= 0) torrent.select(0, last)
    // Choosing files that are already on disk completes the torrent quietly
    torrent._heapCompleted = isComplete(torrent)
    enforceSeeding(torrent)
    if (persist) persistSession()
}

/** Done means every chosen file is downloaded; WebTorrent's own `done` needs every file. */
function isComplete(torrent) {
    if (torrent._heapPickPending) return false
    if (isPartial(torrent._heapSelected)) {
        return torrent.files.every((file, i) => !torrent._heapSelected[i] || file.done)
    }
    return Boolean(torrent.done)
}

/**
 * With "seed after download" off, a finished torrent is paused (and marked, so turning the
 * setting back on resumes only what it paused). Deferred: pausing inside WebTorrent's own
 * completion callback is unsafe.
 */
function enforceSeeding(torrent) {
    if (settings['seed_after_done'] || !torrent._heapCompleted || torrent.paused || torrent.destroyed) return
    setImmediate(() => {
        if (torrent.destroyed || torrent.paused || settings['seed_after_done']) return
        pauseTorrent(torrent)
        torrent._heapAutoPaused = true
        sendToWindow('pause-torrent', torrent.infoHash)
        persistSession()
    })
}

ipcMain.handle('torrent:select', (e, infoHash, selected) => {
    const torrent = findTorrent(infoHash)
    if (!torrent || !torrent.files?.length) throw new Error('Torrent is not ready')
    if (!normalizeSelection(selected, torrent.files.length)) throw new Error('Choose at least one file')
    applySelection(torrent, selected)
    return true
})

/** Cancelling the first file choice removes the torrent; nothing has been written yet. */
ipcMain.handle('torrent:cancel-pick', (e, infoHash) => {
    const torrent = findTorrent(infoHash)
    if (!torrent || !torrent._heapPickPending) return false
    torrent.destroy(() => notifyTorrentRemoved(infoHash))
    return true
})

/** =========================================================
 * REMOVING TORRENTS
 * =========================================================
 */

/** Ask the renderer to confirm removal; the dialog offers moving the files to the trash. */
function requestRemove(torrents) {
    const list = torrents.filter((t) => t && !t.destroyed).map((t) => ({ infoHash: t.infoHash, name: t.name || t.infoHash }))
    if (list.length) sendWhenLoaded('confirm-remove', list)
}

ipcMain.handle('torrent:remove', async (e, infoHashes, options) => {
    const trash = options?.trash === true
    const result = { removed: 0, moved: 0, kept: 0, failed: [] }
    for (const infoHash of (Array.isArray(infoHashes) ? infoHashes : [])) {
        const torrent = findTorrent(infoHash)
        if (!torrent || torrent.destroyed) continue // destroy() never calls back twice
        // Capture paths before destroy, which also closes the file handles Windows would keep locked
        const root = torrent.path
        const files = (torrent.files || []).map((f) => f.path)
        const otherFiles = webTorrentClient.torrents
            .filter((t) => t !== torrent)
            .flatMap((t) => (t.files || []).map((f) => path.join(t.path, f.path)))
        await new Promise((resolve) => torrent.destroy(() => resolve()))
        notifyTorrentRemoved(infoHash)
        result.removed++
        if (!trash || !files.length) continue
        const outcome = await trashTorrentFiles({
            root,
            files,
            otherFiles,
            // glob: false — names such as "Movie [1080p]" are file names, not patterns
            moveToTrash: (paths) => moveToTrash(paths, { glob: false })
        })
        result.moved += outcome.moved.length
        result.kept += outcome.kept.length
        result.failed.push(...outcome.failed)
    }
    return result
})

/** =========================================================
 * IPC EVENTS
 * =========================================================
 */

ipcMain.on('add-torrent', async (e, rawId) => {
    try {
        let torrentId = rawId ? rawId.trim() : '';
        if (!webTorrentClient || !torrentId) return;

        console.log('[IPC] Adding:', torrentId);
        if (mainWindow) mainWindow.webContents.send('adding-torrent');

        // --- STEP 1: FIX FOR THE 0x3a ERROR ---
        // If it's a web URL, we download it to a Buffer so WebTorrent doesn't choke
        if (torrentId.startsWith('http')) {
            try {
                const response = await axios.get(torrentId, { 
                    responseType: 'arraybuffer', 
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                torrentId = Buffer.from(response.data); 
                console.log('[System] URL converted to Buffer successfully.');
            } catch (fetchErr) {
                console.error('[Fetch Error]:', fetchErr.message);
                if (mainWindow) mainWindow.webContents.send('torrent-error', null, "Failed to fetch torrent payload: " + fetchErr.message);
                return;
            }
        }

        torrentId = getValidTorrentIdentifier(torrentId)
        if (!torrentId) {
            console.warn('[IPC] Ignoring invalid torrent identifier.');
            if (mainWindow) mainWindow.webContents.send('torrent-error', null, 'Invalid torrent identifier');
            return;
        }

        // --- STEP 2: SEARCH FOR EXISTING ---
        const existing = webTorrentClient.torrents.find(t => 
            t.infoHash === torrentId || 
            t.magnetURI === torrentId || 
            (typeof torrentId === 'string' && webTorrentClient.get(torrentId)?.infoHash === t.infoHash)
        );

        if (existing) {
            if (!existing.metadata) {
                if (typeof existing.destroy === 'function') existing.destroy();
                else webTorrentClient.remove(existing.infoHash);
            } else {
                console.warn('[Engine] Torrent already active.');
                return;
            }
        }

        // --- STEP 3: ADD AND LISTEN ---
        // Completion handling is attached by the client's 'torrent' event (onTorrent), not here,
        // so the done sound plays once
        const torrent = addTorrent(torrentId);

        torrent.on('error', (err) => {
            console.error('[Torrent Error]:', err.message);
            if (typeof torrent.destroy === 'function') torrent.destroy();
            if (mainWindow) mainWindow.webContents.send('torrent-error', torrent.infoHash, err.message);
        });

        if (mainWindow) {
            mainWindow.webContents.send('adding-torrent', { 
                infoHash: torrent.infoHash || 'loading',
                name: 'Initializing...' 
            });
        }

    } catch (err) {
        console.error('[IPC Failure] add-torrent:', err.message);
    }
});
ipcMain.on('open-torrent', async (e, frontendData) => {
    try {
        const { magnetURI, url: fallbackUrl, infoHash } = frontendData;
        const url = magnetURI || fallbackUrl;
        
        let activeTorrent = infoHash ? await webTorrentClient.get(infoHash) : null;

        if (!activeTorrent && url) {
            console.log('[Streaming] Adding:', url);
            const addPayload = getValidTorrentIdentifier(url)
            if (addPayload) activeTorrent = webTorrentClient.add(addPayload, { path: settings['download_path'] });
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
            
            // Prefer the files the user chose to download
            const chosen = isPartial(activeTorrent._heapSelected)
                ? activeTorrent.files.filter((f, i) => activeTorrent._heapSelected[i])
                : activeTorrent.files;
            const videoFile = chosen.reduce((p, c) => p.length > c.length ? p : c);
            
            const ext = path.extname(videoFile.name).toLowerCase();
            const isVideo = ['.mp4','.mkv','.avi','.webm','.mov'].includes(ext);
            
            if (!isVideo) {
                shell.showItemInFolder(path.join(activeTorrent.path, videoFile.path));
                return;
            }
            
            let mime = 'video/mp4';
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
    if (point) { point.x = Math.round(point.x); point.y = Math.round(point.y); }
    createAppOptionsMenu(point)
})

ipcMain.on('show-torrent-options', (e, torrent, point) => {
    if (point) { point.x = Math.round(point.x); point.y = Math.round(point.y); }
    createTorrentOptionsMenu(torrent, point)
})

ipcMain.on('file-dropped', (e, files) => {
    if (files.length === 0) return
    for (let f of files) {
        addTorrent(f)
    }
    sendToWindow('adding-torrent')
})

ipcMain.on('open-downloads-folder', (e) => {
    if (fs.existsSync(settings['download_path']) === false) {
        fs.mkdirSync(settings['download_path'])
    }
    shell.openPath(settings['download_path'])
})

ipcMain.on('set-appearance', (e, appearance) => {
    updateSettings({ appearance })
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
    if (isFinishing) return
    isFinishing = true
    isQuitting = true
    if (interval) clearInterval(interval)
    persistSession()
    tray.destroyTray()

    const destroyResult = webTorrentClient?.destroy();
    if (destroyResult && typeof destroyResult.then === 'function') {
        destroyResult.then(() => app.quit()).catch(() => app.quit());
    } else {
        app.quit();
    }
}

function serializeTorrent(torrent) {
    if (!torrent || torrent.destroyed) return null
    const torrentFileBase64 = torrent.torrentFile ? Buffer.from(torrent.torrentFile).toString('base64') : null
    const magnetURI = getValidTorrentIdentifier(torrent.magnetURI) || null
    const infoHash = isInfoHash(torrent.infoHash) ? torrent.infoHash : null

    if (!torrentFileBase64 && !magnetURI && !infoHash) return null

    return {
        name: torrent.name,
        infoHash,
        magnetURI,
        paused: torrent.paused,
        done: isComplete(torrent),
        path: torrent.path || settings['download_path'],
        torrentFileBase64,
        // File choice: null = every file; pickPending = asked but not answered yet
        selected: isPartial(torrent._heapSelected) ? torrent._heapSelected : null,
        pickPending: torrent._heapPickPending === true,
        autoPaused: torrent._heapAutoPaused === true, // paused because seeding is off
        hasData: torrent._heapHasData === true || torrent.downloaded > 0 || isComplete(torrent)
    }
}

function persistSession() {
    try {
        const torrents = (webTorrentClient?.torrents || []).map(serializeTorrent).filter(Boolean)
        settings['appearance'] = nativeTheme.themeSource
        writeJsonAtomic(userFile('History.json'), torrents)
        writeJsonAtomic(userFile('Settings.json'), settings)
    } catch (err) {
        console.log('[System] Failed to persist session:', err?.message || err)
    }
}

function notifyTorrentRemoved(infoHash) {
    sendToWindow('remove-torrent', infoHash)
    persistSession()
}

/** Open the window if needed and send once its page has loaded. */
function sendWhenLoaded(channel, ...args) {
    showMainWindow()
    if (rendererReady) {
        sendToWindow(channel, ...args)
    } else {
        mainWindow.webContents.once('did-finish-load', () => sendToWindow(channel, ...args))
    }
}

function openSettings() {
    sendWhenLoaded('open-settings')
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
        click: () => updateSettings({ appearance: value })
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
        click: () => {
            updateSettings({ on_torrent_done: value })
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
                { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: openSettings },
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
                    click: quitApp
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
                            if (torrent.paused || isComplete(torrent)) {
                                const infoHash = torrent.infoHash;
                                torrent.destroy(() => notifyTorrentRemoved(infoHash));
                            }
                        });
                    }
                },
                { label: 'Remove all transfers…', click: deleteAllTransfers }
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
                    if (torrent.paused || isComplete(torrent)) {
                        torrent.destroy(() => notifyTorrentRemoved(torrent.infoHash))
                    }
                })
            }
        },
        { type: 'separator' },
        { label: 'Settings…', click: openSettings },
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
        if (!torrent) return
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
                        restartTorrent(torrent)
                    }
                }
            },
            { type: 'separator' },
            {
                label: torrent.paused ? 'Resume transfer' : 'Pause transfer',
                enabled: doesTorrentExist,
                click: () => {
                    if (torrent.paused) {
                        resumeTorrent(torrent)
                        sendToWindow('resume-torrent', torrent.infoHash)
                    } else {
                        pauseTorrent(torrent)
                        sendToWindow('pause-torrent', torrent.infoHash)
                    }
                }
            },
            {
                label: 'Choose files…',
                enabled: (torrent.files?.length || 0) > 1,
                click: () => sendPickFiles(torrent, torrent._heapPickPending === true)
            },
            { type: 'separator' },
            {
                // One confirmation dialog; moving files to the trash is an unticked option there
                label: 'Remove…',
                click: () => requestRemove([torrent])
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
        menu.on('menu-will-close', (e) => sendToWindow('options-menu-closed'))
    })
}

function showAboutDialog(menuItem, browserWindow, event) {
    dialog.showMessageBox({
        message: 'HeapSeed',
        detail: 'Version ' + app.getVersion() + ' (' + build_date + ')\nDeveloped by Skonester',
        buttons: ['OK & Close', 'HeapSeed Git'],
        defaultId: 0,
    }).then(({ response }) => { if (response === 1) shell.openExternal('https://github.com/skonester/HeapSeed') })
}

function addTorrentFromFile(menuItem, browserWindow, event) {
    dialog.showOpenDialog({
        defaultPath: app.getPath('downloads'),
        filters: [{ name: 'torrent', extensions: ['torrent'] }]
    }).then(({ canceled, filePaths }) => {
        if (canceled || filePaths.length === 0) return
        addTorrent(filePaths[0])
    })
}

function setDownloadFolder(menuItem, browserWindow, event) {
    dialog.showOpenDialog(browserWindow, {
        defaultPath: settings['download_path'],
        properties: ['createDirectory', 'openDirectory']
    }).then(({ canceled, filePaths }) => {
        if (canceled || filePaths.length === 0) return
        updateSettings({ download_path: filePaths[0] })
    })
}

function startAllTransfers(menuItem, browserWindow, event) {
    webTorrentClient.torrents.forEach((torrent) => {
        if (Boolean(torrent.name) === false) return
        if (fs.existsSync(path.join(torrent.path, torrent.name)) === false) {
            restartTorrent(torrent)
        } else if (torrent.paused) {
            resumeTorrent(torrent)
        }
    })
}

/** Re-add a torrent whose files are gone, keeping the user's file choice. */
function restartTorrent(torrent) {
    const magnetURI = torrent.magnetURI
    const selected = isPartial(torrent._heapSelected) ? torrent._heapSelected : null
    torrent.destroy()
    notifyTorrentRemoved(torrent.infoHash)
    const restarted = webTorrentClient.add(magnetURI, { path: settings['download_path'], deselect: Boolean(selected) })
    if (selected) whenMetadata(restarted, () => applySelection(restarted, selected))
}

function stopAllTransfers(menuItem, browserWindow, event) {
    webTorrentClient.torrents.forEach((torrent) => pauseTorrent(torrent))
}

function deleteAllTransfers(menuItem, browserWindow, event) {
    requestRemove(webTorrentClient.torrents)
}

function formatRate(bytes) {
    const n = Number(bytes) || 0
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB/s'
    if (n >= 1024) return (n / 1024).toFixed(0) + ' KB/s'
    return n.toFixed(0) + ' B/s'
}

function updateTorrents() {
    if (!webTorrentClient || isFinishing) return
    let anyActiveDownload = false;
    let anySeeding = false;
    let activeCount = 0;

    for (const torrent of webTorrentClient.torrents) {
        if (torrent.paused) continue
        if (!isComplete(torrent)) { anyActiveDownload = true; activeCount++ }
        else anySeeding = true
    }

    // Upload: the user's limit while downloading, the seeding cap (default 20 KB/s) while only seeding
    activity = { anyActiveDownload, anySeeding }
    applyThrottle()

    tray.updateTray(`HeapSeed — ↓ ${formatRate(webTorrentClient.downloadSpeed)} ↑ ${formatRate(webTorrentClient.uploadSpeed)} · ${activeCount} active`)

    // In the tray there is no window: skip building the list
    if (!mainWindow || mainWindow.isDestroyed()) return

    let torrents = webTorrentClient.torrents.map((torrent) => {
        let type = 'unknown';
        if (torrent.files && torrent.files.length > 0) {
            const exts = torrent.files.map(f => path.extname(f.name).toLowerCase());
            if (exts.some(e => ['.mp4','.mkv','.avi','.webm','.mov'].includes(e))) type = 'video';
            else if (exts.some(e => ['.exe','.iso','.dmg','.appimage','.msi'].includes(e))) type = 'program';
            else if (exts.some(e => ['.mp3','.flac','.wav','.m4a'].includes(e))) type = 'audio';
            else if (exts.some(e => ['.zip','.rar','.7z','.tar','.gz'].includes(e))) type = 'archive';
        }

        // With some files left out, size and progress cover only the chosen files
        const partial = isPartial(torrent._heapSelected)
        const chosen = partial ? selectionProgress(torrent.files, torrent._heapSelected) : null
        const complete = isComplete(torrent)

        return {
            name: torrent.name, infoHash: torrent.infoHash, magnetURI: torrent.magnetURI,
            timeRemaining: torrent.timeRemaining, received: torrent.received, downloaded: torrent.downloaded, uploaded: torrent.uploaded,
            downloadSpeed: torrent.downloadSpeed, uploadSpeed: torrent.uploadSpeed,
            progress: complete ? 1 : (chosen ? chosen.progress : torrent.progress), path: torrent.path,
            ready: torrent.ready, paused: torrent.paused, done: complete,
            length: chosen ? chosen.length : torrent.length, source: torrent.source || 'session',
            numPeers: torrent.numPeers, fileType: type, pickPending: torrent._heapPickPending === true,
            autoPaused: torrent._heapAutoPaused === true,
            // Nothing is on disk until the first piece is written, so only flag a missing target after that
            error: (torrent.name && (torrent.downloaded > 0 || torrent._heapHasData) && !fs.existsSync(path.join(torrent.path, torrent.name))) ? `Target folder/file does not exist` : undefined
        }
    })

    sendToWindow('update-torrents', torrents || [])
}

/**
 * Called once per torrent when it is ready. Completion means every chosen file is done:
 * WebTorrent's own 'done' never fires while some files are deselected, so file 'done'
 * events are watched as well. A torrent already complete when it loads stays quiet.
 */
function onTorrent(torrent) {
    if (torrent._heapWatched) return
    torrent._heapWatched = true
    torrent._heapCompleted = isComplete(torrent)
    enforceSeeding(torrent)
    const check = () => {
        if (torrent.destroyed || torrent._heapCompleted || !isComplete(torrent)) return
        torrent._heapCompleted = true
        notifyTorrentDone(torrent)
        enforceSeeding(torrent)
    }
    torrent.on('done', check)
    torrent.files.forEach((file) => file.on('done', check))
}

function notifyTorrentDone(torrent) {
    let s = settings['on_torrent_done']
    sendToWindow('torrent-done', torrent.infoHash, torrent.length)
    persistSession()
    if (s === 'nothing') return
    if (s.startsWith('mag')) soundPlay.play(path.join(__dirname, 'assets', 'done.wav'))
    if (s.endsWith('_notification')) {
        new Notification({
            title: `${torrent.name} has been downloaded`,
            silent: s !== 'system_notification'
        }).show()
    }
}

function onError(error) {
    console.error('[WebTorrent Client Error]:', error?.message || error);
    sendToWindow('torrent-error', null, error?.message || String(error));
}
