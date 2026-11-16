<script lang="ts">
  import LifeChart from '../components/LifeChart.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { DimKey, PersonId } from '../lib/data/types.ts'
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
  /** People filter pills, in origin groups. */
  const byGroup = $derived(
    idx.groups.map((g) => ({ g, people: idx.peopleOrdered.filter((p) => p.group === g.id) })).filter((x) => x.people.length > 0),
  )

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
  function togglePin(id: PersonId) {
    picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
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
  <div class="filters">
    <div class="ctl" role="group" aria-labelledby="flt-age">
      <span class="lbl" id="flt-age">{t('overview.age')}</span>
      <div class="pills">
        <button type="button" aria-pressed={open === null} onclick={() => setOpen(null)}>{t('overview.all')}</button>
        {#each idx.films as f, i (f.id)}
          <button type="button" aria-pressed={open === i} onclick={() => setOpen(open === i ? null : i)}>{t('age.short', { age: f.age })}</button>
        {/each}
      </div>
    </div>
    <div class="ctl" role="group" aria-labelledby="flt-people">
      <span class="lbl" id="flt-people">{t('overview.people')}</span>
      <div class="pills">
        <button type="button" aria-pressed={picked.length === 0} onclick={clearPins}>{t('overview.all')}</button>
        {#each byGroup as { g, people: members } (g.id)}
          <span class="pgroup">
            {#each members as p (p.id)}
              <button type="button" aria-pressed={picked.includes(p.id)} onclick={() => togglePin(p.id)}>
                <i style:background={`var(${g.colorVar})`} aria-hidden="true"></i>{p.name}
              </button>
            {/each}
          </span>
        {/each}
      </div>
    </div>
    <div class="ctl" role="group" aria-labelledby="flt-theme">
      <span class="lbl" id="flt-theme">{t('overview.theme')}</span>
      <div class="pills">
        <button type="button" aria-pressed={!theme} onclick={() => setTheme(undefined)}>{t('overview.all')}</button>
        {#each DIM_KEYS as d (d)}
          <button type="button" aria-pressed={theme === d} onclick={() => setTheme(theme === d ? undefined : d)}>{t(`dim.${d}`)}</button>
        {/each}
      </div>
    </div>
  </div>
  <LifeChart {idx} {open} dim={theme} {picked} onopen={setOpen} onpin={togglePin} />
  <div class="legend">
    <span class="lbl">{t('overview.origin')}</span>
    <div class="keys">
      {#each idx.groups as g (g.id)}
        <span><i style:background={`var(${g.colorVar})`} aria-hidden="true"></i>{pick(g.name)}</span>
      {/each}
    </div>
    <span class="lbl">{t('overview.markers')}</span>
    <div class="keys">
      <span><i class="k-present" aria-hidden="true"></i>{t('legend.present')}</span>
      <span><i class="k-absent" aria-hidden="true"></i>{t('legend.absent')}</span>
      <span><i class="k-special" aria-hidden="true"></i>{t('legend.special')}</span>
      <span><span aria-hidden="true">†&nbsp;</span>{t('legend.death')}</span>
    </div>
  </div>
</section>

<style>
  h1 { font-size: 22px; margin: 0; }
  .lede { color: var(--ink2); margin: 0 0 6px; font-size: 14px; }
  /* Filters and legend share one layout: a label column, then the pills or keys. */
  .filters, .legend { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 3px 10px; align-items: baseline; }
  .filters { margin: 0 0 4px; font-size: 12px; }
  .ctl { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: baseline; }
  .lbl { color: var(--muted); }
  .pills { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 3px; }
  .pgroup { display: contents; }
  .pgroup > button:first-child { margin-left: 7px; }
  .pills button { font: inherit; color: var(--ink2); background: none; border: 1px solid transparent; border-radius: 999px; padding: 1px 7px; cursor: pointer; white-space: nowrap; }
  .pills button:hover { border-color: var(--axis); }
  .pills button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
  .pills button[aria-pressed='true'] { border-color: var(--ink); color: var(--ink); }
  .pills i, .keys i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: 0; }
  .legend { margin: 6px 0 0; font-size: 11px; }
  .keys { display: flex; flex-wrap: wrap; gap: 2px 14px; align-items: center; color: var(--ink2); }
  .keys i { width: 10px; height: 10px; margin-right: 6px; vertical-align: -1px; }
  .keys .k-present { background: var(--ink2); }
  .keys .k-absent { background: var(--surface); border: 1.5px solid var(--muted); }
  .keys .k-special { background: var(--surface); border: 1.5px solid var(--ink2); border-radius: 1px; transform: rotate(45deg) scale(0.85); }
</style>
