<script>
  let {
    activeView = 'transfers',
    setview = (view) => {},
    transferStats = { count: 0, downloading: 0, seeding: 0 },
    videoVisible = false,
    openAddModal = () => {},
    openDownloads = () => {},
    openSettings = () => {}
  } = $props();
</script>

<nav class="nav-rail glass-panel" aria-label="Main Navigation">
  <div class="nav-rail-top">
    <!-- Transfers / Queue View -->
    <button
      type="button"
      class="nav-rail-item"
      class:active={activeView === 'transfers'}
      onclick={() => setview('transfers')}
      title="Transfers & Swarms"
      aria-label="Transfers & Swarms"
    >
      <div class="nav-icon-container">
        <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5l-5-5h3V9h4v4h3z"/></svg>
        {#if transferStats.downloading > 0}
          <span class="nav-badge pulse">{transferStats.downloading}</span>
        {:else if transferStats.count > 0}
          <span class="nav-badge muted">{transferStats.count}</span>
        {/if}
      </div>
      <span class="nav-label">Transfers</span>
      <div class="active-indicator"></div>
    </button>

    <!-- Search / Discovery View -->
    <button
      type="button"
      class="nav-rail-item"
      class:active={activeView === 'search'}
      onclick={() => setview('search')}
      title="Discover & Metasearch"
      aria-label="Discover & Metasearch"
    >
      <div class="nav-icon-container">
        <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
      </div>
      <span class="nav-label">Discover</span>
      <div class="active-indicator"></div>
    </button>

    <!-- Cinema Player View -->
    <button
      type="button"
      class="nav-rail-item"
      class:active={activeView === 'player'}
      onclick={() => setview('player')}
      title="Cinema Theater"
      aria-label="Cinema Theater"
    >
      <div class="nav-icon-container">
        <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
        {#if videoVisible}
          <span class="nav-dot-active"></span>
        {/if}
      </div>
      <span class="nav-label">Cinema</span>
      <div class="active-indicator"></div>
    </button>

    <!-- Swarm Telemetry View -->
    <button
      type="button"
      class="nav-rail-item"
      class:active={activeView === 'telemetry'}
      onclick={() => setview('telemetry')}
      title="Swarm Telemetry & Network"
      aria-label="Swarm Telemetry & Network"
    >
      <div class="nav-icon-container">
        <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 12c0 3.58 2.5 6.55 6 7.54v-2.12C5.74 16.5 4 14.48 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.48-1.74 4.5-4 5.42v2.12c3.5-.99 6-3.96 6-7.54c0-5.5-4.5-9-10-9zm1 5.5h-2v5h2v-5zm-1 9a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3z"/></svg>
      </div>
      <span class="nav-label">Telemetry</span>
      <div class="active-indicator"></div>
    </button>
  </div>

  <div class="nav-rail-bottom">
    <!-- Quick Add Button -->
    <button
      type="button"
      class="nav-action-btn primary-glow"
      onclick={openAddModal}
      title="Add Transfer (Magnet or URL)"
      aria-label="Add Transfer"
    >
      <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>

    <!-- Open Downloads -->
    <button
      type="button"
      class="nav-action-btn"
      onclick={openDownloads}
      title="Open Downloads Folder"
      aria-label="Open Downloads Folder"
    >
      <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
    </button>

    <!-- Settings -->
    <button
      type="button"
      class="nav-action-btn"
      onclick={openSettings}
      title="Settings & Preferences"
      aria-label="Settings"
    >
      <svg viewBox="0 0 24 24" class="nav-icon"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
    </button>
  </div>
</nav>

<style>
  .nav-rail {
    width: 68px;
    height: 100%;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0 16px;
    flex-shrink: 0;
    z-index: 20;
    backdrop-filter: blur(20px);
  }

  .nav-rail-top,
  .nav-rail-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .nav-rail-item {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-rail-item:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }

  .nav-rail-item.active {
    color: var(--accent);
    background: rgba(0, 242, 254, 0.1);
  }

  .nav-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
  }

  .nav-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .active-indicator {
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3.5px;
    height: 24px;
    border-radius: 0 4px 4px 0;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
    transition: transform 0.2s ease;
  }

  .nav-rail-item.active .active-indicator {
    transform: translateY(-50%) scaleY(1);
  }

  .nav-badge {
    position: absolute;
    top: -5px;
    right: -8px;
    background: var(--blue);
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 10px;
    line-height: 1.2;
    min-width: 14px;
    text-align: center;
  }

  .nav-badge.pulse {
    background: var(--accent);
    color: #04121a;
    box-shadow: 0 0 8px rgba(0, 242, 254, 0.6);
  }

  .nav-badge.muted {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text);
  }

  .nav-dot-active {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulseActive 1.5s infinite;
  }

  .nav-action-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .nav-action-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
    background: var(--surface-3);
  }

  .nav-action-btn.primary-glow {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%);
    border-color: rgba(0, 242, 254, 0.35);
    color: var(--accent);
  }

  .nav-action-btn.primary-glow:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.3) 0%, rgba(79, 172, 254, 0.3) 100%);
    box-shadow: 0 0 14px rgba(0, 242, 254, 0.4);
    transform: translateY(-1px);
  }

  @keyframes pulseActive {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
</style>
