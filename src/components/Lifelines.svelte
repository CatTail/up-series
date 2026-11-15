<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { GroupId, Person, PersonId } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'
  import { layoutLifelines } from '../lib/viz/lifeline.ts'

  let {
    idx,
    people,
    cursor = null,
    highlight = null,
    revealUpTo = 9,
    labels = true,
    ariaLabel,
  }: {
    idx: DataIndex
    people: Person[]
    cursor?: number | null
    highlight?: GroupId | null
    revealUpTo?: number
    labels?: boolean
    ariaLabel?: string
  } = $props()

  const W = 980
  const L = $derived(
    layoutLifelines(people, idx.films, idx.groups, { width: W, labelWidth: labels ? 140 : 36, rowHeight: 26, groupGap: 14, top: 26 }),
  )
  const filmIndex = $derived(new Map(idx.films.map((f, i) => [f.id, i])))
  const color = (g: GroupId) => `var(${idx.group(g).colorVar})`
  const firstOfGroup = $derived(new Set(L.rows.filter((r, i) => i === 0 || L.rows[i - 1].groupId !== r.groupId).map((r) => r.personId)))

  let tip = $state<{ personId: PersonId; i: number; x: number; y: number } | null>(null)
  const tipText = $derived.by(() => {
    if (!tip) return ''
    const p = idx.person(tip.personId)
    const f = idx.films[tip.i]
    return `${p.name} · ${t('overview.ageLabel', { age: f.age, year: f.year, title: f.title })} · ${t(`status.${p.participation[f.id]}`)}`
  })
  const lastFilm = $derived(idx.films[idx.films.length - 1])
</script>

<div class="lifelines">
  <div class="scroll">
    <div class="canvas">
      <svg viewBox={`0 0 ${W} ${L.height}`} width="100%" role="img" aria-label={ariaLabel ?? t('overview.lifelineAria')}>
        {#each idx.films as f, i (f.id)}
          <line class="grid" x1={L.xOf(i)} x2={L.xOf(i)} y1={16} y2={L.height - 6} />
          <text class="axis" x={L.xOf(i)} y={12} text-anchor="middle">{t('age.short', { age: f.age })}</text>
        {/each}
        {#if cursor !== null}
          <rect class="cursor" x={L.xOf(cursor) - 15} y={16} width={30} height={L.height - 20} rx={6} />
        {/if}
        {#each L.rows as r (r.personId)}
          {@const c = color(r.groupId)}
          {@const person = idx.person(r.personId)}
          <g class="row" data-person={r.personId} data-group={r.groupId} opacity={highlight && highlight !== r.groupId ? '0.25' : '1'}>
            {#if labels && firstOfGroup.has(r.personId)}
              <rect x={4} y={r.y - 6} width={4} height={12} rx={2} fill={c} />
            {/if}
            {#if labels}
              <a href={`#/person/${r.personId}`} data-person-link={r.personId}>
                <text class="name" x={L.xOf(0) - 18} y={r.y + 4} text-anchor="end">{person.name}</text>
              </a>
            {/if}
            {#each r.segments as s (`${s.from}-${s.x1}`)}
              {#if (filmIndex.get(s.to) ?? 0) <= revealUpTo}
                <line class="seg" x1={s.x1} x2={s.x2} y1={r.y} y2={r.y} stroke={c} opacity={s.style === 'faded' ? 0.28 : 1} data-seg={`${r.personId}/${s.from}`} data-style={s.style} />
              {/if}
            {/each}
            {#each r.markers as m (m.filmId)}
              {@const i = filmIndex.get(m.filmId) ?? 0}
              {#if i <= revealUpTo}
                {#if m.kind === 'present'}
                  <circle class="mk" cx={m.x} cy={r.y} r={5} fill={c} data-marker={m.kind} />
                {:else if m.kind === 'absent'}
                  <circle class="mk hollow" cx={m.x} cy={r.y} r={4} data-marker={m.kind} />
                {:else}
                  <rect class="mk special" x={m.x - 5} y={r.y - 5} width={10} height={10} transform={`rotate(45 ${m.x} ${r.y})`} style:stroke={c} data-marker={m.kind} />
                {/if}
                <circle
                  class="hit"
                  role="presentation"
                  cx={m.x}
                  cy={r.y}
                  r={11}
                  data-hit={`${r.personId}/${m.filmId}`}
                  onmouseenter={() => (tip = { personId: r.personId, i, x: m.x, y: r.y })}
                  onmouseleave={() => (tip = null)}
                />
              {/if}
            {/each}
            {#if r.death && revealUpTo >= idx.films.length - 1}
              <line class="tick" x1={r.death.x} x2={r.death.x} y1={r.y - 5} y2={r.y + 5} />
              <text class="note" x={r.death.x + 4} y={r.y - 7}>{r.death.label}</text>
            {/if}
            {#if revealUpTo >= idx.films.length - 1}
              {@const pLast = person.participation[lastFilm.id]}
              {#if pLast === 'audio_only' || pLast === 'archival_interview'}
                <text class="note" x={L.xOf(idx.films.length - 1) + 14} y={r.y + 4}>{t(`mark.${pLast}`)}</text>
              {/if}
            {/if}
          </g>
        {/each}
      </svg>
      {#if tip}
        <div class="tip" role="tooltip" style:left={`${(tip.x / W) * 100}%`} style:top={`${(tip.y / L.height) * 100}%`}>{tipText}</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .scroll { overflow-x: auto; }
  .canvas { position: relative; min-width: 720px; }
  svg { display: block; font-family: inherit; }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .axis { font-size: 11px; fill: var(--muted); }
  .cursor { fill: var(--ink); opacity: 0.06; }
  .name { font-size: 13px; fill: var(--ink); }
  a:hover .name, a:focus .name { text-decoration: underline; }
  .seg { stroke-width: 2; stroke-linecap: round; }
  .mk { stroke: var(--surface); stroke-width: 2; }
  .mk.hollow { fill: var(--surface); stroke: var(--muted); stroke-width: 1.5; }
  rect.mk.special { fill: var(--surface); stroke-width: 2; }
  .hit { fill: transparent; cursor: default; }
  .tick { stroke: var(--ink2); stroke-width: 1.5; }
  .note { font-size: 11px; fill: var(--ink2); }
  .row { transition: opacity 0.15s; }
  .tip {
    position: absolute; transform: translate(-50%, calc(-100% - 12px)); pointer-events: none; white-space: nowrap;
    background: var(--surface); color: var(--ink); border: 1px solid var(--axis); border-radius: 6px; padding: 4px 8px; font-size: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
</style>
