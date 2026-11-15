<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import { t } from '../lib/i18n.svelte.ts'

  let { idx }: { idx: DataIndex } = $props()
</script>

<div class="wrap">
  <table>
    <caption>{t('overview.lifelineAria')}</caption>
    <thead>
      <tr><th scope="col"></th>{#each idx.films as f (f.id)}<th scope="col">{t('age.short', { age: f.age })}<br /><small>{f.title}</small></th>{/each}</tr>
    </thead>
    <tbody>
      {#each idx.peopleOrdered as p (p.id)}
        <tr>
          <th scope="row"><a href={`#/person/${p.id}`}>{p.name}</a></th>
          {#each idx.films as f (f.id)}<td class={p.participation[f.id]}>{t(`status.${p.participation[f.id]}`)}</td>{/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; min-width: 720px; }
  caption { text-align: left; color: var(--ink2); padding-bottom: 6px; }
  th, td { border-bottom: 1px solid var(--grid); padding: 4px 6px; text-align: center; }
  th[scope='row'] { text-align: left; white-space: nowrap; }
  small { color: var(--muted); font-weight: 400; }
  td.absent, td.footage_only, td.deceased { color: var(--muted); }
</style>
