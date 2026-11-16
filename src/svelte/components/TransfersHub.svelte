<script>
  import PieceVisualizer from './PieceVisualizer.svelte';

  let {
    activeTorrents = [],
    selectedInfoHash = $bindable(''),
    selectedTorrent = null,
    message = '',
    formatDataSize = (n) => `${n} B`,
    openDownloads = () => {},
    openTorrent = (t) => {},
    showTorrentOptions = (e, t) => {},
    torrentTone = (t) => 'active',
    torrentStatus = (t) => '',
    torrentDetail = (t) => '',
    openAddModal = () => {},
    setview = (v) => {},
    getApi = () => ({})
  } = $props();

  let filterTab = $state('all'); // 'all' | 'downloading' | 'seeding' | 'completed' | 'paused'
  let filterText = $state('');

  const filteredTorrents = $derived.by(() => {
    let list = activeTorrents;
    if (filterTab === 'downloading') {
      list = list.filter((t) => !t.paused && !t.done);
    } else if (filterTab === 'seeding') {
      list = list.filter((t) => !t.paused && t.done);
    } else if (filterTab === 'completed') {
      list = list.filter((t) => t.done);
    } else if (filterTab === 'paused') {
      list = list.filter((t) => t.paused);
    }

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.infoHash || '').toLowerCase().includes(q));
    }
    return list;
  });

  const tabCounts = $derived.by(() => {
    return {
      all: activeTorrents.length,
      downloading: activeTorrents.filter((t) => !t.paused && !t.done).length,
      seeding: activeTorrents.filter((t) => !t.paused && t.done).length,
      completed: activeTorrents.filter((t) => t.done).length,
      paused: activeTorrents.filter((t) => t.paused).length
    };
  });

  function selectTorrent(torrent) {
    selectedInfoHash = torrent.infoHash;
  }

  function getFileIcon(type) {
    return type || 'video';
  }
</script>

