<script>
  import Modal from './Modal.svelte';

  // request: { infoHash, name, files: [{ path, length }], selected: boolean[], initial } or null
  let { request = null, onclose, getApi, formatDataSize } = $props();

  let selected = $state([]);
  let busy = $state(false);
  let error = $state('');

  $effect(() => {
    if (request) {
      selected = [...request.selected];
      error = '';
    }
  });

  const files = $derived(request?.files || []);
  const chosenCount = $derived(selected.filter(Boolean).length);
  const chosenBytes = $derived(files.reduce((sum, file, i) => sum + (selected[i] ? file.length : 0), 0));

  // Multi-file torrents put everything under a folder named after the torrent; drop that prefix
  function displayPath(file) {
    const prefix = `${request?.name}/`;
    const normalized = file.path.replace(/\\/g, '/');
    return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
  }

  function setAll(value) {
    selected = files.map(() => value);
  }

  async function confirm() {
    busy = true;
    error = '';
    try {
      await getApi().selectFiles(request.infoHash, $state.snapshot(selected));
      onclose?.();
    } catch (err) {
      error = (err?.message || 'Could not apply the selection.').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    } finally {
      busy = false;
    }
  }

  async function cancel() {
    if (busy) return;
    // Cancelling the first choice drops the torrent: nothing has been downloaded yet
    if (request?.initial) await getApi().cancelPick?.(request.infoHash);
    onclose?.();
  }
</script>

<Modal open={Boolean(request)} title={request?.name || 'Choose files'} wide onclose={cancel}>
  <div class="picker-toolbar">
    <span class="picker-summary">{chosenCount} of {files.length} files · {formatDataSize(chosenBytes)}</span>
    <span class="picker-actions">
      <button class="secondary-btn small" type="button" onclick={() => setAll(true)}>All</button>
      <button class="secondary-btn small" type="button" onclick={() => setAll(false)}>None</button>
    </span>
  </div>

  <ul class="file-list">
    {#each files as file, i (file.path)}
      <li>
        <label class="file-row">
          <input type="checkbox" bind:checked={selected[i]} disabled={busy}>
          <span class="file-path" title={file.path}>{displayPath(file)}</span>
          <span class="file-size">{formatDataSize(file.length)}</span>
        </label>
      </li>
    {/each}
  </ul>

  {#if error}
    <p class="picker-error" role="alert">{error}</p>
  {/if}

  {#snippet footer()}
    <button class="secondary-btn small" type="button" disabled={busy} onclick={cancel}>
      {request?.initial ? 'Cancel download' : 'Cancel'}
    </button>
    <button class="primary-btn small" type="button" disabled={busy || chosenCount === 0} onclick={confirm}>
      {request?.initial ? 'Download' : 'Apply'}
    </button>
  {/snippet}
</Modal>

<style>
  .picker-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .picker-summary {
    font-size: 12px;
    color: var(--muted);
  }

  .picker-actions {
    display: inline-flex;
    gap: 6px;
  }

  .file-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    max-height: 340px;
    overflow-y: auto;
  }

  .file-list li + li {
    border-top: 1px solid var(--border);
  }

  .file-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    font-size: 12.5px;
    cursor: pointer;
  }

  .file-row:hover {
    background: var(--surface-2);
  }

  .file-row input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }

  .file-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .picker-error {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--red);
  }
</style>
