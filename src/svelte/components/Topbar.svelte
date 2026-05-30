<script>
  let {
    transferStats,
    themeMode,
    setTheme,
    themeModes,
    showCommandMenu = $bindable(),
    pasteFromClipboard,
    openDownloads,
    showNativeAppOptions,
    getApi,
    formatDataSize
  } = $props();
</script>

<header class="topbar glass-panel">
  <div class="brand-block">
    <div class="brand-logo-container">
      <img src="icon.png" alt="HeapSeed" class="brand-icon">
      <div class="brand-glow"></div>
    </div>
    <div class="brand-info">
      <h1>HeapSeed <span class="badge-engine">Engine</span></h1>
      <p class="stats-subtitle">
        <span class="stat-pill"><span class="dot pulse-active"></span> {transferStats.count} transfers</span>
        <span class="stat-separator">·</span>
        <span class="stat-pill speed-down"><svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v8h3l-4 4l-4-4h3V4m-4 14h14v2H7v-2Z"/></svg> {formatDataSize(transferStats.downSpeed)}/s</span>
        <span class="stat-separator">·</span>
        <span class="stat-pill peers-count"><svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M16 13c-2.28 0-7.07 1.14-7.07 3.42V18h14.15v-1.58c0-2.28-4.79-3.42-7.08-3.42M8.92 13c-.02 0-.05 0-.08.02c-.89-.6-2.02-.93-3.24-.93c-1.85 0-5.6 1.03-5.6 2.92V17h8.84v-1.58c0-1 .92-2.1 2.24-2.42m1.96-5C12.38 8 13 7.38 13 6.62C13 5.86 12.38 5 10.88 5c-1.5 0-2.12.86-2.12 1.62c0 .76.62 1.38 2.12 1.38m5.12 0c1.5 0 2.12-.86 2.12-1.62C18.12 5.38 17.5 4.5 16 4.5c-1.5 0-2.12.88-2.12 1.62c0 .76.62 1.38 2.12 1.38m-10.4 2C6.38 10 7 9.38 7 8.62C7 7.86 6.38 7 4.88 7C3.38 7 2.76 7.86 2.76 8.62c0 .76.62 1.38 2.12 1.38Z"/></svg> {transferStats.peers} peers</span>
      </p>
    </div>
  </div>

  <div class="top-actions">
    <!-- Modern Segmented Theme Switch -->
    <div class="theme-switch" aria-label="Theme selector">
      {#each themeModes as mode}
        <button 
          class:active={themeMode === mode} 
          type="button" 
          on:click={() => setTheme(mode)}
          title={`Set theme to ${mode}`}
        >
          {#if mode === 'system'}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
          {:else if mode === 'light'}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06c.38-.38.38-1.02 0-1.41zm-1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06z"/></svg>
          {:else}
            <svg class="theme-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26a5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
          {/if}
          <span class="theme-label-text">{mode}</span>
        </button>
      {/each}
    </div>

    <!-- Application Menu Anchored Dropdown -->
    <div class="menu-anchor">
      <button 
        class="titlebar-btn action-menu-btn" 
        class:active={showCommandMenu} 
        type="button" 
        title="App menu" 
        aria-label="App menu" 
        on:click={() => showCommandMenu = !showCommandMenu}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 4.25h10v1.5H3zm0 3h10v1.5H3zm0 3h10v1.5H3z"/></svg>
      </button>
      {#if showCommandMenu}
        <div class="command-menu dropdown-glow animate-fade-in">
          <button type="button" on:click={pasteFromClipboard} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>
            Paste Magnet URI
          </button>
          <button type="button" on:click={openDownloads} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
            Open Downloads Folder
          </button>
          <button type="button" on:click={showNativeAppOptions} class="dropdown-item">
            <svg class="menu-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
            Native App Options
          </button>
          
          <div class="menu-section">
            <span>Appearance</span>
            <div class="dropdown-segmented">
              {#each themeModes as mode}
                <button class:active={themeMode === mode} type="button" on:click={() => setTheme(mode)}>{mode}</button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Window Action Buttons -->
    <div class="window-controls-group">
      <button 
        class="titlebar-btn window-ctrl-btn minimize-btn" 
        type="button" 
        title="Minimize" 
        aria-label="Minimize" 
        on:click={() => getApi().minimize?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 8h10v1.5H3z"/></svg>
      </button>
      <button 
        class="titlebar-btn window-ctrl-btn maximize-btn" 
        type="button" 
        title="Maximize/Restore" 
        aria-label="Maximize/Restore" 
        on:click={() => getApi().maximize?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 4h8v8H4zm1.5 1.5v5h5v-5z"/></svg>
      </button>
      <button 
        class="titlebar-btn danger window-ctrl-btn close-btn" 
        type="button" 
        title="Close" 
        aria-label="Close" 
        on:click={() => getApi().closeWindow?.()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="m4.2 3.2 3.8 3.75 3.8-3.75 1 1.05L9.05 8l3.75 3.75-1 1.05L8 9.05 4.2 12.8l-1-1.05L6.95 8 3.2 4.25z"/></svg>
      </button>
    </div>
  </div>
</header>
