<script>
  let {
    progress = 0,
    fileType = 'video',
    numPieces = 64,
    isStreaming = false,
    formatDataSize = (n) => `${n} B`,
    torrentLength = 0
  } = $props();

  const totalBlocks = 64;
  const downloadedBlocks = $derived(Math.round(Math.max(0, Math.min(1, progress)) * totalBlocks));

  // Determine piece status for each block in the visualizer
  const blocks = $derived.by(() => {
    const list = [];
    const isVideo = fileType === 'video';
    
    for (let i = 0; i < totalBlocks; i++) {
      let state = 'pending'; // 'pending' | 'downloaded' | 'moov' | 'buffer'
      
      const isDownloaded = i < downloadedBlocks;
      const isMoovHead = isVideo && (i < 2);
      const isMoovTail = isVideo && (i >= totalBlocks - 2);
      const isStreamBuffer = isStreaming && isVideo && (i >= downloadedBlocks && i < downloadedBlocks + 4);

      if (isMoovHead || isMoovTail) {
        state = 'moov';
      } else if (isStreamBuffer) {
        state = 'buffer';
      } else if (isDownloaded) {
        state = 'downloaded';
      }

      list.push({ index: i, state });
    }
    return list;
  });

  const estimatedPieceSize = $derived.by(() => {
    if (!torrentLength) return '2.00 MiB';
    const bytes = torrentLength / totalBlocks;
    return formatDataSize(bytes);
  });
</script>

<div class="piece-visualizer glass-card">
  <div class="visualizer-header">
    <div class="header-left">
      <span class="visualizer-title">
        <svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z"/></svg>
        Illustrative Sequential Layout
      </span>
      <span class="stream-badge" class:active={isStreaming}>
        {isStreaming ? 'TRANSFER ACTIVE' : 'TRANSFER PROGRESS'}
      </span>
    </div>
    <div class="header-legend">
      <span class="legend-item"><span class="legend-dot moov"></span> Metadata Priority</span>
      <span class="legend-item"><span class="legend-dot buffer"></span> Buffer Strategy</span>
      <span class="legend-item"><span class="legend-dot done"></span> Progress Estimate</span>
      <span class="legend-item"><span class="legend-dot pending"></span> Remaining</span>
    </div>
  </div>

  <div class="piece-matrix">
    {#each blocks as block}
      <div 
        class="piece-block {block.state}"
        title={`Piece #${block.index + 1} · Status: ${block.state.toUpperCase()}`}
      ></div>
    {/each}
  </div>

  <div class="visualizer-footer">
    <span class="meta-label">Display Segment: <strong>~{estimatedPieceSize}</strong></span>
    <span class="meta-label">Download Progress: <strong class="text-accent">{Math.round(progress * 100)}%</strong></span>
    <span class="meta-label">Piece placement is illustrative.</span>
  </div>
</div>

<style>
  .piece-visualizer {
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: var(--glass-shadow);
  }

  .visualizer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .visualizer-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stream-badge {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 2px 7px;
    border-radius: 20px;
    background: rgba(0, 242, 254, 0.12);
    color: var(--accent);
    border: 1px solid rgba(0, 242, 254, 0.25);
  }

  .stream-badge.active {
    background: rgba(16, 185, 129, 0.15);
    color: var(--green);
    border-color: rgba(16, 185, 129, 0.3);
    animation: pulseGlow 1.8s infinite alternate;
  }

  .header-legend {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    color: var(--muted);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .legend-dot.moov { background: #00f2fe; box-shadow: 0 0 6px #00f2fe; }
  .legend-dot.buffer { background: #10b981; box-shadow: 0 0 6px #10b981; }
  .legend-dot.done { background: #3b82f6; }
  .legend-dot.pending { background: rgba(255, 255, 255, 0.12); }

  .piece-matrix {
    display: grid;
    grid-template-columns: repeat(32, 1fr);
    gap: 3px;
    padding: 6px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .piece-block {
    height: 12px;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  .piece-block.moov {
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    box-shadow: 0 0 4px rgba(0, 242, 254, 0.5);
  }

  .piece-block.buffer {
    background: #10b981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    animation: bufferPulse 1.2s infinite;
  }

  .piece-block.done {
    background: #3b82f6;
    opacity: 0.9;
  }

  .piece-block.pending {
    background: rgba(255, 255, 255, 0.08);
  }

  .visualizer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: var(--muted);
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }

  .meta-label strong {
    color: var(--text);
  }

  .text-accent { color: var(--accent) !important; }
  .text-emerald { color: var(--green) !important; }

  @keyframes pulseGlow {
    from { opacity: 0.8; }
    to { opacity: 1; filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6)); }
  }

  @keyframes bufferPulse {
    0%, 100% { opacity: 0.75; transform: scale(0.96); }
    50% { opacity: 1; transform: scale(1.04); }
  }
</style>
