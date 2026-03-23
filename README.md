<p align="center">
  <img src="build/icon.png" alt="HeapSeed Logo" width="128">
</p>

<h1 align="center">HeapSeed Engine</h1>



# HeapSeed Engine

HeapSeed is a high-performance, open-source BitTorrent client specifically engineered for real-time MP4 video previewing. By leveraging sequential piece prioritization and optimized backend data piping, HeapSeed allows users to begin watching media moments after the download starts.

## Core Focus: Real-Time Media Streaming to preview torrent videos before payload is completed

- **Sequential Piece Prioritization:** The engine prioritizes the beginning and end of the MP4 file (metadata/moov atoms) followed by sequential blocks to ensure a continuous stream.
- **Zero-Wait Playback:** The integrated Plyr engine hooks directly into the WebTorrent read stream, bypassing the need for a full file download before initialization.
- **Backend Buffer Optimization:** Improved data piping between the torrent engine and the render process reduces stuttering and memory overhead during high-bitrate playback.

---

## Features

- **Technical Interface:** High-contrast dark mode optimized for technical clarity and low-light environments.
- **Advanced MP4 Previewing:** Instant playback of video files as they are being fetched from the swarm.
- **Portable and Installer Options:** Support for both a standard Windows installation and a zero-install portable executable.
- **Magnet URI Integration:** Seamless handling of magnet links directly from web browsers.
- **Linux Distribution Support:** Native builds for AppImage, DEB, and RPM formats.


## To test features
go to public repository for test links for magnet and .torrent
https://webtorrent.io/free-torrents


---

## Cloud Building (No Terminal Required)

Users can generate the latest installers for Windows or Linux without a local development environment by using the GitHub Cloud Builder.

### Triggering a Build
1. Navigate to the **Actions** tab of this repository.
2. On the left sidebar, select **Cloud Build & Release**.
3. Select the **Run workflow** dropdown on the right side of the interface.
4. Confirm the branch is set to `main` and select the green **Run workflow** button.
5. The process will take 3–5 minutes to package the binaries.

### Locating Artifacts
Once the build is complete, go to the **Releases** section of the repository. A **Draft Release** will be available containing:
- **Windows:** NSIS Installer (.exe) and Portable (.exe).
- **Linux:** AppImage, DEB, and RPM packages.

*Note: If you have forked this repository, you must manually enable Actions in the Actions tab for the "Run workflow" button to appear.*

---

## Local Development

### Prerequisites
- Node.js v20 or later.
- Windows: Visual Studio Build Tools 2022 (with "Desktop development with C++") for native module compilation.

### Setup
```bash
git clone [https://github.com/Skonester/HeapSeed.git](https://github.com/Skonester/HeapSeed.git)
cd HeapSeed
npm install
npm run build