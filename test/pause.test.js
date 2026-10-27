// Real WebTorrent clients on loopback: no trackers, DHT or local discovery.
const test = require('node:test')
const assert = require('node:assert')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { pauseTorrent, resumeTorrent } = require('../src/pause')

const offline = { dht: false, tracker: false, lsd: false, utp: false, natUpnp: false, natPmp: false }
const waitFor = async (fn, label, ms = 15000) => {
    const start = Date.now()
    while (!fn()) {
        if (Date.now() - start > ms) throw new Error(`timed out: ${label}`)
        await new Promise((r) => setTimeout(r, 50))
    }
}

test('pause disconnects connected peers in both directions; resume allows reconnecting', async (t) => {
    const { default: WebTorrent } = await import('webtorrent')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heapseed-pause-'))
    const seeder = new WebTorrent(offline)
    const leecher = new WebTorrent(offline)
    t.after(async () => {
        await Promise.all([seeder, leecher].map((c) => new Promise((r) => c.destroy(r))))
        fs.rmSync(dir, { recursive: true, force: true })
    })

    // 8 MiB with a 1 KB/s seeder cap: the transfer is still running when we pause
    const data = crypto.randomBytes(8 * 1024 * 1024)
    seeder.throttleUpload(1024)
    const seeded = await new Promise((resolve) => seeder.seed(Object.assign(data, { name: 'data.bin' }), { path: path.join(dir, 's') }, resolve))
    await new Promise((r) => seeder.listening ? r() : seeder.once('listening', r))

    const leech = leecher.add(seeded.torrentFile, { path: path.join(dir, 'l') })
    await new Promise((r) => leech.once('metadata', r))
    leech.addPeer(`127.0.0.1:${seeder.address().port}`)
    await waitFor(() => leech.wires.length === 1 && seeded.wires.length === 1, 'peers connect')

    // Plain pause() keeps the existing connection (the bug)
    leech.pause()
    await new Promise((r) => setTimeout(r, 300))
    assert.strictEqual(leech.wires.length, 1, 'plain pause() leaves the wire open')

    // pauseTorrent() closes it on both ends
    pauseTorrent(leech)
    await waitFor(() => leech.wires.length === 0 && seeded.wires.length === 0, 'both ends disconnect')
    assert.strictEqual(leech.paused, true)

    // While paused, a new connection is refused
    leech.addPeer(`127.0.0.1:${seeder.address().port}`)
    await new Promise((r) => setTimeout(r, 500))
    assert.strictEqual(leech.wires.length, 0, 'no reconnect while paused')

    // After resume the peer can connect again
    resumeTorrent(leech)
    assert.strictEqual(leech.paused, false)
    leech.addPeer(`127.0.0.1:${seeder.address().port}`)
    await waitFor(() => leech.wires.length === 1, 'reconnects after resume')
})
