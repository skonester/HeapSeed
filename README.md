<p align="center">
  <img src="build/icon.png" alt="HeapSeed Logo" width="128">
</p>

<h1 align="center">HeapSeed</h1>

<p align="center">
  <a href="https://github.com/skonester/heapseed/releases/latest">
    <img src="https://img.shields.io/github/v/release/skonester/heapseed?style=for-the-badge&color=7289da" alt="Latest Release">
  </a>
  <a href="https://github.com/skonester/heapseed/releases">
    <img src="https://img.shields.io/github/downloads/skonester/heapseed/total?style=for-the-badge&color=43b581" alt="Total Downloads">
  </a>
  <a href="https://github.com/skonester/heapseed/releases/latest">
    <img src="https://img.shields.io/badge/Download-Latest%20Release-blue?style=for-the-badge" alt="Download Latest Release">
  </a>
</p>

---

HeapSeed is a high-performance, open-source BitTorrent client specifically engineered for real-time MP4 video previewing. By leveraging sequential piece prioritization and optimized backend data piping, HeapSeed allows users to begin watching media moments after the download starts.

## 🚀 Key Features

- **⚡ Sequential Piece Prioritization:** Prioritizes the metadata/moov atoms (beginning and end of the MP4 file) followed by sequential blocks to ensure a continuous stream.
- **🎬 Zero-Wait Playback:** The integrated Plyr player hooks directly into the WebTorrent read stream, bypassing the need for a full file download before initialization.
- **⚙️ Backend Buffer Optimization:** Improved data piping between the torrent engine and Svelte/Vite/Electron-based render process reduces stuttering and memory overhead during high-bitrate playback.
- **🎨 Modern Svelte Front-End:** High-contrast, clean Svelte 5 and CSS dashboard optimized for technical clarity and real-time streaming management.
- **📦 Windows Setup Options:** Standard NSIS Installer or zero-install Portable executable.
- **🐧 Linux Support:** Prepackaged builds for AppImage, DEB, and RPM.

---

## 📥 Downloads & Releases

Get the latest installer for your system directly from the [GitHub Releases page](https://github.com/skonester/heapseed/releases/latest).

- **Windows:** NSIS Installer (`.exe`) or Portable (`.exe`)
- **Linux:** AppImage, DEB, or RPM packages

---

## 🧪 Testing Playback

To test the previewing feature, you can use any of the free magnet links or `.torrent` files available at the official WebTorrent test page:
🔗 [WebTorrent Free Torrents](https://webtorrent.io/free-torrents)

---

## ☁️ Cloud Building (No Local Terminal Needed)

Generate the latest installers for Windows or Linux automatically using GitHub Actions:

1. Navigate to the **Actions** tab of the repository.
2. Select **Cloud Build & Release** in the left sidebar.
3. Click the **Run workflow** dropdown on the right.
4. Keep the branch as `main` and select **Run workflow**.
5. Wait 3–5 minutes. The compiled binaries will be automatically uploaded as draft releases or attached to your release page.

---

## 🛠️ Local Development

### Prerequisites
- Node.js v20 or later.
- **Windows:** Visual Studio Build Tools 2022 (with "Desktop development with C++" for compiling native dependencies).

### Run / Build Locally

```bash
# Clone the repository
git clone https://github.com/skonester/heapseed.git
cd heapseed

# Install dependencies
npm install

# Run the app in development mode
npm start

# Build Windows installer and portable packages
npm run build
```
