<script>
  import { onMount, tick } from 'svelte';
  import Plyr from 'plyr';

  const BYTE_GB = 1073741824;
  const BYTE_MB = 1048576;
  const BYTE_KB = 1024;
  const categories = [
    ['all', 'All'],
    ['movies', 'Movies'],
    ['tv', 'TV'],
    ['music', 'Music'],
    ['software', 'Software']
  ];
  const sortModes = [
    ['seeders', 'Seeders'],
    ['size', 'Size'],
    ['name', 'Name']
  ];
  const sources = ['YTS', 'Nyaa', 'LimeTorrents', 'TorrentDownloads'];
  const sourceLabels = { LimeTorrents: 'Lime', TorrentDownloads: 'TorrentDL' };

  let query = '';
  let allResults = [];
  let activeTorrents = [];
  let category = 'all';
  let sortMode = 'seeders';
  let enabledSources = [...sources];
  let searchHistory = [];
  let showHistoryMenu = false;
  let isSearching = false;
  let searchError = '';
  let message = 'No active peer connections.';
  let platform = '';
  let isDarkMode = false;
  let videoVisible = false;
  let playerEl;
  let player;

  $: filteredResults = getFilteredResults(allResults, enabledSources, category, sortMode);
  $: hasResults = filteredResults.length > 0;

  function getApi() {
    return window.api || {};
  }

  function getFilteredResults(results, enabled, selectedCategory, selectedSort) {
    const enabledSet = new Set(enabled);
    const filtered = results
      .filter((torrent) => enabledSet.has(torrent.source))
      .filter((torrent) => selectedCategory === 'all' || torrent.category === selectedCategory || torrent.category === 'mixed');

    return filtered.sort((a, b) => {
      if (selectedSort === 'seeders') return (b.seeders || 0) - (a.seeders || 0);
      if (selectedSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (selectedSort === 'size') return parseSize(b.size) - parseSize(a.size);
      return 0;
    });
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

  function initiatePayload(magnet) {
    getApi().addTorrent?.(magnet);
  }

  async function copyMagnet(magnet) {
    await navigator.clipboard.writeText(magnet);
  }

  function openTorrent(torrent) {
    getApi().openTorrent?.(torrent);
  }

  function showTorrentOptions(event, torrent) {
    event.preventDefault();
    getApi().showTorrentOptions?.(torrent, { x: event.clientX, y: event.clientY });
  }

  function showAppOptions(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    getApi().showAppOptions?.({ x: rect.x, y: rect.y });
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

  function getResultIcon(result) {
    const name = (result.name || '').toLowerCase();
    if (['movies', 'tv', 'anime'].includes(result.category) || name.includes('.mp4') || name.includes('1080p') || name.includes('720p')) return 'video';
    if (result.category === 'software' || name.includes('.exe') || name.includes('crack') || name.includes('patch') || name.includes('vst')) return 'program';
    if (result.category === 'music' || name.includes('flac') || name.includes('mp3')) return 'audio';
    if (name.includes('.zip') || name.includes('.iso')) return 'archive';
    return 'file';
  }

  function torrentClass(torrent) {
    const hasMetadata = torrent.name && Number(torrent.length) > 0;
    if (torrent.error && hasMetadata) return 'error';
    if (torrent.paused) return 'stopped';
    if (torrent.done) return 'downloaded';
    return 'downloading';
  }

  function torrentStatus(torrent) {
    const hasMetadata = torrent.name && Number(torrent.length) > 0;
    const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0));
    const completionRatio = (progress * 100).toFixed(1);

    if (torrent.error && hasMetadata) return `Fatal Error: ${torrent.error}`;
    if (torrent.paused) {
      return torrent.done
        ? `Status: Seed Paused | Payload: ${formatDataSize(Number(torrent.length) || 0)}`
        : `Status: Inactive | Progress: ${completionRatio}%`;
    }
    if (torrent.done) {
      const ratio = ((torrent.uploaded || 0) / (torrent.length || 1)).toFixed(2);
      return `Status: Seeding | Ratio: ${ratio} | UL: ${formatDataSize(torrent.uploadSpeed || 0)}/s | Payload: ${formatDataSize(Number(torrent.length) || 0)}`;
    }
    if (!hasMetadata) return 'Handshaking with DHT... (Establishing connections)';

    const timeRemaining = typeof torrent.timeRemaining === 'number' && torrent.timeRemaining > 1000
      ? torrent.timeRemaining
      : typeof torrent.timeRemaining === 'number'
        ? torrent.timeRemaining * 1000
        : undefined;
    return `DL: ${formatDataSize(torrent.downloadSpeed || 0)}/s | Progress: ${completionRatio}% | ETR: ${calculateTimeRemaining(timeRemaining)}`;
  }

  function startStream(streamUrl, mimeType) {
    if (!streamUrl || !playerEl) return;
    videoVisible = true;
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
    const api = getApi();

    api.onPlatform?.(({ osPlatform, isDarkMode: dark }) => {
      platform = osPlatform || '';
      isDarkMode = !!dark;
      document.body.classList.toggle('dark', isDarkMode);
      if (platform) document.body.classList.add(platform);
      document.body.classList.remove('hidden');
    });
    api.onStartPlyrStream?.(({ streamUrl, mimeType }) => {
      tick().then(() => startStream(streamUrl, mimeType));
    });
    api.onUpdateTorrents?.((torrents) => {
      activeTorrents = Array.isArray(torrents) ? torrents : [];
      if (activeTorrents.length) message = '';
    });
    api.onRemoveTorrent?.((infoHash) => {
      activeTorrents = activeTorrents.filter((torrent) => torrent.infoHash !== infoHash);
    });
    api.onAddingTorrent?.(() => {
      message = 'Connecting to peer swarm... Accessing piece map.';
    });

    return () => {
      if (player) player.destroy();
    };
  });
