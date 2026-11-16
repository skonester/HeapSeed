<script>
  import Modal from './Modal.svelte';

  let {
    open = false,
    onclose = () => {},
    onadd = (uri) => {},
    readClipboard = () => ''
  } = $props();

  let inputUri = $state('');
  let validationError = $state('');
  let inputRevision = 0;

  $effect(() => {
    inputRevision += 1;
    if (!open) return;
    let cancelled = false;
    const revision = inputRevision;
    validationError = '';
    inputUri = '';
    // Do not overwrite typing or a later modal opening when an async read resolves.
    (async () => {
      try {
        const clip = (await readClipboard() || '').trim();
        if (!cancelled && inputRevision === revision && isTorrentIdentifier(clip)) inputUri = clip;
      } catch { /* Auto-fill is optional. */ }
    })();
    return () => { cancelled = true; };
  });

  async function handlePasteClipboard() {
    const revision = ++inputRevision;
    try {
      const text = (await readClipboard() || '').trim();
      if (open && inputRevision === revision && text) {
        inputUri = text;
        validationError = '';
      }
    } catch {
      if (open && inputRevision === revision) validationError = 'Unable to read the clipboard.';
    }
  }

  function isTorrentIdentifier(value) {
    return value.startsWith('magnet:?xt=urn:btih:') ||
      (/^https?:\/\//i.test(value) && value.toLowerCase().includes('.torrent')) ||
      /^[0-9a-fA-F]{40}$/.test(value);
  }

  function submit() {
    const val = inputUri.trim();
    if (!val) {
      validationError = 'Please enter a magnet link, info hash, or torrent URL.';
      return;
    }

    const isValid = isTorrentIdentifier(val);

    if (!isValid) {
      validationError = 'Unrecognized format. Must be a magnet: URI, .torrent URL, or 40-character info hash.';
      return;
    }

    onadd(val);
    inputUri = '';
    onclose();
  }
</script>

<Modal {open} title="Add New Transfer Payload" onclose={onclose} wide>
  <div class="add-modal-body">
    <p class="modal-description">
      Paste a BitTorrent <code>magnet:</code> link, direct HTTP/HTTPS <code>.torrent</code> link, or a raw 40-character hexadecimal info hash to begin immediate streaming.
    </p>

    <div class="input-container">
      <div class="input-glow-frame">
        <textarea
          bind:value={inputUri}
          oninput={() => { inputRevision += 1; }}
          placeholder="magnet:?xt=urn:btih:... or https://example.com/file.torrent"
          rows="4"
          class="payload-textarea"
          onkeydown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
        ></textarea>
      </div>

      <div class="input-helpers">
        <button type="button" class="helper-btn" onclick={handlePasteClipboard}>
          <svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>
          Paste from Clipboard
        </button>
        {#if inputUri}
          <button type="button" class="helper-btn text-muted" onclick={() => { inputRevision += 1; inputUri = ''; }}>Clear</button>
        {/if}
      </div>
    </div>

    {#if validationError}
      <div class="validation-alert" role="alert">
        <svg class="icon-inline" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>{validationError}</span>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <button class="secondary-btn small" type="button" onclick={onclose}>Cancel</button>
    <button class="primary-btn small" type="button" onclick={submit}>
      <svg class="icon-inline" viewBox="0 0 24 24" style="margin-right: 4px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Add & Connect Swarm
    </button>
  {/snippet}
</Modal>

<style>
  .add-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-description {
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
    margin: 0;
  }

  .modal-description code {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 12px;
    color: var(--accent);
  }

  .input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-glow-frame {
    position: relative;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border-hover);
    transition: all 0.25s ease;
  }

  .input-glow-frame:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(0, 242, 254, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.06);
  }

  .payload-textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 13px;
    color: var(--text);
    resize: vertical;
    box-sizing: border-box;
  }

  .input-helpers {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .helper-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  .helper-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .validation-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: var(--red);
    font-size: 12px;
    font-weight: 600;
  }
</style>
