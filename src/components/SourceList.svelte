<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { Bilingual } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'

  let { idx, ids, locator }: { idx: DataIndex; ids: string[]; locator?: Bilingual } = $props()
  const sources = $derived(ids.map((id) => idx.source(id)).filter((s) => s !== undefined))
</script>

{#if sources.length}
  <span class="src">
    {t('src.label')}：{#each sources as s, i (s.id)}{#if i > 0}；{/if}{#if s.kind === 'film'}<span class="film">{locator ? t('src.film', { title: s.title, locator: pick(locator) }) : s.title}</span>{:else}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.publisher} · {s.title}</a>{/if}{/each}
  </span>
{/if}

<style>
  .src { font-size: 11px; color: var(--muted); }
  a { color: var(--ink2); }
</style>
