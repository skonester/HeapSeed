<script>
  // Native <dialog> shell: focus trapping, Escape and the backdrop come from the browser.
  let { open = false, title, wide = false, onclose, children, footer } = $props();
  let dialog;
  const titleId = `modal-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function handleCancel(event) {
    // Escape: let the parent decide, so its state stays the source of truth
    event.preventDefault();
    onclose?.();
  }
</script>

<dialog bind:this={dialog} class="modal" class:wide aria-labelledby={titleId} oncancel={handleCancel}>
  <h2 id={titleId} class="modal-title">{title}</h2>
  <div class="modal-body">
    {@render children?.()}
  </div>
  {#if footer}
    <div class="modal-footer">
      {@render footer()}
    </div>
  {/if}
</dialog>

<style>
  .modal {
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    padding: 0;
    border: 1px solid var(--border-hover);
    border-radius: 14px;
    background: var(--bg);
    color: var(--text);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
  }

  .modal:not([open]) {
    display: none;
  }

  .modal.wide {
    width: min(640px, calc(100vw - 32px));
  }

  .modal::backdrop {
    background: rgba(0, 0, 0, 0.55);
  }

  .modal-title {
    margin: 0;
    padding: 18px 20px 12px;
    font-size: 15px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .modal-body {
    padding: 0 20px 16px;
    overflow-y: auto;
    min-height: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border);
  }
</style>
