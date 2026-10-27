// Pausing that actually stops transfers (WebTorrent 2.x).

/**
 * Pause for real. WebTorrent's pause() only refuses new connections: peers already
 * connected keep transferring in both directions, so they are disconnected as well.
 * removePeer() would normally dial a replacement, but a paused torrent refuses it.
 */
function pauseTorrent(torrent) {
    if (!torrent || torrent.destroyed) return
    torrent.pause()
    for (const id of [...(torrent._peers?.keys() || [])]) torrent.removePeer(id)
}

/**
 * Resume and reconnect promptly: queued peers are dialled by resume(), trackers are asked
 * for fresh peers now instead of at the next announce, and web seeds dropped by
 * pauseTorrent() are added back (WebTorrent only adds them once, on metadata).
 */
function resumeTorrent(torrent) {
    if (!torrent || torrent.destroyed) return
    torrent._heapAutoPaused = false
    torrent.resume()
    try { torrent.discovery?.tracker?.update() } catch (err) { /* no trackers */ }
    if (torrent.metadata) (torrent.urlList || []).forEach((url) => torrent.addWebSeed(url))
}

module.exports = { pauseTorrent, resumeTorrent }
