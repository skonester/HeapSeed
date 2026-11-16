<script>
  let {
    data = [],
    color = '#00f5ff',
    gradientId = 'spark-grad-' + Math.random().toString(36).slice(2, 8),
    width = 80,
    height = 24,
    strokeWidth = 1.75
  } = $props();

  const maxVal = $derived(Math.max(1, ...data));
  const points = $derived.by(() => {
    if (!data.length) return '';
    const step = data.length > 1 ? width / (data.length - 1) : width;
    return data
      .map((val, idx) => {
        const x = idx * step;
        const normalized = val / maxVal;
        const y = height - (normalized * (height - 4) + 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  const areaPoints = $derived.by(() => {
    if (!data.length) return '';
    const step = data.length > 1 ? width / (data.length - 1) : width;
    const firstX = 0;
    const lastX = (data.length - 1) * step;
    return `${firstX},${height} ${points} ${lastX},${height}`;
  });
</script>

<div class="sparkline-wrap" style="width: {width}px; height: {height}px;">
  <svg {width} {height} class="sparkline-svg" viewBox="0 0 {width} {height}">
    <defs>
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color={color} stop-opacity="0.35" />
        <stop offset="100%" stop-color={color} stop-opacity="0.0" />
      </linearGradient>
    </defs>
    {#if points}
      <polygon points={areaPoints} fill="url(#{gradientId})" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {:else}
      <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke={color} stroke-opacity="0.2" stroke-width="1" />
    {/if}
  </svg>
</div>

<style>
  .sparkline-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .sparkline-svg {
    display: block;
    overflow: visible;
  }
</style>