</script>

<div class="header">
  <div class="header-content">
    <div class="logo-section">
      <img src="icon.png" alt="HeapSeed Logo" class="logo-icon">
      <div class="logo-text">
        <h1>HeapSeed Engine</h1>
        <p>Wired to HeapSearch Core</p>
      </div>
    </div>

    <div class="window-controls">
      <button class="control-btn" type="button" title="System Options" on:click={showAppOptions}>...</button>
      <button class="control-btn" type="button" title="Target Directory" on:click={() => getApi().openDownloadsFolder?.()}>↓</button>
      <button class="control-btn" type="button" title="Minimize" on:click={() => getApi().minimize?.()}>-</button>
      <button class="control-btn" type="button" title="Maximize" on:click={() => getApi().maximize?.()}>□</button>
      <button class="control-btn close" type="button" title="Close" on:click={() => getApi().closeWindow?.()}>×</button>
    </div>
  </div>
</div>

<main class="container">
  <div class="engine-split">
    <section class="search-column">
      <div class="search-box">
        <div class="search-input-wrapper">
          <div class="search-input-container">
            <span class="search-icon">⌕</span>
            <input
              class="search-input"
              type="text"
              bind:value={query}
              placeholder="Search parameters or URI..."
              on:focus={() => showHistoryMenu = searchHistory.length > 0}
              on:blur={() => setTimeout(() => showHistoryMenu = false, 160)}
              on:keydown={(event) => event.key === 'Enter' && handleSearch()}
            >
            {#if showHistoryMenu}
              <div class="history-dropdown">
                {#each searchHistory as item}
                  <button class="history-item" type="button" on:mousedown|preventDefault={() => selectHistoryItem(item)}>{item}</button>
                {/each}
                <button class="history-clear" type="button" on:mousedown|preventDefault={clearHistory}>Clear Cache</button>
              </div>
            {/if}
          </div>
          <button class="search-btn" type="button" disabled={isSearching} on:click={handleSearch}>{isSearching ? 'Scanning...' : 'Engage'}</button>
          <button class="reset-btn" type="button" on:click={resetSearch}>Reset</button>
        </div>

        <div class="categories">
          {#each categories as [value, label]}
            <button class:active={category === value} class="category-btn" type="button" on:click={() => category = value}>{label}</button>
          {/each}
        </div>

        <div class="sort-options">
          <span class="sort-label">Sort:</span>
          {#each sortModes as [value, label]}
            <button class:active={sortMode === value} class="sort-btn" type="button" on:click={() => sortMode = value}>{label}</button>
          {/each}
        </div>

        <div class="source-options">
          <span class="sort-label">Sources:</span>
          {#each sources as source}
            <label class="source-checkbox">
              <input type="checkbox" checked={enabledSources.includes(source)} on:change={() => toggleSource(source)}>
              <span>{sourceLabels[source] || source}</span>
            </label>
          {/each}
        </div>
      </div>

      <div id="resultsContainer">
        {#if isSearching}
          <div class="empty-state"><p class="empty-text">Resolving metadata across nodes...</p></div>
        {:else if searchError}
          <div class="empty-state"><p class="empty-text error-text">Node Error: {searchError}</p></div>
        {:else if hasResults}
          {#each filteredResults as result}
            <article class="result-item">
              <div class="result-content">
                <div class="result-info">
                  <div class="result-title"><span class="type-icon">{getResultIcon(result)}</span>{result.name}</div>
                  <div class="result-meta">
                    <span><span class="dot green"></span>{result.seeders || 0}</span>
                    <span><span class="dot red"></span>{result.leechers || 0}</span>
                    <span>{result.size || 'N/A'}</span>
                    <span class="source-pill">{result.source}</span>
                  </div>
                </div>
                <div class="btn-group">
                  <button class="action-btn btn-init" type="button" on:click={() => initiatePayload(result.magnetLink)}>Initialize</button>
                  <button class="action-btn btn-magnet" type="button" on:click={() => copyMagnet(result.magnetLink)}>Copy URI</button>
                </div>
              </div>
            </article>
          {/each}
        {:else}
          <div class="empty-state">
            <div class="empty-icon">signal</div>
            <h3 class="empty-title">Awaiting Input</h3>
            <p class="empty-text">Systems nominal. Ready to scan distributed nodes.</p>
          </div>
        {/if}
      </div>
    </section>

    <aside class="monitor-column">
      <div id="video-container" class:hidden={!videoVisible}>
        <video bind:this={playerEl} id="player" playsinline controls crossorigin="anonymous"></video>
      </div>

      <div class="monitor-card">
        <div class="monitor-header">Active Operations</div>
        {#if message || activeTorrents.length === 0}
          <div class="empty-state" id="message">
            <p class="empty-text">{message || 'No active peer connections.'}</p>
          </div>
        {/if}
        <ul id="torrent-list">
          {#each activeTorrents as torrent (torrent.infoHash)}
            {@const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0))}
            <li class="torrent {torrentClass(torrent)}">
              <button
                class="torrent-row"
                type="button"
                on:dblclick={() => openTorrent(torrent)}
                on:contextmenu={(event) => showTorrentOptions(event, torrent)}
                on:keydown={(event) => event.key === 'Enter' && openTorrent(torrent)}
              >
                <span class="torrent-name">{torrent.name || 'Resolving Metadata Pool...'}</span>
                <span class="torrent-meta">{torrentStatus(torrent)}</span>
                <span class="progress-bar-bg"><span class="progress-bar-fill" style={`width: ${progress * 100}%`}></span></span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </aside>
  </div>
</main>
