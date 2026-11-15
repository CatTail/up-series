<script lang="ts">
  import AgeSlider from '../components/AgeSlider.svelte'
  import Lifelines from '../components/Lifelines.svelte'
  import LifelineTable from '../components/LifelineTable.svelte'
  import StateChips from '../components/StateChips.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { GroupId } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'
  import { navigate } from '../lib/router.svelte.ts'

  let { idx, age }: { idx: DataIndex; age?: number } = $props()

  const fromAge = (a: number | undefined) => {
    const i = idx.films.findIndex((f) => f.age === a)
    return i >= 0 ? i : 3
  }
  let index = $state(3)
  $effect.pre(() => {
    index = fromAge(age)
  })
  let highlight = $state<GroupId | null>(null)
  let table = $state(false)

  function setIndex(i: number) {
    index = i
    navigate({ name: 'overview', age: idx.films[i].age }, { replace: true })
  }
</script>

<section>
  <h1>{t('overview.title')}</h1>
  <p class="lede">{t('overview.lede')}</p>
  <AgeSlider films={idx.films} {index} onchange={setIndex} />
  <div class="legend">
    {#each idx.groups as g (g.id)}
      <button type="button" aria-pressed={highlight === g.id} onclick={() => (highlight = highlight === g.id ? null : g.id)}>
        <i style:background={`var(${g.colorVar})`}></i>{pick(g.name)}
      </button>
    {/each}
    <span class="hint">{t('overview.groupHint')}</span>
  </div>
  <div class="legend keys">
    <span><i class="k-present" aria-hidden="true"></i>{t('legend.present')}</span>
    <span><i class="k-absent" aria-hidden="true"></i>{t('legend.absent')}</span>
    <span><i class="k-special" aria-hidden="true"></i>{t('legend.special')}</span>
    <span><span aria-hidden="true">†&nbsp;</span>{t('legend.death')}</span>
    <button type="button" class="view" aria-pressed={table} onclick={() => (table = !table)}>{t('overview.tableView')}</button>
  </div>
  {#if table}
    <LifelineTable {idx} />
  {:else}
    <Lifelines {idx} people={idx.peopleOrdered} cursor={index} {highlight} />
  {/if}
  <h2 class="chips-h">{t('overview.chipsLabel', { age: idx.films[index]?.age ?? '' })}</h2>
  <StateChips {idx} filmIndex={index} {highlight} />
</section>

<style>
  h1 { font-size: 22px; margin: 0 0 4px; }
  .lede { color: var(--ink2); margin: 0 0 10px; max-width: 46em; }
  .legend { display: flex; gap: 8px 14px; flex-wrap: wrap; align-items: center; font-size: 12px; color: var(--ink2); margin: 4px 0; }
  .legend button { font: inherit; color: var(--ink2); background: none; border: 1px solid transparent; border-radius: 999px; padding: 1px 8px; cursor: pointer; }
  .legend button[aria-pressed='true'] { border-color: var(--ink); color: var(--ink); }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .hint { color: var(--muted); }
  .keys .k-present { background: var(--ink2); }
  .keys .k-absent { background: var(--surface); border: 1.5px solid var(--muted); }
  .keys .k-special { background: var(--surface); border: 1.5px solid var(--ink2); border-radius: 1px; transform: rotate(45deg) scale(0.85); }
  .keys .view { margin-left: auto; border-color: var(--axis); }
  .keys .view[aria-pressed='true'] { border-color: var(--ink); color: var(--ink); }
  .chips-h { font-size: 14px; margin: 14px 0 0; color: var(--ink2); font-weight: 600; }
</style>
