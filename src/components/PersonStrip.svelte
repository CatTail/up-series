<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { PersonId } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'

  let { idx, current }: { idx: DataIndex; current?: PersonId } = $props()
  const groups = $derived(idx.groups.map((g) => ({ g, people: idx.peopleOrdered.filter((p) => p.group === g.id) })).filter((x) => x.people.length))
</script>

<nav class="strip" aria-label={t('people.strip')}>
  {#each groups as { g, people } (g.id)}
    <span class="grp">
      <i style:background={`var(${g.colorVar})`} aria-hidden="true"></i>
      {#each people as p (p.id)}
        <a href={`#/person/${p.id}`} aria-current={current === p.id ? 'page' : undefined}>{p.name}</a>
      {/each}
    </span>
  {/each}
</nav>

<style>
  .strip { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; font-size: 13px; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid var(--grid); }
  .grp { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; }
  i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 2px; }
  a { color: var(--ink2); text-decoration: none; padding: 1px 7px; border: 1px solid transparent; border-radius: 999px; }
  a:hover { color: var(--ink); border-color: var(--axis); }
  a[aria-current='page'] { color: var(--ink); font-weight: 600; border-color: var(--ink); }
</style>
