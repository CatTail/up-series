<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { DimKey, PersonId } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'
  import { toHash } from '../lib/route.ts'
  import { nodeState, statusMarks } from '../lib/states.ts'
  import { lensColumns, lensRow, lifelineTopology } from '../lib/viz/lifeline.ts'
  import CellText from './CellText.svelte'
  import EditButton from './EditButton.svelte'
  import Marks from './Marks.svelte'
  import SourceList from './SourceList.svelte'

  let {
    idx,
    open = null,
    dim,
    picked = [],
    onopen,
    onpin,
  }: {
    idx: DataIndex
    /** Index of the open age column, or null. */
    open?: number | null
    dim?: DimKey
    picked?: PersonId[]
    onopen: (i: number | null) => void
    onpin: (id: PersonId) => void
  } = $props()

  const films = $derived(idx.films)
  const cols = $derived(lensColumns(films.length, open))
  const template = $derived(cols.widths.map((w) => `${w}%`).join(' '))
  const topo = $derived(new Map(idx.peopleOrdered.map((p) => [p.id, lifelineTopology(p, idx.films)])))
  const pinned = $derived(new Set(picked))
  /** Selected people first (in the order they were picked), then everyone else by origin group. */
  const rows = $derived.by(() => {
    const rest = idx.peopleOrdered.filter((p) => !pinned.has(p.id))
    return [
      ...picked.map((id) => ({ p: idx.person(id), pinned: true, first: true, gap: false })),
      ...rest.map((p, n) => {
        const first = n === 0 || rest[n - 1].group !== p.group
        return { p, pinned: false, first, gap: first && (n > 0 || picked.length > 0) }
      }),
    ]
  })
  /**
   * A card sits where a selected person meets the selected age; an empty side means "all".
   * Nothing selected at all leaves just the lines.
   */
  const hasCard = (pid: PersonId, i: number) => (picked.length === 0 || pinned.has(pid)) && (open === null ? picked.length > 0 : i === open)

  let expanded = $state<string | null>(null)
  let tip = $state<{ pid: PersonId; i: number; x: number; below: boolean } | null>(null)
  let axis = $state<HTMLElement>()

  const ageLabel = (i: number) => t('overview.ageLabel', { age: films[i].age, year: films[i].year, title: films[i].title })
  const nodeLabel = (pid: PersonId, i: number) => {
    const p = idx.person(pid)
    return `${p.name} · ${ageLabel(i)} · ${t(`status.${p.participation[films[i].id]}`)}`
  }
  const nodeText = (pid: PersonId, i: number) => {
    const v = nodeState(idx, pid, films[i].id, dim)
    const d = v.kind === 'text' ? (v.dim ?? dim) : dim
    const label = d ? `${t(`dim.${d}`)}${t('p.colon')}` : ''
    if (v.kind === 'text') return label + pick(v.text)
    if (v.kind === 'not_found') return label + t('state.notFound')
    if (v.kind === 'not_applicable') return label + pick(v.reason)
    return v.note ? pick(v.note) : ''
  }
  const filmQuestions = (pid: PersonId, i: number) => (idx.questionsByPerson.get(pid) ?? []).filter((q) => q.filmId === films[i].id).length

  function key(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = Math.max(0, Math.min(films.length - 1, (open ?? i) + (e.key === 'ArrowRight' ? 1 : -1)))
    onopen(next)
    axis?.querySelectorAll<HTMLButtonElement>('button.age')[next]?.focus()
  }
</script>

