<script>
  import Sparkline from './Sparkline.svelte';
  import PieceVisualizer from './PieceVisualizer.svelte';

  let {
    transferStats = { count: 0, downloading: 0, seeding: 0, downSpeed: 0, upSpeed: 0, peers: 0 },
    activeTorrents = [],
    selectedTorrent = null,
    formatDataSize = (n) => `${n} B`,
    downSpeedHistory = [],
    upSpeedHistory = [],
    openTorrent = () => {}
  } = $props();

  const totalDownloaded = $derived.by(() => {
    return activeTorrents.reduce((acc, t) => acc + (t.downloaded || 0), 0);
  });

  const totalUploaded = $derived.by(() => {
    return activeTorrents.reduce((acc, t) => acc + (t.uploaded || 0), 0);
  });

  const aggregateRatio = $derived.by(() => {
    if (!totalDownloaded) return '0.00';
    return (totalUploaded / totalDownloaded).toFixed(2);
  });
</script>

<div class="telemetry-experience glass-panel">
  <!-- Top Metrics Cards Grid -->
  <div class="metrics-grid">
    <!-- Download Speed Card -->
    <div class="metric-card card-glow-hover">
      <div class="metric-top">
        <span class="metric-label">Download Bandwidth</span>
        <span class="metric-pill dl">↓ LIVE</span>
      </div>
      <div class="metric-value-row">
        <strong class="metric-large dl-text">{formatDataSize(transferStats.downSpeed)}/s</strong>
      </div>
      <div class="sparkline-large">
        <Sparkline data={downSpeedHistory} color="#00f2fe" width={240} height={40} strokeWidth={2} />
      </div>
      <div class="metric-footer">
        <span>Session: {formatDataSize(totalDownloaded)}</span>
      </div>
    </div>

    <!-- Upload Speed Card -->
    <div class="metric-card card-glow-hover">
      <div class="metric-top">
        <span class="metric-label">Upload Bandwidth</span>
        <span class="metric-pill ul">↑ LIVE</span>
      </div>
      <div class="metric-value-row">
        <strong class="metric-large ul-text">{formatDataSize(transferStats.upSpeed)}/s</strong>
      </div>
      <div class="sparkline-large">
        <Sparkline data={upSpeedHistory} color="#8b5cf6" width={240} height={40} strokeWidth={2} />
      </div>
      <div class="metric-footer">
        <span>Session: {formatDataSize(totalUploaded)}</span>
      </div>
    </div>

    <!-- Swarm Peers & Ratio Card -->
    <div class="metric-card card-glow-hover">
      <div class="metric-top">
        <span class="metric-label">Swarm Network</span>
        <span class="metric-pill peers">PEERS</span>
      </div>
      <div class="metric-value-row">
        <strong class="metric-large peers-text">{transferStats.peers}</strong>
        <span class="metric-unit">connected</span>
      </div>
      <div class="stat-progress-summary">
        <div class="summary-line">
          <span>Active Downloads</span>
          <strong>{transferStats.downloading}</strong>
        </div>
        <div class="summary-line">
          <span>Active Seeds</span>
          <strong>{transferStats.seeding}</strong>
        </div>
      </div>
      <div class="metric-footer">
        <span>Share Ratio: <strong class="text-accent">{aggregateRatio}</strong></span>
      </div>
    </div>
  </div>

  <!-- Real-Time Sequential Prioritization Deep-Dive -->
  <div class="telemetry-sections">
    <div class="section-left">
      <div class="feature-card glass-panel">
        <div class="feature-header">
          <div class="feature-badge">PROPRIETARY ARCHITECTURE</div>
          <h3 class="feature-title">Sequential Zero-Wait Streaming</h3>
          <p class="feature-desc">
            Unlike traditional BitTorrent clients that download pieces in rarest-first random order, HeapSeed selectively requests the initial and trailing <strong>MOOV atom metadata</strong>, followed by sequential video piece chunks directly piped to the HTML5 video engine.
          </p>
        </div>

        {#if selectedTorrent}
          <div class="active-piece-map-wrap">
            <span class="map-label">Progress Overview: <strong>{selectedTorrent.name}</strong></span>
            <PieceVisualizer
              progress={Number(selectedTorrent.progress) || 0}
              fileType={selectedTorrent.fileType || 'video'}
              isStreaming={!selectedTorrent.paused && !selectedTorrent.done}
              {formatDataSize}
              torrentLength={selectedTorrent.length || 0}
            />
          </div>
        {:else if activeTorrents.length > 0}
          <div class="active-piece-map-wrap">
            <span class="map-label">Progress Overview: <strong>{activeTorrents[0].name}</strong></span>
            <PieceVisualizer
              progress={Number(activeTorrents[0].progress) || 0}
              fileType={activeTorrents[0].fileType || 'video'}
              isStreaming={!activeTorrents[0].paused && !activeTorrents[0].done}
              {formatDataSize}
              torrentLength={activeTorrents[0].length || 0}
            />
          </div>
        {/if}
      </div>
    </div>

    <!-- Active Swarms Table -->
    <div class="section-right">
      <div class="swarms-table-card glass-panel">
        <div class="table-header">
          <h4 class="table-title">Active Swarm Distribution</h4>
          <span class="table-count">{activeTorrents.length} items</span>
        </div>

        <div class="swarms-list">
          {#if activeTorrents.length > 0}
            {#each activeTorrents as torrent}
              {@const progress = Math.max(0, Math.min(1, Number(torrent.progress) || 0))}
              <div class="swarm-row">
                <div class="swarm-info">
                  <strong class="swarm-name" title={torrent.name}>{torrent.name || 'Resolving...'}</strong>
                  <div class="swarm-rates">
                    <span class="rate-dl">↓ {formatDataSize(torrent.downloadSpeed || 0)}/s</span>
                    <span class="rate-ul">↑ {formatDataSize(torrent.uploadSpeed || 0)}/s</span>
                    <span class="peers-cnt">{torrent.numPeers || 0} peers</span>
                  </div>
                </div>
                <div class="swarm-prog">
                  <div class="mini-prog-track">
                    <div class="mini-prog-fill" style="width: {progress * 100}%"></div>
                  </div>
                  <span class="prog-pct">{(progress * 100).toFixed(0)}%</span>
                </div>
              </div>
            {/each}
          {:else}
            <div class="empty-swarms">
              <p>No active torrent swarms currently connected.</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .telemetry-experience {
    height: 100%;
    width: 100%;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: transparent;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .metric-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .metric-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-pill {
    font-size: 9.5px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 12px;
  }
  .metric-pill.dl { background: rgba(0, 242, 254, 0.15); color: var(--accent); }
  .metric-pill.ul { background: rgba(139, 92, 246, 0.15); color: #a855f7; }
  .metric-pill.peers { background: rgba(59, 130, 246, 0.15); color: var(--blue); }

  .metric-value-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .metric-large {
    font-size: 24px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    font-family: 'Montserrat', sans-serif;
  }
  .dl-text { color: var(--accent); }
  .ul-text { color: #a855f7; }
  .peers-text { color: var(--text); }

  .metric-unit {
    font-size: 13px;
    color: var(--muted);
  }

  .sparkline-large {
    height: 40px;
    display: flex;
    align-items: center;
    margin: 4px 0;
  }

  .metric-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .stat-progress-summary {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 4px 0;
  }

  .summary-line {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
  }
  .summary-line strong {
    color: var(--text);
  }

  /* Telemetry Sections */
  .telemetry-sections {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
  }

  .feature-card, .swarms-table-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .feature-badge {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    border-radius: 4px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    color: #04121a;
    margin-bottom: 6px;
  }

  .feature-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 6px;
  }

  .feature-desc {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  .active-piece-map-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
  }

  .map-label {
    font-size: 12px;
    color: var(--muted);
  }
  .map-label strong {
    color: var(--text);
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .table-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--text);
    margin: 0;
  }

  .table-count {
    font-size: 11px;
    color: var(--muted);
  }

  .swarms-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .swarm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }

  .swarm-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .swarm-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .swarm-rates {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10.5px;
  }
  .rate-dl { color: var(--accent); }
  .rate-ul { color: #a855f7; }
  .peers-cnt { color: var(--muted); }

  .swarm-prog {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 90px;
  }

  .mini-prog-track {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .mini-prog-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
  }

  .prog-pct {
    font-size: 10.5px;
    font-weight: 800;
    color: var(--text);
    width: 28px;
    text-align: right;
  }

  .empty-swarms {
    padding: 30px 10px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }

  @media (max-width: 950px) {
    .telemetry-sections {
      grid-template-columns: 1fr;
    }
  }
</style>
