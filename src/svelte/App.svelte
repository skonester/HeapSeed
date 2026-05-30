<script>
  import { onMount } from 'svelte';
  import Topbar from './components/Topbar.svelte';
  import SearchPane from './components/SearchPane.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import Player from './components/Player.svelte';


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
  let activeStream = { url: '', mime: '', version: 0 };

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
      activeStream = { url: streamUrl, mime: mimeType, version: activeStream.version + 1 };
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

    return () => {};
  });
</script>

<svelte:head>
  <title>HeapSeed</title>
</svelte:head>

<div class="app-shell" data-theme={effectiveTheme}>
  <Topbar
    {transferStats}
    {themeMode}
    {setTheme}
    {themeModes}
    bind:showCommandMenu
    {pasteFromClipboard}
    {openDownloads}
    {showNativeAppOptions}
    {getApi}
    {formatDataSize}
  />

  <main class="workspace">
    <SearchPane
      bind:query
      bind:showHistoryMenu
      {searchHistory}
      {isSearching}
      bind:category
      bind:sortMode
      bind:enabledSources
      {categories}
      {sortModes}
      {sources}
      {sourceLabels}
      {filteredResults}
      {searchError}
      {handleSearch}
      {selectHistoryItem}
      {clearHistory}
      {pasteFromClipboard}
      {resetSearch}
      {toggleSource}
      {getResultType}
      {initiatePayload}
      {copyMagnet}
    />

    <aside class="activity-pane">
      <Player
        bind:videoVisible
        {selectedTorrent}
        {openTorrent}
        {activeStream}
      />

      <Sidebar
        {transferStats}
        {activeTorrents}
        bind:selectedInfoHash
        {selectedTorrent}
        {message}
        {formatDataSize}
        {openDownloads}
        {openTorrent}
        {showTorrentOptions}
        {torrentTone}
        {torrentStatus}
        {torrentDetail}
      />
    </aside>
  </main>
</div>

