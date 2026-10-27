// Pure helpers for choosing which files of a torrent to download.
const path = require('path')

const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.webm', '.mov']

const isVideo = (file) => VIDEO_EXTS.includes(path.extname(file.path || file.name || '').toLowerCase())
const isSample = (file) => /(^|[\\/._\s-])sample([\\/._\s-]|$)/i.test(file.path || file.name || '')

/**
 * Pre-ticked files for the picker: the videos (skipping samples when there is a real video),
 * or everything when the torrent has no video.
 * @param {{ path: string, length: number }[]} files
 * @returns {boolean[]}
 */
function defaultSelection(files) {
    const videos = files.map(isVideo)
    if (!videos.some(Boolean)) return files.map(() => true)
    const mainVideos = files.map((f, i) => videos[i] && !isSample(f))
    return mainVideos.some(Boolean) ? mainVideos : videos
}

/** A saved or renderer-sent selection, or null when it does not fit this torrent. */
function normalizeSelection(selected, count) {
    if (!Array.isArray(selected) || selected.length !== count || count === 0) return null
    const clean = selected.map((v) => v === true)
    return clean.some(Boolean) ? clean : null
}

/** True when some files are left out; a full selection behaves like an ordinary torrent. */
function isPartial(selected) {
    return Array.isArray(selected) && selected.some((v) => !v)
}

/**
 * Size and progress over the selected files only.
 * @param {{ length: number, downloaded: number }[]} files
 * @param {boolean[]} selected
 */
function selectionProgress(files, selected) {
    let length = 0
    let downloaded = 0
    files.forEach((file, i) => {
        if (!selected[i]) return
        length += Number(file.length) || 0
        downloaded += Math.min(Number(file.downloaded) || 0, Number(file.length) || 0)
    })
    return { length, downloaded, progress: length ? downloaded / length : 0 }
}

module.exports = { VIDEO_EXTS, defaultSelection, normalizeSelection, isPartial, selectionProgress }
