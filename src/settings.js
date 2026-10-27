// Portions adapted from Tern (https://github.com/by-sonic/tern-torrent-client), Copyright (c) 2026 by-sonic, MIT License.
const fs = require('fs')
const path = require('path')

const APPEARANCES = ['system', 'light', 'dark']
const ON_DONE_ACTIONS = ['nothing', 'mag_sound', 'mag_notification', 'system_notification', 'silent_notification']
const MAX_LIMIT_KB = 10000000

const DEFAULT_SETTINGS = Object.freeze({
    appearance: 'system',
    download_path: '',
    on_torrent_done: 'mag_sound',
    down_limit_kb: 0,       // 0 = unlimited
    up_limit_kb: 0,         // upload limit while anything is downloading
    seed_up_limit_kb: 20,   // upload limit while only seeding (HeapSeed's long-standing 20 KB/s cap)
    seed_after_done: true,  // off: finished torrents are paused and their peers disconnected
    close_to_tray: false,
    launch_at_login: false,
    auto_update: true
})

const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.floor(Number(value)) || 0))

/**
 * Merge an untrusted patch (renderer or Settings.json) into a valid settings object.
 * Unknown keys and wrongly typed values are dropped.
 */
function mergeSettings(base, patch) {
    const next = { ...base }
    if (!patch || typeof patch !== 'object') return next

    if (APPEARANCES.includes(patch.appearance)) next.appearance = patch.appearance
    if (ON_DONE_ACTIONS.includes(patch.on_torrent_done)) next.on_torrent_done = patch.on_torrent_done
    if (typeof patch.download_path === 'string' && path.isAbsolute(patch.download_path)) {
        next.download_path = path.resolve(patch.download_path)
    }
    for (const key of ['down_limit_kb', 'up_limit_kb', 'seed_up_limit_kb']) {
        if (patch[key] !== undefined) next[key] = clampInt(patch[key], 0, MAX_LIMIT_KB)
    }
    for (const key of ['seed_after_done', 'close_to_tray', 'launch_at_login', 'auto_update']) {
        if (typeof patch[key] === 'boolean') next[key] = patch[key]
    }
    return next
}

/**
 * Read a JSON file. A missing file returns the fallback; an unreadable one is moved
 * aside to `<file>.corrupt-<time>` so it can be inspected instead of silently lost.
 */
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
        if (err.code !== 'ENOENT') {
            try { fs.renameSync(file, `${file}.corrupt-${Date.now()}`) } catch (e) { /* nothing to keep */ }
            console.log('[System] Unreadable JSON moved aside:', file, err?.message || err)
        }
        return fallback
    }
}

/** Write through a temp file and rename, so a crash mid-write never leaves a half-written file. */
function writeJsonAtomic(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data))
    fs.renameSync(tmp, file)
}

/** Bytes per second for WebTorrent's throttle, where -1 disables throttling. */
function limitToRate(kb) {
    return kb > 0 ? kb * 1024 : -1
}

/** Upload rate: the seeding cap applies only while nothing is downloading. */
function uploadRate(settings, { anyActiveDownload, anySeeding }) {
    if (!anyActiveDownload && anySeeding) return limitToRate(settings.seed_up_limit_kb)
    return limitToRate(settings.up_limit_kb)
}

module.exports = { DEFAULT_SETTINGS, APPEARANCES, ON_DONE_ACTIONS, mergeSettings, readJson, writeJsonAtomic, limitToRate, uploadRate }
