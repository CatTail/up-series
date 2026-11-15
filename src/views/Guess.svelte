<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import Bi from '../components/Bi.svelte'
  import Lifelines from '../components/Lifelines.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import { ensureGame, guess, newGame, nextRound } from '../lib/guess-store.svelte.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'

  let { idx, seed }: { idx: DataIndex; seed?: number } = $props()

  untrack(() => ensureGame(idx, seed))
  const s = $derived(guess.s!)
  const game = $derived(s.game)
  const round = $derived(s.round)
  const last = $derived(idx.films.length - 1)
  let timer: ReturnType<typeof setInterval> | undefined

  function stop() {
    if (timer) clearInterval(timer)
    timer = undefined
  }
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function choose(k: number) {
    s.chosen = k
  }
  function doReveal() {
    if (!round || s.chosen === null || s.revealed) return
    s.revealed = true
    game.answers.push({ personId: round.personId, chosen: s.chosen, correct: s.chosen === round.correct })
    if (reducedMotion()) {
      s.reveal = last
      return
    }
    s.reveal = 0
    timer = setInterval(() => {
      s.reveal += 1
      if (s.reveal >= last) stop()
    }, 300)
  }
  function next() {
    stop()
    nextRound(idx)
  }
  function again() {
    stop()
    newGame(idx)
  }
  onDestroy(() => {
    stop()
    // leaving mid-animation: show the full line when coming back
    if (guess.s?.revealed) guess.s.reveal = last
  })

  const score = $derived(game.answers.filter((a) => a.correct).length)
  const person = $derived(round ? idx.person(round.personId) : null)
  const lastFilm = $derived(idx.films[idx.films.length - 1])
  const chosen = $derived(s.chosen)
  const revealed = $derived(s.revealed)
  const reveal = $derived(s.reveal)
</script>

<section>
  <h1>{t('guess.title')}</h1>
  <p class="lede">{t('guess.lede')}</p>

  {#if round && person}
    <div class="guess">
      <div class="gcard">
        <div class="muted">{t('guess.progress', { i: game.i + 1, n: game.order.length })}</div>
        <h2>{t('guess.child')}</h2>
        <p class="tags">
          <span class="tag"><i style:background={`var(${idx.group(round.groupId).colorVar})`}></i>{pick(idx.group(round.groupId).name)}</span>
          <span class="tag">{pick(round.background)}</span>
        </p>
        {#if round.prompt}
          <div class="qa">
            <div class="muted">{t('guess.prompt')}</div>
            <div><b>{t('qa.q')}{t('p.colon')}</b><Bi text={{ zh: round.prompt.zh, en: round.prompt.en }} original={round.prompt.en} /></div>
            {#if round.prompt.answerQuote}<div><b>{t('qa.a')}{t('p.colon')}</b>“<Bi text={round.prompt.answerQuote} original={round.prompt.answerQuote.en} />”</div>{/if}
          </div>
        {:else}
          <p class="muted">{t('guess.noPrompt')}</p>
        {/if}
        {#if !revealed}<p class="muted small">{t('guess.hiddenName')}</p>{/if}
      </div>

      <div class="gcard">
        <h2>{t('guess.question')}</h2>
        <div class="opts" role="radiogroup" aria-label={t('guess.question')}>
          {#each round.options as o, k (o.personId)}
            <button
              type="button"
              class="opt"
              role="radio"
              aria-checked={chosen === k}
              data-person={o.personId}
              class:right={revealed && k === round.correct}
              class:wrong={revealed && k === chosen && k !== round.correct}
              disabled={revealed}
              onclick={() => choose(k)}
            >
              <Bi text={o.text} />
              {#if revealed}<small class="who">— {idx.person(o.personId).name}</small>{/if}
            </button>
          {/each}
        </div>
        {#if !revealed}
          <button type="button" class="btn" disabled={chosen === null} onclick={doReveal}>{t('guess.reveal')}</button>
        {:else}
          <div class="result" data-person={person.id}>
            <p class="verdict">{chosen === round.correct ? t('guess.right') : t('guess.wrong')} · {t('guess.answer', { name: person.fullName })}</p>
            {#if round.asOf !== lastFilm.id || round.lastParticipation !== 'present'}
              <p class="muted small">{t('guess.asOf', { title: idx.film(round.asOf).title, status: t(`status.${round.lastParticipation}`) })}</p>
            {/if}
            <Lifelines {idx} people={[person]} labels={false} revealUpTo={reveal} ariaLabel={person.name} />
            <a class="profile" href={`#/person/${person.id}`}>{t('guess.profile', { name: person.name })}</a>
            <button type="button" class="btn" onclick={next}>{t('guess.next')}</button>
          </div>
        {/if}
        <p class="score">{t('guess.score', { n: game.answers.length, k: score })}</p>
      </div>
    </div>
  {:else}
    <div class="summary gcard">
      <h2>{t('guess.done', { n: game.answers.length, k: score })}</h2>
      <p>{t('guess.doneSub')}</p>
      <ul>
        {#each game.answers as a (a.personId)}
          <li><a href={`#/person/${a.personId}`}>{idx.person(a.personId).name}</a> · {a.correct ? t('guess.right') : t('guess.wrong')}</li>
        {/each}
      </ul>
      <button type="button" class="btn" onclick={again}>{t('guess.again')}</button>
    </div>
  {/if}
</section>

<style>
  h1 { font-size: 22px; margin: 0 0 4px; }
  .lede { color: var(--ink2); margin: 0 0 12px; max-width: 46em; }
  .guess { display: grid; grid-template-columns: 1fr 1.3fr; gap: 18px; align-items: start; }
  .gcard { background: var(--surface); border: 1px solid var(--grid); border-radius: 10px; padding: 14px 16px; }
  h2 { font-size: 16px; margin: 4px 0 8px; }
  .muted { color: var(--muted); font-size: 12px; }
  .small { font-size: 12px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
  .tag { font-size: 12px; border: 1px solid var(--axis); border-radius: 999px; padding: 0 8px; color: var(--ink2); }
  .tag i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
  .qa { background: var(--page); border-radius: 6px; padding: 8px 10px; font-size: 14px; }
  .opts { display: grid; gap: 8px; }
  .opt { font: inherit; text-align: left; border: 1px solid var(--axis); border-radius: 8px; padding: 9px 12px; background: var(--surface); color: var(--ink); cursor: pointer; }
  .opt:hover:not(:disabled) { background: var(--page); }
  .opt[aria-checked='true'] { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
  .opt:disabled { cursor: default; color: var(--ink2); }
  .opt.right { border-color: var(--ink); color: var(--ink); font-weight: 600; }
  .opt.right::before { content: '✓ '; }
  .opt.wrong::before { content: '✗ '; }
  .who { display: block; color: var(--muted); font-weight: 400; }
  .btn { font: inherit; font-size: 14px; background: var(--ink); color: var(--surface); border: 0; border-radius: 8px; padding: 6px 16px; margin-top: 10px; cursor: pointer; }
  .btn:disabled { opacity: 0.4; cursor: default; }
  .result { margin-top: 10px; border-top: 1px solid var(--grid); padding-top: 8px; }
  .verdict { font-weight: 600; margin: 0 0 4px; }
  .profile { display: inline-block; margin: 6px 12px 0 0; font-size: 13px; color: var(--ink2); }
  .score { font-size: 12px; color: var(--ink2); margin: 10px 0 0; }
  .summary ul { padding-left: 18px; }
  @media (max-width: 760px) { .guess { grid-template-columns: 1fr; } }
</style>
