<script>
  import { onDestroy, tick } from 'svelte';
  import Plyr from 'plyr';

  let {
    videoVisible = $bindable(false),
    selectedTorrent = null,
    openTorrent = () => {},
    activeStream = { url: '', mime: '', version: 0 },
    formatDataSize = (n) => `${n} B`
  } = $props();

  let playerEl = $state();
  let player = null;
  let showStatsHud = $state(true);

  function startStream(streamUrl, mimeType) {
    if (!streamUrl || !playerEl) return;
    
    player ||= new Plyr(playerEl, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['quality', 'speed'],
      tooltips: { controls: true, seek: true },
      displayDuration: true,
      keyboard: { focused: true, global: false }
    });
    
    player.source = { 
      type: 'video', 
      sources: [{ src: streamUrl, type: mimeType || 'video/mp4' }] 
    };
    
    player.play().catch(() => {});
  }

  $effect(() => {
    if (activeStream && activeStream.url && videoVisible) {
      tick().then(() => {
        startStream(activeStream.url, activeStream.mime);
      });
    }
  });

  onDestroy(() => {
    if (player) {
      player.destroy();
      player = null;
    }
  });
</script>

<div class="cinema-theater glass-panel" class:is-active={videoVisible}>
  {#if videoVisible}
    <div class="theater-screen animate-fade-in">
      <!-- Ambient Glow Backdrop -->
      <div class="ambient-glow"></div>

      <!-- Video Element -->
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <video bind:this={playerEl} id="player" playsinline controls crossorigin="anonymous"></video>

      <!-- Live Streaming HUD Overlay -->
      {#if showStatsHud && selectedTorrent}
        <div class="stream-hud-overlay animate-fade-in">
          <div class="hud-left">
            <span class="hud-live-tag">LIVE STREAM</span>
            <strong class="hud-title">{selectedTorrent.name || 'Active Video Stream'}</strong>
          </div>
          <div class="hud-right">
            <div class="hud-stat-pill">
              <svg viewBox="0 0 24 24" class="hud-icon"><path fill="currentColor" d="M11 4h2v8h3l-4 4l-4-4h3V4m-4 14h14v2H7v-2Z"/></svg>
              <span>{formatDataSize(selectedTorrent.downloadSpeed || 0)}/s</span>
            </div>
            <div class="hud-stat-pill">
              <svg viewBox="0 0 24 24" class="hud-icon"><path fill="currentColor" d="M16 13c-2.28 0-7.07 1.14-7.07 3.42V18h14.15v-1.58c0-2.28-4.79-3.42-7.08-3.42M8.92 13c-.02 0-.05 0-.08.02c-.89-.6-2.02-.93-3.24-.93c-1.85 0-5.6 1.03-5.6 2.92V17h8.84v-1.58c0-1 .92-2.1 2.24-2.42m1.96-5C12.38 8 13 7.38 13 6.62C13 5.86 12.38 5 10.88 5c-1.5 0-2.12.86-2.12 1.62c0 .76.62 1.38 2.12 1.38m5.12 0c1.5 0 2.12-.86 2.12-1.62C18.12 5.38 17.5 4.5 16 4.5c-1.5 0-2.12.88-2.12 1.62c0 .76.62 1.38 2.12 1.38m-10.4 2C6.38 10 7 9.38 7 8.62C7 7.86 6.38 7 4.88 7C3.38 7 2.76 7.86 2.76 8.62c0 .76.62 1.38 2.12 1.38Z"/></svg>
              <span>{selectedTorrent.numPeers || 0} peers</span>
            </div>
            <button 
              class="hud-toggle-btn" 
              type="button" 
              onclick={() => showStatsHud = false}
              title="Hide overlay"
            >
              ✕
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Empty Theater Visualizer -->
    <div class="empty-theater animate-fade-in">
      <div class="theater-halo">
        <div class="halo-pulse"></div>
        <svg viewBox="0 0 24 24" class="theater-icon"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
      </div>

      <div class="theater-prompt">
        <span class="prompt-badge">CINEMA STREAMING ENGINE</span>
        <h2 class="prompt-title">
          {selectedTorrent ? `Ready to Stream “${selectedTorrent.name}”` : 'Real-Time MP4 Streaming Theater'}
        </h2>
        <p class="prompt-desc">
          HeapSeed prioritizes MP4 metadata and sequential blocks so you can watch movies immediately without waiting for the full download to complete.
        </p>

        {#if selectedTorrent}
          <button 
            class="start-stream-btn" 
            type="button" 
            onclick={() => openTorrent(selectedTorrent)}
          >
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
            Launch Stream Now
          </button>
        {:else}
          <p class="prompt-hint">Select any active transfer or search for a movie to start playback.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .cinema-theater {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--bg);
    overflow: hidden;
  }

  .cinema-theater.is-active {
    background: #000;
  }

  .theater-screen {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  .ambient-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(0, 242, 254, 0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: relative;
    z-index: 2;
  }

  /* HUD Overlay */
  .stream-hud-overlay {
    position: absolute;
    top: 16px;
    left: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(14, 18, 27, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    backdrop-filter: blur(16px);
    z-index: 10;
    pointer-events: auto;
    transition: opacity 0.3s ease;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .hud-live-tag {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--green);
    color: #04121a;
  }

  .hud-title {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  .hud-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hud-stat-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 11.5px;
    font-weight: 700;
    color: #fff;
  }

  .hud-icon {
    width: 13px;
    height: 13px;
    color: var(--accent);
  }

  .hud-toggle-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 2px 6px;
    font-size: 12px;
    border-radius: 4px;
  }
  .hud-toggle-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
  }

  /* Empty State */
  .empty-theater {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    max-width: 520px;
    padding: 32px;
    position: relative;
    z-index: 5;
  }

  .theater-halo {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 242, 254, 0.2) 0%, transparent 70%);
    border: 1px solid rgba(0, 242, 254, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--accent);
  }

  .theater-icon {
    width: 36px;
    height: 36px;
  }

  .halo-pulse {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1.5px solid var(--accent);
    opacity: 0.6;
    animation: pingHalo 2.5s infinite;
  }

  .theater-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .prompt-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    padding: 3px 9px;
    border-radius: 20px;
    background: rgba(0, 242, 254, 0.12);
    color: var(--accent);
    border: 1px solid rgba(0, 242, 254, 0.3);
  }

  .prompt-title {
    font-size: 18px;
    font-weight: 800;
    color: var(--text);
    margin: 0;
    line-height: 1.3;
  }

  .prompt-desc {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  .prompt-hint {
    font-size: 12px;
    color: var(--soft);
    margin-top: 10px;
  }

  .start-stream-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 9px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    color: #04121a;
    font-size: 13.5px;
    font-weight: 800;
    border: none;
    cursor: pointer;
    margin-top: 12px;
    box-shadow: 0 4px 18px rgba(0, 242, 254, 0.4);
    transition: all 0.2s ease;
  }
  .start-stream-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 242, 254, 0.6);
  }
  .start-stream-btn svg {
    width: 16px;
    height: 16px;
  }

  @keyframes pingHalo {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.4); opacity: 0; }
  }
</style>
