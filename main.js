/**
 * TARGET FILE: main.js (Root Directory)
 * PURPOSE: Pure Backend Search Logic. NO GUI rendering allowed.
 */
const { ipcMain } = require('electron');

// Pointing to the scraper logic within the src folder
const { searchTorrents } = require('./src/torrentSearch');

console.log('[Agent] Heapseed Search Subsystem initializing...');

// Register the search channel globally. 
// Notice the complete absence of 'BrowserWindow' or 'app.whenReady()'.
ipcMain.handle('search-torrents', async (event, query, category) => {
    console.log(`[Agent] IPC channel active. Intercepted query: "${query}" | Filter: "${category}"`);
    
    try {
        const torrents = await searchTorrents(query, category);
        console.log(`[Agent] Scraping complete. Yielded ${torrents.length} payloads.`);
        return { success: true, torrents };
    } catch (error) {
        console.error(`[Agent] Critical backend failure:`, error);
        return { success: false, error: error.message || 'Unknown backend failure' };
    }
});

console.log('[Agent] Search Subsystem online and locked.');