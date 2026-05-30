<script>
  let {
    query = $bindable(),
    showHistoryMenu = $bindable(),
    searchHistory,
    isSearching,
    category = $bindable(),
    sortMode = $bindable(),
    enabledSources = $bindable(),
    categories,
    sortModes,
    sources,
    sourceLabels,
    filteredResults,
    searchError,
    handleSearch,
    selectHistoryItem,
    clearHistory,
    pasteFromClipboard,
    resetSearch,
    toggleSource,
    getResultType,
    initiatePayload,
    copyMagnet
  } = $props();
</script>

<section class="search-pane glass-panel">
  <!-- Search Command Bar -->
  <div class="command-bar">
    <div class="input-wrap">
      <span class="input-label">Search / Magnet URI / Torrent File URL</span>
      <div class="search-input-container">
        <svg class="search-field-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
        <input
          type="text"
          bind:value={query}
          placeholder="Enter query, hash, magnet link, or .torrent URL..."
          on:focus={() => showHistoryMenu = searchHistory.length > 0}
          on:blur={() => setTimeout(() => showHistoryMenu = false, 200)}
          on:keydown={(event) => event.key === 'Enter' && handleSearch()}
          class="premium-input"
        >
      </div>
      {#if showHistoryMenu}
        <div class="history-dropdown dropdown-glow animate-fade-in">
          <div class="dropdown-header">Recent Searches</div>
          {#each searchHistory as item}
            <button 
              type="button" 
              on:mousedown|preventDefault={() => selectHistoryItem(item)}
              class="dropdown-item history-item"
            >
              <svg class="history-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89l.07.14L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9zm-1 5v5l4.28 2.54l.72-1.21l-3.5-2.08V8H12z"/></svg>
              <span>{item}</span>
            </button>
          {/each}
          <button class="clear-history dropdown-item" type="button" on:mousedown|preventDefault={clearHistory}>
            <svg class="clear-history-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9z"/></svg>
            Clear Search History
          </button>
        </div>
      {/if}
    </div>

    <div class="action-buttons-group">
      <button 
        class="primary-btn search-submit-btn" 
        type="button" 
        disabled={isSearching} 
        on:click={handleSearch}
      >
        {#if isSearching}
          <span class="spinner-inline"></span> Searching...
        {:else}
          Search
        {/if}
      </button>
      <button class="secondary-btn" type="button" on:click={pasteFromClipboard} title="Paste from Clipboard">Paste</button>
      <button class="secondary-btn" type="button" on:click={resetSearch} title="Reset query and results">Reset</button>
    </div>
  </div>

  <!-- Filters Segmented Stripe -->
  <div class="filter-strip">
    <div class="filter-group">
      <span class="filter-strip-label">Categories</span>
      <div class="segmented-control">
        {#each categories as item}
          <button 
            class:active={category === item.value} 
            type="button" 
            on:click={() => category = item.value}
          >
            {item.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-strip-label">Sort Order</span>
      <div class="segmented-control compact">
        {#each sortModes as item}
          <button 
            class:active={sortMode === item.value} 
            type="button" 
            on:click={() => sortMode = item.value}
          >
            {item.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Sources Pill Checkboxes -->
  <div class="source-strip">
    <span class="source-strip-label">Engines</span>
    <div class="sources-pill-box">
      {#each sources as source}
        <button 
          class="source-pill-btn" 
          class:active={enabledSources.includes(source)} 
          type="button"
          on:click={() => toggleSource(source)}
        >
          <span class="pill-indicator"></span>
          <span>{sourceLabels[source] || source}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Results Overview Header -->
  <div class="results-head">
    <div class="results-count-block">
      <span class="results-number">{filteredResults.length}</span>
      <span class="results-label">{filteredResults.length === 1 ? 'matching result' : 'matching results'}</span>
    </div>
    <div class="results-status-block">
      {#if searchError}
        <p class="inline-error-badge">
          <svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          {searchError}
        </p>
      {:else if isSearching}
        <p class="scanning-indicator-label">Scanning trackers and indexes...</p>
      {:else}
        <p class="ready-indicator-label">{query ? 'Filtered results.' : 'System standby.'}</p>
      {/if}
    </div>
  </div>

  <!-- Results List Container -->
  <div class="results-list">
    {#if isSearching}
      <div class="empty-state pulse-searching">
        <div class="empty-state-visual">
          <svg class="search-pulse-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg>
          <div class="scan-ring"></div>
        </div>
        <strong>Searching Scrapers</strong>
        <span>Querying enabled indexes. Metasearch results will stream in real-time.</span>
      </div>
    {:else if filteredResults.length}
      <div class="results-scroll-container">
        {#each filteredResults as result}
          {@const resultType = getResultType(result)}
          <article class="result-row card-glow-hover">
            <div class="type-badge-container" data-type={resultType}>
              <span class="type-badge">
                {#if resultType === 'video'}
                  <svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
                {:else if resultType === 'audio'}
                  <svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z"/></svg>
                {:else if resultType === 'app'}
                  <svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.5c0 .28-.22.5-.5.5h-11c-.28 0-.5-.22-.5-.5v-10c0-.28.22-.5.5-.5h11c.28 0 .5.22.5.5v10zM8 8h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z"/></svg>
                {:else if resultType === 'archive'}
                  <svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-4v-2h4v2zm0-3h-4v-2h4v2z"/></svg>
                {:else}
                  <svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                {/if}
              </span>
              <span class="type-text">{resultType}</span>
            </div>
            <div class="result-main">
              <h2>{result.name}</h2>
              <div class="result-meta">
                <span class="source-tag">{result.source}</span>
                <span class="meta-item size-tag"><svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 12H7v2h10v-2z"/></svg> {result.size || 'N/A'}</span>
                <span class="meta-item seeders-tag"><span class="dot-green"></span> {result.seeders || 0} seeders</span>
                <span class="meta-item leechers-tag"><span class="dot-red"></span> {result.leechers || 0} leechers</span>
              </div>
            </div>
            <div class="row-actions">
              <button 
                class="primary-btn small action-add-btn" 
                type="button" 
                on:click={() => initiatePayload(result.magnetLink)}
                title="Download via Magnet Link"
              >
                Download
              </button>
              <button 
                class="secondary-btn small action-copy-btn" 
                type="button" 
                on:click={() => copyMagnet(result.magnetLink)}
                title="Copy Magnet URI to Clipboard"
              >
                Copy Link
              </button>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-state-visual">
          <svg class="folder-empty-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
        </div>
        <strong>No Results Found</strong>
        <span>Scrapers returned zero matches. Refine your keywords or select other indexing providers.</span>
      </div>
    {/if}
  </div>
</section>
