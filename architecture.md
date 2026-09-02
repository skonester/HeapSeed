# HeapSeed Architecture Documentation

## Overview

HeapSeed is a desktop BitTorrent client built with **Electron**, **Svelte 5**, and **WebTorrent**, specifically engineered for real-time MP4 video previewing during downloads. The application combines a modern Svelte frontend with a Node.js/Electron backend to provide a seamless streaming experience.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HeapSeed Desktop Application                 │
│                                                                 │
│  +----------------------+    +----------------------------+│
│  |  Electron Main       |    |  Svelte Renderer           ││
│  |  Process (Node.js)   |──▶ |  (Vite + Svelte 5)         ││
│  |  ├─ IPC Communication├─▶ │  ├─ Plyr Player            ││
│  |  │  ├─ Torrent Engine││  │  ├─ Sequential Prioritization││
│  |  │  └─ Window Mgmt   ││  │  └─ Dashboard UI          ││
│  +----------------------+    +----------------------------+│
│           │                       │                     │
│           ▼                       ▼                     ▼
│  +----------------------+    +----------------------------+│
│  |  WebTorrent Engine   |    |  IndexedDB / Local Storage ││
│  |  (Sequential Prioritization)││  │  │  (Settings, State)     ││
│  +----------------------+    +----------------------------+│
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Electron Main Process (`src/main.js`)

**Role:** Backend logic, IPC communication, window management

- **Pure backend operations** – No GUI rendering
- **IPC Handler** – `ipcMain.handle('search-torrents')` for torrent search functionality
- **WebTorrent Client** – Core torrent engine with sequential piece prioritization
- **Window Management** – Creates and manages the BrowserWindow
- **Auto-updater** – GitHub Actions-based release publishing
- **Native dependencies** – Visual Studio Build Tools 2022 required for native module compilation

**Key Functions:**
- Torrent client initialization and management
- IPC channel communication with renderer
- Window creation and event handling
- Error handling (unhandledRejection, uncaughtException)

### 2. Renderer Process (`src/renderer.js`)

**Role:** Svelte UI orchestration, Plyr player integration

- **Svelte 5 integration** – Reactive UI updates
- **Plyr player** – Integrated media player for video playback
- **Size formatting** – `formatDataSize()` for human-readable bytes
- **Time calculation** – `calculateTimeRemaining()` for download progress
- **State management** – `pendingTorrents`, `renderScheduled`, `plyrInstance`

**Key Features:**
- Plyr player configuration with play, progress, volume controls
- Torrent list rendering and management
- Video container handling
- Search box and message display logic

### 3. Svelte Frontend (`src/svelte/`)

**Role:** Modern, responsive UI component library

**Structure:**
```
src/svelte/
├── App.svelte          ← Main application component
├── components/
│   ├── Player.svelte   ← Plyr video player component
│   ├── SearchPane.svelte ← Torrent search interface
│   ├── Sidebar.svelte  ← Navigation sidebar
│   └── Topbar.svelte   ← Application topbar
├── main.js             ← Svelte entry point
├── styles.css          ← Global CSS styles
└── index.html          ← HTML template
```

**App.svelte Key Elements:**
- Category filtering (movies, TV, music, software, all)
- Sort modes (seeders, size, name)
- Source selection (YTS, Nyaa, LimeTorrents, TorrentDownloads)
- Theme modes (system, light, dark)
- BYTE constant definitions for data size formatting

### 4. WebTorrent Engine

**Role:** Core torrent downloading and sequential prioritization

- **Sequential piece prioritization** – Prioritizes metadata/moov atoms (beginning/end of MP4) followed by sequential blocks
- **Optimized data piping** – Reduced stuttering during high-bitrate playback
- **Backend buffer optimization** – Improved data piping between torrent engine and render process

### 5. Build & Distribution Pipeline

```
npm run build:renderer   → Vite build (ESM/CSS)
npm run build            → electron-builder (Windows NSIS + Portable / Linux)
npm run build:linux      → electron-builder --linux (AppImage, DEB, RPM)
```

**Build Configuration (`package.json`):**
- `electron-builder` for packaging
- NSIS installer for Windows (one-click disabled)
- Portable executable option
- Linux: AppImage, DEB, and RPM packages
- `afterPack` script: `./scripts/fix-codecs.js`
- `asar` packing with `build-assets/**` unpacked
- Extra resources: `build-assets/libffmpeg.so`

---

## Data Flow

1. **User initiates search** → Renderer sends IPC to Main
2. **Main process** → WebTorrent client starts download with sequential prioritization
3. **Pieces received** → Main process streams data via IPC to Renderer
4. **Plyr player** → Consumes streaming data for immediate playback
5. **User watches** → Video plays while download continues in background

---

## Prerequisites

- **Node.js** v20 or later
- **Windows:** Visual Studio Build Tools 2022 (with "Desktop development with C++")
- **Cross-platform:** Node.js environment for build scripts

---

## Development Commands

```bash
npm install          # Install dependencies
npm start            # Run in development mode (electron .)
npm run build:renderer  # Build Svelte/Vite frontend
npm run build        # Build installers (Windows + Linux)
```

---

## Key Design Decisions

1. **Electron + Svelte 5** – Modern stack with reactive UI and native desktop capabilities
2. **Sequential prioritization** – Core differentiator enabling real-time MP4 previewing
3. **IPC separation** – Main process handles backend, renderer handles UI
4. **Plyr player integration** – Lightweight, accessible media player
5. **Cross-platform builds** – Single codebase, multiple installer formats