<script lang="ts">
  import CellText from '../components/CellText.svelte'
  import Marks from '../components/Marks.svelte'
  import SourceList from '../components/SourceList.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { PersonId } from '../lib/data/types.ts'
  import { DIM_KEYS } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'
  import { navigate } from '../lib/router.svelte.ts'
  import { cellView, statusMarks } from '../lib/states.ts'

  let { idx, a, b }: { idx: DataIndex; a?: PersonId; b?: PersonId } = $props()
  const all = $derived(idx.peopleOrdered)
  let sa = $state<PersonId | undefined>()
  let sb = $state<PersonId | undefined>()
  $effect.pre(() => {
    sa = a
    sb = b
  })
  const pa = $derived(sa ?? (all[0]?.id === sb ? all[1]?.id : all[0]?.id))
  const pb = $derived(sb && sb !== pa ? sb : all.find((p) => p.id !== pa)?.id)
  const pair = $derived([pa, pb].filter((x): x is PersonId => !!x).map((id) => idx.person(id)))
  let open = $state<string | null>(null)

  function pick(side: 'a' | 'b', id: PersonId) {
    open = null
    if (side === 'a') sa = id
    else sb = id
    navigate({ name: 'compare', a: side === 'a' ? id : pa, b: side === 'b' ? id : pb })
  }
</script>

<section>
  <h1>{t('compare.title')}</h1>
  <p class="lede">{t('compare.lede')}</p>
  <div class="sel">
    <label>
      <span class="vh">{t('compare.pickA')}</span>
      <select aria-label={t('compare.pickA')} value={pa} onchange={(e) => pick('a', e.currentTarget.value as PersonId)}>
        {#each all.filter((p) => p.id !== pb) as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
    </label>
    <span>{t('compare.vs')}</span>
    <label>
      <span class="vh">{t('compare.pickB')}</span>
      <select aria-label={t('compare.pickB')} value={pb} onchange={(e) => pick('b', e.currentTarget.value as PersonId)}>
        {#each all.filter((p) => p.id !== pa) as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
    </label>
  </div>
  <div class="wrap">
    <table>
      <thead>
        <tr><th class="r"></th>{#each idx.films as f (f.id)}<th>{t('age.short', { age: f.age })}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each DIM_KEYS as d (d)}
          {#each pair as p, j (p.id)}
            <tr data-dim={d} data-person={p.id} class:first={j === 0}>
              <th class="r">
                {#if j === 0}<span class="dim">{t(`dim.${d}`)}</span>{/if}
                <a href={`#/person/${p.id}`} class="who"><i style:background={`var(${idx.group(p.group).colorVar})`}></i>{p.name}</a>
              </th>
              {#each idx.films as f (f.id)}
                {@const c = cellView(idx, p.id, f.id, d)}
                {@const key = `${p.id}/${f.id}/${d}`}
                <td class:off={c.kind === 'participation'} class:open={open === key}>
                  <button type="button" onclick={() => (open = open === key ? null : key)} aria-expanded={open === key}>
                    <Marks marks={statusMarks(idx, p.id, f.id)} />
                    <CellText cell={c} withNote={open === key} />
                  </button>
                  {#if open === key && c.kind === 'text'}<SourceList {idx} ids={c.sourceIds} />{:else if open === key && c.kind === 'participation' && c.note}<SourceList {idx} ids={p.sourceIds} />{/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  h1 { font-size: 22px; margin: 0 0 4px; }
  .lede { color: var(--ink2); margin: 0 0 10px; }
  .sel { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
  select { font: inherit; border: 1px solid var(--axis); border-radius: 8px; padding: 3px 8px; background: var(--surface); color: var(--ink); }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .wrap { overflow-x: auto; }
  table { border-collapse: separate; border-spacing: 3px; width: 100%; min-width: 900px; table-layout: fixed; font-size: 11px; }
  th { color: var(--ink2); font-weight: 600; }
  th.r { text-align: left; width: 110px; vertical-align: top; }
  tr.first th.r { padding-top: 8px; }
  .dim { display: block; color: var(--ink); }
  .who { color: var(--ink2); text-decoration: none; font-weight: 400; }
  .who i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
  td { background: var(--surface); border: 1px solid var(--grid); border-radius: 4px; padding: 0; vertical-align: top; }
  td.off { background: var(--page); border-style: dashed; color: var(--muted); }
  td button { all: unset; display: block; box-sizing: border-box; width: 100%; min-height: 32px; padding: 3px 5px; cursor: pointer; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }
  td.open button { -webkit-line-clamp: unset; line-clamp: unset; }
  td button:focus-visible { outline: 2px solid var(--ink); }
  td :global(.src) { display: block; padding: 0 5px 4px; }
</style>
