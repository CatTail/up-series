<script lang="ts">
  import CellText from '../components/CellText.svelte'
  import EditButton from '../components/EditButton.svelte'
  import Lifelines from '../components/Lifelines.svelte'
  import PersonStrip from '../components/PersonStrip.svelte'
  import QA from '../components/QA.svelte'
  import SourceList from '../components/SourceList.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { PersonId } from '../lib/data/types.ts'
  import { DIM_KEYS, NON_PARTICIPATING } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'
  import { toHash } from '../lib/route.ts'
  import { cellView } from '../lib/states.ts'

  let { idx, id }: { idx: DataIndex; id: PersonId } = $props()
  const person = $derived(idx.person(id))
  const group = $derived(idx.group(person.group))
  const final = $derived(idx.final(id))
  const qs = $derived(idx.questionsByPerson.get(id) ?? [])
</script>

<article>
  <PersonStrip {idx} current={id} />
  <header class="phead">
    <h1><span class="dot" style:background={`var(${group.colorVar})`}></span>{person.fullName}</h1>
    <span class="tag">{pick(group.name)}</span>
    {#if person.born}<span class="tag">{t('person.born', { date: person.born })}</span>{/if}
    {#if person.died}<span class="tag">{t('person.died', { date: person.died })}</span>{/if}
    <p class="bg">{pick(person.background)}<EditButton {idx} target={{ kind: 'person', person: id }} /></p>
    <SourceList {idx} ids={person.sourceIds} />
  </header>
  <Lifelines {idx} people={[person]} labels={false} ariaLabel={person.name} />

  {#each idx.films as f (f.id)}
    {@const p = person.participation[f.id]}
    {@const off = NON_PARTICIPATING.includes(p)}
    {@const note = person.participationNotes?.[f.id]}
    {@const fq = qs.filter((q) => q.filmId === f.id)}
    <section class="wave" class:off data-film={f.id}>
      <div class="age">{t('age.short', { age: f.age })}<small>{f.year} · {f.title}</small></div>
      <div>
        {#if p !== 'present'}
          <p class="status">{t(`status.${p}`)}{#if note}<span class="note">{t('p.open')}{pick(note)}{t('p.close')}</span>{/if}<EditButton {idx} target={{ kind: 'participation', person: id, film: f.id }} /></p>
        {/if}
        <div class="dims">
          {#each DIM_KEYS as d (d)}
            {@const c = cellView(idx, id, f.id, d)}
            {#if !off || c.kind === 'text'}
              <div class="dim" data-dim={d}>
                <span class="k">{t(`dim.${d}`)}</span>
                <CellText cell={c} />
                <EditButton {idx} target={{ kind: 'state', person: id, film: f.id, dim: d }} fill={c.kind === 'not_found'} />
                {#if c.kind === 'text'}
                  <div class="ev">
                    <SourceList {idx} ids={c.sourceIds} />
                    {#each c.questionIds ?? [] as qid (qid)}
                      <a class="qlink" href={toHash({ name: 'questions', open: qid })}>{t('person.evidence')} ↗</a>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
        {#each fq as q (q.id)}
          <QA {idx} {q} showQuote editable />
        {/each}
      </div>
    </section>
  {/each}

  <section class="final" data-final>
    <h2>{t('person.final')}</h2>
    {#if final}
      <p>{pick(final.text)} <small>{t('person.finalAsOf', { title: idx.film(final.asOfFilmId).title })}</small></p>
      <SourceList {idx} ids={final.sourceIds} />
    {:else}
      <p class="nf">{t('state.notFound')}</p>
    {/if}
    <EditButton {idx} target={{ kind: 'final', person: id }} fill={!final} />
  </section>
  {#if qs.length}
    <p><a href={toHash({ name: 'questions', person: id })}>{t('person.questions', { n: qs.length })}</a></p>
  {/if}
</article>

<style>
  .phead { display: flex; gap: 8px 12px; align-items: baseline; flex-wrap: wrap; margin-bottom: 6px; }
  h1 { margin: 0 8px 0 0; font-size: 24px; }
  .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
  .bg { flex-basis: 100%; margin: 2px 0 0; color: var(--ink2); max-width: 50em; }
  .tag { font-size: 12px; border: 1px solid var(--axis); border-radius: 999px; padding: 0 8px; color: var(--ink2); }
  .wave { display: grid; grid-template-columns: 110px 1fr; gap: 14px; border-top: 1px solid var(--grid); padding: 12px 0; }
  .wave.off { color: var(--ink2); }
  .age { font-weight: 700; font-size: 16px; }
  .age small { display: block; font-weight: 400; color: var(--muted); font-size: 12px; }
  .status { margin: 0 0 6px; font-weight: 600; color: var(--ink2); }
  .note { font-weight: 400; color: var(--muted); }
  .dims { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px; font-size: 13px; }
  .k { display: block; font-size: 11px; color: var(--muted); }
  .ev { display: flex; gap: 8px; flex-wrap: wrap; }
  .qlink { font-size: 11px; color: var(--ink2); }
  .final { border-top: 2px solid var(--ink); margin-top: 8px; padding-top: 10px; }
  .final h2 { font-size: 16px; margin: 0 0 4px; }
  .final small { color: var(--muted); }
  .nf { color: var(--muted); }
  @media (max-width: 640px) { .wave { grid-template-columns: 1fr; gap: 4px; } }
</style>