<div class="scroll">
  <div class="chart" role="group" aria-label={t('overview.lifelineAria')}>
    {#if open !== null}
      <span
        class="band"
        aria-hidden="true"
        style:left={`calc(var(--name) + (100% - var(--name)) * ${cols.lefts[open] / 100})`}
        style:width={`calc((100% - var(--name)) * ${cols.widths[open] / 100})`}
      ></span>
    {/if}
    <div class="axis-row">
      <span></span>
      <div class="axis" style:grid-template-columns={template} bind:this={axis}>
        {#each films as f, i (f.id)}
          <button
            type="button"
            class="age"
            class:open={open === i}
            data-age={f.age}
            aria-pressed={open === i}
            title={open === i ? t('overview.closeAge') : t('overview.openAge', { age: f.age })}
            onclick={() => onopen(open === i ? null : i)}
            onkeydown={(e) => key(e, i)}
          >
            {#if open === i}{ageLabel(i)}<span class="x" aria-hidden="true">✕</span>{:else}{t('age.short', { age: f.age })}{/if}
          </button>
        {/each}
      </div>
    </div>

    {#each rows as r, n (r.p.id)}
      {@const p = r.p}
      {@const L = lensRow(topo.get(p.id)!, cols, (i) => hasCard(p.id, i))}
      {@const di = topo.get(p.id)!.death?.i}
      <div
        class="row"
        class:pinned={r.pinned}
        class:gap={r.gap}
        class:rest={picked.length > 0 && !r.pinned}
        data-person={p.id}
        data-group={p.group}
        style:--c={`var(${idx.group(p.group).colorVar})`}
        animate:flip={{ duration: 250 }}
      >
        <div class="name">
          {#if r.first}<i class="strip" aria-hidden="true"></i>{/if}
          <button type="button" class="who" aria-pressed={r.pinned} title={t('overview.pinHint')} onclick={() => onpin(p.id)}>{p.name}</button>
        </div>
        <div class="track" style:grid-template-columns={template}>
          {#each L.segments as s (s.key)}
            <span class="seg" class:faded={s.style === 'faded'} data-style={s.style} style:left={`${s.x}%`} style:width={`${s.w}%`} aria-hidden="true"></span>
          {/each}
          {#if L.death && di !== undefined && !(hasCard(p.id, di) && hasCard(p.id, di + 1))}
            <span class="tick" style:left={`${L.death.x}%`} aria-hidden="true"></span>
            <!-- keep the label off a neighbouring card -->
            <span class="dlabel" class:after={hasCard(p.id, di)} class:before={hasCard(p.id, di + 1)} style:left={`${L.death.x}%`}>{L.death.label}</span>
          {/if}
          {#each films as f, i (f.id)}
            {#if hasCard(p.id, i)}
              {@const v = nodeState(idx, p.id, f.id, dim)}
              {@const k = `${p.id}/${f.id}`}
              <div class="card" class:off={v.kind === 'participation'} class:wide={open === i} class:expanded={expanded === k} style:grid-column={i + 1} data-card={k}>
                <button type="button" class="cbody" aria-expanded={expanded === k} onclick={() => (expanded = expanded === k ? null : k)}>
                  {#if !dim && v.kind === 'text' && v.dim}<span class="dimlbl">{t(`dim.${v.dim}`)}</span>{/if}
                  <Marks marks={statusMarks(idx, p.id, f.id)} />
                  <CellText cell={v} withNote={open === i || expanded === k} />
                </button>
                {#if expanded === k}
                  {@const nq = filmQuestions(p.id, i)}
                  <div class="more">
                    {#if v.kind === 'text'}<SourceList {idx} ids={v.sourceIds} />{:else if v.kind === 'participation' && v.note}<SourceList {idx} ids={p.sourceIds} />{/if}
                    <a href={`#/person/${p.id}`}>{t('overview.openPerson', { name: p.name })}</a>
                    {#if nq > 0}<a href={toHash({ name: 'questions', film: f.id, person: p.id })}>{t('overview.filmQuestions', { n: nq })}</a>{/if}
                    {#if v.kind === 'participation'}
                      <EditButton {idx} target={{ kind: 'participation', person: p.id, film: f.id }} />
                    {:else if v.kind === 'text' ? (v.dim ?? dim) : dim}
                      <EditButton {idx} target={{ kind: 'state', person: p.id, film: f.id, dim: (v.kind === 'text' ? (v.dim ?? dim) : dim)! }} fill={v.kind === 'not_found'} />
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
          {#each L.markers as m (m.filmId)}
            <button
              type="button"
              tabindex="-1"
              class="node {m.kind}"
              data-node={`${p.id}/${m.filmId}`}
              data-marker={m.kind}
              style:left={`${m.x}%`}
              aria-label={nodeLabel(p.id, m.i)}
              onclick={() => onopen(m.i)}
              onmouseenter={() => (tip = hasCard(p.id, m.i) ? null : { pid: p.id, i: m.i, x: m.x, below: n < 2 })}
              onmouseleave={() => (tip = null)}
            ></button>
          {/each}
          {#if tip && tip.pid === p.id}
            {@const text = nodeText(p.id, tip.i)}
            <div class="tip" class:below={tip.below} class:left={tip.x < 25} class:right={tip.x > 75} role="tooltip" style:left={`${tip.x}%`}>
              <b>{nodeLabel(p.id, tip.i)}</b>
              {#if text}<span>{text}</span>{/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .scroll { overflow-x: auto; }
  .chart { --name: 112px; position: relative; min-width: 760px; padding-bottom: 4px; }
  .band { position: absolute; top: 0; bottom: 0; background: var(--ink); opacity: 0.04; border-radius: 8px; pointer-events: none; }
  .axis-row, .row { display: grid; grid-template-columns: var(--name) minmax(0, 1fr); }
  .axis, .track { display: grid; }
  .age {
    all: unset; box-sizing: border-box; min-width: 0; text-align: center; font-size: 11px; color: var(--muted); padding: 3px 2px;
    border: 1px solid transparent; border-radius: 999px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .age:hover { color: var(--ink); border-color: var(--axis); }
  .age:focus-visible { outline: 2px solid var(--ink); outline-offset: 0; }
  .age.open { color: var(--ink); font-weight: 600; font-size: 12px; }
  .x { margin-left: 6px; color: var(--muted); font-weight: 400; font-size: 10px; }

  .row { position: relative; min-height: 24px; transition: opacity 0.15s; }
  .row.gap { margin-top: 8px; }
  .row.pinned + .row:not(.pinned) { margin-top: 12px; }
  /* People outside the selection are context: fainter and a little shorter, still clickable. */
  .row.rest { opacity: 0.45; }
  .row.rest, .row.rest .track { min-height: 20px; }
  .row.rest:hover, .row.rest:focus-within { opacity: 1; }
  .name { position: relative; display: flex; align-items: center; gap: 5px; padding-left: 6px; font-size: 13px; min-width: 0; }
  .who {
    all: unset; box-sizing: border-box; max-width: 100%; padding: 0 8px; border: 1px solid transparent; border-radius: 999px;
    color: var(--ink); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .who:hover { border-color: var(--axis); }
  .who:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
  .who[aria-pressed='true'] { border-color: var(--ink); font-weight: 600; }
  .strip { position: absolute; left: 0; top: 50%; width: 4px; height: 12px; margin-top: -6px; border-radius: 2px; background: var(--c); }

  .track { position: relative; align-items: center; min-height: 24px; }
  .seg { position: absolute; top: 50%; height: 2px; margin-top: -1px; border-radius: 1px; background: var(--c); pointer-events: none; }
  .seg.faded { opacity: 0.28; }
  .tick { position: absolute; top: 50%; width: 1.5px; height: 10px; margin: -5px 0 0 -0.75px; background: var(--ink2); }
  /* Sits above the markers (radius 7 with the ring), so it never covers the next node. */
  .dlabel { position: absolute; bottom: calc(50% + 7px); transform: translateX(-50%); font-size: 10px; line-height: 1; color: var(--ink2); white-space: nowrap; pointer-events: none; }

  .dlabel.after { transform: translateX(2px); }
  .dlabel.before { transform: translateX(calc(-100% - 2px)); }

  .node {
    position: absolute; top: 50%; z-index: 2; box-sizing: content-box; width: 10px; height: 10px; padding: 0; margin: 0;
    border: 2px solid var(--surface); border-radius: 50%; background: var(--c); transform: translate(-50%, -50%); cursor: pointer;
  }
  .node::before { content: ''; position: absolute; inset: -7px; border-radius: 50%; }
  .node.absent { width: 7px; height: 7px; border: 1.5px solid var(--muted); background: var(--surface); }
  .node.special { width: 7px; height: 7px; border: 2px solid var(--c); border-radius: 1px; background: var(--surface); transform: translate(-50%, -50%) rotate(45deg); }

  .card {
    grid-row: 1; position: relative; z-index: 1; min-width: 0; margin: 2px 2px; padding: 2px 5px 2px 8px;
    background: var(--surface); border: 1px solid var(--grid); border-radius: 6px; font-size: 11px; line-height: 1.4; color: var(--ink);
  }
  .card.wide { margin: 1px 0; padding: 2px 10px 2px 11px; font-size: 12px; line-height: 1.35; }
  .card:hover { border-color: var(--axis); }
  .card.off { background: var(--page); border-style: dashed; color: var(--ink2); }
  .cbody {
    all: unset; box-sizing: border-box; width: 100%; cursor: pointer; overflow: hidden; overflow-wrap: anywhere;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; line-clamp: 6;
  }
  .card.wide .cbody { -webkit-line-clamp: 3; line-clamp: 3; }
  .card.expanded .cbody { display: block; -webkit-line-clamp: unset; line-clamp: unset; }
  .cbody:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .dimlbl { margin-right: 6px; font-size: 10.5px; color: var(--muted); }
  .more { display: flex; flex-wrap: wrap; gap: 2px 10px; padding: 2px 0 2px; font-size: 11px; }
  .more a { color: var(--ink2); }

  .tip {
    position: absolute; z-index: 30; bottom: calc(50% + 11px); transform: translateX(-50%); width: max-content; max-width: 280px;
    pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--axis); border-radius: 6px;
    padding: 4px 8px; font-size: 12px; line-height: 1.4; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .tip.below { bottom: auto; top: calc(50% + 11px); }
  .tip.left { transform: translateX(-12px); }
  .tip.right { transform: translateX(calc(-100% + 12px)); }
  .tip b { display: block; font-weight: 600; }

  .axis, .track { transition: grid-template-columns 0.25s ease; }
  .band, .seg, .node, .tick, .dlabel { transition: left 0.25s ease, width 0.25s ease; }
  @media (prefers-reduced-motion: reduce) {
    .axis, .track, .band, .seg, .node, .tick, .dlabel, .row { transition: none; }
  }
</style>
