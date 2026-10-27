const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { parseLaunchArgs } = require('../src/launchArgs')

const HASH = '08ada5a7a6183aae1e09d831df6748d566095a10'
const MAGNET = `magnet:?xt=urn:btih:${HASH}&dn=Sintel`

test('magnet links and info hashes are accepted, switches and the app path skipped', () => {
    const argv = ['C:\\HeapSeed\\HeapSeed.exe', '--hidden', '--', MAGNET, HASH.toUpperCase()]
    assert.deepStrictEqual(parseLaunchArgs(argv), [MAGNET, `magnet:?xt=urn:btih:${HASH}`])
})

test('an existing local .torrent file is accepted, relative to the working directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-args-'))
    const file = path.join(dir, 'Sintel [1080p].torrent')
    fs.writeFileSync(file, 'd4:infod4:name6:Sintelee')
    assert.deepStrictEqual(parseLaunchArgs(['exe', '--', `"${file}"`]), [file])
    assert.deepStrictEqual(parseLaunchArgs(['exe', 'Sintel [1080p].torrent'], dir), [file])
    fs.rmSync(dir, { recursive: true })
})

test('missing files, UNC paths, URLs and junk are ignored', () => {
    const argv = [
        'exe',
        path.join(os.tmpdir(), 'does-not-exist.torrent'),
        '\\\\server\\share\\x.torrent',
        'https://example.com/x.torrent',
        'magnet:?xt=urn:btih:nothex',
        '.'
    ]
    assert.deepStrictEqual(parseLaunchArgs(argv), [])
})
