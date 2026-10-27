<script>
  import Modal from './Modal.svelte';

  // torrents: [{ infoHash, name }] waiting for confirmation; empty when closed
  let { torrents = [], platform = '', onclose, getApi } = $props();

  let alsoTrash = $state(false);
  let busy = $state(false);

  const trashName = $derived(platform === 'win32' ? 'Recycle Bin' : 'Trash');
  const title = $derived(torrents.length === 1 ? `Remove “${torrents[0].name}”?` : `Remove ${torrents.length} transfers?`);

  // The checkbox starts unticked every time the dialog opens
  $effect(() => {
    if (torrents.length) alsoTrash = false;
  });

  async function confirm() {
    busy = true;
    try {
      const result = await getApi().removeTorrents(torrents.map((t) => t.infoHash), { trash: alsoTrash });
      onclose?.(result);
    } catch (err) {
      onclose?.({ error: err?.message || 'Removal failed.' });
    } finally {
      busy = false;
    }
  }
</script>

<Modal open={torrents.length > 0} {title} onclose={() => !busy && onclose?.(null)}>
  <p class="remove-note">
    {torrents.length === 1 ? 'The transfer' : 'These transfers'} will leave the list.
    Downloaded files stay on disk unless you tick the box.
  </p>
  <label class="trash-option">
    <input type="checkbox" bind:checked={alsoTrash} disabled={busy}>
    <span>Also move downloaded files to the {trashName}</span>
  </label>
  {#if alsoTrash}
    <p class="remove-note subtle">
      Only this transfer's own files are moved. Files shared with another transfer, links, and anything outside the download folder are kept.
    </p>
  {/if}

  {#snippet footer()}
    <button class="secondary-btn small" type="button" disabled={busy} onclick={() => onclose?.(null)}>Cancel</button>
    <button class="primary-btn small danger-action" type="button" disabled={busy} onclick={confirm}>
      {busy ? 'Removing…' : 'Remove'}
    </button>
  {/snippet}
</Modal>

<style>
  .remove-note {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--muted);
  }

  .remove-note.subtle {
    margin: 10px 0 0;
    font-size: 11.5px;
  }

  .trash-option {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .trash-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--red);
  }

  .danger-action {
    background: var(--red);
    color: #fff;
    box-shadow: none;
  }
</style>
