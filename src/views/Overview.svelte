<script lang="ts">
  import LifeChart from '../components/LifeChart.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { DimKey, GroupId, PersonId } from '../lib/data/types.ts'
  import { DIM_KEYS } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'
  import { navigate } from '../lib/router.svelte.ts'

  let { idx, age, dim, people }: { idx: DataIndex; age?: number; dim?: DimKey; people?: PersonId[] } = $props()

  // Local state mirrors the route so clicks respond at once; the URL follows with replaceState.
  let open = $state<number | null>(null)
  let theme = $state<DimKey | undefined>()
  let picked = $state<PersonId[]>([])
  $effect.pre(() => {
    const i = idx.films.findIndex((f) => f.age === age)
    open = i >= 0 ? i : null
    theme = dim
    picked = people ? [...people] : []
  })
  let highlight = $state<GroupId | null>(null)

  function sync() {
    navigate(
      { name: 'overview', age: open === null ? undefined : idx.films[open].age, dim: theme, people: picked.length ? [...picked] : undefined },
      { replace: true },
    )
  }
  function setOpen(i: number | null) {
    open = i
    sync()
  }
  function setTheme(d: DimKey | undefined) {
    theme = d
    sync()
  }
  /** Selecting someone closes the open age, so their rows fill with every age straight away. */
  function togglePin(id: PersonId) {
    if (picked.includes(id)) picked = picked.filter((x) => x !== id)
    else {
      picked = [...picked, id]
      open = null
    }
    sync()
  }
  function clearPins() {
    picked = []
    sync()
  }
</script>

<section>
  <h1>{t('overview.title')}</h1>
  <p class="lede">{t('overview.lede')}</p>
  <div class="controls">
    <div class="ctl" role="group" aria-label={t('overview.theme')}>
      <span class="lbl">{t('overview.theme')}</span>
      <button type="button" aria-pressed={!theme} onclick={() => setTheme(undefined)}>{t('overview.themeAll')}</button>
      {#each DIM_KEYS as d (d)}
        <button type="button" aria-pressed={theme === d} onclick={() => setTheme(theme === d ? undefined : d)}>{t(`dim.${d}`)}</button>
      {/each}
    </div>
    <div class="ctl" role="group" aria-label={t('overview.origin')}>
      <span class="lbl">{t('overview.origin')}</span>
      {#each idx.groups as g (g.id)}
        <button type="button" title={t('overview.groupHint')} aria-pressed={highlight === g.id} onclick={() => (highlight = highlight === g.id ? null : g.id)}>
          <i style:background={`var(${g.colorVar})`}></i>{pick(g.name)}
        </button>
      {/each}
    </div>
    {#if picked.length}
      <div class="ctl" role="group" aria-label={t('overview.pinned')}>
        <span class="lbl">{t('overview.pinned')}</span>
        {#each picked as id (id)}
          <button type="button" class="pin" aria-label={t('overview.unpin', { name: idx.person(id).name })} onclick={() => togglePin(id)}>
            <i style:background={`var(${idx.group(idx.person(id).group).colorVar})`}></i>{idx.person(id).name}<span class="x" aria-hidden="true">✕</span>
          </button>
        {/each}
        <button type="button" onclick={clearPins}>{t('overview.clearPins')}</button>
      </div>
    {/if}
  </div>
  <LifeChart {idx} {open} dim={theme} {picked} {highlight} onopen={setOpen} onpin={togglePin} />
  <div class="keys">
    <span><i class="k-present" aria-hidden="true"></i>{t('legend.present')}</span>
    <span><i class="k-absent" aria-hidden="true"></i>{t('legend.absent')}</span>
    <span><i class="k-special" aria-hidden="true"></i>{t('legend.special')}</span>
    <span><span aria-hidden="true">†&nbsp;</span>{t('legend.death')}</span>
    <span class="hint">{t('overview.compareHint')}</span>
  </div>
</section>

<style>
  h1 { font-size: 22px; margin: 0; }
  .lede { color: var(--ink2); margin: 0 0 6px; font-size: 14px; }
  .controls { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0 0 4px; }
  .ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 12px; color: var(--ink2); }
  .lbl { color: var(--muted); margin-right: 2px; }
  .ctl button { font: inherit; color: var(--ink2); background: none; border: 1px solid transparent; border-radius: 999px; padding: 1px 8px; cursor: pointer; }
  .ctl button:hover { border-color: var(--axis); }
  .ctl button[aria-pressed='true'] { border-color: var(--ink); color: var(--ink); }
  .ctl button.pin { border-color: var(--axis); color: var(--ink); }
  .x { margin-left: 4px; color: var(--muted); font-size: 10px; }
  .ctl i, .keys i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .keys { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center; font-size: 11px; color: var(--ink2); margin: 6px 0 0; }
  .keys .k-present { background: var(--ink2); }
  .keys .k-absent { background: var(--surface); border: 1.5px solid var(--muted); }
  .keys .k-special { background: var(--surface); border: 1.5px solid var(--ink2); border-radius: 1px; transform: rotate(45deg) scale(0.85); }
  .hint { color: var(--muted); }
</style>
