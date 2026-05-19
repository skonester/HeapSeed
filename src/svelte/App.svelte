<script>
  import { onMount, tick } from 'svelte';
  import Plyr from 'plyr';

  const BYTE_GB = 1073741824;
  const BYTE_MB = 1048576;
  const BYTE_KB = 1024;

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'movies', label: 'Movies' },
    { value: 'tv', label: 'TV' },
    { value: 'music', label: 'Music' },
    { value: 'software', label: 'Software' }
  ];

  const sortModes = [
    { value: 'seeders', label: 'Seeders' },
    { value: 'size', label: 'Size' },
    { value: 'name', label: 'Name' }
  ];

  const sources = ['YTS', 'Nyaa', 'LimeTorrents', 'TorrentDownloads'];
  const sourceLabels = { LimeTorrents: 'Lime', TorrentDownloads: 'TorrentDL' };
  const themeModes = ['system', 'light', 'dark'];

  let query = '';
  let allResults = [];
  let activeTorrents = [];
  let category = 'all';
  let sortMode = 'seeders';
  let enabledSources = [...sources];
  let searchHistory = [];
  let showHistoryMenu = false;
  let showCommandMenu = false;
  let isSearching = false;
  let searchError = '';
  let message = 'No active peer connections.';
  let selectedInfoHash = '';
  let platform = '';
  let themeMode = 'system';
  let isDarkMode = true;
  let videoVisible = false;
  let playerEl;
  let player;

  $: effectiveTheme = themeMode === 'system' ? (isDarkMode ? 'dark' : 'light') : themeMode;
  $: filteredResults = getFilteredResults(allResults, enabledSources, category, sortMode);
  $: selectedTorrent = activeTorrents.find((torrent) => torrent.infoHash === selectedInfoHash) || activeTorrents[0] || null;
  $: transferStats = getTransferStats(activeTorrents);
  $: if (activeTorrents.length && !selectedInfoHash) selectedInfoHash = activeTorrents[0].infoHash;

  function getApi() {
    return window.api || {};
  }

  function getFilteredResults(results, enabled, selectedCategory, selectedSort) {
    const enabledSet = new Set(enabled);
    const filtered = results
      .filter((torrent) => enabledSet.has(torrent.source))
      .filter((torrent) => selectedCategory === 'all' || torrent.category === selectedCategory || torrent.category === 'mixed');

    return [...filtered].sort((a, b) => {
      if (selectedSort === 'seeders') return (b.seeders || 0) - (a.seeders || 0);
      if (selectedSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (selectedSort === 'size') return parseSize(b.size) - parseSize(a.size);
      return 0;
    });
  }

  function getTransferStats(torrents) {
    return torrents.reduce((stats, torrent) => {
      const downloading = !torrent.paused && !torrent.done;
      const seeding = !torrent.paused && torrent.done;
      return {
        count: stats.count + 1,
        downloading: stats.downloading + (downloading ? 1 : 0),
        seeding: stats.seeding + (seeding ? 1 : 0),
        downSpeed: stats.downSpeed + (Number(torrent.downloadSpeed) || 0),
        upSpeed: stats.upSpeed + (Number(torrent.uploadSpeed) || 0),
        peers: stats.peers + (Number(torrent.numPeers) || 0)
      };
    }, { count: 0, downloading: 0, seeding: 0, downSpeed: 0, upSpeed: 0, peers: 0 });
  }

  function loadHistory() {
    try {
      searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
      searchHistory = [];
    }
  }

  function saveToHistory(value) {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('magnet:')) return;
    searchHistory = [trimmed, ...searchHistory.filter((item) => item !== trimmed)].slice(0, 15);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }

  function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    showHistoryMenu = false;
  }

  function selectHistoryItem(item) {
    query = item;
    showHistoryMenu = false;
    handleSearch();
  }

  async function handleSearch() {
    const input = query.trim();
    if (!input) return;

    if (input.startsWith('magnet:') || (input.startsWith('http') && input.includes('.torrent'))) {
      getApi().addTorrent?.(input);
      query = '';
      message = 'Adding torrent from URI...';
      return;
    }

    saveToHistory(input);
    isSearching = true;
    searchError = '';

    try {
      const result = await getApi().searchTorrents?.(input, category);
      if (result?.success) {
        allResults = result.torrents || [];
      } else {
        allResults = [];
        searchError = result?.error || 'Unknown search backend failure';
      }
    } catch (err) {
      allResults = [];
      searchError = err?.message || 'Fatal IPC communication error';
    } finally {
      isSearching = false;
    }
  }

  function resetSearch() {
    query = '';
    allResults = [];
    searchError = '';
  }

  function toggleSource(source) {
    enabledSources = enabledSources.includes(source)
      ? enabledSources.filter((item) => item !== source)
      : [...enabledSources, source];
  }

  function setTheme(mode) {
    themeMode = mode;
    getApi().setAppearance?.(mode);
    applyThemeClasses(mode);
  }

  function getEffectiveTheme(mode = themeMode) {
    return mode === 'system' ? (isDarkMode ? 'dark' : 'light') : mode;
  }

  function applyThemeClasses(mode = themeMode) {
    const theme = getEffectiveTheme(mode);
    document.body.dataset.theme = theme;
    document.body.dataset.themeMode = mode;
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    if (platform) document.body.classList.add(platform);
  }

  function showNativeAppOptions(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    getApi().showAppOptions?.({ x: rect.x, y: rect.bottom });
    showCommandMenu = false;
  }

  function openDownloads() {
    getApi().openDownloadsFolder?.();
    showCommandMenu = false;
  }

  function pasteFromClipboard() {
    const text = getApi().readClipboard?.()?.trim();
    if (!text) return;
    query = text;
    showCommandMenu = false;
  }

  function initiatePayload(magnet) {
    getApi().addTorrent?.(magnet);
    message = 'Adding selected payload...';
  }

  async function copyMagnet(magnet) {
    await navigator.clipboard.writeText(magnet);
  }

  function openTorrent(torrent) {
    if (torrent) getApi().openTorrent?.(torrent);
  }

  function patchTorrent(infoHash, updates) {
    if (!infoHash) return;
    activeTorrents = activeTorrents.map((torrent) => (
      torrent.infoHash === infoHash ? { ...torrent, ...updates } : torrent
    ));
  }

  function showTorrentOptions(event, torrent) {
    event.preventDefault();
    selectedInfoHash = torrent.infoHash;
    getApi().showTorrentOptions?.(torrent, { x: event.clientX, y: event.clientY });
  }

  function parseSize(size) {
    if (!size) return 0;
    const units = { B: 1, KB: BYTE_KB, MB: BYTE_MB, GB: BYTE_GB, TB: 1099511627776 };
    const match = String(size).match(/([0-9.]+)\s*([A-Z]+)/i);
    return match ? parseFloat(match[1]) * (units[match[2].toUpperCase()] || 0) : 0;
  }

  function formatDataSize(bytes) {
    const n = Number(bytes) || 0;
    if (n >= BYTE_GB) return (n / BYTE_GB).toFixed(2) + ' GiB';
    if (n >= BYTE_MB) return (n / BYTE_MB).toFixed(2) + ' MiB';
    if (n >= BYTE_KB) return (n / BYTE_KB).toFixed(2) + ' KiB';
    return n + ' B';
  }

  function calculateTimeRemaining(ms) {
    if (ms === undefined || ms === null || ms === Infinity) return '---';
    const totalSeconds = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getResultType(result) {
    const name = (result.name || '').toLowerCase();
    if (['movies', 'tv', 'anime'].includes(result.category) || name.includes('.mp4') || name.includes('1080p') || name.includes('720p')) return 'video';
    if (result.category === 'software' || name.includes('.exe') || name.includes('crack') || name.includes('patch') || name.includes('vst')) return 'app';
    if (result.category === 'music' || name.includes('flac') || name.includes('mp3')) return 'audio';
    if (name.includes('.zip') || name.includes('.iso')) return 'archive';
    return 'file';
  }

  function torrentTone(torrent) {
    const hasMetadata = torrent.name && Number(torrent.length) > 0;
    if (torrent.error && hasMetadata) return 'error';
    if (torrent.paused) return 'paused';
    if (torrent.done) return 'seed';
    return 'active';
  }

  function torrentStatus(torrent) {
    const hasMetadata = torrent.name && Number(torrent.length) > 0;
    const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0));
    const completionRatio = (progress * 100).toFixed(1);

    if (torrent.error && hasMetadata) return `Missing target: ${torrent.error}`;
    if (torrent.paused) return torrent.done ? 'Seeding paused' : `Paused at ${completionRatio}%`;
    if (torrent.done) return 'Seeding';
    if (!hasMetadata) return 'Resolving metadata';
    return `Downloading ${completionRatio}%`;
  }

  function torrentDetail(torrent) {
    const hasMetadata = torrent.name && Number(torrent.length) > 0;
    if (!hasMetadata) return 'Waiting for swarm metadata and peer discovery.';
    if (torrent.done) {
      const ratio = ((torrent.uploaded || 0) / (torrent.length || 1)).toFixed(2);
      return `Ratio ${ratio} | Upload ${formatDataSize(torrent.uploadSpeed || 0)}/s | ${formatDataSize(torrent.length || 0)}`;
    }
    const timeRemaining = typeof torrent.timeRemaining === 'number' && torrent.timeRemaining > 1000
      ? torrent.timeRemaining
      : typeof torrent.timeRemaining === 'number'
        ? torrent.timeRemaining * 1000
        : undefined;
    return `${formatDataSize(torrent.downloadSpeed || 0)}/s down | ${torrent.numPeers || 0} peers | ETR ${calculateTimeRemaining(timeRemaining)}`;
  }

  function startStream(streamUrl, mimeType) {
    if (!streamUrl || !playerEl) return;
    player ||= new Plyr(playerEl, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'],
      settings: ['quality', 'speed'],
      tooltips: { controls: true, seek: true },
      displayDuration: true
    });
    player.source = { type: 'video', sources: [{ src: streamUrl, type: mimeType || 'video/mp4' }] };
    player.play().catch(() => {});
  }

  onMount(() => {
    loadHistory();
    applyThemeClasses();
    const api = getApi();

    api.onPlatform?.(({ osPlatform, isDarkMode: dark, appearance }) => {
      platform = osPlatform || '';
      isDarkMode = !!dark;
      if (appearance) themeMode = appearance;
      applyThemeClasses();
    });
    api.onStartPlyrStream?.(({ streamUrl, mimeType }) => {
      videoVisible = true;
      tick().then(() => startStream(streamUrl, mimeType));
    });
    api.onUpdateTorrents?.((torrents) => {
      activeTorrents = Array.isArray(torrents) ? torrents : [];
      if (activeTorrents.length) message = '';
      if (selectedInfoHash && !activeTorrents.some((torrent) => torrent.infoHash === selectedInfoHash)) {
        selectedInfoHash = activeTorrents[0]?.infoHash || '';
      }
    });
    api.onRemoveTorrent?.((infoHash) => {
      activeTorrents = activeTorrents.filter((torrent) => torrent.infoHash !== infoHash);
      if (selectedInfoHash === infoHash) selectedInfoHash = activeTorrents[0]?.infoHash || '';
    });
    api.onAddingTorrent?.(() => {
      message = 'Connecting to peer swarm...';
    });
    api.onOptionsClosed?.(() => {
      showCommandMenu = false;
    });
    api.onTorrentError?.(({ infoHash, error }) => {
      message = error || 'Torrent failed.';
      patchTorrent(infoHash, { error: error || 'Torrent failed' });
    });
    api.onPauseTorrent?.((infoHash) => {
      patchTorrent(infoHash, { paused: true });
    });
    api.onResumeTorrent?.((infoHash) => {
      patchTorrent(infoHash, { paused: false });
    });
    api.onTorrentDone?.(({ infoHash, length }) => {
      patchTorrent(infoHash, { done: true, progress: 1, length });
      message = 'Transfer complete.';
    });

    return () => {
      if (player) player.destroy();
    };
  });
