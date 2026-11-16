<script>
  let { open = false, title, wide = false, onclose, children, footer } = $props();
  let dialog;
  const titleId = `modal-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function handleCancel(event) {
    event.preventDefault();
    onclose?.();
  }
</script>

<dialog bind:this={dialog} class="modal" class:wide aria-labelledby={titleId} oncancel={handleCancel}>
  <div class="modal-header">
    <h2 id={titleId} class="modal-title">{title}</h2>
    <button class="modal-close-btn" type="button" onclick={() => onclose?.()} aria-label="Close dialog">
      <svg viewBox="0 0 16 16"><path fill="currentColor" d="m4.2 3.2 3.8 3.75 3.8-3.75 1 1.05L9.05 8l3.75 3.75-1 1.05L8 9.05 4.2 12.8l-1-1.05L6.95 8 3.2 4.25z"/></svg>
    </button>
  </div>
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
    width: min(500px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    padding: 0;
    border: 1px solid var(--border-hover);
    border-radius: 16px;
    background: var(--surface-3);
    color: var(--text);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), var(--glass-shadow);
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(28px);
    overflow: hidden;
  }

  .modal:not([open]) {
    display: none;
  }

  .modal.wide {
    width: min(680px, calc(100vw - 32px));
  }

  .modal::backdrop {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border);
  }

  .modal-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    overflow-wrap: anywhere;
    color: var(--text);
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .modal-close-btn:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.1);
  }
  .modal-close-btn svg {
    width: 14px;
    height: 14px;
  }

  .modal-body {
    padding: 18px 20px;
    overflow-y: auto;
    min-height: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    background: var(--surface-2);
  }
</style>
