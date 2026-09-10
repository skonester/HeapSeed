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
5. Wait 3-5 minutes -- compiled binaries will be uploaded as draft releases

## Local Development

### Prerequisites

- **Node.js** v20 or later
- **Windows:** Visual Studio Build Tools 2022 (with "Desktop development with C++" for native dependencies)

### Available Scripts

```bash
# Install dependencies
npm install

# Run the app in development mode
npm start

# Build Windows installer and portable packages
npm run build
```
