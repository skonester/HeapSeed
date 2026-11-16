#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Adapted from nwjs-ffmpeg-prebuilt build.sh, commit
# b73b2a97a3eafeaffd5207590784c325504c469b (GPL-2.0).
# Run inside an unpacked Chromium FFmpeg source tree, with a separate tree per target.
set -euo pipefail

target=${1:?Usage: build-gpl-ffmpeg.sh linux-x64|win32-x64 OUTPUT_DIRECTORY}
output=${2:?Output directory required}
mkdir -p "$output"
output=$(cd "$output" && pwd)
case "$target" in
  linux-x64)
    cc=gcc
    platform=(--arch=x86_64)
    library=libffmpeg.so
    link=(-Wl,-z,relro -Wl,-z,now -Wl,-Bsymbolic)
    ;;
  win32-x64)
    cc=x86_64-w64-mingw32-gcc
    platform=(--arch=x86_64 --target-os=mingw32 --cross-prefix=x86_64-w64-mingw32-)
    library=ffmpeg.dll
    link=(-Wl,--nxcompat -Wl,--dynamicbase -lbcrypt -static-libgcc -Wl,-Bstatic -lpthread -Wl,-Bdynamic)
    ;;
  *) echo "Unsupported GPL FFmpeg target: $target" >&2; exit 1 ;;
esac

grep -oE 'av[a-z0-9_]+\(' chromium/ffmpeg.sigs | tr -d '(' | sort -u > sigs.txt
printf 'avformat_version\navutil_version\navcodec_license\navformat_license\navutil_license\navcodec_configuration\n' >> sigs.txt
sort -u -o sigs.txt sigs.txt
{ printf '{\nglobal:\n'; sed 's/$/;/' sigs.txt; printf 'local:\n*;\n};\n'; } > export.map
# Chromium's codec allowlist identifies this decoder as libopus.
sed -i 's/^ *\.p\.name *=.*/.p.name="libopus",/' libavcodec/opus/dec.c

./configure \
  --disable-debug --disable-all --disable-autodetect --disable-doc \
  --disable-iconv --disable-network --disable-symver --disable-large-tests \
  --disable-error-resilience --disable-faan --disable-iamf \
  --disable-schannel --disable-securetransport \
  --enable-gpl --enable-static --disable-shared \
  --enable-avformat --enable-avcodec --enable-avutil --enable-swresample \
  --enable-demuxer=ogg,matroska,wav,flac,mp3,mov,aac \
  --enable-decoder=vorbis,opus,flac,pcm_s16le,mp3,aac,h264 \
  --enable-parser=aac,flac,h264,mpegaudio,opus,vorbis,vp9 \
  --cc="$cc" --extra-cflags='-DCHROMIUM_NO_LOGGING -O2 -fPIC' \
  --enable-pic --enable-asm --enable-hardcoded-tables \
  "${platform[@]}"

make -j"${JOBS:-4}"
symbols=()
while IFS= read -r symbol; do symbols+=("-Wl,-u,$symbol"); done < sigs.txt
"$cc" -shared -Wl,-O1 -Wl,--version-script=export.map \
  "${symbols[@]}" -Wl,--start-group \
  libavcodec/libavcodec.a libavformat/libavformat.a libavutil/libavutil.a \
  libswresample/libswresample.a -Wl,--end-group \
  "${link[@]}" -lm -Wl,-s -o "$output/$library"
cp COPYING.GPLv2 "$output/COPYING.GPLv2"
echo "Built $output/$library"
