# HeapSeed

A high-performance, open-source BitTorrent client engineered for real-time MP4 video previewing.

<p align="center">
  <a href="https://github.com/skonester/heapseed/releases/latest">
    <img src="https://img.shields.io/github/v/release/skonester/heapseed?style=for-the-badge&color=7289da" alt="Latest Release">
  </a>
  <a href="https://github.com/skonester/heapseed/stargazers">
    <img src="https://img.shields.io/github/stars/skonester/heapseed?style=for-the-badge&color=7289da&label=stars" alt="Stars">
  </a>
  <a href="https://github.com/skonester/heapseed/releases/latest">
    <img src="https://img.shields.io/badge/Download-Latest%20Release-blue?style=for-the-badge" alt="Download Latest Release">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows" alt="Windows">
  <img src="https://img.shields.io/badge/Platform-Ubuntu-E95420?style=for-the-badge&logo=ubuntu" alt="Ubuntu">
  <img src="https://img.shields.io/badge/Architecture-x64-555555?style=for-the-badge" alt="x64">
</p>

<p align="center">
  <img src="build/icon.png" alt="HeapSeed Logo" width="128">
</p>

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Downloads & Releases](#downloads--releases)
- [Testing Playback](#testing-playback)
- [Cloud Building](#cloud-building-no-local-terminal-needed)
- [Local Development](#local-development)

## Overview

HeapSeed leverages sequential piece prioritization and optimized data piping to enable watching MP4 videos while they download. The integrated Plyr player hooks directly into the WebTorrent read stream, eliminating the need for a full download before playback begins.

## Key Features

- **Sequential Piece Prioritization** -- Prioritizes metadata/moov atoms (beginning/end of MP4) followed by sequential blocks for continuous streaming
- **Zero-Wait Playback** -- Integrated Plyr player hooks directly into the WebTorrent read stream
- **Backend Buffer Optimization** -- Reduced stuttering and memory overhead during high-bitrate playback
- **Modern Svelte 5 Front-End** -- Clean, high-contrast dashboard optimized for real-time streaming management
- **Cross-Platform Setup** -- Windows NSIS Installer, Portable executable, and Linux AppImage/DEB/RPM packages

## Downloads & Releases

| Platform | Options |
|----------|---------|
| **Windows** | NSIS Installer (`.exe`) or Portable (`.exe`) |
| **Ubuntu** | AppImage, DEB, and RPM packages |
| **Linux** | AppImage, DEB, and RPM packages |

[View latest releases on GitHub](https://github.com/skonester/heapseed/releases/latest)

## Testing Playback

Test the previewing feature using free magnet links or `.torrent` files from the [WebTorrent Free Torrents](https://webtorrent.io/free-torrents) page.

## Cloud Building (No Local Terminal Needed)

Generate the latest installers automatically using GitHub Actions:

1. Navigate to the **Actions** tab of the repository
2. Select **Cloud Build & Release** in the left sidebar
3. Click the **Run workflow** dropdown and select **Run workflow**
4. Keep the branch as `main`
5. Both platform builds finish, then all packages are uploaded to one regular release

## Local Development

### Prerequisites

- **Node.js** v24 or later (CI uses Node 24 LTS)
- **Windows:** x64 Windows 10 or later
- **Linux:** x64 with glibc 2.35 or later (for example Ubuntu 22.04+)
- Native dependencies use Node-API prebuilds, verified with `npm run test:electron`.

### Available Scripts

```bash
# Install dependencies
npm ci

# Verify the GPL codec libraries and cache their corresponding source
npm run codecs:prepare

# Run the app in development mode
npm start

# Build Windows installer and portable packages
npm run build

# Run backend tests with Node and with Electron's bundled Node
npm test
npm run test:electron
```

### Electron and GPL FFmpeg

HeapSeed pins Electron 45.3.2 and ships custom **GPL-2.0-or-later** FFmpeg
libraries for Windows x64 and Linux x64. Both are built from Electron's exact
Chromium FFmpeg revision, with H.264/AAC decoding enabled. Development startup
and packaging overwrite Electron's stock library with the verified GPL build.
An Electron version mismatch, unsupported architecture, or incorrect library
checksum stops the build.

Each package includes the corresponding FFmpeg source archive, GPL license,
manifest, notice, and complete build recipe under `resources/ffmpeg`. Application
source remains under its existing MIT license. See
[the upgrade and codec build notes](docs/electron-and-codecs.md) for rebuilding,
validation, and dependency audit details.
