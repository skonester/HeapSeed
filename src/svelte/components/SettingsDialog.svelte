<script>
  import { onMount } from 'svelte';
  import Modal from './Modal.svelte';

  let { open = false, onclose = () => {}, getApi = () => ({}) } = $props();

  const onDoneOptions = [
    { value: 'nothing', label: 'Do nothing' },
    { value: 'mag_sound', label: 'Play sound effect' },
    { value: 'mag_notification', label: 'Notification with app sound' },
    { value: 'system_notification', label: 'Notification with system sound' },
    { value: 'silent_notification', label: 'Silent desktop notification' }
  ];

  let activeTab = $state('limits'); // 'limits' | 'storage' | 'notifications' | 'system'
  let settings = $state(null);
  let info = $state({ platform: '', canSetDefault: false, canLaunchAtLogin: false });
  let status = $state('');
  let isSaving = $state(false);

  async function load() {
    try {
      const result = await getApi().getSettings?.();
      if (!result) return;
      settings = result.settings;
      info = { platform: result.platform, canSetDefault: result.canSetDefault, canLaunchAtLogin: result.canLaunchAtLogin };
    } catch (err) {
      status = err?.message || 'Could not load preferences.';
    }
  }

  async function save(patch) {
    status = '';
    isSaving = true;
    try {
      settings = await getApi().setSettings(patch);
      status = 'Saved';
      setTimeout(() => { if (status === 'Saved') status = ''; }, 2000);
    } catch (err) {
      status = err?.message || 'Could not save setting.';
      load();
    } finally {
      isSaving = false;
    }
  }

  async function saveLimit(key, input) {
    await save({ [key]: Number(input.value) });
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
      status = 'Registered. Check Windows Settings if prompted.';
    } catch (err) {
      status = err?.message || 'Could not register as default.';
    }
  }

  onMount(() => {
    getApi().onSettings?.((next) => settings = next);
  });

  $effect(() => {
    if (open) load();
  });
</script>

