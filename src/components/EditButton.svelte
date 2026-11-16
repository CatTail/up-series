<script lang="ts">
  import { formatAddress, labelOf, type Target } from '../lib/data/address.ts'
  import type { DataIndex } from '../lib/data/index.ts'
  import { openEditor } from '../lib/editor.svelte.ts'
  import { t } from '../lib/i18n.svelte.ts'

  /** `fill`: the record is a gap (未查到); the button says so and opens the form ready to fill it in. */
  let { idx, target, fill = false }: { idx: DataIndex; target: Target; fill?: boolean } = $props()
  const address = $derived(formatAddress(target))
  const label = $derived(labelOf(idx, target, t))
</script>

<button
  type="button"
  class="edit"
  class:fill
  data-edit={address}
  aria-label={t(fill ? 'edit.ariaFill' : 'edit.aria', { label })}
  title={t(fill ? 'edit.fill' : 'edit.button')}
  onclick={(e) => openEditor(address, fill ? 'fill' : 'edit', e.currentTarget)}
><span aria-hidden="true">✎</span>{#if fill}<span class="lbl">{t('edit.fill')}</span>{/if}</button>

<style>
  .edit {
    font: inherit; font-size: 11px; line-height: 1.2; color: var(--muted); background: none; border: 1px solid transparent;
    border-radius: 999px; padding: 1px 5px; margin-left: 2px; cursor: pointer; white-space: nowrap;
  }
  .edit:hover { color: var(--ink); border-color: var(--axis); }
  .edit.fill { border: 1px dashed var(--grid); color: var(--ink2); padding: 0 7px; }
  .edit.fill:hover { border-style: solid; color: var(--ink); }
  .lbl { margin-left: 3px; }
</style>
