<script lang="ts">
  import { tick } from 'svelte'
  import Bi from '../components/Bi.svelte'
  import SourceList from '../components/SourceList.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { FilmId, PersonId, Question } from '../lib/data/types.ts'
  import { i18n, pick, t } from '../lib/i18n.svelte.ts'
  import { filterQuestions, relatedQuestions } from '../lib/questions.ts'
  import { navigate } from '../lib/router.svelte.ts'
  import { toHash } from '../lib/route.ts'

  let { idx, film, person, theme, q, open }: { idx: DataIndex; film?: FilmId; person?: PersonId; theme?: string; q?: string; open?: string } = $props()

  const BATCH = 50
  let f = $state<{ film?: FilmId; person?: PersonId; theme?: string; q: string }>({ q: '' })
  let expanded = $state(new Set<string>())
  let shown = $state(BATCH)
  $effect.pre(() => {
    f = { film, person, theme, q: q ?? '' }
    if (open) expanded = new Set([open])
  })

  const all = $derived(idx.ds.questions)
  const results = $derived(
    filterQuestions(all, {
      filmIds: f.film ? [f.film] : undefined,
      personIds: f.person ? [f.person] : undefined,
      themeIds: f.theme ? [f.theme] : undefined,
      query: f.q,
    }),
  )
  const limit = $derived.by(() => {
    const at = open ? results.findIndex((x) => x.id === open) : -1
    return Math.max(shown, at + 1)
  })
  const visible = $derived(results.slice(0, limit))

  function sync(replace = false) {
    shown = BATCH
    navigate({ name: 'questions', film: f.film, person: f.person, theme: f.theme, q: f.q || undefined }, { replace })
  }
  function toggle<K extends 'film' | 'person' | 'theme'>(k: K, v: NonNullable<(typeof f)[K]>) {
    f[k] = (f[k] === v ? undefined : v) as (typeof f)[K]
    sync()
  }
  function flip(id: string) {
    const s = new Set(expanded)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    expanded = s
  }
  const other = (x: Question) => (i18n.lang === 'zh' ? x.en : x.zh)
  const primary = (x: Question) => (i18n.lang === 'zh' ? x.zh : x.en)

  $effect(() => {
    if (!open) return
    tick().then(() => document.querySelector(`.qrow[data-q="${CSS.escape(open)}"]`)?.scrollIntoView({ block: 'center' }))
  })
</script>

