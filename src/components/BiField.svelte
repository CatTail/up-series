<script lang="ts">
  import type { Bilingual } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'

  let { label, value = $bindable(), rows = 2, hint }: { label: string; value: Bilingual; rows?: number; hint?: string } = $props()
</script>

<fieldset class="bi">
  <legend>{label}{#if hint}<small>{hint}</small>{/if}</legend>
  <label><span>{t('edit.lang.zh')}</span><textarea lang="zh-CN" {rows} bind:value={value.zh}></textarea></label>
  <label><span>{t('edit.lang.en')}</span><textarea lang="en" {rows} bind:value={value.en}></textarea></label>
</fieldset>

<style>
  .bi { border: 0; padding: 0; margin: 0 0 10px; min-width: 0; }
  legend { font-weight: 600; font-size: 12px; padding: 0; margin-bottom: 3px; }
  small { font-weight: 400; color: var(--muted); margin-left: 4px; }
  label { display: grid; grid-template-columns: 3.2em minmax(0, 1fr); gap: 6px; align-items: start; margin-bottom: 4px; }
  span { font-size: 11px; color: var(--muted); padding-top: 5px; }
  textarea { font: inherit; font-size: 13px; width: 100%; resize: vertical; border: 1px solid var(--axis); border-radius: 6px; padding: 4px 7px; background: var(--page); color: var(--ink); }
</style>
