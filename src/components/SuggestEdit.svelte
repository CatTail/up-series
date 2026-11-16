<script lang="ts">
  import { tick } from 'svelte'
  import { fileUrl, issueUrl, suggestionText, type Suggestion } from '../lib/contribute.ts'
  import type { Files, Target } from '../lib/data/address.ts'
  import { fileOf, formatAddress, labelOf, parseAddress } from '../lib/data/address.ts'
  import { assembleDataset } from '../lib/data/assemble.ts'
  import { diffValues, fieldsOf, makeLookup, toMarkdown, type Change } from '../lib/data/diff.ts'
  import { buildIndex, type DataIndex } from '../lib/data/index.ts'
  import type { NewSource, SourceValue } from '../lib/data/patch.ts'
  import { applyPatch, hashValue, parsePatch, readTarget, WEB_SOURCE_KINDS } from '../lib/data/patch.ts'
  import type { ValidationError } from '../lib/data/types.ts'
  import { PARTICIPATIONS } from '../lib/data/types.ts'
  import { validateCore } from '../lib/data/validate.ts'
  import { blankDraft, fromDraft, hasBilingual, hasSources, toDraft, usedNewSources, type Draft } from '../lib/edit-form.ts'
  import { closeEditor, editor } from '../lib/editor.svelte.ts'
  import { i18n, pick, t } from '../lib/i18n.svelte.ts'
  import BiField from './BiField.svelte'
  import SourceList from './SourceList.svelte'
  import SourcePicker from './SourcePicker.svelte'

  let { idx, files }: { idx: DataIndex; files: Files } = $props()

  const target = $derived<Target | null>(editor.target ? parseAddress(editor.target) : null)
  const current = $derived(target ? readTarget(files, target) : undefined)
  const address = $derived(target ? formatAddress(target) : '')
  const label = $derived(target ? labelOf(idx, target, t) : '')
  const file = $derived(target ? fileOf(files, target) : null)
  const readOnly = $derived(target?.kind === 'source' && (current as SourceValue | undefined)?.kind === 'film')

  let draft = $state<Draft>(blankDraft())
  let fresh = $state<NewSource[]>([])
  let reason = $state('')
  let needsTranslation = $state(false)
  let copied = $state(false)
  let fallback = $state<string | null>(null)
  let panel = $state<HTMLElement>()

  // A fresh form each time the panel opens on a record.
  $effect.pre(() => {
    const tg = target
    const v = current
    const fill = editor.mode === 'fill'
    if (!tg || v === undefined) return
    draft = toDraft(tg, v, { fill })
    fresh = []
    reason = ''
    needsTranslation = false
    copied = false
    fallback = null
  })
  $effect(() => {
    if (!target) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    tick().then(() => panel?.focus())
    return () => {
      document.body.style.overflow = prev
    }
  })

  const today = new Date().toISOString().slice(0, 10)
  const errKey = (e: ValidationError) => `${e.code} ${e.path} ${e.message}`
  /** Problems already in the data are not the contributor's to fix. */
  const baseline = $derived(new Set(validateCore(assembleDataset(files)).map(errKey)))

  const value = $derived(target ? fromDraft(target, draft) : null)
  const patch = $derived.by(() => {
    if (!target || current === undefined || readOnly) return null
    const news = usedNewSources(value, fresh)
    const p = parsePatch({
      v: 1, target: address, base: hashValue(current), value,
      ...(news.length ? { newSources: news.map((s) => ({ ref: s.ref, url: s.url, title: s.title, publisher: s.publisher, kind: s.kind })) } : {}),
      ...(needsTranslation ? { needsTranslation: true } : {}),
    })
    return p.ok ? p.patch : null
  })
  const applied = $derived(patch ? applyPatch(files, patch, { today }) : null)
  const after = $derived(applied?.ok ? applied.files : null)
  const look = $derived(makeLookup(t, i18n.lang, ...(after ? [buildIndex(assembleDataset(after))] : []), idx))

  type Problem = { text: string; blocking: boolean }
  const problems = $derived.by((): Problem[] => {
    const out: Problem[] = []
    if (after) {
      const errs = validateCore(assembleDataset(after)).filter((e) => !baseline.has(errKey(e)))
      // One empty language can wait for the reviewer; an empty text cannot.
      const lang = errs.filter((e) => e.code === 'MISSING_LANG')
      const stem = (p: string) => p.replace(/\.(zh|en)$/, '')
      const bothEmpty = lang.some((e) => lang.filter((x) => stem(x.path) === stem(e.path)).length > 1 || !/\.(zh|en)$/.test(e.path))
      for (const code of [...new Set(errs.map((e) => e.code))]) {
        if (code === 'MISSING_LANG' && needsTranslation && !bothEmpty) out.push({ text: t('check.MISSING_LANG_ok'), blocking: false })
        else out.push({ text: t(`check.${code}`), blocking: true })
      }
    }
    if (!reason.trim()) out.push({ text: t('check.reason'), blocking: true })
    return out
  })

  const changes = $derived.by((): Change[] => {
    if (!target || !applied?.ok) return []
    const main = diffValues(target, current, readTarget(applied.files, target), look)
    const added = applied.created.map((s): Change => {
      const st: Target = { kind: 'source', id: s.id }
      return { address: formatAddress(st), target: st, label: `${t('src.label')} · ${s.publisher} · ${s.title}`, kind: 'added', fields: diffValues(st, undefined, readTarget(applied.files, st), look) }
    })
    return main.length ? [{ address, target, label, kind: 'changed', fields: main }, ...added] : added
  })
  const blocked = $derived(!applied?.ok || changes.length === 0 || problems.some((p) => p.blocking))
  const suggestion = $derived.by((): Suggestion | null => {
    if (!patch || !applied?.ok) return null
    const title = t(editor.mode === 'fill' ? 'edit.issueTitleFill' : 'edit.issueTitle', { label })
    return { title, target: address, summary: toMarkdown({ changes, files: Object.keys(applied.changed) }, t), patch, reason: reason.trim() }
  })
  const link = $derived(suggestion && !blocked ? issueUrl(suggestion) : null)
  const currentFields = $derived(target ? fieldsOf(target, current, look).filter((f) => f.text && f.label !== t('edit.f.sources')) : [])
  const currentSources = $derived.by(() => {
    const v = current
    return v && typeof v === 'object' && 'sourceIds' in v ? v.sourceIds : []
  })
  const question = $derived(target?.kind === 'question' ? idx.question(target.id) : undefined)

  async function copy() {
    if (!suggestion) return
    const text = suggestionText(suggestion)
    try {
      await navigator.clipboard.writeText(text)
      copied = true
      fallback = null
    } catch {
      fallback = text
    }
  }
  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeEditor()
      return
    }
    if (e.key !== 'Tab' || !panel) return
    const els = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')).filter((el) => !el.closest('[hidden]'))
    if (!els.length) return
    const first = els[0]
    const last = els[els.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
</script>

{#if target && current !== undefined}
  <div class="backdrop" aria-hidden="true"></div>
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="se-title" tabindex="-1" bind:this={panel} onkeydown={keydown}>
    <header>
      <div>
        <h2 id="se-title">{editor.mode === 'fill' ? t('edit.titleFill') : t('edit.title')}</h2>
        <p class="what">{label}</p>
      </div>
      <button type="button" class="x" aria-label={t('edit.close')} onclick={closeEditor}>✕</button>
    </header>

    <section class="cur" aria-labelledby="se-cur">
      <h3 id="se-cur">{t('edit.current')}</h3>
      {#if currentFields.length}
        <dl>
          {#each currentFields as f (f.label)}<dt>{f.label}</dt><dd>{f.text}</dd>{/each}
        </dl>
      {:else}
        <p class="muted">{t('state.notFound')}</p>
      {/if}
      {#if currentSources.length}<p><SourceList {idx} ids={currentSources} /></p>{/if}
      {#if question}<p><SourceList {idx} ids={[question.sourceId]} locator={question.locator} /></p>{/if}
      <p class="addr">
        {t('edit.address')}{t('p.colon')}<code>{address}</code>
        {#if file}· <a href={fileUrl(file)} target="_blank" rel="noopener noreferrer">{t('edit.viewFile')} ↗</a>{/if}
      </p>
    </section>

    {#if readOnly}
      <p class="muted">{t('edit.readonly')}</p>
    {:else}
      <section class="form" aria-labelledby="se-yours">
        <h3 id="se-yours">{t('edit.yours')}</h3>
        {#if target.kind === 'state'}
          <fieldset class="radios">
            <legend>{t('edit.f.status')}</legend>
            {#each ['confirmed', 'not_found', 'not_applicable'] as const as s (s)}
              <label><input type="radio" name="se-status" value={s} bind:group={draft.status} />{t(`edit.st.${s}`)}</label>
            {/each}
          </fieldset>
          {#if draft.status === 'confirmed'}
            <BiField label={t('edit.f.text')} rows={3} bind:value={draft.text} />
          {:else if draft.status === 'not_applicable'}
            <BiField label={t('edit.f.reason')} bind:value={draft.reason} />
          {/if}
        {:else if target.kind === 'participation'}
          <label class="line"><span>{t('edit.f.participation')}</span>
            <select bind:value={draft.participation}>{#each PARTICIPATIONS as p (p)}<option value={p}>{t(`status.${p}`)}</option>{/each}</select>
          </label>
          <BiField label={t('edit.f.note')} hint={t('edit.optional')} bind:value={draft.note} />
        {:else if target.kind === 'person'}
          <label class="line"><span>{t('edit.f.fullName')}</span><input bind:value={draft.fullName} /></label>
          <BiField label={t('edit.f.background')} rows={3} bind:value={draft.background} />
          <label class="line"><span>{t('edit.f.born')}</span><input placeholder="1956-01-31" bind:value={draft.born} /></label>
          <label class="line"><span>{t('edit.f.died')}</span><input placeholder="2013-05" bind:value={draft.died} /></label>
        {:else if target.kind === 'final'}
          <label class="line"><span>{t('edit.f.asOf')}</span>
            <select bind:value={draft.asOfFilmId}>{#each idx.films as f (f.id)}<option value={f.id}>{f.title}</option>{/each}</select>
          </label>
          <BiField label={t('edit.f.text')} rows={3} bind:value={draft.text} />
        {:else if target.kind === 'question'}
          <label class="block"><span>{t('edit.f.qEn')}</span><textarea lang="en" rows="2" bind:value={draft.qEn}></textarea></label>
          <label class="block"><span>{t('edit.f.qZh')}</span><textarea lang="zh-CN" rows="2" bind:value={draft.qZh}></textarea></label>
          <BiField label={t('edit.f.summary')} hint={t('edit.optional')} bind:value={draft.summary} />
          <BiField label={t('edit.f.quote')} hint={t('edit.optional')} bind:value={draft.quote} />
          <label class="line"><span>{t('edit.f.asked')}</span>
            <select bind:value={draft.personId}>
              <option value="">{t('qa.filmOnly')}</option>
              {#each idx.peopleOrdered as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
            </select>
          </label>
          <fieldset class="checks">
            <legend>{t('edit.f.themes')}</legend>
            {#each idx.themes as th (th.id)}
              <label><input type="checkbox" value={th.id} bind:group={draft.themeIds} />{pick(th.name)}</label>
            {/each}
          </fieldset>
          <BiField label={t('edit.f.locator')} bind:value={draft.locator} />
        {:else if target.kind === 'source'}
          <label class="line"><span>{t('edit.f.url')}</span><input type="url" bind:value={draft.url} /></label>
          <label class="line"><span>{t('edit.f.title')}</span><input bind:value={draft.title} /></label>
          <label class="line"><span>{t('edit.f.publisher')}</span><input bind:value={draft.publisher} /></label>
          <label class="line"><span>{t('edit.f.kind')}</span>
            <select bind:value={draft.kind}>{#each WEB_SOURCE_KINDS as k (k)}<option value={k}>{t(`edit.kind.${k}`)}</option>{/each}</select>
          </label>
        {/if}
        {#if hasSources(target, draft)}
          <SourcePicker {idx} bind:ids={draft.sourceIds} bind:fresh />
        {/if}
        {#if hasBilingual(target, draft)}
          <label class="chk"><input type="checkbox" bind:checked={needsTranslation} />{t('edit.needsTranslation')}</label>
        {/if}
        <label class="block"><span class="strong">{t('edit.reasonLabel')}</span>
          <textarea rows="3" placeholder={t('edit.reasonHint')} bind:value={reason}></textarea>
        </label>
      </section>

      <section class="check" aria-labelledby="se-check" aria-live="polite">
        <h3 id="se-check">{t('edit.check')}</h3>
        {#if problems.length}
          <ul>{#each problems as p (p.text)}<li class:warn={!p.blocking}>{p.text}</li>{/each}</ul>
        {:else if changes.length}
          <p class="ok">{t('edit.ok')}</p>
        {/if}
      </section>

      <section class="preview" aria-labelledby="se-preview">
        <h3 id="se-preview">{t('edit.preview')}</h3>
        {#if changes.length}
          {#each changes as c (c.address)}
            {#if c.kind === 'added'}<p class="added">{t('edit.md.added')}{t('p.colon')}{c.label}</p>{/if}
            <table>
              <thead><tr><th></th><th>{t('edit.before')}</th><th>{t('edit.after')}</th></tr></thead>
              <tbody>
                {#each c.fields as f (f.label)}<tr><th scope="row">{f.label}</th><td>{f.before || '—'}</td><td>{f.after || '—'}</td></tr>{/each}
              </tbody>
            </table>
          {/each}
        {:else}
          <p class="muted">{t('edit.noChange')}</p>
        {/if}
      </section>

      <footer>
        {#if link?.long}<p class="long">{t('edit.long')}</p>{/if}
        <div class="actions">
          {#if link}
            <a class="primary" href={link.url} target="_blank" rel="noopener noreferrer" onclick={() => link?.long && copy()}>{t('edit.submit')} ↗</a>
          {:else}
            <button type="button" class="primary" disabled>{t('edit.submit')} ↗</button>
          {/if}
          <button type="button" disabled={!link} onclick={copy}>{copied ? t('edit.copied') : t('edit.copy')}</button>
          <button type="button" onclick={closeEditor}>{t('edit.cancel')}</button>
        </div>
        <p class="note">{t('edit.submitNote')}</p>
        {#if fallback}
          <label class="block"><span>{t('edit.copyFallback')}</span><textarea class="fallback" readonly rows="8" value={fallback}></textarea></label>
        {/if}
      </footer>
    {/if}
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.28); }
  .panel {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(580px, 100vw); overflow-y: auto; padding: 14px 20px 28px;
    background: var(--surface); color: var(--ink); border-left: 1px solid var(--axis); box-shadow: -6px 0 24px rgba(0, 0, 0, 0.12); font-size: 13px;
  }
  .panel:focus { outline: none; }
  header { display: flex; justify-content: space-between; align-items: start; gap: 12px; border-bottom: 1px solid var(--grid); padding-bottom: 8px; }
  h2 { font-size: 17px; margin: 0; }
  .what { margin: 2px 0 0; color: var(--ink2); }
  .x { font: inherit; font-size: 16px; background: none; border: 0; color: var(--muted); cursor: pointer; padding: 2px 6px; }
  .x:hover { color: var(--ink); }
  section { padding: 10px 0; border-bottom: 1px solid var(--grid); }
  h3 { font-size: 12px; color: var(--muted); font-weight: 600; margin: 0 0 6px; text-transform: none; }
  .cur { color: var(--ink2); }
  dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 0 0 4px; }
  dt { color: var(--muted); font-size: 12px; }
  dd { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
  .cur p { margin: 2px 0; }
  .addr { font-size: 11px; color: var(--muted); }
  code { font-size: 11px; background: var(--page); border: 1px solid var(--grid); border-radius: 4px; padding: 0 4px; }
  .muted { color: var(--muted); margin: 0; }
  fieldset { border: 0; padding: 0; margin: 0 0 10px; min-width: 0; }
  legend { font-weight: 600; font-size: 12px; padding: 0; margin-bottom: 3px; }
  .radios, .checks { display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .radios legend, .checks legend { width: 100%; }
  .radios label, .checks label, .chk { display: inline-flex; gap: 5px; align-items: center; }
  .chk { margin: 0 0 10px; color: var(--ink2); }
  .line { display: grid; grid-template-columns: 6.5em minmax(0, 1fr); gap: 6px; align-items: center; margin-bottom: 8px; }
  .line span { font-weight: 600; font-size: 12px; }
  .block { display: block; margin-bottom: 10px; }
  .block span { display: block; font-weight: 600; font-size: 12px; margin-bottom: 3px; }
  .strong { color: var(--ink); }
  input, select, textarea { font: inherit; font-size: 13px; min-width: 0; border: 1px solid var(--axis); border-radius: 6px; padding: 4px 7px; background: var(--page); color: var(--ink); }
  textarea { width: 100%; resize: vertical; }
  .check ul { margin: 0; padding-left: 18px; }
  .check li { color: var(--ink); }
  .check li::marker { content: '✕  '; color: var(--ink2); }
  .check li.warn::marker { content: '!  '; }
  .check li.warn { color: var(--ink2); }
  .ok { margin: 0; }
  .ok::before { content: '✓ '; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
  th, td { text-align: left; vertical-align: top; border-bottom: 1px solid var(--grid); padding: 3px 6px 3px 0; white-space: pre-line; overflow-wrap: anywhere; }
  thead th { font-size: 11px; color: var(--muted); font-weight: 600; }
  thead th:first-child, tbody th { width: 9.5em; }
  tbody th { font-weight: 400; color: var(--muted); font-size: 12px; }
  td:first-of-type { color: var(--ink2); text-decoration: line-through; text-decoration-color: var(--axis); }
  .added { margin: 0 0 2px; font-weight: 600; }
  footer { padding-top: 12px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .actions a, .actions button { font: inherit; font-size: 13px; border: 1px solid var(--axis); border-radius: 8px; padding: 5px 12px; background: var(--surface); color: var(--ink); cursor: pointer; text-decoration: none; }
  .actions .primary { background: var(--ink); color: var(--surface); border-color: var(--ink); font-weight: 600; }
  .actions button:disabled { opacity: 0.45; cursor: default; }
  .note, .long { font-size: 12px; color: var(--ink2); margin: 8px 0 0; }
  .long { color: var(--ink); }
  .fallback { font-family: ui-monospace, monospace; font-size: 11px; }
</style>
