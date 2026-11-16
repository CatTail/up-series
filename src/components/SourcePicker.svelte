<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { NewSource, WebSourceKind } from '../lib/data/patch.ts'
  import { WEB_SOURCE_KINDS } from '../lib/data/patch.ts'
  import { t } from '../lib/i18n.svelte.ts'

  /** `ids` may hold "new:<n>" refs for sources in `fresh` that the contributor is adding. */
  let { idx, ids = $bindable(), fresh = $bindable() }: { idx: DataIndex; ids: string[]; fresh: NewSource[] } = $props()

  const films = $derived(idx.ds.sources.filter((s) => s.kind === 'film'))
  const web = $derived(idx.ds.sources.filter((s) => s.kind !== 'film').sort((a, b) => a.publisher.localeCompare(b.publisher) || a.title.localeCompare(b.title)))
  let chosen = $state('')
  let adding = $state(false)
  let nu = $state<{ url: string; title: string; publisher: string; kind: WebSourceKind }>({ url: '', title: '', publisher: '', kind: 'news' })
  const canAdd = $derived(/^https?:\/\/[^\s/]+\.[^\s]+$/.test(nu.url.trim()) && !!nu.title.trim() && !!nu.publisher.trim())

  function nameOf(id: string): string {
    const n = fresh.find((s) => s.ref === id)
    if (n) return `${n.publisher} · ${n.title}`
    const s = idx.source(id)
    return s ? (s.kind === 'film' ? s.title : `${s.publisher} · ${s.title}`) : id
  }
  function add() {
    if (chosen && !ids.includes(chosen)) ids = [...ids, chosen]
    chosen = ''
  }
  function addNew() {
    const n = Math.max(0, ...fresh.map((s) => Number(s.ref.slice(4)))) + 1
    const ref = `new:${n}`
    fresh = [...fresh, { ref, url: nu.url.trim(), title: nu.title.trim(), publisher: nu.publisher.trim(), kind: nu.kind }]
    ids = [...ids, ref]
    nu = { url: '', title: '', publisher: '', kind: 'news' }
    adding = false
  }
  function remove(id: string) {
    ids = ids.filter((x) => x !== id)
    fresh = fresh.filter((s) => s.ref !== id)
  }
</script>

<fieldset class="sources">
  <legend>{t('edit.f.sources')}</legend>
  {#if ids.length === 0}<p class="none">{t('edit.src.none')}</p>{/if}
  <ul>
    {#each ids as id (id)}
      {@const name = nameOf(id)}
      <li data-source={id}>
        <span>{name}</span>{#if id.startsWith('new:')}<em>{t('edit.src.newTag')}</em>{/if}
        <button type="button" class="rm" aria-label={t('edit.src.remove', { name })} onclick={() => remove(id)}>✕</button>
      </li>
    {/each}
  </ul>
  <div class="pick">
    <select aria-label={t('edit.src.pick')} bind:value={chosen}>
      <option value="">{t('edit.src.pick')}</option>
      <optgroup label={t('edit.kind.film')}>
        {#each films as s (s.id)}<option value={s.id} disabled={ids.includes(s.id)}>{s.title}</option>{/each}
      </optgroup>
      <optgroup label={t('edit.src.web')}>
        {#each web as s (s.id)}<option value={s.id} disabled={ids.includes(s.id)}>{s.publisher} · {s.title}</option>{/each}
      </optgroup>
    </select>
    <button type="button" disabled={!chosen} onclick={add}>{t('edit.src.add')}</button>
  </div>
  <button type="button" class="toggle" aria-expanded={adding} onclick={() => (adding = !adding)}>{t('edit.src.newOpen')}</button>
  {#if adding}
    <div class="new" role="group" aria-label={t('edit.src.new')}>
      <p class="hint">{t('edit.src.hint')}</p>
      <label><span>{t('edit.f.url')}</span><input type="url" placeholder="https://" bind:value={nu.url} /></label>
      <label><span>{t('edit.f.title')}</span><input bind:value={nu.title} /></label>
      <label><span>{t('edit.f.publisher')}</span><input bind:value={nu.publisher} /></label>
      <label><span>{t('edit.f.kind')}</span>
        <select bind:value={nu.kind}>{#each WEB_SOURCE_KINDS as k (k)}<option value={k}>{t(`edit.kind.${k}`)}</option>{/each}</select>
      </label>
      <button type="button" disabled={!canAdd} onclick={addNew}>{t('edit.src.add')}</button>
    </div>
  {/if}
</fieldset>

<style>
  .sources { border: 0; padding: 0; margin: 0 0 10px; min-width: 0; }
  legend { font-weight: 600; font-size: 12px; padding: 0; margin-bottom: 3px; }
  .none { margin: 0 0 4px; color: var(--muted); }
  ul { list-style: none; margin: 0 0 6px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  li { display: flex; align-items: baseline; gap: 6px; border: 1px solid var(--grid); border-radius: 6px; padding: 2px 4px 2px 8px; background: var(--page); }
  li span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  em { font-style: normal; font-size: 10px; color: var(--surface); background: var(--ink2); border-radius: 999px; padding: 0 5px; }
  .rm { font: inherit; font-size: 11px; color: var(--muted); background: none; border: 0; cursor: pointer; padding: 0 4px; }
  .rm:hover { color: var(--ink); }
  .pick { display: flex; gap: 6px; }
  select, input { font: inherit; font-size: 13px; min-width: 0; border: 1px solid var(--axis); border-radius: 6px; padding: 3px 6px; background: var(--page); color: var(--ink); }
  .pick select { flex: 1; }
  button:not(.rm) { font: inherit; font-size: 12px; border: 1px solid var(--axis); border-radius: 6px; background: var(--surface); color: var(--ink); padding: 2px 10px; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: default; }
  .toggle { margin-top: 6px; border-style: dashed !important; color: var(--ink2) !important; }
  .new { margin-top: 6px; border: 1px solid var(--grid); border-radius: 8px; padding: 8px; display: grid; gap: 5px; }
  .new label { display: grid; grid-template-columns: 4.5em minmax(0, 1fr); gap: 6px; align-items: center; }
  .new label span { font-size: 11px; color: var(--muted); }
  .new button { justify-self: start; }
  .hint { margin: 0; font-size: 11px; color: var(--ink2); }
</style>
