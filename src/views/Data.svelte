<script lang="ts">
  import EditButton from '../components/EditButton.svelte'
  import { docUrl, folderUrl, openSuggestionsUrl, REPO, reportUrl } from '../lib/contribute.ts'
  import { gaps, questionsCsv, sourcesCsv, statesCsv } from '../lib/data/export.ts'
  import type { DataIndex } from '../lib/data/index.ts'
  import type { DimKey, FilmId, PersonId } from '../lib/data/types.ts'
  import { DIM_KEYS } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'

  let { idx }: { idx: DataIndex } = $props()

  const BATCH = 60
  const all = $derived(gaps(idx))
  let person = $state<PersonId | ''>('')
  let film = $state<FilmId | ''>('')
  let dim = $state<DimKey | ''>('')
  let shown = $state(BATCH)
  const list = $derived(
    all.filter(({ target: g }) => (!person || g.person === person) && (!film || (g.kind === 'state' && g.film === film)) && (!dim || (g.kind === 'state' && g.dim === dim))),
  )
  const visible = $derived(list.slice(0, shown))

  function download(name: string, text: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const downloads = [
    { key: 'data.dl.states', run: () => download('up-states.csv', statesCsv(idx), 'text/csv;charset=utf-8') },
    { key: 'data.dl.questions', run: () => download('up-questions.csv', questionsCsv(idx), 'text/csv;charset=utf-8') },
    { key: 'data.dl.sources', run: () => download('up-sources.csv', sourcesCsv(idx), 'text/csv;charset=utf-8') },
    { key: 'data.dl.json', run: () => download('up-data.json', `${JSON.stringify(idx.ds, null, 2)}\n`, 'application/json') },
  ]
  const folders: Array<[string, string]> = [['people.json', 'people.json'], ['states/', 'states'], ['questions/', 'questions'], ['sources/', 'sources']]
</script>

<section class="data">
  <h1>{t('data.title')}</h1>
  <p class="lede">{t('data.lede')}</p>

  <div class="cols">
    <div>
      <h2>{t('data.how')}</h2>
      <ol class="steps">
        <li>{t('data.step1')}</li>
        <li>{t('data.step2')}</li>
        <li>{t('data.step3')}</li>
      </ol>
      <p class="rules">{t('data.rules')}</p>
      <ul class="links">
        <li><a href={docUrl('CONTRIBUTING.md')} target="_blank" rel="noopener noreferrer">{t('data.guide')} ↗</a></li>
        <li><a href={openSuggestionsUrl()} target="_blank" rel="noopener noreferrer">{t('data.open')} ↗</a></li>
        <li><a href={reportUrl(`${REPO}`)} target="_blank" rel="noopener noreferrer">{t('data.report')} ↗</a></li>
      </ul>
    </div>
    <div>
      <h2>{t('data.download')}</h2>
      <div class="dl">
        {#each downloads as d (d.key)}<button type="button" onclick={d.run}>{t(d.key)}</button>{/each}
      </div>
      <p class="note">{t('data.dlNote')}</p>
      <h2>{t('data.files')}</h2>
      <p class="note">{t('data.filesLede')}</p>
      <ul class="files">
        {#each folders as [name, path] (name)}
          <li><a href={path.endsWith('.json') ? docUrl(`data/${path}`) : folderUrl(path)} target="_blank" rel="noopener noreferrer"><code>data/{name}</code> ↗</a></li>
        {/each}
      </ul>
    </div>
  </div>

  <h2 id="gaps">{t('data.todo')} <small>{t('data.todoCount', { n: list.length })}</small></h2>
  <p class="note">{t('data.todoLede')}</p>
  <div class="filters" role="group" aria-labelledby="gaps">
    <label>{t('overview.people')}
      <select bind:value={person} onchange={() => (shown = BATCH)}>
        <option value="">{t('overview.all')}</option>
        {#each idx.peopleOrdered as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
    </label>
    <label>{t('overview.age')}
      <select bind:value={film} onchange={() => (shown = BATCH)}>
        <option value="">{t('overview.all')}</option>
        {#each idx.films as f (f.id)}<option value={f.id}>{t('age.short', { age: f.age })} · {f.title}</option>{/each}
      </select>
    </label>
    <label>{t('overview.theme')}
      <select bind:value={dim} onchange={() => (shown = BATCH)}>
        <option value="">{t('overview.all')}</option>
        {#each DIM_KEYS as d (d)}<option value={d}>{t(`dim.${d}`)}</option>{/each}
      </select>
    </label>
  </div>
  <table class="gaps">
    <tbody>
      {#each visible as { target: g } (`${g.kind}/${g.person}/${g.kind === 'state' ? `${g.film}/${g.dim}` : ''}`)}
        <tr data-gap={g.kind === 'state' ? `${g.person}/${g.film}/${g.dim}` : `${g.person}/final`}>
          <td><a href={`#/person/${g.person}`}>{idx.person(g.person).name}</a></td>
          {#if g.kind === 'state'}
            <td>{t('age.short', { age: idx.film(g.film).age })} <small>{idx.film(g.film).title}</small></td>
            <td>{t(`dim.${g.dim}`)}</td>
          {:else}
            <td colspan="2">{t('person.final')}</td>
          {/if}
          <td class="act"><EditButton {idx} target={g} fill /></td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if list.length > shown}
    <button type="button" class="more" onclick={() => (shown += BATCH)}>{t('data.showMore', { n: list.length - shown })}</button>
  {/if}
</section>

<style>
  h1 { font-size: 22px; margin: 0 0 4px; }
  .lede { color: var(--ink2); margin: 0 0 12px; font-size: 14px; max-width: 46em; }
  h2 { font-size: 15px; margin: 18px 0 6px; }
  h2 small { font-weight: 400; color: var(--muted); font-size: 12px; margin-left: 6px; }
  .cols { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 0 40px; }
  .cols h2:first-child { margin-top: 4px; }
  .steps { margin: 0; padding-left: 20px; font-size: 13px; }
  .steps li { margin-bottom: 4px; }
  .rules { font-size: 12px; color: var(--ink2); margin: 8px 0; }
  .links, .files { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 13px; }
  .note { font-size: 12px; color: var(--ink2); margin: 6px 0; }
  .dl { display: flex; flex-wrap: wrap; gap: 6px; }
  .dl button, .more { font: inherit; font-size: 12px; border: 1px solid var(--axis); background: var(--surface); color: var(--ink); border-radius: 8px; padding: 4px 12px; cursor: pointer; }
  .dl button:hover, .more:hover { border-color: var(--ink2); }
  code { font-size: 12px; }
  .filters { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--muted); margin: 8px 0; }
  .filters select { font: inherit; font-size: 12px; margin-left: 6px; border: 1px solid var(--axis); border-radius: 6px; padding: 2px 4px; background: var(--surface); color: var(--ink); }
  .gaps { border-collapse: collapse; font-size: 13px; min-width: min(560px, 100%); }
  .gaps td { border-top: 1px solid var(--grid); padding: 3px 18px 3px 0; }
  .gaps small { color: var(--muted); font-size: 11px; }
  .gaps a { text-decoration: none; }
  .gaps a:hover { text-decoration: underline; }
  .act { padding-right: 0; }
  .more { margin-top: 10px; }
  @media (max-width: 760px) { .cols { grid-template-columns: 1fr; } }
</style>
