<script>
  import Sparkline from './Sparkline.svelte';

  let {
    transferStats = { count: 0, downloading: 0, seeding: 0, downSpeed: 0, upSpeed: 0, peers: 0 },
    themeMode = 'dark',
    setTheme = (mode) => {},
    themeModes = ['system', 'light', 'dark'],
    showCommandMenu = $bindable(false),
    openAddModal = () => {},
    pasteFromClipboard = () => {},
    openDownloads = () => {},
    openSettings = () => {},
    showNativeAppOptions = () => {},
    focusSearch = () => {},
    getApi = () => ({}),
    formatDataSize = (n) => `${n} B`,
    downSpeedHistory = [],
    upSpeedHistory = []
  } = $props();

  const isDownloading = $derived(transferStats.downSpeed > 1024);
  const isSeeding = $derived(transferStats.upSpeed > 1024);
  const isStreaming = $derived(transferStats.downloading > 0);
</script>

<header class="topbar glass-panel">
  <!-- Draggable Region Anchor -->
  <div class="drag-zone"></div>

  <!-- Left: Brand Block & Status -->
  <div class="brand-block no-drag">
    <div class="brand-logo-container">
      <img src="icon.png" alt="HeapSeed Logo" class="brand-icon">
      <div class="brand-glow" class:active-glow={isStreaming}></div>
    </div>
    <div class="brand-info">
      <div class="title-row">
        <h1 class="brand-title">HeapSeed</h1>
        <span class="badge-engine">ENGINE</span>
        {#if isStreaming}
          <span class="status-beacon active">STREAMING</span>
        {:else if transferStats.count > 0}
          <span class="status-beacon idle">SWARM CONNECTED</span>
        {:else}
          <span class="status-beacon standby">STANDBY</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Center: Real-Time Live Bandwidth HUD with Sparklines -->
  <div class="telemetry-hud no-drag">
    <!-- Download Stream Meter -->
    <div class="telemetry-pill dl-pill" class:active={isDownloading} title="Current Aggregate Download Rate">
      <div class="pill-left">
        <svg class="hud-icon dl-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v8h3l-4 4l-4-4h3V4m-4 14h14v2H7v-2Z"/></svg>
        <span class="rate-val">{formatDataSize(transferStats.downSpeed)}/s</span>
      </div>
      <div class="sparkline-container">
        <Sparkline data={downSpeedHistory} color="#00f2fe" width={56} height={18} strokeWidth={1.5} />
      </div>
    </div>

    <!-- Upload Stream Meter -->
    <div class="telemetry-pill ul-pill" class:active={isSeeding} title="Current Aggregate Upload Rate">
      <div class="pill-left">
        <svg class="hud-icon ul-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 20h-2V12H8l4-4l4 4h-3v8M5 4h14v2H5V4Z"/></svg>
        <span class="rate-val">{formatDataSize(transferStats.upSpeed)}/s</span>
      </div>
      <div class="sparkline-container">
        <Sparkline data={upSpeedHistory} color="#8b5cf6" width={56} height={18} strokeWidth={1.5} />
      </div>
    </div>

    <!-- Swarm Peers Pill -->
    <div class="telemetry-pill peers-pill" title="Total Connected Swarm Peers">
      <svg class="hud-icon peers-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16 13c-2.28 0-7.07 1.14-7.07 3.42V18h14.15v-1.58c0-2.28-4.79-3.42-7.08-3.42M8.92 13c-.02 0-.05 0-.08.02c-.89-.6-2.02-.93-3.24-.93c-1.85 0-5.6 1.03-5.6 2.92V17h8.84v-1.58c0-1 .92-2.1 2.24-2.42m1.96-5C12.38 8 13 7.38 13 6.62C13 5.86 12.38 5 10.88 5c-1.5 0-2.12.86-2.12 1.62c0 .76.62 1.38 2.12 1.38m5.12 0c1.5 0 2.12-.86 2.12-1.62C18.12 5.38 17.5 4.5 16 4.5c-1.5 0-2.12.88-2.12 1.62c0 .76.62 1.38 2.12 1.38m-10.4 2C6.38 10 7 9.38 7 8.62C7 7.86 6.38 7 4.88 7C3.38 7 2.76 7.86 2.76 8.62c0 .76.62 1.38 2.12 1.38Z"/></svg>
      <span class="rate-val">{transferStats.peers} peers</span>
    </div>

    <!-- Global Quick Search Key Command Trigger -->
    <button type="button" class="search-quick-trigger" onclick={focusSearch} title="Search / Command Palette (Ctrl+K)">
      <svg class="trigger-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
      <span class="trigger-text">Search Torrents...</span>
      <kbd class="kbd-badge">Ctrl K</kbd>
    </button>
  </div>

  <!-- Right: Actions, Theme Switch & Windows Controls -->
  <div class="top-actions no-drag">
    <!-- Quick Add Button -->
    <button class="topbar-btn add-btn" type="button" onclick={openAddModal} title="Add Magnet URI or Torrent File">
      <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      <span class="btn-label">New Transfer</span>
    </button>

    <!-- Modern Segmented Theme Selector -->
    <div class="theme-switch" aria-label="Theme selector">
      {#each themeModes as mode}
        <button 
          class:active={themeMode === mode} 
          type="button" 
          onclick={() => setTheme(mode)}
          title={`Set appearance to ${mode}`}
          aria-label={`Set appearance to ${mode}`}
        >
          {#if mode === 'system'}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.1 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
          {:else if mode === 'light'}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06c.38-.38.38-1.02 0-1.41zm-1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06z"/></svg>
          {:else}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26a5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Application Menu Anchored Dropdown -->
    <div class="menu-anchor">
      <button 
        class="topbar-btn icon-btn" 
        class:active={showCommandMenu} 
        type="button" 
        title="App Menu" 
        aria-label="App Menu" 
        onclick={() => showCommandMenu = !showCommandMenu}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 4.25h10v1.5H3zm0 3h10v1.5H3zm0 3h10v1.5H3z"/></svg>
      </button>

      {#if showCommandMenu}
        <div class="command-menu dropdown-glow animate-fade-in">
          <button type="button" onclick={openSettings} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17v2h6v-2H3M3 5v2h10V5H3m10 16v-2h8v-2h-8v-2h-2v6h2M7 9v2H3v2h4v2h2V9H7m14 4v-2H11v2h10m-6-4h2V7h4V5h-4V3h-2v6Z"/></svg>
            Preferences & Settings
          </button>
          <button type="button" onclick={pasteFromClipboard} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>
            Paste Magnet from Clipboard
          </button>
          <button type="button" onclick={openDownloads} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
            Open Downloads Folder
          </button>
          <button type="button" onclick={showNativeAppOptions} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
            Native Context Options
          </button>
        </div>
      {/if}
    </div>

    <!-- Window Control Buttons (Frameless Window) -->
    <div class="window-controls-group">
      <button 
        class="window-ctrl-btn minimize-btn" 
        type="button" 
        title="Minimize" 
        aria-label="Minimize" 
        onclick={() => getApi().minimize?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 8h10v1.5H3z"/></svg>
      </button>
      <button 
        class="window-ctrl-btn maximize-btn" 
        type="button" 
        title="Maximize/Restore" 
        aria-label="Maximize/Restore" 
        onclick={() => getApi().maximize?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 4h8v8H4zm1.5 1.5v5h5v-5z"/></svg>
      </button>
      <button 
        class="window-ctrl-btn danger close-btn" 
        type="button" 
        title="Close" 
        aria-label="Close" 
        onclick={() => getApi().closeWindow?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="m4.2 3.2 3.8 3.75 3.8-3.75 1 1.05L9.05 8l3.75 3.75-1 1.05L8 9.05 4.2 12.8l-1-1.05L6.95 8 3.2 4.25z"/></svg>
      </button>
    </div>
  </div>
</header>

<style>
  .topbar {
    position: relative;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px 0 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(24px);
    z-index: 100;
    user-select: none;
    flex-shrink: 0;
  }

  /* Draggable zone across the entire topbar */
  .drag-zone {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-app-region: drag;
    pointer-events: none;
  }

  .no-drag {
    -webkit-app-region: no-drag;
    position: relative;
    z-index: 2;
  }

  /* Brand Block */
  .brand-block {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-logo-container {
    position: relative;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    position: relative;
    z-index: 2;
  }

  .brand-glow {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 242, 254, 0.45) 0%, transparent 70%);
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .brand-glow.active-glow {
    opacity: 1;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, transparent 70%);
    animation: breathingGlow 2.5s infinite alternate;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .brand-title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
    margin: 0;
    font-family: 'Montserrat', sans-serif;
  }

  .badge-engine {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 1.5px 5px;
    border-radius: 4px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    color: #04121a;
  }

  .status-beacon {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 1.5px 6px;
    border-radius: 12px;
  }

  .status-beacon.active {
    background: rgba(16, 185, 129, 0.15);
    color: var(--green);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .status-beacon.idle {
    background: rgba(0, 242, 254, 0.1);
    color: var(--accent);
    border: 1px solid rgba(0, 242, 254, 0.25);
  }

  .status-beacon.standby {
    background: rgba(255, 255, 255, 0.06);
    color: var(--muted);
  }

  /* Telemetry HUD */
  .telemetry-hud {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .telemetry-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 9px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 11.5px;
    font-weight: 700;
    color: var(--muted);
    transition: all 0.2s ease;
  }

  .telemetry-pill.active {
    border-color: var(--border-hover);
    color: var(--text);
  }

  .pill-left {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hud-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .dl-icon { color: var(--accent); }
  .ul-icon { color: #a855f7; }
  .peers-icon { color: var(--blue); }

  .rate-val {
    font-variant-numeric: tabular-nums;
  }

  .sparkline-container {
    display: flex;
    align-items: center;
  }

  /* Quick search trigger button */
  .search-quick-trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 8px;
    color: var(--muted);
    cursor: pointer;
    font-size: 11.5px;
    transition: all 0.2s ease;
  }

  .search-quick-trigger:hover {
    color: var(--text);
    border-color: var(--border-hover);
    background: var(--surface-3);
  }

  .trigger-icon {
    width: 12px;
    height: 12px;
  }

  .kbd-badge {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 9.5px;
    font-family: inherit;
    font-weight: 700;
    color: var(--muted);
  }

  /* Top Actions */
  .top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    transition: all 0.2s ease;
  }

  .topbar-btn:hover {
    background: var(--surface-3);
    border-color: var(--border-hover);
  }

  .topbar-btn.add-btn {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.18) 0%, rgba(79, 172, 254, 0.18) 100%);
    border-color: rgba(0, 242, 254, 0.35);
    color: var(--accent);
  }

  .topbar-btn.add-btn:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.28) 0%, rgba(79, 172, 254, 0.28) 100%);
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.3);
  }

  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .topbar-btn.icon-btn {
    padding: 6px;
    width: 30px;
    height: 30px;
    justify-content: center;
  }
  .topbar-btn.icon-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Segmented Theme Switch */
  .theme-switch {
    display: flex;
    align-items: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2px;
    gap: 1px;
  }

  .theme-switch button {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .theme-switch button:hover {
    color: var(--text);
  }

  .theme-switch button.active {
    background: var(--surface-3);
    color: var(--accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .theme-icon {
    width: 13px;
    height: 13px;
  }

  /* Dropdown Menu */
  .menu-anchor {
    position: relative;
  }

  .command-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 220px;
    background: var(--surface-3);
    border: 1px solid var(--border-hover);
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
    z-index: 1000;
  }

  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 12.5px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--accent);
  }

  .menu-item-icon {
    width: 15px;
    height: 15px;
    color: var(--muted);
  }
  .dropdown-item:hover .menu-item-icon {
    color: var(--accent);
  }

  /* Windows Window Controls */
  .window-controls-group {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 4px;
  }

  .window-ctrl-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .window-ctrl-btn svg {
    width: 12px;
    height: 12px;
  }

  .window-ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
  }

  .window-ctrl-btn.danger:hover {
    background: var(--red);
    color: #fff;
  }

  @keyframes breathingGlow {
    from { opacity: 0.6; filter: blur(2px); }
    to { opacity: 1; filter: blur(4px); }
  }

  @media (max-width: 900px) {
    .telemetry-hud .sparkline-container {
      display: none;
    }
    .search-quick-trigger {
      display: none;
    }
    .badge-engine,
    .status-beacon,
    .btn-label,
    .peers-pill {
      display: none;
    }
    .telemetry-hud {
      gap: 6px;
    }
    .top-actions {
      gap: 6px;
    }
  }
</style>
