const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 1. GLOBAL IPC REGISTRATION
// Placed outside app.whenReady() to guarantee the channel opens immediately.
ipcMain.handle('search-torrents', async (event, query, category) => {
    console.log(`[Agent] IPC channel active. Intercepted query: "${query}"`);
    
    try {
        // 2. LAZY LOADING
        // We require the module here. Assuming this file and torrentSearch.js are both in root/src
        const { searchTorrents } = require('./torrentSearch');
        
        const torrents = await searchTorrents(query);
        console.log(`[Agent] Scraping complete. Yielded ${torrents.length} payloads.`);
        
        return { success: true, torrents };
    } catch (error) {
        console.error(`[Agent] Critical backend failure:`, error);
        return { success: false, error: error.message || 'Unknown backend failure' };
    }
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Required for your current renderer setup
            enableRemoteModule: true
        },
        titleBarStyle: 'hidden',
        backgroundColor: '#0d0221'
    });

    // 3. PATH CORRECTION
    // Targets root/src/view/index.html from root/src/app.js
    mainWindow.loadFile(path.join(__dirname, 'view', 'index.html'));
    
    // Agent Tip: Uncomment the line below during debugging to force the console open
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});