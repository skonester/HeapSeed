`codec-smoke.mp4` is a one-second synthetic 160x90 test pattern with a 440 Hz
tone, encoded as H.264 video and AAC audio. It contains no third-party media.
It is provided under the repository's MIT license.

Generated with FFmpeg 7.1.5:

```sh
ffmpeg -f lavfi -i testsrc=size=160x90:rate=24 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 -t 1 \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart codec-smoke.mp4
```
