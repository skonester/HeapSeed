# HeapSeed Engine

HeapSeed is a high-performance, open-source BitTorrent client with a modern technical interface.

HeapSeed is an Electron-based torrent engine designed for speed, clarity, and cross-platform reliability. It includes a dark-mode interface, real-time peer visualization, and integrated media streaming.

## Features

- Technical dark interface optimized for low-light environments.
- Real-time streaming with the integrated Plyr player.
- Cross-platform packaging for Windows, Linux, and macOS.
- Magnet URI handling directly from the browser.
- Animated UI transitions.

## Tech Stack

- Engine: WebTorrent
- Runtime: Electron
- Styling: Vanilla CSS
- Media: Plyr
- Icons: Lucide and custom SVGs

## Prerequisites

- Node.js 18 or later.
- npm.
- On Windows, Visual Studio Build Tools 2022 with the Desktop development with C++ workload for native module compilation. [web:58]

## Installation

```bash
git clone https://github.com/Skonester/HeapSeed.git
cd HeapSeed
npm install
Development
bash
npm start
Production Build
HeapSeed uses electron-builder to create production-ready installers. The configured Windows target is NSIS, and the build output is written to the dist/ directory. [web:53][web:58]

Windows Build
bash
npm run pack-windows
Full Build
bash
npm run dist
All Platforms
bash
npm run pack-all
Build Notes
npm run pack-windows builds the Windows NSIS installer. [web:53][web:58]

npm run dist cleans dist/ and then builds Windows and Linux packages based on the current script. [web:53]

npm run pack-all should be updated for Windows because open dist/ is a macOS command, so it will fail on Windows as written.

Output
Build artifacts are generated in the dist/ directory.