<div class="transfers-layout">
  <!-- Main Transfers Area -->
  <section class="transfers-main-panel glass-panel">
    <!-- Filter Bar & Toolbar -->
    <div class="transfers-toolbar">
      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button 
          class="tab-btn" 
          class:active={filterTab === 'all'} 
          onclick={() => filterTab = 'all'}
        >
          All <span class="tab-count">{tabCounts.all}</span>
        </button>
        <button 
          class="tab-btn" 
          class:active={filterTab === 'downloading'} 
          onclick={() => filterTab = 'downloading'}
        >
          Downloading <span class="tab-count accent">{tabCounts.downloading}</span>
        </button>
        <button 
          class="tab-btn" 
          class:active={filterTab === 'seeding'} 
          onclick={() => filterTab = 'seeding'}
        >
          Seeding <span class="tab-count purple">{tabCounts.seeding}</span>
        </button>
        <button 
          class="tab-btn" 
          class:active={filterTab === 'completed'} 
          onclick={() => filterTab = 'completed'}
        >
          Finished <span class="tab-count green">{tabCounts.completed}</span>
        </button>
        <button 
          class="tab-btn" 
          class:active={filterTab === 'paused'} 
          onclick={() => filterTab = 'paused'}
        >
          Paused <span class="tab-count muted">{tabCounts.paused}</span>
        </button>
      </div>

      <!-- Search Filter & Quick Actions -->
      <div class="toolbar-actions">
        <div class="search-filter-box">
          <svg class="search-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
          <input 
            type="text" 
            bind:value={filterText} 
            placeholder="Filter active..." 
            class="filter-input"
          />
          {#if filterText}
            <button class="clear-btn" type="button" onclick={() => filterText = ''}>✕</button>
          {/if}
        </div>

        <button class="action-btn" type="button" onclick={openDownloads} title="Open Downloads Directory">
          <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
          <span class="btn-text">Folder</span>
        </button>

        <button class="action-btn primary" type="button" onclick={openAddModal} title="Add New Transfer">
          <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          <span class="btn-text">Add</span>
        </button>
      </div>
    </div>

    <!-- Status Notice banner if any -->
    {#if message}
      <div class="status-banner animate-fade-in">
        <svg class="banner-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6zm1-15C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
        <span>{message}</span>
      </div>
    {/if}

    <!-- Torrent Cards List -->
    <div class="transfers-scroll-area">
      {#if filteredTorrents.length > 0}
        <div class="torrents-grid">
          {#each filteredTorrents as torrent (torrent.infoHash)}
            {@const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0))}
            {@const tone = torrentTone(torrent)}
            {@const isCurrent = selectedInfoHash === torrent.infoHash}
            {@const isVideo = torrent.fileType === 'video' || (!torrent.fileType && (torrent.name || '').match(/\.(mp4|mkv|avi|webm)$/i))}
            
            <div 
              class="transfer-card card-glow-hover animate-slide-up"
              class:current-card={isCurrent}
              data-tone={tone}
              onclick={() => selectTorrent(torrent)}
              ondblclick={() => openTorrent(torrent)}
              oncontextmenu={(event) => showTorrentOptions(event, torrent)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && selectTorrent(torrent)}
            >
              <!-- Card Top Row -->
              <div class="card-header">
                <div class="card-title-group">
                  <div class="file-type-badge" data-type={torrent.fileType || 'file'}>
                    {#if isVideo}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
                    {:else if torrent.fileType === 'audio'}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z"/></svg>
                    {:else if torrent.fileType === 'program'}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.5c0 .28-.22.5-.5.5h-11c-.28 0-.5-.22-.5-.5v-10c0-.28.22-.5.5-.5h11c.28 0 .5.22.5.5v10zM8 8h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z"/></svg>
                    {:else}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    {/if}
                  </div>
                  <strong class="card-filename" title={torrent.name || 'Resolving metadata...'}>
                    {torrent.name || 'Resolving swarm metadata...'}
                  </strong>
                </div>

                <!-- Status Badge -->
                <div class="card-status-pill" data-tone={tone}>
                  <span class="status-dot"></span>
                  <span class="status-text">{torrentStatus(torrent)}</span>
                </div>
              </div>

              <!-- Progress Bar with Buffer Indicator -->
              <div class="progress-section">
                <div class="progress-bar-container">
                  <div class="progress-bar-track">
                    <div 
                      class="progress-bar-fill" 
                      style="width: {progress * 100}%"
                      class:animate-pulse={!torrent.done && !torrent.paused}
                    ></div>
                    <!-- Sequential buffer indicator ahead -->
                    {#if !torrent.done && !torrent.paused && progress > 0}
                      <div 
                        class="progress-buffer-head" 
                        style="left: {Math.min(98, progress * 100 + 4)}%"
                      ></div>
                    {/if}
                  </div>
                  <span class="progress-number">{(progress * 100).toFixed(1)}%</span>
                </div>
              </div>

              <!-- Metadata & Speed Stats Row -->
              <div class="card-stats-row">
                <div class="stat-group">
                  <span class="stat-cell speed-down" title="Download speed">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v8h3l-4 4l-4-4h3V4m-4 14h14v2H7v-2Z"/></svg>
                    {formatDataSize(torrent.downloadSpeed || 0)}/s
                  </span>
                  <span class="stat-cell speed-up" title="Upload speed">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 20h-2V12H8l4-4l4 4h-3v8M5 4h14v2H5V4Z"/></svg>
                    {formatDataSize(torrent.uploadSpeed || 0)}/s
                  </span>
                  <span class="stat-cell peers-cell" title="Connected swarm peers">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 13c-2.28 0-7.07 1.14-7.07 3.42V18h14.15v-1.58c0-2.28-4.79-3.42-7.08-3.42M8.92 13c-.02 0-.05 0-.08.02c-.89-.6-2.02-.93-3.24-.93c-1.85 0-5.6 1.03-5.6 2.92V17h8.84v-1.58c0-1 .92-2.1 2.24-2.42m1.96-5C12.38 8 13 7.38 13 6.62C13 5.86 12.38 5 10.88 5c-1.5 0-2.12.86-2.12 1.62c0 .76.62 1.38 2.12 1.38m5.12 0c1.5 0 2.12-.86 2.12-1.62C18.12 5.38 17.5 4.5 16 4.5c-1.5 0-2.12.88-2.12 1.62c0 .76.62 1.38 2.12 1.38m-10.4 2C6.38 10 7 9.38 7 8.62C7 7.86 6.38 7 4.88 7C3.38 7 2.76 7.86 2.76 8.62c0 .76.62 1.38 2.12 1.38Z"/></svg>
                    {torrent.numPeers || 0}
                  </span>
                </div>

                <div class="stat-group right">
                  <span class="stat-cell size-cell">
                    {formatDataSize(torrent.downloaded || 0)} / {formatDataSize(torrent.length || 0)}
                  </span>
                </div>
              </div>

              <!-- Card Actions Row -->
              <div class="card-actions-bar">
                <div class="actions-left">
                  {#if isVideo}
                    <button 
                      class="stream-btn" 
                      type="button" 
                      onclick={(e) => { e.stopPropagation(); openTorrent(torrent); }}
                      title="Stream Video Now"
                    >
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                      Stream Media
                    </button>
                  {/if}
                </div>

                <div class="actions-right">
                  <button 
                    class="card-icon-btn" 
                    type="button"
                    onclick={(e) => showTorrentOptions(e, torrent)}
                    title="Transfer Options"
                  >
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Empty Transfers State -->
        <div class="transfers-empty-state animate-fade-in">
          <div class="empty-icon-halo">
            <svg viewBox="0 0 24 24" class="halo-icon"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5l-5-5h3V9h4v4h3z"/></svg>
          </div>
          <h2 class="empty-title">
            {activeTorrents.length === 0 ? 'No Active Transfers' : 'No Transfers Match This Filter'}
          </h2>
          <p class="empty-subtitle">
            {activeTorrents.length === 0 
              ? 'Add a magnet link or search high-speed indexes to stream MP4 movies in real-time.' 
              : 'Try selecting another filter tab or clearing the search text.'}
          </p>
          <div class="empty-actions">
            <button class="primary-btn" type="button" onclick={openAddModal}>
              <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add Magnet Link
            </button>
            <button class="secondary-btn" type="button" onclick={() => setview('search')}>
              <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
              Discover Torrents
            </button>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Side Inspector Drawer for Selected Torrent -->
  <aside class="inspector-panel glass-panel">
    <div class="inspector-header">
      <h2 class="inspector-title">Transfer Inspector</h2>
      {#if selectedTorrent}
        <button 
          class="inspector-options-btn" 
          type="button" 
          onclick={(e) => showTorrentOptions(e, selectedTorrent)}
          title="Transfer Menu"
        >
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2z"/></svg>
        </button>
      {/if}
    </div>

    {#if selectedTorrent}
      <div class="inspector-content animate-fade-in">
        <!-- Torrent Name & Primary Action -->
        <div class="inspector-primary-card">
          <div class="meta-row">
            <span class="meta-badge" data-tone={torrentTone(selectedTorrent)}>{torrentStatus(selectedTorrent)}</span>
            <span class="file-size-badge">{formatDataSize(selectedTorrent.length || 0)}</span>
          </div>
          <strong class="inspector-torrent-name" title={selectedTorrent.name}>
            {selectedTorrent.name || 'Resolving metadata...'}
          </strong>

          <!-- Stream Action Button -->
          <button 
            class="stream-primary-btn" 
            type="button" 
            onclick={() => openTorrent(selectedTorrent)}
          >
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
            Stream in Cinema Theater
          </button>
        </div>

        <!-- Sequential Piece Map Visualizer -->
        <PieceVisualizer
          progress={Number(selectedTorrent.progress) || 0}
          fileType={selectedTorrent.fileType || 'video'}
          isStreaming={!selectedTorrent.paused && !selectedTorrent.done}
          {formatDataSize}
          torrentLength={selectedTorrent.length || 0}
        />

        <!-- Detailed Properties DL List -->
        <div class="properties-box">
          <span class="properties-title">Swarm Properties</span>
          <dl class="properties-list">
            <div class="prop-item">
              <dt>Download Rate</dt>
              <dd class="text-accent">{formatDataSize(selectedTorrent.downloadSpeed || 0)}/s</dd>
            </div>
            <div class="prop-item">
              <dt>Upload Rate</dt>
              <dd class="text-purple">{formatDataSize(selectedTorrent.uploadSpeed || 0)}/s</dd>
            </div>
            <div class="prop-item">
              <dt>Downloaded</dt>
              <dd>{formatDataSize(selectedTorrent.downloaded || 0)}</dd>
            </div>
            <div class="prop-item">
              <dt>Uploaded</dt>
              <dd>{formatDataSize(selectedTorrent.uploaded || 0)}</dd>
            </div>
            <div class="prop-item">
              <dt>Connected Peers</dt>
              <dd>{selectedTorrent.numPeers || 0} peers</dd>
            </div>
            <div class="prop-item">
              <dt>Info Hash</dt>
              <dd class="hash-code" title={selectedTorrent.infoHash}>{selectedTorrent.infoHash}</dd>
            </div>
            <div class="prop-item">
              <dt>Destination Path</dt>
              <dd class="path-code" title={selectedTorrent.path || 'Default'}>{selectedTorrent.path || 'Default'}</dd>
            </div>
          </dl>
        </div>
      </div>
    {:else}
      <div class="inspector-empty">
        <svg viewBox="0 0 24 24" class="empty-icon"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        <p>Select any transfer from the list to inspect live sequential swarm pieces and metadata properties.</p>
      </div>
    {/if}
  </aside>
</div>

<style>
  .transfers-layout {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
    gap: 1px;
  }

  /* Main Panel */
  .transfers-main-panel {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: transparent;
    border-right: 1px solid var(--border);
  }

  /* Toolbar */
  .transfers-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 10px;
    background: var(--surface);
    backdrop-filter: blur(16px);
  }

  .filter-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--surface-2);
    padding: 3px;
    border-radius: 9px;
    border: 1px solid var(--border);
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: var(--text);
  }

  .tab-btn.active {
    background: var(--surface-3);
    color: var(--text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .tab-count {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
  }
  .tab-count.accent { background: rgba(0, 242, 254, 0.15); color: var(--accent); }
  .tab-count.purple { background: rgba(139, 92, 246, 0.15); color: #a855f7; }
  .tab-count.green { background: rgba(16, 185, 129, 0.15); color: var(--green); }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-filter-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 4px 8px;
    border-radius: 8px;
    width: 160px;
    transition: all 0.2s ease;
  }
  .search-filter-box:focus-within {
    border-color: var(--accent);
    width: 200px;
  }

  .search-icon {
    width: 13px;
    height: 13px;
    color: var(--muted);
  }

  .filter-input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 12px;
    color: var(--text);
    width: 100%;
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 10px;
    padding: 2px;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .action-btn:hover {
    background: var(--surface-3);
    border-color: var(--border-hover);
  }
  .action-btn.primary {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%);
    border-color: rgba(0, 242, 254, 0.35);
    color: var(--accent);
  }

  .btn-icon {
    width: 13px;
    height: 13px;
  }

  /* Status Banner */
  .status-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(0, 242, 254, 0.08);
    border-bottom: 1px solid rgba(0, 242, 254, 0.15);
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
  }
  .banner-icon {
    width: 15px;
    height: 15px;
  }

  /* Scroll Area */
  .transfers-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .torrents-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Transfer Card */
  .transfer-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    outline: none;
  }

  .transfer-card:hover {
    background: var(--surface-2);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }

  .transfer-card.current-card {
    border-color: var(--accent);
    background: var(--surface-2);
    box-shadow: 0 0 0 1px var(--accent), 0 8px 28px rgba(0, 242, 254, 0.15);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .card-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .file-type-badge {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(0, 242, 254, 0.1);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .file-type-badge svg {
    width: 16px;
    height: 16px;
  }

  .card-filename {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-status-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.08);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  [data-tone="active"] .card-status-pill { background: rgba(0, 242, 254, 0.15); color: var(--accent); }
  [data-tone="seed"] .card-status-pill { background: rgba(139, 92, 246, 0.15); color: #a855f7; }
  [data-tone="paused"] .card-status-pill { background: rgba(245, 158, 11, 0.15); color: var(--yellow); }
  [data-tone="error"] .card-status-pill { background: rgba(239, 68, 68, 0.15); color: var(--red); }

  /* Progress Bar */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-bar-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-bar-track {
    flex: 1;
    height: 7px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
    transition: width 0.3s ease;
  }

  .progress-buffer-head {
    position: absolute;
    top: 0;
    width: 14px;
    height: 100%;
    background: #10b981;
    border-radius: 4px;
    box-shadow: 0 0 8px #10b981;
    opacity: 0.8;
  }

  .progress-number {
    font-size: 11.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    width: 48px;
    text-align: right;
  }

  /* Stats Row */
  .card-stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
  }

  .stat-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .stat-cell {
    display: flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  .stat-cell svg {
    width: 13px;
    height: 13px;
  }

  .speed-down { color: var(--accent); }
  .speed-up { color: #a855f7; }
  .peers-cell { color: var(--blue); }

  /* Actions Bar */
  .card-actions-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .stream-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%);
    border: 1px solid rgba(0, 242, 254, 0.35);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .stream-btn:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.35) 0%, rgba(79, 172, 254, 0.35) 100%);
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.4);
  }

  .stream-btn svg {
    width: 12px;
    height: 12px;
  }

  .card-icon-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .card-icon-btn:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.08);
  }
  .card-icon-btn svg {
    width: 15px;
    height: 15px;
  }

  /* Empty State */
  .transfers-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 24px;
    margin: 40px auto;
    max-width: 440px;
  }

  .empty-icon-halo {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%);
    border: 1px solid rgba(0, 242, 254, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: var(--accent);
  }
  .halo-icon {
    width: 32px;
    height: 32px;
  }

  .empty-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 6px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 20px;
  }

  .empty-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Inspector Panel */
  .inspector-panel {
    width: 340px;
    height: 100%;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    backdrop-filter: blur(20px);
  }

  .inspector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .inspector-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--text);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .inspector-options-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
  }
  .inspector-options-btn:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.08);
  }
  .inspector-options-btn svg {
    width: 16px;
    height: 16px;
  }

  .inspector-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .inspector-primary-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .meta-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--muted);
  }
  .meta-badge[data-tone="active"] { background: rgba(0, 242, 254, 0.15); color: var(--accent); }
  .meta-badge[data-tone="seed"] { background: rgba(139, 92, 246, 0.15); color: #a855f7; }

  .file-size-badge {
    font-size: 11px;
    font-weight: 800;
    color: var(--text);
  }

  .inspector-torrent-name {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    word-break: break-word;
    color: var(--text);
  }

  .stream-primary-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px;
    border-radius: 8px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    color: #04121a;
    font-size: 12.5px;
    font-weight: 800;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(0, 242, 254, 0.35);
  }
  .stream-primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 242, 254, 0.5);
  }
  .stream-primary-btn svg {
    width: 14px;
    height: 14px;
  }

  .properties-box {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .properties-title {
    font-size: 11.5px;
    font-weight: 800;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .properties-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 0;
  }

  .prop-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .prop-item dt {
    color: var(--muted);
  }

  .prop-item dd {
    margin: 0;
    font-weight: 700;
    color: var(--text);
  }

  .text-accent { color: var(--accent) !important; }
  .text-purple { color: #a855f7 !important; }

  .hash-code, .path-code {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
    font-size: 10.5px;
  }

  .inspector-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 20px;
    color: var(--muted);
    margin: auto;
  }
  .inspector-empty .empty-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  .inspector-empty p {
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
  }

  @media (max-width: 1000px) {
    .inspector-panel {
      display: none;
    }
  }
</style>