<Modal {open} title="Preferences & Engine Configuration" onclose={onclose} wide>
  <div class="settings-modal-shell">
    <!-- Settings Tabs Rail -->
    <div class="settings-nav-tabs">
      <button 
        type="button" 
        class="tab-item" 
        class:active={activeTab === 'limits'}
        onclick={() => activeTab = 'limits'}
      >
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
        <span>Bandwidth Limits</span>
      </button>

      <button 
        type="button" 
        class="tab-item" 
        class:active={activeTab === 'storage'}
        onclick={() => activeTab = 'storage'}
      >
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg>
        <span>Storage & Paths</span>
      </button>

      <button 
        type="button" 
        class="tab-item" 
        class:active={activeTab === 'notifications'}
        onclick={() => activeTab = 'notifications'}
      >
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
        <span>Notifications</span>
      </button>

      <button 
        type="button" 
        class="tab-item" 
        class:active={activeTab === 'system'}
        onclick={() => activeTab = 'system'}
      >
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
        <span>Integrations</span>
      </button>
    </div>

    <!-- Settings Content Panel -->
    <div class="settings-content-panel">
      {#if !settings}
        <div class="loading-state">Loading engine configuration...</div>
      {:else if activeTab === 'limits'}
        <!-- Bandwidth Limits -->
        <div class="tab-pane animate-fade-in">
          <h3 class="pane-title">Bandwidth Throttling</h3>
          <p class="pane-desc">Set maximum download and upload speed caps. Enter <code>0</code> for unlimited speed.</p>

          <div class="setting-field">
            <label for="down-limit">Global Download Limit</label>
            <div class="input-with-unit">
              <input
                id="down-limit"
                type="number"
                min="0"
                step="10"
                value={settings.down_limit_kb}
                onchange={(e) => saveLimit('down_limit_kb', e.currentTarget)}
              />
              <span class="unit-tag">KB/s</span>
            </div>
          </div>

          <div class="setting-field">
            <label for="up-limit">Upload Limit (while downloading)</label>
            <div class="input-with-unit">
              <input
                id="up-limit"
                type="number"
                min="0"
                step="10"
                value={settings.up_limit_kb}
                onchange={(e) => saveLimit('up_limit_kb', e.currentTarget)}
              />
              <span class="unit-tag">KB/s</span>
            </div>
          </div>

          <div class="setting-field">
            <label for="seed-limit">Upload Limit (while seeding only)</label>
            <div class="input-with-unit">
              <input
                id="seed-limit"
                type="number"
                min="0"
                step="10"
                value={settings.seed_up_limit_kb}
                onchange={(e) => saveLimit('seed_up_limit_kb', e.currentTarget)}
              />
              <span class="unit-tag">KB/s</span>
            </div>
          </div>
        </div>

      {:else if activeTab === 'storage'}
        <!-- Storage & Paths -->
        <div class="tab-pane animate-fade-in">
          <h3 class="pane-title">Storage & Destination Folders</h3>
          <p class="pane-desc">Configure where torrent payloads and downloaded streaming media are stored on disk.</p>

          <div class="setting-field">
            <label for="download-path">Default Downloads Directory</label>
            <div class="path-browse-row">
              <input 
                id="download-path" 
                type="text" 
                readonly 
                value={settings.download_path} 
                class="path-input"
              />
              <button class="primary-btn small" type="button" onclick={changeFolder}>Browse</button>
            </div>
          </div>
        </div>

      {:else if activeTab === 'notifications'}
        <!-- Notifications & Behavior -->
        <div class="tab-pane animate-fade-in">
          <h3 class="pane-title">Completion Actions & Alerts</h3>
          <p class="pane-desc">Choose what occurs when a torrent transfer completes downloading.</p>

          <div class="setting-field">
            <label for="on-done-select">When Transfer Finishes</label>
            <select
              id="on-done-select"
              class="settings-select"
              value={settings.on_torrent_done}
              onchange={(e) => save({ on_torrent_done: e.currentTarget.value })}
            >
              {#each onDoneOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div class="setting-toggle-row">
            <div>
              <strong>Continue Seeding After Completion</strong>
              <p class="toggle-sub">Maintain peer upload swarm participation after download completes.</p>
            </div>
            <label class="switch-toggle">
              <input 
                type="checkbox" 
                aria-label="Continue seeding after completion"
                checked={settings.seed_after_done}
                onchange={(e) => save({ seed_after_done: e.currentTarget.checked })}
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

      {:else if activeTab === 'system'}
        <!-- System & Integrations -->
        <div class="tab-pane animate-fade-in">
          <h3 class="pane-title">System & File Associations</h3>
          <p class="pane-desc">Register HeapSeed as your default operating system torrent client.</p>

          <div class="setting-toggle-row">
            <div>
              <strong>Keep Running in the Tray When Closed</strong>
              <p class="toggle-sub">Transfers continue until you quit from the tray icon.</p>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" aria-label="Keep running in the tray when closed" checked={settings.close_to_tray} onchange={(e) => save({ close_to_tray: e.currentTarget.checked })} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-toggle-row">
            <div>
              <strong>Check for Updates at Startup</strong>
              <p class="toggle-sub">Check for new HeapSeed releases when the app starts.</p>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" aria-label="Check for updates at startup" checked={settings.auto_update} onchange={(e) => save({ auto_update: e.currentTarget.checked })} />
              <span class="slider"></span>
            </label>
          </div>

          {#if info.canSetDefault}
            <div class="setting-field">
              <label for="default-handler">Default BitTorrent Protocol Handler</label>
              <button id="default-handler" class="secondary-btn small" type="button" onclick={makeDefault}>
                Register HeapSeed as Default Handler
              </button>
            </div>
          {/if}

          {#if info.canLaunchAtLogin}
            <div class="setting-toggle-row">
              <div>
                <strong>Launch at System Login</strong>
                <p class="toggle-sub">Automatically start HeapSeed minimized to tray upon startup.</p>
              </div>
              <label class="switch-toggle">
                <input 
                  type="checkbox" 
                  aria-label="Launch at system login"
                  checked={settings.launch_at_login} 
                  onchange={(e) => save({ launch_at_login: e.currentTarget.checked })}
                />
                <span class="slider"></span>
              </label>
            </div>
          {/if}
        </div>
      {/if}

      {#if status}
        <div class="settings-status-bar" class:success={status === 'Saved'}>
          {status}
        </div>
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <button class="primary-btn small" type="button" onclick={onclose}>Done</button>
  {/snippet}
</Modal>

<style>
  .settings-modal-shell {
    display: flex;
    gap: 16px;
    min-height: 280px;
  }

  .settings-nav-tabs {
    width: 170px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-right: 1px solid var(--border);
    padding-right: 12px;
    flex-shrink: 0;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }
  .tab-item:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }
  .tab-item.active {
    background: var(--surface-2);
    color: var(--accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .tab-item svg {
    width: 15px;
    height: 15px;
  }

  .settings-content-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .tab-pane {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pane-title {
    font-size: 14.5px;
    font-weight: 800;
    color: var(--text);
    margin: 0;
  }

  .pane-desc {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.4;
    margin: 0;
  }
  .pane-desc code {
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 4px;
    border-radius: 4px;
    color: var(--accent);
  }

  .setting-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .setting-field label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }

  .input-with-unit {
    display: flex;
    align-items: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 10px;
    width: 180px;
  }
  .input-with-unit:focus-within {
    border-color: var(--accent);
  }
  .input-with-unit input {
    background: transparent;
    border: none;
    outline: none;
    padding: 6px 0;
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    width: 100%;
  }
  .unit-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }

  .path-browse-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .path-input {
    flex: 1;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    color: var(--text);
    font-size: 12px;
    outline: none;
  }

  .settings-select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 10px;
    color: var(--text);
    font-size: 12.5px;
    outline: none;
    cursor: pointer;
  }

  .setting-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .setting-toggle-row strong {
    font-size: 12.5px;
    color: var(--text);
  }
  .toggle-sub {
    font-size: 11.5px;
    color: var(--muted);
    margin: 2px 0 0;
  }

  .switch-toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }
  .switch-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    transition: 0.2s;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }
  input:checked + .slider {
    background: var(--accent);
  }
  input:checked + .slider:before {
    transform: translateX(18px);
    background: #04121a;
  }

  .settings-status-bar {
    margin-top: auto;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    color: var(--muted);
  }
  .settings-status-bar.success {
    background: rgba(16, 185, 129, 0.15);
    color: var(--green);
  }

  .loading-state {
    padding: 40px 0;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
  }
</style>
