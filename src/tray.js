// Portions adapted from Tern (https://github.com/by-sonic/tern-torrent-client), Copyright (c) 2026 by-sonic, MIT License.
const { Tray, Menu, nativeImage } = require('electron')

let tray = null
let tooltip = ''

/**
 * Create the tray icon once. Returns false when the desktop has no tray
 * (some Linux desktops), so callers can fall back to quitting on close.
 */
function createTray({ iconPath, onShow, onResumeAll, onPauseAll, onQuit }) {
    if (tray) return true
    try {
        const size = process.platform === 'win32' ? 16 : 22
        let image = nativeImage.createFromPath(iconPath)
        if (!image.isEmpty()) image = image.resize({ width: size, height: size })
        tray = new Tray(image)
    } catch (err) {
        console.log('[Tray] Unavailable:', err?.message || err)
        tray = null
        return false
    }
    tooltip = 'HeapSeed'
    tray.setToolTip(tooltip)
    tray.on('click', onShow)
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show HeapSeed', click: onShow },
        { type: 'separator' },
        { label: 'Resume all transfers', click: onResumeAll },
        { label: 'Pause all transfers', click: onPauseAll },
        { type: 'separator' },
        { label: 'Quit HeapSeed', click: onQuit }
    ]))
    return true
}

/** The native call is not free, so it is skipped when the text has not changed. */
function updateTray(text) {
    if (!tray || text === tooltip) return
    tooltip = text
    tray.setToolTip(text)
}

function hasTray() {
    return tray !== null
}

function destroyTray() {
    if (!tray) return
    tray.destroy()
    tray = null
    tooltip = ''
}

module.exports = { createTray, updateTray, hasTray, destroyTray }
