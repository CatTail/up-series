<script lang="ts">
  import type { Film } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'

  let { films, index, onchange }: { films: Film[]; index: number; onchange: (i: number) => void } = $props()
  const f = $derived(films[index])
</script>

<div class="ctrl">
  <label for="age-slider">{t('overview.age')}</label>
  <input id="age-slider" type="range" min="0" max={films.length - 1} step="1" value={index} oninput={(e) => onchange(Number(e.currentTarget.value))} aria-valuetext={f ? t('overview.ageLabel', { age: f.age, year: f.year, title: f.title }) : ''} />
  {#if f}<span class="lbl">{t('overview.ageLabel', { age: f.age, year: f.year, title: f.title })}</span>{/if}
</div>

<style>
  .ctrl { display: flex; align-items: center; gap: 12px; font-size: 14px; margin: 4px 0 8px; flex-wrap: wrap; }
  input { width: min(320px, 60vw); accent-color: var(--ink); }
  .lbl { font-weight: 600; }
</style>