</script>

<svelte:head>
  <title>HeapSeed</title>
</svelte:head>

<div class="app-shell" data-theme={effectiveTheme}>
  <header class="topbar">
    <div class="brand-block">
      <img src="icon.png" alt="HeapSeed" class="brand-icon">
      <div>
        <h1>HeapSeed Engine</h1>
        <p>{transferStats.count} transfers · {formatDataSize(transferStats.downSpeed)}/s down · {transferStats.peers} peers</p>
      </div>
    </div>

    <div class="top-actions">
      <div class="theme-switch" aria-label="Theme">
        {#each themeModes as mode}
          <button class:active={themeMode === mode} type="button" on:click={() => setTheme(mode)}>{mode}</button>
        {/each}
      </div>

      <div class="menu-anchor">
        <button class="titlebar-btn" class:active={showCommandMenu} type="button" title="App menu" aria-label="App menu" on:click={() => showCommandMenu = !showCommandMenu}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.25h10v1.5H3zm0 3h10v1.5H3zm0 3h10v1.5H3z"/></svg>
        </button>
        {#if showCommandMenu}
          <div class="command-menu">
            <button type="button" on:click={pasteFromClipboard}>Paste into search</button>
            <button type="button" on:click={openDownloads}>Open downloads folder</button>
            <button type="button" on:click={showNativeAppOptions}>Native app options</button>
            <div class="menu-section">
              <span>Appearance</span>
              {#each themeModes as mode}
                <button class:active={themeMode === mode} type="button" on:click={() => setTheme(mode)}>{mode}</button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <button class="titlebar-btn" type="button" title="Minimize" aria-label="Minimize" on:click={() => getApi().minimize?.()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10v1.5H3z"/></svg>
      </button>
      <button class="titlebar-btn" type="button" title="Maximize" aria-label="Maximize" on:click={() => getApi().maximize?.()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4h8v8H4zm1.5 1.5v5h5v-5z"/></svg>
      </button>
      <button class="titlebar-btn danger" type="button" title="Close" aria-label="Close" on:click={() => getApi().closeWindow?.()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.2 3.2 3.8 3.75 3.8-3.75 1 1.05L9.05 8l3.75 3.75-1 1.05L8 9.05 4.2 12.8l-1-1.05L6.95 8 3.2 4.25z"/></svg>
      </button>
    </div>
  </header>

  <main class="workspace">
    <section class="search-pane">
      <div class="command-bar">
        <div class="input-wrap">
          <span class="input-label">Search or magnet URI</span>
          <input
            type="text"
            bind:value={query}
            placeholder="Movie, release, hash, magnet link, or .torrent URL"
            on:focus={() => showHistoryMenu = searchHistory.length > 0}
            on:blur={() => setTimeout(() => showHistoryMenu = false, 160)}
            on:keydown={(event) => event.key === 'Enter' && handleSearch()}
          >
          {#if showHistoryMenu}
            <div class="history-dropdown">
              {#each searchHistory as item}
                <button type="button" on:mousedown|preventDefault={() => selectHistoryItem(item)}>{item}</button>
              {/each}
              <button class="clear-history" type="button" on:mousedown|preventDefault={clearHistory}>Clear history</button>
            </div>
          {/if}
        </div>

        <button class="primary-btn" type="button" disabled={isSearching} on:click={handleSearch}>{isSearching ? 'Searching' : 'Search'}</button>
        <button class="secondary-btn" type="button" on:click={pasteFromClipboard}>Paste</button>
        <button class="secondary-btn" type="button" on:click={resetSearch}>Reset</button>
      </div>

      <div class="filter-strip">
        <div class="segmented">
          {#each categories as item}
            <button class:active={category === item.value} type="button" on:click={() => category = item.value}>{item.label}</button>
          {/each}
        </div>
        <div class="segmented compact">
          {#each sortModes as item}
            <button class:active={sortMode === item.value} type="button" on:click={() => sortMode = item.value}>{item.label}</button>
          {/each}
        </div>
      </div>

      <div class="source-strip">
        {#each sources as source}
          <label class:muted={!enabledSources.includes(source)}>
            <input type="checkbox" checked={enabledSources.includes(source)} on:change={() => toggleSource(source)}>
            <span>{sourceLabels[source] || source}</span>
          </label>
        {/each}
      </div>

      <div class="results-head">
        <div>
          <strong>{filteredResults.length}</strong>
          <span>{filteredResults.length === 1 ? 'result' : 'results'}</span>
        </div>
        {#if searchError}
          <p class="inline-error">{searchError}</p>
        {:else if isSearching}
          <p>Scanning providers...</p>
        {:else}
          <p>{query ? 'Filtered and ready.' : 'Ready for a search or direct torrent URI.'}</p>
        {/if}
      </div>

      <div class="results-list">
        {#if isSearching}
          <div class="empty-state">
            <strong>Searching providers</strong>
            <span>Results will stream into this surface once the backend returns.</span>
          </div>
        {:else if filteredResults.length}
          {#each filteredResults as result}
            <article class="result-row">
              <div class="type-badge">{getResultType(result)}</div>
              <div class="result-main">
                <h2>{result.name}</h2>
                <div class="result-meta">
                  <span>{result.source}</span>
                  <span>{result.size || 'N/A'}</span>
                  <span>{result.seeders || 0} seeders</span>
                  <span>{result.leechers || 0} leechers</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="primary-btn small" type="button" on:click={() => initiatePayload(result.magnetLink)}>Add</button>
                <button class="secondary-btn small" type="button" on:click={() => copyMagnet(result.magnetLink)}>Copy</button>
              </div>
            </article>
          {/each}
        {:else}
          <div class="empty-state">
            <strong>Nothing queued in search</strong>
            <span>Use the command bar above to scan sources or paste a torrent identifier directly.</span>
          </div>
        {/if}
      </div>
    </section>

    <aside class="activity-pane">
      <section class:active={videoVisible} class="player-panel">
        <video bind:this={playerEl} id="player" playsinline controls crossorigin="anonymous"></video>
        {#if !videoVisible}
          <div class="player-empty">
            <span>Player ready</span>
            <strong>{selectedTorrent?.name || 'Select a transfer to stream'}</strong>
            <button class="primary-btn small" type="button" disabled={!selectedTorrent} on:click={() => openTorrent(selectedTorrent)}>Open or stream selected</button>
          </div>
        {/if}
      </section>

      <section class="stats-strip">
        <div><span>Active</span><strong>{transferStats.downloading}</strong></div>
        <div><span>Seeding</span><strong>{transferStats.seeding}</strong></div>
        <div><span>Upload</span><strong>{formatDataSize(transferStats.upSpeed)}/s</strong></div>
      </section>

      <section class="transfer-panel">
        <div class="panel-head">
          <h2>Transfers</h2>
          <button class="secondary-btn small" type="button" on:click={openDownloads}>Folder</button>
        </div>

        {#if message || activeTorrents.length === 0}
          <div class="status-message">{message || 'No active peer connections.'}</div>
        {/if}

        <ul class="transfer-list">
          {#each activeTorrents as torrent (torrent.infoHash)}
            {@const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0))}
            {@const tone = torrentTone(torrent)}
            <li class:current={selectedInfoHash === torrent.infoHash} data-tone={tone}>
              <button
                type="button"
                on:click={() => selectedInfoHash = torrent.infoHash}
                on:dblclick={() => openTorrent(torrent)}
                on:contextmenu={(event) => showTorrentOptions(event, torrent)}
              >
                <span class="transfer-top">
                  <strong>{torrent.name || 'Resolving metadata'}</strong>
                  <em>{torrentStatus(torrent)}</em>
                </span>
                <span class="transfer-detail">{torrentDetail(torrent)}</span>
                <span class="progress-track"><span style={`width: ${progress * 100}%`}></span></span>
              </button>
            </li>
          {/each}
        </ul>
      </section>

      <section class="details-panel">
        <h2>Selected</h2>
        {#if selectedTorrent}
          <strong>{selectedTorrent.name || 'Resolving metadata'}</strong>
          <dl>
            <div><dt>Status</dt><dd>{torrentStatus(selectedTorrent)}</dd></div>
            <div><dt>Size</dt><dd>{formatDataSize(selectedTorrent.length || 0)}</dd></div>
            <div><dt>Path</dt><dd>{selectedTorrent.path || 'Pending'}</dd></div>
          </dl>
          <button class="primary-btn" type="button" on:click={() => openTorrent(selectedTorrent)}>Open or stream</button>
        {:else}
          <p>No transfer selected.</p>
        {/if}
      </section>
    </aside>
  </main>
</div>
