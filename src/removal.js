// Portions adapted from Tern (https://github.com/by-sonic/tern-torrent-client), Copyright (c) 2026 by-sonic, MIT License.
const fs = require('fs')
const path = require('path')

const pathKey = (p) => process.platform === 'win32' ? p.toLowerCase() : p

function isInside(parent, child) {
    const rel = path.relative(parent, child)
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/**
 * Decide which of a torrent's files may be deleted. Only the torrent's own regular files
 * are candidates, never a whole folder. A file is kept when it:
 * - resolves outside the download root (hostile names such as `../x`),
 * - is also used by another torrent,
 * - is a symbolic link or junction, or sits under a linked folder that leaves the root.
 * Missing files are ignored.
 *
 * @param {{ root: string, files: string[], otherFiles?: string[] }} input
 *   `files` are paths relative to `root` (WebTorrent's `file.path`), `otherFiles` absolute paths.
 * @returns {{ targets: string[], kept: string[] }}
 */
function planRemoval({ root, files, otherFiles = [] }) {
    const targets = []
    const kept = []
    if (typeof root !== 'string' || !path.isAbsolute(root) || !Array.isArray(files)) return { targets, kept }

    const rootResolved = path.resolve(root)
    let rootReal
    try { rootReal = fs.realpathSync(rootResolved) } catch (err) { return { targets, kept } }

    const shared = new Set(otherFiles.map((p) => pathKey(path.resolve(p))))
    const seen = new Set()

    for (const rel of files) {
        if (typeof rel !== 'string' || rel === '') continue
        const abs = path.resolve(rootResolved, rel)
        const key = pathKey(abs)
        if (seen.has(key)) continue
        seen.add(key)

        if (!isInside(rootResolved, abs) || shared.has(key)) { kept.push(abs); continue }

        let stat
        try { stat = fs.lstatSync(abs) } catch (err) { continue } // missing: nothing to remove
        if (stat.isSymbolicLink() || !stat.isFile()) { kept.push(abs); continue }

        let parentReal
        try { parentReal = fs.realpathSync(path.dirname(abs)) } catch (err) { kept.push(abs); continue }
        if (parentReal !== rootReal && !isInside(rootReal, parentReal)) { kept.push(abs); continue }

        targets.push(abs)
    }
    return { targets, kept }
}

/** Remove folders left empty under `root`, deepest first. `root` itself always stays. */
function removeEmptyParents(root, files) {
    const rootResolved = path.resolve(root)
    const dirs = new Set()
    for (const file of files) {
        let dir = path.dirname(file)
        while (isInside(rootResolved, dir)) {
            dirs.add(dir)
            dir = path.dirname(dir)
        }
    }
    const deepestFirst = [...dirs].sort((a, b) => b.length - a.length)
    for (const dir of deepestFirst) {
        try {
            const stat = fs.lstatSync(dir)
            if (stat.isDirectory() && !stat.isSymbolicLink()) fs.rmdirSync(dir) // fails when not empty
        } catch (err) { /* not empty, gone or locked: leave it */ }
    }
}

/**
 * Move a torrent's own files to the Recycle Bin / Trash. Call only after the torrent is
 * destroyed, so no file handles are open.
 *
 * `moveToTrash` must treat paths literally: the `trash` package needs `{ glob: false }`, otherwise
 * a name like `Movie [1080p].mkv` is a glob pattern that can match unrelated files.
 *
 * @param {{ root: string, files: string[], otherFiles?: string[], moveToTrash: (paths: string[]) => Promise<void> }} input
 * @returns {Promise<{ moved: string[], kept: string[], failed: string[] }>}
 */
async function trashTorrentFiles({ root, files, otherFiles, moveToTrash }) {
    const { targets, kept } = planRemoval({ root, files, otherFiles })
    if (targets.length) {
        try {
            await moveToTrash(targets)
        } catch (err) {
            // A batch can fail part-way; retry one by one (already moved files are skipped as missing)
            for (const target of targets) {
                try { await moveToTrash([target]) } catch (e) { /* reported below */ }
            }
        }
    }
    const stillThere = (p) => { try { fs.lstatSync(p); return true } catch (err) { return false } }
    const failed = targets.filter(stillThere)
    const moved = targets.filter((t) => !failed.includes(t))
    removeEmptyParents(root, moved)
    return { moved, kept, failed }
}

module.exports = { planRemoval, trashTorrentFiles, removeEmptyParents }
