<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import Plyr from 'plyr';

  let {
    videoVisible = $bindable(),
    selectedTorrent,
    openTorrent,
    activeStream
  } = $props();

  let playerEl = $state();
  let player;

  function startStream(streamUrl, mimeType) {
    if (!streamUrl || !playerEl) return;
    
    player ||= new Plyr(playerEl, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'],
      settings: ['quality', 'speed'],
      tooltips: { controls: true, seek: true },
      displayDuration: true
    });
    
    player.source = { 
      type: 'video', 
      sources: [{ src: streamUrl, type: mimeType || 'video/mp4' }] 
    };
    
    player.play().catch(() => {});
  }

  // Svelte 5 Rune effect to watch for stream updates
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
    }
  });
</script>

<section class:active={videoVisible} class="player-panel glass-panel">
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <video bind:this={playerEl} id="player" playsinline controls crossorigin="anonymous"></video>
  
  {#if !videoVisible}
    <div class="player-empty animate-fade-in">
      <div class="player-placeholder-visual">
        <div class="radar-ping"></div>
        <svg class="player-play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5l-6 4.5z"/></svg>
      </div>
      <span class="player-status-tag">Ready to Stream</span>
      <strong class="player-media-title" title={selectedTorrent?.name || 'Select a transfer'}>
        {selectedTorrent?.name || 'No selected item is active'}
      </strong>
      <button 
        class="primary-btn small player-trigger-btn" 
        type="button" 
        disabled={!selectedTorrent} 
        on:click={() => openTorrent(selectedTorrent)}
      >
        <svg class="icon-inline" viewBox="0 0 24 24" style="margin-right: 4px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        Stream Selected
      </button>
    </div>
  {/if}
</section>
