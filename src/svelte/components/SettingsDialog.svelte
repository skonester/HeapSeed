<script>
  import { onMount } from 'svelte';
  import Modal from './Modal.svelte';

  let { open = false, onclose, getApi } = $props();

  const onDoneOptions = [
    { value: 'nothing', label: 'Do nothing' },
    { value: 'mag_sound', label: 'Play sound' },
    { value: 'mag_notification', label: 'Notification with sound' },
    { value: 'system_notification', label: 'Notification with system sound' },
    { value: 'silent_notification', label: 'Silent notification' }
  ];
  const limitFields = [
    { key: 'down_limit_kb', label: 'Download limit' },
    { key: 'up_limit_kb', label: 'Upload limit while downloading' },
    { key: 'seed_up_limit_kb', label: 'Upload limit while only seeding' }
  ];

  let settings = $state(null);
  let info = $state({ platform: '', canSetDefault: false, canLaunchAtLogin: false });
  let status = $state('');

  async function load() {
    try {
      const result = await getApi().getSettings?.();
      if (!result) return;
      settings = result.settings;
      info = { platform: result.platform, canSetDefault: result.canSetDefault, canLaunchAtLogin: result.canLaunchAtLogin };
    } catch (err) {
      status = err?.message || 'Could not load settings.';
    }
  }

  async function save(patch) {
    status = '';
    try {
      settings = await getApi().setSettings(patch);
    } catch (err) {
      status = err?.message || 'Could not save that setting.';
      load();
    }
  }

  async function saveLimit(key, input) {
    await save({ [key]: Number(input.value) });
    // Show the stored value: the main process clamps it (negative, too large, decimals)
    if (settings) input.value = settings[key];
  }

  async function changeFolder() {
    const folder = await getApi().pickFolder?.();
    if (folder) save({ download_path: folder });
  }

  async function makeDefault() {
    status = '';
    try {
      await getApi().registerDefaultHandler();
      status = 'In Windows Settings, choose HeapSeed for .torrent and for MAGNET.';
    } catch (err) {
      status = err?.message || 'Registration failed.';
    }
  }

  onMount(() => {
    getApi().onSettings?.((next) => { settings = next; });
  });

  $effect(() => {
    if (open) { status = ''; load(); }
  });
</script>

<Modal {open} title="Settings" {onclose}>
  {#if settings}
    <section class="settings-group">
      <h3>Downloads</h3>
      <div class="setting-row">
        <div class="setting-text">
          <span class="setting-name">Download folder</span>
          <span class="setting-path" title={settings.download_path}>{settings.download_path}</span>
        </div>
        <button class="secondary-btn small" type="button" onclick={changeFolder}>Change…</button>
      </div>
      {#each limitFields as field}
        <label class="setting-row">
          <span class="setting-name">{field.label}</span>
          <span class="number-field">
            <input
              type="number"
              min="0"
              step="10"
              inputmode="numeric"
              value={settings[field.key]}
              onchange={(event) => saveLimit(field.key, event.currentTarget)}
            >
            <span class="unit">KB/s</span>
          </span>
        </label>
      {/each}
      <p class="setting-note">0 means unlimited. Seeding alone is capped at 20 KB/s unless you change it.</p>
    </section>

    <section class="settings-group">
      <h3>Behaviour</h3>
      <label class="setting-row">
        <span class="setting-name">When a download finishes</span>
        <select value={settings.on_torrent_done} onchange={(event) => save({ on_torrent_done: event.currentTarget.value })}>
          {#each onDoneOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label class="setting-row">
        <span class="setting-text">
          <span class="setting-name">Keep seeding after a download finishes</span>
          <span class="setting-hint">Off: finished transfers stop and disconnect from peers.</span>
        </span>
        <input type="checkbox" role="switch" checked={settings.seed_after_done} onchange={(event) => save({ seed_after_done: event.currentTarget.checked })}>
      </label>
      <label class="setting-row">
        <span class="setting-text">
          <span class="setting-name">Keep running in the tray when closed</span>
          <span class="setting-hint">Transfers keep going; quit from the tray icon.</span>
        </span>
        <input type="checkbox" role="switch" checked={settings.close_to_tray} onchange={(event) => save({ close_to_tray: event.currentTarget.checked })}>
      </label>
      {#if info.canLaunchAtLogin}
        <label class="setting-row">
          <span class="setting-text">
            <span class="setting-name">Start with {info.platform === 'darwin' ? 'macOS' : 'Windows'}</span>
            <span class="setting-hint">Starts in the tray, without a window.</span>
          </span>
          <input type="checkbox" role="switch" checked={settings.launch_at_login} onchange={(event) => save({ launch_at_login: event.currentTarget.checked })}>
        </label>
      {/if}
      <label class="setting-row">
        <span class="setting-name">Check for updates at startup</span>
        <input type="checkbox" role="switch" checked={settings.auto_update} onchange={(event) => save({ auto_update: event.currentTarget.checked })}>
      </label>
    </section>

    <section class="settings-group">
      <h3>Appearance</h3>
      <div class="segmented" role="group" aria-label="Theme">
        {#each ['system', 'light', 'dark'] as mode}
          <button type="button" class:active={settings.appearance === mode} aria-pressed={settings.appearance === mode} onclick={() => save({ appearance: mode })}>{mode}</button>
        {/each}
      </div>
    </section>

    {#if info.canSetDefault}
      <section class="settings-group">
        <h3>Default app</h3>
        <div class="setting-row">
          <span class="setting-text">
            <span class="setting-name">Open .torrent files and magnet links</span>
            <span class="setting-hint">Windows asks you to confirm the choice.</span>
          </span>
          <button class="secondary-btn small" type="button" onclick={makeDefault}>Make default</button>
        </div>
      </section>
    {/if}
  {:else}
    <p class="setting-note">Loading…</p>
  {/if}

  {#if status}
    <p class="settings-status" role="status">{status}</p>
  {/if}

  {#snippet footer()}
    <button class="primary-btn small" type="button" onclick={onclose}>Done</button>
  {/snippet}
</Modal>

<style>
  .settings-group {
    padding: 12px 0;
    border-top: 1px solid var(--border);
  }

  .settings-group:first-child {
    border-top: none;
    padding-top: 0;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--soft);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 40px;
    padding: 4px 0;
  }

  .setting-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .setting-name {
    font-size: 13px;
    font-weight: 600;
  }

  .setting-hint,
  .setting-note {
    font-size: 11.5px;
    color: var(--muted);
  }

  .setting-note {
    margin: 6px 0 0;
  }

  .setting-path {
    font-size: 11.5px;
    color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .number-field {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .unit {
    font-size: 11.5px;
    color: var(--muted);
  }

  input[type='number'],
  select {
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--border-hover);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
    font-size: 12.5px;
  }

  input[type='number'] {
    width: 96px;
    text-align: right;
  }

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: var(--accent);
  }

  .segmented {
    display: inline-flex;
    border: 1px solid var(--border-hover);
    border-radius: 8px;
    overflow: hidden;
  }

  .segmented button {
    padding: 6px 14px;
    border: none;
    background: var(--surface-2);
    color: var(--muted);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
    cursor: pointer;
  }

  .segmented button.active {
    background: var(--accent-gradient);
    color: var(--accent-ink);
  }

  .settings-status {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--yellow);
  }
</style>
