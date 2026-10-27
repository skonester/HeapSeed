const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { DEFAULT_SETTINGS, mergeSettings, readJson, writeJsonAtomic, limitToRate, uploadRate } = require('../src/settings')

test('mergeSettings keeps valid values and drops unknown keys', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { appearance: 'dark', last_cfu: 123, new_version: {}, close_to_tray: true })
    assert.strictEqual(merged.appearance, 'dark')
    assert.strictEqual(merged.close_to_tray, true)
    assert.ok(!('last_cfu' in merged))
    assert.ok(!('new_version' in merged))
})

test('mergeSettings rejects wrong types and clamps limits', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
        appearance: 'neon',
        on_torrent_done: 'explode',
        close_to_tray: 'yes',
        down_limit_kb: -50,
        up_limit_kb: '250.9',
        seed_up_limit_kb: 1e12,
        download_path: 'relative/folder'
    })
    assert.strictEqual(merged.appearance, 'system')
    assert.strictEqual(merged.on_torrent_done, 'mag_sound')
    assert.strictEqual(merged.close_to_tray, false)
    assert.strictEqual(merged.down_limit_kb, 0)
    assert.strictEqual(merged.up_limit_kb, 250)
    assert.strictEqual(merged.seed_up_limit_kb, 10000000)
    assert.strictEqual(merged.download_path, '')
})

test('seeding after download defaults on and only accepts booleans', () => {
    assert.strictEqual(DEFAULT_SETTINGS.seed_after_done, true)
    assert.strictEqual(mergeSettings(DEFAULT_SETTINGS, { seed_after_done: false }).seed_after_done, false)
    assert.strictEqual(mergeSettings(DEFAULT_SETTINGS, { seed_after_done: 'no' }).seed_after_done, true)
})

test('the seeding cap defaults to 20 KB/s and applies only while nothing downloads', () => {
    assert.strictEqual(DEFAULT_SETTINGS.seed_up_limit_kb, 20)
    assert.strictEqual(uploadRate(DEFAULT_SETTINGS, { anyActiveDownload: false, anySeeding: true }), 20 * 1024)
    assert.strictEqual(uploadRate(DEFAULT_SETTINGS, { anyActiveDownload: true, anySeeding: true }), -1)
    assert.strictEqual(uploadRate(DEFAULT_SETTINGS, { anyActiveDownload: false, anySeeding: false }), -1)
    assert.strictEqual(limitToRate(0), -1)
})

test('readJson moves a corrupt file aside and writeJsonAtomic replaces cleanly', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-settings-'))
    const file = path.join(dir, 'Settings.json')
    fs.writeFileSync(file, '{ not json')
    assert.deepStrictEqual(readJson(file, { fallback: true }), { fallback: true })
    assert.ok(fs.readdirSync(dir).some((name) => name.startsWith('Settings.json.corrupt-')))

    writeJsonAtomic(file, { appearance: 'light' })
    assert.deepStrictEqual(readJson(file, {}), { appearance: 'light' })
    assert.ok(!fs.existsSync(`${file}.tmp`))
    assert.deepStrictEqual(readJson(path.join(dir, 'missing.json'), []), [])
    fs.rmSync(dir, { recursive: true })
})
