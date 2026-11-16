<script>
  let {
    message = '',
    type = 'info', // 'info' | 'success' | 'warning' | 'error'
    visible = false,
    onclose = () => {}
  } = $props();
</script>

{#if visible && message}
  <div class="toast-wrapper animate-slide-up" data-type={type}>
    <div class="toast-content glass-panel">
      <div class="toast-icon">
        {#if type === 'success'}
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        {:else if type === 'warning'}
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2L1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
        {:else if type === 'error'}
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        {:else}
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        {/if}
      </div>
      <div class="toast-message" role="status" aria-live="polite">
        {message}
      </div>
      <button class="toast-close" type="button" onclick={onclose} aria-label="Dismiss toast">
        <svg viewBox="0 0 16 16"><path fill="currentColor" d="m4.2 3.2 3.8 3.75 3.8-3.75 1 1.05L9.05 8l3.75 3.75-1 1.05L8 9.05 4.2 12.8l-1-1.05L6.95 8 3.2 4.25z"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .toast-wrapper {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    max-width: 420px;
    pointer-events: auto;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    background: var(--surface-3);
    border: 1px solid var(--border-hover);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), var(--glass-shadow);
    color: var(--text);
  }

  .toast-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .toast-icon svg {
    width: 100%;
    height: 100%;
  }

  [data-type="success"] .toast-icon { color: var(--green); }
  [data-type="warning"] .toast-icon { color: var(--yellow); }
  [data-type="error"] .toast-icon { color: var(--red); }
  [data-type="info"] .toast-icon { color: var(--accent); }

  .toast-message {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    flex: 1;
  }

  .toast-close {
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
  .toast-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.1);
  }
  .toast-close svg {
    width: 14px;
    height: 14px;
  }
</style>
