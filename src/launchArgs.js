// Portions adapted from Tern (https://github.com/by-sonic/tern-torrent-client), Copyright (c) 2026 by-sonic, MIT License.
const fs = require('fs')
const path = require('path')

const MAGNET_RE = /^magnet:\?(?:[^#\s]*&)?xt=urn:btih:(?:[a-f0-9]{40}|[a-z2-7]{32})(?:&[^#\s]*)?$/i
const INFOHASH_RE = /^[a-f0-9]{40}$/i
const MAX_TORRENT_FILE_BYTES = 10 * 1024 * 1024

/** Absolute local path; UNC (\\host\share) is refused so Windows never opens an SMB connection. */
function isLocalAbsolutePath(p) {
    return typeof p === 'string' && path.isAbsolute(p) && !/^[\\/]{2}/.test(p)
}

function isTorrentFile(p) {
    try {
        const stat = fs.statSync(p)
        return stat.isFile() && stat.size > 0 && stat.size <= MAX_TORRENT_FILE_BYTES
    } catch (err) {
        return false
    }
}

/**
 * Everything on a command line HeapSeed can open: magnet links, info hashes and existing
 * local `.torrent` files. Switches, the executable and the app path are skipped. Relative
 * file paths resolve against `cwd`, because argv comes from the OS or a second instance.
 *
 * @param {string[]} argv
 * @param {string} [cwd]
 * @returns {string[]} magnet URIs and absolute `.torrent` paths, ready for `client.add`
 */
function parseLaunchArgs(argv, cwd = process.cwd()) {
    const found = []
    if (!Array.isArray(argv)) return found
    for (const raw of argv.slice(1)) {
        if (typeof raw !== 'string') continue
        const arg = raw.trim().replace(/^"(.*)"$/, '$1')
        if (!arg || arg.length > 8192 || arg.startsWith('-')) continue

        if (MAGNET_RE.test(arg)) { found.push(arg); continue }
        if (INFOHASH_RE.test(arg)) { found.push(`magnet:?xt=urn:btih:${arg.toLowerCase()}`); continue }
        if (/\.torrent$/i.test(arg) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(arg)) {
            const file = path.isAbsolute(arg) ? arg : path.resolve(cwd, arg)
            if (isLocalAbsolutePath(file) && isTorrentFile(file)) found.push(file)
        }
    }
    return found
}

module.exports = { parseLaunchArgs, isLocalAbsolutePath, MAX_TORRENT_FILE_BYTES }
