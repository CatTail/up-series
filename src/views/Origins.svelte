<script lang="ts">
  import Bi from '../components/Bi.svelte'
  import SourceList from '../components/SourceList.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { Question } from '../lib/data/types.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'
  import { toHash } from '../lib/route.ts'

  let { idx }: { idx: DataIndex } = $props()
  const blocks = $derived(idx.ds.origins.blocks)
  const hero = $derived(blocks[0])
  const rest = $derived(blocks.slice(1))

  const byTheme = $derived.by(() => {
    const m = new Map<string, Question[]>()
    for (const q of idx.ds.questions) for (const th of q.themeIds) m.set(th, [...(m.get(th) ?? []), q])
    return m
  })
  // Representative question: prefer one put to a named person with an answer summary.
  const example = (id: string) => {
    const qs = [...(byTheme.get(id) ?? [])].sort((a, b) => a.filmId.localeCompare(b.filmId) || a.id.localeCompare(b.id))
    return qs.find((q) => q.attribution === 'confirmed' && q.answerSummary) ?? qs[0]
  }
</script>

<section class="origins">
  <p class="kicker">{t('origins.kicker')}</p>
  {#if hero}
    <blockquote class="hero" data-block={hero.id}>
      <p class="quote">“<Bi text={hero.text} original={hero.text.en} />”</p>
      {#if hero.cite}<footer>— <Bi text={hero.cite} /></footer>{/if}
      <SourceList {idx} ids={hero.sourceIds} />
    </blockquote>
  {/if}

  <div class="blocks">
    {#each rest as b (b.id)}
      <div class={`block ${b.kind}`} data-block={b.id}>
        {#if b.kind === 'interpretation'}<span class="badge">{t('badge.interpretation')}</span>{/if}
        {#if b.kind === 'quote'}
          <blockquote>“<Bi text={b.text} original={b.text.en} />”{#if b.cite}<footer>— <Bi text={b.cite} /></footer>{/if}</blockquote>
        {:else}
          <p><Bi text={b.text} /></p>
        {/if}
        <SourceList {idx} ids={b.sourceIds} />
      </div>
    {/each}
  </div>

  <h2>{t('origins.films')}</h2>
  <ol class="strip">
    {#each idx.films as f (f.id)}
      <li class="film">
        <b>{t('age.short', { age: f.age })}</b>
        <span>{f.year}</span>
        <span class="title">{f.title}</span>
        <span class="dir">{f.director}</span>
      </li>
    {/each}
  </ol>

  {#if idx.themes.length}
    <h2>{t('origins.themesTitle')}</h2>
    <p class="lede">{t('origins.themesLede')}</p>
    <div class="themes">
      {#each idx.themes as th (th.id)}
        {@const ex = example(th.id)}
        <article class="theme" data-theme={th.id}>
          <header>
            <h3>{pick(th.name)}</h3>
            <span class="badge" class:interp={th.intentKind === 'interpretation'}>{t(th.intentKind === 'sourced' ? 'badge.sourced' : 'badge.interpretation')}</span>
          </header>
          <p class="intent"><Bi text={th.intent} /></p>
          {#if th.sourceIds.length}<SourceList {idx} ids={th.sourceIds} />{/if}
          {#if ex}
            <p class="ex"><span class="muted">{t('origins.example')}（{idx.film(ex.filmId).title}）：</span><Bi text={{ zh: ex.zh, en: ex.en }} original={ex.en} /></p>
          {/if}
          <a class="open" href={toHash({ name: 'questions', theme: th.id })}>{t('origins.count', { n: byTheme.get(th.id)?.length ?? 0 })} →</a>
        </article>
      {/each}
    </div>
  {/if}

  <p class="cta"><a href="#/overview">{t('origins.cta')}</a></p>
</section>

<style>
  .kicker { color: var(--muted); font-size: 13px; margin: 0 0 6px; }
  .hero { margin: 0 0 18px; }
  .hero .quote { font-size: 26px; font-weight: 600; line-height: 1.35; margin: 0 0 4px; max-width: 30em; }
  footer { color: var(--ink2); font-size: 13px; }
  .blocks { display: grid; gap: 12px; max-width: 46em; }
  .block p { margin: 0; }
  .block blockquote { margin: 0; padding-left: 12px; border-left: 3px solid var(--axis); font-size: 16px; }
  .block.interpretation { background: var(--page); border: 1px dashed var(--axis); border-radius: 8px; padding: 8px 12px; }
  .badge { display: inline-block; font-size: 11px; border: 1px solid var(--ink2); color: var(--ink2); border-radius: 999px; padding: 0 7px; margin-bottom: 4px; }
  .badge.interp { border-style: dashed; }
  h2 { font-size: 17px; margin: 28px 0 8px; }
  .lede { color: var(--ink2); font-size: 14px; margin: -2px 0 10px; max-width: 46em; }
  .strip { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .film { background: var(--surface); border: 1px solid var(--grid); border-radius: 6px; padding: 6px 4px; text-align: center; font-size: 11px; display: flex; flex-direction: column; }
  .film b { font-size: 14px; }
  .film .title { color: var(--ink2); }
  .film .dir { color: var(--muted); }
  .themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
  .theme { background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
  .theme header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  h3 { font-size: 15px; margin: 0; }
  .intent, .ex { margin: 0; }
  .muted { color: var(--muted); }
  .open { margin-top: auto; font-size: 12px; color: var(--ink2); }
  .cta { margin-top: 24px; font-size: 15px; }
  @media (max-width: 760px) { .strip { grid-template-columns: repeat(5, 1fr); } }
</style>
