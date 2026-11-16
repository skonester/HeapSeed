# Electron and codec maintenance

The app uses Electron 45.3.2 (Chromium 156.0.8078.100, bundled Node 24.22.2),
electron-builder 26.18.0, Vite 8.3.8, Svelte 5.57.3, and its Vite plugin 7.3.1.
CI installs with `npm ci` on Node 24 and runs tests on both Node and Electron.
The manifest and lockfile identify HeapSeed as 1.2.4.

Release preparation checks that a pushed version tag matches package.json and
reads the existing GitHub release status. Publishing matches an existing draft,
prerelease, or published release, preventing electron-builder from skipping
uploads because its default draft status conflicts with a published release.
New releases continue to be created as drafts. Re-running an old tag still uses
that tag's original workflow; commit and push these changes before tagging 1.2.4.

Clipboard reads now cross IPC to the main process and return promises. Search
paste, modal auto-fill, and modal paste all await them. A late auto-fill cannot
overwrite the user's typing. Main-process clipboard writes handle rejections.

## GPL replacement libraries

The libraries in `build-assets/ffmpeg/{win32,linux}-x64` are custom builds from
Chromium FFmpeg revision `9db86ce5b5b454dfc96c435f9f0723012980c37f`, the revision
referenced by Chromium 156.0.8078.100's DEPS file. They use `--enable-gpl` and
report `GPL version 2 or later` through `avcodec_license()`. They have no
nonfree external libraries. These are component libraries with Chromium's
exported API, rather than a command-line FFmpeg binary or the usual separate
libavcodec/libavformat shared libraries.

H.264, AAC, MP3, FLAC, Vorbis, Opus and signed 16-bit PCM decoding is enabled.
This does not promise all formats supported by a general-purpose FFmpeg build;
Chromium also controls which codecs and containers its media pipeline accepts.
The Linux build requires glibc 2.35+. Windows builds statically link the MinGW
runtime and pthread support. Only x64 is currently supplied.

`scripts/codecs.js` verifies SHA-256 hashes and the exact Electron version.
`scripts/start.js` installs the replacement in the development runtime.
`scripts/fix-codecs.js` always overwrites the packaged library, then includes
the source archive, GPL text, manifest, notice, and build script alongside it
under `resources/ffmpeg`. There is no fallback to the old unversioned library
or to Electron's stock LGPL library.

The source archive is cached in `.cache/ffmpeg/source.tar.gz`; run
`npm run codecs:prepare` before an offline build. The archive is downloaded from
the pinned Chromium source URL and checked against `source.treeSha256` in the
manifest. This SHA-256 covers sorted entry paths, types, permissions, link
targets, and file contents. Gitiles regenerates archive timestamps on each
download, so a digest of the compressed archive itself is not stable. Archive
timestamps, ownership, entry order, and compression metadata are excluded from
the content digest. Changed source files or permissions still fail verification;
the DLL/SO binaries retain their exact byte-for-byte SHA-256 checks.

## Rebuilding

Use Linux x64 with GCC, GNU make, NASM, Bash, and `gcc-mingw-w64-x86-64`.
The supplied builds were compiled in Debian 13 with GCC 14 / MinGW-w64 14.

1. Run `npm run codecs:prepare` to obtain the pinned source archive.
2. Extract it to two separate directories.
3. In each tree run `bash /path/to/scripts/build-gpl-ffmpeg.sh TARGET OUTPUT`,
   with `linux-x64` or `win32-x64` as TARGET.
4. Check exported functions, `avcodec_license()` and `avcodec_configuration()`.
5. Update the manifest hashes only after testing both libraries with Electron.

The recipe is adapted from the GPL-2.0 nwjs-ffmpeg-prebuilt project, pinned at
`b73b2a97a3eafeaffd5207590784c325504c469b`. The upstream prebuilt binaries use
an LGPL configuration; HeapSeed builds its own GPL-enabled libraries.

## Native modules and dependencies

`npmRebuild` is disabled because the runtime dependencies use Node-API prebuilds
that work across the supported Node and Electron versions. `test/native.test.js`
loads node-datachannel, utp-native, and bufferutil using their real native
loaders. Run this under both runtimes when upgrading dependencies; if a future
dependency uses an Electron-specific ABI, revisit this setting.

The `ip` override uses the maintained `@webpod/ip` drop-in for bittorrent-tracker.
The minimatch override upgrades affected versions 7–10 to 11 while preserving
the different function API expected by older major versions 3 and 5.

The production dependency audit is clean. Two low-severity development findings
remain in the Svelte plugin's deepmerge dependency (GHSA-gcqx-w48m-w2h4), for
which no patched release exists. The plugin merges local build configuration;
this package is excluded from shipped production dependencies. Recheck when
upgrading the Svelte plugin. Plyr 3.8.5 receives security maintenance only;
a migration to another player is a separate UI change.

## Validation

- `npm run build:renderer`
- `npm test` and `npm run test:electron` on Windows and Linux
- `npm run codecs:prepare`
- Windows NSIS/portable and Linux packaging with publishing disabled
- `npm run test:smoke -- PATH/TO/resources/app.asar` (uses the synthetic fixture)

The smoke check uses an isolated profile and synthetic clipboard, loads the
actual packaged app and native modules, checks modal clipboard behavior, and
decodes an H.264/AAC MP4 to completion with software rendering. An optional
second argument selects another MP4. On a
headless Linux machine, run it under Xvfb. On CI, the downloaded development
runtime's `node_modules/electron/dist/chrome-sandbox` is configured as root:root
with mode 4755 before testing. The regular-user smoke test uses Chromium's
sandbox. The root-only sandbox exception is limited to this test harness.
