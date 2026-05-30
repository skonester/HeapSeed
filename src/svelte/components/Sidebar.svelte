<script>
  let {
    transferStats,
    activeTorrents,
    selectedInfoHash = $bindable(),
    selectedTorrent,
    message,
    formatDataSize,
    openDownloads,
    openTorrent,
    showTorrentOptions,
    torrentTone,
    torrentStatus,
    torrentDetail
  } = $props();
</script>

<aside class="activity-pane">
  <!-- Stats Strip (Visual Dials) -->
  <section class="stats-strip stats-grid glass-panel">
    <div class="stat-card stat-downloading">
      <span class="stat-card-label">Active</span>
      <strong class="stat-card-value">{transferStats.downloading}</strong>
      <div class="stat-card-glow"></div>
    </div>
    <div class="stat-card stat-seeding">
      <span class="stat-card-label">Seeding</span>
      <strong class="stat-card-value">{transferStats.seeding}</strong>
      <div class="stat-card-glow"></div>
    </div>
    <div class="stat-card stat-speed-up">
      <span class="stat-card-label">Upload</span>
      <strong class="stat-card-value">{formatDataSize(transferStats.upSpeed)}/s</strong>
      <div class="stat-card-glow"></div>
    </div>
  </section>

  <!-- Transfers List Panel -->
  <section class="transfer-panel glass-panel">
    <div class="panel-head">
      <h2 class="panel-title-label">Transfers</h2>
      <button class="secondary-btn small" type="button" on:click={openDownloads} title="Open downloads directory">
        <svg class="icon-inline" viewBox="0 0 24 24" style="margin-right: 4px;"><path fill="currentColor" d="M19 19H5V8h14v11M9 4v2h6V4H9m11 2h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0-2-.9-2-2V8c0-1.1-.9-2-2-2z"/></svg>
        Downloads Folder
      </button>
    </div>

    <!-- Global State Status Message -->
    {#if message || activeTorrents.length === 0}
      <div class="status-message animate-pulse-slow">
        <svg class="icon-inline-message" viewBox="0 0 24 24"><path fill="currentColor" d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6zm1-15C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
        <span>{message || 'Ready. No active peer connection.'}</span>
      </div>
    {/if}

    <!-- Active Swarms Queue -->
    <ul class="transfer-list">
      {#each activeTorrents as torrent (torrent.infoHash)}
        {@const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0))}
        {@const tone = torrentTone(torrent)}
        {@const isCurrent = selectedInfoHash === torrent.infoHash}
        
        <li 
          class:current={isCurrent} 
          data-tone={tone}
          class="transfer-item animate-slide-up"
        >
          <button
            type="button"
            on:click={() => selectedInfoHash = torrent.infoHash}
            on:dblclick={() => openTorrent(torrent)}
            on:contextmenu={(event) => showTorrentOptions(event, torrent)}
            class="transfer-item-btn"
          >
            <span class="transfer-top">
              <strong class="torrent-name" title={torrent.name || 'Resolving metadata'}>
                {torrent.name || 'Resolving metadata...'}
              </strong>
              <span class="status-pill-badge" data-tone={tone}>
                {torrentStatus(torrent)}
              </span>
            </span>
            <span class="transfer-detail">{torrentDetail(torrent)}</span>
            <span class="progress-track-wrapper">
              <span class="progress-track">
                <span class="progress-fill" style={`width: ${progress * 100}%`}></span>
              </span>
              <span class="progress-percentage-text">{(progress * 100).toFixed(1)}%</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <!-- Detailed Inspector Panel -->
  <section class="details-panel glass-panel">
    <h2 class="panel-title-label">Selected Transfer</h2>
    {#if selectedTorrent}
      <div class="selected-details-content animate-fade-in">
        <div class="details-info-header">
          <svg class="file-icon-large" viewBox="0 0 24 24"><path fill="currentColor" d="M13 9V3.5L18.5 9M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z"/></svg>
          <strong class="details-torrent-name">{selectedTorrent.name || 'Resolving metadata...'}</strong>
        </div>
        
        <div class="dl-wrapper">
          <dl class="details-definition-list">
            <div class="detail-row">
              <dt>Status</dt>
              <dd><span class="detail-badge-status" data-tone={torrentTone(selectedTorrent)}>{torrentStatus(selectedTorrent)}</span></dd>
            </div>
            <div class="detail-row">
              <dt>Size</dt>
              <dd>{formatDataSize(selectedTorrent.length || 0)}</dd>
            </div>
            <div class="detail-row">
              <dt>Hash ID</dt>
              <dd class="code-hash" title={selectedTorrent.infoHash}>{selectedTorrent.infoHash}</dd>
            </div>
            <div class="detail-row">
              <dt>Path</dt>
              <dd class="path-dd" title={selectedTorrent.path || 'Pending'}>{selectedTorrent.path || 'Pending'}</dd>
            </div>
          </dl>
        </div>
        
        <button 
          class="primary-btn details-action-btn" 
          type="button" 
          on:click={() => openTorrent(selectedTorrent)}
        >
          <svg class="icon-inline" viewBox="0 0 24 24" style="margin-right: 6px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          Open & Stream Media
        </button>
      </div>
    {:else}
      <div class="no-selection-empty-state">
        <svg class="empty-inspector-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        <p>No transfer selected. Click any active transfer above to view metadata properties.</p>
      </div>
    {/if}
  </section>
</aside>