<section class="qlib">
  <aside class="filters">
    <h1>{t('questions.title')}</h1>
    <p class="lede">{t('questions.lede')}</p>
    <h2>{t('questions.films')} <small>· {t('questions.coverage')}</small></h2>
    <div class="chips">
      {#each idx.films as fm (fm.id)}
        <button type="button" class="c" aria-pressed={f.film === fm.id} data-film-filter={fm.id} onclick={() => toggle('film', fm.id)}>
          {t('age.short', { age: fm.age })} <small class={`cov ${fm.transcriptCoverage}`}>{t(`coverage.${fm.transcriptCoverage}`)}</small>
        </button>
      {/each}
    </div>
    <h2>{t('questions.people')}</h2>
    <div class="chips">
      {#each idx.peopleOrdered as p (p.id)}
        <button type="button" class="c" aria-pressed={f.person === p.id} onclick={() => toggle('person', p.id)}>{p.name}</button>
      {/each}
    </div>
    {#if idx.themes.length}
      <h2>{t('questions.themes')}</h2>
      <div class="chips">
        {#each idx.themes as th (th.id)}
          <button type="button" class="c" aria-pressed={f.theme === th.id} onclick={() => toggle('theme', th.id)}>{pick(th.name)}</button>
        {/each}
      </div>
    {/if}
    {#if f.film || f.person || f.theme || f.q}
      <button type="button" class="clear" onclick={() => { f = { q: '' }; sync() }}>{t('questions.clear')}</button>
    {/if}
  </aside>

  <div class="list">
    <input class="search" type="search" placeholder={t('questions.search')} aria-label={t('questions.search')} bind:value={f.q} oninput={() => sync(true)} />
    <p class="count">{t('questions.count', { n: results.length })}</p>
    {#if results.length === 0}
      <p class="empty">{t('questions.empty')}</p>
    {/if}
    {#each visible as x (x.id)}
      {@const fm = idx.film(x.filmId)}
      {@const isOpen = expanded.has(x.id)}
      <article class="qrow" class:open={isOpen} data-q={x.id}>
        <button type="button" class="expand" aria-expanded={isOpen} onclick={() => flip(x.id)}>
          <span class="primary" lang={i18n.lang === 'zh' ? 'zh-CN' : 'en'}>{primary(x)}</span>
          <span class="secondary" lang={i18n.lang === 'zh' ? 'en' : 'zh-CN'}>{other(x)}</span>
        </button>
        <div class="tags">
          <span class="tag">{fm.title}</span>
          {#if x.personId}<a class="tag who" href={`#/person/${x.personId}`}>{idx.person(x.personId).name}</a>{:else}<span class="tag warn">{t('qa.filmOnly')}</span>{/if}
          {#if x.fromRecap}<span class="tag warn">{t('qa.fromRecap')}</span>{/if}
          {#each x.themeIds as tid (tid)}{@const th = idx.theme(tid)}{#if th}<span class="tag">{pick(th.name)}</span>{/if}{/each}
        </div>
        {#if isOpen}
          {@const rel = relatedQuestions(x, all)}
          <div class="detail">
            {#if x.answerSummary}<p><b>{t('qa.summary')}：</b><Bi text={x.answerSummary} /></p>{/if}
            {#if x.answerQuote}<p class="quote"><b>{t('qa.quote')}：</b>“<Bi text={x.answerQuote} original={x.answerQuote.en} />”</p>{/if}
            <SourceList {idx} ids={[x.sourceId]} locator={x.locator} />
            {#if rel.length}
              <h3>{t('questions.related')}</h3>
              <ul class="rel">
                {#each rel as r (r.id)}
                  <li><span class="age">{t('age.short', { age: idx.film(r.filmId).age })}</span> <a href={toHash({ name: 'questions', open: r.id })}>{primary(r)}</a></li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </article>
    {/each}
    {#if results.length > limit}
      <button type="button" class="more" onclick={() => (shown += BATCH)}>{t('questions.more', { n: results.length - limit })}</button>
    {/if}
  </div>
</section>

<style>
  .qlib { display: grid; grid-template-columns: 250px 1fr; gap: 24px; align-items: start; }
  .filters { position: sticky; top: 56px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .lede { color: var(--ink2); font-size: 13px; margin: 0 0 8px; }
  h2 { font-size: 12px; color: var(--muted); margin: 12px 0 4px; font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .c { font: inherit; font-size: 12px; border: 1px solid var(--axis); border-radius: 999px; padding: 1px 9px; background: var(--surface); color: var(--ink); cursor: pointer; }
  .c[aria-pressed='true'] { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .cov { font-size: 10px; color: var(--muted); }
  .c[aria-pressed='true'] .cov { color: inherit; }
  .clear, .more { font: inherit; font-size: 12px; margin-top: 12px; border: 1px solid var(--axis); background: var(--surface); color: var(--ink2); border-radius: 8px; padding: 4px 12px; cursor: pointer; }
  .search { width: 100%; font: inherit; border: 1px solid var(--axis); border-radius: 8px; padding: 7px 12px; background: var(--surface); color: var(--ink); }
  .count { font-size: 12px; color: var(--muted); margin: 6px 0; }
  .empty { color: var(--ink2); padding: 20px 0; }
  .qrow { border: 1px solid var(--grid); border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; background: var(--surface); }
  .qrow.open { border-color: var(--axis); }
  .expand { all: unset; display: block; cursor: pointer; width: 100%; }
  .expand:focus-visible { outline: 2px solid var(--ink); border-radius: 4px; }
  .primary { display: block; font-size: 15px; }
  .secondary { display: block; font-size: 13px; color: var(--ink2); }
  .tags { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { font-size: 11px; border: 1px solid var(--axis); border-radius: 999px; padding: 0 7px; color: var(--ink2); text-decoration: none; }
  .tag.warn { border-style: dashed; }
  .detail { margin-top: 8px; font-size: 13px; border-top: 1px solid var(--grid); padding-top: 6px; }
  .detail p { margin: 4px 0; }
  .quote { font-style: italic; color: var(--ink2); }
  h3 { font-size: 12px; color: var(--muted); margin: 10px 0 2px; }
  .rel { margin: 0; padding-left: 16px; }
  .rel .age { color: var(--muted); font-size: 12px; }
  @media (max-width: 760px) { .qlib { grid-template-columns: 1fr; } .filters { position: static; } }
</style>
