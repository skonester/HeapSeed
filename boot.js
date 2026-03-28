/**
 * HeapSeed Orchestrator - boot.js
 * PROTECTS fragile src/app.js by wrapping it rather than editing it.
 */

// Initialize Core HeapSeed Logic
require('./src/app.js');

// Initialize BitTorrent Search Logic
// This registers the 'search-torrents' IPC channel
require('./main.js');

console.log('HeapSeed online. Core Logic and Search Logic unified.');