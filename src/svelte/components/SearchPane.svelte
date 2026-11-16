<script>
  let {
    query = $bindable(''),
    showHistoryMenu = $bindable(false),
    searchHistory = [],
    isSearching = false,
    category = $bindable('all'),
    sortMode = $bindable('seeders'),
    enabledSources = $bindable([]),
    categories = [],
    sortModes = [],
    sources = [],
    sourceLabels = {},
    filteredResults = [],
    searchError = '',
    handleSearch = () => {},
    selectHistoryItem = (item) => {},
    clearHistory = () => {},
    pasteFromClipboard = () => {},
    resetSearch = () => {},
    toggleSource = (source) => {},
    getResultType = (r) => 'file',
    initiatePayload = (mag) => {},
    copyMagnet = (mag) => {}
  } = $props();

  let viewMode = $state('grid'); // 'grid' | 'list'
  let searchInputEl = $state();

  export function focusInput() {
    if (searchInputEl) {
      searchInputEl.focus();
      searchInputEl.select();
    }
  }

  function getHealthScore(seeders, leechers) {
    const s = Number(seeders) || 0;
    if (s > 100) return 'excellent';
    if (s > 25) return 'good';
    if (s > 5) return 'fair';
    return 'weak';
  }
</script>

<div class="search-experience glass-panel">
  <!-- Top Command & Query Bar -->
  <div class="search-command-zone">
    <div class="omnibar-wrapper">
      <div class="omnibar-glow-frame" class:is-focused={showHistoryMenu}>
        <svg class="omnibar-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
        <input
          bind:this={searchInputEl}
          type="text"
          bind:value={query}
          placeholder="Search movies, anime, music, hash or paste magnet: URI..."
          class="omnibar-input"
          onfocus={() => showHistoryMenu = searchHistory.length > 0}
          onblur={() => setTimeout(() => showHistoryMenu = false, 200)}
          onkeydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {#if query}
          <button class="clear-query-btn" type="button" onclick={() => query = ''} aria-label="Clear query">
            ✕
          </button>
        {/if}
      </div>

      <!-- History Dropdown -->
      {#if showHistoryMenu}
        <div class="history-dropdown dropdown-glow animate-fade-in">
          <div class="dropdown-header">
            <span>Recent Searches</span>
            <button class="clear-history-link" type="button" onmousedown={(e) => { e.preventDefault(); clearHistory(); }}>
              Clear
            </button>
          </div>
          {#each searchHistory as item}
            <button 
              type="button" 
              class="history-row" 
              onmousedown={(e) => { e.preventDefault(); selectHistoryItem(item); }}
            >
              <svg class="history-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89l.07.14L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9zm-1 5v5l4.28 2.54l.72-1.21l-3.5-2.08V8H12z"/></svg>
              <span class="history-text">{item}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Main Search Action Buttons -->
    <div class="omnibar-actions">
      <button 
        class="search-execute-btn" 
        type="button" 
        disabled={isSearching} 
        onclick={handleSearch}
      >
        {#if isSearching}
          <span class="spinner-dot"></span>
          <span>Searching...</span>
        {:else}
          <svg viewBox="0 0 24 24" class="btn-icon"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
          <span>Search</span>
        {/if}
      </button>

      <button class="secondary-btn" type="button" onclick={pasteFromClipboard} title="Paste Magnet URI from Clipboard">
        Paste
      </button>
      <button class="secondary-btn" type="button" onclick={resetSearch} title="Reset results">
        Reset
      </button>
    </div>
  </div>

  <!-- Filter Controls Stripe -->
  <div class="discovery-filters-bar">
    <!-- Category Pills -->
    <div class="filter-section">
      <span class="filter-heading">Category</span>
      <div class="category-pills">
        {#each categories as item}
          <button 
            type="button"
            class="pill-choice" 
            class:active={category === item.value}
            onclick={() => category = item.value}
          >
            {#if item.value === 'movies'}
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
            {:else if item.value === 'tv'}
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
            {:else if item.value === 'music'}
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z"/></svg>
            {:else if item.value === 'software'}
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.5c0 .28-.22.5-.5.5h-11c-.28 0-.5-.22-.5-.5v-10c0-.28.22-.5.5-.5h11c.28 0 .5.22.5.5v10zM8 8h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z"/></svg>
            {:else}
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v2H4V6m0 5h16v2H4v-2m0 5h16v2H4v-2Z"/></svg>
            {/if}
            <span>{item.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Scraper Engines -->
    <div class="filter-section">
      <span class="filter-heading">Engines</span>
      <div class="source-toggles">
        {#each sources as source}
          <button 
            type="button"
            class="source-chip" 
            class:active={enabledSources.includes(source)}
            onclick={() => toggleSource(source)}
          >
            <span class="chip-status-dot"></span>
            <span>{sourceLabels[source] || source}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Sort & Layout Toggle -->
    <div class="filter-section right-aligned">
      <span class="filter-heading">Sort</span>
      <div class="sort-selector">
        {#each sortModes as item}
          <button 
            type="button"
            class="sort-btn" 
            class:active={sortMode === item.value}
            onclick={() => sortMode = item.value}
          >
            {item.label}
          </button>
        {/each}
      </div>

      <!-- View Switcher (Grid vs List) -->
      <div class="view-switcher">
        <button 
          type="button" 
          class="view-btn" 
          class:active={viewMode === 'grid'}
          onclick={() => viewMode = 'grid'}
          title="Grid view"
        >
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z"/></svg>
        </button>
        <button 
          type="button" 
          class="view-btn" 
          class:active={viewMode === 'list'}
          onclick={() => viewMode = 'list'}
          title="List view"
        >
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18v2H3V4m0 7h18v2H3v-2m0 7h18v2H3v-2Z"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Search Results Bar Header -->
  <div class="results-meta-header">
    <div class="results-stats">
      <strong class="count-number">{filteredResults.length}</strong>
      <span class="count-label">{filteredResults.length === 1 ? 'search result' : 'search results'}</span>
    </div>
    {#if searchError}
      <div class="error-notice">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>{searchError}</span>
      </div>
    {/if}
  </div>

  <!-- Results Content Area -->
  <div class="results-scroll-container">
    {#if isSearching}
      <div class="searching-state animate-fade-in">
        <div class="radar-box">
          <div class="radar-scan"></div>
          <svg viewBox="0 0 24 24" class="radar-icon"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
        </div>
        <h3 class="search-title">Querying Swarm Indexers</h3>
        <p class="search-desc">Connecting to enabled providers (YTS, Nyaa, LimeTorrents, TorrentDownloads)...</p>
      </div>
    {:else if filteredResults.length > 0}
      {#if viewMode === 'grid'}
        <!-- Grid View of Results with Movie Posters where available -->
        <div class="results-grid animate-fade-in">
          {#each filteredResults as result}
            {@const resultType = getResultType(result)}
            {@const health = getHealthScore(result.seeders, result.leechers)}
            
            <div class="result-card card-glow-hover">
              <!-- Thumbnail / Poster Header -->
              <div class="poster-container">
                {#if result.thumbnail}
                  <img src={result.thumbnail} alt={result.name} class="poster-img" loading="lazy">
                  <div class="poster-overlay"></div>
                {:else}
                  <div class="poster-placeholder" data-type={resultType}>
                    {#if resultType === 'video'}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
                    {:else if resultType === 'audio'}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z"/></svg>
                    {:else if resultType === 'app'}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.5c0 .28-.22.5-.5.5h-11c-.28 0-.5-.22-.5-.5v-10c0-.28.22-.5.5-.5h11c.28 0 .5.22.5.5v10zM8 8h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z"/></svg>
                    {:else}
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    {/if}
                  </div>
                {/if}

                <!-- Source & Health Badges -->
                <div class="poster-badges">
                  <span class="source-badge">{result.source}</span>
                  <span class="health-badge" data-health={health}>
                    <span class="flame-dot"></span>
                    {result.seeders || 0} seeds
                  </span>
                </div>
              </div>

              <!-- Card Content -->
              <div class="card-details">
                <h4 class="card-title" title={result.name}>{result.name}</h4>

                <div class="card-meta-line">
                  <span class="size-pill">{result.size || 'N/A'}</span>
                  <span class="leechers-pill">{result.leechers || 0} leech</span>
                </div>

                <!-- Action Buttons -->
                <div class="card-actions">
                  <button 
                    class="download-btn" 
                    type="button" 
                    onclick={() => initiatePayload(result.magnetLink)}
                  >
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5l-5-5h3V9h4v4h3z"/></svg>
                    Stream / DL
                  </button>
                  <button 
                    class="copy-btn" 
                    type="button" 
                    onclick={() => copyMagnet(result.magnetLink)}
                    title="Copy Magnet URI"
                  >
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Dense List View -->
        <div class="results-list-table animate-fade-in">
          {#each filteredResults as result}
            {@const resultType = getResultType(result)}
            {@const health = getHealthScore(result.seeders, result.leechers)}

            <div class="table-row card-glow-hover">
              <div class="row-icon-cell" data-type={resultType}>
                {#if resultType === 'video'}
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
                {:else if resultType === 'audio'}
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z"/></svg>
                {:else}
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                {/if}
              </div>

              <div class="row-title-cell">
                <strong class="row-title" title={result.name}>{result.name}</strong>
                <div class="row-meta">
                  <span class="source-tag">{result.source}</span>
                  <span class="size-tag">{result.size || 'N/A'}</span>
                </div>
              </div>

              <div class="row-seeds-cell" data-health={health}>
                <span class="seeders-num">↑ {result.seeders || 0}</span>
                <span class="leechers-num">↓ {result.leechers || 0}</span>
              </div>

              <div class="row-actions-cell">
                <button 
                  class="table-stream-btn" 
                  type="button" 
                  onclick={() => initiatePayload(result.magnetLink)}
                >
                  Download
                </button>
                <button 
                  class="table-copy-btn" 
                  type="button" 
                  onclick={() => copyMagnet(result.magnetLink)}
                  title="Copy Magnet Link"
                >
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- Empty Search State -->
      <div class="search-empty-state">
        <div class="empty-halo">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
        </div>
        <h3 class="empty-title">
          {query ? 'No matching swarm payloads found' : 'Ready to Discover Media'}
        </h3>
        <p class="empty-desc">
          {query 
            ? 'Try broadening your search term or enabling more indexers in the filters bar above.' 
            : 'Type a movie title, artist, software package, or paste a magnet link to start streaming.'}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .search-experience {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
  }

  /* Command Zone */
  .search-command-zone {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(16px);
  }

  .omnibar-wrapper {
    position: relative;
    flex: 1;
  }

  .omnibar-glow-frame {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 12px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
  }

  .omnibar-glow-frame.is-focused,
  .omnibar-glow-frame:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(0, 242, 254, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.06);
    background: var(--surface-3);
  }

  .omnibar-icon {
    width: 17px;
    height: 17px;
    color: var(--muted);
    flex-shrink: 0;
  }

  .omnibar-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-size: 13.5px;
    font-family: inherit;
    color: var(--text);
  }

  .clear-query-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .clear-query-btn:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.1);
  }

  /* Dropdown */
  .history-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--surface-3);
    border: 1px solid var(--border-hover);
    border-radius: 10px;
    padding: 6px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
    z-index: 500;
  }

  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
  }

  .clear-history-link {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 11px;
  }

  .history-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 12.5px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }
  .history-row:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--accent);
  }

  .history-icon {
    width: 14px;
    height: 14px;
    color: var(--muted);
  }

  /* Action Buttons */
  .omnibar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-execute-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    border: none;
    color: #04121a;
    font-size: 12.5px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(0, 242, 254, 0.35);
  }
  .search-execute-btn:hover {
    box-shadow: 0 6px 20px rgba(0, 242, 254, 0.5);
    transform: translateY(-1px);
  }
  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .spinner-dot {
    width: 12px;
    height: 12px;
    border: 2px solid #04121a;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Filters Bar */
  .discovery-filters-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 18px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 12px;
    background: var(--surface);
    font-size: 12px;
  }

  .filter-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .filter-section.right-aligned {
    margin-left: auto;
  }

  .filter-heading {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .category-pills, .source-toggles, .sort-selector {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--surface-2);
    padding: 2px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .pill-choice, .source-chip, .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-choice svg {
    width: 12px;
    height: 12px;
  }

  .pill-choice:hover, .source-chip:hover, .sort-btn:hover {
    color: var(--text);
  }

  .pill-choice.active, .sort-btn.active {
    background: var(--surface-3);
    color: var(--text);
  }

  .source-chip.active {
    background: rgba(0, 242, 254, 0.12);
    color: var(--accent);
  }

  .chip-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
  }
  .source-chip.active .chip-status-dot {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }

  /* View Switcher */
  .view-switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 2px;
    border-radius: 6px;
  }

  .view-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .view-btn svg {
    width: 13px;
    height: 13px;
  }
  .view-btn.active {
    background: var(--surface-3);
    color: var(--accent);
  }

  /* Results Meta Header */
  .results-meta-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }

  .results-stats {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .count-number {
    font-size: 13.5px;
    font-weight: 800;
    color: var(--accent);
  }
  .count-label {
    font-size: 12px;
    color: var(--muted);
  }

  .error-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--red);
    font-size: 12px;
    font-weight: 600;
  }
  .error-notice svg {
    width: 14px;
    height: 14px;
  }

  /* Scroll Container */
  .results-scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
  }

  /* Grid View */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }

  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .result-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  }

  .poster-container {
    position: relative;
    width: 100%;
    height: 140px;
    background: rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .poster-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  .result-card:hover .poster-img {
    transform: scale(1.05);
  }

  .poster-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(9, 10, 15, 0.85) 100%);
  }

  .poster-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(0, 242, 254, 0.15) 0%, rgba(14, 18, 27, 0.8) 100%);
    color: var(--accent);
  }
  .poster-placeholder svg {
    width: 44px;
    height: 44px;
    opacity: 0.8;
  }

  .poster-badges {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
  }

  .source-badge {
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .health-badge {
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
  }
  .health-badge[data-health="excellent"] { color: var(--green); }
  .health-badge[data-health="good"] { color: var(--accent); }
  .health-badge[data-health="fair"] { color: var(--yellow); }
  .health-badge[data-health="weak"] { color: var(--muted); }

  .flame-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  .card-details {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .card-title {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--text);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
  }

  .size-pill {
    font-weight: 800;
    color: var(--text);
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .download-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 7px;
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%);
    border: 1px solid rgba(0, 242, 254, 0.35);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .download-btn:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.32) 0%, rgba(79, 172, 254, 0.32) 100%);
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.4);
  }
  .download-btn svg {
    width: 13px;
    height: 13px;
  }

  .copy-btn {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .copy-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }
  .copy-btn svg {
    width: 13px;
    height: 13px;
  }

  /* List Table View */
  .results-list-table {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .table-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    transition: all 0.15s ease;
  }
  .table-row:hover {
    background: var(--surface-2);
    border-color: var(--border-hover);
  }

  .row-icon-cell {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(0, 242, 254, 0.1);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .row-icon-cell svg {
    width: 15px;
    height: 15px;
  }

  .row-title-cell {
    flex: 1;
    min-width: 0;
  }

  .row-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .source-tag {
    font-weight: 800;
    color: var(--accent);
  }

  .row-seeds-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 11px;
    font-weight: 700;
    width: 70px;
  }
  .seeders-num { color: var(--green); }
  .leechers-num { color: var(--muted); }

  .row-actions-cell {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .table-stream-btn {
    padding: 4px 10px;
    border-radius: 6px;
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%);
    border: 1px solid rgba(0, 242, 254, 0.35);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .table-stream-btn:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.3) 0%, rgba(79, 172, 254, 0.3) 100%);
  }

  .table-copy-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .table-copy-btn svg {
    width: 13px;
    height: 13px;
  }

  /* Searching / Empty States */
  .searching-state, .search-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 24px;
    margin: 40px auto;
    max-width: 440px;
  }

  .radar-box, .empty-halo {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%);
    border: 1px solid rgba(0, 242, 254, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: var(--accent);
  }
  .radar-icon, .empty-halo svg {
    width: 28px;
    height: 28px;
  }

  .radar-scan {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid var(--accent);
    opacity: 0.7;
    animation: pingRadar 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  .search-title, .empty-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 6px;
  }

  .search-desc, .empty-desc {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pingRadar {
    75%, 100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }
</style>
