const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { planRemoval, trashTorrentFiles } = require('../src/removal')

function makeRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-removal-'))
    const write = (rel) => {
        const file = path.join(root, rel)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, 'x')
        return file
    }
    return { root, write }
}

// Stand-in for the trash package: deletes the given paths
const fakeTrash = async (paths) => paths.forEach((p) => fs.rmSync(p))

test('only the torrent\'s own files are targeted', () => {
    const { root, write } = makeRoot()
    const own = write('Show/ep1.mkv')
    write('Show/notes-from-user.txt')
    const { targets } = planRemoval({ root, files: ['Show/ep1.mkv', 'Show/missing.mkv'] })
    assert.deepStrictEqual(targets, [own])
    fs.rmSync(root, { recursive: true })
})

test('paths escaping the download folder are kept', () => {
    const { root } = makeRoot()
    const outside = path.join(path.dirname(root), `heapseed-outside-${Date.now()}.txt`)
    fs.writeFileSync(outside, 'keep me')
    const { targets, kept } = planRemoval({ root, files: [`../${path.basename(outside)}`] })
    assert.deepStrictEqual(targets, [])
    assert.deepStrictEqual(kept, [outside])
    fs.rmSync(outside)
    fs.rmSync(root, { recursive: true })
})

test('files shared with another torrent are kept', () => {
    const { root, write } = makeRoot()
    const shared = write('Pack/shared.bin')
    const { targets, kept } = planRemoval({ root, files: ['Pack/shared.bin'], otherFiles: [shared] })
    assert.deepStrictEqual(targets, [])
    assert.deepStrictEqual(kept, [shared])
    fs.rmSync(root, { recursive: true })
})

test('glob-like names are plain file names', () => {
    const { root, write } = makeRoot()
    const target = write('Movie [1080p].mkv')
    const lookalike = write('Movie 1.mkv')
    const { targets } = planRemoval({ root, files: ['Movie [1080p].mkv'] })
    assert.deepStrictEqual(targets, [target])
    assert.ok(fs.existsSync(lookalike))
    fs.rmSync(root, { recursive: true })
})

test('trashTorrentFiles moves files, removes emptied folders and keeps the root', async () => {
    const { root, write } = makeRoot()
    write('Show/Season 1/ep1.mkv')
    write('Show/Season 1/ep2.mkv')
    const unrelated = write('other.txt')
    const result = await trashTorrentFiles({ root, files: ['Show/Season 1/ep1.mkv', 'Show/Season 1/ep2.mkv'], moveToTrash: fakeTrash })
    assert.strictEqual(result.moved.length, 2)
    assert.deepStrictEqual(result.failed, [])
    assert.ok(!fs.existsSync(path.join(root, 'Show')))
    assert.ok(fs.existsSync(root))
    assert.ok(fs.existsSync(unrelated))
    fs.rmSync(root, { recursive: true })
})

test('files the trash could not move are reported', async () => {
    const { root, write } = makeRoot()
    const stuck = write('Show/locked.mkv')
    const result = await trashTorrentFiles({ root, files: ['Show/locked.mkv'], moveToTrash: async () => { throw new Error('locked') } })
    assert.deepStrictEqual(result.failed, [stuck])
    assert.ok(fs.existsSync(stuck))
    fs.rmSync(root, { recursive: true })
})

test('a file reached through a linked folder is kept', (t) => {
    const { root, write } = makeRoot()
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-elsewhere-'))
    const victim = path.join(elsewhere, 'precious.txt')
    fs.writeFileSync(victim, 'x')
    try {
        fs.symlinkSync(elsewhere, path.join(root, 'Show'), 'junction')
    } catch (err) {
        t.skip(`cannot create links here: ${err.code}`)
        return
    }
    const { targets } = planRemoval({ root, files: ['Show/precious.txt'] })
    assert.deepStrictEqual(targets, [])
    fs.rmSync(path.join(root, 'Show'))
    fs.rmSync(elsewhere, { recursive: true })
    fs.rmSync(root, { recursive: true })
})
