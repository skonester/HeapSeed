// Portions adapted from Tern (https://github.com/by-sonic/tern-torrent-client), Copyright (c) 2026 by-sonic, MIT License.
const { execFile } = require('child_process')
const { promisify } = require('util')
const { app, shell } = require('electron')

const run = promisify(execFile)
const APP_KEY = 'HeapSeed'

/** The portable build runs from a temporary folder; Windows must launch the portable .exe itself. */
function launcherPath() {
    return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
}

/**
 * Command line Windows runs when a .torrent file or magnet link is opened.
 * `--` stops Chromium's switch parsing, so a link containing a quote cannot inject switches.
 */
function openCommand() {
    const exe = launcherPath()
    return app.isPackaged ? `"${exe}" -- "%1"` : `"${exe}" "${app.getAppPath()}" -- "%1"`
}

async function regAdd(key, name, value) {
    const args = ['add', `HKCU\\${key}`, '/f']
    if (name === '') args.push('/ve')
    else args.push('/v', name)
    if (value) args.push('/d', value)
    await run('reg.exe', args, { windowsHide: true })
}

/**
 * Registers HeapSeed as a candidate handler for .torrent and magnet: in the current user's
 * registry (no admin needed) and opens Windows' Default apps page for it. Windows does not
 * let apps claim the default silently: the person picks HeapSeed there.
 */
async function registerAsHandler() {
    if (process.platform !== 'win32') throw new Error('Only supported on Windows')
    const cls = 'Software\\Classes'
    const icon = `${launcherPath()},0`

    await regAdd(`${cls}\\HeapSeed.Torrent`, '', 'Torrent file')
    await regAdd(`${cls}\\HeapSeed.Torrent\\DefaultIcon`, '', icon)
    await regAdd(`${cls}\\HeapSeed.Torrent\\shell\\open\\command`, '', openCommand())

    await regAdd(`${cls}\\HeapSeed.Magnet`, '', 'URL:Magnet link')
    await regAdd(`${cls}\\HeapSeed.Magnet`, 'URL Protocol', '')
    await regAdd(`${cls}\\HeapSeed.Magnet\\DefaultIcon`, '', icon)
    await regAdd(`${cls}\\HeapSeed.Magnet\\shell\\open\\command`, '', openCommand())

    await regAdd(`${cls}\\.torrent\\OpenWithProgids`, 'HeapSeed.Torrent', '')

    const caps = `Software\\${APP_KEY}\\Capabilities`
    await regAdd(caps, 'ApplicationName', 'HeapSeed')
    await regAdd(caps, 'ApplicationDescription', 'BitTorrent client with streaming playback')
    await regAdd(`${caps}\\FileAssociations`, '.torrent', 'HeapSeed.Torrent')
    await regAdd(`${caps}\\UrlAssociations`, 'magnet', 'HeapSeed.Magnet')
    await regAdd('Software\\RegisteredApplications', APP_KEY, caps)

    await shell.openExternal(`ms-settings:defaultapps?registeredAppUser=${APP_KEY}`)
}

module.exports = { launcherPath, registerAsHandler }
